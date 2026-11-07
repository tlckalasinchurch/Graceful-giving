import { formatAmount } from "@/lib/format";
import { HandCoins, ReceiptText, TrendingUp, TrendingDown } from "lucide-react";

interface FinancialSummaryRowProps {
  isBalanceLoading: boolean;
  showBalance: boolean;
  monthlyIncome: number | undefined;
  monthlyExpense: number | undefined;
  netMonthly: number | undefined;
  incomeNote: string;
  expenseNote: string;
  isPositiveNet: boolean;
}

type CardTone = "income" | "expense" | "net";

const TONES: Record<
  CardTone,
  { icon: string; label: string; value: string; note: string }
> = {
  income: {
    icon: "bg-income text-white",
    label: "text-ink-2",
    value: "text-ink",
    note: "text-ink-3",
  },
  expense: {
    icon: "bg-danger text-white",
    label: "text-ink-2",
    value: "text-ink",
    note: "text-ink-3",
  },
  net: {
    icon: "bg-accent text-accent-foreground",
    label: "text-ink-2",
    value: "text-ink",
    note: "text-ink-3",
  },
};

export function FinancialSummaryRow({
  isBalanceLoading,
  showBalance,
  monthlyIncome,
  monthlyExpense,
  netMonthly,
  incomeNote,
  expenseNote,
  isPositiveNet,
}: FinancialSummaryRowProps) {
  const cards: {
    tone: CardTone;
    label: string;
    icon: React.ReactNode;
    amount: number | undefined;
    prefix: string;
    note: string;
  }[] = [
    {
      tone: "income",
      label: "รายรับเดือนนี้",
      icon: <HandCoins className="size-4" aria-hidden="true" />,
      amount: monthlyIncome,
      prefix: "+",
      note: incomeNote || "ยอดเงินถวายทั้งหมด",
    },
    {
      tone: "expense",
      label: "รายจ่ายเดือนนี้",
      icon: <ReceiptText className="size-4" aria-hidden="true" />,
      amount: monthlyExpense,
      prefix: "−",
      note: expenseNote || "รายจ่ายพันธกิจและดำเนินงาน",
    },
    {
      tone: "net",
      label: "คงเหลือสุทธิเดือนนี้",
      icon: isPositiveNet ? (
        <TrendingUp className="size-4" aria-hidden="true" />
      ) : (
        <TrendingDown className="size-4" aria-hidden="true" />
      ),
      amount: netMonthly,
      prefix: isPositiveNet ? "+" : "−",
      note: isPositiveNet ? "รายรับมากกว่ารายจ่าย" : "รายจ่ายมากกว่ารายรับ",
    },
  ];

  return (
    <section aria-label="สรุปตัวเลขการเงินรายเดือน" className="w-full">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {cards.map(card => {
          const tone = TONES[card.tone];
          return (
            <article
              key={card.label}
              className="bento-card flex flex-col justify-between p-5 sm:p-6"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className={`text-xs font-bold uppercase tracking-[0.1em] ${tone.label}`}>
                    {card.label}
                  </p>
                  <p className={`mt-1 text-[11px] ${tone.note}`}>{card.note}</p>
                </div>
                <span
                  className={`flex size-9 shrink-0 items-center justify-center rounded-xl border-2 border-[var(--ink)] ${tone.icon}`}
                >
                  {card.icon}
                </span>
              </div>

              <div className="mt-5">
                {isBalanceLoading ? (
                  <div className="h-9 w-32 animate-pulse rounded-lg bg-ground" />
                ) : (
                  <p
                    className={`display money text-[26px] leading-none tracking-tight sm:text-[30px] ${tone.value}`}
                  >
                    {showBalance && card.amount !== undefined
                      ? `${card.prefix}฿ ${formatAmount(Math.abs(card.amount), 0)}`
                      : "—"}
                  </p>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
