import { ChevronRight, Eye, EyeOff, Info, Loader2 } from "lucide-react";
import { formatAmount } from "@/lib/format";
import type { FundPoolSplit, FundShare } from "../fundShares";
import { FundBreakdown } from "./FundBreakdown";

interface BalanceCardProps {
  showBalance: boolean;
  setShowBalance: (show: boolean) => void;
  isPositiveBalance: boolean;
  isBalanceLoading: boolean;
  isDataUnavailable: boolean;
  summaryError: unknown;
  hasSummaryData: boolean;
  animatedBalance: number;
  canOpenReports: boolean;
  onOpenReports: () => void;
  fundRows?: FundShare[];
  poolSplit?: FundPoolSplit;
}

/** The one number the page exists for: read it from across the room. */
function BalanceAmount({
  value,
  negative,
}: {
  value: number;
  negative: boolean;
}) {
  const formatted = formatAmount(Math.abs(value));
  const dot = formatted.lastIndexOf(".");
  return (
    <span className={negative ? "text-destructive" : "text-foreground"}>
      {negative && "−"}
      <span className="mr-1.5 text-2xl font-semibold text-brand sm:text-3xl">
        ฿
      </span>
      {formatted.slice(0, dot)}
      <span className="text-xl font-medium text-ink-3 sm:text-3xl">
        {formatted.slice(dot)}
      </span>
    </span>
  );
}

export function BalanceCard({
  showBalance,
  setShowBalance,
  isPositiveBalance,
  isBalanceLoading,
  isDataUnavailable,
  summaryError,
  hasSummaryData,
  animatedBalance,
  canOpenReports,
  onOpenReports,
  fundRows = [],
  poolSplit,
}: BalanceCardProps) {
  return (
    <section
      aria-label="ยอดเงินคงเหลือรวม"
      className="relative flex h-full w-full flex-col justify-between gap-6 overflow-hidden rounded-[20px] border-2 border-[var(--ink)] bg-card p-5 text-foreground shadow-[5px_5px_0_var(--ink)] sm:p-7"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <h2 className="text-xs font-bold uppercase tracking-[0.1em] text-ink-3">
            ยอดเงินคงเหลือรวม
          </h2>

          {isBalanceLoading && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--line)] bg-paper px-3 py-1 text-xs font-semibold text-ink-2">
              <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
              กำลังโหลดข้อมูล
            </span>
          )}
          {isDataUnavailable && (
            <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-[var(--ink)] bg-[var(--tile-sand)] px-3 py-1 text-xs font-semibold text-[var(--tile-sand-ink)]">
              <Info className="size-3.5" aria-hidden="true" />
              {summaryError
                ? "เชื่อมต่อข้อมูลไม่สำเร็จ"
                : "ยังไม่มีข้อมูลการเงิน"}
            </span>
          )}
        </div>

        <button
          onClick={() => setShowBalance(!showBalance)}
          className="alpha-press inline-flex size-11 shrink-0 items-center justify-center rounded-[12px] border-2 border-[var(--ink)] bg-paper text-ink shadow-[3px_3px_0_var(--ink)]"
          aria-label={showBalance ? "ซ่อนยอดเงิน" : "แสดงยอดเงิน"}
          aria-pressed={!showBalance}
        >
          {showBalance ? (
            <Eye className="size-5" />
          ) : (
            <EyeOff className="size-5" />
          )}
        </button>
      </div>

      {isBalanceLoading ? (
        <div
          className="h-12 w-56 animate-pulse rounded-xl bg-paper sm:h-14 sm:w-72"
          aria-hidden="true"
        />
      ) : (
        <p className="alpha-display money break-words text-[clamp(2.15rem,7.2vw,3.5rem)] leading-[1.08] tracking-tight sm:whitespace-nowrap">
          {!hasSummaryData ? (
            <span className="text-ink-3">—</span>
          ) : showBalance ? (
            <BalanceAmount
              value={animatedBalance}
              negative={!isPositiveBalance}
            />
          ) : (
            <span className="text-ink-3" aria-label="ยอดเงินถูกซ่อน">
              ฿ ••••••
            </span>
          )}
        </p>
      )}

      {!isBalanceLoading && hasSummaryData && poolSplit?.hasFunds && (
        <div
          aria-label="สัดส่วนเงินทั่วไปและกองทุนเฉพาะกิจ"
          className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 rounded-xl border border-line bg-paper-2/60 p-3 text-xs"
        >
          <div className="flex items-center justify-between sm:flex-col sm:items-start gap-1">
            <span className="font-bold text-ink-2">
              เงินหมุนเวียนทั่วไป (ใช้จ่ายได้)
            </span>
            <span className="font-mono text-sm font-extrabold text-income tabular-nums">
              {showBalance
                ? `฿ ${formatAmount(poolSplit.generalBalance)}`
                : "฿ ••••"}
            </span>
          </div>
          <div className="flex items-center justify-between sm:flex-col sm:items-start gap-1 border-t sm:border-t-0 sm:border-l border-line pt-2 sm:pt-0 sm:pl-3">
            <span className="font-bold text-ink-2">
              เงินกองทุนเฉพาะกิจ (ระบุวัตถุประสงค์)
            </span>
            <span className="font-mono text-sm font-extrabold text-ink tabular-nums">
              {showBalance
                ? `฿ ${formatAmount(poolSplit.restrictedBalance)}`
                : "฿ ••••"}
            </span>
          </div>
        </div>
      )}

      {!isBalanceLoading && hasSummaryData && (
        <FundBreakdown rows={fundRows} hidden={!showBalance} />
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--line)] pt-4">
        {isBalanceLoading ? (
          <span className="text-xs text-ink-3">กำลังตรวจสอบยอดเงินล่าสุด…</span>
        ) : isPositiveBalance ? (
          <span className="inline-flex items-center gap-2 rounded-md border border-tile-mint-ink/15 bg-tile-mint px-3 py-1.5 text-xs font-bold text-tile-mint-ink">
            ขอบคุณพระเจ้าสำหรับทุกการถวาย
          </span>
        ) : (
          <span className="inline-flex items-center gap-2 rounded-md border border-tile-rose-ink/15 bg-tile-rose px-3 py-1.5 text-xs font-bold text-tile-rose-ink">
            ยอดคงเหลือติดลบ — ควรตรวจสอบรายจ่าย
          </span>
        )}

        {canOpenReports && (
          <button
            onClick={onOpenReports}
            className="alpha-press inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-line bg-surface px-4 py-2 text-xs sm:text-sm font-bold shadow-[2px_2px_0_var(--ink)]"
          >
            ดูรายละเอียด
            <ChevronRight className="size-4" aria-hidden="true" />
          </button>
        )}
      </div>
    </section>
  );
}
