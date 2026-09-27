import React from "react";
import { Check } from "lucide-react";
import { formatBaht } from "@/lib/format";

export const fmtBaht = (n: number) => formatBaht(n);

/** Shows a variance with its sign and the Thai word for over or short. */
export function Variance({ amount }: { amount: number }) {
  if (amount === 0) {
    return (
      <span className="inline-flex items-center gap-1 font-bold text-[#2D6A2E]">
        <Check className="h-4 w-4" />
        ตรงกัน
      </span>
    );
  }
  const over = amount > 0;
  return (
    <span
      className={`font-bold tabular-nums ${over ? "text-[#9F3B0F]" : "text-[#C8372D]"}`}
    >
      {over ? "เกิน " : "ขาด "}
      {fmtBaht(Math.abs(amount))}
    </span>
  );
}
