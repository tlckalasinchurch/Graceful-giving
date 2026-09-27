import {
  Banknote,
  CalendarDays,
  FileBarChart,
  MoreHorizontal,
  UsersRound,
} from "lucide-react";
import { AppMenu } from "@/components/layout/AppNavigation";

// One grammar for every shortcut: colour marks "this is clickable", not which
// tile it is. The label already says which tile it is.
const TILE =
  "flex flex-col items-center justify-center min-h-[82px] sm:min-h-[96px] py-3.5 px-3 rounded-2xl bg-[#262626] border border-[#3D3D3D] hover:border-[#FC6E20]/50 hover:bg-[#323232] transition-colors focus-visible:ring-2 focus-visible:ring-[#FC6E20]";
const ICON = "w-6 h-6 sm:w-7 sm:h-7 stroke-[2.2] text-[#FC6E20] mb-1.5";
const LABEL = "text-xs sm:text-sm font-bold text-white tracking-tight text-center";

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
        <button onClick={onOpenReports} className={TILE} aria-label="รายงาน">
          <FileBarChart className={ICON} aria-hidden="true" />
          <span className={LABEL}>
            รายงาน
          </span>
        </button>
      )}

      {/* สมาชิก */}
      {canOpenMembers && (
        <button onClick={onOpenMembers} className={TILE} aria-label="สมาชิก">
          <UsersRound className={ICON} aria-hidden="true" />
          <span className={LABEL}>
            สมาชิก
          </span>
        </button>
      )}

      {/* กิจกรรม */}
      <button onClick={onOpenNews} className={TILE} aria-label="กิจกรรม">
        <CalendarDays className={ICON} aria-hidden="true" />
        <span className={LABEL}>
          กิจกรรม
        </span>
      </button>

      {/* ขอเบิกเงิน */}
      <button
        onClick={onOpenWithdrawals}
        className={TILE}
        aria-label="ยื่นคำขอเบิกเงิน"
      >
        <Banknote className={ICON} aria-hidden="true" />
        <span className={LABEL}>
          ขอเบิกเงิน
        </span>
      </button>

      {/* เพิ่มเติม */}
      <AppMenu>
        <button
          type="button"
          className={`${TILE} w-full`}
          aria-label="เพิ่มเติม"
        >
          <MoreHorizontal className={ICON} aria-hidden="true" />
          <span className={LABEL}>
            เพิ่มเติม
          </span>
        </button>
      </AppMenu>
    </section>
  );
}
