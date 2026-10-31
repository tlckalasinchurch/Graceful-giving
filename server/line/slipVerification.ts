import { checkDeclaredAmount, declaredMismatchReason } from "./declaredCheck";
import {
  compareReceiverAccount,
  type ReceiverVerdict,
} from "./receiverAccount";
import { CONFIDENCE_THRESHOLD, type SlipExtraction } from "./slipOcr";

export type VerificationKind = "amount" | "receiver";

/** What the checks found. Stored with the slip so staff and donors can see it. */
export interface SlipVerification {
  /** null when the slip has no chosen amount to compare with. */
  amount: "match" | "mismatch" | "unreadable" | null;
  receiver: ReceiverVerdict["kind"];
  /** Set when the system turns the slip away on its own. */
  autoReject: { kind: VerificationKind; reason: string } | null;
  /** Set when a person must look at the slip, with the reason. */
  reviewWarning: string | null;
  /**
   * True when the slip would have been turned away but the donor has already
   * been turned away too often, so a person decides instead.
   */
  escalated: boolean;
}

export const RECEIVER_MISMATCH_REASON =
  "บัญชีผู้รับในสลิปไม่ตรงกับบัญชีของคริสตจักร กรุณาตรวจสอบว่าโอนถูกบัญชี";

export function verifySlip(input: {
  /** The amount the donor chose at the giving station, if any. */
  declaredAmount: number | null;
  extraction: SlipExtraction;
  /** The church's bank account number, or null when none is set. */
  churchAccount: string | null;
  /** The church's PromptPay ID (digits), or null when none is set. */
  churchPromptPayId?: string | null;
  isDuplicate: boolean;
  /** The donor's earlier slips were turned away MAX_AUTO_REJECTS times or more. */
  escalate?: boolean;
}): SlipVerification {
  const {
    declaredAmount,
    extraction,
    churchAccount,
    churchPromptPayId,
    isDuplicate,
    escalate = false,
  } = input;
  // Only a slip sent from the giving station, where the donor chose the
  // amount, is turned away by the system. Other slips are flagged for staff.
  const fromStation = declaredAmount !== null;

  let amount: SlipVerification["amount"] = null;
  let autoReject: SlipVerification["autoReject"] = null;
  if (declaredAmount !== null) {
    const verdict = checkDeclaredAmount(declaredAmount, extraction);
    amount = verdict.kind;
    if (verdict.kind === "mismatch" && !isDuplicate) {
      autoReject = { kind: "amount", reason: declaredMismatchReason(verdict) };
    }
  }

  // A PromptPay slip shows a phone or ID number, not the bank account, so it
  // is compared with the church's PromptPay ID. Any other slip is compared
  // with the bank account.
  let receiver: ReceiverVerdict = compareReceiverAccount(
    extraction.receiverAccount,
    extraction.receiverAccountType === "promptpay"
      ? (churchPromptPayId ?? null)
      : churchAccount
  );
  // A reading the OCR is unsure about is never grounds to turn a slip away.
  if (
    receiver.kind === "mismatch" &&
    (extraction.receiverAccountConfidence ?? 0) < CONFIDENCE_THRESHOLD
  ) {
    receiver = { kind: "suspect" };
  }

  let reviewWarning: string | null = null;
  if (!isDuplicate) {
    if (receiver.kind === "mismatch") {
      if (fromStation && autoReject === null) {
        autoReject = { kind: "receiver", reason: RECEIVER_MISMATCH_REASON };
      } else if (!fromStation) {
        reviewWarning = "บัญชีผู้รับในสลิปไม่ตรงกับบัญชีของคริสตจักร";
      }
    } else if (receiver.kind === "suspect") {
      reviewWarning =
        "เลขบัญชีผู้รับในสลิปต่างจากบัญชีคริสตจักร ตรวจภาพสลิปก่อนอนุมัติ";
    }
  }

  // Too many turned away: a person decides, with the reason in front of them.
  let escalated = false;
  if (autoReject && escalate) {
    escalated = true;
    reviewWarning = `${autoReject.reason} (ผู้ถวายส่งไม่ผ่านการตรวจอัตโนมัติหลายครั้ง ให้เจ้าหน้าที่ตรวจภาพสลิปกับยอดที่แจ้งด้วยตา)`;
    autoReject = null;
  }

  return {
    amount,
    receiver: receiver.kind,
    autoReject,
    reviewWarning,
    escalated,
  };
}
