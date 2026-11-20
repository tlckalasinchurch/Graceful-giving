// Data-access functions for this domain, extracted verbatim from
// server/db.ts (Phase 4 god-file split). Pure move: no logic, query,
// validation or authorisation change. server/db.ts re-exports this
// module, so existing imports keep working.

import {
  CountingSession,
  InsertBankRecord,
  InsertCashCount,
  InsertCountingSession,
  InsertExpense,
  InsertOfferingEnvelope,
  InsertSessionDeduction,
  InsertSessionDocument,
  bankRecords,
  cashCounts,
  countingSessions,
  expenses,
  offeringEnvelopes,
  offerings,
  sessionDeductions,
  sessionDocuments,
} from "../../drizzle/schema";
import {
  DEFAULT_CHURCH_ID,
  getDb,
} from "./core";
import {
  reconcile,
  type CountingStatus,
} from "@shared/counting";
import {
  and,
  asc,
  desc,
  eq,
  inArray,
  isNotNull,
  isNull,
  ne,
  sql,
} from "drizzle-orm";

// ─── Weekly Offering Counting ─────────────────────────────────────────────────

const num = (value: unknown) => parseFloat((value as string) ?? "0");

export async function listCountingSessions(
  churchId = DEFAULT_CHURCH_ID,
  limit = 52
) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .select()
    .from(countingSessions)
    .where(eq(countingSessions.churchId, churchId))
    .orderBy(desc(countingSessions.serviceDate))
    .limit(limit);
  return rows;
}

export async function getCountingSession(
  id: number,
  churchId = DEFAULT_CHURCH_ID
) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select()
    .from(countingSessions)
    .where(
      and(eq(countingSessions.id, id), eq(countingSessions.churchId, churchId))
    )
    .limit(1);
  return rows[0] ?? null;
}

/**
 * Sessions are ordered by Sunday, then service round, then id.
 *
 * The date is bound as an ISO string cast to `timestamp`: drizzle's
 * postgres-js driver does not serialise a raw `Date` inside a `sql` template.
 * The cast keeps the UTC wall clock, the same form the column stores.
 */
function countingSessionsBefore(session: CountingSession) {
  return sql`(${countingSessions.serviceDate}, ${countingSessions.serviceRound}, ${countingSessions.id}) < (${session.serviceDate.toISOString()}::timestamp, ${session.serviceRound}, ${session.id})`;
}

/** The latest posted or closed session before `session`. */
export async function findPreviousPostedSession(
  session: CountingSession,
  churchId = DEFAULT_CHURCH_ID
) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select()
    .from(countingSessions)
    .where(
      and(
        eq(countingSessions.churchId, churchId),
        inArray(countingSessions.status, ["posted", "closed"]),
        countingSessionsBefore(session)
      )
    )
    .orderBy(
      desc(countingSessions.serviceDate),
      desc(countingSessions.serviceRound),
      desc(countingSessions.id)
    )
    .limit(1);
  return rows[0] ?? null;
}

/** The earliest session before `session` that has not been posted yet. */
export async function findEarlierUnpostedSession(
  session: CountingSession,
  churchId = DEFAULT_CHURCH_ID
) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select()
    .from(countingSessions)
    .where(
      and(
        eq(countingSessions.churchId, churchId),
        inArray(countingSessions.status, ["counting", "counted", "verified"]),
        countingSessionsBefore(session)
      )
    )
    .orderBy(
      asc(countingSessions.serviceDate),
      asc(countingSessions.serviceRound),
      asc(countingSessions.id)
    )
    .limit(1);
  return rows[0] ?? null;
}

/**
 * Where a session's opening balances come from: its own stored figures (set by
 * hand on the first round, or frozen when it posted), else what the previous
 * posted round carried out. null when neither exists, including when the
 * previous round predates carry-forward and never recorded a closing balance.
 */
export async function resolveOpeningBalances(
  session: CountingSession,
  churchId = DEFAULT_CHURCH_ID
): Promise<{
  openingCash: number;
  openingBank: number;
  source: "stored" | "previous";
} | null> {
  if (session.openingCash !== null && session.openingBank !== null) {
    return {
      openingCash: num(session.openingCash),
      openingBank: num(session.openingBank),
      source: "stored",
    };
  }
  const previous = await findPreviousPostedSession(session, churchId);
  if (
    !previous ||
    previous.cashOnHandActual === null ||
    previous.closingBank === null
  ) {
    return null;
  }
  return {
    openingCash: num(previous.cashOnHandActual),
    openingBank: num(previous.closingBank),
    source: "previous",
  };
}

/** Writes carry-forward fields on a session that has not been posted. */
export async function setCountingCarryFields(
  id: number,
  fields: Partial<
    Pick<
      InsertCountingSession,
      | "openingCash"
      | "openingBank"
      | "cashOnHandActual"
      | "passbookBalance"
      | "passbookBalanceDate"
    >
  >,
  churchId = DEFAULT_CHURCH_ID
) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const rows = await db
    .update(countingSessions)
    .set(fields)
    .where(
      and(
        eq(countingSessions.id, id),
        eq(countingSessions.churchId, churchId),
        inArray(countingSessions.status, ["counting", "counted", "verified"])
      )
    )
    .returning({ id: countingSessions.id });
  return rows.length > 0;
}

/**
 * The session with every part needed to reconcile it. Returns null when the
 * session does not exist, so callers can map that to NOT_FOUND.
 */
export async function getCountingSessionDetail(
  id: number,
  churchId = DEFAULT_CHURCH_ID
) {
  const db = await getDb();
  if (!db) return null;
  const session = await getCountingSession(id, churchId);
  if (!session) return null;

  const [envelopeRows, cashRows, deductionRows, bankRows, documentRows] =
    await Promise.all([
      db
        .select()
        .from(offeringEnvelopes)
        .where(eq(offeringEnvelopes.sessionId, id))
        .orderBy(asc(offeringEnvelopes.id)),
      db
        .select()
        .from(cashCounts)
        .where(eq(cashCounts.sessionId, id))
        .orderBy(desc(cashCounts.denomination)),
      db
        .select()
        .from(sessionDeductions)
        .where(eq(sessionDeductions.sessionId, id))
        .orderBy(asc(sessionDeductions.id)),
      db
        .select()
        .from(bankRecords)
        .where(eq(bankRecords.sessionId, id))
        .orderBy(asc(bankRecords.id)),
      db
        .select()
        .from(sessionDocuments)
        .where(eq(sessionDocuments.sessionId, id))
        .orderBy(desc(sessionDocuments.createdAt)),
    ]);

  const envelopes = envelopeRows.map(r => ({ ...r, amount: num(r.amount) }));
  const cash = cashRows.map(r => ({
    ...r,
    denomination: num(r.denomination),
  }));
  const deductions = deductionRows.map(r => ({ ...r, amount: num(r.amount) }));
  const bank = bankRows.map(r => ({ ...r, amount: num(r.amount) }));
  const opening = await resolveOpeningBalances(session, churchId);

  return {
    session,
    envelopes,
    cashCounts: cash,
    deductions,
    bankRecords: bank,
    documents: documentRows,
    openingSource: opening?.source ?? null,
    reconciliation: reconcile({
      envelopes,
      cashCounts: cash,
      deductions,
      bankRecords: bank,
      carry: {
        openingCash: opening?.openingCash ?? null,
        openingBank: opening?.openingBank ?? null,
        cashOnHandActual:
          session.cashOnHandActual === null
            ? null
            : num(session.cashOnHandActual),
        passbookBalance:
          session.passbookBalance === null
            ? null
            : num(session.passbookBalance),
      },
    }),
  };
}

export async function createCountingSession(
  input: Omit<InsertCountingSession, "churchId">,
  churchId = DEFAULT_CHURCH_ID
) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const rows = await db
    .insert(countingSessions)
    .values({ ...input, churchId })
    .returning({ id: countingSessions.id });
  return rows[0].id;
}

/**
 * The `from` guard makes the update a compare-and-set, so two people pressing
 * the same button cannot both succeed.
 */
export async function setCountingSessionStatus(
  id: number,
  from: CountingStatus,
  to: CountingStatus,
  patch: Partial<Omit<InsertCountingSession, "churchId" | "status">> = {},
  churchId = DEFAULT_CHURCH_ID
) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const rows = await db
    .update(countingSessions)
    .set({ ...patch, status: to })
    .where(
      and(
        eq(countingSessions.id, id),
        eq(countingSessions.churchId, churchId),
        eq(countingSessions.status, from)
      )
    )
    .returning({ id: countingSessions.id });
  return rows.length > 0;
}

export async function addOfferingEnvelope(
  input: Omit<InsertOfferingEnvelope, "churchId">,
  churchId = DEFAULT_CHURCH_ID
) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const rows = await db
    .insert(offeringEnvelopes)
    .values({ ...input, churchId })
    .returning({ id: offeringEnvelopes.id });
  return rows[0].id;
}

export async function updateOfferingEnvelope(
  id: number,
  sessionId: number,
  input: Partial<Omit<InsertOfferingEnvelope, "churchId" | "sessionId">>
) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const rows = await db
    .update(offeringEnvelopes)
    .set(input)
    .where(
      and(
        eq(offeringEnvelopes.id, id),
        eq(offeringEnvelopes.sessionId, sessionId)
      )
    )
    .returning({ id: offeringEnvelopes.id });
  return rows[0]?.id ?? null;
}

export async function deleteOfferingEnvelope(id: number, sessionId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const rows = await db
    .delete(offeringEnvelopes)
    .where(
      and(
        eq(offeringEnvelopes.id, id),
        eq(offeringEnvelopes.sessionId, sessionId)
      )
    )
    .returning({ id: offeringEnvelopes.id });
  return rows.length > 0;
}

/** One row per denomination per session; writing the same denomination twice updates it. */
export async function setCashCount(
  input: InsertCashCount & { denomination: string }
) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  return db.transaction(async tx => {
    const existing = await tx
      .select({ id: cashCounts.id })
      .from(cashCounts)
      .where(
        and(
          eq(cashCounts.sessionId, input.sessionId),
          eq(cashCounts.denomination, input.denomination),
          eq(cashCounts.kind, input.kind)
        )
      )
      .limit(1);
    if (existing[0]) {
      await tx
        .update(cashCounts)
        .set({ quantity: input.quantity })
        .where(eq(cashCounts.id, existing[0].id));
      return existing[0].id;
    }
    const rows = await tx
      .insert(cashCounts)
      .values(input)
      .returning({ id: cashCounts.id });
    return rows[0].id;
  });
}

export async function addSessionDeduction(
  input: Omit<InsertSessionDeduction, "churchId">,
  churchId = DEFAULT_CHURCH_ID
) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const rows = await db
    .insert(sessionDeductions)
    .values({ ...input, churchId })
    .returning({ id: sessionDeductions.id });
  return rows[0].id;
}

/** Approves a deduction. Rejects the attempt when the approver requested it. */
export async function approveSessionDeduction(
  id: number,
  approverId: number,
  churchId = DEFAULT_CHURCH_ID
) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const rows = await db
    .update(sessionDeductions)
    .set({ approvedBy: approverId, approvedAt: new Date() })
    .where(
      and(
        eq(sessionDeductions.id, id),
        eq(sessionDeductions.churchId, churchId),
        ne(sessionDeductions.requestedBy, approverId)
      )
    )
    .returning({ id: sessionDeductions.id });
  return rows.length > 0;
}

export async function deleteSessionDeduction(id: number, sessionId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const rows = await db
    .delete(sessionDeductions)
    .where(
      and(
        eq(sessionDeductions.id, id),
        eq(sessionDeductions.sessionId, sessionId)
      )
    )
    .returning({ id: sessionDeductions.id });
  return rows.length > 0;
}

export async function addBankRecord(
  input: Omit<InsertBankRecord, "churchId">,
  churchId = DEFAULT_CHURCH_ID
) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const rows = await db
    .insert(bankRecords)
    .values({ ...input, churchId })
    .returning({ id: bankRecords.id });
  return rows[0].id;
}

export async function deleteBankRecord(
  id: number,
  sessionId: number,
  churchId = DEFAULT_CHURCH_ID
) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const rows = await db
    .delete(bankRecords)
    .where(
      and(
        eq(bankRecords.id, id),
        eq(bankRecords.sessionId, sessionId),
        eq(bankRecords.churchId, churchId),
        eq(bankRecords.passbookMatched, false),
        isNull(bankRecords.withdrawalRequestId)
      )
    )
    .returning({ id: bankRecords.id });
  return rows.length > 0;
}

/** Marks a bank line as seen in the passbook. */
export async function matchBankRecordToPassbook(
  id: number,
  matchedBy: number,
  passbookDate: Date,
  churchId = DEFAULT_CHURCH_ID
) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const rows = await db
    .update(bankRecords)
    .set({ passbookMatched: true, passbookDate, matchedBy })
    .where(and(eq(bankRecords.id, id), eq(bankRecords.churchId, churchId)))
    .returning({ id: bankRecords.id });
  return rows.length > 0;
}

export async function addSessionDocument(
  input: Omit<InsertSessionDocument, "churchId">,
  churchId = DEFAULT_CHURCH_ID
) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const rows = await db
    .insert(sessionDocuments)
    .values({ ...input, churchId })
    .returning({ id: sessionDocuments.id });
  return rows[0].id;
}

/**
 * Writes a verified session into the ledger, in one transaction:
 * every envelope becomes an offering row, every approved deduction becomes an
 * expense row, and the fund balances move once. Nothing here recalculates the
 * money — the caller must reconcile first.
 */
export async function postCountingSession(
  id: number,
  postedBy: number,
  carry: { openingCash: number; openingBank: number; closingBank: number },
  churchId = DEFAULT_CHURCH_ID
) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");

  return db.transaction(async tx => {
    // Compare-and-set on `verified` so a session can never post twice. The
    // carried balances are frozen in the same write, so the next round reads
    // exactly what this one closed with.
    const claimed = await tx
      .update(countingSessions)
      .set({
        status: "posted",
        postedBy,
        postedAt: new Date(),
        openingCash: carry.openingCash.toFixed(2),
        openingBank: carry.openingBank.toFixed(2),
        closingBank: carry.closingBank.toFixed(2),
      })
      .where(
        and(
          eq(countingSessions.id, id),
          eq(countingSessions.churchId, churchId),
          eq(countingSessions.status, "verified")
        )
      )
      .returning({
        id: countingSessions.id,
        serviceDate: countingSessions.serviceDate,
      });
    if (!claimed[0]) return null;
    const serviceDate = claimed[0].serviceDate;

    const envelopeRows = await tx
      .select()
      .from(offeringEnvelopes)
      .where(eq(offeringEnvelopes.sessionId, id));

    let offeringCount = 0;
    for (const envelope of envelopeRows) {
      await tx.insert(offerings).values({
        churchId,
        sessionId: id,
        amount: envelope.amount,
        category: envelope.category,
        fundId: envelope.fundId,
        donorName: envelope.isAnonymous ? null : envelope.donorName,
        donorMemberId: envelope.memberId,
        receiptDate: serviceDate,
        method: envelope.method,
        reference: envelope.reference,
        notes: envelope.notes,
        recordedBy: envelope.recordedBy,
      });
      if (envelope.fundId) {
        await tx.execute(
          sql`UPDATE finance_accounts SET balance = balance + ${envelope.amount} WHERE id = ${envelope.fundId} AND "churchId" = ${churchId}`
        );
      }
      offeringCount += 1;
    }

    const deductionRows = await tx
      .select()
      .from(sessionDeductions)
      .where(eq(sessionDeductions.sessionId, id));

    let deductionCount = 0;
    for (const deduction of deductionRows) {
      const inserted = await tx
        .insert(expenses)
        .values({
          churchId,
          amount: deduction.amount,
          category: deduction.category,
          fundId: deduction.fundId,
          description: deduction.purpose,
          details: `หักจากถุงถวาย ${deduction.reason}`,
          expenseDate: serviceDate,
          payee: deduction.paidTo,
          status: "approved",
          recordedBy: deduction.requestedBy,
        } as InsertExpense)
        .returning({ id: expenses.id });
      await tx
        .update(sessionDeductions)
        .set({ expenseId: inserted[0].id })
        .where(eq(sessionDeductions.id, deduction.id));
      if (deduction.fundId) {
        await tx.execute(
          sql`UPDATE finance_accounts SET balance = balance - ${deduction.amount} WHERE id = ${deduction.fundId} AND "churchId" = ${churchId}`
        );
      }
      deductionCount += 1;
    }

    return { offeringCount, deductionCount };
  });
}

export async function deleteCountingSession(
  id: number,
  churchId = DEFAULT_CHURCH_ID
) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");

  return db.transaction(async tx => {
    const session = await tx
      .select({ id: countingSessions.id, status: countingSessions.status })
      .from(countingSessions)
      .where(
        and(
          eq(countingSessions.id, id),
          eq(countingSessions.churchId, churchId)
        )
      )
      .limit(1);

    if (!session[0]) {
      return { success: false, reason: "NOT_FOUND" as const };
    }

    if (session[0].status === "posted" || session[0].status === "closed") {
      return { success: false, reason: "ALREADY_POSTED" as const };
    }

    // A bank line that a withdrawal request produced survives the round; its
    // request still points here, so the session cannot simply vanish.
    const linkedWithRounds = await tx
      .select({ id: bankRecords.id })
      .from(bankRecords)
      .where(
        and(
          eq(bankRecords.sessionId, id),
          isNotNull(bankRecords.withdrawalRequestId)
        )
      );
    if (linkedWithRounds.length > 0) {
      return { success: false, reason: "HAS_WITHDRAWALS" as const };
    }

    // Cascade delete related records in reverse dependency order:
    await tx.delete(sessionDocuments).where(eq(sessionDocuments.sessionId, id));
    await tx.delete(bankRecords).where(eq(bankRecords.sessionId, id));
    await tx
      .delete(sessionDeductions)
      .where(eq(sessionDeductions.sessionId, id));
    await tx.delete(cashCounts).where(eq(cashCounts.sessionId, id));
    await tx
      .delete(offeringEnvelopes)
      .where(eq(offeringEnvelopes.sessionId, id));

    const deleted = await tx
      .delete(countingSessions)
      .where(
        and(
          eq(countingSessions.id, id),
          eq(countingSessions.churchId, churchId)
        )
      )
      .returning({ id: countingSessions.id });

    return { success: deleted.length > 0, reason: null };
  });
}

export async function resetCountingSession(
  id: number,
  churchId = DEFAULT_CHURCH_ID
) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");

  return db.transaction(async tx => {
    const session = await tx
      .select({ id: countingSessions.id, status: countingSessions.status })
      .from(countingSessions)
      .where(
        and(
          eq(countingSessions.id, id),
          eq(countingSessions.churchId, churchId)
        )
      )
      .limit(1);

    if (!session[0]) {
      return { success: false, reason: "NOT_FOUND" as const };
    }

    if (session[0].status === "posted" || session[0].status === "closed") {
      return { success: false, reason: "ALREADY_POSTED" as const };
    }

    // Reset child data for a fresh recount, but never a bank line that a
    // withdrawal request produced: that record is an audit trail, not scratch.
    await tx.delete(sessionDocuments).where(eq(sessionDocuments.sessionId, id));
    await tx
      .delete(bankRecords)
      .where(
        and(
          eq(bankRecords.sessionId, id),
          isNull(bankRecords.withdrawalRequestId)
        )
      );
    await tx
      .delete(sessionDeductions)
      .where(eq(sessionDeductions.sessionId, id));
    await tx.delete(cashCounts).where(eq(cashCounts.sessionId, id));
    await tx
      .delete(offeringEnvelopes)
      .where(eq(offeringEnvelopes.sessionId, id));

    // Reset session back to "counting" status and clear workflow timestamps
    await tx
      .update(countingSessions)
      .set({
        status: "counting",
        countSubmittedAt: null,
        verifiedBy: null,
        verifiedAt: null,
        varianceNote: null,
        varianceApprovedBy: null,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(countingSessions.id, id),
          eq(countingSessions.churchId, churchId)
        )
      );

    return { success: true, reason: null };
  });
}
