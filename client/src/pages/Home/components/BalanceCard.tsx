import {
  BarChart3,
  ChevronRight,
  Eye,
  EyeOff,
  Info,
  Loader2,
  RotateCw,
} from "lucide-react";
import { Illustration } from "@/components/Illustration";

interface BalanceCardProps {
  showBalance: boolean;
  setShowBalance: (show: boolean) => void;
  isPositiveBalance: boolean;
  isBalanceLoading: boolean;
  isDataUnavailable: boolean;
  summaryError: unknown;
  hasSummaryData: boolean;
  balance: number;
  canOpenReports: boolean;
  onOpenReports: () => void;
  fmtBaht: (n: number) => string;
  onRetry: () => void;
}

export function BalanceCard({
  showBalance,
  setShowBalance,
  isPositiveBalance,
  isBalanceLoading,
  isDataUnavailable,
  summaryError,
  hasSummaryData,
  balance,
  canOpenReports,
  onOpenReports,
  fmtBaht,
  onRetry,
}: BalanceCardProps) {
  // Without a figure there is no sign to colour, so a failed or empty load
  // must not borrow the "positive" styling that a zero default would give it.
  const tone = !hasSummaryData
    ? "neutral"
    : isPositiveBalance
      ? "positive"
      : "negative";
  return (
    <section
      aria-label="ยอดเงินคงเหลือรวม"
      className={`bg-white rounded-2xl p-6 sm:p-8 md:p-10 border relative overflow-hidden w-full ${tone === "positive" ? "border-[#A8D59D] card-elevation-focus" : tone === "negative" ? "border-[#F2C9BE] card-elevation-sm" : "border-[#E7DCC8] card-elevation-sm"}`}
    >
      <div className="flex items-center justify-between gap-6">
        {/* Left: Prominent financial figures */}
        <div className="min-w-0 flex-1 space-y-2 sm:space-y-3 z-10">
          <div className="flex flex-wrap items-center gap-2.5">
            <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-[#171311]">
              ยอดเงินคงเหลือรวม
            </h2>
            <button
              onClick={() => setShowBalance(!showBalance)}
              className="size-11 shrink-0 inline-flex items-center justify-center text-[#3F3833] hover:text-[#171311] transition-colors rounded-full focus-visible:ring-2 focus-visible:ring-[#C94F16]"
              aria-label={showBalance ? "ซ่อนยอดเงิน" : "แสดงยอดเงิน"}
              aria-pressed={!showBalance}
            >
              {showBalance ? (
                <Eye className="w-5 h-5 sm:w-6 sm:h-6" />
              ) : (
                <EyeOff className="w-5 h-5 sm:w-6 sm:h-6" />
              )}
            </button>

            {/* Data-source status */}
            {isBalanceLoading && (
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-[#FFF8EA] text-[#51443A] text-xs sm:text-sm font-bold">
                <Loader2 className="w-4 h-4 animate-spin" />
                กำลังโหลดข้อมูล
              </span>
            )}
            {isDataUnavailable && (
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-[#FFF8EA] border border-dashed border-[#F9D2AE] text-[#7F3A0D] text-xs sm:text-sm font-bold">
                <Info className="w-4 h-4" />
                {summaryError
                  ? "เชื่อมต่อข้อมูลไม่สำเร็จ"
                  : "ยังไม่มีข้อมูลการเงิน"}
              </span>
            )}
          </div>

          {isBalanceLoading ? (
            <div
              className="h-12 sm:h-16 md:h-20 w-56 sm:w-80 rounded-2xl bg-[#EDE8E3] animate-pulse"
              aria-hidden="true"
            />
          ) : (
            <div
              /* Fluid, and never wrapping. The old fixed steps reached 96px,
                 which a seven-figure balance cannot fit beside the card's
                 illustration, and `break-words` then split the figure across
                 two lines mid-digit — "4,182,671." over "50" reads as two
                 different numbers. Scaling down is the only safe way for an
                 amount to lose an argument with its container. */
              className={`whitespace-nowrap text-[clamp(1.75rem,5.5vw,4.5rem)] font-bold tracking-tight tabular-nums ${tone === "positive" ? "text-[#155724]" : tone === "negative" ? "text-[#9E2D12]" : "text-[#807266]"}`}
            >
              {showBalance && hasSummaryData ? fmtBaht(balance) : "—"}
            </div>
          )}

          <p className="text-sm sm:text-base text-[#51443A] flex items-center gap-2 pt-1">
            {isBalanceLoading ? (
              <span>กำลังตรวจสอบยอดเงินล่าสุด…</span>
            ) : isDataUnavailable ? (
              <span>
                {summaryError
                  ? "ยังแสดงยอดเงินไม่ได้ ลองโหลดข้อมูลอีกครั้ง"
                  : "ยอดเงินจะแสดงเมื่อมีการบันทึกรายการแรก"}
              </span>
            ) : isPositiveBalance ? (
              <>
                <span>ขอบคุณพระเจ้าสำหรับทุกการถวาย</span>
                <span className="text-[#1F5C33]" aria-hidden="true">
                  ♥
                </span>
              </>
            ) : (
              <span className="text-[#9E2D12] font-bold">
                ยอดคงเหลือติดลบ — ควรตรวจสอบรายจ่าย
              </span>
            )}
          </p>

          {(Boolean(summaryError) || canOpenReports) && (
            <div className="pt-3 flex flex-wrap gap-3">
              {Boolean(summaryError) && (
                <button
                  onClick={onRetry}
                  className="inline-flex items-center gap-2 min-h-11 px-4 py-2 rounded-xl bg-[#C94F16] hover:bg-[#9F3B0F] text-white text-sm sm:text-base font-bold transition-colors focus-visible:ring-2 focus-visible:ring-[#C94F16] focus-visible:ring-offset-2"
                >
                  <RotateCw className="w-4 h-4" aria-hidden="true" />
                  <span>โหลดข้อมูลอีกครั้ง</span>
                </button>
              )}
              {canOpenReports && (
                <button
                  onClick={onOpenReports}
                  className="inline-flex items-center gap-2 min-h-11 px-4 py-2 rounded-xl bg-white hover:bg-[#FFF8EA] text-[#171311] text-sm sm:text-base font-bold border border-[#E7DCC8] transition-colors focus-visible:ring-2 focus-visible:ring-[#C94F16] hover:border-[#C94F16]"
                >
                  <BarChart3 className="w-4 h-4 text-[#C94F16]" />
                  <span>ดูรายละเอียด</span>
                  <ChevronRight className="w-4 h-4 text-[#3F3833]" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Right: Balance illustration tucked cleanly in corner */}
        <div className="hidden sm:block shrink-0 z-10">
          <div className="w-24 h-24 sm:w-32 sm:h-32 md:w-36 md:h-36 rounded-2xl overflow-hidden border border-[#E7DCC8] bg-[#FFF8EA] p-1.5">
            <Illustration
              src="/illustrations/balance_wallet.jpg"
              alt="กระเป๋าสตางค์ยอดคงเหลือ"
              className="w-full h-full object-cover rounded-xl"
              width={176}
              height={176}
              aria-hidden="true"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
