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
  /** Last months, oldest first; the final entry is the current month. */
  monthlyFlow?: { month: string; income: number; expense: number }[];
}

/**
 * Six bars of monthly net (income − expense). Bars above the baseline are a
 * surplus, below it a deficit; the current month is the solid bar. The
 * figures are repeated in a visually hidden list for screen readers.
 */
function NetTrend({
  data,
}: {
  data: { month: string; income: number; expense: number }[];
}) {
  const nets = data.map(d => d.income - d.expense);
  const max = Math.max(1, ...nets.map(Math.abs));
  const hasNegative = nets.some(n => n < 0);
  const H = 48;
  const base = hasNegative ? H / 2 : H;
  return (
    <figure className="mt-4">
      <figcaption className="mb-2 text-xs text-muted-foreground">
        สุทธิรายเดือน {data.length} เดือน
      </figcaption>
      <div className="grid grid-cols-6 items-end gap-2" aria-hidden="true">
        {data.map((d, i) => {
          const n = nets[i];
          const h = Math.max(
            2,
            (Math.abs(n) / max) * (hasNegative ? H / 2 : H)
          );
          const current = i === data.length - 1;
          const tone =
            n < 0
              ? current
                ? "bg-destructive"
                : "bg-destructive-border"
              : current
                ? "bg-primary"
                : "bg-accent-border";
          return (
            <div
              key={d.month + i}
              className="flex flex-col items-center gap-1.5"
            >
              <div className="relative w-full" style={{ height: H }}>
                <div
                  className={`absolute inset-x-1 rounded-sm ${tone}`}
                  style={
                    n >= 0
                      ? { bottom: H - base, height: h }
                      : { top: base, height: h }
                  }
                />
                {hasNegative && (
                  <div
                    className="absolute inset-x-0 border-t border-divider"
                    style={{ top: base }}
                  />
                )}
              </div>
              <span
                className={`text-[11px] ${current ? "font-semibold text-foreground" : "text-muted-foreground"}`}
              >
                {d.month}
              </span>
            </div>
          );
        })}
      </div>
      <ul className="sr-only">
        {data.map((d, i) => (
          <li key={d.month + i}>
            {d.month}: สุทธิ {nets[i].toLocaleString("th-TH")} บาท
          </li>
        ))}
      </ul>
    </figure>
  );
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
  monthlyFlow,
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

      {showBalance &&
        !isUnavailable &&
        monthlyFlow &&
        monthlyFlow.length > 1 &&
        monthlyFlow.some(m => m.income || m.expense) && (
          <NetTrend data={monthlyFlow} />
        )}

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
