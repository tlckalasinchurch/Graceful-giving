import type React from "react";
import { cn } from "@/lib/utils";

/**
 * FinancialCard — the one card a financial number lives in.
 *
 * Quiet Financial System grammar:
 *   white surface · 18px radius · hairline border · NO shadow
 *   large tabular number · small contextual label · optional trend/status
 *
 * Tone is semantic (positive/negative/neutral) and only ever tints text and
 * the trend line — never the card fill. Card fills stay white so a screen of
 * financial cards reads as one calm surface, not a mood ring.
 */
type FinancialCardTone = "neutral" | "positive" | "negative";

const toneText: Record<FinancialCardTone, string> = {
  neutral: "text-foreground",
  positive: "text-success",
  negative: "text-error",
};

export interface FinancialCardProps {
  /** Small contextual label above the number. Always required: a bare number
      with no semantic scope is a financial hazard. */
  label: string;
  /** Pre-formatted amount (use MoneyDisplay/formatAmount + tabular-nums). */
  value: React.ReactNode;
  /** Optional trend/status, e.g. "+8.4%". */
  trend?: React.ReactNode;
  /** Context for the trend, e.g. "จากเดือนก่อน". */
  trendLabel?: string;
  tone?: FinancialCardTone;
  /** Leading visual (illustration tile, icon) — optional. */
  icon?: React.ReactNode;
  /** Right-hand action slot. */
  action?: React.ReactNode;
  className?: string;
}

export function FinancialCard({
  label,
  value,
  trend,
  trendLabel,
  tone = "neutral",
  icon,
  action,
  className,
}: FinancialCardProps) {
  return (
    <div
      className={cn(
        "min-w-0 bg-surface rounded-2xl border border-hairline p-5 sm:p-6 flex sm:flex-col items-center sm:items-start gap-4",
        className
      )}
    >
      {icon && <div className="shrink-0">{icon}</div>}
      <div className="min-w-0 max-w-full flex-1">
        <div className="flex items-start justify-between gap-2">
          <span className="text-body-sm font-medium text-muted-foreground">
            {label}
          </span>
          {action}
        </div>
        <div
          className={cn(
            "text-2xl sm:text-3xl md:text-4xl font-semibold break-words tabular-nums tracking-tight mt-0.5",
            toneText[tone]
          )}
        >
          {value}
        </div>
        {(trend || trendLabel) && (
          <span
            className={cn(
              "text-body-sm font-medium flex flex-wrap items-center gap-x-1.5 gap-y-0.5 mt-1",
              toneText[tone]
            )}
          >
            {trend && <span>{trend}</span>}
            {trendLabel && (
              <span className="text-caption text-muted-foreground font-normal">
                {trendLabel}
              </span>
            )}
          </span>
        )}
      </div>
    </div>
  );
}
