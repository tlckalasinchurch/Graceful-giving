/** Change against last month, in words, with its baseline. */
export function monthDelta(current: number, previous: number): string {
  if (previous === 0) {
    return current > 0 ? "ใหม่ เดือนที่แล้วไม่มี" : "—";
  }
  const pct = Math.round(((current - previous) / previous) * 100);
  if (pct === 0) return "เท่าเดือนที่แล้ว";
  return `${pct > 0 ? "↑ +" : "↓ −"}${Math.abs(pct)}% เทียบเดือนที่แล้ว`;
}
