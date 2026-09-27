import { ArrowRight, HandCoins, ReceiptText } from "lucide-react";

interface PrimaryActionsProps {
  canRecordExpense: boolean;
  onNewOffering: () => void;
  onNewExpense: () => void;
}

// Both tiles lift 2px and gain the next shadow step on hover, and press
// down on tap. The offering tile carries the primary colour because it is
// the most frequent task; the expense tile is the secondary style.
const tileBase =
  "group flex items-center gap-4 rounded-2xl border p-4 sm:p-5 min-h-[76px] text-left transition-all duration-200 ease-in-out hover:-translate-y-0.5 hover:shadow-sm active:translate-y-0 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2";

export function PrimaryActions({
  canRecordExpense,
  onNewOffering,
  onNewExpense,
}: PrimaryActionsProps) {
  return (
    <section
      aria-label="การดำเนินการหลัก"
      style={{ animationDelay: "230ms" }}
      className={`animate-fade-up grid gap-4 w-full ${
        canRecordExpense ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1"
      }`}
    >
      <button
        onClick={onNewOffering}
        className={`${tileBase} border-[#C94F16] bg-[#C94F16] text-white shadow-xs hover:bg-[#B34612] focus-visible:ring-[#C94F16]`}
        aria-label="บันทึกการถวาย"
      >
        <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-white/15">
          <HandCoins className="size-6" aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-base sm:text-lg font-bold">
            บันทึกการถวาย
          </span>
          <span className="block text-xs sm:text-sm text-[#FFF4D6]">
            ทศางค์ ถวายทั่วไป และถวายพิเศษ
          </span>
        </span>
        <ArrowRight
          className="size-5 shrink-0 transition-transform duration-200 ease-in-out group-hover:translate-x-1"
          aria-hidden="true"
        />
      </button>

      {canRecordExpense && (
        <button
          onClick={onNewExpense}
          className={`${tileBase} border-[#E7DCC8] bg-card text-[#171311] shadow-xs hover:border-[#C94F16]/40 focus-visible:ring-[#C94F16]`}
          aria-label="บันทึกรายจ่าย"
        >
          <span className="flex size-12 shrink-0 items-center justify-center rounded-xl border border-[#F8C8C5] bg-[#FEECEB] text-[#C8372D]">
            <ReceiptText className="size-6" aria-hidden="true" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-base sm:text-lg font-bold">
              บันทึกรายจ่าย
            </span>
            <span className="block text-xs sm:text-sm text-[#51443A]">
              ค่าใช้จ่ายพันธกิจและค่าดำเนินงาน
            </span>
          </span>
          <ArrowRight
            className="size-5 shrink-0 text-[#C94F16] transition-transform duration-200 ease-in-out group-hover:translate-x-1"
            aria-hidden="true"
          />
        </button>
      )}
    </section>
  );
}
