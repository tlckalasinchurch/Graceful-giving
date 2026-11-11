import React from "react";
import { Illustration } from "@/components/Illustration";
import { ArrowLeft, ChevronLeft, ChevronRight, Search } from "lucide-react";
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
    <div className={`space-y-3 w-full ${className}`}>
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={idx}
          className={`w-full ${height} flex animate-pulse items-center gap-4 rounded-2xl border-2 border-line bg-surface p-4 shadow-[2px_2px_0_var(--line)]`}
        >
          <div className="size-12 shrink-0 rounded-xl bg-paper-2 border border-line" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-1/3 rounded-md bg-paper-2" />
            <div className="h-3 w-1/2 rounded-md bg-ground" />
          </div>
          <div className="h-7 w-20 rounded-lg bg-paper-2" />
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
      className={`dot-grid flex flex-col items-center justify-center space-y-4 rounded-2xl border-2 border-dashed border-[var(--ink)]/35 bg-surface px-6 py-12 text-center ${className}`}
    >
      <div className="flex size-20 items-center justify-center rounded-2xl border-2 border-[var(--ink)] bg-accent shadow-[4px_4px_0_var(--ink)]">
        <Illustration
          src={illustrationSrc}
          alt={illustrationAlt}
          className="size-12 shrink-0 rounded-xl object-cover"
          width={48}
          height={48}
        />
      </div>
      <div className="max-w-sm space-y-1.5">
        <h3 className="display text-xl text-ink">{title}</h3>
        <p className="text-base leading-relaxed text-ink-3">{description}</p>
      </div>
      {actionText && onAction && (
        <button
          onClick={onAction}
          className="btn-primary mt-2 min-h-12 rounded-xl px-5 py-2.5 text-base font-bold focus-visible:ring-2 focus-visible:ring-brand"
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
    className={`flex flex-col items-center justify-center space-y-4 rounded-2xl border-2 border-danger bg-surface px-6 py-10 text-center shadow-[4px_4px_0_var(--danger)] ${className}`}
    role="alert"
  >
    <div className="max-w-sm space-y-1.5">
      <h3 className="display text-xl text-danger">{title}</h3>
      <p className="text-base leading-relaxed text-ink-2">{description}</p>
    </div>
    {onRetry && (
      <button
        type="button"
        onClick={onRetry}
        className="btn-destructive min-h-12 rounded-xl px-5 py-2.5 text-base font-bold"
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
          bg: "bg-income text-white border-[var(--ink)]",
          defaultLabel: "อนุมัติแล้ว",
        };
      case "active":
        return {
          bg: "bg-income text-white border-[var(--ink)]",
          defaultLabel: "ใช้งานอยู่",
        };
      case "rejected":
        return {
          bg: "bg-coral text-white border-[var(--ink)]",
          defaultLabel: "ปฏิเสธ / ยกเลิก",
        };
      case "inactive":
        return {
          bg: "bg-paper-2 text-ink-2 border-line",
          defaultLabel: "ปิดใช้งาน",
        };
      case "draft":
        return {
          bg: "bg-paper-2 text-ink-2 border-line",
          defaultLabel: "ฉบับร่าง",
        };
      case "submitted":
        return {
          bg: "bg-accent-lime text-accent-lime-ink border-[var(--ink)]",
          defaultLabel: "ส่งตรวจสอบแล้ว",
        };
      case "needs_review":
        return {
          bg: "bg-coral text-white border-[var(--ink)]",
          defaultLabel: "ต้องตรวจสอบ",
        };
      case "unknown":
        return {
          bg: "bg-paper-2 text-ink-2 border-line",
          defaultLabel: "ไม่ทราบสถานะ",
        };
      case "voided":
        return {
          bg: "bg-paper-2 text-ink-3 border-line",
          defaultLabel: "ยกเลิกรายการ",
        };
      case "counting":
        return {
          bg: "bg-accent-lime text-accent-lime-ink border-[var(--ink)]",
          defaultLabel: "กำลังนับ",
        };
      case "counted":
        return {
          bg: "bg-income text-white border-[var(--ink)]",
          defaultLabel: "รอตรวจสอบ",
        };
      case "verified":
        return {
          bg: "bg-income text-white border-[var(--ink)]",
          defaultLabel: "ตรวจสอบแล้ว",
        };
      case "posted":
        return {
          bg: "bg-income text-white border-[var(--ink)]",
          defaultLabel: "ลงบัญชีแล้ว",
        };
      case "closed":
        return {
          bg: "bg-paper-2 text-ink-2 border-line",
          defaultLabel: "ปิดรอบแล้ว",
        };
      case "pending":
      default:
        return {
          bg: "bg-tile-sand text-tile-sand-ink border-[var(--ink)]/30",
          defaultLabel: "รอดำเนินการ",
        };
    }
  };

  const style = getStyle();

  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap px-3 py-1 rounded-lg text-xs font-bold border ${style.bg} ${className}`}
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
  size?: "sm" | "base" | "md" | "lg" | "xl";
  className?: string;
}> = ({ amount, type = "neutral", size = "md", className = "" }) => {
  const getColor = () => {
    if (type === "income") return "text-income";
    if (type === "expense") return "text-danger";
    if (type === "neutral" && amount < 0) return "text-danger";
    return "text-ink";
  };

  const SIZES = {
    sm: { whole: "text-base font-bold", satang: "text-xs" },
    base: { whole: "text-lg font-bold", satang: "text-sm" },
    md: { whole: "text-xl md:text-2xl font-bold", satang: "text-base" },
    lg: {
      whole: "text-2xl sm:text-3xl md:text-4xl font-extrabold",
      satang: "text-lg",
    },
    xl: {
      whole: "text-3xl sm:text-4xl md:text-5xl font-extrabold",
      satang: "text-xl",
    },
  } as const;
  const sizeStyle = SIZES[size];

  const prefix =
    type === "income" ? "+" : type === "expense" ? "−" : amount < 0 ? "−" : "";
  const formatted = formatAmount(Math.abs(amount));
  const dot = formatted.lastIndexOf(".");
  const whole = dot === -1 ? formatted : formatted.slice(0, dot);
  const satang = dot === -1 ? "" : formatted.slice(dot);
  const satangColor = type === "income" ? "" : "text-ink-3";

  return (
    <span
      className={`money whitespace-nowrap font-sans ${getColor()} ${sizeStyle.whole} ${className}`}
    >
      {prefix}
      <span className="mr-1">฿</span>
      {whole}
      {satang && (
        <span className={`${sizeStyle.satang} ${satangColor}`}>{satang}</span>
      )}
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
      className={`flex flex-col justify-between gap-4 sm:flex-row sm:items-end ${className}`}
    >
      <div className="min-w-0">
        <h1 className="display text-[clamp(1.85rem,4.2vw,2.65rem)] leading-[1.14] text-ink break-words">
          {title}
        </h1>
        <span className="title-rule mt-3" aria-hidden="true" />
        {subtitle && (
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-ink-2">
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

export const Chip: React.FC<
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    active?: boolean;
    count?: number;
    /** "brand" fills the chosen chip with the brand colour (form pickers).
     *  "quiet" marks it by tone and edge only (filters), so colour stays on
     *  data and the one primary action. */
    variant?: "brand" | "quiet";
  }
> = ({
  active = false,
  count,
  variant = "brand",
  className = "",
  children,
  ...props
}) => (
  <button
    type="button"
    aria-pressed={active}
    className={`min-h-11 shrink-0 whitespace-nowrap rounded-xl border px-4 py-2 text-sm transition-all ${
      active
        ? variant === "quiet"
          ? "border-2 border-[var(--ink)] bg-accent font-bold text-accent-foreground"
          : "border-2 border-[var(--ink)] bg-brand font-bold text-white shadow-[2px_2px_0_var(--ink)]"
        : "border-line bg-surface font-semibold text-ink-2 hover:border-[var(--ink)] hover:bg-ground hover:text-ink"
    } ${className}`}
    {...props}
  >
    {children}
    {count !== undefined && (
      <span
        className={`money ml-1.5 font-medium ${active ? (variant === "quiet" ? "text-accent-lime-ink/80" : "text-white/90") : "text-ink-3"}`}
      >
        {count}
      </span>
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
          className="pointer-events-none w-5 h-5 text-ink-3 absolute left-4 top-1/2 -translate-y-1/2"
          aria-hidden="true"
        />
        <input
          type="search"
          aria-label={searchPlaceholder}
          value={searchValue}
          onChange={e => onSearchChange(e.target.value)}
          placeholder={searchPlaceholder}
          className="min-h-12 w-full rounded-xl border-2 border-line bg-surface py-2.5 pl-11 pr-4 text-base text-ink transition-colors placeholder-ink-3 hover:border-[var(--ink)]/40 focus:border-brand focus-visible:ring-2 focus-visible:ring-brand/25"
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
                variant="quiet"
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

export const BackLink: React.FC<{
  label: string;
  onClick: () => void;
  variant?: "pill" | "plain";
  className?: string;
}> = ({ label, onClick, variant = "pill", className = "" }) => (
  <button
    type="button"
    onClick={onClick}
    className={`min-h-11 inline-flex items-center gap-1.5 text-sm font-bold transition-all ${
      variant === "pill"
        ? "btn-secondary rounded-xl px-4 py-2"
        : "text-ink-2 hover:text-brand"
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
      <DialogContent className="max-w-sm rounded-2xl border-2 border-[var(--ink)] bg-surface p-6 text-ink shadow-[6px_6px_0_var(--ink)]">
        <DialogHeader>
          <DialogTitle className="display text-xl text-ink">
            {title}
          </DialogTitle>
          <DialogDescription className="text-base leading-relaxed text-ink-2">
            {description}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex gap-2.5 pt-4">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
            className="btn-secondary min-h-12 flex-1 rounded-xl py-2.5 text-sm font-bold"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`min-h-12 flex-1 rounded-xl py-2.5 text-sm font-bold transition-all ${
              variant === "danger" ? "btn-destructive" : "btn-primary"
            }`}
          >
            {isLoading ? "กำลังดำเนินการ..." : confirmText}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ─── Ledger pagination ───────────────────────────────────────────────────────

export const LedgerPagination: React.FC<{
  /** Zero for the first page. */
  pageIndex: number;
  totalCount: number;
  pageSize?: number;
  hasPrev: boolean;
  hasNext: boolean;
  loading?: boolean;
  onPrev: () => void;
  onNext: () => void;
  className?: string;
}> = ({
  pageIndex,
  totalCount,
  pageSize = 50,
  hasPrev,
  hasNext,
  loading = false,
  onPrev,
  onNext,
  className = "",
}) => {
  if (totalCount <= 0) return null;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const buttonClass =
    "btn-secondary inline-flex min-h-11 items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold disabled:cursor-not-allowed disabled:opacity-40";
  return (
    <nav
      aria-label="เปลี่ยนหน้ารายการ"
      className={`flex flex-col items-center justify-between gap-3 text-xs font-medium text-ink-2 sm:flex-row ${className}`}
    >
      <p aria-live="polite">
        แสดงหน้า{" "}
        <span className="font-extrabold text-ink">{pageIndex + 1}</span> จาก{" "}
        <span className="font-extrabold text-ink">{totalPages}</span> หน้า
        (ข้อมูลทั้งหมด{" "}
        <span className="font-extrabold text-ink">
          {totalCount.toLocaleString()}
        </span>{" "}
        รายการ)
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onPrev}
          disabled={!hasPrev || loading}
          className={buttonClass}
        >
          <ChevronLeft className="size-4" aria-hidden="true" />
          <span>ก่อนหน้า</span>
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={!hasNext || loading}
          className={buttonClass}
        >
          <span>ถัดไป</span>
          <ChevronRight className="size-4" aria-hidden="true" />
        </button>
      </div>
    </nav>
  );
};
