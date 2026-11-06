import { HandCoins, ReceiptText } from "lucide-react";

interface PrimaryActionsProps {
  canRecordOffering: boolean;
  canRecordExpense: boolean;
  onNewOffering: () => void;
  onNewExpense: () => void;
}

export function PrimaryActions({
  canRecordOffering,
  canRecordExpense,
  onNewOffering,
  onNewExpense,
}: PrimaryActionsProps) {
  if (!canRecordOffering && !canRecordExpense) return null;

  return (
    <div
      className={`grid gap-2.5 sm:gap-3 w-full ${canRecordOffering && canRecordExpense ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1"}`}
    >
      {canRecordOffering && (
        <button
          onClick={onNewOffering}
          className="group flex min-h-[52px] items-center justify-center gap-2.5 rounded-2xl bg-brand px-5 text-sm sm:text-base font-bold text-black hover:bg-brand-ink transition-all shadow-xs active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
          aria-label="บันทึกการถวาย"
        >
          <span className="flex size-7 items-center justify-center rounded-xl bg-black/15 text-black">
            <HandCoins className="size-4.5" aria-hidden="true" />
          </span>
          <span>บันทึกการถวาย</span>
        </button>
      )}

      {canRecordExpense && (
        <button
          onClick={onNewExpense}
          className="group flex min-h-[52px] items-center justify-center gap-2.5 rounded-2xl border border-line bg-surface px-5 text-sm sm:text-base font-bold text-ink hover:bg-paper-2 transition-all shadow-xs active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-brand"
          aria-label="บันทึกรายจ่าย"
        >
          <span className="flex size-7 items-center justify-center rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200/60">
            <ReceiptText className="size-4.5" aria-hidden="true" />
          </span>
          <span>บันทึกรายจ่าย</span>
        </button>
      )}
    </div>
  );
}
