// Data-access functions for this domain, extracted verbatim from
// server/db.ts (Phase 4 god-file split). Pure move: no logic, query,
// validation or authorisation change. server/db.ts re-exports this
// module, so existing imports keep working.

import {
  CountingSession,
  InsertWithdrawalRequest,
  bankRecords,
  bankSigners,
  countingSessions,
  users,
  withdrawalApprovals,
  withdrawalRequests,
} from "../../drizzle/schema";
import {
  DEFAULT_CHURCH_ID,
  bangkokDateOfColumn,
  bangkokDateOfInstant,
  getDb,
  type CountingTx,
} from "./core";
import {
  approvalState,
  type ApprovalOutcome,
  type Signature,
} from "@shared/withdrawals";
import {
  and,
  asc,
  desc,
  eq,
  inArray,
  isNull,
  sql,
} from "drizzle-orm";

// ─── Withdrawal Requests ──────────────────────────────────────────────────────

export async function listWithdrawalRequests(
  churchId = DEFAULT_CHURCH_ID,
  opts: { userId?: number; status?: string } = {}
) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(withdrawalRequests.churchId, churchId)];
  if (opts.userId)
    conditions.push(eq(withdrawalRequests.requestedBy, opts.userId));

  const rows = await db
    .select({
      request: withdrawalRequests,
      requesterName: users.name,
    })
    .from(withdrawalRequests)
    .leftJoin(users, eq(withdrawalRequests.requestedBy, users.id))
    .where(and(...conditions))
    .orderBy(desc(withdrawalRequests.createdAt))
    .limit(50);

  const ids = rows.map(r => r.request.id);
  const signaturesByRequest = new Map<
    number,
    Array<
      Signature & { note: string | null; createdAt: Date; name: string | null }
    >
  >();
  if (ids.length > 0) {
    const signatureRows = await db
      .select({ row: withdrawalApprovals, signerName: users.name })
      .from(withdrawalApprovals)
      .leftJoin(users, eq(withdrawalApprovals.userId, users.id))
      .where(inArray(withdrawalApprovals.requestId, ids))
      .orderBy(asc(withdrawalApprovals.createdAt), asc(withdrawalApprovals.id));
    for (const s of signatureRows) {
      const signatures = signaturesByRequest.get(s.row.requestId) ?? [];
      signatures.push({
        userId: s.row.userId,
        name: s.signerName,
        decision: s.row.decision as "approved" | "rejected",
        note: s.row.note,
        createdAt: s.row.createdAt,
        wasRequiredSigner: s.row.wasRequiredSigner,
      });
      signaturesByRequest.set(s.row.requestId, signatures);
    }
  }

  return rows.map(r => ({
    ...r.request,
    requesterName: r.requesterName,
    amount: parseFloat((r.request.amount as unknown as string) ?? "0"),
    signatures: signaturesByRequest.get(r.request.id) ?? [],
    approval: approvalState(signaturesByRequest.get(r.request.id) ?? []),
  }));
}

export async function createWithdrawalRequest(
  input: Omit<InsertWithdrawalRequest, "churchId">,
  churchId = DEFAULT_CHURCH_ID
) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const result = await db
    .insert(withdrawalRequests)
    .values({ ...input, churchId })
    .returning({ id: withdrawalRequests.id });
  return result[0].id;
}

/** A business rule a sign/cancel step broke, reported to tRPC as-is. */
export class WorkflowError extends Error {
  constructor(
    public readonly trpcCode: "NOT_FOUND" | "CONFLICT",
    message: string
  ) {
    super(message);
    this.name = "WorkflowError";
  }
}

/** Walks the error and its causes looking for a Postgres unique violation. */
function isUniqueViolation(err: unknown): boolean {
  for (
    let e: unknown = err;
    e instanceof Error;
    e = (e as { cause?: unknown }).cause
  ) {
    if ((e as { code?: unknown }).code === "23505") return true;
  }
  return false;
}

export async function getWithdrawalRequestBasic(
  id: number,
  churchId = DEFAULT_CHURCH_ID
): Promise<{ requestedBy: number; status: string } | null> {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select({
      requestedBy: withdrawalRequests.requestedBy,
      status: withdrawalRequests.status,
    })
    .from(withdrawalRequests)
    .where(
      and(
        eq(withdrawalRequests.id, id),
        eq(withdrawalRequests.churchId, churchId)
      )
    )
    .limit(1);
  return rows[0] ?? null;
}

/**
 * Records one signer's decision on the request, in one transaction:
 * load (row-locked, so two simultaneous signers take turns and each sees
 * the other's committed signature), insert the signature rows with the
 * signer flag as it stood at that moment, re-run the bank rule, and close
 * the request with a compare-and-set from `pending`.
 */
export async function signWithdrawalRequest(
  requestId: number,
  userId: number,
  decision: "approved" | "rejected",
  note: string | null,
  churchId = DEFAULT_CHURCH_ID
): Promise<{ outcome: ApprovalOutcome }> {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  return db.transaction(async tx => {
    const [request] = await tx
      .select({ status: withdrawalRequests.status })
      .from(withdrawalRequests)
      .where(
        and(
          eq(withdrawalRequests.id, requestId),
          eq(withdrawalRequests.churchId, churchId)
        )
      )
      .for("update")
      .limit(1);
    if (!request) throw new WorkflowError("NOT_FOUND", "ไม่พบคำขอเบิก");
    if (request.status !== "pending") {
      throw new WorkflowError(
        "CONFLICT",
        "คำขอเบิกนี้ถูกดำเนินการไปแล้ว เปลี่ยนผลลงนามไม่ได้"
      );
    }

    const [signerRow] = await tx
      .select({ isRequired: bankSigners.isRequired })
      .from(bankSigners)
      .where(
        and(eq(bankSigners.churchId, churchId), eq(bankSigners.userId, userId))
      )
      .limit(1);

    try {
      await tx.insert(withdrawalApprovals).values({
        churchId,
        requestId,
        userId,
        decision,
        note,
        wasRequiredSigner: signerRow?.isRequired === true,
      });
    } catch (err) {
      if (isUniqueViolation(err)) {
        throw new WorkflowError("CONFLICT", "คุณลงนามคำขอนี้แล้ว");
      }
      throw err;
    }

    const sigRows = await tx
      .select({
        decision: withdrawalApprovals.decision,
        wasRequiredSigner: withdrawalApprovals.wasRequiredSigner,
      })
      .from(withdrawalApprovals)
      .where(eq(withdrawalApprovals.requestId, requestId));
    const state = approvalState(
      sigRows.map(s => ({
        decision: s.decision as "approved" | "rejected",
        wasRequiredSigner: s.wasRequiredSigner,
        userId: 0,
      }))
    );

    if (state.outcome !== "pending") {
      // Other transactions may only flip the status from `pending`, so the
      // first signer to complete the rule wins and the rest see CONFLICT.
      const rows = await tx
        .update(withdrawalRequests)
        .set({
          status: state.outcome,
          approvedBy: state.outcome === "approved" ? userId : null,
          approvalDate: state.outcome === "approved" ? new Date() : null,
          approvalNote: state.outcome === "approved" ? (note ?? null) : null,
          rejectionReason: state.outcome === "rejected" ? (note ?? null) : null,
        })
        .where(
          and(
            eq(withdrawalRequests.id, requestId),
            eq(withdrawalRequests.churchId, churchId),
            eq(withdrawalRequests.status, "pending")
          )
        )
        .returning({ id: withdrawalRequests.id });
      if (rows.length === 0) {
        throw new WorkflowError(
          "CONFLICT",
          "คำขอเบิกนี้ถูกดำเนินการไปแล้ว เปลี่ยนผลลงนามไม่ได้"
        );
      }
    }

    return { outcome: state.outcome };
  });
}

export async function cancelWithdrawalRequest(
  id: number,
  userId: number,
  reason: string,
  churchId = DEFAULT_CHURCH_ID
): Promise<boolean> {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const rows = await db
    .update(withdrawalRequests)
    .set({
      status: "cancelled",
      cancelledAt: new Date(),
      cancelledBy: userId,
      cancelReason: reason,
    })
    .where(
      and(
        eq(withdrawalRequests.id, id),
        eq(withdrawalRequests.churchId, churchId),
        inArray(withdrawalRequests.status, ["pending", "approved"])
      )
    )
    .returning({ id: withdrawalRequests.id });
  return rows.length > 0;
}

export async function disburseWithdrawal(
  id: number,
  disbursedBy: number,
  churchId = DEFAULT_CHURCH_ID
): Promise<{ attachedSessionId: number | null } | null> {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  return db.transaction(async tx => {
    // The `approved` guard makes this a compare-and-set: only finance roles
    // reach here, but two treasurers pressing together must not pay twice.
    const rows = await tx
      .update(withdrawalRequests)
      .set({ status: "disbursed", disbursedAt: new Date(), disbursedBy })
      .where(
        and(
          eq(withdrawalRequests.id, id),
          eq(withdrawalRequests.churchId, churchId),
          eq(withdrawalRequests.status, "approved")
        )
      )
      .returning({ id: withdrawalRequests.id });
    if (rows.length === 0) return null;
    const attachedSessionId = await attachWithdrawalToCounting(
      id,
      tx,
      churchId
    );
    return { attachedSessionId };
  });
}

/**
 * "Date" means the calendar date in Asia/Bangkok, because the counting rounds
 * are planned by Thai Sundays, not UTC days.
 *
 * Storage: `timestamp` (without time zone) columns hold the UTC wall clock.
 * Drizzle writes `toISOString()` and reads `value + "+0000"`. A plain
 * `col AT TIME ZONE 'Asia/Bangkok'` would read that UTC value as Bangkok local
 * time and return a date that is up to 14 hours off. The column is read as
 * UTC first, then converted. The result does not depend on the session time
 * zone.
 */

export async function attachWithdrawalToCounting(
  requestId: number,
  tx: CountingTx,
  churchId = DEFAULT_CHURCH_ID
): Promise<number | null> {
  const [request] = await tx
    .select({
      amount: withdrawalRequests.amount,
      purpose: withdrawalRequests.purpose,
      status: withdrawalRequests.status,
      disbursedAt: withdrawalRequests.disbursedAt,
      disbursedBy: withdrawalRequests.disbursedBy,
    })
    .from(withdrawalRequests)
    .where(
      and(
        eq(withdrawalRequests.id, requestId),
        eq(withdrawalRequests.churchId, churchId)
      )
    )
    .for("update")
    .limit(1);
  if (!request || request.status !== "disbursed" || !request.disbursedAt) {
    return null;
  }

  const existing = await tx
    .select({ sessionId: bankRecords.sessionId })
    .from(bankRecords)
    .where(eq(bankRecords.withdrawalRequestId, requestId))
    .limit(1);
  if (existing[0]) return null; // Already attached; do not attach twice.

  const [target] = await tx
    .select({ id: countingSessions.id })
    .from(countingSessions)
    .where(
      and(
        eq(countingSessions.churchId, churchId),
        inArray(countingSessions.status, ["counting", "counted", "verified"]),
        sql`${bangkokDateOfColumn(sql`${countingSessions.serviceDate}`)} >= ${bangkokDateOfInstant(request.disbursedAt)}`
      )
    )
    .orderBy(
      asc(countingSessions.serviceDate),
      asc(countingSessions.serviceRound),
      asc(countingSessions.id)
    )
    .limit(1);
  if (!target) return null;

  const inserted = await tx
    .insert(bankRecords)
    .values({
      sessionId: target.id,
      churchId,
      type: "withdrawal",
      amount: request.amount,
      occurredAt: request.disbursedAt,
      recordedBy: request.disbursedBy ?? 0,
      notes: request.purpose,
      withdrawalRequestId: requestId,
    })
    // The index is the backstop when two concurrent attaches pass the read.
    .onConflictDoNothing()
    .returning({ id: bankRecords.id });
  if (inserted.length === 0) return null;
  return target.id;
}

/**
 * When a new counting round opens, every request paid earlier that has no
 * bank line yet (and whose payout date has come) flows in exactly once.
 * Returns how many were attached.
 */
export async function attachPendingWithdrawals(
  session: CountingSession,
  churchId = DEFAULT_CHURCH_ID
): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  return db.transaction(async tx => {
    const candidates = await tx
      .select({ id: withdrawalRequests.id })
      .from(withdrawalRequests)
      .leftJoin(
        bankRecords,
        eq(bankRecords.withdrawalRequestId, withdrawalRequests.id)
      )
      .where(
        and(
          eq(withdrawalRequests.churchId, churchId),
          eq(withdrawalRequests.status, "disbursed"),
          isNull(bankRecords.withdrawalRequestId),
          sql`${bangkokDateOfColumn(sql`${withdrawalRequests.disbursedAt}`)} <= ${bangkokDateOfInstant(session.serviceDate)}`
        )
      );
    let attached = 0;
    for (const candidate of candidates) {
      const landing = await attachWithdrawalToCounting(
        candidate.id,
        tx,
        churchId
      );
      if (landing !== null) attached += 1;
    }
    return attached;
  });
}

// ─── Bank signers (Part 2) ────────────────────────────────────────────────────

export async function listBankSigners(churchId = DEFAULT_CHURCH_ID) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      userId: bankSigners.userId,
      name: users.name,
      isRequired: bankSigners.isRequired,
    })
    .from(bankSigners)
    .leftJoin(users, eq(bankSigners.userId, users.id))
    .where(eq(bankSigners.churchId, churchId))
    .orderBy(desc(bankSigners.isRequired), desc(bankSigners.createdAt));
}

/** A signer row, or null when the person is not on the bank account list. */
export async function isBankSigner(
  userId: number,
  churchId = DEFAULT_CHURCH_ID
): Promise<{ isRequired: boolean } | null> {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select({ isRequired: bankSigners.isRequired })
    .from(bankSigners)
    .where(
      and(eq(bankSigners.churchId, churchId), eq(bankSigners.userId, userId))
    )
    .limit(1);
  return rows[0] ?? null;
}

export async function addBankSigner(
  userId: number,
  addedBy: number,
  churchId = DEFAULT_CHURCH_ID
): Promise<boolean> {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const existing = await isBankSigner(userId, churchId);
  if (existing) return false;
  await db.insert(bankSigners).values({ churchId, userId, addedBy });
  return true;
}

export async function removeBankSigner(
  userId: number,
  churchId = DEFAULT_CHURCH_ID
): Promise<boolean> {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const rows = await db
    .delete(bankSigners)
    .where(
      and(eq(bankSigners.churchId, churchId), eq(bankSigners.userId, userId))
    )
    .returning({ id: bankSigners.id });
  return rows.length > 0;
}

/**
 * Moves the "ต้องลงนามทุกครั้ง" flag to the new signer in one transaction, so
 * two churches of the sign never hold the flag at once and the flag never sits
 * on nobody when the move is midway.
 */
export async function setRequiredBankSigner(
  userId: number,
  churchId = DEFAULT_CHURCH_ID
): Promise<boolean> {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  return db.transaction(async tx => {
    await tx
      .update(bankSigners)
      .set({ isRequired: false })
      .where(
        and(
          eq(bankSigners.churchId, churchId),
          eq(bankSigners.isRequired, true)
        )
      );
    const rows = await tx
      .update(bankSigners)
      .set({ isRequired: true })
      .where(
        and(eq(bankSigners.churchId, churchId), eq(bankSigners.userId, userId))
      )
      .returning({ id: bankSigners.id });
    return rows.length > 0;
  });
}
