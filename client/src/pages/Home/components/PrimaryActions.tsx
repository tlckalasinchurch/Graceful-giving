import { HandCoins, ReceiptText } from "lucide-react";

interface PrimaryActionsProps {
  canRecordOffering: boolean;
  canRecordExpense: boolean;
  onNewOffering: () => void;
  onNewExpense: () => void;
}

/**
 * The two things this page exists to do. One filled button, one outline: no
 * icon chips, no press scale, no shadow — the label is enough.
 */
export function PrimaryActions({
  canRecordOffering,
  canRecordExpense,
  onNewOffering,
  onNewExpense,
}: PrimaryActionsProps) {
  if (!canRecordOffering && !canRecordExpense) return null;

  return (
    <div
      className={`grid w-full gap-2 ${
        canRecordOffering && canRecordExpense
          ? "grid-cols-1 sm:grid-cols-2"
          : "grid-cols-1"
      }`}
    >
      {canRecordOffering && (
        <button
          onClick={onNewOffering}
          className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-brand px-4 text-sm font-semibold text-black transition-colors hover:bg-brand-ink"
          aria-label="บันทึกการถวาย"
        >
          <HandCoins className="size-4" aria-hidden="true" />
          <span>บันทึกการถวาย</span>
        </button>
      )}

      {canRecordExpense && (
        <button
          onClick={onNewExpense}
          className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-line bg-surface px-4 text-sm font-semibold text-ink transition-colors hover:border-ink/25 hover:bg-paper"
          aria-label="บันทึกรายจ่าย"
        >
          <ReceiptText className="size-4 text-ink-3" aria-hidden="true" />
          <span>บันทึกรายจ่าย</span>
        </button>
      )}
    </div>
  );
}
