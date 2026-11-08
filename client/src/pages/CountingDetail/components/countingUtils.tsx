import React from "react";
import { Check } from "lucide-react";
import { formatBaht } from "@/lib/format";

export const fmtBaht = (n: number) => formatBaht(n);

/**
 * Advances a numeric/alphanumeric envelope string by 1.
 * Preserves leading zero padding and any prefix.
 * e.g.:
 *   "1" -> "2"
 *   "001" -> "002"
 *   "09" -> "10"
 *   "ENV-01" -> "ENV-02"
 * Returns null if the value doesn't end in digits.
 */
export function advanceEnvelopeString(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const match = trimmed.match(/^([^\d]*)(\d+)$/);
  if (!match) return null;
  const prefix = match[1];
  const digits = match[2];
  const num = parseInt(digits, 10);
  if (isNaN(num)) return null;
  const nextVal = num + 1;
  const padded = String(nextVal).padStart(digits.length, "0");
  return `${prefix}${padded}`;
}

/**
 * Computes the next envelope number based on existing envelopes in the round
 * and/or the last submitted envelope number.
 *
 * Rules:
 * 1. If `lastSubmitted` is provided and ends with digits, advances it by 1.
 * 2. Otherwise scans `envelopes` in this session for the highest numeric envelope number,
 *    preserving padding and prefix if present.
 * 3. Defaults to "1" if no valid numeric envelope is found (e.g. newly opened round).
 */
export function getNextEnvelopeNo(
  envelopes: Array<{ envelopeNo?: string | null }>,
  lastSubmitted?: string | null
): string {
  if (lastSubmitted && lastSubmitted.trim()) {
    const advanced = advanceEnvelopeString(lastSubmitted);
    if (advanced) return advanced;
  }

  if (!envelopes || envelopes.length === 0) {
    return "1";
  }

  let maxNum = 0;
  let sampleDigitsLen = 1;
  let samplePrefix = "";
  let hasValidNumeric = false;

  for (const env of envelopes) {
    const raw = (env.envelopeNo ?? "").trim();
    if (!raw) continue;
    const match = raw.match(/^([^\d]*)(\d+)$/);
    if (match) {
      const prefix = match[1];
      const digits = match[2];
      const num = parseInt(digits, 10);
      if (!isNaN(num) && num > maxNum) {
        maxNum = num;
        sampleDigitsLen = digits.length;
        samplePrefix = prefix;
        hasValidNumeric = true;
      }
    }
  }

  if (hasValidNumeric) {
    const nextVal = maxNum + 1;
    const padded = String(nextVal).padStart(sampleDigitsLen, "0");
    return `${samplePrefix}${padded}`;
  }

  return "1";
}

/** Shows a variance with its sign and the Thai word for over or short. */
export function Variance({ amount }: { amount: number }) {
  if (amount === 0) {
    return (
      <span className="inline-flex items-center gap-1 font-bold text-income">
        <Check className="h-4 w-4" />
        ตรงกัน
      </span>
    );
  }
  const over = amount > 0;
  return (
    <span
      className={`font-bold tabular-nums ${over ? "text-brand" : "text-danger"}`}
    >
      {over ? "เกิน " : "ขาด "}
      {fmtBaht(Math.abs(amount))}
    </span>
  );
}
