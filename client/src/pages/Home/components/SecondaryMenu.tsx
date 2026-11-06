import {
  Banknote,
  ChevronRight,
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
  onOpenReports: () => void;
  onOpenMembers: () => void;
  onOpenNews: () => void;
  onOpenWithdrawals: () => void;
}

type ShortcutProps = {
  label: string;
  icon: ComponentType<{ className?: string }>;
  onClick?: () => void;
  className?: string;
};

const ShortcutTile = forwardRef<HTMLButtonElement, ShortcutProps>(
  ({ label, icon: Icon, onClick, className = "", ...rest }, ref) => (
    <button
      ref={ref}
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`group flex min-h-[50px] w-full items-center gap-2.5 rounded-xl border border-line/80 bg-paper/60 px-3 py-2.5 text-left transition-all hover:bg-paper hover:border-line focus-visible:ring-2 focus-visible:ring-brand active:scale-[0.98] ${className}`}
      {...rest}
    >
      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-surface border border-line/60 text-ink-2 transition-colors group-hover:text-ink shadow-2xs">
        <Icon className="size-4 shrink-0" />
      </span>
      <span className="flex-1 truncate text-xs sm:text-sm font-semibold text-ink">
        {label}
      </span>
      <ChevronRight
        className="size-3.5 shrink-0 text-ink-3 transition-transform group-hover:translate-x-0.5"
        aria-hidden="true"
      />
    </button>
  )
);
ShortcutTile.displayName = "ShortcutTile";

export function SecondaryMenu({
  canOpenReports,
  canOpenMembers,
  onOpenReports,
  onOpenMembers,
  onOpenNews,
  onOpenWithdrawals,
}: SecondaryMenuProps) {
  return (
    <div
      role="group"
      aria-label="เมนูลัดอื่น ๆ"
      className="grid grid-cols-2 gap-2 sm:gap-2.5 pt-1"
    >
      {canOpenReports && (
        <ShortcutTile
          label="รายงาน"
          icon={FileBarChart}
          onClick={onOpenReports}
        />
      )}
      {canOpenMembers && (
        <ShortcutTile
          label="สมาชิก"
          icon={UsersRound}
          onClick={onOpenMembers}
        />
      )}
      <ShortcutTile label="กิจกรรม" icon={CalendarDays} onClick={onOpenNews} />
      <ShortcutTile
        label="ขอเบิกเงิน"
        icon={Banknote}
        onClick={onOpenWithdrawals}
      />
      <div className="col-span-2 sm:col-span-1">
        <AppMenu>
          <ShortcutTile label="เพิ่มเติม" icon={MoreHorizontal} />
        </AppMenu>
      </div>
    </div>
  );
}
