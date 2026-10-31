import {
  offeringCategoryLabel,
  type OfferingCategory,
} from "@shared/categories";
import type { DonorSlipStatus } from "@shared/donorSlip";
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
  /** The server's reading of the slip. Null when nothing was sent as a slip. */
  check: DonorSlipStatus | null;
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

export interface StationOutcome {
  tone: "success" | "warning" | "error";
  title: string;
  message: string;
  /** True when the donor can fix the problem and send again. */
  canRetry: boolean;
  /** The amount read from the slip, offered as the amount to send again with. */
  slipAmount: number | null;
}

const baht = (n: number) => `${n.toLocaleString()} THB`;

/** What the last screen says. It only says "thanks" when the slip was not turned away. */
export function describeOutcome(s: StationSubmission): StationOutcome {
  const what = `${offeringCategoryLabel(s.category)} ${baht(s.amount)}`;
  const check = s.check;

  if (s.mode === "ledger" || check === null) {
    return {
      tone: "success",
      title: "ขอบคุณพระเจ้า",
      message: `บันทึกรายการถวาย ${what} เรียบร้อยแล้ว`,
      canRetry: false,
      slipAmount: null,
    };
  }
  if (check.state === "rejected") {
    return {
      tone: "error",
      title: "สลิปไม่ผ่านการตรวจสอบ",
      message: check.message,
      canRetry: true,
      slipAmount: check.slipAmount,
    };
  }
  if (check.state === "duplicate") {
    return {
      tone: "warning",
      title: "สลิปนี้ถูกส่งแล้ว",
      message: check.message,
      canRetry: false,
      slipAmount: null,
    };
  }
  return {
    tone: "success",
    title: "ขอบคุณพระเจ้า",
    message: `ระบบได้รับสลิปถวาย ${what} แล้ว ${check.message}`,
    canRetry: false,
    slipAmount: null,
  };
}
