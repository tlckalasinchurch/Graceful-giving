import { HandCoins, ReceiptText } from "lucide-react";

interface PrimaryActionsProps {
  canRecordExpense: boolean;
  onNewOffering: () => void;
  onNewExpense: () => void;
}

export function PrimaryActions({
  canRecordExpense,
  onNewOffering,
  onNewExpense,
}: PrimaryActionsProps) {
  return (
    <section
      aria-label="การดำเนินการหลัก"
      style={{ animationDelay: "230ms" }}
      className={`animate-fade-up grid gap-4 sm:gap-6 w-full ${
        canRecordExpense ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1"
      }`}
    >
      <button
        onClick={onNewOffering}
        className="flex items-center justify-center gap-3.5 py-4 sm:py-5 min-h-[68px] sm:min-h-[76px] rounded-2xl sm:rounded-2xl bg-[#F97316] hover:bg-[#D95E0B] text-[#171717] font-bold text-lg sm:text-2xl button-elevation transition-transform active:scale-95 focus-visible:ring-2 focus-visible:ring-[#F97316] focus-visible:ring-offset-2 shadow-md"
        aria-label="บันทึกการถวาย"
      >
        <HandCoins className="w-7 h-7 sm:w-8 sm:h-8 stroke-[2.5]" />
        <span>บันทึกการถวาย</span>
      </button>

      {canRecordExpense && (
        <button
          onClick={onNewExpense}
          className="flex items-center justify-center gap-3.5 py-4 sm:py-5 min-h-[68px] sm:min-h-[76px] rounded-2xl sm:rounded-2xl bg-[#F97316] hover:bg-[#D95E0B] text-[#171717] font-bold text-lg sm:text-2xl button-elevation transition-transform active:scale-95 focus-visible:ring-2 focus-visible:ring-[#F97316] focus-visible:ring-offset-2 shadow-md"
          aria-label="บันทึกรายจ่าย"
        >
          <ReceiptText className="w-7 h-7 sm:w-8 sm:h-8 stroke-[2.5]" />
          <span>บันทึกรายจ่าย</span>
        </button>
      )}
    </section>
  );
}
