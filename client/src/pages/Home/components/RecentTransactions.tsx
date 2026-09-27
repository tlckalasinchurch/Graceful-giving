import {
  LoadingSkeleton,
  SectionHeader,
  TransactionRow,
} from "@/components/common/CommonUI";
import { formatThaiDate } from "@/lib/format";

export interface TransactionItem {
  id: string;
  href: string;
  title: string;
  date: Date | string;
  type: "income" | "expense";
  /** Category or fund, shown after the date. */
  context: string;
  amount: number;
}

interface RecentTransactionsProps {
  items: TransactionItem[];
  isLoading: boolean;
  onViewAll: () => void;
  onAddFirst?: () => void;
}

export function RecentTransactions({
  items,
  isLoading,
  onViewAll,
  onAddFirst,
}: RecentTransactionsProps) {
  return (
    <section aria-labelledby="recent-heading" className="space-y-3">
      <SectionHeader
        id="recent-heading"
        title="รายการล่าสุด"
        actionText={items.length > 0 ? "ดูทั้งหมด" : undefined}
        onAction={onViewAll}
      />
      {isLoading ? (
        <LoadingSkeleton count={4} />
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card px-5 py-8 text-center">
          <p className="text-[15px] font-semibold text-foreground">
            ยังไม่มีรายการเงิน
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            เริ่มบันทึกรายการแรกเพื่อดูความเคลื่อนไหวในหน้านี้
          </p>
          {onAddFirst && (
            <button
              type="button"
              onClick={onAddFirst}
              className="mt-4 min-h-11 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground hover:bg-primary-strong"
            >
              บันทึกรายการแรก
            </button>
          )}
        </div>
      ) : (
        <>
          <ul className="divide-y divide-divider overflow-hidden rounded-2xl border border-border bg-card">
            {items.map(tx => (
              <li key={tx.id}>
                <TransactionRow
                  href={tx.href}
                  title={tx.title}
                  meta={`${formatThaiDate(tx.date)} · ${tx.context}`}
                  amount={tx.amount}
                  type={tx.type}
                />
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={onViewAll}
            className="min-h-11 w-full rounded-xl border border-border bg-card text-sm font-semibold text-foreground hover:bg-muted"
          >
            ดูรายการทั้งหมด
          </button>
        </>
      )}
    </section>
  );
}
