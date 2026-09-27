import {
  Banknote,
  CalendarDays,
  FileBarChart,
  MoreHorizontal,
  UsersRound,
} from "lucide-react";
import { AppMenu } from "@/components/layout/AppNavigation";

interface SecondaryMenuProps {
  canOpenReports: boolean;
  canOpenMembers: boolean;
  secondaryTileColsClass: string;
  onOpenReports: () => void;
  onOpenMembers: () => void;
  onOpenNews: () => void;
  onOpenWithdrawals: () => void;
}

export function SecondaryMenu({
  canOpenReports,
  canOpenMembers,
  secondaryTileColsClass,
  onOpenReports,
  onOpenMembers,
  onOpenNews,
  onOpenWithdrawals,
}: SecondaryMenuProps) {
  return (
    <section
      aria-label="เมนูลัดอื่น ๆ"
      className={`grid grid-cols-3 gap-3 sm:gap-4 w-full ${secondaryTileColsClass}`}
    >
      {/* รายงาน */}
      {canOpenReports && (
        <button
          onClick={onOpenReports}
          className="flex flex-col items-center justify-center gap-2 min-h-[88px] sm:min-h-[96px] py-3.5 px-3 rounded-2xl bg-card border border-[#E7DCC8] shadow-xs transition-all duration-200 ease-in-out hover:-translate-y-0.5 hover:border-[#C94F16]/40 hover:shadow-sm active:translate-y-0 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C94F16]"
          aria-label="รายงาน"
        >
          <span className="flex size-10 items-center justify-center rounded-xl bg-[#FFF4D6] text-[#C94F16]"><FileBarChart className="size-5" aria-hidden="true" /></span>
          <span className="text-xs sm:text-sm font-semibold text-[#171311] text-center">
            รายงาน
          </span>
        </button>
      )}

      {/* สมาชิก */}
      {canOpenMembers && (
        <button
          onClick={onOpenMembers}
          className="flex flex-col items-center justify-center gap-2 min-h-[88px] sm:min-h-[96px] py-3.5 px-3 rounded-2xl bg-card border border-[#E7DCC8] shadow-xs transition-all duration-200 ease-in-out hover:-translate-y-0.5 hover:border-[#C94F16]/40 hover:shadow-sm active:translate-y-0 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C94F16]"
          aria-label="สมาชิก"
        >
          <span className="flex size-10 items-center justify-center rounded-xl bg-[#FFF4D6] text-[#C94F16]"><UsersRound className="size-5" aria-hidden="true" /></span>
          <span className="text-xs sm:text-sm font-semibold text-[#171311] text-center">
            สมาชิก
          </span>
        </button>
      )}

      {/* กิจกรรม */}
      <button
        onClick={onOpenNews}
        className="flex flex-col items-center justify-center gap-2 min-h-[88px] sm:min-h-[96px] py-3.5 px-3 rounded-2xl bg-card border border-[#E7DCC8] shadow-xs transition-all duration-200 ease-in-out hover:-translate-y-0.5 hover:border-[#C94F16]/40 hover:shadow-sm active:translate-y-0 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C94F16]"
        aria-label="กิจกรรม"
      >
        <span className="flex size-10 items-center justify-center rounded-xl bg-[#FFF4D6] text-[#C94F16]"><CalendarDays className="size-5" aria-hidden="true" /></span>
        <span className="text-xs sm:text-sm font-semibold text-[#171311] text-center">
          กิจกรรม
        </span>
      </button>

      {/* ขอเบิกเงิน */}
      <button
        onClick={onOpenWithdrawals}
        className="flex flex-col items-center justify-center gap-2 min-h-[88px] sm:min-h-[96px] py-3.5 px-3 rounded-2xl bg-card border border-[#E7DCC8] shadow-xs transition-all duration-200 ease-in-out hover:-translate-y-0.5 hover:border-[#C94F16]/40 hover:shadow-sm active:translate-y-0 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C94F16]"
        aria-label="ยื่นคำขอเบิกเงิน"
      >
        <span className="flex size-10 items-center justify-center rounded-xl bg-[#FFF4D6] text-[#C94F16]"><Banknote className="size-5" aria-hidden="true" /></span>
        <span className="text-xs sm:text-sm font-semibold text-[#171311] text-center">
          ขอเบิกเงิน
        </span>
      </button>

      {/* เพิ่มเติม */}
      <AppMenu>
        <button
          type="button"
          className="flex flex-col items-center justify-center gap-2 min-h-[88px] sm:min-h-[96px] py-3.5 px-3 rounded-2xl bg-card border border-[#E7DCC8] shadow-xs transition-all duration-200 ease-in-out hover:-translate-y-0.5 hover:border-[#C94F16]/40 hover:shadow-sm active:translate-y-0 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C94F16] w-full"
          aria-label="เพิ่มเติม"
        >
          <span className="flex size-10 items-center justify-center rounded-xl bg-[#FFF4D6] text-[#C94F16]"><MoreHorizontal className="size-5" aria-hidden="true" /></span>
          <span className="text-xs sm:text-sm font-semibold text-[#171311] text-center">
            เพิ่มเติม
          </span>
        </button>
      </AppMenu>
    </section>
  );
}
