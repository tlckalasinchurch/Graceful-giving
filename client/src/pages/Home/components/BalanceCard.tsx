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
    <span className={negative ? "text-rose-300" : "text-white"}>
      {negative && "−"}
      <span className="mr-2 text-2xl font-semibold text-emerald-200/60 sm:text-3xl">
        ฿
      </span>
      {formatted.slice(0, dot)}
      <span className="text-2xl font-medium text-white/50 sm:text-3xl">
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
      className="relative h-full rounded-3xl bg-gradient-to-br from-[#0D2E23] via-[#0A261D] to-[#071D16] text-white border border-[#1B4B39] p-6 sm:p-7 flex flex-col justify-between gap-6 w-full shadow-md overflow-hidden"
    >
      {/* Subtle atmospheric ambient glow */}
      <div
        className="pointer-events-none absolute -right-16 -top-16 size-48 rounded-full bg-emerald-500/10 blur-3xl"
        aria-hidden="true"
      />

      <div className="relative flex items-start justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span
              className="size-2 rounded-full bg-emerald-400"
              aria-hidden="true"
            />
            <h2 className="text-xs sm:text-sm font-semibold tracking-wide text-emerald-100/80">
              ยอดเงินคงเหลือรวม
            </h2>
          </div>

          {isBalanceLoading && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-xs font-semibold text-emerald-100/90 border border-white/10">
              <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
              กำลังโหลดข้อมูล
            </span>
          )}
          {isDataUnavailable && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 px-2.5 py-1 text-xs font-semibold text-amber-200 border border-amber-500/20">
              <Info className="size-3.5" aria-hidden="true" />
              {summaryError
                ? "เชื่อมต่อข้อมูลไม่สำเร็จ"
                : "ยังไม่มีข้อมูลการเงิน"}
            </span>
          )}
        </div>

        <button
          onClick={() => setShowBalance(!showBalance)}
          className="size-10 shrink-0 inline-flex items-center justify-center rounded-xl bg-white/10 border border-white/10 text-white hover:bg-white/20 transition-colors focus-visible:ring-2 focus-visible:ring-emerald-400"
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
            <span className="text-emerald-300/40">—</span>
          ) : showBalance ? (
            <BalanceAmount
              value={animatedBalance}
              negative={!isPositiveBalance}
            />
          ) : (
            <span className="text-emerald-200/50" aria-label="ยอดเงินถูกซ่อน">
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
          <span className="text-xs text-emerald-100/70">
            กำลังตรวจสอบยอดเงินล่าสุด…
          </span>
        ) : isPositiveBalance ? (
          <span className="inline-flex items-center gap-2 text-xs text-emerald-100/90 font-medium">
            <span
              className="size-1.5 rounded-full bg-emerald-400 animate-pulse"
              aria-hidden="true"
            />
            ขอบคุณพระเจ้าสำหรับทุกการถวาย
          </span>
        ) : (
          <span className="text-xs font-semibold text-rose-300">
            ยอดคงเหลือติดลบ — ควรตรวจสอบรายจ่าย
          </span>
        )}

        {canOpenReports && (
          <button
            onClick={onOpenReports}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-white/15 bg-white/10 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-white/20 transition-colors focus-visible:ring-2 focus-visible:ring-emerald-400"
          >
            ดูรายละเอียด
            <ChevronRight
              className="size-3.5 text-emerald-200/70"
              aria-hidden="true"
            />
          </button>
        )}
      </div>
    </section>
  );
}
