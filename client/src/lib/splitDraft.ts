import { type OfferingCategory } from "@shared/categories";
import { parseGivingAmount } from "@shared/givingLimits";
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

const lastIndex = (drafts: ReadonlyArray<unknown>) => drafts.length - 1;

/** What is left of `total` after every line except the last. Never below 0. */
function balanceLast(drafts: SplitDraft[], total: number): SplitDraft[] {
  if (drafts.length < 2) {
    return drafts.map(d => ({ ...d, amount: asText(total) }));
  }
  const others = parseDrafts(drafts.slice(0, lastIndex(drafts))).filter(
    l => !Number.isNaN(l.amount)
  );
  const left = remainingAmount(others, total);
  return drafts.map((d, i) =>
    i === lastIndex(drafts) ? { ...d, amount: left > 0 ? asText(left) : "" } : d
  );
}

/**
 * Taps a category chip. A new category is added as the last line and takes
 * what is left. Tapping a chosen category removes it. With one line left, that
 * line holds the whole amount, and with more the last line takes what is left.
 */
export function toggleCategory(
  drafts: ReadonlyArray<SplitDraft>,
  category: OfferingCategory,
  total: number
): SplitDraft[] {
  const has = drafts.some(d => d.category === category);
  if (has) {
    if (drafts.length <= 1) return [...drafts];
    return balanceLast(
      drafts.filter(d => d.category !== category),
      total
    );
  }
  if (drafts.length >= MAX_SPLIT_LINES) return [...drafts];
  return balanceLast([...drafts, { category, amount: "" }], total);
}

/**
 * Sets the amount of one line. Editing a line before the last one makes the
 * last line take what is left, so the lines keep adding up to the total. The
 * last line is the person's own to edit.
 */
export function setLineAmount(
  drafts: ReadonlyArray<SplitDraft>,
  index: number,
  value: string,
  total: number
): SplitDraft[] {
  const next = drafts.map((d, i) =>
    i === index ? { ...d, amount: value } : d
  );
  return index === lastIndex(next) || next.length < 2
    ? next
    : balanceLast(next, total);
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

/**
 * Step 2 of the station. Taps a category on or off. A category that is turned
 * on starts with its usual amount. Unlike `toggleCategory`, there is no fixed
 * total yet: the total is the sum of the lines.
 */
export function toggleGiveCategory(
  lines: ReadonlyArray<SplitDraft>,
  category: OfferingCategory,
  defaultAmount: number
): SplitDraft[] {
  if (lines.some(l => l.category === category)) {
    return lines.filter(l => l.category !== category);
  }
  if (lines.length >= MAX_SPLIT_LINES) return [...lines];
  return [...lines, { category, amount: asText(defaultAmount) }];
}

/**
 * The amount to pay: every line added up. Null when there is no line, or when
 * any line is empty, zero, negative or above the limit.
 */
export function giveTotal(lines: ReadonlyArray<SplitDraft>): number | null {
  if (lines.length === 0) return null;
  const parsed = parseDrafts(lines);
  let sum = 0;
  for (const l of parsed) {
    const ok = parseGivingAmount(l.amount);
    if (ok === null) return null;
    sum += Math.round(ok * 100);
  }
  const total = sum / 100;
  return parseGivingAmount(total);
}
