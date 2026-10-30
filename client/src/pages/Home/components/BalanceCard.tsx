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
    <span className={negative ? "text-danger" : "text-ink"}>
      {negative && "−"}
      <span className="mr-2 text-2xl font-semibold text-brand sm:text-3xl">
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
}: BalanceCardProps) {
  return (
    <section
      aria-label="ยอดเงินคงเหลือรวม"
      style={{ animationDelay: "90ms" }}
      className="animate-fade-up relative overflow-hidden h-full rounded-3xl bg-surface p-6 sm:p-8 fintech-card flex flex-col justify-between gap-8 w-full"
    >
      {/* Subtle Pastel FinTech Glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-20 -right-20 size-52 rounded-full bg-tile-sky/50 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-16 left-10 size-44 rounded-full bg-tile-mint/40 blur-3xl"
      />

      <div className="relative flex items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full bg-paper px-3 py-1 border border-line/60">
            <span className="size-2 rounded-full bg-brand" aria-hidden="true" />
            <h2 className="text-xs sm:text-sm font-bold text-ink-2">
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
          className="size-11 shrink-0 inline-flex items-center justify-center rounded-2xl bg-tile-lilac/60 text-brand-ink hover:bg-tile-lilac transition-colors focus-visible:ring-2 focus-visible:ring-brand"
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
          className="relative h-12 sm:h-14 w-56 sm:w-72 rounded-2xl bg-paper animate-pulse"
          aria-hidden="true"
        />
      ) : (
        <p className="relative display money whitespace-nowrap text-4xl font-bold tracking-tight leading-none sm:text-5xl lg:text-6xl">
          {!hasSummaryData ? (
            <span className="text-ink-3">—</span>
          ) : showBalance ? (
            <BalanceAmount
              value={animatedBalance}
              negative={!isPositiveBalance}
            />
          ) : (
            <span className="text-ink-2" aria-label="ยอดเงินถูกซ่อน">
              ฿ ••••••
            </span>
          )}
        </p>
      )}

      <div className="relative flex flex-wrap items-center justify-between gap-3">
        {isBalanceLoading ? (
          <span className="text-sm text-ink-2">กำลังตรวจสอบยอดเงินล่าสุด…</span>
        ) : isPositiveBalance ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-tile-mint px-3.5 py-1.5 text-xs sm:text-sm font-bold text-tile-mint-ink">
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
            className="inline-flex min-h-10 items-center gap-1 rounded-full bg-tile-lilac/60 px-3.5 py-1.5 text-sm font-bold text-brand-ink hover:bg-tile-lilac transition-colors focus-visible:ring-2 focus-visible:ring-brand"
          >
            ดูรายละเอียด
            <ChevronRight className="size-4" aria-hidden="true" />
          </button>
        )}
      </div>
    </section>
  );
}
