import { ChevronRight, Eye, EyeOff, Info, Loader2 } from "lucide-react";
import { formatAmount } from "@/lib/format";

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
      <span className="mr-2 text-2xl font-semibold text-[#00F58A] sm:text-3xl">
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
}: BalanceCardProps) {
  return (
    <section
      aria-label="ยอดเงินคงเหลือรวม"
      style={{ animationDelay: "90ms" }}
      className="animate-fade-up relative overflow-hidden h-full rounded-[28px] bg-[#0E0E10] border border-white/[0.07] p-6 sm:p-8 flex flex-col justify-between gap-8 w-full"
    >
      {/* Subtle Pastel FinTech Glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-20 -right-20 size-52 rounded-full bg-[#00F58A]/15 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-16 left-10 size-44 rounded-full bg-[#FF6A00]/15 blur-3xl"
      />

      <div className="relative flex items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/[0.06] px-3 py-1">
            <span className="size-2 rounded-full bg-[#00F58A]" aria-hidden="true" />
            <h2 className="text-xs sm:text-sm font-bold text-white/80">
              ยอดเงินคงเหลือรวม
            </h2>
          </div>
          {isBalanceLoading && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-tile-lilac px-2.5 py-1 text-xs font-semibold text-tile-lilac-ink">
              <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
              กำลังโหลดข้อมูล
            </span>
          )}
          {isDataUnavailable && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-tile-sand px-2.5 py-1 text-xs font-semibold text-tile-sand-ink">
              <Info className="size-3.5" aria-hidden="true" />
              {summaryError
                ? "เชื่อมต่อข้อมูลไม่สำเร็จ"
                : "ยังไม่มีข้อมูลการเงิน"}
            </span>
          )}
        </div>
        <button
          onClick={() => setShowBalance(!showBalance)}
          className="size-11 shrink-0 inline-flex items-center justify-center rounded-2xl bg-white/[0.08] text-white hover:bg-white/15 transition-colors focus-visible:ring-2 focus-visible:ring-[#00F58A]"
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
          className="relative h-12 sm:h-14 w-56 sm:w-72 rounded-2xl bg-white/10 animate-pulse"
          aria-hidden="true"
        />
      ) : (
        <p className="relative display money whitespace-nowrap text-4xl font-bold tracking-tight leading-none sm:text-5xl lg:text-6xl">
          {!hasSummaryData ? (
            <span className="text-white/40">—</span>
          ) : showBalance ? (
            <BalanceAmount
              value={animatedBalance}
              negative={!isPositiveBalance}
            />
          ) : (
            <span className="text-white/60" aria-label="ยอดเงินถูกซ่อน">
              ฿ ••••••
            </span>
          )}
        </p>
      )}

      <div className="relative flex flex-wrap items-center justify-between gap-3">
        {isBalanceLoading ? (
          <span className="text-sm text-white/60">กำลังตรวจสอบยอดเงินล่าสุด…</span>
        ) : isPositiveBalance ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#00F58A]/15 px-3.5 py-1.5 text-xs sm:text-sm font-bold text-[#00F58A]">
            ขอบคุณพระเจ้าสำหรับทุกการถวาย ♥
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-tile-rose px-3.5 py-1.5 text-xs sm:text-sm font-bold text-tile-rose-ink">
            ยอดคงเหลือติดลบ — ควรตรวจสอบรายจ่าย
          </span>
        )}

        {canOpenReports && (
          <button
            onClick={onOpenReports}
            className="inline-flex min-h-10 items-center gap-1 rounded-full bg-white/[0.08] px-3.5 py-1.5 text-sm font-bold text-white hover:bg-white/15 transition-colors focus-visible:ring-2 focus-visible:ring-[#00F58A]"
          >
            ดูรายละเอียด
            <ChevronRight className="size-4" aria-hidden="true" />
          </button>
        )}
      </div>
    </section>
  );
}
