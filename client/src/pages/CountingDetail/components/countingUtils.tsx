import React from "react";
import { AlertTriangle, ArrowDown, ArrowUp, Check } from "lucide-react";
import { formatBaht } from "@/lib/format";

export const fmtBaht = (n: number) => formatBaht(n);

type VarianceKind = "match" | "over" | "short";

export function varianceKind(amount: number): VarianceKind {
  // Amounts come from satang arithmetic, so a true match is exactly 0.
  if (amount === 0) return "match";
  return amount > 0 ? "over" : "short";
}

/** Gentle tones: a discrepancy must stand out without looking like an error. */
export const VARIANCE_TONES: Record<
  VarianceKind,
  { pill: string; card: string; bar: string; text: string }
> = {
  match: {
    pill: "border-[#C8E6C9] bg-[#E8F5E9] text-[#1B5E20]",
    card: "border-[#C8E6C9] bg-[#F4FAF4]",
    bar: "bg-[#2E7D32]",
    text: "text-[#1B5E20]",
  },
  over: {
    pill: "border-[#FDE68A] bg-[#FEF3C7] text-[#92400E]",
    card: "border-[#FDE68A] bg-[#FFFBEB]",
    bar: "bg-[#F59E0B]",
    text: "text-[#92400E]",
  },
  short: {
    pill: "border-[#F8C8C5] bg-[#FEECEB] text-[#C8372D]",
    card: "border-[#F8C8C5] bg-[#FFF6F5]",
    bar: "bg-[#C8372D]",
    text: "text-[#C8372D]",
  },
};

/** Signed variance as a pill: ตรงกัน, เกิน ฿x or ขาด ฿x. */
export function Variance({ amount }: { amount: number }) {
  const kind = varianceKind(amount);
  const tone = VARIANCE_TONES[kind];
  const Icon = kind === "match" ? Check : kind === "over" ? ArrowUp : ArrowDown;
  return (
    <span
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-bold tabular-nums ${tone.pill}`}
    >
      <Icon className="size-3.5" aria-hidden="true" />
      {kind === "match"
        ? "ตรงกัน"
        : `${kind === "over" ? "เกิน" : "ขาด"} ${fmtBaht(Math.abs(amount))}`}
    </span>
  );
}

/**
 * One reconciliation check: the actual figure beside the expected one, two
 * bars on the same scale, and the variance. A mismatch tints the whole card
 * (amber when over, soft red when short) and says what to check next.
 */
export function ComparisonCard({
  title,
  actualLabel,
  actual,
  expectedLabel,
  expected,
  hint,
}: {
  title: string;
  actualLabel: string;
  actual: number;
  expectedLabel: string;
  expected: number;
  /** What to check when the figures differ. */
  hint: string;
}) {
  const variance = Math.round((actual - expected) * 100) / 100;
  const kind = varianceKind(variance);
  const tone = VARIANCE_TONES[kind];
  const scale = Math.max(Math.abs(actual), Math.abs(expected), 1);
  const pct = (n: number) => `${Math.min(100, (Math.abs(n) / scale) * 100)}%`;

  return (
    <article
      className={`rounded-2xl border p-5 shadow-xs transition-all duration-200 ease-in-out ${tone.card}`}
      aria-label={`${title}: ${kind === "match" ? "ตรงกัน" : kind === "over" ? "เกิน" : "ขาด"}`}
    >
      <header className="flex items-start justify-between gap-3">
        <h3 className="text-sm font-bold text-[#171311]">{title}</h3>
        <Variance amount={variance} />
      </header>

      <dl className="mt-4 space-y-3">
        <div>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <dt className="text-[#51443A]">{actualLabel}</dt>
            <dd className="font-bold tabular-nums text-[#171311]">
              {fmtBaht(actual)}
            </dd>
          </div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/80 ring-1 ring-inset ring-[#E7DCC8]">
            <div
              className={`h-full rounded-full transition-all duration-500 ease-out ${tone.bar}`}
              style={{ width: pct(actual) }}
            />
          </div>
        </div>
        <div>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <dt className="text-[#51443A]">{expectedLabel}</dt>
            <dd className="font-bold tabular-nums text-[#171311]">
              {fmtBaht(expected)}
            </dd>
          </div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/80 ring-1 ring-inset ring-[#E7DCC8]">
            <div
              className="h-full rounded-full bg-[#A39A91] transition-all duration-500 ease-out"
              style={{ width: pct(expected) }}
            />
          </div>
        </div>
      </dl>

      {kind !== "match" && (
        <p
          className={`mt-4 flex items-start gap-2 rounded-xl bg-white/70 p-3 text-xs leading-relaxed ${tone.text}`}
        >
          <AlertTriangle
            className="mt-0.5 size-4 shrink-0"
            aria-hidden="true"
          />
          <span>{hint}</span>
        </p>
      )}
    </article>
  );
}
