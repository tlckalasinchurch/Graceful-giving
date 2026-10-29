import { HandCoins, ReceiptText } from "lucide-react";

interface PrimaryActionsProps {
  canRecordExpense: boolean;
  onNewOffering: () => void;
  onNewExpense: () => void;
}

/** Recording an offering is the page's one primary action, so it is the only
 *  solid button; recording an expense is secondary. */
export function PrimaryActions({
  canRecordExpense,
  onNewOffering,
  onNewExpense,
}: PrimaryActionsProps) {
  return (
    <div
      className={`grid gap-3 w-full ${canRecordExpense ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1"}`}
    >
      <button
        onClick={onNewOffering}
        className="flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-brand px-4 text-base font-semibold text-white shadow-[0_1px_3px_hsla(20,80%,30%,0.3)] hover:bg-brand-ink focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
        aria-label="บันทึกการถวาย"
      >
        <HandCoins className="size-5" aria-hidden="true" />
        <span>บันทึกการถวาย</span>
      </button>

      {canRecordExpense && (
        <button
          onClick={onNewExpense}
          className="flex min-h-14 items-center justify-center gap-2 rounded-2xl border border-field bg-surface px-4 text-base font-semibold text-ink hover:bg-ground focus-visible:ring-2 focus-visible:ring-brand"
          aria-label="บันทึกรายจ่าย"
        >
          <ReceiptText className="size-5 text-ink-2" aria-hidden="true" />
          <span>บันทึกรายจ่าย</span>
        </button>
      )}
    </div>
  );
}
