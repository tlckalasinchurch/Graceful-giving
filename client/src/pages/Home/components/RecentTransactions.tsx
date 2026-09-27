import { ChevronRight, Heart } from "lucide-react";

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
  icon: typeof Heart;
}

interface RecentTransactionsProps {
  allTransactions: TransactionItem[];
  onViewAll: () => void;
  fmtBaht: (n: number) => string;
  fmtThaiDate: (d: Date | string) => string;
}

export function RecentTransactions({
  allTransactions,
  onViewAll,
  fmtBaht,
  fmtThaiDate,
}: RecentTransactionsProps) {
  return (
    <section
      aria-label="รายการธุรกรรมล่าสุด"
      className="bg-white rounded-2xl p-5 sm:p-6 border border-hairline space-y-4 w-full"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-lg sm:text-xl font-bold text-foreground">
          รายการล่าสุด
        </h2>
        <button
          onClick={onViewAll}
          className="min-h-11 -mr-2 px-2 text-sm font-bold text-warning hover:underline flex items-center gap-1 focus-visible:ring-2 focus-visible:ring-[#0071e3]"
        >
          <span>ดูทั้งหมด</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <div className="divide-y divide-[#e0e0e0]">
        {allTransactions.length === 0 && (
          <p className="py-8 text-center text-sm text-foreground font-medium">
            ยังไม่มีรายการธุรกรรมล่าสุดจากระบบ
          </p>
        )}
        {allTransactions.slice(0, 4).map(tx => {
          const IconComponent = tx.icon || Heart;
          const isIncome = tx.type === "income";
          return (
            <div
              key={tx.id}
              className="py-3.5 flex items-center justify-between gap-4"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div
                  className={`w-10 h-10 rounded-xl ${tx.tone} flex items-center justify-center shrink-0`}
                >
                  <IconComponent className="w-5 h-5 stroke-[2]" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm sm:text-base font-bold text-foreground leading-tight truncate">
                    {tx.title}
                  </p>
                  <p className="text-xs text-stone-500 font-medium pt-0.5">
                    {fmtThaiDate(tx.date)}
                  </p>
                </div>
              </div>

              <div className="text-right shrink-0">
                <p
                  className={`text-base sm:text-lg font-bold tabular-nums tracking-tight ${isIncome ? "text-success" : "text-error"}`}
                >
                  {isIncome ? "+" : "-"}
                  {fmtBaht(Math.abs(tx.amount))}
                </p>
                <p className="text-xs text-stone-500 font-medium">
                  {tx.subCategory}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
