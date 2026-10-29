import { HandHeart, ReceiptText, Scale } from "lucide-react";
import type { ReactNode } from "react";
import { formatAmount } from "@/lib/format";

interface FinancialSummaryRowProps {
  isBalanceLoading: boolean;
  showBalance: boolean;
  monthlyIncome: number | undefined;
  monthlyExpense: number | undefined;
  netMonthly: number | undefined;
  incomeTrend: string;
  expenseTrend: string;
  isPositiveNet: boolean;
  trendArrow: (trend: string) => string;
  trendValue: (trend: string) => string;
}

function SummaryCard({
  label,
  icon,
  tile,
  amount,
  footnote,
}: {
  label: string;
  icon: ReactNode;
  tile: string;
  amount: ReactNode;
  footnote: ReactNode;
}) {
  return (
    <article className="min-w-0 rounded-3xl bg-surface p-5 fintech-card flex items-start gap-4">
      <span
        className={`size-11 shrink-0 rounded-2xl flex items-center justify-center ${tile}`}
        aria-hidden="true"
      >
        {icon}
      </span>
      <div className="min-w-0 flex-1 space-y-1">
        <h3 className="text-sm font-medium text-ink-2">{label}</h3>
        {amount}
        <p className="text-xs text-ink-3">{footnote}</p>
      </div>
    </article>
  );
}

export function FinancialSummaryRow({
  isBalanceLoading,
  showBalance,
  monthlyIncome,
  monthlyExpense,
  netMonthly,
  incomeTrend,
  expenseTrend,
  isPositiveNet,
  trendArrow,
  trendValue,
}: FinancialSummaryRowProps) {
  const figure = (
    value: number | undefined,
    tone: string,
    sign: string
  ): ReactNode =>
    isBalanceLoading ? (
      <div className="h-8 w-28 rounded-2xl bg-ground animate-pulse" />
    ) : (
      <p className={`money text-2xl font-semibold leading-tight ${tone}`}>
        {showBalance && value !== undefined
          ? `${sign}฿ ${formatAmount(Math.abs(value), 0)}`
          : "—"}
      </p>
    );

  return (
    <section
      aria-label="สรุปตัวเลขการเงินรายเดือน"
      style={{ animationDelay: "160ms" }}
      className="animate-fade-up grid grid-cols-1 sm:grid-cols-3 gap-4 w-full"
    >
      <SummaryCard
        label="รายรับเดือนนี้"
        tile="bg-tile-mint text-tile-mint-ink"
        icon={<HandHeart className="size-5" />}
        amount={figure(monthlyIncome, "text-income", "+")}
        footnote={`${trendArrow(incomeTrend)} ${trendValue(incomeTrend)} จากเดือนที่แล้ว`}
      />
      <SummaryCard
        label="รายจ่ายเดือนนี้"
        tile="bg-tile-sand text-tile-sand-ink"
        icon={<ReceiptText className="size-5" />}
        amount={figure(monthlyExpense, "text-ink", "")}
        footnote={`${trendArrow(expenseTrend)} ${trendValue(expenseTrend)} จากเดือนที่แล้ว`}
      />
      <SummaryCard
        label="คงเหลือสุทธิเดือนนี้"
        tile="bg-tile-sky text-tile-sky-ink"
        icon={<Scale className="size-5" />}
        amount={figure(
          netMonthly,
          isPositiveNet ? "text-ink" : "text-danger",
          isPositiveNet ? "" : "−"
        )}
        footnote={
          isPositiveNet ? "รายรับมากกว่ารายจ่าย" : "รายจ่ายมากกว่ารายรับ"
        }
      />
    </section>
  );
}
