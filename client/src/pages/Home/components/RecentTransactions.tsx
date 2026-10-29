import { ChevronRight, type LucideIcon } from "lucide-react";
import { Link } from "wouter";
import { MoneyDisplay } from "@/components/common/CommonUI";

export interface TransactionItem {
  id: string;
  rawId: number;
  title: string;
  date: string | Date;
  type: "income" | "expense";
  category: string;
  subCategory: string;
  amount: number;
  tone: string;
  icon: LucideIcon;
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
      className="h-full bg-surface rounded-3xl p-2 sm:p-3 fintech-card w-full"
    >
      <div className="flex items-center justify-between px-3 pt-2">
        <h2 className="text-base font-semibold text-ink">รายการล่าสุด</h2>
        <button
          onClick={onViewAll}
          className="inline-flex min-h-11 items-center gap-1 rounded-2xl px-2 text-sm font-semibold text-brand-ink hover:bg-ground focus-visible:ring-2 focus-visible:ring-brand"
        >
          <span>ดูทั้งหมด</span>
          <ChevronRight className="size-4" aria-hidden="true" />
        </button>
      </div>

      {allTransactions.length === 0 ? (
        <p className="px-3 py-8 text-center text-sm text-ink-2">
          ยังไม่มีรายการธุรกรรมล่าสุดจากระบบ
        </p>
      ) : (
        <ul className="divide-y divide-line">
          {allTransactions.slice(0, 5).map(tx => {
            const Icon = tx.icon;
            return (
              <li key={tx.id}>
                <Link
                  href={`/transactions/${tx.id}`}
                  className="flex min-h-16 items-center justify-between gap-4 rounded-2xl px-3 py-3 hover:bg-ground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand"
                >
                  <div className="flex min-w-0 items-center gap-3.5">
                    <span
                      className={`size-11 shrink-0 rounded-2xl flex items-center justify-center ${tx.tone}`}
                      aria-hidden="true"
                    >
                      <Icon className="size-5" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-ink">
                        {tx.title}
                      </p>
                      <p className="truncate text-xs text-ink-2 pt-0.5">
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
    </section>
  );
}
