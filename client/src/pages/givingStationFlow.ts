import {
  offeringCategoryLabel,
  type OfferingCategory,
} from "@shared/categories";
import type { DonorSlipStatus } from "@shared/donorSlip";
import {
  MAX_AUTO_REJECTS,
  TRANSFER_DATE_MESSAGE,
  checkTransferDate,
  parseGivingAmount,
} from "@shared/givingLimits";

/**
 * How a confirmed giving reaches the books:
 * - "slip": a pending slip for a treasurer to approve. Any member can do this.
 * - "ledger": a finance role records it straight into the offerings ledger.
 * - "no-slip": a member sends the details without an image. It waits for a
 *   treasurer to check it against the bank. Nothing is credited before that.
 */
export type SubmitMode = "slip" | "ledger" | "no-slip";

export interface StationSubmission {
  mode: SubmitMode;
  category: OfferingCategory;
  amount: number;
  /** The server's reading of the slip. Null when nothing was sent as a slip. */
  check: DonorSlipStatus | null;
  /** Slips the system has turned away for this donor in 24 hours. */
  failedAttempts?: number;
}

/**
 * Picks the submit route. A slip image always goes through the slip queue so
 * its amount, category and fund are kept. Without an image a finance role
 * writes to the ledger, and everyone else sends the details for review.
 */
export function resolveSubmitMode(opts: {
  canManageFinance: boolean;
  hasSlip: boolean;
}): SubmitMode {
  if (opts.hasSlip) return "slip";
  return opts.canManageFinance ? "ledger" : "no-slip";
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

  if (s.mode === "no-slip") {
    return {
      tone: "success",
      title: "ได้รับข้อมูลแล้ว",
      message: `ส่งรายการถวาย ${what} ให้เหรัญญิกแล้ว ยังไม่นับเข้าบัญชีจนกว่าเหรัญญิกตรวจกับยอดเข้าบัญชีธนาคาร คุณจะได้รับแจ้งเมื่อตรวจเสร็จ`,
      canRetry: false,
      slipAmount: null,
    };
  }

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
    const note = failedAttemptsNote(s.failedAttempts ?? 0);
    return {
      tone: "error",
      title: "สลิปไม่ผ่านการตรวจสอบ",
      message: note ? `${check.message} ${note}` : check.message,
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

export interface ChecklistItem {
  id: "category" | "amount" | "name" | "date" | "slip";
  label: string;
  ok: boolean;
  /** What was found, or what to fix. */
  detail: string;
  /** A required item that is not ok blocks the send button. */
  required: boolean;
}

/**
 * The list shown before every send. A person sees exactly what will go out and
 * what is missing. The server checks it again after the send.
 *
 * Without a slip a member must give a name and the transfer date, because a
 * treasurer has nothing else to check the entry against.
 */
export function buildSendChecklist(input: {
  category: OfferingCategory;
  amount: number | null;
  donorName: string;
  hasSlip: boolean;
  mode: SubmitMode;
  /** The transfer date as `YYYY-MM-DD`. Used only without a slip. */
  transferDate?: string;
  now?: Date;
}): ChecklistItem[] {
  const { category, amount, donorName, hasSlip, mode } = input;
  const name = donorName.trim();
  const noSlip = mode === "no-slip";
  const items: ChecklistItem[] = [
    {
      id: "category",
      label: "หมวดการถวาย",
      ok: true,
      detail: offeringCategoryLabel(category),
      required: true,
    },
    {
      id: "amount",
      label: "จำนวนเงิน",
      ok: amount !== null,
      detail:
        amount === null
          ? "ระบุจำนวนเงินให้ถูกต้อง (มากกว่า 0)"
          : `${amount.toLocaleString()} THB`,
      required: true,
    },
    {
      id: "name",
      label: "ชื่อผู้ถวาย",
      ok: noSlip ? name.length >= 2 : true,
      detail: noSlip
        ? name.length >= 2
          ? name
          : "ระบุชื่อผู้ถวายให้เหรัญญิกตรวจกับบัญชีธนาคาร"
        : name === ""
          ? "ไม่ระบุชื่อ (ใช้ชื่อบนสลิปที่ระบบอ่านได้)"
          : name,
      required: noSlip,
    },
  ];

  if (noSlip) {
    const raw = input.transferDate ?? "";
    const parsed = raw ? new Date(raw) : new Date(Number.NaN);
    const problem = checkTransferDate(parsed, input.now ?? new Date());
    items.push({
      id: "date",
      label: "วันที่โอน",
      ok: problem === null,
      detail:
        problem === null
          ? raw
          : raw === ""
            ? "ระบุวันที่โอนเงิน"
            : TRANSFER_DATE_MESSAGE[problem],
      required: true,
    });
  }

  items.push({
    id: "slip",
    label: "สลิปการโอน",
    ok: true,
    detail: hasSlip
      ? "แนบแล้ว ระบบจะตรวจยอดและบัญชีผู้รับหลังกดส่ง"
      : mode === "ledger"
        ? "ไม่ได้แนบ จะบันทึกเข้าบัญชีทันที"
        : "ไม่ได้แนบสลิป รายการจะรอเหรัญญิกตรวจกับยอดเข้าบัญชีธนาคารก่อนนับยอด",
    required: false,
  });
  return items;
}

/** True when every required item is ok. */
export function canSend(items: ChecklistItem[]): boolean {
  return items.every(i => !i.required || i.ok);
}

/** The line that tells a donor where they stand with automatic checks. */
export function failedAttemptsNote(failedAttempts: number): string | null {
  if (failedAttempts <= 0) return null;
  return failedAttempts >= MAX_AUTO_REJECTS
    ? `ส่งไม่ผ่านแล้ว ${failedAttempts} ครั้ง การส่งครั้งต่อไปเจ้าหน้าที่จะตรวจสอบเอง`
    : `ส่งไม่ผ่านแล้ว ${failedAttempts} ครั้ง หากไม่ผ่านครบ ${MAX_AUTO_REJECTS} ครั้ง การส่งครั้งต่อไปเจ้าหน้าที่จะตรวจสอบเอง`;
}
