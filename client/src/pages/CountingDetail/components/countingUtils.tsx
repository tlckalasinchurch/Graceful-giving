import React from "react";
import { Check } from "lucide-react";
import { formatBaht } from "@/lib/format";

export const fmtBaht = (n: number) => formatBaht(n);

/** Shows a variance with its sign and the Thai word for over or short. */
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
      className={`font-bold tabular-nums ${over ? "text-primary-strong" : "text-destructive"}`}
    >
      {over ? "เกิน " : "ขาด "}
      {fmtBaht(Math.abs(amount))}
    </span>
  );
}
