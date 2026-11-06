import { formatAmount } from "@/lib/format";
import type { FundShare } from "../fundShares";

// One accent, then neutral steps: the bar reads as a single object that is
// divided, instead of six competing colours. Rows arrive largest first.
const TONES = [
  "bg-brand",
  "bg-paper/60",
  "bg-paper/45",
  "bg-paper/30",
  "bg-paper/20",
  "bg-paper/15",
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
    <div className="space-y-3">
      <div
        role="img"
        aria-label={`สัดส่วนเงินตามกองทุน ${rows
          .map(r => `${r.name} ${r.share}%`)
          .join(" ")}`}
        className="flex h-1.5 w-full gap-0.5 overflow-hidden rounded-full bg-paper/10"
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
                className={`size-1.5 shrink-0 rounded-full ${fundTone(i)}`}
              />
              <span className="min-w-0 flex-1 truncate font-normal text-paper/70">
                {r.name}
              </span>
              <span className="money shrink-0 text-paper">
                {hidden ? "••••" : `฿ ${formatAmount(r.balance, 0)}`}
              </span>
              <span className="money w-10 shrink-0 text-right text-paper/40">
                {r.share}%
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
