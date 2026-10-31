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
  /** The OCR result plus the checks the worker made. */
  aiData?: unknown;
}

/** Which check turned the slip away, as stored by the worker. */
function autoRejectKind(aiData: unknown): "amount" | "receiver" | null {
  const kind = (aiData as { verification?: { autoReject?: unknown } } | null)
    ?.verification?.autoReject;
  return kind === "amount" || kind === "receiver" ? kind : null;
}

function isEscalated(aiData: unknown): boolean {
  return (
    (aiData as { verification?: { escalated?: unknown } } | null)?.verification
      ?.escalated === true
  );
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
      // The slip amount is offered as the amount to send again with only
      // when the amount was the problem.
      const amountWasWrong =
        bySystem &&
        autoRejectKind(row.aiData) !== "receiver" &&
        row.extractedAmount !== null;
      return {
        state: "rejected",
        message:
          bySystem && row.reviewNote
            ? row.reviewNote
            : "สลิปนี้ไม่ผ่านการตรวจสอบ กรุณาติดต่อเจ้าหน้าที่",
        slipAmount: amountWasWrong ? Number(row.extractedAmount) : null,
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
      if (isEscalated(row.aiData)) {
        return {
          state: "in_review",
          message:
            "ได้รับสลิปแล้ว เพราะไม่ผ่านการตรวจอัตโนมัติหลายครั้ง ระบบส่งให้เจ้าหน้าที่ตรวจสอบเอง",
          slipAmount: null,
        };
      }
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
