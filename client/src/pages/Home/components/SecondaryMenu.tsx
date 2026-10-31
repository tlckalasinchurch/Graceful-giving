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
  tile: string;
  onClick?: () => void;
};

/** A shortcut sits inside the actions card, so it is a plain button with a
 *  pastel icon tile — not another bordered card inside a card. */
const Shortcut = forwardRef<HTMLButtonElement, ShortcutProps>(
  ({ label, icon: Icon, tile, onClick, ...rest }, ref) => (
    <button
      ref={ref}
      type="button"
      onClick={onClick}
      aria-label={label}
      className="group flex min-h-[92px] w-full flex-col items-center justify-center gap-2 rounded-2xl px-1 py-3 hover:bg-paper transition-all hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-brand"
      {...rest}
    >
      <span
        className={`size-12 rounded-2xl flex items-center justify-center shadow-xs transition-transform group-hover:scale-105 ${tile}`}
        aria-hidden="true"
      >
        <Icon className="size-5" />
      </span>
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
        <Shortcut
          label="รายงาน"
          icon={FileBarChart}
          tile="bg-tile-sky text-tile-sky-ink"
          onClick={onOpenReports}
        />
      )}
      {canOpenMembers && (
        <Shortcut
          label="สมาชิก"
          icon={UsersRound}
          tile="bg-tile-lilac text-tile-lilac-ink"
          onClick={onOpenMembers}
        />
      )}
      <Shortcut
        label="กิจกรรม"
        icon={CalendarDays}
        tile="bg-tile-peach text-tile-peach-ink"
        onClick={onOpenNews}
      />
      <Shortcut
        label="ขอเบิกเงิน"
        icon={Banknote}
        tile="bg-tile-mint text-tile-mint-ink"
        onClick={onOpenWithdrawals}
      />
      <AppMenu>
        <Shortcut
          label="เพิ่มเติม"
          icon={MoreHorizontal}
          tile="bg-tile-sand text-tile-sand-ink"
        />
      </AppMenu>
    </div>
  );
}
