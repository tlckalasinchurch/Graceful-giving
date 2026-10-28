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
      <span className="mr-1.5 text-2xl font-medium text-ink-2">฿</span>
      {formatted.slice(0, dot)}
      <span className="text-xl text-ink-3">{formatted.slice(dot)}</span>
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
      className="animate-fade-up h-full rounded-3xl bg-surface p-6 sm:p-8 fintech-card flex flex-col justify-between gap-6 w-full"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <h2 className="text-sm font-medium text-ink-2">ยอดเงินคงเหลือรวม</h2>
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
          className="size-11 shrink-0 inline-flex items-center justify-center rounded-full bg-ground text-ink-2 hover:text-ink focus-visible:ring-2 focus-visible:ring-brand"
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
          className="h-10 sm:h-11 w-56 sm:w-72 rounded-2xl bg-ground animate-pulse"
          aria-hidden="true"
        />
      ) : (
        <p className="money whitespace-nowrap text-3xl sm:text-4xl font-semibold leading-none">
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

      <div className="flex flex-wrap items-center justify-between gap-3">
        {isBalanceLoading ? (
          <span className="text-sm text-ink-2">กำลังตรวจสอบยอดเงินล่าสุด…</span>
        ) : isPositiveBalance ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-tile-mint px-3 py-1 text-xs sm:text-sm font-semibold text-tile-mint-ink">
            ขอบคุณพระเจ้าสำหรับทุกการถวาย ♥
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-tile-rose px-3 py-1 text-xs sm:text-sm font-semibold text-tile-rose-ink">
            ยอดคงเหลือติดลบ — ควรตรวจสอบรายจ่าย
          </span>
        )}

        {canOpenReports && (
          <button
            onClick={onOpenReports}
            className="inline-flex min-h-11 items-center gap-1 rounded-2xl px-2 text-sm font-semibold text-brand-ink hover:bg-ground focus-visible:ring-2 focus-visible:ring-brand"
          >
            ดูรายละเอียด
            <ChevronRight className="size-4" aria-hidden="true" />
          </button>
        )}
      </div>
    </section>
  );
}
