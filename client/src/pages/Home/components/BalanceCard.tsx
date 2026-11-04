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
    <span className={negative ? "text-rose-400" : "text-white"}>
      {negative && "−"}
      <span className="mr-2 text-2xl font-semibold text-white/50 sm:text-3xl">
        ฿
      </span>
      {formatted.slice(0, dot)}
      <span className="text-2xl font-medium text-white/40 sm:text-3xl">
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
      className="relative h-full rounded-2xl bg-surface border border-line p-5 sm:p-6 flex flex-col justify-between gap-5 w-full"
    >
      <div className="relative flex items-start justify-between gap-4">
        <div className="space-y-1.5">
          <h2 className="text-sm font-semibold text-ink-2">
            ยอดเงินคงเหลือรวม
          </h2>
          {isBalanceLoading && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-tile-lilac px-2.5 py-1 text-xs font-semibold text-tile-lilac-ink border border-tile-lilac-ink/20">
              <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
              กำลังโหลดข้อมูล
            </span>
          )}
          {isDataUnavailable && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-tile-sand px-2.5 py-1 text-xs font-semibold text-tile-sand-ink border border-tile-sand-ink/20">
              <Info className="size-3.5" aria-hidden="true" />
              {summaryError
                ? "เชื่อมต่อข้อมูลไม่สำเร็จ"
                : "ยังไม่มีข้อมูลการเงิน"}
            </span>
          )}
        </div>
        <button
          onClick={() => setShowBalance(!showBalance)}
          className="size-10 shrink-0 inline-flex items-center justify-center rounded-xl bg-paper-2 border border-line text-ink hover:bg-paper transition-colors focus-visible:ring-2 focus-visible:ring-brand"
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
          className="relative h-12 sm:h-14 w-56 sm:w-72 rounded-xl bg-paper-2 animate-pulse"
          aria-hidden="true"
        />
      ) : (
        <p className="relative display money whitespace-nowrap text-3xl font-bold tracking-tight leading-none sm:text-4xl lg:text-5xl">
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

      <div className="relative flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-line/60">
        {isBalanceLoading ? (
          <span className="text-xs text-ink-3">กำลังตรวจสอบยอดเงินล่าสุด…</span>
        ) : isPositiveBalance ? (
          <span className="text-xs text-ink-3">
            ขอบคุณพระเจ้าสำหรับทุกการถวาย
          </span>
        ) : (
          <span className="text-xs font-semibold text-danger">
            ยอดคงเหลือติดลบ — ควรตรวจสอบรายจ่าย
          </span>
        )}

        {canOpenReports && (
          <button
            onClick={onOpenReports}
            className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-line bg-paper-2 px-3 py-1.5 text-xs font-semibold text-ink hover:bg-paper transition-colors focus-visible:ring-2 focus-visible:ring-brand"
          >
            ดูรายละเอียด
            <ChevronRight className="size-3.5 text-ink-3" aria-hidden="true" />
          </button>
        )}
      </div>
    </section>
  );
}
