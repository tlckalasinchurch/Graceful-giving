import { formatAmount } from "@/lib/format";
import type { FundShare } from "../fundShares";

// The largest fund takes the brand colour; the rest step down in lightness.
// One hue only, so the bar reads as one thing split into parts.
const TONES = ["bg-brand", "bg-white/70", "bg-white/45", "bg-white/25"];
export const fundTone = (i: number) => TONES[Math.min(i, TONES.length - 1)];

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
        className="flex h-2.5 w-full gap-0.5 overflow-hidden rounded-full"
      >
        {rows.map((r, i) => (
          <span
            key={r.key}
            className={`h-full ${fundTone(i)}`}
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
                className={`size-2 shrink-0 rounded-full ${fundTone(i)}`}
              />
              <span className="min-w-0 flex-1 truncate text-white/80">
                {r.name}
              </span>
              <span className="money shrink-0 text-white/90">
                {hidden ? "••••" : `฿ ${formatAmount(r.balance, 0)}`}
              </span>
              <span className="money w-10 shrink-0 text-right text-white/50">
                {r.share}%
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
