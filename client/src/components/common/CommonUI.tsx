import React from "react";
import { Illustration } from "@/components/Illustration";
import { ArrowLeft, Search } from "lucide-react";
import { formatAmount } from "@/lib/format";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// ─── 1. Loading Skeleton ─────────────────────────────────────────────────────

export const LoadingSkeleton: React.FC<{
  count?: number;
  height?: string;
  className?: string;
}> = ({ count = 3, height = "h-24", className = "" }) => {
  return (
    <div
      className={`space-y-3.5 w-full ${className}`}
      role="status"
      aria-live="polite"
      aria-label="กำลังโหลดข้อมูล"
    >
      <span className="sr-only">กำลังโหลดข้อมูล</span>
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={idx}
          className={`w-full ${height} rounded-2xl bg-surface border border-hairline animate-pulse p-4 flex items-center gap-4`}
        >
          <div className="w-14 h-14 rounded-2xl bg-accent shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="w-1/3 h-4 rounded-md bg-accent" />
            <div className="w-1/2 h-3 rounded-md bg-accent" />
          </div>
          <div className="w-20 h-6 rounded-md bg-accent" />
        </div>
      ))}
    </div>
  );
};

// ─── 2. Empty State ──────────────────────────────────────────────────────────

export const EmptyState: React.FC<{
  title: string;
  description: string;
  illustrationSrc?: string;
  illustrationAlt?: string;
  actionText?: string;
  onAction?: () => void;
  className?: string;
}> = ({
  title,
  description,
  illustrationSrc = "/illustrations/offering_box.jpg",
  illustrationAlt = "กล่องถวาย",
  actionText,
  onAction,
  className = "",
}) => {
  return (
    <div
      className={`py-12 px-6 rounded-2xl bg-surface border border-hairline flex flex-col items-center justify-center text-center space-y-4 ${className}`}
    >
      <div className="size-20 rounded-2xl overflow-hidden bg-canvas shrink-0">
        <Illustration
          src={illustrationSrc}
          alt={illustrationAlt}
          className="w-full h-full object-cover rounded-xl"
          width={80}
          height={80}
        />
      </div>
      <div className="space-y-1 max-w-sm">
        <h3 className="text-base font-semibold text-foreground">{title}</h3>
        <p className="text-body-sm text-muted-foreground leading-relaxed">
          {description}
        </p>
      </div>
      {actionText && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="min-h-11 mt-2 px-5 py-2.5 rounded-full bg-primary hover:bg-[#0071e3] text-white text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-[#0071e3]"
        >
          {actionText}
        </button>
      )}
    </div>
  );
};

export const ErrorState: React.FC<{
  title?: string;
  description: string;
  onRetry?: () => void;
  className?: string;
}> = ({
  title = "โหลดข้อมูลไม่สำเร็จ",
  description,
  onRetry,
  className = "",
}) => (
  <div
    className={`py-12 px-6 rounded-2xl bg-error-bg border border-error-border flex flex-col items-center justify-center text-center space-y-4 ${className}`}
    role="alert"
  >
    <div className="w-12 h-12 rounded-full bg-surface text-error flex items-center justify-center text-xl font-bold">
      !
    </div>
    <div className="space-y-1 max-w-sm">
      <h3 className="text-base font-bold text-error">{title}</h3>
      <p className="text-sm text-secondary-foreground leading-relaxed">{description}</p>
    </div>
    {onRetry && (
      <button
        type="button"
        onClick={onRetry}
        className="min-h-11 rounded-xl bg-[#C8372D] hover:bg-[#B3322A] px-5 py-2.5 text-sm font-semibold text-white transition-colors"
      >
        ลองใหม่
      </button>
    )}
  </div>
);

// ─── 3. Status Badge ─────────────────────────────────────────────────────────

export type StatusType =
  | "draft"
  | "submitted"
  | "needs_review"
  | "unknown"
  | "pending"
  | "approved"
  | "rejected"
  | "completed"
  | "active"
  | "inactive"
  | "voided"
  // Weekly offering counting session
  | "counting"
  | "counted"
  | "verified"
  | "posted"
  | "closed";

export const StatusBadge: React.FC<{
  status: StatusType | string;
  label?: string;
  className?: string;
}> = ({ status, label, className = "" }) => {
  const getStyle = () => {
    switch (status) {
      case "approved":
      case "completed":
        return {
          bg: "bg-success-bg text-success border-success-border",
          defaultLabel: "อนุมัติแล้ว",
        };
      case "active":
        return {
          bg: "bg-success-bg text-success border-success-border",
          defaultLabel: "ใช้งานอยู่",
        };
      case "rejected":
        return {
          bg: "bg-error-bg text-error border-error-border",
          defaultLabel: "ปฏิเสธ / ยกเลิก",
        };
      case "inactive":
        return {
          bg: "bg-secondary text-muted-foreground border-hairline",
          defaultLabel: "ปิดใช้งาน",
        };
      case "draft":
        return {
          bg: "bg-secondary text-muted-foreground border-hairline",
          defaultLabel: "ฉบับร่าง",
        };
      case "submitted":
        return {
          bg: "bg-info-bg text-info border-info-border",
          defaultLabel: "ส่งตรวจสอบแล้ว",
        };
      case "needs_review":
        return {
          bg: "bg-warning-bg text-warning border-warning-border",
          defaultLabel: "ต้องตรวจสอบ",
        };
      case "unknown":
        return {
          bg: "bg-secondary text-muted-foreground border-hairline",
          defaultLabel: "ไม่ทราบสถานะ",
        };
      case "voided":
        return {
          bg: "bg-secondary text-muted-foreground border-hairline",
          defaultLabel: "ยกเลิกรายการ",
        };
      case "counting":
        return {
          bg: "bg-warning-bg text-warning border-warning-border",
          defaultLabel: "กำลังนับ",
        };
      case "counted":
        return {
          bg: "bg-info-bg text-info border-info-border",
          defaultLabel: "รอตรวจสอบ",
        };
      case "verified":
        return {
          bg: "bg-success-bg text-success border-success-border",
          defaultLabel: "ตรวจสอบแล้ว",
        };
      case "posted":
        return {
          bg: "bg-success-bg text-success border-success-border",
          defaultLabel: "ลงบัญชีแล้ว",
        };
      case "closed":
        return {
          bg: "bg-secondary text-muted-foreground border-hairline",
          defaultLabel: "ปิดรอบแล้ว",
        };
      case "pending":
      default:
        return {
          bg: "bg-warning-bg text-warning border-warning-border",
          defaultLabel: "รอดำเนินการ",
        };
    }
  };

  const style = getStyle();

  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap px-2.5 py-0.5 rounded-full text-xs font-semibold border ${style.bg} ${className}`}
    >
      <span
        className="w-1.5 h-1.5 shrink-0 rounded-full bg-current"
        aria-hidden="true"
      />
      <span>{label || style.defaultLabel}</span>
    </span>
  );
};

// ─── 4. Money Display ────────────────────────────────────────────────────────

export const MoneyDisplay: React.FC<{
  amount: number;
  type?: "income" | "expense" | "neutral";
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}> = ({ amount, type = "neutral", size = "md", className = "" }) => {
  const isPositive = type === "income" || (type === "neutral" && amount > 0);
  const isNegative = type === "expense" || (type === "neutral" && amount < 0);

  const getColor = () => {
    if (type === "income") return "text-success";
    if (type === "expense") return "text-error";
    return "text-foreground";
  };

  // Each size carries its own weight. The base class used to set font-bold
  // as well, so two font-weight utilities landed on the same element and the
  // winner depended on Tailwind's output order rather than on this switch.
  const getSize = () => {
    switch (size) {
      case "sm":
        return "text-sm font-bold";
      case "lg":
        return "text-2xl md:text-3xl font-bold";
      case "xl":
        return "text-3xl sm:text-4xl md:text-5xl font-bold";
      case "md":
      default:
        return "text-lg md:text-xl font-bold";
    }
  };

  // Neutral amounts keep their own sign: a negative balance must read as
  // negative, not as its absolute value.
  const prefix =
    type === "income" ? "+" : type === "expense" ? "-" : amount < 0 ? "-" : "";
  const formatted = formatAmount(Math.abs(amount));

  // The "฿" is its own element with a small gap. Run together with the
  // digits, the glyph's ink overlaps the first numeral, and separating it
  // also keeps the digits themselves aligned down a table column.
  return (
    <span
      className={`tracking-tight tabular-nums font-sans ${getColor()} ${getSize()} ${className}`}
    >
      {prefix}
      <span className="mr-1">฿</span>
      {formatted}
    </span>
  );
};

// ─── 5. Page Header ──────────────────────────────────────────────────────────

export const PageHeader: React.FC<{
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  className?: string;
}> = ({ title, subtitle, action, className = "" }) => {
  return (
    <div
      className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white rounded-2xl p-5 md:p-6 border border-hairline card-elevation-sm ${className}`}
    >
      <div className="min-w-0">
        <h1 className="text-xl md:text-2xl font-semibold text-foreground tracking-tight break-words">
          {title}
        </h1>
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
            {subtitle}
          </p>
        )}
      </div>
      {action && (
        <div className="flex max-w-full flex-wrap items-center gap-2 [&_button]:min-h-11">
          {action}
        </div>
      )}
    </div>
  );
};

// ─── 6. Chip ─────────────────────────────────────────────────────────────────

/**
 * The small pill used for filters and for quick-amount presets.
 *
 * Several screens had their own copy of this button, and most of those copies
 * were 26–36px tall — under the 44px the rest of the app uses as its minimum
 * touch target, and awkward to hit on a phone. Defining it once keeps the
 * height, the radius and the selected state the same everywhere.
 */
export const Chip: React.FC<
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    active?: boolean;
    /** Right-hand count, e.g. the number of rows a filter would keep. */
    count?: number;
  }
> = ({ active = false, count, className = "", children, ...props }) => (
  <button
    type="button"
    aria-pressed={active}
    className={`min-h-11 shrink-0 whitespace-nowrap rounded-full border px-3.5 py-2 text-[13px] transition-colors ${
      active
        ? "border-primary bg-primary/10 font-semibold text-primary"
        : "border-hairline bg-surface font-medium text-secondary-foreground hover:bg-accent"
    } ${className}`}
    {...props}
  >
    {children}
    {count !== undefined && (
      <span className="ml-1.5 tabular-nums opacity-70">{count}</span>
    )}
  </button>
);

// ─── 7. Search and Filter Bar ────────────────────────────────────────────────

export const FilterBar: React.FC<{
  searchPlaceholder?: string;
  searchValue: string;
  onSearchChange: (v: string) => void;
  filters?: { id: string; label: string; count?: number }[];
  activeFilter?: string;
  onFilterChange?: (id: string) => void;
  className?: string;
}> = ({
  searchPlaceholder = "ค้นหา...",
  searchValue,
  onSearchChange,
  filters,
  activeFilter,
  onFilterChange,
  className = "",
}) => {
  return (
    <div className={`min-w-0 space-y-3 ${className}`}>
      {/* Search Input */}
      <div className="relative w-full">
        <Search
          className="pointer-events-none w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2"
          aria-hidden="true"
        />
        <input
          type="search"
          aria-label={searchPlaceholder}
          value={searchValue}
          onChange={e => onSearchChange(e.target.value)}
          placeholder={searchPlaceholder}
          className="min-h-11 w-full pl-9 pr-4 py-2.5 rounded-full bg-surface border border-hairline text-base md:text-sm text-foreground placeholder:text-muted-foreground focus:border-[#0071e3] focus-visible:ring-2 focus-visible:ring-[#0071e3]/30"
        />
      </div>

      {/* Filter Tabs / Chips */}
      {filters && filters.length > 0 && onFilterChange && (
        <div
          role="group"
          aria-label="กรองรายการ"
          className="flex items-center gap-2 overflow-x-auto p-1 -m-1 no-scrollbar"
        >
          {filters.map(f => {
            const isActive = activeFilter === f.id;
            return (
              <Chip
                key={f.id}
                active={isActive}
                count={f.count}
                onClick={() => onFilterChange(f.id)}
                onFocus={e =>
                  e.currentTarget.scrollIntoView({
                    block: "nearest",
                    inline: "nearest",
                  })
                }
              >
                {f.label}
              </Chip>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ─── 8. Back Link ────────────────────────────────────────────────────────────

/**
 * "Back to the list" control, shown at the top of every detail and entry page.
 *
 * Ten pages each wrote their own, in six different styles — three shapes, two
 * type sizes, and four of them below the 44px minimum touch target. Because
 * this is the control a user reaches for after deciding not to save, it has
 * to look and behave the same wherever it appears.
 */
export const BackLink: React.FC<{
  label: string;
  onClick: () => void;
  /** "plain" drops the pill for pages that sit it beside a status tag. */
  variant?: "pill" | "plain";
  className?: string;
}> = ({ label, onClick, variant = "pill", className = "" }) => (
  <button
    type="button"
    onClick={onClick}
    className={`min-h-11 inline-flex items-center gap-1.5 text-sm font-medium transition-colors ${
      variant === "pill"
        ? "rounded-full border border-hairline bg-surface px-3.5 py-2 text-secondary-foreground hover:bg-accent"
        : "text-muted-foreground hover:text-foreground"
    } ${className}`}
  >
    <ArrowLeft className="w-4 h-4 shrink-0" aria-hidden="true" />
    <span>{label}</span>
  </button>
);

// ─── 9. Confirm Dialog ───────────────────────────────────────────────────────

export const ConfirmDialog: React.FC<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "primary";
  onConfirm: () => void;
  isLoading?: boolean;
}> = ({
  open,
  onOpenChange,
  title,
  description,
  confirmText = "ยืนยัน",
  cancelText = "ยกเลิก",
  variant = "primary",
  onConfirm,
  isLoading = false,
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm bg-surface border-hairline rounded-2xl p-6 text-foreground">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-foreground">
            {title}
          </DialogTitle>
          <DialogDescription className="text-body-sm text-muted-foreground leading-relaxed">
            {description}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex gap-2 pt-4">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
            className="flex-1 min-h-11 py-2.5 rounded-full bg-surface text-secondary-foreground font-medium text-xs border border-hairline hover:bg-accent transition-colors"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`flex-1 min-h-11 py-2.5 rounded-full text-white font-medium text-xs transition-colors ${
              variant === "danger"
                ? "bg-destructive hover:bg-destructive/90"
                : "bg-primary hover:bg-[#0071e3]"
            }`}
          >
            {isLoading ? "กำลังดำเนินการ..." : confirmText}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
