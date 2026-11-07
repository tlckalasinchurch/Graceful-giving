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
      className="bento-card flex h-full w-full flex-col justify-between p-5 sm:p-6"
    >
      <div>
        <div className="flex items-center justify-between pb-3">
          <div>
            <h2 className="display text-lg text-ink">รายการล่าสุด</h2>
            <p className="text-xs text-ink-3 mt-0.5">
              กิจกรรมการเงินที่บันทึกเข้าระบบ
            </p>
          </div>
          <button
            onClick={onViewAll}
            className="inline-flex min-h-9 items-center rounded-xl border-2 border-[var(--ink)] bg-surface px-3 py-1.5 text-xs font-extrabold text-ink shadow-[2px_2px_0_var(--ink)] transition-all hover:bg-paper-2 focus-visible:ring-2 focus-visible:ring-brand active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
          >
            ดูทั้งหมด
          </button>
        </div>

        {allTransactions.length === 0 ? (
          <p className="px-3 py-10 text-center text-sm text-ink-2">
            ยังไม่มีรายการธุรกรรมล่าสุดจากระบบ
          </p>
        ) : (
          <ul className="divide-y divide-line mt-2">
            {allTransactions.slice(0, 5).map(tx => {
              const isIncome = tx.type === "income";
              return (
                <li key={tx.id}>
                  <Link
                    href={`/transactions/${tx.id}`}
                    className="flex min-h-16 items-center justify-between gap-3.5 rounded-xl px-2.5 py-3 transition-colors hover:bg-paper-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div
                        className={`flex size-10 shrink-0 items-center justify-center rounded-xl border-1.5 border-[var(--ink)] ${
                          isIncome
                            ? "bg-tile-mint text-tile-mint-ink"
                            : "bg-tile-peach text-tile-peach-ink"
                        }`}
                      >
                        {isIncome ? (
                          <ArrowDownLeft
                            className="size-5 stroke-[2.2]"
                            aria-hidden="true"
                          />
                        ) : (
                          <ArrowUpRight className="size-5 stroke-[2.2]" aria-hidden="true" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-extrabold text-ink">
                          {tx.title}
                        </p>
                        <p className="truncate text-xs font-medium text-ink-3 pt-0.5">
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
