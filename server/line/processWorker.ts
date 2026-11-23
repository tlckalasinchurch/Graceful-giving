/**
 * LINE Slip Processing Worker
 *
 * Called by Vercel Cron every 2 minutes via GET /api/line/process-worker
 * Also callable manually by SUPER_ADMIN for debugging.
 *
 * For each queued job:
 *   1. Claim job atomically (status: queued → processing)
 *   2. Get signed URL for the slip image (private bucket, 1hr)
 *   3. Run AI OCR extraction
 *   4. Run 3-level duplicate detection
 *   5. Run member matching
 *   6. Determine final status (extracted/matched/needs_review/duplicate/failed)
 *   7. Update line_slips
 *   8. Mark job done/failed
 *
 * Retry: up to MAX_ATTEMPTS before marking failed.
 */

import type { Request, Response, Express } from "express";
import { ENV } from "../_core/env";
import { countRecentSystemRejectedSlips, getChurchProfile, getDb } from "../db";
import {
  lineSlips,
  lineProcessingJobs,
  type LineSlip,
} from "../../drizzle/schema";
import { and, eq, gte, isNull, lt, lte, notInArray, sql } from "drizzle-orm";
import { extractInlineSlipDataUrl, resolveSlipImageUrl } from "../storage";
import { MAX_AUTO_REJECTS } from "../../shared/givingLimits";
import { verifySlip } from "./slipVerification";
import { extractSlipData, requiresReview } from "./slipOcr";
import {
  checkDuplicateByReference,
  checkDuplicateByTransaction,
} from "./duplicateDetector";
import { matchMember } from "./memberMatcher";

type Db = NonNullable<Awaited<ReturnType<typeof getDb>>>;

const MAX_ATTEMPTS = 3;
const BATCH_SIZE = 10;
/** Retry delay grows as 1min, 5min between attempts, to outlast a provider rate limit. */
const RETRY_BACKOFF_FACTOR = 5;

/**
 * The whole reading step for one slip, across every provider attempt. This is
 * the worker's own budget; `OCR_PROVIDER_TIMEOUT_MS` bounds a single attempt.
 * Keeping them apart lets a job spend more than one attempt while still never
 * outliving its slot.
 */
export const WORKER_OCR_JOB_TIMEOUT_MS = 45_000;

/**
 * How long a claimed job may stay `processing` before it counts as abandoned.
 * A live job cannot reach this: its OCR step is bounded by
 * `WORKER_OCR_JOB_TIMEOUT_MS` and the provider by its own timeout, and the
 * process that holds it is killed long before the lease runs out. So only a
 * run that died (platform timeout, crash, deploy) looks stale.
 */
export const STALE_JOB_LEASE_MS = 10 * 60 * 1000;

/** The worker's budget expired. Reported apart from a provider timeout. */
export class WorkerOcrTimeoutError extends Error {
  constructor(
    message = "slip OCR job timed out",
    options?: { cause?: unknown }
  ) {
    super(message, options);
    this.name = "WorkerOcrTimeoutError";
  }
}

/**
 * Runs the OCR step under the job budget and cancels the provider request when
 * the budget runs out, so nothing keeps running after the job gives up. The
 * same signal covers every provider attempt and its backoff: the provider
 * aborts the moment the budget expires, and `invokeLLM` does not retry after an
 * abort.
 */
export async function extractWithinJobBudget(
  signedUrl: string,
  timeoutMs: number = WORKER_OCR_JOB_TIMEOUT_MS
) {
  const controller = new AbortController();
  const timer = setTimeout(
    () =>
      controller.abort(
        new DOMException("worker OCR budget exceeded", "TimeoutError")
      ),
    timeoutMs
  );
  try {
    return await extractSlipData(signedUrl, { signal: controller.signal });
  } catch (err) {
    // The budget is the reason only when it is what fired; anything else keeps
    // its own type so the retry decision stays with the caller.
    if (controller.signal.aborted) {
      throw new WorkerOcrTimeoutError(
        `slip OCR exceeded its ${timeoutMs}ms budget`,
        { cause: err }
      );
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * The lease is measured against the database clock, never a host clock. Hosts
 * drift, and a worker must not look abandoned because its host is a few
 * minutes ahead — the retry-backoff gate below already reads `now()` too.
 */
const staleCutoff = () =>
  sql`now() - make_interval(secs => ${STALE_JOB_LEASE_MS / 1000})`;

/**
 * Recovery for jobs left `processing` by a worker that died mid-run. Nothing
 * else ever moves such a job out of `processing`, so without this the slip
 * waits for staff to press rescan.
 *
 * Safety: both updates are single guarded statements that match only
 * `status = processing` with a `lastAttemptAt` older than the lease, so a job a
 * live worker is holding can never be taken. A requeued job goes back through
 * the normal atomic claim, which means one worker at a time.
 *
 * The lease is a heuristic, so recovery still cannot assume the old worker is
 * gone: writes on both sides carry an ownership guard, and the reaper never
 * touches a slip staff have already decided on.
 */
export async function reclaimStaleJobs(
  db: NonNullable<Awaited<ReturnType<typeof getDb>>>
): Promise<{ requeued: number; failed: number }> {
  const stale = () =>
    and(
      eq(lineProcessingJobs.status, "processing"),
      lt(lineProcessingJobs.lastAttemptAt, staleCutoff())
    );

  // Retries left: hand it back to the queue it was claimed from.
  const requeued = await db
    .update(lineProcessingJobs)
    .set({
      status: "queued",
      errorMessage: "requeued after worker lease expired",
      updatedAt: new Date(),
    })
    .where(and(stale(), lte(lineProcessingJobs.attempts, MAX_ATTEMPTS - 1)))
    .returning({ id: lineProcessingJobs.id });

  // Out of retries: fail it the same way the error path does.
  const exhausted = await db
    .select({
      id: lineProcessingJobs.id,
      slipId: lineProcessingJobs.slipId,
    })
    .from(lineProcessingJobs)
    .where(and(stale(), gte(lineProcessingJobs.attempts, MAX_ATTEMPTS)));

  let failed = 0;
  for (const job of exhausted) {
    const [claimed] = await db
      .update(lineProcessingJobs)
      .set({
        status: "failed",
        errorMessage: "worker lease expired",
        updatedAt: new Date(),
      })
      .where(and(eq(lineProcessingJobs.id, job.id), stale()))
      .returning({ id: lineProcessingJobs.id });
    if (!claimed) continue;

    failed++;
    await db
      .update(lineSlips)
      .set({
        status: "failed",
        lastErrorMessage: "worker lease expired",
        updatedAt: new Date(),
      })
      // A slip staff already approved or rejected keeps its status: the ledger
      // must not disagree with the inbox because a worker died.
      .where(
        and(
          eq(lineSlips.id, job.slipId),
          notInArray(lineSlips.status, ["approved", "rejected"]),
          isNull(lineSlips.approvedOfferingId)
        )
      )
      .catch((e: unknown) =>
        console.error("[Worker] Failed to mark a stale slip failed:", e)
      );
  }

  return { requeued: requeued.length, failed };
}

// ─── Auth guard ───────────────────────────────────────────────────────────────

function isAuthorizedCron(req: Request): boolean {
  // Vercel passes Authorization: Bearer <CRON_SECRET>
  const auth = req.headers.authorization ?? "";
  if (ENV.cronSecret && auth === `Bearer ${ENV.cronSecret}`) return true;

  // In dev, allow if no cron secret is configured
  if (!ENV.isProduction && !ENV.cronSecret) {
    console.warn("[Worker] CRON_SECRET not set — open in dev mode");
    return true;
  }

  return false;
}

// ─── Single job processor ─────────────────────────────────────────────────────

/** Where the church receives giving, or nulls if not set or unreadable. */
async function getChurchPayee(
  churchId: string
): Promise<{ bankAccount: string | null; promptPayId: string | null }> {
  try {
    const profile = await getChurchProfile(churchId);
    return {
      bankAccount: profile?.bankAccount ?? null,
      promptPayId: profile?.promptPayId ?? null,
    };
  } catch (err) {
    console.warn("[Worker] Could not read the church payee details:", err);
    return { bankAccount: null, promptPayId: null };
  }
}

/**
 * Closes a job, but only while it is still the one this run claimed. The first
 * write (or a newer claim) changes `status`/`attempts`, so a worker that comes
 * back after its lease expired matches no row and cannot reopen finished work.
 */
async function markJobDone(
  db: Db,
  jobId: number,
  claimedAttempts: number
): Promise<void> {
  const [done] = await db
    .update(lineProcessingJobs)
    .set({ status: "done", updatedAt: new Date() })
    .where(
      and(
        eq(lineProcessingJobs.id, jobId),
        eq(lineProcessingJobs.status, "processing"),
        eq(lineProcessingJobs.attempts, claimedAttempts)
      )
    )
    .returning({ id: lineProcessingJobs.id });

  if (!done) {
    console.warn(
      `[Worker] Job #${jobId} is no longer owned by this run (attempt ${claimedAttempts}); leaving its state alone`
    );
  }
}

async function processJob(
  jobId: number,
  slipId: number,
  claimedAttempts: number
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("DB not available");

  // 1. Get the slip
  const [slip] = await db
    .select()
    .from(lineSlips)
    .where(eq(lineSlips.id, slipId))
    .limit(1);

  if (!slip) throw new Error(`Slip #${slipId} not found`);
  if (slip.status !== "pending") {
    // Already processed by another worker run
    await markJobDone(db, jobId, claimedAttempts);
    return;
  }

  // 2. Get signed URL (or inline data URL) for private image
  const signedUrl = await resolveSlipImageUrl(slip.slipImageKey, slip.aiData);

  // 3. AI OCR extraction, under the worker's own time budget
  const extraction = await extractWithinJobBudget(signedUrl);

  // 4. Duplicate detection
  let finalStatus: LineSlip["status"] = "extracted";
  let duplicateSlipId: number | null = null;
  let duplicateOfferingId: number | null = null;
  let duplicateReason: string | null = null;

  // Level 1: reference number
  if (extraction.referenceNumber) {
    const refCheck = await checkDuplicateByReference(
      slip.churchId,
      extraction.referenceNumber,
      slipId
    );
    if (refCheck.isDuplicate) {
      finalStatus = "duplicate";
      duplicateSlipId = refCheck.duplicateSlipId;
      duplicateOfferingId = refCheck.duplicateOfferingId;
      duplicateReason = refCheck.reason;
    }
  }

  // 5. Member matching (skip if already duplicate)
  let matchedMemberId: number | null = null;
  let matchedMemberName: string | null = null;
  let matchedConfidence: number | null = null;
  let matchMethod: string | null = null;

  if (finalStatus !== "duplicate") {
    const match = await matchMember(
      slip.churchId,
      slip.lineUserId,
      extraction.senderName
    );

    if (match) {
      matchedMemberId = match.memberId;
      matchedMemberName = match.memberName;
      matchedConfidence = match.confidence;
      matchMethod = match.method;

      // Level 3 duplicate: same amount + date + member
      if (extraction.amount && extraction.transferDate) {
        const txCheck = await checkDuplicateByTransaction(
          slip.churchId,
          extraction.amount,
          new Date(extraction.transferDate),
          match.memberId,
          slipId
        );
        if (txCheck.isDuplicate) {
          finalStatus = "duplicate";
          duplicateSlipId = txCheck.duplicateSlipId;
          duplicateOfferingId = txCheck.duplicateOfferingId;
          duplicateReason = txCheck.reason;
        }
      }

      // Determine status based on match reliability and OCR confidence
      if (finalStatus !== "duplicate") {
        if (requiresReview(extraction) || !match.isAutoMatch) {
          finalStatus = "needs_review";
        } else {
          finalStatus = "matched";
        }
      }
    } else {
      // No member match → needs_review for manual assignment
      finalStatus = "needs_review";
    }
  }

  // 5b. Checks against what we know. A slip sent from the giving station
  // carries the amount the donor chose. A confident reading that differs, or a
  // receiver account that is not the church's, turns the slip away so it
  // cannot be approved. The donor sends it again. Any other slip with a
  // doubtful receiver account goes to staff with a warning.
  const payee = await getChurchPayee(slip.churchId);
  // A donor turned away too often gets a person, not another automatic no.
  const escalate =
    slip.declaredAmount !== null &&
    (await countRecentSystemRejectedSlips(
      slip.lineUserId,
      new Date(Date.now() - 24 * 60 * 60 * 1000),
      slip.id,
      slip.churchId
    ).catch(() => 0)) >= MAX_AUTO_REJECTS;
  const verification = verifySlip({
    declaredAmount:
      slip.declaredAmount !== null ? Number(slip.declaredAmount) : null,
    extraction,
    churchAccount: payee.bankAccount,
    churchPromptPayId: payee.promptPayId,
    isDuplicate: finalStatus === "duplicate",
    escalate,
  });
  const autoRejectReason = verification.autoReject?.reason ?? null;
  if (verification.autoReject) {
    finalStatus = "rejected";
  } else if (verification.reviewWarning && finalStatus !== "duplicate") {
    finalStatus = "needs_review";
  }

  // 6. Update line_slips with all results
  const inlineDataUrl = extractInlineSlipDataUrl(slip.aiData);
  const written = await db
    .update(lineSlips)
    .set({
      status: finalStatus,
      aiRawText: extraction.rawText,
      aiData: {
        ...(inlineDataUrl ? { inlineDataUrl } : {}),
        ...extraction,
        verification: {
          amount: verification.amount,
          receiver: verification.receiver,
          autoReject: verification.autoReject?.kind ?? null,
          escalated: verification.escalated,
        },
      } as unknown as Record<string, unknown>,
      extractedAmount:
        extraction.amount !== null ? String(extraction.amount) : null,
      extractedAmountConfidence: String(extraction.amountConfidence),
      extractedDate: extraction.transferDate
        ? new Date(extraction.transferDate)
        : null,
      extractedDateConfidence: String(extraction.dateConfidence),
      extractedRef: extraction.referenceNumber,
      extractedRefConfidence: String(extraction.referenceConfidence),
      extractedSenderName: extraction.senderName,
      extractedSenderConfidence: String(extraction.senderConfidence),
      extractedBank: extraction.bankName,
      matchedMemberId,
      matchedMemberName,
      matchedConfidence:
        matchedConfidence !== null ? String(matchedConfidence) : null,
      matchMethod,
      duplicateOfSlipId: duplicateSlipId,
      duplicateOfOfferingId: duplicateOfferingId,
      lastErrorMessage:
        duplicateReason ?? autoRejectReason ?? verification.reviewWarning,
      // Rejected by the system: no reviewer, the reason is for the donor.
      ...(autoRejectReason
        ? { reviewNote: autoRejectReason, reviewedAt: new Date() }
        : {}),
      processingAttempts: (slip.processingAttempts ?? 0) + 1,
      updatedAt: new Date(),
    })
    // Ownership guard: only a slip still awaiting a reading is written. If
    // another run (or a rescan) got there first, that result stands and this
    // run must not overwrite it with a reading taken from the same image.
    .where(and(eq(lineSlips.id, slipId), eq(lineSlips.status, "pending")))
    .returning({ id: lineSlips.id });

  if (written.length === 0) {
    console.warn(
      `[Worker] Slip #${slipId} was already written by another run; keeping its result`
    );
    return;
  }

  // 7. Mark job done
  await markJobDone(db, jobId, claimedAttempts);
}

// ─── Worker batch runner ──────────────────────────────────────────────────────

export async function runWorkerBatch(): Promise<{
  processed: number;
  errors: number;
}> {
  const db = await getDb();
  if (!db) return { processed: 0, errors: 0 };

  // Give back the jobs a dead run left behind before picking new work.
  await reclaimStaleJobs(db).catch(err =>
    console.warn("[Worker] Could not reclaim stale jobs:", err)
  );

  // Fetch queued jobs that have exceeded neither max attempts nor their backoff delay.
  // Without the backoff gate, a provider rate limit burns all MAX_ATTEMPTS within
  // seconds, because every drain trigger (webhook, upload, rescan, refresh) re-picks
  // the job the instant it returns to "queued".
  const jobs = await db
    .select({
      id: lineProcessingJobs.id,
      slipId: lineProcessingJobs.slipId,
      attempts: lineProcessingJobs.attempts,
    })
    .from(lineProcessingJobs)
    .where(
      and(
        eq(lineProcessingJobs.status, "queued"),
        lte(lineProcessingJobs.attempts, MAX_ATTEMPTS - 1),
        sql`(
          ${lineProcessingJobs.lastAttemptAt} IS NULL
          OR ${lineProcessingJobs.lastAttemptAt} < now() - (interval '1 minute' * power(${RETRY_BACKOFF_FACTOR}, ${lineProcessingJobs.attempts} - 1))
        )`
      )
    )
    .orderBy(lineProcessingJobs.createdAt)
    .limit(BATCH_SIZE);

  let processed = 0;
  let errors = 0;

  for (const job of jobs) {
    // Atomically claim job (prevents double-processing if two cron runs overlap)
    // The attempt number this run owns; every later write checks it.
    const claimedAttempts = (job.attempts ?? 0) + 1;
    const claimed = await db
      .update(lineProcessingJobs)
      .set({
        status: "processing",
        attempts: claimedAttempts,
        lastAttemptAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(lineProcessingJobs.id, job.id),
          eq(lineProcessingJobs.status, "queued") // Only claim if still queued
        )
      )
      .returning({ id: lineProcessingJobs.id });

    if (!claimed.length) continue; // Another worker claimed this job

    try {
      await processJob(job.id, job.slipId, claimedAttempts);
      processed++;
    } catch (err) {
      errors++;
      console.error(
        `[Worker] Job #${job.id} (slip #${job.slipId}) failed:`,
        err
      );

      const nextStatus =
        (job.attempts ?? 0) + 1 >= MAX_ATTEMPTS ? "failed" : "queued";

      await db
        .update(lineProcessingJobs)
        .set({
          status: nextStatus,
          errorMessage: err instanceof Error ? err.message : String(err),
          updatedAt: new Date(),
        })
        // Same ownership guard as the success path: a run that lost its job
        // must not move the state of the run that owns it now.
        .where(
          and(
            eq(lineProcessingJobs.id, job.id),
            eq(lineProcessingJobs.status, "processing"),
            eq(lineProcessingJobs.attempts, claimedAttempts)
          )
        )
        .catch((e: unknown) =>
          console.error("[Worker] Failed to update job status:", e)
        );

      // Mark slip as failed if max retries exceeded
      if (nextStatus === "failed") {
        await db
          .update(lineSlips)
          .set({
            status: "failed",
            lastErrorMessage: err instanceof Error ? err.message : String(err),
            updatedAt: new Date(),
          })
          // Never overwrite a decision staff already made on this slip.
          .where(
            and(
              eq(lineSlips.id, job.slipId),
              eq(lineSlips.status, "pending")
            )
          )
          .catch((e: unknown) =>
            console.error("[Worker] Failed to mark slip failed:", e)
          );
      }
    }
  }

  return { processed, errors };
}

// ─── Express Route Registration ───────────────────────────────────────────────

export function registerLineWorker(app: Express): void {
  app.get(
    "/api/line/process-worker",
    async (req: Request, res: Response): Promise<void> => {
      if (!isAuthorizedCron(req)) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      try {
        const result = await runWorkerBatch();
        console.log(
          `[Worker] Batch complete: processed=${result.processed}, errors=${result.errors}`
        );
        res.status(200).json({ ok: true, ...result });
      } catch (err) {
        console.error("[Worker] Batch runner failed:", err);
        res.status(500).json({ error: "Worker batch failed" });
      }
    }
  );
}
