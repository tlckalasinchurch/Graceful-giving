import { Eye, EyeOff } from "lucide-react";
import { MoneyDisplay } from "@/components/common/CommonUI";
import { formatThaiDate } from "@/lib/format";

interface BalanceCardProps {
  showBalance: boolean;
  onToggleBalance: () => void;
  isLoading: boolean;
  isUnavailable: boolean;
  totalBalance?: number;
  /** This month's net (income − expense) and last month's, for the trend. */
  netMonthly?: number;
  prevNetMonthly?: number;
}

const HIDDEN = "฿ ••••••";

/**
 * The first thing on the dashboard: how much money the church holds now.
 * Loading and "no data" keep the same height so the page does not jump.
 */
export function BalanceCard({
  showBalance,
  onToggleBalance,
  isLoading,
  isUnavailable,
  totalBalance,
  netMonthly,
  prevNetMonthly,
}: BalanceCardProps) {
  const hasTrend =
    netMonthly !== undefined && prevNetMonthly !== undefined && !isUnavailable;
  const delta = hasTrend ? netMonthly - prevNetMonthly : 0;

  return (
    <section
      aria-labelledby="balance-heading"
      className="rounded-2xl border border-border bg-card p-4 sm:p-6"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2
            id="balance-heading"
            className="text-sm font-medium text-muted-foreground"
          >
            ยอดเงินคงเหลือรวม
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            ทุกกองทุน · ณ {formatThaiDate(new Date())}
          </p>
        </div>
        <button
          type="button"
          onClick={onToggleBalance}
          aria-pressed={!showBalance}
          aria-label={showBalance ? "ซ่อนยอดเงิน" : "แสดงยอดเงิน"}
          className="-mr-2 -mt-2 flex size-11 shrink-0 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          {showBalance ? (
            <Eye className="size-5" aria-hidden="true" />
          ) : (
            <EyeOff className="size-5" aria-hidden="true" />
          )}
        </button>
      </div>

      <div className="mt-3 min-h-11" aria-live="polite">
        {isLoading ? (
          <div
            className="h-10 w-56 max-w-full animate-pulse rounded-lg bg-muted"
            role="status"
            aria-label="กำลังโหลดยอดเงิน"
          />
        ) : isUnavailable ? (
          <p className="text-sm leading-relaxed text-foreground-soft">
            ยังไม่มีข้อมูลยอดเงิน
            บันทึกรายการแรกหรือตรวจสอบการเชื่อมต่อฐานข้อมูล
          </p>
        ) : showBalance ? (
          <MoneyDisplay amount={totalBalance ?? 0} size="xl" />
        ) : (
          <span className="text-[2rem] font-bold leading-tight tracking-tight text-foreground sm:text-4xl">
            {HIDDEN}
          </span>
        )}
      </div>

      {hasTrend && showBalance && (
        <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-divider pt-4 text-sm">
          <div className="min-w-0">
            <dt className="text-xs text-muted-foreground">สุทธิเดือนนี้</dt>
            <dd className="mt-0.5">
              <MoneyDisplay amount={netMonthly} size="sm" />
            </dd>
          </div>
          <div className="min-w-0">
            <dt className="text-xs text-muted-foreground">เทียบเดือนก่อน</dt>
            <dd
              className={`mt-0.5 text-sm font-semibold tabular-nums ${
                delta > 0
                  ? "text-success-strong"
                  : delta < 0
                    ? "text-destructive"
                    : "text-foreground-soft"
              }`}
            >
              {delta === 0 ? (
                "เท่ากับเดือนก่อน"
              ) : (
                <>
                  {delta > 0 ? "▲ เพิ่มขึ้น" : "▼ ลดลง"}{" "}
                  <span className="whitespace-nowrap">
                    ฿
                    {Math.abs(delta).toLocaleString("th-TH", {
                      maximumFractionDigits: 0,
                    })}
                  </span>
                </>
              )}
            </dd>
          </div>
        </dl>
      )}
    </section>
  );
}
