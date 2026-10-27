import {
  BarChart3,
  ChevronRight,
  Eye,
  EyeOff,
  Info,
  Loader2,
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
  animatedBalance: number;
  canOpenReports: boolean;
  onOpenReports: () => void;
  fmtBaht: (n: number) => string;
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
  fmtBaht,
}: BalanceCardProps) {
  return (
    <section
      aria-label="ยอดเงินคงเหลือรวม"
      style={{ animationDelay: "90ms" }}
      className={`animate-fade-up relative rounded-3xl p-6 sm:p-8 md:p-10 border overflow-hidden w-full fintech-card transition-all duration-300 ${
        isPositiveBalance
          ? "bg-gradient-to-br from-white via-[#FCFDF9] to-[#F3F9F1] border-[#C2E4B7]"
          : "bg-gradient-to-br from-white via-[#FDFDFC] to-[#FDF4F2] border-[#F8C8C5]"
      }`}
    >
      {/* Ambient background glows for card depth */}
      <div
        className={`pointer-events-none absolute -right-20 -bottom-20 size-80 rounded-full blur-3xl opacity-20 ${
          isPositiveBalance ? "bg-[#2D6A2E]" : "bg-[#C8372D]"
        }`}
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute right-1/4 -top-16 size-48 rounded-full bg-[#FC6C26]/10 blur-3xl"
        aria-hidden="true"
      />

      <div className="flex items-center justify-between gap-6 relative z-10">
        {/* Left: Prominent financial figures */}
        <div className="min-w-0 flex-1 space-y-2 sm:space-y-3">
          <div className="flex flex-wrap items-center gap-2.5">
            <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-[#171311]">
              ยอดเงินคงเหลือรวม
            </h2>
            <button
              onClick={() => setShowBalance(!showBalance)}
              className="size-10 shrink-0 inline-flex items-center justify-center text-[#51443A] hover:text-[#171311] bg-white/80 hover:bg-[#FFF4D6] border border-[#E7DCC8]/70 shadow-2xs transition-all duration-150 rounded-full active:scale-90 focus-visible:ring-2 focus-visible:ring-[#C94F16]"
              aria-label={showBalance ? "ซ่อนยอดเงิน" : "แสดงยอดเงิน"}
              aria-pressed={!showBalance}
            >
              {showBalance ? (
                <Eye className="w-5 h-5" />
              ) : (
                <EyeOff className="w-5 h-5" />
              )}
            </button>

            {/* Data-source status */}
            {isBalanceLoading && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F0EAF8] text-[#7D3C98] text-xs sm:text-sm font-bold shadow-2xs">
                <Loader2 className="w-4 h-4 animate-spin" />
                กำลังโหลดข้อมูล
              </span>
            )}
            {isDataUnavailable && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FFF8EA] border border-dashed border-[#F9D2AE] text-[#7F3A0D] text-xs sm:text-sm font-bold shadow-2xs">
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
              className={`whitespace-nowrap text-[clamp(1.75rem,5.5vw,4.5rem)] font-bold tracking-tight tabular-nums ${isPositiveBalance ? "text-[#155724]" : "text-[#9E2D12]"}`}
            >
              {showBalance && hasSummaryData ? fmtBaht(animatedBalance) : "—"}
            </div>
          )}

          <div className="pt-0.5">
            {isBalanceLoading ? (
              <span className="text-sm sm:text-base text-[#51443A] font-medium">
                กำลังตรวจสอบยอดเงินล่าสุด…
              </span>
            ) : isPositiveBalance ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EBF7EC] border border-[#C5E8BF] text-xs sm:text-sm font-bold text-[#1F5C33]">
                <span>ขอบคุณพระเจ้าสำหรับทุกการถวาย</span>
                <span className="text-[#1F5C33] text-base leading-none">♥</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FDF0ED] border border-[#F8C8C5] text-xs sm:text-sm font-bold text-[#9E2D12]">
                <span>ยอดคงเหลือติดลบ — ควรตรวจสอบรายจ่าย</span>
              </span>
            )}
          </div>

          {canOpenReports && (
            <div className="pt-2">
              <button
                onClick={onOpenReports}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-white/95 hover:bg-[#FFF8EA] text-[#171311] text-sm sm:text-base font-bold border border-[#E7DCC8] transition-all hover:border-[#C94F16] shadow-2xs hover:shadow-xs active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-[#C94F16]"
              >
                <BarChart3 className="w-4 h-4 text-[#C94F16]" />
                <span>ดูรายละเอียด</span>
                <ChevronRight className="w-4 h-4 text-[#51443A]" />
              </button>
            </div>
          )}
        </div>

        {/* Right: Balance illustration tucked cleanly in corner */}
        <div className="hidden sm:block shrink-0">
          <div className="w-24 h-24 sm:w-32 sm:h-32 md:w-36 md:h-36 rounded-2xl overflow-hidden border border-[#E7DCC8] bg-white/90 p-1.5 shadow-sm">
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
