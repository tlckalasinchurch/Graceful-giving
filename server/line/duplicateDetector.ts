/**
 * Duplicate Detector — 3-level duplicate detection for LINE slips
 *
 * Level 1: Bank reference number unique per church (strongest — database constraint)
 * Level 2: SHA-256 image hash (already checked at webhook time)
 * Level 3: Transaction similarity (amount + date + member/sender in offerings)
 *
 * If duplicate is found: status = 'duplicate', no Offering created.
 */

import { getDb } from "../db";
import { lineSlips, offerings } from "../../drizzle/schema";
import { and, eq, gte, lte, ne, or } from "drizzle-orm";

export interface DuplicateResult {
  isDuplicate: boolean;
  level: 1 | 2 | 3 | null;
  /** Existing line_slip.id that is the duplicate, if found */
  duplicateSlipId: number | null;
  /** Existing offering.id that is the duplicate, if found */
  duplicateOfferingId: number | null;
  reason: string | null;
}

// ─── Level 1: Reference number check ──────────────────────────────────────────

export async function checkDuplicateByReference(
  churchId: string,
  referenceNumber: string,
  currentSlipId: number
): Promise<DuplicateResult> {
  const db = await getDb();
  if (!db)
    return {
      isDuplicate: false,
      level: null,
      duplicateSlipId: null,
      duplicateOfferingId: null,
      reason: null,
    };

  // Check in line_slips (same church + same ref, not the current slip, not rejected/failed)
  const existingSlip = await db
    .select({ id: lineSlips.id })
    .from(lineSlips)
    .where(
      and(
        eq(lineSlips.churchId, churchId),
        eq(lineSlips.extractedRef, referenceNumber),
        ne(lineSlips.id, currentSlipId),
        ne(lineSlips.status, "rejected"),
        ne(lineSlips.status, "failed"),
        ne(lineSlips.status, "duplicate")
      )
    )
    .limit(1);

  if (existingSlip.length > 0 && existingSlip[0]) {
    return {
      isDuplicate: true,
      level: 1,
      duplicateSlipId: existingSlip[0].id,
      duplicateOfferingId: null,
      reason: `Duplicate bank reference: ${referenceNumber} (slip #${existingSlip[0].id})`,
    };
  }

  // Also check in approved offerings
  const existingOffering = await db
    .select({ id: offerings.id })
    .from(offerings)
    .where(
      and(
        eq(offerings.churchId, churchId),
        eq(offerings.reference, referenceNumber),
        ne(offerings.status, "voided")
      )
    )
    .limit(1);

  if (existingOffering.length > 0 && existingOffering[0]) {
    return {
      isDuplicate: true,
      level: 1,
      duplicateSlipId: null,
      duplicateOfferingId: existingOffering[0].id,
      reason: `Reference already recorded as offering #${existingOffering[0].id}`,
    };
  }

  return {
    isDuplicate: false,
    level: null,
    duplicateSlipId: null,
    duplicateOfferingId: null,
    reason: null,
  };
}

// ─── Level 3: Transaction similarity check ─────────────────────────────────────

/**
 * Checks if a very similar offering already exists in the database:
 * same amount + same date (±1 day) + same member OR same sender name
 * This catches cases where the same donation was entered manually AND via slip.
 */
export async function checkDuplicateByTransaction(
  churchId: string,
  amount: number,
  transferDate: Date,
  matchedMemberId: number | null,
  currentSlipId: number
): Promise<DuplicateResult> {
  const db = await getDb();
  if (!db)
    return {
      isDuplicate: false,
      level: null,
      duplicateSlipId: null,
      duplicateOfferingId: null,
      reason: null,
    };

  const dayBefore = new Date(transferDate);
  dayBefore.setDate(dayBefore.getDate() - 1);
  const dayAfter = new Date(transferDate);
  dayAfter.setDate(dayAfter.getDate() + 1);

  const amountStr = amount.toFixed(2);

  // Check in line_slips for same amount + date range
  const similarSlips = await db
    .select({ id: lineSlips.id, matchedMemberId: lineSlips.matchedMemberId })
    .from(lineSlips)
    .where(
      and(
        eq(lineSlips.churchId, churchId),
        eq(lineSlips.extractedAmount, amountStr),
        gte(lineSlips.extractedDate, dayBefore),
        lte(lineSlips.extractedDate, dayAfter),
        ne(lineSlips.id, currentSlipId),
        ne(lineSlips.status, "rejected"),
        ne(lineSlips.status, "failed"),
        ne(lineSlips.status, "duplicate")
      )
    )
    .limit(5);

  for (const slip of similarSlips) {
    // If same member — likely duplicate
    if (matchedMemberId && slip.matchedMemberId === matchedMemberId) {
      return {
        isDuplicate: true,
        level: 3,
        duplicateSlipId: slip.id,
        duplicateOfferingId: null,
        reason: `Similar transaction: same amount ${amount} THB, date, and member (slip #${slip.id})`,
      };
    }
  }

  // Check in offerings table
  const similarOfferings = await db
    .select({ id: offerings.id, donorMemberId: offerings.donorMemberId })
    .from(offerings)
    .where(
      and(
        eq(offerings.churchId, churchId),
        eq(offerings.amount, amountStr),
        gte(offerings.receiptDate, dayBefore),
        lte(offerings.receiptDate, dayAfter),
        ne(offerings.status, "voided")
      )
    )
    .limit(5);

  for (const offering of similarOfferings) {
    if (matchedMemberId && offering.donorMemberId === matchedMemberId) {
      return {
        isDuplicate: true,
        level: 3,
        duplicateSlipId: null,
        duplicateOfferingId: offering.id,
        reason: `Similar offering already exists: #${offering.id} (${amount} THB, same member, same date)`,
      };
    }
  }

  return {
    isDuplicate: false,
    level: null,
    duplicateSlipId: null,
    duplicateOfferingId: null,
    reason: null,
  };
}
