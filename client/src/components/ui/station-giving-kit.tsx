import React, { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  CalendarCheck2,
  CheckCircle2,
  ChevronRight,
  CreditCard,
  HandCoins,
  Play,
  QrCode,
  RotateCcw,
  Smartphone,
  Sparkles,
  UploadCloud,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { cn } from "@/lib/utils";

// ─── 1. Isometric Station Cube Logo (JamBox-inspired) ─────────────────────────

export function StationCubeLogo({
  brandTitle = "GraceBox",
  subtitle = "AUTOMATED CHURCH GIVING STATION",
  variant = "white",
  className,
}: {
  brandTitle?: string;
  subtitle?: string;
  variant?: "white" | "orange";
  className?: string;
}) {
  return (
    <div
      className={cn("inline-flex flex-col items-center select-none text-center", className)}
    >
      <div className="text-center pt-1">
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight leading-none text-white font-display">
          {brandTitle}
        </h1>
        {subtitle && (
          <p className="mt-2 text-[10px] sm:text-[11px] font-bold tracking-[0.22em] text-stone-300 uppercase">
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
}

// ─── 2. Station Profile & Status Cards (Screen 1 — Image 2) ──────────────────

export function StationProfileCard({
  userName = "ผู้ถวายด้วยใจยินดี",
  avatarUrl,
  metricLabel = "สถานะผู้ถวาย",
  metricValue = "พร้อมถวาย",
  className,
}: {
  userName?: string;
  avatarUrl?: string | null;
  metricLabel?: string;
  metricValue?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-[28px] bg-[#16181D] border border-white/[0.08] px-5 py-4 flex items-center justify-between gap-4 shadow-lg",
        className
      )}
    >
      <div className="flex items-center gap-3.5 min-w-0">
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={userName}
            className="w-12 h-12 rounded-full object-cover border border-white/20 shrink-0"
          />
        ) : (
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#F97316] to-[#B45309] text-white font-extrabold text-lg flex items-center justify-center border border-white/20 shrink-0">
            {userName.trim().slice(0, 1).toUpperCase() || "G"}
          </div>
        )}
        <span className="text-lg font-extrabold text-white truncate">
          {userName}
        </span>
      </div>

      <div className="text-right shrink-0">
        <div className="text-xs font-medium text-stone-400">{metricLabel}</div>
        <div className="text-base sm:text-xl font-extrabold text-white tabular-nums">
          {metricValue}
        </div>
      </div>
    </div>
  );
}

export function StationStatusCard({
  label = "สถานะจุดถวาย",
  statusBadgeText = "พร้อมรับถวาย",
  statusDetail = "ส่งสลิปการถวายให้เหรัญญิกตรวจสอบได้ทุกเวลา",
  isAvailable = true,
  className,
}: {
  label?: string;
  statusBadgeText?: string;
  statusDetail?: string;
  isAvailable?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-[28px] bg-[#16181D] border border-white/[0.08] px-5 py-4 space-y-2.5 shadow-lg",
        className
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="w-4 h-4 rounded-full border-2 border-[hsl(27_40%_24%)] flex items-center justify-center">
            <span className="w-2 h-2 rounded-full bg-[#FB923C]" />
          </span>
          <span className="text-sm font-bold text-[#FDBA74]">{label}</span>
        </div>

        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#241E1C] border border-white/12">
          <span
            className={cn(
              "w-2.5 h-2.5 rounded-full",
              isAvailable
                ? "bg-[#22C55E] shadow-[0_0_8px_#22C55E]"
                : "bg-amber-500"
            )}
          />
          <span className="text-xs sm:text-sm font-bold text-white">
            {statusBadgeText}
          </span>
        </div>
      </div>

      <p className="text-sm font-medium text-stone-400">{statusDetail}</p>
    </div>
  );
}

// ─── 3. Station Hero Orange Gradient CTA (Jam Now -> Give Now) ───────────────

export function StationHeroCTA({
  eyebrow = "เริ่มใช้งาน",
  headline = "พร้อมถวายทรัพย์เลยไหม?",
  buttonTitle = "Give Now",
  buttonSubtitle = "เริ่มถวายทันที",
  helperText = "เลือกกองทุนที่ต้องการถวาย · สแกนพร้อมเพย์หรือแนบสลิปได้ทันที",
  onClick,
  className,
}: {
  eyebrow?: string;
  headline?: string;
  buttonTitle?: string;
  buttonSubtitle?: string;
  helperText?: string;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <div className={cn("space-y-3 pt-1", className)}>
      <div className="space-y-0.5">
        <div className="text-sm font-bold text-[#FB923C]">{eyebrow}</div>
        <h3 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          {headline}
        </h3>
      </div>

      <button
        type="button"
        onClick={onClick}
        aria-label={`${buttonTitle} - ${buttonSubtitle}`}
        className="group w-full text-left rounded-[28px] p-5 sm:p-6 bg-gradient-to-br from-[#FBBF24] via-[#F97316] to-[#EA580C] border-2 border-[#FDE68A]/50 shadow-[0_12px_32px_-8px_rgba(249,115,22,0.55)] hover:brightness-105 active:scale-[0.99] transition-all cursor-pointer flex items-center justify-between gap-4"
      >
        <div className="flex items-center gap-4 min-w-0">
          {/* Dark rounded-2xl icon box with vertical wave bars */}
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-[20px] bg-[#2B180A] flex items-center justify-center shrink-0 shadow-inner">
            <svg
              viewBox="0 0 40 40"
              className="w-8 h-8 text-[#FB923C]"
              aria-hidden="true"
            >
              <line
                x1="10"
                y1="17"
                x2="10"
                y2="23"
                stroke="currentColor"
                strokeWidth="2.8"
                strokeLinecap="round"
              />
              <line
                x1="15"
                y1="13"
                x2="15"
                y2="27"
                stroke="currentColor"
                strokeWidth="2.8"
                strokeLinecap="round"
              />
              <line
                x1="20"
                y1="9"
                x2="20"
                y2="31"
                stroke="currentColor"
                strokeWidth="2.8"
                strokeLinecap="round"
              />
              <line
                x1="25"
                y1="13"
                x2="25"
                y2="27"
                stroke="currentColor"
                strokeWidth="2.8"
                strokeLinecap="round"
              />
              <line
                x1="30"
                y1="17"
                x2="30"
                y2="23"
                stroke="currentColor"
                strokeWidth="2.8"
                strokeLinecap="round"
              />
            </svg>
          </div>

          <div className="min-w-0">
            <div className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-tight">
              {buttonTitle}
            </div>
            <div className="text-sm font-bold text-white/90 mt-0.5">
              {buttonSubtitle}
            </div>
          </div>
        </div>

        <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full border-2 border-white/60 bg-white/10 flex items-center justify-center text-white shrink-0 group-hover:translate-x-1 transition-transform">
          <ArrowRight className="w-5 h-5 stroke-[2.5]" />
        </div>
      </button>

      {helperText && (
        <p className="text-xs sm:text-sm text-stone-400 text-center pt-1 font-medium leading-relaxed">
          {helperText}
        </p>
      )}
    </div>
  );
}

// ─── 4. Countdown & Package Selection Cards (Screen 2 — Image 3) ─────────────

/** Where the QR code points by default: the public giving link. */
export function defaultStationUrl(): string {
  return typeof window !== "undefined" ? `${window.location.origin}/give` : "";
}

/** Seconds left at which the card warns that time is nearly up. */
const COUNTDOWN_WARN_SECONDS = 60;

export function StationCountdownCard({
  initialSeconds = 300,
  label = "เวลายืนยันตัวเลือกคงเหลือ",
  onExpire,
  maxExtensions = 1,
  className,
}: {
  initialSeconds?: number;
  label?: string;
  /** Called once when the time runs out. */
  onExpire?: () => void;
  /** How many times the person may restart the clock. */
  maxExtensions?: number;
  className?: string;
}) {
  const [secondsLeft, setSecondsLeft] = useState(initialSeconds);
  const [extensionsUsed, setExtensionsUsed] = useState(0);
  // The deadline is a timestamp, so a throttled background tab cannot make the
  // clock run slow.
  const deadlineRef = useRef(Date.now() + initialSeconds * 1000);
  const expiredRef = useRef(false);
  const onExpireRef = useRef(onExpire);
  useEffect(() => {
    onExpireRef.current = onExpire;
  }, [onExpire]);

  useEffect(() => {
    const timer = setInterval(() => {
      const left = Math.max(
        0,
        Math.ceil((deadlineRef.current - Date.now()) / 1000)
      );
      setSecondsLeft(left);
      if (left === 0 && !expiredRef.current) {
        expiredRef.current = true;
        clearInterval(timer);
        onExpireRef.current?.();
      }
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const extend = () => {
    deadlineRef.current = Date.now() + initialSeconds * 1000;
    setSecondsLeft(initialSeconds);
    setExtensionsUsed(n => n + 1);
  };

  const mins = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
  const secs = String(secondsLeft % 60).padStart(2, "0");
  const warning = secondsLeft > 0 && secondsLeft <= COUNTDOWN_WARN_SECONDS;
  const canExtend =
    secondsLeft > 0 &&
    secondsLeft < initialSeconds &&
    extensionsUsed < maxExtensions;

  return (
    <div
      className={cn(
        "rounded-2xl bg-surface border border-line px-6 py-5 flex items-center justify-between gap-4",
        className
      )}
    >
      <div className="space-y-1">
        <div className="text-xs sm:text-sm font-medium text-ink-2">{label}</div>
        {/* role="timer" is not announced every second. The status below
            changes only twice, at one minute left and at zero. */}
        <div
          role="timer"
          aria-label={label}
          className={cn(
            "text-4xl sm:text-5xl font-bold tabular-nums tracking-tight",
            warning ? "text-danger" : "text-ink"
          )}
        >
          {mins}:{secs}
        </div>
        <span className="sr-only" role="status">
          {secondsLeft === 0
            ? "หมดเวลาแล้ว"
            : warning
              ? "เหลือเวลาน้อยกว่า 1 นาที"
              : ""}
        </span>
      </div>

      {canExtend && (
        <button
          type="button"
          onClick={extend}
          className="px-3 py-1.5 rounded-xl bg-paper hover:bg-paper-2 border border-line text-xs font-semibold text-ink inline-flex items-center gap-1.5 cursor-pointer focus-visible:ring-2 focus-visible:ring-brand active:scale-95 transition-all"
        >
          <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
          <span>ต่อเวลา</span>
        </button>
      )}
    </div>
  );
}

export function StationStepStatusCard({
  eyebrow = "สถานะการทำรายการ",
  title = "เลือกประเภทและยอดถวายที่ต้องการ",
  updatedAtText,
  className,
}: {
  eyebrow?: string;
  title?: string;
  updatedAtText?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl bg-paper border border-line px-6 py-5 space-y-1.5 shadow-2xs",
        className
      )}
    >
      <div className="text-xs sm:text-sm font-medium text-ink-2">{eyebrow}</div>
      <div className="text-lg sm:text-xl font-bold text-ink">{title}</div>
      {updatedAtText && (
        <div className="text-xs sm:text-sm text-ink-3">{updatedAtText}</div>
      )}
    </div>
  );
}

export function StationOfferingPackageCard({
  title,
  subtitle = "พร้อมรับพระพรและบันทึกข้อมูลได้ทันที",
  amountThb,
  presetAmounts,
  onSelectAmount,
  ctaLabel = "ดูสรุปการถวาย",
  onSelect,
  selected = false,
  className,
}: {
  title: string;
  subtitle?: string;
  amountThb: number;
  presetAmounts?: number[];
  onSelectAmount?: (amount: number) => void;
  ctaLabel?: string;
  onSelect?: () => void;
  selected?: boolean;
  className?: string;
}) {
  return (
    <div
      role="group"
      aria-label={title}
      className={cn(
        "rounded-2xl bg-surface border border-line p-5 sm:p-6 space-y-4 transition-all shadow-2xs",
        selected
          ? "border-brand ring-2 ring-brand/20 bg-paper"
          : "border-line hover:border-line/80",
        className
      )}
    >
      <div className="space-y-1">
        <h4 className="text-2xl sm:text-3xl font-extrabold text-ink tracking-tight">
          {title}
        </h4>
        <p className="text-sm sm:text-base font-medium text-ink-2">
          {subtitle}
        </p>
      </div>

      {presetAmounts && presetAmounts.length > 0 && onSelectAmount && (
        <div className="flex flex-wrap gap-2">
          {presetAmounts.map(preset => (
            <button
              key={preset}
              type="button"
              onClick={() => onSelectAmount(preset)}
              aria-pressed={amountThb === preset}
              className={cn(
                "px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer tabular-nums focus-visible:ring-2 focus-visible:ring-brand active:scale-95",
                amountThb === preset
                  ? "bg-paper-2 border-ink/20 text-ink"
                  : "bg-surface border-line text-ink-2 hover:bg-paper hover:text-ink"
              )}
            >
              {preset.toLocaleString()} THB
            </button>
          ))}
        </div>
      )}

      <div className="text-3xl sm:text-4xl font-extrabold text-ink tabular-nums">
        {amountThb.toLocaleString()} THB
      </div>

      <button
        type="button"
        onClick={onSelect}
        aria-label={`${ctaLabel}: ${title}`}
        className="w-full py-3.5 px-6 rounded-xl focus-visible:ring-2 focus-visible:ring-brand bg-brand hover:bg-brand-ink text-black font-bold text-lg sm:text-xl transition-colors cursor-pointer"
      >
        {ctaLabel}
      </button>
    </div>
  );
}

// ─── 5. Unlock / Confirm Giving Action Card (Screen 3 — Image 1) ─────────────

export function StationUnlockConfirmCard({
  title = "พร้อมยืนยันการถวายแล้วหรือยัง?",
  description = "เมื่อโอนเงินและแนบสลิปเรียบร้อยแล้ว กดปุ่มด้านล่างเพื่อส่งสลิปและยืนยันการถวาย",
  buttonLabel = "ยืนยันและส่งสลิปถวาย",
  loading = false,
  disabled = false,
  onConfirm,
  children,
  className,
}: {
  title?: string;
  description?: string;
  buttonLabel?: string;
  loading?: boolean;
  disabled?: boolean;
  onConfirm?: () => void;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl bg-surface border border-line p-6 sm:p-8 text-center space-y-5",
        className
      )}
    >
      <div className="space-y-2.5">
        <h3 className="text-2xl sm:text-3xl font-bold text-ink tracking-tight">
          {title}
        </h3>
        <p className="text-sm sm:text-base text-ink-2 leading-relaxed max-w-md mx-auto">
          {description}
        </p>
      </div>

      {children && <div className="text-left">{children}</div>}

      <button
        type="button"
        onClick={onConfirm}
        disabled={disabled || loading}
        aria-busy={loading}
        className="w-full py-4 sm:py-5 px-6 rounded-xl focus-visible:ring-2 focus-visible:ring-brand bg-brand hover:bg-brand-ink disabled:opacity-50 text-black font-bold text-lg sm:text-xl transition-colors cursor-pointer"
      >
        {loading ? "กำลังส่งข้อมูลการถวาย..." : buttonLabel}
      </button>
    </div>
  );
}

// ─── 6. Printable QR Standee Poster (Image 4 — 1 สแกน -> 2 เลือก -> 3 จ่าย -> 4 ถวาย) ─

export interface StationPosterStep {
  number: number;
  label: string;
  icon: "scan" | "select" | "pay" | "done";
}

const DEFAULT_POSTER_STEPS: StationPosterStep[] = [
  { number: 1, label: "สแกน", icon: "scan" },
  { number: 2, label: "เลือกประเภท", icon: "select" },
  { number: 3, label: "โอน/สลิป", icon: "pay" },
  { number: 4, label: "ขอบคุณพระเจ้า", icon: "done" },
];

export function StationQrPoster({
  brandPrefix = "Grace",
  brandHighlight = "Box",
  stationSubheader = "S T A T I O N",
  headlineWhite = "จุดถวายทรัพย์",
  headlineOrange = "อัตโนมัติ",
  scanPrompt = "สแกน LINE หรือ QR เพื่อเริ่มถวาย",
  qrValue = defaultStationUrl(),
  customQrImageUrl,
  qrCenterBadge = "LINE",
  qrCaption = "LINE OFFICIAL",
  steps = DEFAULT_POSTER_STEPS,
  footerLeadWhite = "ใจยินดี?",
  footerLeadOrange = "ร่วมถวายได้เลย",
  footerSubtext = "เลือกกองทุนและส่งสลิปผ่านระบบได้ทุกเวลา",
  churchName,
  className,
}: {
  brandPrefix?: string;
  brandHighlight?: string;
  stationSubheader?: string;
  headlineWhite?: string;
  headlineOrange?: string;
  scanPrompt?: string;
  qrValue?: string;
  customQrImageUrl?: string | null;
  qrCenterBadge?: string;
  qrCaption?: string;
  steps?: StationPosterStep[];
  footerLeadWhite?: string;
  footerLeadOrange?: string;
  footerSubtext?: string;
  churchName?: string;
  className?: string;
}) {
  const renderStepIcon = (icon: StationPosterStep["icon"]) => {
    switch (icon) {
      case "scan":
        return <Smartphone className="w-6 h-6 text-[#080808] stroke-[2.2]" />;
      case "select":
        return <CalendarCheck2 className="w-6 h-6 text-[#080808] stroke-[2.2]" />;
      case "pay":
        return <CreditCard className="w-6 h-6 text-[#080808] stroke-[2.2]" />;
      case "done":
        return <Play className="w-6 h-6 text-[#080808] fill-[#080808] ml-0.5" />;
    }
  };

  return (
    <div
      className={cn(
        // print-color-adjust keeps the dark board and white text when printed;
        // browsers drop background colors by default.
        "p-4 sm:p-7 rounded-2xl bg-[#22C55E] inline-block w-full max-w-md mx-auto [print-color-adjust:exact] [-webkit-print-color-adjust:exact] print:shadow-none",
        className
      )}
    >
      {/* Inner Sanctuary-Navy Poster Board */}
      <div className="bg-[#080808] rounded-xl px-6 py-8 sm:px-8 sm:py-10 text-center space-y-6 border border-[rgba(255,255,255,0.1)] relative overflow-hidden">
        {/* Top Isometric Logo + Brand */}
        <div className="flex flex-col items-center">
          <svg
            viewBox="0 0 130 110"
            className="w-24 h-24 sm:w-28 sm:h-28"
            aria-hidden="true"
          >
            {/* Left half of hexagon */}
            <polygon
              points="60,10 18,32 18,78 60,100"
              fill="none"
              stroke="#FFFFFF"
              strokeWidth="4.5"
              strokeLinejoin="round"
            />
            {/* Right half of hexagon (harvest gold door frame) */}
            <polygon
              points="60,10 102,32 102,78 60,100"
              fill="none"
              stroke="#22C55E"
              strokeWidth="4.5"
              strokeLinejoin="round"
            />
            {/* Open Harvest Gold Door Panel */}
            <polygon points="62,22 86,14 86,90 62,82" fill="#22C55E" />
            {/* Door Handle */}
            <line
              x1="67"
              y1="49"
              x2="67"
              y2="57"
              stroke="#080808"
              strokeWidth="3"
              strokeLinecap="round"
            />
            {/* Interior Offering Heart & Cross silhouette */}
            <circle cx="43" cy="48" r="8" fill="#FFFFFF" />
            <path d="M31 74 C31 63 55 63 55 74 Z" fill="#FFFFFF" />
            <line
              x1="30"
              y1="32"
              x2="30"
              y2="54"
              stroke="#FFFFFF"
              strokeWidth="3.5"
              strokeLinecap="round"
            />
            <line
              x1="24"
              y1="39"
              x2="36"
              y2="39"
              stroke="#FFFFFF"
              strokeWidth="3.5"
              strokeLinecap="round"
            />
            {/* Right side wave bars */}
            <line
              x1="110"
              y1="42"
              x2="110"
              y2="68"
              stroke="#22C55E"
              strokeWidth="4"
              strokeLinecap="round"
            />
            <line
              x1="117"
              y1="35"
              x2="117"
              y2="75"
              stroke="#22C55E"
              strokeWidth="4"
              strokeLinecap="round"
            />
            <line
              x1="124"
              y1="46"
              x2="124"
              y2="64"
              stroke="#22C55E"
              strokeWidth="4"
              strokeLinecap="round"
            />
          </svg>

          <div className="text-4xl sm:text-5xl font-extrabold tracking-tight leading-none mt-1">
            <span className="text-white">{brandPrefix}</span>
            <span className="text-[#22C55E]">{brandHighlight}</span>
          </div>

          <div className="flex items-center justify-center gap-2.5 w-full mt-2">
            <span className="h-[1.5px] w-10 bg-[#22C55E]/70" />
            <span className="text-xs sm:text-sm font-bold tracking-[0.25em] text-white uppercase">
              {stationSubheader}
            </span>
            <span className="h-[1.5px] w-10 bg-[#22C55E]/70" />
          </div>

          <div className="mt-2 text-xl sm:text-2xl font-bold tracking-tight">
            <span className="text-white">{headlineWhite}</span>
            <span className="text-[#22C55E]">{headlineOrange}</span>
          </div>

          {churchName && (
            <div className="mt-1 text-xs font-semibold text-ink-3">
              {churchName}
            </div>
          )}
        </div>

        {/* Scan Prompt + White QR Card */}
        <div className="space-y-2.5">
          <div className="text-sm sm:text-base font-bold text-white">
            {scanPrompt}
          </div>

          <div className="bg-white rounded-xl p-3.5 w-52 sm:w-56 mx-auto space-y-1.5">
            {customQrImageUrl ? (
              <img
                src={customQrImageUrl}
                alt="QR Code สำหรับถวายทรัพย์"
                className="w-full aspect-square object-contain rounded-lg"
              />
            ) : (
              <div className="relative w-full aspect-square">
                {qrValue.trim() ? (
                  <QRCodeSVG
                    value={qrValue.trim()}
                    level="H"
                    marginSize={4}
                    bgColor="#FFFFFF"
                    fgColor="#111111"
                    title="QR Code สำหรับถวายทรัพย์"
                    className="w-full h-full"
                  />
                ) : (
                  <div
                    role="img"
                    aria-label="ยังไม่ได้ตั้งค่า QR Code"
                    className="w-full h-full flex items-center justify-center rounded-lg border-2 border-dashed border-stone-400 p-3 text-center text-xs font-bold text-ink-3"
                  >
                    ยังไม่ได้ตั้งค่าลิงก์ QR Code
                  </div>
                )}
                {/* Subtle framing corners */}
                <span className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-amber-500/30 pointer-events-none" />
                <span className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-amber-500/30 pointer-events-none" />
                <span className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-amber-500/30 pointer-events-none" />
                <span className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-amber-500/30 pointer-events-none" />

                {/* Center Badge */}
                {qrCenterBadge && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <span className="px-1.5 py-0.5 bg-white font-black text-[11px] tracking-tight text-black border border-black rounded-xs">
                      {qrCenterBadge}
                    </span>
                  </div>
                )}
              </div>
            )}

            {qrCaption && (
              <div className="text-[11px] font-bold tracking-wider text-black uppercase">
                {qrCaption}
              </div>
            )}
          </div>
        </div>

        {/* 4-Step Flow: 1 สแกน -> 2 เลือกกองทุน -> 3 โอน/สลิป -> 4 ขอบคุณพระเจ้า */}
        <div className="pt-1">
          <div className="flex items-start justify-between gap-1">
            {steps.map((step, idx) => (
              <React.Fragment key={step.number}>
                <div className="flex flex-col items-center space-y-2 flex-1 min-w-0">
                  <div className="w-10 h-10 sm:w-13 sm:h-13 rounded-full bg-[#22C55E] flex items-center justify-center">
                    {renderStepIcon(step.icon)}
                  </div>
                  <div className="flex flex-col items-center gap-1 sm:flex-row">
                    <span className="w-4 h-4 rounded-full bg-[#22C55E] text-[#080808] font-extrabold text-[10px] flex items-center justify-center shrink-0">
                      {step.number}
                    </span>
                    <span className="text-center text-[11px] leading-tight sm:text-xs font-bold text-white break-words">
                      {step.label}
                    </span>
                  </div>
                </div>

                {idx < steps.length - 1 && (
                  <div className="pt-4 text-[#22C55E] shrink-0">
                    <ChevronRight className="w-4 h-4 stroke-[3]" />
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Bottom Callout */}
        <div className="pt-2 space-y-1">
          <div className="text-xl sm:text-2xl font-bold tracking-tight">
            <span className="text-white">{footerLeadWhite} </span>
            <span className="text-[#22C55E]">{footerLeadOrange}</span>
          </div>
          <p className="text-xs sm:text-sm font-medium text-ink-2">
            {footerSubtext}
          </p>
        </div>
      </div>
    </div>
  );
}
