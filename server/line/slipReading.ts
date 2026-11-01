import { UNREADABLE_SLIP, type SlipReading } from "../../shared/slipReading";
import { CONFIDENCE_THRESHOLD, type SlipExtraction } from "./slipOcr";

/**
 * Keeps only the fields the AI read with enough confidence. A name is cut to
 * 120 characters, the length the ledger holds. The reference number, the
 * receiver account and the raw text stay on the server.
 */
export function toSlipReading(extraction: SlipExtraction): SlipReading {
  const sure = (confidence: number | undefined) =>
    (confidence ?? 0) >= CONFIDENCE_THRESHOLD;

  const amount =
    extraction.amount !== null &&
    extraction.amount > 0 &&
    sure(extraction.amountConfidence)
      ? extraction.amount
      : null;
  const name = extraction.senderName?.trim() ?? "";
  const senderName =
    name !== "" && sure(extraction.senderConfidence)
      ? name.slice(0, 120)
      : null;
  const transferDate =
    extraction.transferDate && sure(extraction.dateConfidence)
      ? extraction.transferDate
      : null;
  const bank = extraction.bankName?.trim() || null;

  if (amount === null && senderName === null && transferDate === null) {
    return { ...UNREADABLE_SLIP, bank };
  }
  return { status: "read", amount, senderName, transferDate, bank };
}
