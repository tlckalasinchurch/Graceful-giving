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
    <span className={negative ? "text-brand" : "text-paper"}>
      {negative && "−"}
      <span className="mr-1.5 text-2xl font-medium text-paper/50 sm:text-3xl">
        ฿
      </span>
      {formatted.slice(0, dot)}
      <span className="text-2xl font-medium text-paper/45 sm:text-3xl">
        {formatted.slice(dot)}
      </span>
    </span>
  );
}

/**
 * The one figure the page is about. Solid ink, hairline rules, tabular numbers:
 * the amount carries the weight, not a gradient behind it.
 */
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
      className="flex h-full w-full flex-col justify-between gap-6 rounded-2xl bg-ink p-6 text-paper sm:p-7"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="label text-paper/60">ยอดเงินคงเหลือรวม</h2>

          {isBalanceLoading && (
            <span className="mt-2 inline-flex items-center gap-1.5 text-xs text-paper/50">
              <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
              กำลังโหลดข้อมูล
            </span>
          )}
          {isDataUnavailable && (
            <span className="mt-2 inline-flex items-center gap-1.5 text-xs text-brand">
              <Info className="size-3.5" aria-hidden="true" />
              {summaryError
                ? "เชื่อมต่อข้อมูลไม่สำเร็จ"
                : "ยังไม่มีข้อมูลการเงิน"}
            </span>
          )}
        </div>

        <button
          onClick={() => setShowBalance(!showBalance)}
          className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-paper/20 text-paper/70 transition-colors hover:border-paper/40 hover:text-paper"
          aria-label={showBalance ? "ซ่อนยอดเงิน" : "แสดงยอดเงิน"}
          aria-pressed={!showBalance}
        >
          {showBalance ? (
            <Eye className="size-4" aria-hidden="true" />
          ) : (
            <EyeOff className="size-4" aria-hidden="true" />
          )}
        </button>
      </div>

      {isBalanceLoading ? (
        <div
          className="h-11 w-56 animate-pulse rounded-md bg-paper/10 sm:h-14 sm:w-72"
          aria-hidden="true"
        />
      ) : (
        <p className="figure text-4xl sm:text-5xl lg:text-6xl">
          {!hasSummaryData ? (
            <span className="text-paper/25">—</span>
          ) : showBalance ? (
            <BalanceAmount
              value={animatedBalance}
              negative={!isPositiveBalance}
            />
          ) : (
            <span className="text-paper/35" aria-label="ยอดเงินถูกซ่อน">
              ฿ ••••••
            </span>
          )}
        </p>
      )}

      {!isBalanceLoading && hasSummaryData && (
        <FundBreakdown rows={fundRows} hidden={!showBalance} />
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-paper/15 pt-4">
        {isBalanceLoading ? (
          <span className="text-xs text-paper/40">
            กำลังตรวจสอบยอดเงินล่าสุด…
          </span>
        ) : isPositiveBalance ? (
          <span className="text-xs text-paper/50">
            ขอบคุณพระเจ้าสำหรับทุกการถวาย
          </span>
        ) : (
          <span className="text-xs font-medium text-brand">
            ยอดคงเหลือติดลบ — ควรตรวจสอบรายจ่าย
          </span>
        )}

        {canOpenReports && (
          <button
            onClick={onOpenReports}
            className="inline-flex min-h-9 items-center gap-1 text-xs font-medium text-paper/70 underline decoration-paper/25 underline-offset-4 transition-colors hover:text-paper hover:decoration-paper/60"
          >
            ดูรายละเอียด
            <ChevronRight className="size-3.5" aria-hidden="true" />
          </button>
        )}
      </div>
    </section>
  );
}
