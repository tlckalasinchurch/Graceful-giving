import type { OfferingCategory } from "@shared/categories";
import { parseGivingAmount } from "@shared/givingLimits";

/**
 * How a confirmed giving reaches the books:
 * - "slip": a pending slip for a treasurer to approve. Any member can do this.
 * - "ledger": a finance role records it straight into the offerings ledger.
 */
export type SubmitMode = "slip" | "ledger";

export interface StationSubmission {
  mode: SubmitMode;
  category: OfferingCategory;
  amount: number;
}

/**
 * Picks the submit route. A slip image always goes through the slip queue so
 * its amount, category and fund are kept. Without an image only a finance role
 * may write to the ledger; everyone else must attach a slip.
 */
export function resolveSubmitMode(opts: {
  canManageFinance: boolean;
  hasSlip: boolean;
}): SubmitMode | "needs-slip" {
  if (opts.hasSlip) return "slip";
  return opts.canManageFinance ? "ledger" : "needs-slip";
}

/** The amount the donor chose: a valid custom value wins over the preset. */
export function resolveAmount(
  customAmount: string,
  presetAmount: number
): number | null {
  if (customAmount.trim() !== "") return parseGivingAmount(customAmount);
  return parseGivingAmount(presetAmount);
}
