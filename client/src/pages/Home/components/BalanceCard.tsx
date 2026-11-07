import { ChevronRight, Eye, EyeOff, Info, Loader2 } from "lucide-react";
import { formatAmount } from "@/lib/format";
import type { FundShare } from "../fundShares";
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
      <span className="text-2xl font-medium text-ink-3 sm:text-3xl">
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
}: BalanceCardProps) {
  return (
    <section
      aria-label="ยอดเงินคงเหลือรวม"
      className="relative flex h-full w-full flex-col justify-between gap-6 overflow-hidden rounded-[20px] border-2 border-[var(--ink)] bg-card p-6 text-foreground shadow-[5px_5px_0_var(--ink)] sm:p-7"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <h2 className="text-[11px] font-bold uppercase tracking-[0.14em] text-ink-3">ยอดเงินคงเหลือรวม</h2>

          {isBalanceLoading && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--line)] bg-paper px-2.5 py-1 text-xs font-semibold text-ink-2">
              <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
              กำลังโหลดข้อมูล
            </span>
          )}
          {isDataUnavailable && (
            <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-[var(--ink)] bg-[var(--tile-sand)] px-2.5 py-1 text-xs font-semibold text-[var(--tile-sand-ink)]">
              <Info className="size-3.5" aria-hidden="true" />
              {summaryError ? "เชื่อมต่อข้อมูลไม่สำเร็จ" : "ยังไม่มีข้อมูลการเงิน"}
            </span>
          )}
        </div>

        <button
          onClick={() => setShowBalance(!showBalance)}
          className="alpha-press inline-flex size-10 shrink-0 items-center justify-center rounded-[12px] border-2 border-[var(--ink)] bg-paper text-ink shadow-[3px_3px_0_var(--ink)]"
          aria-label={showBalance ? "ซ่อนยอดเงิน" : "แสดงยอดเงิน"}
          aria-pressed={!showBalance}
        >
          {showBalance ? (
            <Eye className="size-4" />
          ) : (
            <EyeOff className="size-4" />
          )}
        </button>
      </div>

      {isBalanceLoading ? (
        <div
          className="h-12 w-56 animate-pulse rounded-xl bg-paper sm:h-14 sm:w-72"
          aria-hidden="true"
        />
      ) : (
        <p className="alpha-display money whitespace-nowrap text-[40px] leading-none tracking-tight sm:text-5xl lg:text-[56px]">
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

      {!isBalanceLoading && hasSummaryData && (
        <FundBreakdown rows={fundRows} hidden={!showBalance} />
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--line)] pt-4">
        {isBalanceLoading ? (
          <span className="text-xs text-ink-3">
            กำลังตรวจสอบยอดเงินล่าสุด…
          </span>
        ) : isPositiveBalance ? (
          <span className="inline-flex items-center gap-2 rounded-md border border-tile-mint-ink/15 bg-tile-mint px-2.5 py-1 text-xs font-bold text-tile-mint-ink">
            ขอบคุณพระเจ้าสำหรับทุกการถวาย
          </span>
        ) : (
          <span className="inline-flex items-center gap-2 rounded-md border border-tile-rose-ink/15 bg-tile-rose px-2.5 py-1 text-xs font-bold text-tile-rose-ink">
            ยอดคงเหลือติดลบ — ควรตรวจสอบรายจ่าย
          </span>
        )}

        {canOpenReports && (
          <button
            onClick={onOpenReports}
            className="alpha-press inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-line bg-surface px-3.5 py-1.5 text-xs font-bold shadow-[2px_2px_0_var(--ink)]"
          >
            ดูรายละเอียด
            <ChevronRight className="size-3.5" aria-hidden="true" />
          </button>
        )}
      </div>
    </section>
  );
}
