import React from "react";
import { Check } from "lucide-react";
import { formatBaht } from "@/lib/format";

export const fmtBaht = (n: number) => formatBaht(n);

/** Shows a variance with its sign and the Thai word for over or short. */
export function Variance({ amount }: { amount: number }) {
  if (amount === 0) {
    return (
      <span className="inline-flex items-center gap-1 whitespace-nowrap font-bold text-[#20C997]">
        <Check className="h-4 w-4" aria-hidden="true" />
        ตรงกัน
      </span>
    );
  }
  const over = amount > 0;
  return (
    <span
      className={`whitespace-nowrap font-bold tabular-nums ${over ? "text-[#D95E0B]" : "text-[#FF5B5B]"}`}
    >
      {over ? "เกิน " : "ขาด "}
      {fmtBaht(Math.abs(amount))}
    </span>
  );
}
