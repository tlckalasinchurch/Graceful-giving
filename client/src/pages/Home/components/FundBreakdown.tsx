import { formatAmount } from "@/lib/format";
import type { FundShare } from "../fundShares";

// Distinct jewel tones for each church fund share
const TONES = [
  "bg-emerald-400",
  "bg-amber-400",
  "bg-sky-400",
  "bg-rose-400",
  "bg-violet-400",
  "bg-teal-400",
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
        className="flex h-2.5 w-full gap-0.5 overflow-hidden rounded-full bg-black/20"
      >
        {rows.map((r, i) => (
          <span
            key={r.key}
            className={`h-full ${fundTone(i)} transition-all duration-300`}
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
                className={`size-2.5 shrink-0 rounded-full ${fundTone(i)} shadow-xs`}
              />
              <span className="min-w-0 flex-1 truncate text-white/90 font-medium">
                {r.name}
              </span>
              <span className="money shrink-0 text-white font-semibold">
                {hidden ? "••••" : `฿ ${formatAmount(r.balance, 0)}`}
              </span>
              <span className="money w-10 shrink-0 text-right text-emerald-200/70 font-medium">
                {r.share}%
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
