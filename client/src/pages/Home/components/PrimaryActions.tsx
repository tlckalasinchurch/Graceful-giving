import { HandCoins, ReceiptText } from "lucide-react";

interface PrimaryActionsProps {
  canRecordOffering: boolean;
  canRecordExpense: boolean;
  onNewOffering: () => void;
  onNewExpense: () => void;
}

/** Recording an offering is the page's one primary action, so it is the only
 *  solid button; recording an expense is secondary. */
export function PrimaryActions({
  canRecordOffering,
  canRecordExpense,
  onNewOffering,
  onNewExpense,
}: PrimaryActionsProps) {
  if (!canRecordOffering && !canRecordExpense) return null;

  return (
    <div
      className={`grid gap-3 w-full ${canRecordOffering && canRecordExpense ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1"}`}
    >
      {canRecordOffering && (
        <button
          onClick={onNewOffering}
          className="flex min-h-14 items-center justify-center gap-2.5 rounded-[28px] bg-gradient-to-r from-[#FF6A00] via-[#FFC400] to-[#00F58A] px-5 text-lg font-black text-black shadow-[0_14px_36px_-10px_rgba(0,245,138,0.45)] hover:brightness-110 active:scale-[0.98] transition-all focus-visible:ring-2 focus-visible:ring-[#00F58A] focus-visible:ring-offset-2"
          aria-label="บันทึกการถวาย"
        >
          <HandCoins className="size-5" aria-hidden="true" />
          <span>บันทึกการถวาย</span>
        </button>
      )}

      {canRecordExpense && (
        <button
          onClick={onNewExpense}
          className="flex min-h-14 items-center justify-center gap-2.5 rounded-[28px] border border-white/[0.07] bg-[#0E0E10] px-5 text-lg font-black text-white hover:border-white/25 active:scale-[0.98] transition-all focus-visible:ring-2 focus-visible:ring-[#00F58A]"
          aria-label="บันทึกรายจ่าย"
        >
          <ReceiptText
            className="size-5 text-[#FF6A00]"
            aria-hidden="true"
          />
          <span>บันทึกรายจ่าย</span>
        </button>
      )}
    </div>
  );
}
