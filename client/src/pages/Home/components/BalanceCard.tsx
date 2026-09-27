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
      className={`animate-fade-up bg-surface rounded-2xl p-6 sm:p-8 md:p-10 border relative overflow-hidden w-full ${isPositiveBalance ? "border-success-border" : "border-error-border"}`}
    >
      <div className="flex items-center justify-between gap-6">
        {/* Left: Prominent financial figures */}
        <div className="min-w-0 flex-1 space-y-2 sm:space-y-3 z-10">
          <div className="flex flex-wrap items-center gap-2.5">
            <h2 className="text-lg sm:text-xl md:text-2xl font-semibold text-foreground">
              ยอดเงินคงเหลือรวม
            </h2>
            <button
              onClick={() => setShowBalance(!showBalance)}
              className="size-11 shrink-0 inline-flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors rounded-full focus-visible:ring-2 focus-visible:ring-[#0071e3]"
              aria-label={showBalance ? "ซ่อนยอดเงิน" : "แสดงยอดเงิน"}
              aria-pressed={!showBalance}
            >
              {showBalance ? (
                <Eye className="w-5 h-5 sm:w-6 sm:h-6" />
              ) : (
                <EyeOff className="w-5 h-5 sm:w-6 sm:h-6" />
              )}
            </button>

            {/* Data-source status — semantic badges only, never brand color */}
            {isBalanceLoading && (
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-info-bg text-info text-xs sm:text-sm font-semibold">
                <Loader2 className="w-4 h-4 animate-spin" />
                กำลังโหลดข้อมูล
              </span>
            )}
            {isDataUnavailable && (
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-warning-bg border border-warning-border text-warning text-xs sm:text-sm font-semibold">
                <Info className="w-4 h-4" />
                {summaryError
                  ? "เชื่อมต่อข้อมูลไม่สำเร็จ"
                  : "ยังไม่มีข้อมูลการเงิน"}
              </span>
            )}
          </div>

          {isBalanceLoading ? (
            <div
              className="h-12 sm:h-16 md:h-20 w-56 sm:w-80 rounded-md bg-accent animate-pulse"
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
              className={`whitespace-nowrap text-[clamp(1.75rem,5.5vw,4.5rem)] font-semibold tracking-tight tabular-nums ${isPositiveBalance ? "text-success" : "text-error"}`}
            >
              {showBalance && hasSummaryData ? fmtBaht(animatedBalance) : "—"}
            </div>
          )}

          <p className="text-sm sm:text-base md:text-lg text-foreground font-medium flex items-center gap-2 pt-1">
            {isBalanceLoading ? (
              <span>กำลังตรวจสอบยอดเงินล่าสุด…</span>
            ) : isPositiveBalance ? (
              <>
                <span>ขอบคุณพระเจ้าสำหรับทุกการถวาย</span>
                <span className="text-success text-lg">♥</span>
              </>
            ) : (
              <span className="text-error font-semibold">
                ยอดคงเหลือติดลบ — ควรตรวจสอบรายจ่าย
              </span>
            )}
          </p>

          {canOpenReports && (
            <div className="pt-3">
              <button
                onClick={onOpenReports}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-surface hover:bg-accent text-foreground text-sm sm:text-base font-medium border border-hairline transition-colors focus-visible:ring-2 focus-visible:ring-[#0071e3]"
              >
                <BarChart3 className="w-4 h-4 text-primary" />
                <span>ดูรายละเอียด</span>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
          )}
        </div>

        {/* Right: Balance illustration tucked cleanly in corner */}
        <div className="hidden sm:block shrink-0 z-10">
          <div className="w-24 h-24 sm:w-32 sm:h-32 md:w-36 md:h-36 rounded-2xl overflow-hidden border border-hairline bg-canvas p-1.5">
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
