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
      className={`grid gap-4 sm:gap-6 w-full ${
        canRecordExpense ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1"
      }`}
    >
      <button
        onClick={onNewOffering}
        className="flex items-center justify-center gap-3.5 py-4 sm:py-5 min-h-[68px] sm:min-h-[76px] rounded-2xl sm:rounded-2xl bg-[#D4FF3D] hover:bg-[#C2EB2E] text-[#0B0B0D] font-bold text-lg sm:text-2xl transition-colors focus-visible:ring-2 focus-visible:ring-[#D4FF3D] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B0B0D]"
        aria-label="บันทึกการถวาย"
      >
        <HandCoins className="w-7 h-7 sm:w-8 sm:h-8 stroke-[2.5]" />
        <span>บันทึกการถวาย</span>
      </button>

      {canRecordExpense && (
        <button
          onClick={onNewExpense}
          className="flex items-center justify-center gap-3.5 py-4 sm:py-5 min-h-[68px] sm:min-h-[76px] rounded-2xl sm:rounded-2xl bg-[#1C1D20] hover:bg-[#242529] border border-[#2A2B2E] text-white font-bold text-lg sm:text-2xl transition-colors focus-visible:ring-2 focus-visible:ring-[#FF6B5B] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B0B0D]"
          aria-label="บันทึกรายจ่าย"
        >
          <ReceiptText className="w-7 h-7 sm:w-8 sm:h-8 stroke-[2.5] text-[#FF6B5B]" />
          <span>บันทึกรายจ่าย</span>
        </button>
      )}
    </section>
  );
}
