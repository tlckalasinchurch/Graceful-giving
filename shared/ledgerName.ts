/**
 * Which name goes in the books for a giving that came from a slip.
 *
 * Order, first one that is not empty wins:
 * 1. the name the treasurer set at review,
 * 2. the full name of the member the slip was matched to,
 * 3. the name printed on the slip, as the AI read it,
 * 4. the name the donor typed,
 * 5. the sender's LINE name.
 *
 * Who sent it is never part of this. It is kept in its own columns.
 */
export const LEDGER_NAME_MAX = 120;
export const ANONYMOUS_LEDGER_NAME = "ผู้ถวายผ่าน LINE";

export interface LedgerNameSources {
  reviewerName?: string | null;
  memberName?: string | null;
  slipName?: string | null;
  typedName?: string | null;
  lineName?: string | null;
}

export type LedgerNameSource =
  | "reviewer"
  | "member"
  | "slip"
  | "typed"
  | "line"
  | "fallback";

const clean = (v: string | null | undefined) => (v ?? "").trim();

export function resolveLedgerName(src: LedgerNameSources): {
  name: string;
  source: LedgerNameSource;
} {
  const order: Array<[LedgerNameSource, string]> = [
    ["reviewer", clean(src.reviewerName)],
    ["member", clean(src.memberName)],
    ["slip", clean(src.slipName)],
    ["typed", clean(src.typedName)],
    ["line", clean(src.lineName)],
  ];
  for (const [source, value] of order) {
    if (value) return { name: value.slice(0, LEDGER_NAME_MAX), source };
  }
  return { name: ANONYMOUS_LEDGER_NAME, source: "fallback" };
}
