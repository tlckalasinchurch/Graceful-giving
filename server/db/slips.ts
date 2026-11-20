// Data-access functions for this domain, extracted verbatim from
// server/db.ts (Phase 4 god-file split). Pure move: no logic, query,
// validation or authorisation change. server/db.ts re-exports this
// module, so existing imports keep working.

import {
  LineSlip,
  auditLogs,
  financeAccounts,
  lineProcessingJobs,
  lineSlips,
  members,
  offerings,
  users,
} from "../../drizzle/schema";
import {
  resolveSlipImageUrl,
  storagePutPrivate,
} from "../storage";
import {
  DEFAULT_CHURCH_ID,
  getDb,
} from "./core";
import { type OfferingCategory } from "@shared/categories";
import {
  SPLIT_MESSAGE,
  checkSplit,
  splitReference,
  type SplitLine,
} from "@shared/givingSplit";
import { resolveLedgerName } from "@shared/ledgerName";
import {
  createHash,
  randomUUID,
} from "crypto";
import {
  and,
  count,
  desc,
  eq,
  gte,
  inArray,
  isNull,
  like,
  lt,
  ne,
  or,
  sql,
} from "drizzle-orm";

// ─── LINE Slip Giving Inbox ───────────────────────────────────────────────────

export interface ListLineSlipsFilter {
  status?: string;
  memberId?: number;
  limit?: number;
  offset?: number;
}

/**
 * Adds `submitterLineId`: the sender's real LINE user id. A slip sent from the
 * app stores `manual-<userId>` as its sender, so the id comes from the account
 * (`users.openId` is `line:<LINE userId>`). A slip from the LINE chat already
 * holds the real id.
 */
async function withSubmitterLineIds<
  T extends { lineUserId: string; submittedByUserId: number | null },
>(rows: T[]): Promise<Array<T & { submitterLineId: string | null }>> {
  const db = await getDb();
  const ids = Array.from(
    new Set(
      rows.map(r => r.submittedByUserId).filter((v): v is number => v !== null)
    )
  );
  const byId = new Map<number, string>();
  if (db && ids.length > 0) {
    const found = await db
      .select({ id: users.id, openId: users.openId })
      .from(users)
      .where(inArray(users.id, ids));
    for (const u of found) {
      if (u.openId.startsWith("line:")) byId.set(u.id, u.openId.slice(5));
    }
  }
  return rows.map(r => ({
    ...r,
    submitterLineId: r.lineUserId.startsWith("manual-")
      ? r.submittedByUserId !== null
        ? (byId.get(r.submittedByUserId) ?? null)
        : null
      : r.lineUserId,
  }));
}

export async function listLineSlips(
  churchId = DEFAULT_CHURCH_ID,
  filters: ListLineSlipsFilter = {}
) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");

  const conditions = [eq(lineSlips.churchId, churchId)];

  if (filters.status && filters.status !== "all") {
    conditions.push(eq(lineSlips.status, filters.status as LineSlip["status"]));
  }
  if (filters.memberId) {
    conditions.push(eq(lineSlips.matchedMemberId, filters.memberId));
  }

  const limit = filters.limit ?? 50;
  const offset = filters.offset ?? 0;

  const rows = await db
    .select()
    .from(lineSlips)
    .where(and(...conditions))
    .orderBy(desc(lineSlips.createdAt))
    .limit(limit)
    .offset(offset);

  // Generate signed URLs for slip images so frontend can render securely without public bucket
  const withIds = await withSubmitterLineIds(rows);
  const items = await Promise.all(
    withIds.map(async slip => {
      let signedUrl = "";
      try {
        if (slip.slipImageKey) {
          signedUrl = await resolveSlipImageUrl(slip.slipImageKey, slip.aiData);
        }
      } catch (e) {
        console.warn(
          `[listLineSlips] Failed to sign URL for slip #${slip.id}:`,
          e
        );
      }
      return {
        ...slip,
        signedImageUrl: signedUrl,
      };
    })
  );

  return items;
}

export async function getLineSlipById(
  id: number,
  churchId = DEFAULT_CHURCH_ID
) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");

  const rows = await db
    .select()
    .from(lineSlips)
    .where(and(eq(lineSlips.id, id), eq(lineSlips.churchId, churchId)))
    .limit(1);

  const slip = rows[0];
  if (!slip) return null;

  let signedImageUrl = "";
  try {
    if (slip.slipImageKey) {
      signedImageUrl = await resolveSlipImageUrl(
        slip.slipImageKey,
        slip.aiData
      );
    }
  } catch (e) {
    console.warn(`[getLineSlipById] Failed to sign URL for slip #${id}:`, e);
  }

  const [withId] = await withSubmitterLineIds([slip]);
  return {
    ...withId,
    signedImageUrl,
  };
}

export interface ApproveLineSlipInput {
  slipId: number;
  churchId?: string;
  approvedBy: number;
  fundId: number;
  amount: number;
  memberId?: number | null;
  donorName?: string | null;
  category?: string;
  receiptDate?: Date;
  reviewNote?: string;
  /** Required for an entry sent without a slip: the bank balance was checked. */
  confirmedBankCheck?: boolean;
  /**
   * One transfer, several categories. Two or more lines make a split: one
   * offering per line, and the lines must add up to `amount`. One line is the
   * same as `category`. Without it the donor's own split, if any, is used.
   */
  items?: SplitLine[];
}

/**
 * Approve a LINE Slip with strict atomic transaction and row locking:
 * 1. Lock line_slip (SELECT ... FOR UPDATE)
 * 2. Validate current status is not already approved/rejected
 * 3. Validate fund exists in finance_accounts and is active
 * 4. Validate amount > 0
 * 5. Insert Offering into offerings ledger (financial source of truth)
 * 6. Update fund balance in finance_accounts
 * 7. Update line_slips status to 'approved', link offeringId, reviewer
 * 8. Insert audit log
 * All in a single atomic transaction.
 */
export async function approveLineSlip(input: ApproveLineSlipInput) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const churchId = input.churchId ?? DEFAULT_CHURCH_ID;

  if (input.amount <= 0) {
    throw new Error("ยอดเงินถวายต้องมากกว่า 0 บาท");
  }

  return db.transaction(async tx => {
    // 1. Lock line_slip row
    const [slip] = await tx
      .select()
      .from(lineSlips)
      .where(
        and(eq(lineSlips.id, input.slipId), eq(lineSlips.churchId, churchId))
      )
      .for("update")
      .limit(1);

    if (!slip) {
      throw new Error(`ไม่พบสลิป #${input.slipId}`);
    }

    if (slip.status === "approved" || slip.approvedOfferingId) {
      throw new Error(
        `สลิป #${input.slipId} ได้รับการอนุมัติไปแล้ว (Offering #${slip.approvedOfferingId})`
      );
    }

    if (slip.status === "rejected") {
      throw new Error(`สลิป #${input.slipId} ถูกปฏิเสธไปแล้ว`);
    }

    if (slip.status === "duplicate") {
      throw new Error(
        `ไม่สามารถอนุมัติสลิป #${input.slipId} ได้ เนื่องจากระบบตรวจสอบพบว่าเป็นสลิปซ้ำ (Duplicate)`
      );
    }

    // Re-verify bank reference against active offerings at approval time
    const refToCheck = slip.extractedRef?.trim();
    if (refToCheck) {
      const [existingOffering] = await tx
        .select({ id: offerings.id })
        .from(offerings)
        .where(
          and(
            eq(offerings.churchId, churchId),
            eq(offerings.reference, refToCheck),
            eq(offerings.status, "active")
          )
        )
        .limit(1);

      if (existingOffering) {
        throw new Error(
          `ไม่สามารถอนุมัติได้: หมายเลขอ้างอิงธนาคาร ${refToCheck} ซ้ำกับรายการถวาย #${existingOffering.id} ในสมุดบัญชีแล้ว`
        );
      }
    }

    // 2. Validate fund
    const [fund] = await tx
      .select()
      .from(financeAccounts)
      .where(
        and(
          eq(financeAccounts.id, input.fundId),
          eq(financeAccounts.churchId, churchId),
          eq(financeAccounts.isActive, true)
        )
      )
      .limit(1);

    if (!fund) {
      throw new Error(
        `ไม่พบบัญชีกองทุนรหัส #${input.fundId} หรือกองทุนไม่ได้เปิดใช้งาน`
      );
    }

    // 3. Resolve the name for the books. Who sent it stays in its own columns.
    if (slip.source === "no_slip" && !input.confirmedBankCheck) {
      throw new Error(
        "รายการที่ส่งโดยไม่มีสลิปต้องยืนยันก่อนว่าตรวจกับยอดเข้าบัญชีธนาคารแล้ว"
      );
    }
    let memberName: string | null = null;
    if (input.memberId) {
      const [member] = await tx
        .select({ id: members.id, name: members.name })
        .from(members)
        .where(
          and(eq(members.id, input.memberId), eq(members.churchId, churchId))
        )
        .limit(1);
      memberName = member?.name ?? null;
    }
    const { name: donorName, source: nameSource } = resolveLedgerName({
      reviewerName: input.donorName,
      memberName,
      slipName: slip.extractedSenderName,
      typedName: slip.typedDonorName,
      lineName: slip.submittedByName ?? slip.lineDisplayName,
    });
    const submittedByName =
      slip.submittedByName ?? slip.lineDisplayName ?? null;

    // 4. Work out the lines: a split, or one line.
    let lines: SplitLine[];
    if (input.items && input.items.length >= 2) {
      lines = input.items;
    } else if (input.items && input.items.length === 1) {
      lines = [{ category: input.items[0].category, amount: input.amount }];
    } else if (
      !input.category &&
      Array.isArray(slip.declaredItems) &&
      slip.declaredItems.length >= 2
    ) {
      lines = slip.declaredItems as SplitLine[];
    } else {
      lines = [
        {
          category: (input.category as OfferingCategory) || "cash",
          amount: input.amount,
        },
      ];
    }
    if (lines.length >= 2) {
      const problem = checkSplit(lines, input.amount);
      if (problem) throw new Error(SPLIT_MESSAGE[problem]);
    }
    const isSplit = lines.length >= 2;

    // 5. Create the offerings in the ledger (the financial source of truth).
    // The ledger allows one active offering per bank reference, so the lines of
    // a split get `#2`, `#3` after the reference.
    const baseRef = slip.extractedRef || `LINE-${slip.id}`;
    const offeringIds: number[] = [];
    for (let index = 0; index < lines.length; index++) {
      const line = lines[index];
      const [offering] = await tx
        .insert(offerings)
        .values({
          churchId,
          amount: String(line.amount),
          category: line.category,
          fundId: input.fundId,
          donorName,
          donorMemberId: input.memberId ?? null,
          receiptDate:
            input.receiptDate ??
            slip.extractedDate ??
            slip.declaredDate ??
            new Date(),
          method: "transfer",
          reference: splitReference(baseRef, index),
          notes:
            `[${slip.source === "no_slip" ? "ไม่มีสลิป" : "LINE Slip"} #${slip.id}${isSplit ? ` แบ่งยอด ${index + 1}/${lines.length}` : ""}] ${input.reviewNote ? input.reviewNote : ""}`.trim(),
          recordedBy: input.approvedBy,
          submittedByUserId: slip.submittedByUserId ?? null,
          submittedByName,
          status: "active",
        })
        .returning({ id: offerings.id });
      offeringIds.push(offering.id);
    }
    const offering = { id: offeringIds[0] };

    // Update fund balance in finance_accounts, once for the whole transfer
    await tx.execute(
      sql`UPDATE finance_accounts SET balance = balance + ${input.amount} WHERE id = ${input.fundId} AND "churchId" = ${churchId}`
    );

    // 6. Update line_slips
    await tx
      .update(lineSlips)
      .set({
        status: "approved",
        fundId: input.fundId,
        approvedAmount: String(input.amount),
        approvedOfferingId: offering.id,
        matchedMemberId: input.memberId ?? slip.matchedMemberId,
        matchedMemberName: donorName,
        reviewedBy: input.approvedBy,
        reviewedAt: new Date(),
        reviewNote: input.reviewNote ?? null,
        updatedAt: new Date(),
      })
      .where(eq(lineSlips.id, input.slipId));

    // 7. Insert audit log
    await tx.insert(auditLogs).values({
      churchId,
      userId: input.approvedBy,
      action: "APPROVE_LINE_SLIP",
      entity: "line_slips",
      entityId: input.slipId,
      metadata: {
        offeringId: offering.id,
        amount: input.amount,
        fundId: input.fundId,
        fundName: fund.name,
        memberId: input.memberId,
        donorName,
        nameSource,
        slipSource: slip.source,
        offeringIds,
        split: isSplit ? lines : null,
        submittedByUserId: slip.submittedByUserId ?? null,
        slipRef: slip.extractedRef,
      },
    });

    return {
      success: true,
      slipId: input.slipId,
      offeringId: offering.id,
      offeringIds,
      submittedByUserId: slip.submittedByUserId ?? null,
      amount: input.amount,
    };
  });
}

export interface RejectLineSlipInput {
  slipId: number;
  churchId?: string;
  reviewedBy: number;
  reason: string;
}

/**
 * Reject a LINE slip atomically.
 */
export async function rejectLineSlip(input: RejectLineSlipInput) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const churchId = input.churchId ?? DEFAULT_CHURCH_ID;

  if (!input.reason.trim()) {
    throw new Error("กรุณาระบุเหตุผลการปฏิเสธสลิป");
  }

  return db.transaction(async tx => {
    const [slip] = await tx
      .select()
      .from(lineSlips)
      .where(
        and(eq(lineSlips.id, input.slipId), eq(lineSlips.churchId, churchId))
      )
      .for("update")
      .limit(1);

    if (!slip) throw new Error(`ไม่พบสลิป #${input.slipId}`);
    if (slip.status === "approved" || slip.approvedOfferingId) {
      throw new Error(`ไม่สามารถปฏิเสธสลิปที่ได้รับการอนุมัติแล้วได้`);
    }

    await tx
      .update(lineSlips)
      .set({
        status: "rejected",
        reviewedBy: input.reviewedBy,
        reviewedAt: new Date(),
        reviewNote: input.reason.trim(),
        updatedAt: new Date(),
      })
      .where(eq(lineSlips.id, input.slipId));

    await tx.insert(auditLogs).values({
      churchId,
      userId: input.reviewedBy,
      action: "REJECT_LINE_SLIP",
      entity: "line_slips",
      entityId: input.slipId,
      metadata: {
        reason: input.reason.trim(),
        previousStatus: slip.status,
      },
    });

    return {
      success: true,
      slipId: input.slipId,
      submittedByUserId: slip.submittedByUserId ?? null,
    };
  });
}

export interface UpdateLineSlipReviewInput {
  slipId: number;
  churchId?: string;
  fundId?: number | null;
  matchedMemberId?: number | null;
  matchedMemberName?: string | null;
  approvedAmount?: number | null;
  reviewNote?: string | null;
  status?: LineSlip["status"];
}

export async function updateLineSlipReview(input: UpdateLineSlipReviewInput) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const churchId = input.churchId ?? DEFAULT_CHURCH_ID;

  const updateSet: Record<string, unknown> = {
    updatedAt: new Date(),
  };

  if (input.fundId !== undefined) updateSet.fundId = input.fundId;
  if (input.matchedMemberId !== undefined)
    updateSet.matchedMemberId = input.matchedMemberId;
  if (input.matchedMemberName !== undefined)
    updateSet.matchedMemberName = input.matchedMemberName;
  if (input.approvedAmount !== undefined) {
    updateSet.approvedAmount =
      input.approvedAmount !== null ? String(input.approvedAmount) : null;
  }
  if (input.reviewNote !== undefined) updateSet.reviewNote = input.reviewNote;
  if (input.status !== undefined) updateSet.status = input.status;

  const [updated] = await db
    .update(lineSlips)
    .set(updateSet)
    .where(
      and(eq(lineSlips.id, input.slipId), eq(lineSlips.churchId, churchId))
    )
    .returning();

  return updated;
}

/**
 * Link a LINE User ID to a member profile.
 * Also back-fills matchedMemberId on all pending/needs_review slips from this LINE user.
 */
export async function linkLineUserToMember(
  churchId: string,
  lineUserId: string,
  memberId: number,
  adminUserId: number
) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");

  return db.transaction(async tx => {
    // 1. Check member
    const [member] = await tx
      .select()
      .from(members)
      .where(and(eq(members.id, memberId), eq(members.churchId, churchId)))
      .limit(1);

    if (!member) throw new Error(`ไม่พบสมาชิก #${memberId}`);

    // 2. Update member lineUserId
    await tx
      .update(members)
      .set({ lineUserId, updatedAt: new Date() })
      .where(eq(members.id, memberId));

    // 3. Retroactively link unapproved slips from this LINE user
    await tx
      .update(lineSlips)
      .set({
        matchedMemberId: member.id,
        matchedMemberName: member.name,
        matchedConfidence: "1.000",
        matchMethod: "line_id",
        status: sql`CASE WHEN status IN ('extracted', 'needs_review') THEN 'matched'::line_slip_status ELSE status END`,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(lineSlips.churchId, churchId),
          eq(lineSlips.lineUserId, lineUserId),
          ne(lineSlips.status, "approved"),
          ne(lineSlips.status, "rejected")
        )
      );

    // 4. Audit log
    await tx.insert(auditLogs).values({
      churchId,
      userId: adminUserId,
      action: "LINK_LINE_MEMBER",
      entity: "members",
      entityId: memberId,
      metadata: {
        lineUserId,
        memberName: member.name,
      },
    });

    return { success: true, memberId, lineUserId };
  });
}

export async function getLineInboxStats(churchId = DEFAULT_CHURCH_ID) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");

  const rows = await db
    .select({
      status: lineSlips.status,
      count: sql<number>`count(*)::int`,
    })
    .from(lineSlips)
    .where(eq(lineSlips.churchId, churchId))
    .groupBy(lineSlips.status);

  const stats: Record<
    | "pending"
    | "processing"
    | "extracted"
    | "needs_review"
    | "matched"
    | "duplicate"
    | "approved"
    | "rejected"
    | "failed",
    number
  > = {
    pending: 0,
    processing: 0,
    extracted: 0,
    needs_review: 0,
    matched: 0,
    duplicate: 0,
    approved: 0,
    rejected: 0,
    failed: 0,
  };

  for (const row of rows) {
    if (row.status in stats) {
      stats[row.status] = row.count;
    }
  }

  const reviewRequired =
    (stats.needs_review || 0) + (stats.matched || 0) + (stats.extracted || 0);

  return {
    ...stats,
    reviewRequired,
    total: Object.values(stats).reduce((a, b) => a + b, 0),
  };
}

/** Slips this person has submitted from the app since `since`. 0 when no DB. */
export async function countRecentManualSlips(
  userId: number,
  since: Date,
  churchId: string = DEFAULT_CHURCH_ID
): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const [row] = await db
    .select({ n: count() })
    .from(lineSlips)
    .where(
      and(
        eq(lineSlips.churchId, churchId),
        eq(lineSlips.lineUserId, `manual-${userId}`),
        gte(lineSlips.createdAt, since)
      )
    );
  return Number(row?.n ?? 0);
}

/** The columns a donor's status view needs, for slips they sent from the app. */
const donorSlipColumns = {
  id: lineSlips.id,
  createdAt: lineSlips.createdAt,
  status: lineSlips.status,
  declaredAmount: lineSlips.declaredAmount,
  declaredCategory: lineSlips.declaredCategory,
  extractedAmount: lineSlips.extractedAmount,
  extractedAmountConfidence: lineSlips.extractedAmountConfidence,
  reviewedBy: lineSlips.reviewedBy,
  reviewNote: lineSlips.reviewNote,
  lastErrorMessage: lineSlips.lastErrorMessage,
  aiData: lineSlips.aiData,
  source: lineSlips.source,
};

/**
 * How many slips from `lineUserId` the system itself turned away since
 * `since`. A slip a treasurer rejected (reviewedBy set) does not count.
 * `exceptSlipId` leaves out the slip being processed now.
 */
export async function countRecentSystemRejectedSlips(
  lineUserId: string,
  since: Date,
  exceptSlipId: number | null = null,
  churchId: string = DEFAULT_CHURCH_ID
): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const conditions = [
    eq(lineSlips.churchId, churchId),
    eq(lineSlips.lineUserId, lineUserId),
    eq(lineSlips.status, "rejected"),
    isNull(lineSlips.reviewedBy),
    gte(lineSlips.createdAt, since),
  ];
  if (exceptSlipId !== null) conditions.push(ne(lineSlips.id, exceptSlipId));
  const [row] = await db
    .select({ n: count() })
    .from(lineSlips)
    .where(and(...conditions));
  return Number(row?.n ?? 0);
}

/** One slip, only if `userId` sent it from the app. */
export async function getMyManualSlip(
  slipId: number,
  userId: number,
  churchId: string = DEFAULT_CHURCH_ID
) {
  const db = await getDb();
  if (!db) return null;
  const [row] = await db
    .select(donorSlipColumns)
    .from(lineSlips)
    .where(
      and(
        eq(lineSlips.id, slipId),
        eq(lineSlips.churchId, churchId),
        eq(lineSlips.lineUserId, `manual-${userId}`)
      )
    )
    .limit(1);
  return row ?? null;
}

/** The slips `userId` sent from the app, newest first. */
export async function listMyManualSlips(
  userId: number,
  limit = 10,
  churchId: string = DEFAULT_CHURCH_ID
) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select(donorSlipColumns)
    .from(lineSlips)
    .where(
      and(
        eq(lineSlips.churchId, churchId),
        eq(lineSlips.lineUserId, `manual-${userId}`)
      )
    )
    .orderBy(desc(lineSlips.createdAt))
    .limit(limit);
}

export async function createManualSlip(input: {
  churchId?: string;
  userId: number;
  userName?: string | null;
  donorName?: string;
  imageBuffer: Buffer;
  /** Defaults to JPEG, which is what the staff upload has always stored. */
  contentType?: string;
  extension?: string;
  /** What the donor said they gave. Staff confirm the real values in review. */
  declared?: {
    amount: string;
    category: OfferingCategory;
    fundId?: number | null;
    /** Two or more lines when one transfer pays for several categories. */
    items?: SplitLine[] | null;
  };
  /** The name the donor typed in the form. Kept apart from the LINE name. */
  typedDonorName?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const churchId = input.churchId ?? DEFAULT_CHURCH_ID;

  const hash = createHash("sha256").update(input.imageBuffer).digest("hex");
  const dateStr = new Date().toISOString().slice(0, 10);
  const extension = input.extension ?? "jpg";
  const contentType = input.contentType ?? "image/jpeg";
  const storageKey = `manual/${churchId}/${input.userId}/${dateStr}/${hash.slice(0, 16)}.${extension}`;

  let key: string;
  let inlineDataUrl: string | undefined;
  try {
    const uploaded = await storagePutPrivate(
      storageKey,
      input.imageBuffer,
      contentType
    );
    key = uploaded.key;
  } catch (storageErr) {
    console.warn(
      "[createManualSlip] Private storage upload failed, storing slip inline in DB:",
      storageErr
    );
    key = `inline:${storageKey}`;
    inlineDataUrl = `data:${contentType};base64,${input.imageBuffer.toString("base64")}`;
  }

  const [slip] = await db
    .insert(lineSlips)
    .values({
      churchId,
      lineUserId: `manual-${input.userId}`,
      lineDisplayName:
        input.donorName || `อัปโหลดโดย ${input.userName || "เจ้าหน้าที่"}`,
      submittedByUserId: input.userId,
      submittedByName: input.userName ?? null,
      typedDonorName: input.typedDonorName?.trim() || null,
      lineEventId: `manual-${Date.now()}-${hash.slice(0, 8)}`,
      slipImageKey: key,
      slipHash: hash,
      status: "pending",
      processingAttempts: 0,
      ...(inlineDataUrl ? { aiData: { inlineDataUrl } } : {}),
      declaredAmount: input.declared?.amount ?? null,
      declaredCategory: input.declared?.category ?? null,
      declaredFundId: input.declared?.fundId ?? null,
      declaredItems: input.declared?.items ?? null,
    })
    .returning();

  await db.insert(lineProcessingJobs).values({
    slipId: slip.id,
    churchId,
    status: "queued",
    attempts: 0,
  });

  return slip;
}

/** Thrown when the same entry is already waiting, so the donor sends it once. */
export class DuplicateEntryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DuplicateEntryError";
  }
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * A giving sent without a slip. It joins the same review queue as a slip and
 * credits nothing until a treasurer checks it against the bank and approves.
 *
 * Same person, amount, category and date, not turned away, in the last 24
 * hours: refused, because it is the same entry sent twice. The same name,
 * amount and date from anyone else is allowed, but the treasurer sees a
 * warning, because two people can give the same sum on the same day.
 */
export async function createNoSlipEntry(input: {
  churchId?: string;
  userId: number;
  userName?: string | null;
  donorName: string;
  amount: string;
  category: OfferingCategory;
  fundId?: number | null;
  transferDate: Date;
  /** Two or more lines when one transfer pays for several categories. */
  items?: SplitLine[] | null;
  now?: Date;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const churchId = input.churchId ?? DEFAULT_CHURCH_ID;
  const now = input.now ?? new Date();
  const lineUserId = `manual-${input.userId}`;
  const dayStart = new Date(input.transferDate);
  dayStart.setUTCHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart.getTime() + DAY_MS);

  const [same] = await db
    .select({ id: lineSlips.id })
    .from(lineSlips)
    .where(
      and(
        eq(lineSlips.churchId, churchId),
        eq(lineSlips.lineUserId, lineUserId),
        eq(lineSlips.source, "no_slip"),
        eq(lineSlips.declaredAmount, input.amount),
        eq(lineSlips.declaredCategory, input.category),
        gte(lineSlips.declaredDate, dayStart),
        lt(lineSlips.declaredDate, dayEnd),
        ne(lineSlips.status, "rejected"),
        gte(lineSlips.createdAt, new Date(now.getTime() - DAY_MS))
      )
    )
    .limit(1);
  if (same) {
    throw new DuplicateEntryError(
      "ส่งรายการนี้ไปแล้ว กำลังรอเหรัญญิกตรวจสอบ ไม่ต้องส่งซ้ำ"
    );
  }

  // Same name, amount and date from someone else: warn, do not block.
  const [similar] = await db
    .select({ id: lineSlips.id })
    .from(lineSlips)
    .where(
      and(
        eq(lineSlips.churchId, churchId),
        ne(lineSlips.lineUserId, lineUserId),
        sql`lower(${lineSlips.typedDonorName}) = ${input.donorName.toLowerCase()}`,
        eq(lineSlips.declaredAmount, input.amount),
        gte(lineSlips.declaredDate, dayStart),
        lt(lineSlips.declaredDate, dayEnd),
        ne(lineSlips.status, "rejected")
      )
    )
    .limit(1);
  const [ledgerTwin] = await db
    .select({ id: offerings.id })
    .from(offerings)
    .where(
      and(
        eq(offerings.churchId, churchId),
        eq(offerings.status, "active"),
        sql`lower(${offerings.donorName}) = ${input.donorName.toLowerCase()}`,
        eq(offerings.amount, input.amount),
        gte(offerings.receiptDate, dayStart),
        lt(offerings.receiptDate, dayEnd)
      )
    )
    .limit(1);
  const warning =
    similar || ledgerTwin
      ? "พบรายการที่ชื่อ ยอด และวันที่เหมือนกันแล้ว (อาจซ้ำ) ตรวจกับยอดเข้าบัญชีธนาคารก่อนอนุมัติ"
      : null;

  const token = randomUUID();
  const hash = createHash("sha256").update(`no-slip:${token}`).digest("hex");
  const [row] = await db
    .insert(lineSlips)
    .values({
      churchId,
      lineUserId,
      lineDisplayName: input.userName || null,
      lineEventId: `manual-${now.getTime()}-${hash.slice(0, 8)}`,
      slipImageKey: "",
      slipHash: hash,
      status: "needs_review",
      source: "no_slip",
      processingAttempts: 0,
      declaredAmount: input.amount,
      declaredCategory: input.category,
      declaredFundId: input.fundId ?? null,
      declaredDate: dayStart,
      declaredItems: input.items ?? null,
      submittedByUserId: input.userId,
      submittedByName: input.userName ?? null,
      typedDonorName: input.donorName,
      lastErrorMessage: warning,
    })
    .returning();
  return { slip: row, warning };
}

/** Active people who may approve giving: finance roles and admins. */
export async function listFinanceUserIds(): Promise<number[]> {
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .select({ id: users.id })
    .from(users)
    .where(
      and(
        eq(users.status, "active"),
        or(
          eq(users.role, "admin"),
          inArray(users.churchRole, ["SUPER_ADMIN", "TREASURER"]),
          like(users.churchRoles, "%SUPER_ADMIN%"),
          like(users.churchRoles, "%TREASURER%")
        )
      )
    );
  return rows.map(r => r.id);
}

export async function rescanLineSlip(
  slipId: number,
  churchId = DEFAULT_CHURCH_ID
) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");

  const [slip] = await db
    .select({
      id: lineSlips.id,
      status: lineSlips.status,
      approvedOfferingId: lineSlips.approvedOfferingId,
      source: lineSlips.source,
    })
    .from(lineSlips)
    .where(and(eq(lineSlips.id, slipId), eq(lineSlips.churchId, churchId)))
    .limit(1);

  if (!slip) throw new Error(`ไม่พบสลิป #${slipId}`);
  if (slip.source === "no_slip") {
    throw new Error(`รายการ #${slipId} ไม่มีรูปสลิป จึงสแกนด้วย AI ไม่ได้`);
  }

  // Resetting a booked slip to "pending" would show an offering that is already in
  // the ledger as unapproved in the inbox.
  if (slip.status === "approved" || slip.approvedOfferingId) {
    throw new Error(
      `ไม่สามารถสแกนสลิป #${slipId} ซ้ำได้ เนื่องจากอนุมัติและบันทึกลงบัญชีแล้ว`
    );
  }
  if (slip.status === "rejected") {
    throw new Error(
      `ไม่สามารถสแกนสลิป #${slipId} ซ้ำได้ เนื่องจากถูกปฏิเสธไปแล้ว`
    );
  }

  await db
    .update(lineSlips)
    .set({ status: "pending", lastErrorMessage: null, updatedAt: new Date() })
    .where(and(eq(lineSlips.id, slipId), eq(lineSlips.churchId, churchId)));

  await db.insert(lineProcessingJobs).values({
    slipId,
    churchId,
    status: "queued",
    attempts: 0,
  });

  return true;
}
