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
      className={`grid grid-cols-3 gap-3 sm:gap-4 md:gap-5 w-full ${secondaryTileColsClass}`}
    >
      {/* รายงาน */}
      {canOpenReports && (
        <button
          onClick={onOpenReports}
          className="group flex flex-col items-center justify-center min-h-[88px] sm:min-h-[104px] py-3.5 px-3 rounded-2xl bg-white border border-[#E7DCC8]/90 hover:border-[#C94F16] fintech-card fintech-card-hover focus-visible:ring-2 focus-visible:ring-[#C94F16] active:scale-95 transition-all"
          aria-label="รายงาน"
        >
          <div className="size-10 sm:size-11 rounded-2xl bg-[#FFF8EA] border border-[#E7DCC8] flex items-center justify-center text-[#9F3B0F] mb-1.5 group-hover:scale-110 transition-transform shadow-2xs">
            <FileBarChart className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2.2]" />
          </div>
          <span className="text-xs sm:text-sm font-bold text-[#171311] tracking-tight text-center">
            รายงาน
          </span>
        </button>
      )}

      {/* สมาชิก */}
      {canOpenMembers && (
        <button
          onClick={onOpenMembers}
          className="group flex flex-col items-center justify-center min-h-[88px] sm:min-h-[104px] py-3.5 px-3 rounded-2xl bg-white border border-[#E7DCC8]/90 hover:border-[#C94F16] fintech-card fintech-card-hover focus-visible:ring-2 focus-visible:ring-[#C94F16] active:scale-95 transition-all"
          aria-label="สมาชิก"
        >
          <div className="size-10 sm:size-11 rounded-2xl bg-[#FFF2EB] border border-[#E7DCC8] flex items-center justify-center text-[#C94F16] mb-1.5 group-hover:scale-110 transition-transform shadow-2xs">
            <UsersRound className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2.2]" />
          </div>
          <span className="text-xs sm:text-sm font-bold text-[#171311] tracking-tight text-center">
            สมาชิก
          </span>
        </button>
      )}

      {/* กิจกรรม */}
      <button
        onClick={onOpenNews}
        className="group flex flex-col items-center justify-center min-h-[88px] sm:min-h-[104px] py-3.5 px-3 rounded-2xl bg-white border border-[#E7DCC8]/90 hover:border-[#C94F16] fintech-card fintech-card-hover focus-visible:ring-2 focus-visible:ring-[#C94F16] active:scale-95 transition-all"
        aria-label="กิจกรรม"
      >
        <div className="size-10 sm:size-11 rounded-2xl bg-[#FFF0ED] border border-[#E7DCC8] flex items-center justify-center text-[#C9503B] mb-1.5 group-hover:scale-110 transition-transform shadow-2xs">
          <CalendarDays className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2.2]" />
        </div>
        <span className="text-xs sm:text-sm font-bold text-[#171311] tracking-tight text-center">
          กิจกรรม
        </span>
      </button>

      {/* ขอเบิกเงิน */}
      <button
        onClick={onOpenWithdrawals}
        className="group flex flex-col items-center justify-center min-h-[88px] sm:min-h-[104px] py-3.5 px-3 rounded-2xl bg-white border border-[#E7DCC8]/90 hover:border-[#C94F16] fintech-card fintech-card-hover focus-visible:ring-2 focus-visible:ring-[#C94F16] active:scale-95 transition-all"
        aria-label="ยื่นคำขอเบิกเงิน"
      >
        <div className="size-10 sm:size-11 rounded-2xl bg-[#EBF5ED] border border-[#E7DCC8] flex items-center justify-center text-[#235324] mb-1.5 group-hover:scale-110 transition-transform shadow-2xs">
          <Banknote className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2.2]" />
        </div>
        <span className="text-xs sm:text-sm font-bold text-[#171311] tracking-tight text-center">
          ขอเบิกเงิน
        </span>
      </button>

      {/* เพิ่มเติม */}
      <AppMenu>
        <button
          type="button"
          className="group flex flex-col items-center justify-center min-h-[88px] sm:min-h-[104px] py-3.5 px-3 w-full rounded-2xl bg-white border border-[#E7DCC8]/90 hover:border-[#C94F16] fintech-card fintech-card-hover focus-visible:ring-2 focus-visible:ring-[#C94F16] active:scale-95 transition-all"
          aria-label="เพิ่มเติม"
        >
          <div className="size-10 sm:size-11 rounded-2xl bg-[#F7F4F0] border border-[#E7DCC8] flex items-center justify-center text-[#51443A] mb-1.5 group-hover:scale-110 transition-transform shadow-2xs">
            <MoreHorizontal className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2.2]" />
          </div>
          <span className="text-xs sm:text-sm font-bold text-[#171311] tracking-tight text-center">
            เพิ่มเติม
          </span>
        </button>
      </AppMenu>
    </section>
  );
}
