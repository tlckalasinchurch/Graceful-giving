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
          className="flex min-h-14 items-center justify-center gap-2.5 rounded-2xl bg-brand px-5 text-base font-bold text-white shadow-[0_8px_20px_-6px_rgba(79,70,229,0.5)] hover:bg-brand-ink hover:-translate-y-0.5 transition-all focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
          aria-label="บันทึกการถวาย"
        >
          <HandCoins className="size-5" aria-hidden="true" />
          <span>บันทึกการถวาย</span>
        </button>
      )}

      {canRecordExpense && (
        <button
          onClick={onNewExpense}
          className="flex min-h-14 items-center justify-center gap-2.5 rounded-2xl border border-line bg-paper px-5 text-base font-bold text-ink hover:bg-tile-peach/50 hover:border-tile-peach-ink/20 hover:-translate-y-0.5 transition-all focus-visible:ring-2 focus-visible:ring-brand"
          aria-label="บันทึกรายจ่าย"
        >
          <ReceiptText
            className="size-5 text-tile-peach-ink"
            aria-hidden="true"
          />
          <span>บันทึกรายจ่าย</span>
        </button>
      )}
    </div>
  );
}
