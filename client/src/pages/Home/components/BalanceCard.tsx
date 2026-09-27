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

/**
 * The single focal card of the dashboard.
 *
 * It is the only surface on Home filled with the burnt-orange primary, so the
 * total balance is the first thing the eye lands on. The gradient stays in
 * the darker half of the orange range (#9F3B0F to #C94F16 to #D9581B) because
 * white text on the lighter #FC6C26 falls below 4.5:1.
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
  fmtBaht,
}: BalanceCardProps) {
  return (
    <section
      aria-label="ยอดเงินคงเหลือรวม"
      className="relative w-full overflow-hidden rounded-2xl bg-gradient-to-br from-[#9F3B0F] via-[#C94F16] to-[#D9581B] p-6 sm:p-8 md:p-10 text-white shadow-sm"
    >
      {/* Soft light shapes. Decorative only. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-16 -top-20 size-64 rounded-full bg-white/10"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-24 right-24 size-48 rounded-full bg-[#FC6C26]/30"
      />

      <div className="relative z-10 flex items-center justify-between gap-6">
        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base sm:text-lg font-semibold text-[#FFF4D6]">
              ยอดเงินคงเหลือรวม
            </h2>
            <button
              onClick={() => setShowBalance(!showBalance)}
              className="size-11 shrink-0 inline-flex items-center justify-center rounded-full text-[#FFF4D6] transition-all duration-200 ease-in-out hover:bg-white/15 hover:text-white active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
              aria-label={showBalance ? "ซ่อนยอดเงิน" : "แสดงยอดเงิน"}
              aria-pressed={!showBalance}
            >
              {showBalance ? (
                <Eye className="size-5" />
              ) : (
                <EyeOff className="size-5" />
              )}
            </button>

            {/* Data-source status */}
            {isBalanceLoading && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white">
                <Loader2 className="size-3.5 animate-spin" />
                กำลังโหลดข้อมูล
              </span>
            )}
            {isDataUnavailable && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-white/40 bg-white/10 px-3 py-1 text-xs font-semibold text-white">
                <Info className="size-3.5" />
                {summaryError
                  ? "เชื่อมต่อข้อมูลไม่สำเร็จ"
                  : "ยังไม่มีข้อมูลการเงิน"}
              </span>
            )}
          </div>

          {isBalanceLoading ? (
            <div
              className="h-12 sm:h-16 md:h-20 w-56 sm:w-80 rounded-2xl bg-white/20 animate-pulse"
              aria-hidden="true"
            />
          ) : (
            <div
              /* Fluid, and never wrapping. A wrapped figure splits mid-digit
                 ("4,182,671." over "50") and reads as two numbers, so the
                 size scales down with the viewport instead. */
              className="whitespace-nowrap text-[clamp(2rem,6vw,4.5rem)] font-bold leading-none tracking-tight tabular-nums text-white"
            >
              {showBalance && hasSummaryData ? fmtBaht(animatedBalance) : "—"}
            </div>
          )}

          <p className="flex items-center gap-2 pt-1 text-sm sm:text-base font-medium text-[#FFF4D6]">
            {isBalanceLoading ? (
              <span>กำลังตรวจสอบยอดเงินล่าสุด…</span>
            ) : isPositiveBalance ? (
              <>
                <span>ขอบคุณพระเจ้าสำหรับทุกการถวาย</span>
                <span aria-hidden="true">♥</span>
              </>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FEECEB] px-3 py-1 text-xs sm:text-sm font-semibold text-[#C8372D]">
                <Info className="size-3.5" aria-hidden="true" />
                ยอดคงเหลือติดลบ — ควรตรวจสอบรายจ่าย
              </span>
            )}
          </p>

          {canOpenReports && (
            <div className="pt-2">
              <button
                onClick={onOpenReports}
                className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/25 bg-white/10 px-4 text-sm font-semibold text-white transition-all duration-200 ease-in-out hover:bg-white/20 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
              >
                <BarChart3 className="size-4" />
                <span>ดูรายละเอียด</span>
                <ChevronRight className="size-4" />
              </button>
            </div>
          )}
        </div>

        {/* Illustration in a light frame */}
        <div className="hidden sm:block shrink-0">
          <div className="size-28 md:size-36 rounded-2xl overflow-hidden border border-white/25 bg-white/15 p-1.5">
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
