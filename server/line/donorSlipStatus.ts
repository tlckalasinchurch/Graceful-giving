import type { DonorSlipStatus } from "@shared/donorSlip";
import { CONFIDENCE_THRESHOLD } from "./slipOcr";

export type { DonorSlipState, DonorSlipStatus } from "@shared/donorSlip";

export interface SlipRowForDonor {
  status: string;
  declaredAmount: string | null;
  extractedAmount: string | null;
  extractedAmountConfidence: string | null;
  reviewedBy: number | null;
  reviewNote: string | null;
  lastErrorMessage: string | null;
}

function amountMatches(row: SlipRowForDonor): boolean {
  if (row.declaredAmount === null || row.extractedAmount === null) return false;
  const conf = Number(row.extractedAmountConfidence ?? 0);
  return (
    conf >= CONFIDENCE_THRESHOLD &&
    Math.abs(Number(row.declaredAmount) - Number(row.extractedAmount)) < 0.005
  );
}

export function toDonorSlipStatus(row: SlipRowForDonor): DonorSlipStatus {
  switch (row.status) {
    case "approved":
      return {
        state: "approved",
        message: "เหรัญญิกบันทึกรายการถวายเข้าบัญชีแล้ว",
        slipAmount: null,
      };
    case "rejected": {
      // Only the system's own reason is shown. A treasurer's note may hold
      // details meant for staff.
      const bySystem = row.reviewedBy === null;
      return {
        state: "rejected",
        message:
          bySystem && row.reviewNote
            ? row.reviewNote
            : "สลิปนี้ไม่ผ่านการตรวจสอบ กรุณาติดต่อเจ้าหน้าที่",
        slipAmount:
          bySystem && row.extractedAmount !== null
            ? Number(row.extractedAmount)
            : null,
      };
    }
    case "duplicate":
      return {
        state: "duplicate",
        message: "สลิปนี้เคยถูกส่งเข้าระบบแล้ว",
        slipAmount: null,
      };
    case "pending":
    case "processing":
      return {
        state: "checking",
        message: "กำลังตรวจสอบสลิป",
        slipAmount: null,
      };
    default:
      return amountMatches(row)
        ? {
            state: "verified",
            message:
              "ยอดในสลิปตรงกับที่เลือก รอเหรัญญิกยืนยันก่อนบันทึกเข้าบัญชี",
            slipAmount: null,
          }
        : {
            state: "in_review",
            message: "ได้รับสลิปแล้ว รอเหรัญญิกตรวจสอบ",
            slipAmount: null,
          };
  }
}
