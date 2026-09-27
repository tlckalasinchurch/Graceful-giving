import {
  Banknote,
  BookCheck,
  Calculator,
  Landmark,
  Scissors,
} from "lucide-react";

export type TabId = "envelopes" | "cash" | "bank" | "deductions" | "summary";

export const TABS: Array<{ id: TabId; label: string; icon: typeof Banknote }> = [
  { id: "envelopes", label: "ซองถวาย", icon: Banknote },
  { id: "cash", label: "นับเงินสด", icon: Calculator },
  { id: "bank", label: "เงินโอน / นำฝาก", icon: Landmark },
  { id: "deductions", label: "หักเบิก", icon: Scissors },
  { id: "summary", label: "สรุป & ปิดรอบ", icon: BookCheck },
];

export const fmtBaht = (n: number) =>
  `฿${n.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
