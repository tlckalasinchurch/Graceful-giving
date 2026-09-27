import React from "react";
import { Illustration } from "@/components/Illustration";
import { Link } from "wouter";
import {
  ArrowDownLeft,
  ArrowLeft,
  ArrowUpRight,
  ChevronRight,
  Search,
} from "lucide-react";
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
}> = ({ count = 3, height = "h-16", className = "" }) => {
  // Shaped like a list row (icon, two text lines, amount) so the layout does
  // not jump when the real rows arrive.
  return (
    <div
      className={`w-full divide-y divide-divider overflow-hidden rounded-2xl border border-border bg-card ${className}`}
      role="status"
      aria-label="กำลังโหลดข้อมูล"
    >
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={idx}
          className={`w-full ${height} animate-pulse px-4 flex items-center gap-3`}
        >
          <div className="size-10 rounded-full bg-muted shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="w-2/5 h-3.5 rounded bg-muted" />
            <div className="w-3/5 h-3 rounded bg-muted" />
          </div>
          <div className="w-16 h-4 rounded bg-muted" />
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
      className={`py-10 px-6 rounded-2xl bg-card border border-border flex flex-col items-center justify-center text-center gap-4 ${className}`}
    >
      <div className="size-16 rounded-2xl overflow-hidden bg-muted shrink-0">
        <Illustration
          src={illustrationSrc}
          alt={illustrationAlt}
          className="w-full h-full object-cover"
          width={64}
          height={64}
        />
      </div>
      <div className="space-y-1 max-w-sm">
        <h3 className="text-base font-semibold text-foreground">{title}</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {description}
        </p>
      </div>
      {actionText && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="min-h-11 px-5 rounded-xl bg-primary hover:bg-primary-strong text-primary-foreground text-sm font-semibold transition-colors"
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
    className={`py-10 px-6 rounded-2xl bg-destructive-soft border border-destructive-border flex flex-col items-center justify-center text-center gap-4 ${className}`}
    role="alert"
  >
    <div className="w-12 h-12 rounded-full bg-destructive-soft text-destructive flex items-center justify-center text-xl font-bold">
      !
    </div>
    <div className="space-y-1 max-w-sm">
      <h3 className="text-base font-bold text-destructive-strong">{title}</h3>
      <p className="text-sm text-foreground-soft leading-relaxed">{description}</p>
    </div>
    {onRetry && (
      <button
        type="button"
        onClick={onRetry}
        className="min-h-11 rounded-xl bg-destructive hover:bg-destructive-strong px-5 py-2.5 text-sm font-semibold text-white transition-colors"
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
          bg: "bg-success-soft text-success-strong border-success-border",
          defaultLabel: "อนุมัติแล้ว",
        };
      case "active":
        return {
          bg: "bg-success-soft text-success-strong border-success-border",
          defaultLabel: "ใช้งานอยู่",
        };
      case "rejected":
        return {
          bg: "bg-destructive-soft text-destructive-strong border-destructive-border",
          defaultLabel: "ปฏิเสธ / ยกเลิก",
        };
      case "inactive":
        return {
          bg: "bg-muted text-foreground-soft border-border",
          defaultLabel: "ปิดใช้งาน",
        };
      case "draft":
        return {
          bg: "bg-muted text-foreground-soft border-border",
          defaultLabel: "ฉบับร่าง",
        };
      case "submitted":
        return {
          bg: "bg-info-soft text-info border-info-border",
          defaultLabel: "ส่งตรวจสอบแล้ว",
        };
      case "needs_review":
        return {
          bg: "bg-accent text-primary-strong border-accent-border",
          defaultLabel: "ต้องตรวจสอบ",
        };
      case "unknown":
        return {
          bg: "bg-muted text-foreground-soft border-border",
          defaultLabel: "ไม่ทราบสถานะ",
        };
      case "voided":
        return {
          bg: "bg-muted text-foreground-soft border-border",
          defaultLabel: "ยกเลิกรายการ",
        };
      case "counting":
        return {
          bg: "bg-accent text-primary-strong border-accent-border",
          defaultLabel: "กำลังนับ",
        };
      case "counted":
        return {
          bg: "bg-info-soft text-info border-info-border",
          defaultLabel: "รอตรวจสอบ",
        };
      case "verified":
        return {
          bg: "bg-success-soft text-success-strong border-success-border",
          defaultLabel: "ตรวจสอบแล้ว",
        };
      case "posted":
        return {
          bg: "bg-success-strong text-white border-success-strong",
          defaultLabel: "ลงบัญชีแล้ว",
        };
      case "closed":
        return {
          bg: "bg-border text-foreground-soft border-border",
          defaultLabel: "ปิดรอบแล้ว",
        };
      case "pending":
      default:
        return {
          bg: "bg-accent text-primary-strong border-accent-border",
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
  const getColor = () => {
    if (type === "income") return "text-success-strong";
    if (type === "expense") return "text-destructive";
    return "text-foreground";
  };

  const getSize = () => {
    switch (size) {
      case "sm":
        return "text-sm font-semibold";
      case "lg":
        return "text-2xl md:text-3xl font-bold";
      case "xl":
        return "text-[2rem] leading-tight sm:text-4xl md:text-5xl font-bold";
      case "md":
      default:
        return "text-lg md:text-xl font-bold";
    }
  };

  // The sign always shows, so income and expense differ without colour. A
  // true minus (U+2212) is as wide as "+", which keeps a column aligned.
  // Neutral amounts keep their own sign: a negative balance reads negative.
  const prefix =
    type === "income"
      ? "+"
      : type === "expense"
        ? "\u2212"
        : amount < 0
          ? "\u2212"
          : "";
  const formatted = formatAmount(Math.abs(amount));

  // The "฿" is its own element with a small gap. Run together with the
  // digits, the glyph's ink overlaps the first numeral.
  return (
    <span
      data-amount
      className={`whitespace-nowrap tracking-tight tabular-nums font-sans ${getColor()} ${getSize()} ${className}`}
    >
      {prefix}
      <span className="mx-0.5">฿</span>
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
      className={`flex flex-col sm:flex-row sm:items-end justify-between gap-3 ${className}`}
    >
      <div className="min-w-0">
        <h1 className="text-[22px] md:text-2xl font-bold text-foreground tracking-tight">
          {title}
        </h1>
        {subtitle && (
          <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
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

// ─── 5b. Section Header ──────────────────────────────────────────────────────

/** Heading for a block inside a page, with an optional "see all" link. */
export const SectionHeader: React.FC<{
  title: string;
  id?: string;
  actionText?: string;
  onAction?: () => void;
  className?: string;
}> = ({ title, id, actionText, onAction, className = "" }) => (
  <div className={`flex items-center justify-between gap-3 ${className}`}>
    <h2 id={id} className="text-base font-semibold text-foreground">
      {title}
    </h2>
    {actionText && onAction && (
      <button
        type="button"
        onClick={onAction}
        className="-mr-2 inline-flex min-h-11 items-center gap-0.5 rounded-xl px-2 text-sm font-semibold text-primary-strong hover:bg-accent"
      >
        {actionText}
        <ChevronRight className="size-4" aria-hidden="true" />
      </button>
    )}
  </div>
);

// ─── 5c. Summary Metric ──────────────────────────────────────────────────────

/** One labelled figure in a summary grid (income, expense, net, count). */
export const SummaryMetric: React.FC<{
  label: string;
  children: React.ReactNode;
  hint?: React.ReactNode;
  className?: string;
}> = ({ label, children, hint, className = "" }) => (
  <div className={`min-w-0 rounded-2xl border border-border bg-card p-4 ${className}`}>
    <p className="text-xs font-medium text-muted-foreground">{label}</p>
    <div className="mt-1 min-w-0 truncate">{children}</div>
    {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
  </div>
);

// ─── 5d. Transaction Row ─────────────────────────────────────────────────────

/**
 * One money movement in a list: what, when and where on the left, the signed
 * amount on the right. Used by the dashboard and the transaction list so a
 * row reads the same on every screen. Direction is carried by the sign and
 * the "รับ"/"จ่าย" label as well as by colour.
 */
export const TransactionRow: React.FC<{
  title: string;
  meta: React.ReactNode;
  amount: number;
  type: "income" | "expense";
  href?: string;
  onClick?: () => void;
  trailing?: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
  /** Drop the leading icon below 640px when the row also carries an action. */
  hideIconOnMobile?: boolean;
  /** Accessible name when the visible text alone is ambiguous. */
  ariaLabel?: string;
}> = ({
  title,
  meta,
  amount,
  type,
  href,
  onClick,
  trailing,
  icon: Icon,
  hideIconOnMobile = false,
  ariaLabel,
}) => {
  const isIncome = type === "income";
  const content = (
    <>
      <span
        className={`${hideIconOnMobile ? "hidden sm:flex" : "flex"} size-10 shrink-0 items-center justify-center rounded-full ${
          isIncome
            ? "bg-success-soft text-success-strong"
            : "bg-destructive-soft text-destructive"
        }`}
        aria-hidden="true"
      >
        {Icon ? (
          <Icon className="size-[18px]" />
        ) : isIncome ? (
          <ArrowDownLeft className="size-[18px]" />
        ) : (
          <ArrowUpRight className="size-[18px]" />
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-semibold text-foreground">
          {title}
        </span>
        <span className="mt-0.5 block truncate text-xs text-muted-foreground">
          {meta}
        </span>
      </span>
      <span className="flex shrink-0 flex-col items-end gap-1">
        <MoneyDisplay amount={amount} type={type} size="sm" className="text-[15px]" />
        {trailing ?? (
          <span className="text-[11px] font-medium text-muted-foreground">
            {isIncome ? "รายรับ" : "รายจ่าย"}
          </span>
        )}
      </span>
    </>
  );
  const rowClass =
    "flex min-h-16 w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted focus-visible:bg-muted";
  if (href) {
    return (
      <Link href={href} className={rowClass} aria-label={ariaLabel}>
        {content}
      </Link>
    );
  }
  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={rowClass}
        aria-label={ariaLabel}
      >
        {content}
      </button>
    );
  }
  return <div className={rowClass}>{content}</div>;
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
    className={`min-h-11 shrink-0 whitespace-nowrap rounded-xl border px-3.5 py-2 text-[13px] transition-colors ${
      active
        ? "border-accent-border bg-accent font-semibold text-primary-strong"
        : "border-border bg-white font-medium text-foreground-soft hover:bg-muted"
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
          className="min-h-11 w-full pl-9 pr-4 py-2.5 rounded-xl bg-white border border-border text-base md:text-sm text-foreground placeholder-muted-foreground focus:border-primary focus-visible:ring-2 focus-visible:ring-primary/30"
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
        ? "rounded-xl border border-border bg-white px-3.5 py-2 text-foreground-soft hover:bg-muted"
        : "text-foreground-soft hover:text-foreground"
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
      <DialogContent className="max-w-sm bg-card border-border rounded-2xl p-6 text-foreground">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-foreground-soft">
            {title}
          </DialogTitle>
          <DialogDescription className="text-sm text-foreground-soft leading-relaxed">
            {description}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex gap-2 pt-4">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
            className="min-h-11 flex-1 rounded-xl bg-card text-foreground font-semibold text-sm border border-border hover:bg-muted"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`min-h-11 flex-1 rounded-xl text-white font-semibold text-sm transition-colors ${
              variant === "danger"
                ? "bg-destructive hover:bg-destructive-strong"
                : "bg-primary hover:bg-primary-strong"
            }`}
          >
            {isLoading ? "กำลังดำเนินการ..." : confirmText}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
