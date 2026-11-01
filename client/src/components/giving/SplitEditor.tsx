import { Plus, X } from "lucide-react";
import { OFFERING_CATEGORIES } from "@shared/categories";
import { MAX_SPLIT_LINES, SPLIT_MESSAGE, sumSplit } from "@shared/givingSplit";
import { NativeSelect } from "@/components/ui/native-select";
import {
  addDraft,
  draftsProblem,
  parseDrafts,
  unusedCategories,
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
 * One transfer, several categories. Each line is a category and an amount. The
 * footer shows the sum against the transfer amount, so the person sees at once
 * whether the lines add up.
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
  const canAdd =
    !disabled &&
    lines.length < MAX_SPLIT_LINES &&
    unusedCategories(lines).length > 0;

  const setLine = (index: number, patch: Partial<SplitDraft>) =>
    onChange(lines.map((l, i) => (i === index ? { ...l, ...patch } : l)));

  return (
    <div
      role="group"
      aria-label="แบ่งยอดถวายหลายประเภท"
      className="space-y-2 rounded-2xl border border-line bg-surface p-3"
    >
      {lines.map((line, index) => {
        const options = OFFERING_CATEGORIES.filter(
          c =>
            c.id === line.category ||
            !lines.some((other, j) => j !== index && other.category === c.id)
        );
        return (
          <div key={index} className="flex items-center gap-2">
            <NativeSelect
              aria-label={`ประเภทที่ ${index + 1}`}
              value={line.category}
              disabled={disabled}
              wrapperClassName="flex-1 min-w-0"
              onChange={e =>
                setLine(index, {
                  category: e.target.value as SplitDraft["category"],
                })
              }
            >
              {options.map(c => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </NativeSelect>
            <input
              id={`${idPrefix}-amount-${index}`}
              aria-label={`ยอดประเภทที่ ${index + 1}`}
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              value={line.amount}
              disabled={disabled}
              onChange={e => setLine(index, { amount: e.target.value })}
              className="min-h-11 w-28 shrink-0 rounded-xl border border-line bg-paper px-3 text-right text-sm font-bold tabular-nums text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            />
            <button
              type="button"
              aria-label={`ลบประเภทที่ ${index + 1}`}
              disabled={disabled || lines.length <= 1}
              onClick={() => onChange(lines.filter((_, i) => i !== index))}
              className="min-h-11 min-w-11 shrink-0 rounded-xl border border-line text-ink-3 hover:text-ink disabled:opacity-40 inline-flex items-center justify-center"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        );
      })}

      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
        <button
          type="button"
          disabled={!canAdd}
          onClick={() => total !== null && onChange(addDraft(lines, total))}
          className="min-h-11 rounded-xl border border-dashed border-line px-3 text-xs font-bold text-ink-2 hover:text-ink disabled:opacity-40 inline-flex items-center gap-1.5"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          เพิ่มประเภทอื่น
        </button>
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
    </div>
  );
}
