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
    <div className={`space-y-3.5 w-full ${className}`}>
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={idx}
          className={`w-full ${height} rounded-3xl bg-surface animate-pulse border border-line p-4 flex items-center gap-4`}
        >
          <div className="w-14 h-14 rounded-2xl bg-paper-2 shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="w-1/3 h-4 rounded-lg bg-paper-2" />
            <div className="w-1/2 h-3 rounded-lg bg-paper" />
          </div>
          <div className="w-20 h-6 rounded-xl bg-paper-2" />
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
      className={`py-12 px-6 rounded-3xl bg-surface fintech-card flex flex-col items-center justify-center text-center space-y-4 ${className}`}
    >
      <div className="size-20 rounded-2xl overflow-hidden bg-tile-lilac p-1 shadow-xs shrink-0">
        <Illustration
          src={illustrationSrc}
          alt={illustrationAlt}
          className="w-full h-full object-cover rounded-xl"
          width={80}
          height={80}
        />
      </div>
      <div className="space-y-1 max-w-sm">
        <h3 className="text-base font-bold text-ink">{title}</h3>
        <p className="text-sm text-ink-3 leading-relaxed">{description}</p>
      </div>
      {actionText && onAction && (
        <button
          onClick={onAction}
          className="min-h-11 mt-2 px-5 py-2.5 rounded-2xl bg-brand hover:bg-brand-ink text-white text-sm font-bold shadow-md shadow-brand/20 transition-all focus-visible:ring-2 focus-visible:ring-brand"
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
    className={`py-12 px-6 rounded-3xl bg-tile-rose/50 border border-rose-500/30 flex flex-col items-center justify-center text-center space-y-4 ${className}`}
    role="alert"
  >
    <div className="w-12 h-12 rounded-2xl bg-tile-rose text-tile-rose-ink flex items-center justify-center text-xl font-bold shadow-2xs">
      !
    </div>
    <div className="space-y-1 max-w-sm">
      <h3 className="text-base font-bold text-tile-rose-ink">{title}</h3>
      <p className="text-sm text-ink-2 leading-relaxed">{description}</p>
    </div>
    {onRetry && (
      <button
        type="button"
        onClick={onRetry}
        className="min-h-11 rounded-2xl bg-danger hover:opacity-90 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition-all"
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
          bg: "bg-tile-mint text-tile-mint-ink border-emerald-500/30",
          defaultLabel: "อนุมัติแล้ว",
        };
      case "active":
        return {
          bg: "bg-tile-mint text-tile-mint-ink border-emerald-500/30",
          defaultLabel: "ใช้งานอยู่",
        };
      case "rejected":
        return {
          bg: "bg-tile-rose text-tile-rose-ink border-rose-500/30",
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
          bg: "bg-tile-sky text-tile-sky-ink border-sky-500/30",
          defaultLabel: "ส่งตรวจสอบแล้ว",
        };
      case "needs_review":
        return {
          bg: "bg-tile-peach text-tile-peach-ink border-orange-500/30",
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
          bg: "bg-tile-sand text-tile-sand-ink border-amber-500/30",
          defaultLabel: "กำลังนับ",
        };
      case "counted":
        return {
          bg: "bg-tile-sky text-tile-sky-ink border-sky-500/30",
          defaultLabel: "รอตรวจสอบ",
        };
      case "verified":
        return {
          bg: "bg-tile-lilac text-tile-lilac-ink border-purple-500/30",
          defaultLabel: "ตรวจสอบแล้ว",
        };
      case "posted":
        return {
          bg: "bg-brand text-white border-brand",
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
          bg: "bg-tile-sand text-tile-sand-ink border-amber-500/30",
          defaultLabel: "รอดำเนินการ",
        };
    }
  };

  const style = getStyle();

  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap px-3 py-1 rounded-full text-xs font-bold border ${style.bg} ${className}`}
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
    if (type === "neutral" && amount < 0) return "text-danger";
    return "text-ink";
  };

  const SIZES = {
    sm: { whole: "text-sm font-bold", satang: "" },
    base: { whole: "text-base font-bold", satang: "text-sm" },
    md: { whole: "text-lg md:text-xl font-bold", satang: "text-sm" },
    lg: { whole: "text-2xl md:text-3xl font-extrabold", satang: "text-base" },
    xl: { whole: "text-3xl md:text-4xl font-extrabold", satang: "text-xl" },
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
      className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-surface rounded-3xl p-5 md:p-6 fintech-card ${className}`}
    >
      <div className="min-w-0">
        <h1 className="text-xl md:text-2xl font-extrabold text-ink tracking-tight break-words">
          {title}
        </h1>
        {subtitle && (
          <p className="text-xs text-ink-3 mt-1 leading-relaxed">{subtitle}</p>
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
  }
> = ({ active = false, count, className = "", children, ...props }) => (
  <button
    type="button"
    aria-pressed={active}
    className={`min-h-11 shrink-0 whitespace-nowrap rounded-2xl border px-4 py-2 text-sm transition-all ${
      active
        ? "border-brand bg-brand font-bold text-white shadow-sm shadow-brand/20"
        : "border-line bg-surface font-semibold text-ink-2 hover:bg-paper hover:text-ink"
    } ${className}`}
    {...props}
  >
    {children}
    {count !== undefined && (
      <span
        className={`money ml-1.5 font-medium ${active ? "text-white/90" : "text-ink-3"}`}
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
          className="pointer-events-none w-4 h-4 text-ink-3 absolute left-4 top-1/2 -translate-y-1/2"
          aria-hidden="true"
        />
        <input
          type="search"
          aria-label={searchPlaceholder}
          value={searchValue}
          onChange={e => onSearchChange(e.target.value)}
          placeholder={searchPlaceholder}
          className="min-h-11 w-full pl-10 pr-4 py-2.5 rounded-2xl bg-surface border border-line shadow-2xs text-base md:text-sm text-ink placeholder-ink-3 focus:border-brand focus-visible:ring-2 focus-visible:ring-brand/30"
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

export const BackLink: React.FC<{
  label: string;
  onClick: () => void;
  variant?: "pill" | "plain";
  className?: string;
}> = ({ label, onClick, variant = "pill", className = "" }) => (
  <button
    type="button"
    onClick={onClick}
    className={`min-h-11 inline-flex items-center gap-1.5 text-sm font-semibold transition-all ${
      variant === "pill"
        ? "rounded-2xl border border-line bg-surface px-4 py-2 text-ink shadow-2xs hover:bg-paper"
        : "text-ink-2 hover:text-ink"
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
      <DialogContent className="max-w-sm bg-surface border-line rounded-3xl p-6 text-ink shadow-xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-extrabold text-ink">
            {title}
          </DialogTitle>
          <DialogDescription className="text-sm text-ink-2 leading-relaxed">
            {description}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex gap-2 pt-4">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
            className="flex-1 py-2.5 rounded-2xl bg-paper text-ink-2 font-bold text-xs border border-line hover:bg-paper-2"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`flex-1 py-2.5 rounded-2xl text-white font-bold text-xs button-elevation transition-all ${
              variant === "danger"
                ? "bg-danger hover:opacity-90"
                : "bg-brand hover:bg-brand-ink"
            }`}
          >
            {isLoading ? "กำลังดำเนินการ..." : confirmText}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
