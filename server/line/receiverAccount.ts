/**
 * Compares the receiver account printed on a transfer slip with the church's
 * bank account.
 *
 * Thai banks mask part of the number on a slip, for example 123-4-xx567-8, so
 * the comparison is position by position over the digits that are visible. The
 * result is a verdict, never a decision. The caller decides what to do.
 */

export type ReceiverVerdict =
  | { kind: "match" }
  /** Two or more visible digits differ: a different account. */
  | { kind: "mismatch"; differing: number }
  /** One visible digit differs. Could be a misread, so a person must look. */
  | { kind: "suspect" }
  | {
      kind: "unknown";
      reason:
        | "no_church_account"
        | "unreadable"
        | "too_masked"
        | "length_differs";
    };

/** Fewer visible digits than this cannot show that two accounts are the same or not. */
const MIN_VISIBLE_DIGITS = 3;

/** An account number shorter than this is not a usable bank account. */
const MIN_ACCOUNT_DIGITS = 6;

export function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

/** Keeps digits, and turns every masking character into "x". Drops separators. */
function normalizePrinted(value: string): string {
  return value.replace(/[xX*•●#]/g, "x").replace(/[^0-9x]/g, "");
}

export function compareReceiverAccount(
  printed: string | null | undefined,
  churchAccount: string | null | undefined
): ReceiverVerdict {
  const church = digitsOnly(churchAccount ?? "");
  if (church.length < MIN_ACCOUNT_DIGITS) {
    return { kind: "unknown", reason: "no_church_account" };
  }

  const shown = normalizePrinted(printed ?? "");
  if (shown.length === 0) return { kind: "unknown", reason: "unreadable" };
  if (shown.length !== church.length) {
    return { kind: "unknown", reason: "length_differs" };
  }

  let visible = 0;
  let differing = 0;
  for (let i = 0; i < shown.length; i++) {
    if (shown[i] === "x") continue;
    visible++;
    if (shown[i] !== church[i]) differing++;
  }

  if (visible < MIN_VISIBLE_DIGITS) {
    return { kind: "unknown", reason: "too_masked" };
  }
  if (differing === 0) return { kind: "match" };
  if (differing === 1) return { kind: "suspect" };
  return { kind: "mismatch", differing };
}
