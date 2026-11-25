import { Check } from "lucide-react";
import { formatAmount } from "@/lib/format";
import { OFFERING_CATEGORIES, offeringCategoryLabel } from "@shared/categories";
import type { OfferingCategory } from "@shared/categories";
import { MAX_GIVING_AMOUNT } from "@shared/givingLimits";
import {
  giveTotal,
  toggleGiveCategory,
  type SplitDraft,
} from "@/lib/splitDraft";

/** The station lists tithe first, the gift most members bring each week; other screens keep the shared order. */
export const STATION_CATEGORIES = [
  ...OFFERING_CATEGORIES.filter(c => c.id === "tithe"),
  ...OFFERING_CATEGORIES.filter(c => c.id !== "tithe"),
];

interface GiveChooserProps {
  lines: SplitDraft[];
  onChange: (lines: SplitDraft[]) => void;
  /** Quick amounts shown under each chosen category. */
  presets: Record<OfferingCategory, number[]>;
}

/**
 * Step 2: tap the categories the gift is for, then type an amount for each.
 * The total to pay is the sum of the lines, and one transfer slip covers it.
 */
export function GiveChooser({ lines, onChange, presets }: GiveChooserProps) {
  const total = giveTotal(lines);
  const chosen = new Set(lines.map(l => l.category));

  const setAmount = (category: OfferingCategory, amount: string) =>
    onChange(lines.map(l => (l.category === category ? { ...l, amount } : l)));

  return (
    <section
      aria-label="เลือกประเภทและยอดถวาย"
      className="lg:col-span-2 rounded-2xl bg-surface border border-line p-5 space-y-4"
    >
      <div>
        <h3 className="mb-2.5 text-base font-medium text-ink-2">
          ถวายอะไรบ้าง? แตะเลือกได้หลายอัน
        </h3>
        <div className="flex flex-wrap gap-2">
          {STATION_CATEGORIES.map(c => {
            const on = chosen.has(c.id);
            return (
              <button
                key={c.id}
                type="button"
                aria-pressed={on}
                onClick={() => onChange(toggleGiveCategory(lines, c.id))}
                className={`inline-flex items-center gap-1.5 min-h-11 rounded-full border px-4 text-base font-medium transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
                  on
                    ? "border-brand bg-tile-mint text-tile-mint-ink"
                    : "border-line bg-surface text-ink-2 hover:bg-paper-2 hover:text-ink"
                }`}
              >
                {on && (
                  <Check
                    className="size-4 shrink-0 stroke-[2.2]"
                    aria-hidden="true"
                  />
                )}
                {c.label}
              </button>
            );
          })}
        </div>
      </div>

      {lines.length === 0 ? (
        <p className="text-base font-normal text-ink-2">
          เลือกอย่างน้อย 1 ประเภท แล้วใส่ยอดที่ต้องการถวาย
        </p>
      ) : (
        <div className="space-y-3">
          {lines.map(line => {
            const label = offeringCategoryLabel(line.category);
            return (
              <div
                key={line.category}
                className="rounded-2xl border border-line bg-ground p-3.5 space-y-2.5"
              >
                <div className="flex items-center gap-2">
                  <label
                    htmlFor={`give-amount-${line.category}`}
                    className="min-w-0 flex-1 truncate text-base font-medium text-ink"
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
                    placeholder="ใส่ยอด"
                    autoFocus={line.amount === ""}
                    onChange={e => setAmount(line.category, e.target.value)}
                    className="min-h-11 w-32 shrink-0 rounded-xl bg-surface border border-line px-3 text-right text-lg font-semibold tabular-nums text-ink placeholder:text-base placeholder:font-normal placeholder:text-ink-3 focus:border-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/25"
                  />
                  <span className="shrink-0 text-base font-normal text-ink-2">
                    บาท
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {presets[line.category].map(amount => (
                    <button
                      key={amount}
                      type="button"
                      aria-label={`${label} ${amount.toLocaleString()} บาท`}
                      onClick={() => setAmount(line.category, String(amount))}
                      className="min-h-11 min-w-16 rounded-full border border-line bg-surface px-4 text-base font-medium tabular-nums text-ink-2 hover:border-brand hover:bg-tile-mint hover:text-tile-mint-ink cursor-pointer transition-colors"
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
        className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 border-t border-line pt-3"
      >
        <span className="text-base font-medium text-ink-2">
          ยอดรวมที่ต้องโอน
          {lines.length > 1 ? ` (${lines.length} ประเภท)` : ""}
        </span>
        <span
          className={`money ml-auto whitespace-nowrap text-2xl font-semibold ${
            total === null ? "text-ink-3" : "text-income"
          }`}
        >
          {total === null ? "—" : `${formatAmount(total)} บาท`}
        </span>
      </div>
    </section>
  );
}
