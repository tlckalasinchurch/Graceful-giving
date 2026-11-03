import { HandCoins } from "lucide-react";

interface HomeHeaderProps {
  finding: string;
  canRecordOffering: boolean;
  canRecordExpense: boolean;
  onNewOffering: () => void;
  onNewExpense: () => void;
}

/** Noun title, the one finding, and the two jobs done most often. Recording
 *  an offering is the screen's only filled button. */
export function HomeHeader({
  finding,
  canRecordOffering,
  canRecordExpense,
  onNewOffering,
  onNewExpense,
}: HomeHeaderProps) {
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold text-ink">ภาพรวม</h1>
        <p className="mt-1 text-sm text-ink-2">{finding}</p>
      </div>
      {(canRecordOffering || canRecordExpense) && (
        <div className="flex items-center gap-2">
          {canRecordExpense && (
            <button
              type="button"
              onClick={onNewExpense}
              className="min-h-11 flex-1 rounded-full border border-field/60 px-5 text-sm font-semibold text-ink transition-colors hover:bg-paper-2 sm:flex-none"
            >
              บันทึกรายจ่าย
            </button>
          )}
          {canRecordOffering && (
            <button
              type="button"
              onClick={onNewOffering}
              className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-full bg-brand px-5 text-sm font-semibold text-black transition-colors hover:bg-brand-ink sm:flex-none"
            >
              <HandCoins className="size-4" aria-hidden="true" />
              บันทึกการถวาย
            </button>
          )}
        </div>
      )}
    </header>
  );
}
