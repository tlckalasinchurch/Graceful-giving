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
      className="h-full rounded-3xl border border-line bg-surface p-5 sm:p-6 w-full flex flex-col justify-between shadow-xs"
    >
      <div>
        <div className="flex items-center justify-between pb-3">
          <div>
            <h2 className="text-base font-bold text-ink">รายการล่าสุด</h2>
            <p className="text-xs text-ink-3 mt-0.5">
              กิจกรรมการเงินที่บันทึกเข้าระบบ
            </p>
          </div>
          <button
            onClick={onViewAll}
            className="min-h-9 inline-flex items-center rounded-xl border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-ink hover:bg-paper-2 transition-colors focus-visible:ring-2 focus-visible:ring-brand"
          >
            ดูทั้งหมด
          </button>
        </div>

        {allTransactions.length === 0 ? (
          <p className="px-3 py-10 text-center text-sm text-ink-2">
            ยังไม่มีรายการธุรกรรมล่าสุดจากระบบ
          </p>
        ) : (
          <ul className="divide-y divide-line/70 mt-2">
            {allTransactions.slice(0, 5).map(tx => {
              const isIncome = tx.type === "income";
              return (
                <li key={tx.id}>
                  <Link
                    href={`/transactions/${tx.id}`}
                    className="flex min-h-16 items-center justify-between gap-3.5 rounded-2xl px-2.5 py-3 hover:bg-paper-2/60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div
                        className={`flex size-10 shrink-0 items-center justify-center rounded-2xl shadow-2xs ${
                          isIncome
                            ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/60"
                            : "bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border border-rose-200/80 dark:border-rose-800/50"
                        }`}
                      >
                        {isIncome ? (
                          <ArrowDownLeft
                            className="size-5"
                            aria-hidden="true"
                          />
                        ) : (
                          <ArrowUpRight className="size-5" aria-hidden="true" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-ink">
                          {tx.title}
                        </p>
                        <p className="truncate text-xs text-ink-3 pt-0.5">
                          {tx.subCategory} · {fmtThaiDate(tx.date)}
                        </p>
                      </div>
                    </div>
                    <MoneyDisplay
                      amount={tx.amount}
                      type={tx.type}
                      size="base"
                      className="shrink-0 font-bold"
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
