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
          className="flex flex-col items-center justify-center min-h-[82px] sm:min-h-[96px] py-3.5 px-3 rounded-2xl bg-white border border-[#E5E1D8] hover:border-[#527A9E] hover:bg-[#FAF5FC] transition-colors focus-visible:ring-2 focus-visible:ring-[#527A9E] shadow-2xs"
          aria-label="รายงาน"
        >
          <FileBarChart className="w-6 h-6 sm:w-7 sm:h-7 stroke-[2.2] text-[#527A9E] mb-1.5" />
          <span className="text-xs sm:text-sm font-bold text-[#171717] tracking-tight text-center">
            รายงาน
          </span>
        </button>
      )}

      {/* สมาชิก */}
      {canOpenMembers && (
        <button
          onClick={onOpenMembers}
          className="flex flex-col items-center justify-center min-h-[82px] sm:min-h-[96px] py-3.5 px-3 rounded-2xl bg-white border border-[#E5E1D8] hover:border-[#F97316] hover:bg-[#F5F3EE] transition-colors focus-visible:ring-2 focus-visible:ring-[#F97316] shadow-2xs"
          aria-label="สมาชิก"
        >
          <UsersRound className="w-6 h-6 sm:w-7 sm:h-7 stroke-[2.2] text-[#F97316] mb-1.5" />
          <span className="text-xs sm:text-sm font-bold text-[#171717] tracking-tight text-center">
            สมาชิก
          </span>
        </button>
      )}

      {/* กิจกรรม */}
      <button
        onClick={onOpenNews}
        className="flex flex-col items-center justify-center min-h-[82px] sm:min-h-[96px] py-3.5 px-3 rounded-2xl bg-white border border-[#E5E1D8] hover:border-[#C9503B] hover:bg-[#FFF5F3] transition-colors focus-visible:ring-2 focus-visible:ring-[#C9503B] shadow-2xs"
        aria-label="กิจกรรม"
      >
        <CalendarDays className="w-6 h-6 sm:w-7 sm:h-7 stroke-[2.2] text-[#C9503B] mb-1.5" />
        <span className="text-xs sm:text-sm font-bold text-[#171717] tracking-tight text-center">
          กิจกรรม
        </span>
      </button>

      {/* ขอเบิกเงิน */}
      <button
        onClick={onOpenWithdrawals}
        className="flex flex-col items-center justify-center min-h-[82px] sm:min-h-[96px] py-3.5 px-3 rounded-2xl bg-white border border-[#E5E1D8] hover:border-[#F97316] hover:bg-[#F5F3EE] transition-colors focus-visible:ring-2 focus-visible:ring-[#F97316] shadow-2xs"
        aria-label="ยื่นคำขอเบิกเงิน"
      >
        <Banknote className="w-6 h-6 sm:w-7 sm:h-7 stroke-[2.2] text-[#F97316] mb-1.5" />
        <span className="text-xs sm:text-sm font-bold text-[#171717] tracking-tight text-center">
          ขอเบิกเงิน
        </span>
      </button>

      {/* เพิ่มเติม */}
      <AppMenu>
        <button
          type="button"
          className="flex flex-col items-center justify-center min-h-[82px] sm:min-h-[96px] py-3.5 px-3 w-full rounded-2xl bg-white border border-[#E5E1D8] hover:border-[#527A9E] hover:bg-[#F2F8FC] transition-colors focus-visible:ring-2 focus-visible:ring-[#527A9E] shadow-2xs"
          aria-label="เพิ่มเติม"
        >
          <MoreHorizontal className="w-6 h-6 sm:w-7 sm:h-7 stroke-[2.2] text-[#527A9E] mb-1.5" />
          <span className="text-xs sm:text-sm font-bold text-[#171717] tracking-tight text-center">
            เพิ่มเติม
          </span>
        </button>
      </AppMenu>
    </section>
  );
}
