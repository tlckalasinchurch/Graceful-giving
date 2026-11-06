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
  /** Kept so existing call sites keep compiling; colour is no longer used. */
  iconClassName?: string;
  onClick?: () => void;
  className?: string;
};

const ShortcutRow = forwardRef<HTMLButtonElement, ShortcutProps>(
  ({ label, icon: Icon, onClick, className = "", ...rest }, ref) => (
    <button
      ref={ref}
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`group -mx-2 flex min-h-12 w-[calc(100%+1rem)] items-center gap-3 rounded-md px-2 text-left transition-colors hover:bg-paper focus-visible:ring-2 focus-visible:ring-brand ${className}`}
      {...rest}
    >
      <Icon className="size-4 shrink-0 text-ink-3" aria-hidden="true" />
      <span className="flex-1 truncate text-sm font-medium text-ink">
        {label}
      </span>
      <ChevronRight
        className="size-4 shrink-0 text-ink-3 transition-transform group-hover:translate-x-0.5"
        aria-hidden="true"
      />
    </button>
  )
);
ShortcutRow.displayName = "ShortcutRow";

/**
 * Shortcuts sit in a plain list separated by hairlines. Five differently
 * coloured icon tiles is a decoration budget this page does not need.
 */
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
      className="divide-y divide-line border-t border-line pt-1"
    >
      {canOpenReports && (
        <ShortcutRow
          label="รายงาน"
          icon={FileBarChart}
          onClick={onOpenReports}
        />
      )}
      {canOpenMembers && (
        <ShortcutRow label="สมาชิก" icon={UsersRound} onClick={onOpenMembers} />
      )}
      <ShortcutRow label="กิจกรรม" icon={CalendarDays} onClick={onOpenNews} />
      <ShortcutRow
        label="ขอเบิกเงิน"
        icon={Banknote}
        onClick={onOpenWithdrawals}
      />
      <AppMenu>
        <ShortcutRow label="เพิ่มเติม" icon={MoreHorizontal} />
      </AppMenu>
    </div>
  );
}
