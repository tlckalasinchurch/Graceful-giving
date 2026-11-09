import { Calculator, HandCoins, HeartHandshake, ReceiptText } from "lucide-react";

interface PrimaryActionsProps {
  canRecordOffering: boolean;
  canRecordExpense: boolean;
  canOpenCounting?: boolean;
  canOpenGivingStation?: boolean;
  onNewOffering: () => void;
  onNewExpense: () => void;
  onOpenCounting?: () => void;
  onOpenGivingStation?: () => void;
}

export function PrimaryActions({
  canRecordOffering,
  canRecordExpense,
  canOpenCounting,
  canOpenGivingStation,
  onNewOffering,
  onNewExpense,
  onOpenCounting,
  onOpenGivingStation,
}: PrimaryActionsProps) {
  const showCountingCTA = Boolean(canOpenCounting && !canRecordOffering && !canRecordExpense);
  const showGivingCTA = Boolean(canOpenGivingStation && !canRecordOffering && !canRecordExpense && !canOpenCounting);

  if (!canRecordOffering && !canRecordExpense && !showCountingCTA && !showGivingCTA) return null;

  return (
    <div
      className={`grid gap-2.5 sm:gap-3 w-full ${canRecordOffering && canRecordExpense ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1"}`}
    >
      {canRecordOffering && (
        <button
          onClick={onNewOffering}
          className="btn-primary group flex min-h-[52px] items-center justify-center gap-2.5 rounded-xl px-5 text-sm font-bold transition-transform active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 sm:text-base cursor-pointer"
          aria-label="บันทึกการถวาย"
        >
          <span className="flex size-7 items-center justify-center rounded-lg bg-surface/20 text-white">
            <HandCoins className="size-4.5" aria-hidden="true" />
          </span>
          <span>บันทึกการถวาย</span>
        </button>
      )}

      {canRecordExpense && (
        <button
          onClick={onNewExpense}
          className="group flex min-h-[52px] items-center justify-center gap-2.5 rounded-xl border-2 border-[var(--ink)] bg-surface px-5 text-sm font-bold text-ink shadow-[4px_4px_0_var(--ink)] transition-all hover:bg-ground active:translate-x-[3px] active:translate-y-[3px] active:shadow-none focus-visible:ring-2 focus-visible:ring-brand sm:text-base cursor-pointer"
          aria-label="บันทึกรายจ่าย"
        >
          <span className="flex size-7 items-center justify-center rounded-lg bg-danger/10 text-danger">
            <ReceiptText className="size-4.5" aria-hidden="true" />
          </span>
          <span>บันทึกรายจ่าย</span>
        </button>
      )}

      {showCountingCTA && onOpenCounting && (
        <button
          onClick={onOpenCounting}
          className="btn-primary group flex min-h-[52px] items-center justify-center gap-2.5 rounded-xl px-5 text-sm font-bold transition-transform active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 sm:text-base cursor-pointer"
          aria-label="ไปที่รอบนับเงินถวาย"
        >
          <span className="flex size-7 items-center justify-center rounded-lg bg-surface/20 text-white">
            <Calculator className="size-4.5" aria-hidden="true" />
          </span>
          <span>ไปที่รอบนับเงินถวาย</span>
        </button>
      )}

      {showGivingCTA && onOpenGivingStation && (
        <button
          onClick={onOpenGivingStation}
          className="btn-primary group flex min-h-[52px] items-center justify-center gap-2.5 rounded-xl px-5 text-sm font-bold transition-transform active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 sm:text-base cursor-pointer"
          aria-label="ถวายทรัพย์ (Giving Station)"
        >
          <span className="flex size-7 items-center justify-center rounded-lg bg-surface/20 text-white">
            <HeartHandshake className="size-4.5" aria-hidden="true" />
          </span>
          <span>ถวายทรัพย์ (Giving Station)</span>
        </button>
      )}
    </div>
  );
}
