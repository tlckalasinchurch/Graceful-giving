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
      className={`group flex min-h-14 w-full items-center gap-3 rounded-xl border border-line bg-surface px-3.5 py-2.5 text-left transition-all hover:border-[var(--ink)] hover:shadow-[2px_2px_0_var(--ink)] focus-visible:ring-2 focus-visible:ring-brand active:translate-x-[2px] active:translate-y-[2px] active:shadow-none ${className}`}
      {...rest}
    >
      <span
        className={`flex size-10 shrink-0 items-center justify-center rounded-lg border transition-transform group-hover:scale-105 ${iconClassName}`}
      >
        <Icon className="size-5 shrink-0" />
      </span>
      <span className="flex-1 text-sm font-bold leading-snug text-ink sm:text-base">
        {label}
      </span>
      <ChevronRight
        className="size-4 shrink-0 text-ink-3 transition-transform group-hover:translate-x-0.5"
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
      className="grid grid-cols-2 gap-2.5 sm:gap-3 pt-1"
    >
      {canOpenMembers && (
        <ShortcutTile
          label="สมาชิก"
          icon={UsersRound}
          iconClassName="bg-tile-mint text-tile-mint-ink border-tile-mint-ink/15"
          onClick={onOpenMembers}
        />
      )}
      <ShortcutTile
        label="กิจกรรม"
        icon={CalendarDays}
        iconClassName="bg-tile-sand text-tile-sand-ink border-tile-sand-ink/15"
        onClick={onOpenNews}
      />
      <ShortcutTile
        label="ขอเบิกเงิน"
        icon={Banknote}
        iconClassName="bg-tile-rose text-tile-rose-ink border-tile-rose-ink/15"
        onClick={onOpenWithdrawals}
      />
      {canOpenGivingGuide && (
        <ShortcutTile
          label="ขั้นตอนการถวาย"
          icon={ClipboardList}
          iconClassName="bg-tile-peach text-tile-peach-ink border-tile-peach-ink/15"
          onClick={onOpenGivingGuide}
        />
      )}
      <div className="col-span-2 sm:col-span-1">
        <AppMenu>
          <ShortcutTile
            label="เพิ่มเติม"
            icon={MoreHorizontal}
            iconClassName="bg-tile-lilac text-tile-lilac-ink border-tile-lilac-ink/15"
          />
        </AppMenu>
      </div>
    </div>
  );
}
