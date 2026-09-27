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
          className="flex flex-col items-center justify-center min-h-[82px] sm:min-h-[96px] py-3.5 px-3 rounded-2xl bg-white border border-hairline hover:border-[#8E44AD] hover:bg-[#FAF5FC] transition-colors focus-visible:ring-2 focus-visible:ring-[#8E44AD]"
          aria-label="รายงาน"
        >
          <FileBarChart className="w-6 h-6 sm:w-7 sm:h-7 stroke-[2.2] text-[#8E44AD] mb-1.5" />
          <span className="text-xs sm:text-sm font-bold text-foreground tracking-tight text-center">
            รายงาน
          </span>
        </button>
      )}

      {/* สมาชิก */}
      {canOpenMembers && (
        <button
          onClick={onOpenMembers}
          className="flex flex-col items-center justify-center min-h-[82px] sm:min-h-[96px] py-3.5 px-3 rounded-2xl bg-white border border-hairline hover:border-primary hover:bg-canvas transition-colors focus-visible:ring-2 focus-visible:ring-[#0071e3]"
          aria-label="สมาชิก"
        >
          <UsersRound className="w-6 h-6 sm:w-7 sm:h-7 stroke-[2.2] text-primary mb-1.5" />
          <span className="text-xs sm:text-sm font-bold text-foreground tracking-tight text-center">
            สมาชิก
          </span>
        </button>
      )}

      {/* กิจกรรม */}
      <button
        onClick={onOpenNews}
        className="flex flex-col items-center justify-center min-h-[82px] sm:min-h-[96px] py-3.5 px-3 rounded-2xl bg-white border border-hairline hover:border-[#C9503B] hover:bg-[#FFF5F3] transition-colors focus-visible:ring-2 focus-visible:ring-[#C9503B]"
        aria-label="กิจกรรม"
      >
        <CalendarDays className="w-6 h-6 sm:w-7 sm:h-7 stroke-[2.2] text-[#C9503B] mb-1.5" />
        <span className="text-xs sm:text-sm font-bold text-foreground tracking-tight text-center">
          กิจกรรม
        </span>
      </button>

      {/* ขอเบิกเงิน */}
      <button
        onClick={onOpenWithdrawals}
        className="flex flex-col items-center justify-center min-h-[82px] sm:min-h-[96px] py-3.5 px-3 rounded-2xl bg-white border border-hairline hover:border-primary hover:bg-canvas transition-colors focus-visible:ring-2 focus-visible:ring-[#0071e3]"
        aria-label="ยื่นคำขอเบิกเงิน"
      >
        <Banknote className="w-6 h-6 sm:w-7 sm:h-7 stroke-[2.2] text-primary mb-1.5" />
        <span className="text-xs sm:text-sm font-bold text-foreground tracking-tight text-center">
          ขอเบิกเงิน
        </span>
      </button>

      {/* เพิ่มเติม */}
      <AppMenu>
        <button
          type="button"
          className="flex flex-col items-center justify-center min-h-[82px] sm:min-h-[96px] py-3.5 px-3 w-full rounded-2xl bg-white border border-hairline hover:border-[#2A75A0] hover:bg-[#F2F8FC] transition-colors focus-visible:ring-2 focus-visible:ring-[#2A75A0]"
          aria-label="เพิ่มเติม"
        >
          <MoreHorizontal className="w-6 h-6 sm:w-7 sm:h-7 stroke-[2.2] text-[#2A75A0] mb-1.5" />
          <span className="text-xs sm:text-sm font-bold text-foreground tracking-tight text-center">
            เพิ่มเติม
          </span>
        </button>
      </AppMenu>
    </section>
  );
}
