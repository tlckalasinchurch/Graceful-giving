/**
 * Why a LINE offering slip needs a second look, in words a treasurer can act
 * on. The duplicate detector (server/line/duplicateDetector.ts) stores which
 * slip or offering it matched and an English reason; this turns that, plus
 * the OCR confidence scores, into a short Thai checklist.
 */

export type SlipRiskInput = {
  status: string;
  extractedAmount?: string | number | null;
  extractedAmountConfidence?: string | number | null;
  extractedDate?: Date | string | null;
  extractedDateConfidence?: string | number | null;
  extractedRef?: string | null;
  extractedRefConfidence?: string | number | null;
  matchedMemberId?: number | null;
  matchedMemberName?: string | null;
  matchedConfidence?: string | number | null;
  duplicateOfSlipId?: number | null;
  duplicateOfOfferingId?: number | null;
  lastErrorMessage?: string | null;
};

export type SlipRiskReason = {
  /** Short statement of what the system saw. */
  text: string;
  /** "high" reasons block a confident approval; "medium" need a check. */
  severity: "high" | "medium";
};

export type SlipRisk = {
  level: "duplicate" | "suspicious" | "ok";
  headline: string;
  reasons: SlipRiskReason[];
  /** What the treasurer should do next. */
  advice: string;
  relatedSlipId: number | null;
  relatedOfferingId: number | null;
};

/** Below this, an OCR or member-match score needs a human check. */
export const CONFIDENCE_THRESHOLD = 0.85;
/** A transfer older than this is unusual for a weekly offering. */
export const STALE_TRANSFER_DAYS = 60;

const num = (v: string | number | null | undefined) =>
  v === null || v === undefined || v === "" ? null : Number(v);

const pct = (v: number) => `${Math.round(v * 100)}%`;

const baht = (v: number) =>
  `฿${v.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function duplicateReasons(slip: SlipRiskInput): SlipRiskReason[] {
  const message = slip.lastErrorMessage ?? "";
  const ref = slip.extractedRef;
  const amount = num(slip.extractedAmount);
  const reasons: SlipRiskReason[] = [];

  if (/bank reference/i.test(message) && slip.duplicateOfSlipId) {
    reasons.push({
      text: `เลขอ้างอิงธนาคาร${ref ? ` ${ref}` : ""} ซ้ำกับสลิป #${slip.duplicateOfSlipId} ที่ส่งเข้ามาก่อนหน้า`,
      severity: "high",
    });
  } else if (/already recorded as offering/i.test(message)) {
    reasons.push({
      text: `เลขอ้างอิงธนาคาร${ref ? ` ${ref}` : ""} ถูกบันทึกเป็นเงินถวายแล้ว (รายการ #${slip.duplicateOfOfferingId ?? "?"})`,
      severity: "high",
    });
  } else if (/similar transaction/i.test(message)) {
    reasons.push({
      text: `ยอด${amount !== null ? ` ${baht(amount)}` : "เงิน"} วันที่โอน และผู้ถวาย${slip.matchedMemberName ? ` (${slip.matchedMemberName})` : ""} ตรงกับสลิป #${slip.duplicateOfSlipId ?? "?"}`,
      severity: "high",
    });
  } else if (/similar offering/i.test(message)) {
    reasons.push({
      text: `ยอด${amount !== null ? ` ${baht(amount)}` : "เงิน"} วันเดียวกัน และผู้ถวายคนเดียวกัน ตรงกับเงินถวายรายการ #${slip.duplicateOfOfferingId ?? "?"} ที่บันทึกแล้ว`,
      severity: "high",
    });
  } else if (slip.duplicateOfSlipId || slip.duplicateOfOfferingId) {
    reasons.push({
      text: slip.duplicateOfSlipId
        ? `ข้อมูลตรงกับสลิป #${slip.duplicateOfSlipId}`
        : `ข้อมูลตรงกับเงินถวายรายการ #${slip.duplicateOfOfferingId}`,
      severity: "high",
    });
  } else {
    reasons.push({
      text: message || "ข้อมูลในสลิปตรงกับรายการที่มีอยู่แล้วในระบบ",
      severity: "high",
    });
  }
  return reasons;
}

function qualityReasons(slip: SlipRiskInput, now: Date): SlipRiskReason[] {
  const reasons: SlipRiskReason[] = [];
  const amount = num(slip.extractedAmount);
  const amountConf = num(slip.extractedAmountConfidence);
  const dateConf = num(slip.extractedDateConfidence);
  const refConf = num(slip.extractedRefConfidence);
  const matchConf = num(slip.matchedConfidence);

  if (amount === null) {
    reasons.push({ text: "AI อ่านยอดเงินจากสลิปไม่ได้", severity: "high" });
  } else if (amountConf !== null && amountConf < CONFIDENCE_THRESHOLD) {
    reasons.push({
      text: `AI มั่นใจยอดเงิน ${baht(amount)} เพียง ${pct(amountConf)}`,
      severity: "high",
    });
  }

  if (!slip.extractedDate) {
    reasons.push({ text: "ไม่พบวันที่โอนในสลิป", severity: "medium" });
  } else {
    const date = new Date(slip.extractedDate);
    const days = Math.floor((now.getTime() - date.getTime()) / 86_400_000);
    if (days < -1) {
      reasons.push({ text: "วันที่โอนเป็นวันในอนาคต", severity: "high" });
    } else if (days > STALE_TRANSFER_DAYS) {
      reasons.push({
        text: `โอนมาแล้ว ${days} วัน อาจเป็นสลิปเก่าที่ส่งซ้ำ`,
        severity: "medium",
      });
    }
    if (dateConf !== null && dateConf < CONFIDENCE_THRESHOLD) {
      reasons.push({
        text: `AI มั่นใจวันที่โอนเพียง ${pct(dateConf)}`,
        severity: "medium",
      });
    }
  }

  if (!slip.extractedRef) {
    reasons.push({
      text: "ไม่พบเลขอ้างอิงธนาคาร จึงตรวจสลิปซ้ำด้วยเลขอ้างอิงไม่ได้",
      severity: "medium",
    });
  } else if (refConf !== null && refConf < CONFIDENCE_THRESHOLD) {
    reasons.push({
      text: `AI มั่นใจเลขอ้างอิงเพียง ${pct(refConf)}`,
      severity: "medium",
    });
  }

  if (!slip.matchedMemberId) {
    reasons.push({
      text: "ยังจับคู่ผู้โอนกับสมาชิกไม่ได้",
      severity: "medium",
    });
  } else if (matchConf !== null && matchConf < CONFIDENCE_THRESHOLD) {
    reasons.push({
      text: `จับคู่กับ ${slip.matchedMemberName ?? "สมาชิก"} ด้วยความมั่นใจ ${pct(matchConf)}`,
      severity: "medium",
    });
  }
  return reasons;
}

export function describeSlipRisk(
  slip: SlipRiskInput,
  now: Date = new Date()
): SlipRisk {
  const base = {
    relatedSlipId: slip.duplicateOfSlipId ?? null,
    relatedOfferingId: slip.duplicateOfOfferingId ?? null,
  };

  if (slip.status === "duplicate") {
    return {
      ...base,
      level: "duplicate",
      headline: "สลิปนี้อาจซ้ำกับรายการที่มีอยู่แล้ว",
      reasons: duplicateReasons(slip),
      advice:
        "ระบบไม่ให้อนุมัติสลิปที่ระบุว่าซ้ำ เพื่อป้องกันการลงบัญชีซ้อน เปิดรายการที่ตรงกันเพื่อเทียบ แล้วปฏิเสธสลิปนี้ ถ้าเป็นการถวายคนละครั้งจริง ให้บันทึกผ่านหน้าบันทึกถวายแทน",
    };
  }

  if (["approved", "rejected", "pending", "processing"].includes(slip.status)) {
    return { ...base, level: "ok", headline: "", reasons: [], advice: "" };
  }

  const reasons = qualityReasons(slip, now);
  if (reasons.length === 0) {
    return { ...base, level: "ok", headline: "", reasons: [], advice: "" };
  }
  const high = reasons.some(r => r.severity === "high");
  return {
    ...base,
    level: "suspicious",
    headline: high ? "สลิปต้องสงสัย ตรวจก่อนอนุมัติ" : "ควรตรวจข้อมูลบางส่วน",
    reasons,
    advice: high
      ? "เทียบยอดเงินและวันที่กับภาพสลิป แล้วแก้ไขในฟอร์มก่อนอนุมัติ"
      : "ข้อมูลหลักอ่านได้ครบ ตรวจรายการด้านล่างให้ถูกต้องแล้วอนุมัติได้",
  };
}
