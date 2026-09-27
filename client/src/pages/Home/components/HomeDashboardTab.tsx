import {
  BarChart3,
  Bell,
  CalendarDays,
  ChevronRight,
  Eye,
  EyeOff,
  FileBarChart,
  HandCoins,
  Heart,
  Info,
  Loader2,
  MoreHorizontal,
  ReceiptText,
  Sprout,
  UsersRound,
} from "lucide-react";
import { Illustration } from "@/components/Illustration";
import { AppMenu } from "@/components/layout/AppNavigation";
import type { TransactionItem } from "../types";
import {
  fmtBaht,
  fmtShortBaht,
  fmtThaiDate,
  trendArrow,
  trendValue,
} from "../utils";

type HomeTab = "home" | "ledger" | "reports" | "profile";

interface HomeDashboardTabProps {
  showBalance: boolean;
  onToggleBalance: () => void;
  isBalanceLoading: boolean;
  isDataUnavailable: boolean;
  summaryError: boolean;
  animatedBalance: number;
  isPositiveBalance: boolean;
  isPositiveNet: boolean;
  summaryData: { totalBalance: number } | null | undefined;
  netMonthly: number | undefined;
  monthlyIncome: number | undefined;
  monthlyExpense: number | undefined;
  incomeTrend: string;
  expenseTrend: string;
  allTransactions: TransactionItem[];
  onTabChange: (tab: HomeTab) => void;
  onOpenOffering: () => void;
  onOpenExpense: () => void;
  onOpenNews: () => void;
}

export function HomeDashboardTab({
  showBalance,
  onToggleBalance,
  isBalanceLoading,
  isDataUnavailable,
  summaryError,
  animatedBalance,
  isPositiveBalance,
  isPositiveNet,
  summaryData,
  netMonthly,
  monthlyIncome,
  monthlyExpense,
  incomeTrend,
  expenseTrend,
  allTransactions,
  onTabChange,
  onOpenOffering,
  onOpenExpense,
  onOpenNews,
}: HomeDashboardTabProps) {
  return (
    <div
      role="tabpanel"
      aria-label="แดชบอร์ดการเงิน"
      className="space-y-5 md:space-y-7"
    >
      {/* ─── 1. HERO SECTION ─────────────────────────────────────────── */}
      <section
        aria-label="Grace-giving ส่วนต้อนรับ"
        className="animate-fade-up relative rounded-2xl md:rounded-[32px] overflow-hidden bg-gradient-to-b md:bg-gradient-to-br from-[#FFFDF8] via-[#FFF8EC] to-[#FFF3DE] border border-hairline p-3.5 sm:p-5 md:p-7"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-10 -right-10 w-40 h-40 md:w-56 md:h-56 rounded-full bg-success/15 blur-3xl"
        />
        <div className="absolute top-3 right-3 md:top-4 md:right-4 z-20">
          <button
            onClick={onOpenNews}
            className="w-8 h-8 sm:w-10 sm:h-10 md:w-11 md:h-11 rounded-full bg-white/95 border border-hairline flex items-center justify-center text-secondary-foreground hover:bg-white transition-all relative focus-visible:ring-2 focus-visible:ring-[#E99A4A]"
            aria-label="การแจ้งเตือนและข่าวสารคริสตจักร"
          >
            <Bell className="w-4 h-4 sm:w-5 sm:h-5 text-secondary-foreground" />
            <span className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2 w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-[#E06250] ring-2 ring-white" />
          </button>
        </div>
        <div className="grid grid-cols-[minmax(0,1fr)_auto] md:grid-cols-12 gap-3 sm:gap-5 items-center relative z-10">
          <div className="min-w-0 md:col-span-7 space-y-1.5 sm:space-y-3.5">
            <h1 className="flex flex-col">
              <span className="flex items-center gap-1 sm:gap-1.5">
                <span className="text-2xl sm:text-5xl md:text-6xl font-bold text-foreground tracking-tight leading-none font-display">
                  Grace
                </span>
                <span className="text-success -mt-1.5 sm:-mt-4">
                  <Sprout className="w-5 h-5 sm:w-10 sm:h-10 stroke-[2.5]" />
                </span>
              </span>
              <span className="text-2xl sm:text-5xl md:text-6xl font-bold text-primary tracking-tight leading-none font-display">
                Ledger
              </span>
            </h1>
            <p className="hidden sm:block text-sm md:text-base font-bold text-foreground/90">
              การเงินเชื่อมใจ เพื่อพันธกิจของพระเจ้า
            </p>
            <div className="inline-flex flex-nowrap items-center gap-1.5 px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-full sm:rounded-2xl bg-white/95 border border-hairline text-[11px] sm:text-xs leading-relaxed text-secondary-foreground max-w-full">
              <span className="whitespace-nowrap font-bold text-primary shrink-0">
                2 โครินธ์ 9:7
              </span>
              <span className="text-secondary-foreground font-medium truncate">
                "ผู้ให้ด้วยใจยินดี พระเจ้าทรงรัก"
              </span>
            </div>
          </div>
          <div className="min-w-0 flex items-center justify-center md:col-span-5 md:flex-col md:justify-center md:gap-3 md:pt-10">
            <div className="hidden md:block w-full max-w-56 bg-white/95 backdrop-blur-xs p-3.5 rounded-2xl border border-hairline text-xs space-y-1.5">
              <p className="text-secondary-foreground font-medium leading-relaxed">
                ทุกสิ่งที่ท่านให้เพื่อการงานของพระเจ้า ย่อมเกิดผลเสมอ
              </p>
              <div className="flex items-center justify-between pt-1 border-t border-hairline/50">
                <span className="text-[10px] text-muted-foreground font-bold">
                  1 โครินธ์ 15:58
                </span>
                <span className="text-success">🌱</span>
              </div>
            </div>
            <div className="relative w-24 h-28 sm:w-40 sm:h-52 md:w-full md:max-w-64 md:h-72 rounded-2xl sm:rounded-2xl overflow-hidden border-2 border-white shrink-0 bg-surface-subtle">
              <Illustration
                src="/illustrations/hero_jesus_shepherd.jpg"
                alt="พระเยซูคริสต์และลูกแกะ"
                className="w-full h-full object-cover object-[center_20%] hover:scale-104 transition-transform duration-500"
                priority
                width={224}
                height={256}
              />
            </div>
          </div>
        </div>
      </section>

      {/* ─── 2. BALANCE CARD ─────────────────────────────────────────── */}
      <section
        aria-label="ยอดเงินคงเหลือรวม"
        style={{ animationDelay: "90ms" }}
        className={`animate-fade-up bg-gradient-to-br from-white via-white to-[#F7FBF4] rounded-[30px] p-5 md:p-7 border relative overflow-hidden ${isPositiveBalance ? "border-success-border/90" : "border-error-border"} ${isPositiveBalance ? "clay-balance-glow" : "clay-card-shadow"}`}
      >
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0 flex-1 space-y-1.5 z-10">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-sm md:text-base font-bold text-foreground">
                ยอดเงินคงเหลือรวม
              </h2>
              <button
                onClick={onToggleBalance}
                className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-full focus-visible:ring-2 focus-visible:ring-[#E99A4A]"
                aria-label={showBalance ? "ซ่อนยอดเงิน" : "แสดงยอดเงิน"}
                aria-pressed={!showBalance}
              >
                {showBalance ? (
                  <Eye className="w-4 h-4" />
                ) : (
                  <EyeOff className="w-4 h-4" />
                )}
              </button>
              {isBalanceLoading && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-info-bg text-info text-[10px] font-bold">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  กำลังโหลดข้อมูล
                </span>
              )}
              {isDataUnavailable && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#FFF3DF] border border-dashed border-[#E9C179] text-[#946A1E] text-[10px] font-bold">
                  <Info className="w-3 h-3" />
                  {summaryError
                    ? "เชื่อมต่อข้อมูลไม่สำเร็จ"
                    : "ยังไม่มีข้อมูลการเงิน"}
                </span>
              )}
            </div>
            {isBalanceLoading ? (
              <div
                className="h-9 sm:h-11 md:h-12 w-44 sm:w-56 rounded-xl bg-[#EDE6D8] animate-pulse"
                aria-hidden="true"
              />
            ) : (
              <div
                className={`break-words text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight tabular-nums ${isPositiveBalance ? "text-success" : "text-[#B3261E]"}`}
              >
                {showBalance && summaryData ? fmtBaht(animatedBalance) : "—"}
              </div>
            )}
            <p className="text-xs text-[#5E4C3E] font-medium flex items-center gap-1 pt-0.5">
              {isBalanceLoading ? (
                <span>กำลังตรวจสอบยอดเงินล่าสุด…</span>
              ) : isPositiveBalance ? (
                <>
                  <span>ขอบคุณพระเจ้าสำหรับทุกการถวาย</span>
                  <span className="text-success">♥</span>
                </>
              ) : (
                <span className="text-[#B3261E] font-semibold">
                  ยอดคงเหลือติดลบ — ควรตรวจสอบรายจ่าย
                </span>
              )}
            </p>
            <div className="pt-2">
              <button
                onClick={() => onTabChange("reports")}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-surface-subtle hover:bg-primary/10 text-secondary-foreground text-xs font-bold border border-hairline transition-all focus-visible:ring-2 focus-visible:ring-[#E99A4A]"
              >
                <BarChart3 className="w-3.5 h-3.5 text-primary" />
                <span>ดูรายละเอียด</span>
                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            </div>
          </div>
          <div className="hidden sm:block shrink-0 z-10">
            <div className="w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 rounded-2xl overflow-hidden border border-hairline/80 bg-warning-bg p-1">
              <Illustration
                src="/illustrations/balance_wallet.jpg"
                alt="กระเป๋าสตางค์ยอดคงเหลือ"
                className="w-full h-full object-cover rounded-2xl"
                width={112}
                height={112}
                aria-hidden="true"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ─── 3. FINANCIAL SUMMARY CARDS ── */}
      <section
        aria-label="สรุปตัวเลขการเงินรายเดือน"
        style={{ animationDelay: "160ms" }}
        className="animate-fade-up grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4"
      >
        <div className="min-w-0 bg-success-bg border border-[#D2EAC7] rounded-2xl p-4 md:p-5 flex sm:flex-col items-center sm:items-start gap-3.5">
          <div className="w-[76px] h-[76px] md:w-[84px] md:h-[84px] rounded-[22px] overflow-hidden shrink-0 bg-white/95 p-1 border border-[#D2EAC7]">
            <Illustration
              src="/illustrations/income_hand_heart.jpg"
              alt="รายรับ"
              className="w-full h-full object-cover rounded-[18px]"
              width={84}
              height={84}
              aria-hidden="true"
            />
          </div>
          <div className="min-w-0 max-w-full flex-1">
            <span className="text-sm font-bold text-secondary-foreground">รายรับ</span>
            {isBalanceLoading ? (
              <div className="h-7 md:h-8 w-24 my-0.5 rounded-lg bg-white/70 animate-pulse" />
            ) : (
              <div className="text-2xl md:text-3xl font-bold text-foreground break-words tabular-nums">
                {showBalance && monthlyIncome !== undefined
                  ? fmtShortBaht(monthlyIncome)
                  : "—"}
              </div>
            )}
            <span className="text-xs font-bold text-success flex flex-wrap items-center gap-x-1 gap-y-0.5">
              <span>
                {trendArrow(incomeTrend)} {trendValue(incomeTrend)}
              </span>
              <span className="text-[11px] text-[#6B5A4C] font-medium">
                จากเดือนที่แล้ว
              </span>
            </span>
          </div>
        </div>
        <div className="min-w-0 bg-[#FDEDE3] border border-[#F6D3B8] rounded-2xl p-4 md:p-5 flex sm:flex-col items-center sm:items-start gap-3.5">
          <div className="w-[76px] h-[76px] md:w-[84px] md:h-[84px] rounded-[22px] overflow-hidden shrink-0 bg-white/95 p-1 border border-[#F6D3B8]">
            <Illustration
              src="/illustrations/expense_hand_coin.jpg"
              alt="รายจ่าย"
              className="w-full h-full object-cover rounded-[18px]"
              width={84}
              height={84}
              aria-hidden="true"
            />
          </div>
          <div className="min-w-0 max-w-full flex-1">
            <span className="text-sm font-bold text-secondary-foreground">รายจ่าย</span>
            {isBalanceLoading ? (
              <div className="h-7 md:h-8 w-24 my-0.5 rounded-lg bg-white/70 animate-pulse" />
            ) : (
              <div className="text-2xl md:text-3xl font-bold text-foreground break-words tabular-nums">
                {showBalance && monthlyExpense !== undefined
                  ? fmtShortBaht(monthlyExpense)
                  : "—"}
              </div>
            )}
            <span className="text-xs font-bold text-[#B3541E] flex flex-wrap items-center gap-x-1 gap-y-0.5">
              <span>
                {trendArrow(expenseTrend)} {trendValue(expenseTrend)}
              </span>
              <span className="text-[11px] text-[#6B5A4C] font-medium">
                จากเดือนที่แล้ว
              </span>
            </span>
          </div>
        </div>
        <div
          className={`min-w-0 rounded-2xl p-4 md:p-5 flex sm:flex-col items-center sm:items-start gap-3.5 border ${isPositiveNet ? "bg-warning-bg border-warning-border" : "bg-[#FDEBE8] border-error-border"}`}
        >
          <div
            className={`w-[76px] h-[76px] md:w-[84px] md:h-[84px] rounded-[22px] overflow-hidden shrink-0 bg-white/95 p-1 border ${isPositiveNet ? "border-warning-border" : "border-error-border"}`}
          >
            <Illustration
              src="/illustrations/balance_wallet.jpg"
              alt="คงเหลือ"
              className="w-full h-full object-cover rounded-[18px]"
              width={84}
              height={84}
              aria-hidden="true"
            />
          </div>
          <div className="min-w-0 max-w-full flex-1">
            <span className="text-sm font-bold text-secondary-foreground">คงเหลือ</span>
            {isBalanceLoading ? (
              <div className="h-7 md:h-8 w-24 my-0.5 rounded-lg bg-white/70 animate-pulse" />
            ) : (
              <div className="text-2xl md:text-3xl font-bold text-foreground break-words tabular-nums">
                {showBalance && netMonthly !== undefined
                  ? fmtShortBaht(netMonthly)
                  : "—"}
              </div>
            )}
            <span
              className={`text-xs font-bold flex flex-wrap items-center gap-x-1 gap-y-0.5 ${isPositiveNet ? "text-success" : "text-[#B3261E]"}`}
            >
              <span>
                {isPositiveNet
                  ? "รายรับมากกว่ารายจ่าย"
                  : "รายจ่ายมากกว่ารายรับ"}
              </span>
            </span>
          </div>
        </div>
      </section>

      {/* ─── 4a. PRIMARY ACTIONS ── */}
      <section
        aria-label="การดำเนินการหลัก"
        style={{ animationDelay: "230ms" }}
        className="animate-fade-up grid grid-cols-2 gap-3 md:gap-4"
      >
        <button
          onClick={onOpenOffering}
          className="flex items-center justify-center gap-2 py-3.5 sm:py-4 rounded-2xl bg-[#4F8B33] hover:bg-[#436F2B] text-white font-bold text-sm sm:text-base clay-button-shadow transition-all focus-visible:ring-2 focus-visible:ring-[#4F8B33] focus-visible:ring-offset-2"
          aria-label="บันทึกการถวาย"
        >
          <HandCoins className="w-5 h-5 stroke-[2.2]" />
          <span>บันทึกการถวาย</span>
        </button>
        <button
          onClick={onOpenExpense}
          className="flex items-center justify-center gap-2 py-3.5 sm:py-4 rounded-2xl bg-[#C26B1E] hover:bg-[#A85B18] text-white font-bold text-sm sm:text-base clay-button-shadow transition-all focus-visible:ring-2 focus-visible:ring-[#C26B1E] focus-visible:ring-offset-2"
          aria-label="บันทึกรายจ่าย"
        >
          <ReceiptText className="w-5 h-5 stroke-[2.2]" />
          <span>บันทึกรายจ่าย</span>
        </button>
      </section>

      {/* ─── 4b. SECONDARY MENU ── */}
      <section
        aria-label="เมนูลัดอื่น ๆ"
        className="grid grid-cols-4 gap-2 md:gap-3"
      >
        <button
          onClick={() => onTabChange("reports")}
          className="flex flex-col items-center justify-center py-3 rounded-2xl bg-[#FAF6EE] border border-[#EDE2CE] hover:border-[#C39BD3] transition-colors focus-visible:ring-2 focus-visible:ring-[#C39BD3]"
          aria-label="รายงาน"
        >
          <FileBarChart className="w-5 h-5 stroke-[2] text-info/80 mb-1" />
          <span className="text-[11px] font-semibold text-secondary-foreground/85 tracking-tight text-center">
            รายงาน
          </span>
        </button>
        <button
          onClick={() => {}}
          className="flex flex-col items-center justify-center py-3 rounded-2xl bg-[#FAF6EE] border border-[#EDE2CE] hover:border-primary transition-colors focus-visible:ring-2 focus-visible:ring-[#E99A4A]"
          aria-label="สมาชิก"
        >
          <UsersRound className="w-5 h-5 stroke-[2] text-[#C26B1E]/80 mb-1" />
          <span className="text-[11px] font-semibold text-secondary-foreground/85 tracking-tight text-center">
            สมาชิก
          </span>
        </button>
        <button
          onClick={onOpenNews}
          className="flex flex-col items-center justify-center py-3 rounded-2xl bg-[#FAF6EE] border border-[#EDE2CE] hover:border-[#F7B6A6] transition-colors focus-visible:ring-2 focus-visible:ring-[#F7B6A6]"
          aria-label="กิจกรรม"
        >
          <CalendarDays className="w-5 h-5 stroke-[2] text-[#D45945]/80 mb-1" />
          <span className="text-[11px] font-semibold text-secondary-foreground/85 tracking-tight text-center">
            กิจกรรม
          </span>
        </button>
        <AppMenu>
          <button
            type="button"
            className="flex flex-col items-center justify-center py-3 w-full rounded-2xl bg-[#FAF6EE] border border-[#EDE2CE] hover:border-[#A9D4ED] transition-colors focus-visible:ring-2 focus-visible:ring-[#A9D4ED]"
            aria-label="เพิ่มเติม"
          >
            <MoreHorizontal className="w-5 h-5 stroke-[2] text-[#5B7B94]/80 mb-1" />
            <span className="text-[11px] font-semibold text-secondary-foreground/85 tracking-tight text-center">
              เพิ่มเติม
            </span>
          </button>
        </AppMenu>
      </section>

      {/* ─── 5. CHURCH NEWS CARD ── */}
      <section aria-label="ข่าวสารจากคริสตจักร">
        <div
          role="button"
          tabIndex={0}
          onClick={onOpenNews}
          onKeyDown={e => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onOpenNews();
            }
          }}
          className="cursor-pointer bg-gradient-to-r from-[#FFFDF8] via-[#FFF8EC] to-[#FFF1DE] border border-hairline rounded-2xl p-4 md:p-5 flex items-center justify-between gap-4 hover:border-primary transition-all"
          aria-label="เปิดดูข่าวสารจากคริสตจักร"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl overflow-hidden shrink-0 bg-white p-1 border border-hairline">
              <Illustration
                src="/illustrations/bible_cross.jpg"
                alt="พระคัมภีร์และกางเขน"
                className="w-full h-full object-cover rounded-xl"
                width={80}
                height={80}
                aria-hidden="true"
              />
            </div>
            <div>
              <h2 className="text-base md:text-lg font-bold text-foreground">
                ข่าวสารจากคริสตจักร
              </h2>
              <p className="text-xs text-muted-foreground">
                ติดตามประกาศ กิจกรรม และพันธกิจต่าง ๆ
              </p>
            </div>
          </div>
          <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-muted-foreground border border-hairline/80 shrink-0">
            <ChevronRight className="w-4 h-4" />
          </div>
        </div>
      </section>

      {/* ─── 6. BUDGET SECTION ── */}
      <section
        aria-label="แผนการใช้จ่ายงบประมาณ"
        className="bg-white rounded-2xl p-5 md:p-6 border border-hairline/80 space-y-4"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-base md:text-lg font-bold text-foreground">
            แผนการใช้จ่าย
          </h2>
          <button
            onClick={() => onTabChange("reports")}
            className="text-xs md:text-sm font-bold text-primary hover:underline flex items-center gap-0.5 focus-visible:ring-2 focus-visible:ring-[#E99A4A]"
          >
            <span>ดูรายงาน</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        <p className="py-5 text-sm text-muted-foreground">
          ยังไม่มีข้อมูลแผนการใช้จ่ายจากระบบ จึงยังไม่แสดงตัวเลขประมาณการ
        </p>
      </section>

      {/* ─── 7. RECENT TRANSACTIONS SECTION ── */}
      <section
        aria-label="รายการธุรกรรมล่าสุด"
        className="bg-white rounded-2xl p-5 md:p-6 border border-hairline/80 space-y-3"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-base md:text-lg font-bold text-foreground">
            รายการล่าสุด
          </h2>
          <button
            onClick={() => onTabChange("ledger")}
            className="text-xs md:text-sm font-bold text-primary hover:underline flex items-center gap-0.5 focus-visible:ring-2 focus-visible:ring-[#E99A4A]"
          >
            <span>ดูทั้งหมด</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        <div className="divide-y divide-[#F0E6D8]/60">
          {allTransactions.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              ยังไม่มีรายการธุรกรรมล่าสุดจากระบบ
            </p>
          )}
          {allTransactions.slice(0, 4).map(tx => {
            const IconComponent = tx.icon || Heart;
            const isIncome = tx.type === "income";
            return (
              <div
                key={tx.id}
                className="py-3 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-10 h-10 rounded-full ${tx.tone} flex items-center justify-center shrink-0`}
                  >
                    <IconComponent className="w-5 h-5 stroke-[2.2]" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-foreground leading-tight truncate">
                      {tx.title}
                    </p>
                    <p className="text-[11px] text-[#7A6656] font-medium pt-0.5">
                      {typeof tx.date === "string"
                        ? tx.date
                        : fmtThaiDate(tx.date)}
                    </p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p
                    className={`text-sm md:text-base font-bold ${isIncome ? "text-success" : "text-error"}`}
                  >
                    {isIncome ? "+" : "-"}
                    {fmtBaht(tx.amount)}
                  </p>
                  <p className="text-[11px] text-[#7A6656] font-medium">
                    {tx.subCategory}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
