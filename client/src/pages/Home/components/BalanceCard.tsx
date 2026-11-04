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
      className="relative h-full rounded-2xl bg-[#080808] text-white border border-black/90 p-5 sm:p-6 flex flex-col justify-between gap-5 w-full shadow-sm"
    >
      <div className="relative flex items-start justify-between gap-4">
        <div className="space-y-1.5">
          <h2 className="text-sm font-semibold text-zinc-400">
            ยอดเงินคงเหลือรวม
          </h2>
          {isBalanceLoading && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-xs font-semibold text-zinc-300 border border-white/10">
              <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
              กำลังโหลดข้อมูล
            </span>
          )}
          {isDataUnavailable && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 px-2.5 py-1 text-xs font-semibold text-amber-300 border border-amber-500/20">
              <Info className="size-3.5" aria-hidden="true" />
              {summaryError
                ? "เชื่อมต่อข้อมูลไม่สำเร็จ"
                : "ยังไม่มีข้อมูลการเงิน"}
            </span>
          )}
        </div>
        <button
          onClick={() => setShowBalance(!showBalance)}
          className="size-10 shrink-0 inline-flex items-center justify-center rounded-xl bg-white/10 border border-white/10 text-white hover:bg-white/20 transition-colors focus-visible:ring-2 focus-visible:ring-brand"
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
          className="relative h-12 sm:h-14 w-56 sm:w-72 rounded-xl bg-white/10 animate-pulse"
          aria-hidden="true"
        />
      ) : (
        <p className="relative display money whitespace-nowrap text-3xl font-bold tracking-tight leading-none sm:text-4xl lg:text-5xl">
          {!hasSummaryData ? (
            <span className="text-zinc-500">—</span>
          ) : showBalance ? (
            <BalanceAmount
              value={animatedBalance}
              negative={!isPositiveBalance}
            />
          ) : (
            <span className="text-zinc-500" aria-label="ยอดเงินถูกซ่อน">
              ฿ ••••••
            </span>
          )}
        </p>
      )}

      {!isBalanceLoading && hasSummaryData && (
        <FundBreakdown rows={fundRows} hidden={!showBalance} />
      )}

      <div className="relative flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-white/10">
        {isBalanceLoading ? (
          <span className="text-xs text-zinc-400">กำลังตรวจสอบยอดเงินล่าสุด…</span>
        ) : isPositiveBalance ? (
          <span className="inline-flex items-center gap-2 text-xs text-zinc-300">
            <span className="size-2 rounded-full bg-brand" aria-hidden="true" />
            ขอบคุณพระเจ้าสำหรับทุกการถวาย
          </span>
        ) : (
          <span className="text-xs font-semibold text-rose-400">
            ยอดคงเหลือติดลบ — ควรตรวจสอบรายจ่าย
          </span>
        )}

        {canOpenReports && (
          <button
            onClick={onOpenReports}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/20 transition-colors focus-visible:ring-2 focus-visible:ring-brand"
          >
            ดูรายละเอียด
            <ChevronRight className="size-3.5 text-zinc-400" aria-hidden="true" />
          </button>
        )}
      </div>
    </section>
  );
}
