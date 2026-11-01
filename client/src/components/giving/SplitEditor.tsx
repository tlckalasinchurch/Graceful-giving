import { OFFERING_CATEGORIES, offeringCategoryLabel } from "@shared/categories";
import { SPLIT_MESSAGE, sumSplit } from "@shared/givingSplit";
import {
  draftsProblem,
  parseDrafts,
  setLineAmount,
  toggleCategory,
  type SplitDraft,
} from "@/lib/splitDraft";

interface SplitEditorProps {
  lines: SplitDraft[];
  /** The amount of the transfer. The lines must add up to it. */
  total: number | null;
  onChange: (lines: SplitDraft[]) => void;
  /** Leaves the split and goes back to one category. */
  onCancel?: () => void;
  disabled?: boolean;
  idPrefix: string;
}

/**
 * One transfer, several categories. The person taps the categories they gave
 * to. An amount field shows for each one chosen. The last field takes what is
 * left, and the footer shows the sum against the transfer amount.
 */
export function SplitEditor({
  lines,
  total,
  onChange,
  onCancel,
  disabled = false,
  idPrefix,
}: SplitEditorProps) {
  const problem = draftsProblem(lines, total);
  const sum = sumSplit(parseDrafts(lines).filter(l => !Number.isNaN(l.amount)));
  const chosen = new Set(lines.map(l => l.category));

  return (
    <div
      role="group"
      aria-label="แบ่งยอดถวายหลายประเภท"
      className="space-y-3 rounded-2xl border border-line bg-surface p-3"
    >
      <div>
        <p className="mb-2 text-xs font-bold text-ink-2">
          ถวายอะไรบ้าง? แตะเลือกได้หลายอัน
        </p>
        <div className="flex flex-wrap gap-2">
          {OFFERING_CATEGORIES.map(c => {
            const on = chosen.has(c.id);
            return (
              <button
                key={c.id}
                type="button"
                aria-pressed={on}
                disabled={disabled || total === null}
                onClick={() =>
                  total !== null && onChange(toggleCategory(lines, c.id, total))
                }
                className={`min-h-11 rounded-xl border px-3 text-xs font-bold transition-colors disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
                  on
                    ? "border-brand bg-brand text-black"
                    : "border-line bg-paper text-ink-2 hover:text-ink"
                }`}
              >
                {on ? "✓ " : ""}
                {c.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-2">
        {lines.map((line, index) => {
          const label = offeringCategoryLabel(line.category);
          return (
            <div key={line.category} className="flex items-center gap-2">
              <label
                htmlFor={`${idPrefix}-amount-${line.category}`}
                className="min-w-0 flex-1 truncate text-sm font-bold text-ink"
              >
                {label}
              </label>
              <input
                id={`${idPrefix}-amount-${line.category}`}
                aria-label={`ยอด ${label}`}
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                value={line.amount}
                disabled={disabled}
                onChange={e =>
                  total !== null &&
                  onChange(setLineAmount(lines, index, e.target.value, total))
                }
                className="min-h-11 w-32 shrink-0 rounded-xl border border-line bg-paper px-3 text-right text-sm font-bold tabular-nums text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              />
              <span className="shrink-0 text-xs text-ink-3">บาท</span>
            </div>
          );
        })}
        {lines.length === 1 && (
          <p className="text-[11px] text-ink-3">
            แตะประเภทอื่นด้านบนเพื่อแบ่งยอด
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p
          role="status"
          className={`text-xs font-bold tabular-nums ${
            problem === null ? "text-emerald-300" : "text-amber-200"
          }`}
        >
          ผลรวม {sum.toLocaleString()} / ยอดที่โอน{" "}
          {total === null ? "—" : total.toLocaleString()}{" "}
          {problem === null ? "✓" : `· ${SPLIT_MESSAGE[problem]}`}
        </p>
        {onCancel && (
          <button
            type="button"
            disabled={disabled}
            onClick={onCancel}
            className="min-h-11 px-3 text-xs font-bold text-ink-3 underline underline-offset-2 hover:text-ink"
          >
            ยกเลิกการแบ่งยอด
          </button>
        )}
      </div>
    </div>
  );
}
