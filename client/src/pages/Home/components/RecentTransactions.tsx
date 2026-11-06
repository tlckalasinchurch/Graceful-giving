import { Link } from "wouter";
import { MoneyDisplay } from "@/components/common/CommonUI";
import { ArrowDownLeft, ArrowUpRight } from "lucide-react";

export interface TransactionItem {
  id: string;
  rawId: number;
  title: string;
  date: string | Date;
  type: "income" | "expense";
  category: string;
  subCategory: string;
  amount: number;
}

interface RecentTransactionsProps {
  allTransactions: TransactionItem[];
  onViewAll: () => void;
  fmtThaiDate: (d: Date | string) => string;
}

export function RecentTransactions({
  allTransactions,
  onViewAll,
  fmtThaiDate,
}: RecentTransactionsProps) {
  return (
    <section
      aria-label="รายการธุรกรรมล่าสุด"
      className="flex h-full w-full flex-col justify-between rounded-2xl border border-line bg-surface p-5 sm:p-6"
    >
      <div>
        <div className="flex items-baseline justify-between gap-3 pb-2">
          <h2 className="text-sm font-semibold text-ink">รายการล่าสุด</h2>
          <button
            onClick={onViewAll}
            className="min-h-9 text-xs font-medium text-ink-2 underline decoration-line underline-offset-4 transition-colors hover:text-ink hover:decoration-ink/40"
          >
            ดูทั้งหมด
          </button>
        </div>

        {allTransactions.length === 0 ? (
          <p className="py-10 text-center text-sm text-ink-2">
            ยังไม่มีรายการธุรกรรมล่าสุดจากระบบ
          </p>
        ) : (
          <ul className="divide-y divide-line">
            {allTransactions.slice(0, 5).map(tx => {
              const isIncome = tx.type === "income";
              return (
                <li key={tx.id}>
                  <Link
                    href={`/transactions/${tx.id}`}
                    className="flex min-h-14 items-center justify-between gap-3 py-3 transition-colors hover:text-brand-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-paper-2 text-ink-2">
                        {isIncome ? (
                          <ArrowDownLeft
                            className="size-4"
                            aria-hidden="true"
                          />
                        ) : (
                          <ArrowUpRight className="size-4" aria-hidden="true" />
                        )}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-ink">
                          {tx.title}
                        </p>
                        <p className="truncate pt-0.5 text-xs text-ink-3">
                          {tx.subCategory} · {fmtThaiDate(tx.date)}
                        </p>
                      </div>
                    </div>
                    <MoneyDisplay
                      amount={tx.amount}
                      type={tx.type}
                      size="base"
                      className="shrink-0"
                    />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
