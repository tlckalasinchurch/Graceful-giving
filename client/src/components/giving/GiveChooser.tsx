import { OFFERING_CATEGORIES, offeringCategoryLabel } from "@shared/categories";
import type { OfferingCategory } from "@shared/categories";
import { MAX_GIVING_AMOUNT } from "@shared/givingLimits";
import {
  giveTotal,
  toggleGiveCategory,
  type SplitDraft,
} from "@/lib/splitDraft";

interface GiveChooserProps {
  lines: SplitDraft[];
  onChange: (lines: SplitDraft[]) => void;
  /** The usual amount of each category, used when the category is tapped on. */
  defaults: Record<OfferingCategory, number>;
  /** Quick amounts shown under each chosen category. */
  presets: Record<OfferingCategory, number[]>;
}

/**
 * Step 2: tap the categories the gift is for, then type an amount for each.
 * The total to pay is the sum of the lines, and one transfer slip covers it.
 */
export function GiveChooser({
  lines,
  onChange,
  defaults,
  presets,
}: GiveChooserProps) {
  const total = giveTotal(lines);
  const chosen = new Set(lines.map(l => l.category));

  const setAmount = (category: OfferingCategory, amount: string) =>
    onChange(lines.map(l => (l.category === category ? { ...l, amount } : l)));

  return (
    <section
      aria-label="เลือกประเภทและยอดถวาย"
      className="lg:col-span-2 rounded-[28px] bg-[#0E0E10] border border-white/[0.07] p-5 space-y-4"
    >
      <div>
        <h3 className="mb-2 text-xs font-bold text-[#FDBA74]">
          ถวายอะไรบ้าง? แตะเลือกได้หลายอัน
        </h3>
        <div className="flex flex-wrap gap-2">
          {OFFERING_CATEGORIES.map(c => {
            const on = chosen.has(c.id);
            return (
              <button
                key={c.id}
                type="button"
                aria-pressed={on}
                onClick={() =>
                  onChange(toggleGiveCategory(lines, c.id, defaults[c.id]))
                }
                className={`min-h-11 rounded-xl border px-3.5 text-sm font-bold transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2DD4BF] ${
                  on
                    ? "border-brand bg-brand text-black"
                    : "border-white/15 bg-white/5 text-stone-200 hover:text-white"
                }`}
              >
                {on ? "✓ " : ""}
                {c.label}
              </button>
            );
          })}
        </div>
      </div>

      {lines.length === 0 ? (
        <p className="text-xs text-stone-400">
          เลือกอย่างน้อย 1 ประเภท แล้วใส่ยอดที่ต้องการถวาย
        </p>
      ) : (
        <div className="space-y-3">
          {lines.map(line => {
            const label = offeringCategoryLabel(line.category);
            return (
              <div
                key={line.category}
                className="rounded-2xl border border-white/10 bg-black/30 p-3 space-y-2"
              >
                <div className="flex items-center gap-2">
                  <label
                    htmlFor={`give-amount-${line.category}`}
                    className="min-w-0 flex-1 truncate text-sm font-bold text-white"
                  >
                    {label}
                  </label>
                  <input
                    id={`give-amount-${line.category}`}
                    aria-label={`ยอด ${label}`}
                    type="number"
                    inputMode="decimal"
                    min="1"
                    max={MAX_GIVING_AMOUNT}
                    step="0.01"
                    value={line.amount}
                    onChange={e => setAmount(line.category, e.target.value)}
                    className="min-h-11 w-32 shrink-0 rounded-xl bg-[#161B26] border border-white/15 px-3 text-right text-sm font-bold tabular-nums text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2DD4BF]"
                  />
                  <span className="shrink-0 text-xs text-stone-400">บาท</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {presets[line.category].map(amount => (
                    <button
                      key={amount}
                      type="button"
                      aria-label={`${label} ${amount.toLocaleString()} บาท`}
                      onClick={() => setAmount(line.category, String(amount))}
                      className="min-h-9 rounded-lg border border-white/15 bg-white/5 px-2.5 text-xs font-bold tabular-nums text-stone-200 hover:text-white cursor-pointer"
                    >
                      {amount.toLocaleString()}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div
        role="status"
        aria-label="ยอดรวมที่ต้องโอน"
        className="flex items-baseline justify-between gap-2 border-t border-white/10 pt-3"
      >
        <span className="text-xs font-bold text-stone-300">
          ยอดรวมที่ต้องโอน
          {lines.length > 1 ? ` (${lines.length} ประเภท)` : ""}
        </span>
        <span
          className={`text-2xl font-black tabular-nums ${
            total === null ? "text-stone-500" : "text-[#00F58A]"
          }`}
        >
          {total === null ? "—" : `${total.toLocaleString()} THB`}
        </span>
      </div>
    </section>
  );
}
