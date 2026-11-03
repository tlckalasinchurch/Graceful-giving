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
      className="group flex min-h-12 w-full items-center gap-3 rounded-2xl px-3 text-left transition-colors hover:bg-paper focus-visible:ring-2 focus-visible:ring-brand"
      {...rest}
    >
      <Icon className="size-5 shrink-0 text-ink-2 transition-colors group-hover:text-ink" />
      <span className="flex-1 text-sm font-semibold text-ink">{label}</span>
      <ChevronRight className="size-4 shrink-0 text-ink-3" aria-hidden="true" />
    </button>
  )
);
Shortcut.displayName = "Shortcut";

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
      className="w-full divide-y divide-line/60"
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
