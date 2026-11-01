import { OFFERING_CATEGORY_IDS, type OfferingCategory } from "./categories";
import { MAX_GIVING_AMOUNT } from "./givingLimits";

/**
 * One transfer that pays for several categories, for example a 1,000 THB slip
 * that is 700 for tithe and 300 for mission. The client checks it to give early
 * feedback and the server enforces it, so both import this one file.
 */
export interface SplitLine {
  category: OfferingCategory;
  amount: number;
}

/** A split has at least two lines and at most one per category. */
export const MIN_SPLIT_LINES = 2;
export const MAX_SPLIT_LINES = OFFERING_CATEGORY_IDS.length;

export type SplitProblem =
  | "too_few"
  | "too_many"
  | "bad_amount"
  | "duplicate"
  | "total_mismatch";

export const SPLIT_MESSAGE: Record<SplitProblem, string> = {
  too_few: "การแบ่งยอดต้องมีอย่างน้อย 2 ประเภท",
  too_many: "แบ่งยอดได้ไม่เกินจำนวนประเภทที่มี",
  bad_amount: "ทุกประเภทต้องมียอดมากกว่า 0",
  duplicate: "เลือกประเภทซ้ำกันไม่ได้ รวมยอดเป็นบรรทัดเดียว",
  total_mismatch: "ผลรวมของทุกประเภทต้องเท่ากับยอดที่โอน",
};

/** Adds in satang, so 0.1 + 0.2 is 0.3 and not 0.30000000000000004. */
export function sumSplit(lines: ReadonlyArray<{ amount: number }>): number {
  return lines.reduce((acc, l) => acc + Math.round(l.amount * 100), 0) / 100;
}

/** The first problem found, or null when the split is sound. */
export function checkSplit(
  lines: ReadonlyArray<SplitLine>,
  total: number
): SplitProblem | null {
  if (lines.length < MIN_SPLIT_LINES) return "too_few";
  if (lines.length > MAX_SPLIT_LINES) return "too_many";
  if (
    lines.some(
      l =>
        !Number.isFinite(l.amount) ||
        l.amount <= 0 ||
        l.amount > MAX_GIVING_AMOUNT
    )
  ) {
    return "bad_amount";
  }
  if (new Set(lines.map(l => l.category)).size !== lines.length) {
    return "duplicate";
  }
  if (Math.round(sumSplit(lines) * 100) !== Math.round(total * 100)) {
    return "total_mismatch";
  }
  return null;
}

/**
 * The bank reference of each offering a split slip creates. The ledger allows
 * one active offering per reference, so the first line keeps the reference and
 * the others add `#2`, `#3`.
 */
export function splitReference(base: string, index: number): string {
  return index === 0 ? base : `${base}#${index + 1}`;
}

/** What is left of the total after the lines already chosen. Never below 0. */
export function remainingAmount(
  lines: ReadonlyArray<{ amount: number }>,
  total: number
): number {
  const left = Math.round(total * 100) - Math.round(sumSplit(lines) * 100);
  return left > 0 ? left / 100 : 0;
}
