import React from "react";
import { Illustration } from "@/components/Illustration";
import {
  AlertTriangle,
  Archive,
  ArrowDownRight,
  ArrowLeft,
  ArrowUpRight,
  BadgeCheck,
  Ban,
  BookCheck,
  CheckCircle2,
  Clock,
  Copy,
  Eye,
  FileText,
  HelpCircle,
  Loader2,
  Lock,
  Megaphone,
  Minus,
  MinusCircle,
  PencilLine,
  Plus,
  Search,
  Send,
  XCircle,
  type LucideIcon,
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

/**
 * Hover and press physics shared by every raised card and button: the
 * element lifts 2px with a softer, wider shadow on hover and presses in to
 * 98% on tap. Disabled elements keep still.
 */
export const tactile =
  "transition-all duration-200 ease-in-out enabled:hover:-translate-y-0.5 enabled:hover:shadow-md enabled:active:translate-y-0 enabled:active:scale-[0.98] motion-reduce:hover:translate-y-0";

/** Hover lift for cards that show data but are not clickable. */
export const tactileCard =
  "transition-all duration-200 ease-in-out hover:-translate-y-0.5 hover:shadow-md motion-reduce:hover:translate-y-0";

/** Lift and press for clickable cards and links (no disabled state). */
export const tactileLink = `${tactileCard} active:translate-y-0 active:scale-[0.98]`;

// ─── 1. Loading Skeleton ─────────────────────────────────────────────────────

export const LoadingSkeleton: React.FC<{
  count?: number;
  height?: string;
  className?: string;
}> = ({ count = 3, height = "h-24", className = "" }) => {
  return (
    <div
      role="status"
      aria-label="กำลังโหลดข้อมูล"
      className={`space-y-3 w-full ${className}`}
    >
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={idx}
          aria-hidden="true"
          className={`w-full ${height} rounded-2xl bg-card animate-pulse border border-[#E7DCC8] shadow-xs p-4 sm:p-5 flex items-center gap-4`}
        >
          <div className="size-11 rounded-xl bg-[#F1E6D2] shrink-0" />
          <div className="flex-1 space-y-2.5">
            <div className="w-1/3 h-4 rounded-full bg-[#F1E6D2]" />
            <div className="w-1/2 h-3 rounded-full bg-[#F5EDE0]" />
          </div>
          <div className="w-24 h-5 rounded-full bg-[#F1E6D2]" />
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
  /** Draws a warm icon badge in place of the photo illustration. */
  icon?: LucideIcon;
  actionText?: string;
  onAction?: () => void;
  className?: string;
}> = ({
  title,
  description,
  illustrationSrc = "/illustrations/offering_box.jpg",
  illustrationAlt = "กล่องถวาย",
  icon: Icon,
  actionText,
  onAction,
  className = "",
}) => {
  return (
    <div
      className={`py-12 px-6 rounded-2xl bg-card border border-dashed border-[#E0CFB3] flex flex-col items-center justify-center text-center gap-4 ${className}`}
    >
      {Icon ? (
        <div className="size-16 rounded-2xl bg-[#FFF4D6] border border-[#F9D2AE] text-[#C94F16] flex items-center justify-center shrink-0">
          <Icon className="size-7" aria-hidden="true" />
        </div>
      ) : (
        <div className="size-20 rounded-2xl overflow-hidden bg-[#FFF4D6] border border-[#E7DCC8] p-1 shrink-0">
          <Illustration
            src={illustrationSrc}
            alt={illustrationAlt}
            className="w-full h-full object-cover rounded-xl"
            width={80}
            height={80}
          />
        </div>
      )}
      <div className="space-y-1.5 max-w-sm">
        <h3 className="text-base font-semibold text-[#171311]">{title}</h3>
        <p className="text-sm text-[#51443A] leading-relaxed">{description}</p>
      </div>
      {actionText && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="min-h-11 mt-1 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#C94F16] hover:bg-[#9F3B0F] active:scale-[0.98] text-white text-sm font-semibold shadow-xs hover:shadow-sm transition-all duration-200 ease-in-out focus-visible:ring-2 focus-visible:ring-[#C94F16] focus-visible:ring-offset-2"
        >
          <Plus className="size-4" aria-hidden="true" />
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
    className={`py-12 px-6 rounded-2xl bg-[#FEECEB]/60 border border-[#F8C8C5] flex flex-col items-center justify-center text-center gap-4 ${className}`}
    role="alert"
  >
    <div className="w-12 h-12 rounded-full bg-[#FEECEB] border border-[#F8C8C5] text-[#C8372D] flex items-center justify-center text-xl font-bold">
      !
    </div>
    <div className="space-y-1 max-w-sm">
      <h3 className="text-base font-bold text-[#C8372D]">{title}</h3>
      <p className="text-sm text-[#51443A] leading-relaxed">{description}</p>
    </div>
    {onRetry && (
      <button
        type="button"
        onClick={onRetry}
        className="min-h-11 rounded-xl bg-[#C8372D] hover:bg-[#A92D24] active:scale-[0.98] px-5 py-2.5 text-sm font-semibold text-white shadow-xs transition-all duration-200 ease-in-out"
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

/**
 * Four visual tones. Each tone pairs a tint, a border, a text colour and a
 * dot, so two statuses in different tones never look alike even in a dense
 * table. The dot of a live tone (success, pending) has a soft halo.
 */
const STATUS_TONES = {
  success: {
    pill: "bg-[#E8F5E9] border-[#C8E6C9] text-[#1B5E20]",
    dot: "bg-[#2E7D32] shadow-[0_0_0_3px_rgba(46,125,50,0.18)]",
  },
  pending: {
    pill: "bg-[#FEF3C7] border-[#FDE68A] text-[#92400E]",
    dot: "bg-[#F59E0B] shadow-[0_0_0_3px_rgba(245,158,11,0.22)]",
  },
  draft: {
    pill: "bg-[#F4F1ED] border-[#E4DED7] text-[#57504A]",
    dot: "bg-[#A39A91]",
  },
  danger: {
    pill: "bg-[#FEECEB] border-[#F8C8C5] text-[#C8372D]",
    dot: "bg-[#C8372D]",
  },
} as const;

type StatusTone = keyof typeof STATUS_TONES;

const STATUS_MAP: Record<
  string,
  { tone: StatusTone; label: string; icon: LucideIcon }
> = {
  approved: { tone: "success", label: "อนุมัติแล้ว", icon: CheckCircle2 },
  completed: { tone: "success", label: "อนุมัติแล้ว", icon: CheckCircle2 },
  active: { tone: "success", label: "ใช้งานอยู่", icon: CheckCircle2 },
  verified: { tone: "success", label: "ตรวจสอบแล้ว", icon: BadgeCheck },
  posted: { tone: "success", label: "ลงบัญชีแล้ว", icon: BookCheck },
  pending: { tone: "pending", label: "รอดำเนินการ", icon: Clock },
  submitted: { tone: "pending", label: "ส่งตรวจสอบแล้ว", icon: Send },
  needs_review: { tone: "pending", label: "ต้องตรวจสอบ", icon: Eye },
  counting: { tone: "pending", label: "กำลังนับ", icon: Clock },
  counted: { tone: "pending", label: "รอตรวจสอบ", icon: Eye },
  draft: { tone: "draft", label: "ฉบับร่าง", icon: PencilLine },
  inactive: { tone: "draft", label: "ปิดใช้งาน", icon: MinusCircle },
  unknown: { tone: "draft", label: "ไม่ทราบสถานะ", icon: HelpCircle },
  closed: { tone: "draft", label: "ปิดรอบแล้ว", icon: Lock },
  rejected: { tone: "danger", label: "ปฏิเสธ / ยกเลิก", icon: XCircle },
  voided: { tone: "danger", label: "ยกเลิกรายการ", icon: Ban },
  // LINE slip inbox
  processing: { tone: "pending", label: "กำลังอ่านสลิป", icon: Loader2 },
  extracted: { tone: "draft", label: "อ่านข้อมูลแล้ว", icon: FileText },
  matched: { tone: "success", label: "พร้อมอนุมัติ", icon: BadgeCheck },
  duplicate: { tone: "draft", label: "สลิปซ้ำ", icon: Copy },
  failed: { tone: "danger", label: "อ่านสลิปล้มเหลว", icon: AlertTriangle },
  // News and events
  published: { tone: "success", label: "เผยแพร่แล้ว", icon: Megaphone },
  cancelled: { tone: "danger", label: "ยกเลิก", icon: XCircle },
  archived: { tone: "draft", label: "เก็บถาวร", icon: Archive },
};

export const StatusBadge: React.FC<{
  status: StatusType | string;
  label?: string;
  className?: string;
}> = ({ status, label, className = "" }) => {
  const entry = STATUS_MAP[status] ?? STATUS_MAP.pending;
  const tone = STATUS_TONES[entry.tone];
  const Icon = entry.icon;

  return (
    <span
      data-tone={entry.tone}
      className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border py-0.5 pl-2 pr-2.5 text-xs font-semibold leading-5 ${tone.pill} ${className}`}
    >
      <span
        className={`size-1.5 shrink-0 rounded-full ${tone.dot}`}
        aria-hidden="true"
      />
      <Icon className="size-3.5 shrink-0" aria-hidden="true" />
      <span>{label || entry.label}</span>
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
    if (type === "income") return "text-[#2D6A2E]";
    if (type === "expense") return "text-[#C8372D]";
    return "text-[#171311]";
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
      className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card rounded-2xl p-5 md:p-6 border border-[#E7DCC8] shadow-xs ${className}`}
    >
      <div className="min-w-0">
        <h1 className="text-xl md:text-2xl font-bold text-[#171311] tracking-tight break-words">
          {title}
        </h1>
        {subtitle && (
          <p className="text-sm text-[#51443A] mt-1 leading-relaxed max-w-2xl">
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
    className={`min-h-11 shrink-0 whitespace-nowrap rounded-full border px-4 py-2 text-[13px] tabular-nums ${tactile} ${
      active
        ? "border-[#C94F16] bg-[#C94F16] font-semibold text-white shadow-sm ring-4 ring-[#C94F16]/15"
        : "border-[#E7DCC8] bg-white font-medium text-[#51443A] hover:border-[#C94F16]/40 hover:bg-[#FFF4D6] hover:text-[#171311]"
    } ${className}`}
    {...props}
  >
    {children}
    {count !== undefined && (
      <span className="ml-1.5 tabular-nums opacity-70">{count}</span>
    )}
  </button>
);

// ─── 6b. Segmented Control ───────────────────────────────────────────────────

export type SegmentOption = {
  id: string;
  label: string;
  count?: number;
  icon?: LucideIcon;
};

/**
 * Tabs drawn as one recessed cream track with a white "thumb" that slides
 * under the selected option. The thumb is measured from the selected
 * button, so labels of any length work, and the track scrolls sideways
 * when the options do not fit (Expenses has nine categories).
 */
export function SegmentedControl({
  options,
  value,
  onChange,
  ariaLabel,
  className = "",
  size = "md",
}: {
  options: SegmentOption[];
  value: string;
  onChange: (id: string) => void;
  ariaLabel: string;
  className?: string;
  size?: "md" | "sm";
}) {
  const trackRef = React.useRef<HTMLDivElement>(null);
  const [thumb, setThumb] = React.useState<{ left: number; width: number }>();

  React.useLayoutEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const measure = () => {
      const active = track.querySelector<HTMLElement>('[aria-selected="true"]');
      if (active)
        setThumb({ left: active.offsetLeft, width: active.offsetWidth });
    };
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(measure);
    ro.observe(track);
    return () => ro.disconnect();
  }, [value, options]);

  return (
    <div className={`-m-1 overflow-x-auto p-1 no-scrollbar ${className}`}>
      <div
        ref={trackRef}
        role="tablist"
        aria-label={ariaLabel}
        className="relative inline-flex min-w-max items-center gap-1 rounded-xl border border-[#E7DCC8] bg-[#F3E9D6] p-1 shadow-[inset_0_1px_2px_rgba(81,68,58,0.08)]"
      >
        {thumb && (
          <span
            aria-hidden="true"
            className="absolute top-1 bottom-1 rounded-lg bg-white shadow-sm ring-1 ring-[#E7DCC8] transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"
            style={{ left: thumb.left, width: thumb.width }}
          />
        )}
        {options.map(option => {
          const selected = option.id === value;
          const Icon = option.icon;
          return (
            <button
              key={option.id}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => onChange(option.id)}
              onFocus={e =>
                e.currentTarget.scrollIntoView({
                  block: "nearest",
                  inline: "nearest",
                })
              }
              className={`relative z-10 inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg px-3.5 text-sm transition-colors duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C94F16] ${
                size === "sm" ? "min-h-9" : "min-h-10"
              } ${
                selected
                  ? "font-semibold text-[#9F3B0F]"
                  : "font-medium text-[#6E6155] hover:text-[#171311]"
              }`}
            >
              {Icon && <Icon className="size-4" aria-hidden="true" />}
              {option.label}
              {option.count !== undefined && (
                <span
                  className={`min-w-5 rounded-full px-1.5 text-center text-[11px] leading-5 tabular-nums ${
                    selected
                      ? "bg-[#FFF4D6] text-[#9F3B0F]"
                      : "bg-white/60 text-[#6E6155]"
                  }`}
                >
                  {option.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

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
          className="pointer-events-none w-4 h-4 text-[#6E6155] absolute left-3.5 top-1/2 -translate-y-1/2"
          aria-hidden="true"
        />
        <input
          type="search"
          aria-label={searchPlaceholder}
          value={searchValue}
          onChange={e => onSearchChange(e.target.value)}
          placeholder={searchPlaceholder}
          className="min-h-11 w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border border-[#E7DCC8] shadow-xs text-base md:text-sm text-[#171311] placeholder-[#6E6155] transition-all duration-200 ease-in-out hover:border-[#D9C6A6] focus:border-[#C94F16] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[#C94F16]/20"
        />
      </div>

      {/* Filter tabs */}
      {filters && filters.length > 0 && onFilterChange && (
        <SegmentedControl
          ariaLabel="กรองรายการ"
          options={filters}
          value={activeFilter ?? filters[0].id}
          onChange={onFilterChange}
        />
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
    className={`min-h-11 inline-flex items-center gap-1.5 text-sm font-medium transition-all duration-200 ease-in-out ${
      variant === "pill"
        ? "rounded-xl border border-[#E7DCC8] bg-white px-3.5 py-2 text-[#51443A] shadow-xs hover:border-[#C94F16]/40 hover:bg-[#FFF4D6] hover:text-[#171311]"
        : "text-[#51443A] hover:text-[#171311]"
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
      <DialogContent className="max-w-sm border-[#E7DCC8] rounded-2xl p-6 text-[#171311]">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-[#171311]">
            {title}
          </DialogTitle>
          <DialogDescription className="text-sm text-[#51443A] leading-relaxed">
            {description}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex gap-2 pt-4">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
            className="flex-1 min-h-11 py-2.5 rounded-xl bg-white text-[#51443A] font-semibold text-sm border border-[#E7DCC8] hover:bg-[#FFF4D6] transition-all duration-200 ease-in-out disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`flex-1 min-h-11 inline-flex items-center justify-center gap-2 py-2.5 rounded-xl text-white font-semibold text-sm shadow-xs transition-all duration-200 ease-in-out active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed ${
              variant === "danger"
                ? "bg-[#C8372D] hover:bg-[#A92D24]"
                : "bg-[#C94F16] hover:bg-[#9F3B0F]"
            }`}
          >
            {isLoading && (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            )}
            {isLoading ? "กำลังดำเนินการ..." : confirmText}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ─── 10. Stat Card ───────────────────────────────────────────────────────────

const STAT_TONES = {
  neutral: {
    card: "border-[#E7DCC8]",
    icon: "bg-[#FFF4D6] text-[#C94F16] border-[#F9D2AE]",
    value: "text-[#171311]",
  },
  income: {
    card: "border-[#C3E4B8]",
    icon: "bg-[#E4F3E7] text-[#2D6A2E] border-[#C3E4B8]",
    value: "text-[#2D6A2E]",
  },
  expense: {
    card: "border-[#F8C8C5]",
    icon: "bg-[#FEECEB] text-[#C8372D] border-[#F8C8C5]",
    value: "text-[#C8372D]",
  },
  primary: {
    card: "border-[#F9D2AE]",
    icon: "bg-[#C94F16] text-white border-[#C94F16]",
    value: "text-[#9F3B0F]",
  },
} as const;

export type StatTone = keyof typeof STAT_TONES;

/**
 * One summary figure: a label, a value and an optional hint line.
 *
 * Summary rows on the list pages (Funds, Budgets, Reports, Counting) each
 * built this box by hand. The tone sets the border, the icon badge and the
 * value colour together, so income always reads green and expense red.
 */
export const StatCard: React.FC<{
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  icon?: LucideIcon;
  tone?: StatTone;
  /** Percent change against the previous period; see TrendBadge. */
  trend?: number | null;
  /** False when a rise is bad news (expenses). */
  trendPositiveIsGood?: boolean;
  className?: string;
}> = ({
  label,
  value,
  hint,
  icon: Icon,
  tone = "neutral",
  trend,
  trendPositiveIsGood = true,
  className = "",
}) => {
  const t = STAT_TONES[tone];
  return (
    <div
      className={`min-w-0 rounded-2xl border bg-card p-5 shadow-xs ${tactileCard} ${t.card} ${className}`}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-[#51443A]">{label}</p>
        {Icon && (
          <span
            className={`flex size-10 shrink-0 items-center justify-center rounded-xl border ${t.icon}`}
          >
            <Icon className="size-5" aria-hidden="true" />
          </span>
        )}
      </div>
      <div
        className={`mt-2 text-2xl font-bold tracking-tight tabular-nums break-words ${t.value}`}
      >
        {value}
      </div>
      {(trend !== undefined || hint) && (
        <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs leading-relaxed text-[#6E6155]">
          {trend !== undefined && (
            <TrendBadge change={trend} positiveIsGood={trendPositiveIsGood} />
          )}
          {hint && <span>{hint}</span>}
        </div>
      )}
    </div>
  );
};

/**
 * Compact pill for a change against the previous period: an arrow and a
 * percentage. Green means good news and red means bad news, so for
 * expenses (positiveIsGood=false) a rise is red and a fall is green.
 */
export const TrendBadge: React.FC<{
  /** Percent change, e.g. 12.5 for +12.5%. null when there is no base. */
  change: number | null;
  positiveIsGood?: boolean;
  className?: string;
}> = ({ change, positiveIsGood = true, className = "" }) => {
  if (change === null || !Number.isFinite(change)) {
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-full border border-[#E4DED7] bg-[#F4F1ED] px-2 py-0.5 text-[11px] font-semibold text-[#57504A] ${className}`}
      >
        <Minus className="size-3" aria-hidden="true" />
        ไม่มีข้อมูลเทียบ
      </span>
    );
  }
  const rounded = Math.round(change);
  const flat = rounded === 0;
  const up = rounded > 0;
  const good = flat ? null : up === positiveIsGood;
  const Icon = flat ? Minus : up ? ArrowUpRight : ArrowDownRight;
  const style =
    good === null
      ? "border-[#E4DED7] bg-[#F4F1ED] text-[#57504A]"
      : good
        ? "border-[#C8E6C9] bg-[#E8F5E9] text-[#1B5E20]"
        : "border-[#F8C8C5] bg-[#FEECEB] text-[#C8372D]";
  return (
    <span
      className={`inline-flex items-center gap-0.5 rounded-full border px-2 py-0.5 text-[11px] font-bold tabular-nums ${style} ${className}`}
      aria-label={`${up ? "เพิ่มขึ้น" : flat ? "คงที่" : "ลดลง"} ${Math.abs(rounded)}% จากเดือนก่อน`}
    >
      <Icon className="size-3.5" aria-hidden="true" />
      {up ? "+" : flat ? "" : "−"}
      {Math.abs(rounded)}%
    </span>
  );
};

/** Placeholder with the same box, padding and rows as StatCard. */
export const StatCardSkeleton: React.FC<{
  count?: number;
  className?: string;
}> = ({ count = 3, className = "" }) => (
  <div
    role="status"
    aria-label="กำลังโหลดข้อมูลสรุป"
    className={`grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 ${className}`}
  >
    {Array.from({ length: count }).map((_, i) => (
      <div
        key={i}
        aria-hidden="true"
        className="animate-pulse rounded-2xl border border-[#E7DCC8] bg-card p-5 shadow-xs"
      >
        <div className="flex items-start justify-between">
          <div className="h-4 w-24 rounded-full bg-[#F1E6D2]" />
          <div className="size-10 rounded-xl bg-[#F1E6D2]" />
        </div>
        <div className="mt-3 h-7 w-32 rounded-full bg-[#F1E6D2]" />
        <div className="mt-2 h-3 w-20 rounded-full bg-[#F5EDE0]" />
      </div>
    ))}
  </div>
);

// ─── 11. Action Button ───────────────────────────────────────────────────────

const ACTION_VARIANTS = {
  primary:
    "bg-[#C94F16] text-white border-[#C94F16] shadow-xs hover:bg-[#9F3B0F] hover:border-[#9F3B0F] focus-visible:ring-[#C94F16]",
  secondary:
    "bg-white text-[#51443A] border-[#E7DCC8] shadow-xs hover:border-[#C94F16]/40 hover:bg-[#FFF4D6] hover:text-[#171311] focus-visible:ring-[#C94F16]",
  danger:
    "bg-[#C8372D] text-white border-[#C8372D] shadow-xs hover:bg-[#A92D24] hover:border-[#A92D24] focus-visible:ring-[#C8372D]",
  success:
    "bg-[#2D6A2E] text-white border-[#2D6A2E] shadow-xs hover:bg-[#235324] hover:border-[#235324] focus-visible:ring-[#2D6A2E]",
} as const;

/**
 * Submit and action button with a built-in loading state.
 *
 * While `loading` is true the button shows a spinner and the loading label,
 * and it is disabled, so a second tap cannot send the same record twice.
 */
export const ActionButton: React.FC<
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    loading?: boolean;
    loadingText?: string;
    icon?: LucideIcon;
    variant?: keyof typeof ACTION_VARIANTS;
    size?: "md" | "lg";
  }
> = ({
  loading = false,
  loadingText = "กำลังบันทึก...",
  icon: Icon,
  variant = "primary",
  size = "md",
  className = "",
  disabled,
  children,
  type = "button",
  ...props
}) => (
  <button
    type={type}
    disabled={disabled || loading}
    aria-busy={loading || undefined}
    className={`inline-flex items-center justify-center gap-2 rounded-xl border font-semibold ${tactile} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-55 disabled:shadow-none disabled:active:scale-100 ${
      size === "lg" ? "min-h-12 px-6 text-base" : "min-h-11 px-5 text-sm"
    } ${ACTION_VARIANTS[variant]} ${className}`}
    {...props}
  >
    {loading ? (
      <Loader2 className="size-4 animate-spin" aria-hidden="true" />
    ) : (
      Icon && <Icon className="size-4" aria-hidden="true" />
    )}
    <span>{loading ? loadingText : children}</span>
  </button>
);

// ─── 12. Detail Skeleton ─────────────────────────────────────────────────────

/**
 * Placeholder for a detail page: a title block, a row of figures and a grid
 * of label/value fields, in the same card box the loaded page uses. A stack
 * of list-row skeletons made the page jump when the real layout arrived.
 */
export const DetailSkeleton: React.FC<{
  stats?: number;
  fields?: number;
  className?: string;
}> = ({ stats = 3, fields = 6, className = "" }) => (
  <div
    role="status"
    aria-label="กำลังโหลดข้อมูล"
    className={`space-y-6 ${className}`}
  >
    <div
      aria-hidden="true"
      className="animate-pulse rounded-2xl border border-[#E7DCC8] bg-card p-6 shadow-xs sm:p-8"
    >
      <div className="flex items-start gap-4">
        <div className="size-14 shrink-0 rounded-2xl bg-[#F1E6D2]" />
        <div className="flex-1 space-y-3">
          <div className="h-6 w-2/5 rounded-full bg-[#F1E6D2]" />
          <div className="h-4 w-1/4 rounded-full bg-[#F5EDE0]" />
        </div>
        <div className="h-6 w-20 rounded-full bg-[#F1E6D2]" />
      </div>
      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {Array.from({ length: fields }).map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="h-3 w-20 rounded-full bg-[#F5EDE0]" />
            <div className="h-5 w-3/5 rounded-full bg-[#F1E6D2]" />
          </div>
        ))}
      </div>
    </div>
    {stats > 0 && <StatCardSkeleton count={stats} />}
  </div>
);

// ─── 13. Form building blocks ────────────────────────────────────────────────

/** Class string for a plain <input>/<select>/<textarea> in an entry form. */
export const fieldClass =
  "w-full min-h-11 rounded-xl border border-[#E7DCC8] bg-white px-3.5 py-2.5 text-base md:text-sm text-[#171311] placeholder:text-[#8C7B6B] shadow-xs transition-all duration-200 ease-in-out hover:border-[#D9C6A6] focus:border-[#C94F16] focus:outline-none focus-visible:ring-[3px] focus-visible:ring-[#C94F16]/20 disabled:cursor-not-allowed disabled:bg-[#F5EDE0] disabled:opacity-70";

export const FieldLabel: React.FC<
  React.LabelHTMLAttributes<HTMLLabelElement> & {
    required?: boolean;
    hint?: string;
  }
> = ({ required, hint, className = "", children, ...props }) => (
  <label
    className={`block text-sm font-semibold text-[#171311] ${className}`}
    {...props}
  >
    {children}
    {required && (
      <span className="ml-0.5 text-[#C8372D]" aria-hidden="true">
        *
      </span>
    )}
    {hint && (
      <span className="mt-0.5 block text-xs font-normal text-[#6E6155]">
        {hint}
      </span>
    )}
  </label>
);

/**
 * One group of related fields in an entry form, shown as its own card.
 * A numbered step keeps a long form readable as a short checklist.
 */
export const FormSection: React.FC<{
  step?: number;
  title: string;
  description?: string;
  icon?: LucideIcon;
  className?: string;
  children: React.ReactNode;
}> = ({ step, title, description, icon: Icon, className = "", children }) => (
  <section
    className={`rounded-2xl border border-[#E7DCC8] bg-card p-5 shadow-xs sm:p-6 ${className}`}
  >
    <header className="mb-5 flex items-start gap-3">
      {step !== undefined ? (
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#C94F16] text-sm font-bold text-white">
          {step}
        </span>
      ) : (
        Icon && (
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-[#F9D2AE] bg-[#FFF4D6] text-[#C94F16]">
            <Icon className="size-[18px]" aria-hidden="true" />
          </span>
        )
      )}
      <div className="min-w-0 pt-1">
        <h2 className="text-base font-bold leading-tight text-[#171311]">
          {title}
        </h2>
        {description && (
          <p className="mt-1 text-sm leading-relaxed text-[#51443A]">
            {description}
          </p>
        )}
      </div>
    </header>
    <div className="space-y-5">{children}</div>
  </section>
);

/**
 * The money field of an entry form: a large tabular figure with the baht
 * sign in front and the unit "บาท" after it, so the amount is the most
 * visible value on the screen and its unit is never ambiguous.
 */
export const AmountInput: React.FC<
  Omit<React.InputHTMLAttributes<HTMLInputElement>, "type" | "size"> & {
    tone?: "income" | "expense" | "neutral";
  }
> = ({ tone = "neutral", className = "", ...props }) => {
  const color =
    tone === "income"
      ? "text-[#2D6A2E]"
      : tone === "expense"
        ? "text-[#C8372D]"
        : "text-[#171311]";
  return (
    <div
      className={`group relative flex items-center rounded-2xl border-2 border-[#E7DCC8] bg-white shadow-xs transition-all duration-200 ease-in-out hover:border-[#D9C6A6] focus-within:border-[#C94F16] focus-within:ring-4 focus-within:ring-[#C94F16]/15 ${className}`}
    >
      <span
        className={`pl-5 text-2xl font-bold sm:text-3xl ${color}`}
        aria-hidden="true"
      >
        ฿
      </span>
      <input
        type="number"
        inputMode="decimal"
        step="0.01"
        className={`min-w-0 flex-1 bg-transparent px-3 py-4 text-3xl font-bold tabular-nums tracking-tight placeholder:text-[#D9C6A6] focus:outline-none sm:text-4xl ${color}`}
        {...props}
      />
      <span className="pr-5 text-base font-semibold text-[#6E6155]">บาท</span>
    </div>
  );
};

/**
 * Two- to four-way choice drawn as a row of tiles (category, payment method).
 * The selected tile uses the primary colour so the choice reads at a glance.
 */
export const ChoiceTile: React.FC<
  React.ButtonHTMLAttributes<HTMLButtonElement> & { selected?: boolean }
> = ({ selected = false, className = "", children, ...props }) => (
  <button
    type="button"
    aria-pressed={selected}
    className={`min-h-12 rounded-xl border px-3 py-2.5 text-sm font-semibold ${tactile} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C94F16] focus-visible:ring-offset-2 ${
      selected
        ? "border-[#C94F16] bg-[#FFF4D6] text-[#9F3B0F] shadow-xs ring-1 ring-[#C94F16]"
        : "border-[#E7DCC8] bg-white text-[#51443A] hover:border-[#C94F16]/40 hover:bg-[#FFF4D6]/60 hover:text-[#171311]"
    } ${className}`}
    {...props}
  >
    {children}
  </button>
);
