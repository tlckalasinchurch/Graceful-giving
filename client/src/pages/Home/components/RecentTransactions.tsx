import { Link } from "wouter";
import { formatAmount } from "@/lib/format";

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

const MAX_ROWS = 6;

export function RecentTransactions({
  allTransactions,
  onViewAll,
  fmtThaiDate,
}: RecentTransactionsProps) {
  const rows = allTransactions.slice(0, MAX_ROWS);
  return (
    <section
      aria-label="รายการธุรกรรมล่าสุด"
      className="rounded-2xl border border-line bg-surface"
    >
      <div className="flex items-center justify-between gap-3 px-5 pt-4 sm:px-6">
        <h2 className="text-base font-semibold text-ink">รายการล่าสุด</h2>
        <button
          type="button"
          onClick={onViewAll}
          className="min-h-11 text-sm font-medium text-brand-ink hover:underline"
        >
          ดูทั้งหมด
        </button>
      </div>

      {rows.length === 0 ? (
        <p className="mx-5 mb-5 rounded-lg border border-dashed border-line px-4 py-3 text-sm text-ink-2 sm:mx-6">
          ยังไม่มีรายการถวายหรือรายจ่ายในระบบ
        </p>
      ) : (
        <ul className="pb-2">
          {rows.map(tx => (
            <li key={tx.id} className="border-t border-line first:border-t-0">
              <Link
                href={`/transactions/${tx.id}`}
                className="flex min-h-14 items-center justify-between gap-4 px-5 py-2.5 hover:bg-paper sm:px-6"
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-ink">
                    {tx.title}
                  </span>
                  <span className="block truncate text-xs text-ink-3">
                    {tx.subCategory} · {fmtThaiDate(tx.date)}
                  </span>
                </span>
                <span
                  className={`money shrink-0 text-right text-sm font-semibold ${
                    tx.type === "income" ? "text-income" : "text-ink"
                  }`}
                >
                  {tx.type === "income" ? "+" : "−"}฿&#8239;
                  {formatAmount(Math.abs(tx.amount))}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
