/** Change against last month, in words, with its baseline. */
export function monthDelta(current: number, previous: number): string {
  if (previous === 0) {
    return current > 0 ? "ใหม่ เดือนที่แล้วไม่มี" : "—";
  }
  const pct = Math.round(((current - previous) / previous) * 100);
  if (pct === 0) return "เท่าเดือนที่แล้ว";
  return `${pct > 0 ? "+" : "−"}${Math.abs(pct)}% เทียบเดือนที่แล้ว`;
}

/**
 * Share of this month's income already spent. `null` when there is no income
 * to compare against. Can pass 100 when spending is above income.
 */
export function spentShare(income: number, expense: number): number | null {
  if (income <= 0) return null;
  return Math.round((expense / income) * 100);
}

/** The one line under the title: what needs attention first. */
export function homeFinding(input: {
  taskTotal: number;
  net: number | undefined;
}): string {
  const parts: string[] = [];
  if (input.taskTotal > 0) {
    parts.push(`มีงานค้าง ${input.taskTotal} รายการ`);
  }
  if (input.net !== undefined) {
    parts.push(
      input.net >= 0
        ? "เดือนนี้รายรับมากกว่ารายจ่าย"
        : "เดือนนี้รายจ่ายมากกว่ารายรับ"
    );
  }
  return parts.length > 0 ? parts.join(" · ") : "ไม่มีงานค้างที่ต้องดำเนินการ";
}
