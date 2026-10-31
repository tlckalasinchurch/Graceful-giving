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
import {
  countRecentSystemRejectedSlips,
  getChurchProfile,
  getDb,
} from "../db";
import {
  lineSlips,
  lineProcessingJobs,
  type LineSlip,
} from "../../drizzle/schema";
import { and, eq, lte, sql } from "drizzle-orm";
import { getSlipSignedUrl } from "../storage";
import { MAX_AUTO_REJECTS } from "../../shared/givingLimits";
import { verifySlip } from "./slipVerification";
import { extractSlipData, requiresReview } from "./slipOcr";
import {
  checkDuplicateByReference,
  checkDuplicateByTransaction,
} from "./duplicateDetector";
import { matchMember } from "./memberMatcher";

const MAX_ATTEMPTS = 3;
const BATCH_SIZE = 10;
/** Retry delay grows as 1min, 5min between attempts, to outlast a provider rate limit. */
const RETRY_BACKOFF_FACTOR = 5;

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

async function processJob(jobId: number, slipId: number): Promise<void> {
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
    await db
      .update(lineProcessingJobs)
      .set({ status: "done", updatedAt: new Date() })
      .where(eq(lineProcessingJobs.id, jobId));
    return;
  }

  // 2. Get signed URL for private image
  const signedUrl = await getSlipSignedUrl(slip.slipImageKey);

  // 3. AI OCR extraction
  const extraction = await extractSlipData(signedUrl);

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
  await db
    .update(lineSlips)
    .set({
      status: finalStatus,
      aiRawText: extraction.rawText,
      aiData: {
        ...extraction,
        verification: {
          amount: verification.amount,
          receiver: verification.receiver,
          autoReject: verification.autoReject?.kind ?? null,
          escalated: verification.escalated,
        },
      } as unknown as Record<string, unknown>,
      extractedAmount: extraction.amount !== null ? String(extraction.amount) : null,
      extractedAmountConfidence: String(extraction.amountConfidence),
      extractedDate: extraction.transferDate ? new Date(extraction.transferDate) : null,
      extractedDateConfidence: String(extraction.dateConfidence),
      extractedRef: extraction.referenceNumber,
      extractedRefConfidence: String(extraction.referenceConfidence),
      extractedSenderName: extraction.senderName,
      extractedSenderConfidence: String(extraction.senderConfidence),
      extractedBank: extraction.bankName,
      matchedMemberId,
      matchedMemberName,
      matchedConfidence: matchedConfidence !== null ? String(matchedConfidence) : null,
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
    .where(eq(lineSlips.id, slipId));

  // 7. Mark job done
  await db
    .update(lineProcessingJobs)
    .set({ status: "done", updatedAt: new Date() })
    .where(eq(lineProcessingJobs.id, jobId));
}

// ─── Worker batch runner ──────────────────────────────────────────────────────

export async function runWorkerBatch(): Promise<{ processed: number; errors: number }> {
  const db = await getDb();
  if (!db) return { processed: 0, errors: 0 };

  // Fetch queued jobs that have exceeded neither max attempts nor their backoff delay.
  // Without the backoff gate, a provider rate limit burns all MAX_ATTEMPTS within
  // seconds, because every drain trigger (webhook, upload, rescan, refresh) re-picks
  // the job the instant it returns to "queued".
  const jobs = await db
    .select({ id: lineProcessingJobs.id, slipId: lineProcessingJobs.slipId, attempts: lineProcessingJobs.attempts })
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
    const claimed = await db
      .update(lineProcessingJobs)
      .set({
        status: "processing",
        attempts: (job.attempts ?? 0) + 1,
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
      await processJob(job.id, job.slipId);
      processed++;
    } catch (err) {
      errors++;
      console.error(`[Worker] Job #${job.id} (slip #${job.slipId}) failed:`, err);

      const nextStatus =
        (job.attempts ?? 0) + 1 >= MAX_ATTEMPTS ? "failed" : "queued";

      await db
        .update(lineProcessingJobs)
        .set({
          status: nextStatus,
          errorMessage: err instanceof Error ? err.message : String(err),
          updatedAt: new Date(),
        })
        .where(eq(lineProcessingJobs.id, job.id))
        .catch((e: unknown) => console.error("[Worker] Failed to update job status:", e));

      // Mark slip as failed if max retries exceeded
      if (nextStatus === "failed") {
        await db
          .update(lineSlips)
          .set({
            status: "failed",
            lastErrorMessage: err instanceof Error ? err.message : String(err),
            updatedAt: new Date(),
          })
          .where(eq(lineSlips.id, job.slipId))
          .catch((e: unknown) => console.error("[Worker] Failed to mark slip failed:", e));
      }
    }
  }

  return { processed, errors };
}

// ─── Express Route Registration ───────────────────────────────────────────────

export function registerLineWorker(app: Express): void {
  app.get("/api/line/process-worker", async (req: Request, res: Response): Promise<void> => {
    if (!isAuthorizedCron(req)) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    try {
      const result = await runWorkerBatch();
      console.log(`[Worker] Batch complete: processed=${result.processed}, errors=${result.errors}`);
      res.status(200).json({ ok: true, ...result });
    } catch (err) {
      console.error("[Worker] Batch runner failed:", err);
      res.status(500).json({ error: "Worker batch failed" });
    }
  });
}
