import { CONFIDENCE_THRESHOLD } from "./slipOcr";

export type DeclaredVerdict =
  | { kind: "match" }
  | { kind: "mismatch"; declared: number; extracted: number }
  | { kind: "unreadable" };

/** Amounts are in THB. Half a satang is the tolerance for rounding. */
const TOLERANCE = 0.005;

/**
 * Compares the amount a donor chose with the amount the OCR read from the
 * slip. A different amount read with high confidence is a mismatch. A missing
 * or low-confidence reading that differs is "unreadable": staff must look at
 * it, and it is never rejected automatically.
 */
export function checkDeclaredAmount(
  declared: number,
  extraction: { amount: number | null; amountConfidence: number }
): DeclaredVerdict {
  const { amount, amountConfidence } = extraction;
  if (amount === null) return { kind: "unreadable" };
  if (Math.abs(amount - declared) < TOLERANCE) return { kind: "match" };
  if (amountConfidence >= CONFIDENCE_THRESHOLD) {
    return { kind: "mismatch", declared, extracted: amount };
  }
  return { kind: "unreadable" };
}

const baht = (n: number) =>
  n.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });

/** The reason shown to the donor when a slip is turned away. */
export function declaredMismatchReason(
  v: Extract<DeclaredVerdict, { kind: "mismatch" }>
): string {
  return `ยอดในสลิป ${baht(v.extracted)} บาท ไม่ตรงกับยอดที่เลือก ${baht(v.declared)} บาท`;
}
