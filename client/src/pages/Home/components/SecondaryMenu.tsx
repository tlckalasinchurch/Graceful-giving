import {
  Banknote,
  CalendarDays,
  FileBarChart,
  MoreHorizontal,
  UsersRound,
} from "lucide-react";
import type { ComponentType } from "react";
import { forwardRef } from "react";
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

type ShortcutProps = {
  label: string;
  icon: ComponentType<{ className?: string }>;
  onClick?: () => void;
};

/** A shortcut sits inside the actions card, so it is a plain button with a
 *  grey outline icon — no coloured tile. */
const Shortcut = forwardRef<HTMLButtonElement, ShortcutProps>(
  ({ label, icon: Icon, onClick, ...rest }, ref) => (
    <button
      ref={ref}
      type="button"
      onClick={onClick}
      aria-label={label}
      className="group flex min-h-[92px] w-full flex-col items-center justify-center gap-2.5 rounded-2xl px-1 py-3 hover:bg-paper transition-colors focus-visible:ring-2 focus-visible:ring-brand"
      {...rest}
    >
      <Icon className="size-5 text-ink-2 transition-colors group-hover:text-ink" />
      <span className="text-center text-xs sm:text-sm font-bold text-ink">
        {label}
      </span>
    </button>
  )
);
Shortcut.displayName = "Shortcut";

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
    <div
      role="group"
      aria-label="เมนูลัดอื่น ๆ"
      className={`grid grid-cols-3 gap-1.5 w-full ${secondaryTileColsClass}`}
    >
      {canOpenReports && (
        <Shortcut label="รายงาน" icon={FileBarChart} onClick={onOpenReports} />
      )}
      {canOpenMembers && (
        <Shortcut label="สมาชิก" icon={UsersRound} onClick={onOpenMembers} />
      )}
      <Shortcut label="กิจกรรม" icon={CalendarDays} onClick={onOpenNews} />
      <Shortcut
        label="ขอเบิกเงิน"
        icon={Banknote}
        onClick={onOpenWithdrawals}
      />
      <AppMenu>
        <Shortcut label="เพิ่มเติม" icon={MoreHorizontal} />
      </AppMenu>
    </div>
  );
}
