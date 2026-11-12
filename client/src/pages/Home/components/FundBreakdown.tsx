import { formatAmount } from "@/lib/format";
import type { FundShare } from "../fundShares";

// One brand family, six values — the bar reads as a split of the same money.
const TONES = [
  "bg-brand",
  "bg-accent",
  "bg-coral",
  "bg-brand/55",
  "bg-accent/70",
  "bg-coral/55",
];
export const fundTone = (i: number) => TONES[i % TONES.length];

interface FundBreakdownProps {
  rows: FundShare[];
  hidden: boolean;
  /** Show the legend under the bar. Default true. */
  legend?: boolean;
}

/** Where the money sits: one bar split by fund, and a legend that carries the
 *  figures. Amounts follow the balance's show/hide switch. */
export function FundBreakdown({
  rows,
  hidden,
  legend = true,
}: FundBreakdownProps) {
  if (rows.length === 0) return null;
  return (
    <div className="relative space-y-3">
      <div
        role="img"
        aria-label={`สัดส่วนเงินตามกองทุน ${rows
          .map(r => `${r.name} ${r.share}%`)
          .join(" ")}`}
        className="flex h-3 w-full gap-0.5 overflow-hidden rounded-full border border-line bg-ground"
      >
        {rows.map((r, i) => (
          <span
            key={r.key}
            className={`h-full ${fundTone(i)} transition-[width] duration-300`}
            style={{ width: `${Math.max(r.share, 2)}%` }}
          />
        ))}
      </div>
      {legend && (
        <ul className="space-y-1.5">
          {rows.map((r, i) => (
            <li
              key={r.key}
              className="flex items-center gap-3 text-sm leading-6"
            >
              <span
                aria-hidden="true"
                className={`size-2.5 shrink-0 rounded-full border border-ink/10 ${fundTone(i)}`}
              />
              <span className="min-w-0 flex-1 truncate font-medium text-ink-2">
                {r.name}
              </span>
              <span className="money shrink-0 font-bold text-ink">
                {hidden ? "••••" : `฿ ${formatAmount(r.balance)}`}
              </span>
              <span className="money w-10 shrink-0 text-right font-medium text-ink-3">
                {r.share}%
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
