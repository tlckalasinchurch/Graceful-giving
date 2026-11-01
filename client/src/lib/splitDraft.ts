import {
  OFFERING_CATEGORY_IDS,
  type OfferingCategory,
} from "@shared/categories";
import {
  MAX_SPLIT_LINES,
  checkSplit,
  remainingAmount,
  type SplitLine,
  type SplitProblem,
} from "@shared/givingSplit";

/** A line being typed: the amount stays text until it is sent. */
export interface SplitDraft {
  category: OfferingCategory;
  amount: string;
}

/** The text of an amount, without trailing zeros: 700, 12.5. */
function asText(n: number): string {
  return String(Math.round(n * 100) / 100);
}

/** Turns what was typed into numbers. A bad amount becomes NaN, which fails the check. */
export function parseDrafts(drafts: ReadonlyArray<SplitDraft>): SplitLine[] {
  return drafts.map(d => ({
    category: d.category,
    amount: d.amount.trim() === "" ? Number.NaN : Number(d.amount),
  }));
}

/** Starts a split with one line that holds the whole amount. */
export function startSplit(
  category: OfferingCategory,
  total: number
): SplitDraft[] {
  return [{ category, amount: asText(total) }];
}

/** The categories not used yet, in the church's order. */
export function unusedCategories(
  drafts: ReadonlyArray<SplitDraft>
): OfferingCategory[] {
  const used = new Set(drafts.map(d => d.category));
  return OFFERING_CATEGORY_IDS.filter(id => !used.has(id));
}

/**
 * Adds a line with the next unused category and what is left of the total.
 * Returns the same list when no category is left.
 */
export function addDraft(
  drafts: ReadonlyArray<SplitDraft>,
  total: number
): SplitDraft[] {
  const next = unusedCategories(drafts)[0];
  if (!next || drafts.length >= MAX_SPLIT_LINES) return [...drafts];
  const left = remainingAmount(
    parseDrafts(drafts).filter(l => !Number.isNaN(l.amount)),
    total
  );
  return [...drafts, { category: next, amount: left > 0 ? asText(left) : "" }];
}

/** The first problem with the lines, or null when they are sound. */
export function draftsProblem(
  drafts: ReadonlyArray<SplitDraft>,
  total: number | null
): SplitProblem | null {
  if (total === null) return "total_mismatch";
  return checkSplit(parseDrafts(drafts), total);
}

/** "สิบลด 700 + พันธกิจ 300" for a summary line. */
export function describeLines(
  lines: ReadonlyArray<SplitLine>,
  labelOf: (category: OfferingCategory) => string
): string {
  return lines
    .map(l => `${labelOf(l.category)} ${l.amount.toLocaleString()}`)
    .join(" + ");
}
