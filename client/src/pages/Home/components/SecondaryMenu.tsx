import {
  Banknote,
  ChevronRight,
  CalendarDays,
  ClipboardList,
  MoreHorizontal,
  UsersRound,
} from "lucide-react";
import type { ComponentType } from "react";
import { forwardRef } from "react";
import { AppMenu } from "@/components/layout/AppNavigation";

interface SecondaryMenuProps {
  canOpenMembers: boolean;
  canOpenGivingGuide: boolean;
  onOpenMembers: () => void;
  onOpenNews: () => void;
  onOpenWithdrawals: () => void;
  onOpenGivingGuide: () => void;
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
      iconClassName = "bg-ground text-ink-2 border-line",
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
      className={`group flex min-h-13 w-full items-center gap-2.5 rounded-2xl border border-line bg-surface px-3 py-2.5 @md:gap-3 @md:px-3.5 text-left transition-colors hover:border-[var(--field)] hover:bg-ground focus-visible:ring-2 focus-visible:ring-brand active:scale-[0.985] ${className}`}
      {...rest}
    >
      <span
        className={`flex size-9 shrink-0 items-center justify-center rounded-xl transition-transform group-hover:scale-105 ${iconClassName}`}
      >
        <Icon className="size-4.5 shrink-0" />
      </span>
      <span className="min-w-0 flex-1 text-sm font-semibold leading-snug text-ink">
        {label}
      </span>
      <ChevronRight
        className="hidden size-4 shrink-0 text-ink-3 transition-transform group-hover:translate-x-0.5 @md:block"
        aria-hidden="true"
      />
    </button>
  )
);
ShortcutTile.displayName = "ShortcutTile";

export function SecondaryMenu({
  canOpenMembers,
  canOpenGivingGuide,
  onOpenMembers,
  onOpenNews,
  onOpenWithdrawals,
  onOpenGivingGuide,
}: SecondaryMenuProps) {
  return (
    <div
      role="group"
      aria-label="เมนูลัดอื่น ๆ"
      className="grid grid-cols-2 gap-2.5 @md:gap-3 pt-1"
    >
      {canOpenMembers && (
        <ShortcutTile
          label="สมาชิก"
          icon={UsersRound}
          iconClassName="bg-tile-mint text-tile-mint-ink"
          onClick={onOpenMembers}
        />
      )}
      <ShortcutTile
        label="กิจกรรม"
        icon={CalendarDays}
        iconClassName="bg-tile-sand text-tile-sand-ink"
        onClick={onOpenNews}
      />
      <ShortcutTile
        label="ขอเบิกเงิน"
        icon={Banknote}
        iconClassName="bg-tile-rose text-tile-rose-ink"
        onClick={onOpenWithdrawals}
      />
      {canOpenGivingGuide && (
        <ShortcutTile
          label="ขั้นตอนการถวาย"
          icon={ClipboardList}
          iconClassName="bg-tile-peach text-tile-peach-ink"
          onClick={onOpenGivingGuide}
        />
      )}
      <div className="col-span-2 @md:col-span-1">
        <AppMenu>
          <ShortcutTile
            label="เพิ่มเติม"
            icon={MoreHorizontal}
            iconClassName="bg-tile-lilac text-tile-lilac-ink"
          />
        </AppMenu>
      </div>
    </div>
  );
}
