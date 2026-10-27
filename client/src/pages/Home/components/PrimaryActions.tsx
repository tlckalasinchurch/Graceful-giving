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
        className="group relative flex items-center justify-center gap-3.5 py-4 sm:py-5 min-h-[68px] sm:min-h-[76px] rounded-2xl sm:rounded-3xl bg-gradient-to-r from-[#1F5426] via-[#2D6A2E] to-[#1F5426] hover:from-[#19451E] hover:to-[#245826] text-white font-bold text-lg sm:text-2xl shadow-lg shadow-[#2D6A2E]/25 hover:shadow-xl hover:shadow-[#2D6A2E]/35 transition-all duration-150 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-[#2D6A2E] focus-visible:ring-offset-2 overflow-hidden"
        aria-label="บันทึกการถวาย"
      >
        <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
        <HandCoins className="w-7 h-7 sm:w-8 sm:h-8 stroke-[2.5] group-hover:scale-110 transition-transform" />
        <span>บันทึกการถวาย</span>
      </button>

      {canRecordExpense && (
        <button
          onClick={onNewExpense}
          className="group relative flex items-center justify-center gap-3.5 py-4 sm:py-5 min-h-[68px] sm:min-h-[76px] rounded-2xl sm:rounded-3xl bg-gradient-to-r from-[#9E3A12] via-[#B54A1E] to-[#9E3A12] hover:from-[#88310E] hover:to-[#9E3A12] text-white font-bold text-lg sm:text-2xl shadow-lg shadow-[#B54A1E]/25 hover:shadow-xl hover:shadow-[#B54A1E]/35 transition-all duration-150 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-[#B54A1E] focus-visible:ring-offset-2 overflow-hidden"
          aria-label="บันทึกรายจ่าย"
        >
          <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
          <ReceiptText className="w-7 h-7 sm:w-8 sm:h-8 stroke-[2.5] group-hover:scale-110 transition-transform" />
          <span>บันทึกรายจ่าย</span>
        </button>
      )}
    </section>
  );
}
