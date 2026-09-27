/** Display names for finance_accounts.type. */
export const FUND_TYPE_LABELS: Record<string, string> = {
  general: "ดำเนินงานทั่วไป",
  tithe: "สิบลด",
  mission: "พันธกิจและการประกาศ",
  building: "อาคารและบูรณะ",
  welfare: "สงเคราะห์และสวัสดิการ",
  special: "โครงการพิเศษ",
};

export function fundTypeLabel(type: string | null | undefined) {
  return (type && FUND_TYPE_LABELS[type]) || "กองทุน";
}
