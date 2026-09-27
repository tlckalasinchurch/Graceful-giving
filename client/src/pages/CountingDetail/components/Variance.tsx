import { Check } from "lucide-react";
import { fmtBaht } from "../utils";

export function Variance({ amount }: { amount: number }) {
  if (amount === 0) {
    return (
      <span className="inline-flex items-center gap-1 font-bold text-success">
        <Check className="h-4 w-4" />
        ตรงกัน
      </span>
    );
  }
  const over = amount > 0;
  return (
    <span
      className={`font-bold tabular-nums ${over ? "text-[#C26B1E]" : "text-[#D45945]"}`}
    >
      {over ? "เกิน " : "ขาด "}
      {fmtBaht(Math.abs(amount))}
    </span>
  );
}
