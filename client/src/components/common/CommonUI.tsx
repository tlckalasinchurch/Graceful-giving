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
          data-slot="skeleton"
          className={`w-full ${height} flex items-center gap-4 rounded-[20px] border border-line bg-surface p-4`}
        >
          <div className="size-11 shrink-0 rounded-xl bg-paper-2" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-1/3 rounded-md bg-paper-2" />
            <div className="h-3 w-1/2 rounded-md bg-ground" />
          </div>
          <div className="h-6 w-20 rounded-lg bg-paper-2" />
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
      className={`flex flex-col items-center justify-center space-y-4 rounded-[20px] border border-dashed border-line bg-surface px-6 py-12 text-center ${className}`}
    >
      <div className="flex size-16 items-center justify-center rounded-2xl bg-paper-2">
        <Illustration
          src={illustrationSrc}
          alt={illustrationAlt}
          className="size-11 shrink-0 rounded-xl object-cover"
          width={44}
          height={44}
        />
      </div>
      <div className="max-w-sm space-y-1.5">
        <h3 className="display text-lg text-ink">{title}</h3>
        <p className="text-sm leading-relaxed text-ink-3">{description}</p>
      </div>
      {actionText && onAction && (
        <button
          onClick={onAction}
          className="btn-primary mt-1 min-h-11 rounded-xl px-5 py-2.5 text-sm font-semibold focus-visible:ring-2 focus-visible:ring-brand"
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
    className={`flex flex-col items-center justify-center space-y-4 rounded-[20px] border border-danger/30 bg-surface px-6 py-10 text-center ${className}`}
    role="alert"
  >
    <div className="max-w-sm space-y-1.5">
      <h3 className="display text-lg text-danger">{title}</h3>
      <p className="text-sm leading-relaxed text-ink-2">{description}</p>
    </div>
    {onRetry && (
      <button
        type="button"
        onClick={onRetry}
        className="btn-destructive min-h-11 rounded-xl px-5 py-2.5 text-sm font-semibold"
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
          bg: "bg-tile-mint text-tile-mint-ink",
          defaultLabel: "อนุมัติแล้ว",
        };
      case "active":
        return {
          bg: "bg-tile-mint text-tile-mint-ink",
          defaultLabel: "ใช้งานอยู่",
        };
      case "rejected":
        return {
          bg: "bg-tile-rose text-tile-rose-ink",
          defaultLabel: "ปฏิเสธ / ยกเลิก",
        };
      case "inactive":
        return {
          bg: "bg-paper-2 text-ink-2",
          defaultLabel: "ปิดใช้งาน",
        };
      case "draft":
        return {
          bg: "bg-paper-2 text-ink-2",
          defaultLabel: "ฉบับร่าง",
        };
      case "submitted":
        return {
          bg: "bg-tile-sky text-tile-sky-ink",
          defaultLabel: "ส่งตรวจสอบแล้ว",
        };
      case "needs_review":
        return {
          bg: "bg-tile-rose text-tile-rose-ink",
          defaultLabel: "ต้องตรวจสอบ",
        };
      case "unknown":
        return {
          bg: "bg-paper-2 text-ink-2",
          defaultLabel: "ไม่ทราบสถานะ",
        };
      case "voided":
        return {
          bg: "bg-paper-2 text-ink-3",
          defaultLabel: "ยกเลิกรายการ",
        };
      case "counting":
        return {
          bg: "bg-tile-sand text-tile-sand-ink",
          defaultLabel: "กำลังนับ",
        };
      case "counted":
        return {
          bg: "bg-tile-sky text-tile-sky-ink",
          defaultLabel: "รอตรวจสอบ",
        };
      case "verified":
        return {
          bg: "bg-tile-mint text-tile-mint-ink",
          defaultLabel: "ตรวจสอบแล้ว",
        };
      case "posted":
        return {
          bg: "bg-tile-mint text-tile-mint-ink",
          defaultLabel: "ลงบัญชีแล้ว",
        };
      case "closed":
        return {
          bg: "bg-paper-2 text-ink-2",
          defaultLabel: "ปิดรอบแล้ว",
        };
      case "pending":
      default:
        return {
          bg: "bg-tile-sand text-tile-sand-ink",
          defaultLabel: "รอดำเนินการ",
        };
    }
  };

  const style = getStyle();

  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap px-2.5 py-0.5 rounded-full text-xs font-medium ${style.bg} ${className}`}
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
    if (type === "expense") return "text-ink";
    if (type === "neutral" && amount < 0) return "text-danger";
    return "text-ink";
  };

  const SIZES = {
    sm: { whole: "text-base font-semibold", satang: "text-xs" },
    base: { whole: "text-lg font-semibold", satang: "text-sm" },
    md: { whole: "text-xl md:text-2xl font-semibold", satang: "text-base" },
    lg: {
      whole: "text-2xl sm:text-3xl font-bold",
      satang: "text-lg",
    },
    xl: {
      whole: "text-3xl sm:text-4xl font-bold",
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
        <h1 className="display text-[clamp(1.5rem,3vw,2rem)] leading-[1.2] text-ink break-words">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-1.5 max-w-2xl text-sm sm:text-base leading-relaxed text-ink-2">
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
    className={`min-h-10 shrink-0 whitespace-nowrap rounded-full border px-4 py-1.5 text-sm transition-colors ${
      active
        ? variant === "quiet"
          ? "border-ink/25 bg-paper-2 font-semibold text-ink"
          : "border-transparent bg-brand font-semibold text-white"
        : "border-line bg-surface font-medium text-ink-2 hover:border-[var(--field)] hover:bg-ground hover:text-ink"
    } ${className}`}
    {...props}
  >
    {children}
    {count !== undefined && (
      <span
        className={`money ml-1.5 font-medium ${active ? (variant === "quiet" ? "text-ink-2" : "text-white/90") : "text-ink-3"}`}
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
          className="pointer-events-none w-4.5 h-4.5 text-ink-3 absolute left-3.5 top-1/2 -translate-y-1/2"
          aria-hidden="true"
        />
        <input
          type="search"
          aria-label={searchPlaceholder}
          value={searchValue}
          onChange={e => onSearchChange(e.target.value)}
          placeholder={searchPlaceholder}
          className="min-h-11 w-full rounded-xl border border-line bg-surface py-2 pl-10 pr-4 text-base text-ink transition-colors placeholder-ink-3 hover:border-[var(--field)] focus:border-brand focus-visible:ring-2 focus-visible:ring-brand/20"
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
    className={`min-h-11 inline-flex items-center gap-1.5 text-sm font-semibold transition-colors ${
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
      <DialogContent className="max-w-sm rounded-[20px] border border-line bg-surface p-6 text-ink shadow-xl">
        <DialogHeader>
          <DialogTitle className="display text-xl text-ink">
            {title}
          </DialogTitle>
          <DialogDescription className="text-sm sm:text-base leading-relaxed text-ink-2">
            {description}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex gap-2.5 pt-4">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
            className="btn-secondary min-h-11 flex-1 rounded-xl py-2.5 text-sm font-semibold"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`min-h-11 flex-1 rounded-xl py-2.5 text-sm font-semibold transition-colors ${
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
