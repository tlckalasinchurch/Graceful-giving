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
  iconClassName?: string;
  onClick?: () => void;
  className?: string;
};

const ShortcutTile = forwardRef<HTMLButtonElement, ShortcutProps>(
  (
    {
      label,
      icon: Icon,
      iconClassName = "bg-surface text-ink-2 border-line/60",
      onClick,
      className = "",
      ...rest
    },
    ref
  ) => (
    <button
      ref={ref}
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`group flex min-h-[52px] w-full items-center gap-3 rounded-2xl border border-line/80 bg-paper/60 px-3.5 py-2.5 text-left transition-all hover:bg-paper hover:border-line focus-visible:ring-2 focus-visible:ring-brand active:scale-[0.98] shadow-xs ${className}`}
      {...rest}
    >
      <span
        className={`flex size-9 shrink-0 items-center justify-center rounded-xl border transition-transform group-hover:scale-105 shadow-2xs ${iconClassName}`}
      >
        <Icon className="size-4.5 shrink-0" />
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
          iconClassName="bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 border-sky-200/80 dark:border-sky-800/60"
          onClick={onOpenReports}
        />
      )}
      {canOpenMembers && (
        <ShortcutTile
          label="สมาชิก"
          icon={UsersRound}
          iconClassName="bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border-emerald-200/80 dark:border-emerald-800/60"
          onClick={onOpenMembers}
        />
      )}
      <ShortcutTile
        label="กิจกรรม"
        icon={CalendarDays}
        iconClassName="bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border-amber-200/80 dark:border-amber-800/60"
        onClick={onOpenNews}
      />
      <ShortcutTile
        label="ขอเบิกเงิน"
        icon={Banknote}
        iconClassName="bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border-rose-200/80 dark:border-rose-800/60"
        onClick={onOpenWithdrawals}
      />
      <div className="col-span-2 sm:col-span-1">
        <AppMenu>
          <ShortcutTile
            label="เพิ่มเติม"
            icon={MoreHorizontal}
            iconClassName="bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border-indigo-200/80 dark:border-indigo-800/60"
          />
        </AppMenu>
      </div>
    </div>
  );
}
