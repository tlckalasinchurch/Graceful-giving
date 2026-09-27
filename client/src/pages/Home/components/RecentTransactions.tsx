import { ChevronRight, Heart, ReceiptText } from "lucide-react";
import { EmptyState } from "@/components/common/CommonUI";

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
  isLoading?: boolean;
  onViewAll: () => void;
  onAdd?: () => void;
  fmtBaht: (n: number) => string;
  fmtThaiDate: (d: Date | string) => string;
}

const ROW_COUNT = 4;

export function RecentTransactions({
  allTransactions,
  isLoading = false,
  onViewAll,
  onAdd,
  fmtBaht,
  fmtThaiDate,
}: RecentTransactionsProps) {
  return (
    <section
      aria-label="รายการธุรกรรมล่าสุด"
      className="bg-card rounded-2xl p-5 sm:p-6 border border-[#E7DCC8] shadow-xs space-y-3 w-full"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-[#171311]">รายการล่าสุด</h2>
        <button
          onClick={onViewAll}
          className="min-h-11 -mr-2 px-3 rounded-xl text-sm font-semibold text-[#9F3B0F] flex items-center gap-1 transition-all duration-200 ease-in-out hover:bg-[#FFF4D6] focus-visible:ring-2 focus-visible:ring-[#C94F16]"
        >
          <span>ดูทั้งหมด</span>
          <ChevronRight className="size-4" />
        </button>
      </div>

      {isLoading ? (
        <ul
          role="status"
          aria-label="กำลังโหลดรายการล่าสุด"
          className="divide-y divide-[#EFE5D3]"
        >
          {Array.from({ length: ROW_COUNT }).map((_, i) => (
            <li
              key={i}
              aria-hidden="true"
              className="py-3.5 flex items-center gap-3.5 animate-pulse"
            >
              <div className="size-10 rounded-xl bg-[#F1E6D2] shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-2/5 rounded-full bg-[#F1E6D2]" />
                <div className="h-3 w-1/4 rounded-full bg-[#F5EDE0]" />
              </div>
              <div className="h-5 w-24 rounded-full bg-[#F1E6D2]" />
            </li>
          ))}
        </ul>
      ) : allTransactions.length === 0 ? (
        <EmptyState
          icon={ReceiptText}
          title="ยังไม่มีรายการล่าสุด"
          description="เมื่อบันทึกการถวายหรือรายจ่ายแล้ว รายการจะแสดงที่นี่"
          actionText={onAdd ? "บันทึกการถวาย" : undefined}
          onAction={onAdd}
          className="border-none bg-transparent py-8"
        />
      ) : (
        <ul className="divide-y divide-[#EFE5D3] -mx-2">
          {allTransactions.slice(0, ROW_COUNT).map(tx => {
            const IconComponent = tx.icon || Heart;
            const isIncome = tx.type === "income";
            return (
              <li
                key={tx.id}
                className="px-2 py-3.5 flex items-center justify-between gap-4 rounded-xl transition-all duration-200 ease-in-out hover:bg-[#FFF4D6]/60"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div
                    className={`size-10 rounded-xl flex items-center justify-center shrink-0 border ${
                      isIncome
                        ? "bg-[#E4F3E7] text-[#2D6A2E] border-[#C3E4B8]"
                        : "bg-[#FEECEB] text-[#C8372D] border-[#F8C8C5]"
                    }`}
                  >
                    <IconComponent className="size-5" aria-hidden="true" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm sm:text-base font-semibold text-[#171311] leading-tight truncate">
                      {tx.title}
                    </p>
                    <p className="text-xs text-[#6E6155] pt-1">
                      {fmtThaiDate(tx.date)}
                    </p>
                  </div>
                </div>

                <p
                  className={`shrink-0 text-right text-base sm:text-lg font-bold tabular-nums tracking-tight ${isIncome ? "text-[#2D6A2E]" : "text-[#C8372D]"}`}
                >
                  {isIncome ? "+" : "-"}
                  {fmtBaht(Math.abs(tx.amount))}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
