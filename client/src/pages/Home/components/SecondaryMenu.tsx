import { ChevronRight } from "lucide-react";
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

type RowProps = { label: string; onClick?: () => void };

/** A shortcut is a plain row: a label and a chevron. */
const Row = forwardRef<HTMLButtonElement, RowProps>(
  ({ label, onClick, ...rest }, ref) => (
    <button
      ref={ref}
      type="button"
      onClick={onClick}
      aria-label={label}
      className="flex min-h-12 w-full items-center justify-between gap-3 px-5 text-left text-sm text-ink hover:bg-paper"
      {...rest}
    >
      <span>{label}</span>
      <ChevronRight className="size-4 text-ink-3" aria-hidden="true" />
    </button>
  )
);
Row.displayName = "Row";

export function SecondaryMenu({
  canOpenReports,
  canOpenMembers,
  onOpenReports,
  onOpenMembers,
  onOpenNews,
  onOpenWithdrawals,
}: SecondaryMenuProps) {
  return (
    <nav
      aria-label="เมนูลัด"
      className="rounded-2xl border border-line bg-surface"
    >
      <h2 className="px-5 pt-4 pb-1 text-base font-semibold text-ink">
        ทางลัด
      </h2>
      <div className="divide-y divide-line pb-1">
        {canOpenReports && <Row label="รายงาน" onClick={onOpenReports} />}
        {canOpenMembers && <Row label="สมาชิก" onClick={onOpenMembers} />}
        <Row label="กิจกรรมและข่าวคริสตจักร" onClick={onOpenNews} />
        <Row label="ขอเบิกเงิน" onClick={onOpenWithdrawals} />
        <AppMenu>
          <Row label="เมนูอื่น ๆ" />
        </AppMenu>
      </div>
    </nav>
  );
}
