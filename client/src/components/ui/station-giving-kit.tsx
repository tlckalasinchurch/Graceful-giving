import React, { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  CalendarCheck2,
  ChevronRight,
  CreditCard,
  HandCoins,
  Play,
  RotateCcw,
  Smartphone,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { cn } from "@/lib/utils";
import { formatAmount } from "@/lib/format";

// ─── 1. Isometric Station Cube Logo (JamBox-inspired) ─────────────────────────

export function StationCubeLogo({
  brandTitle = "Grace Giving",
  subtitle = "จุดถวายทรัพย์อัตโนมัติของคริสตจักร",
  variant = "white",
  className,
}: {
  brandTitle?: string;
  subtitle?: string;
  variant?: "white" | "orange";
  className?: string;
}) {
  void variant;
  return (
    <div
      className={cn(
        "inline-flex items-center gap-3 select-none text-left",
        className
      )}
    >
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand text-white">
        <HandCoins className="size-5" aria-hidden="true" />
      </span>
      <span className="min-w-0">
        <h1 className="display block truncate text-2xl leading-none text-ink sm:text-3xl">
          {brandTitle}
        </h1>
        {subtitle && (
          <p className="mt-1 block text-xs font-medium text-ink-3">
            {subtitle}
          </p>
        )}
      </span>
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
  const [imgFailed, setImgFailed] = React.useState(false);

  React.useEffect(() => {
    setImgFailed(false);
  }, [avatarUrl]);

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-4 rounded-2xl border border-line bg-surface px-5 py-3.5",
        className
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        {avatarUrl && !imgFailed ? (
          <img
            src={avatarUrl}
            alt={userName}
            referrerPolicy="no-referrer"
            onError={() => setImgFailed(true)}
            className="size-10 shrink-0 rounded-full object-cover border border-line"
          />
        ) : (
          <div className="grid size-10 shrink-0 place-items-center rounded-full bg-tile-mint text-sm font-bold text-tile-mint-ink">
            {userName.trim().slice(0, 1).toUpperCase() || "G"}
          </div>
        )}
        <div className="min-w-0">
          <span className="block truncate text-sm sm:text-base font-semibold text-ink">
            {userName}
          </span>
          <span className="text-xs text-ink-3">ผู้ถวาย</span>
        </div>
      </div>

      <div className="shrink-0 text-right">
        <div className="text-xs font-medium text-ink-3">{metricLabel}</div>
        <div className="text-xs sm:text-sm font-semibold tabular-nums text-brand">
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
        "rounded-2xl border border-line bg-surface px-5 py-3.5 space-y-1.5",
        className
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "size-2 rounded-full",
              isAvailable ? "bg-income" : "bg-danger"
            )}
            aria-hidden="true"
          />
          <span className="text-xs font-semibold text-ink">{label}</span>
        </div>

        <span
          className={cn(
            "text-xs font-semibold",
            isAvailable ? "text-income" : "text-danger"
          )}
        >
          {statusBadgeText}
        </span>
      </div>

      <p className="text-xs text-ink-3 leading-relaxed">{statusDetail}</p>
    </div>
  );
}

// ─── 3. Station Hero CTA (Give Now) ──────────────────────────────────────────

export function StationHeroCTA({
  eyebrow = "เริ่มใช้งาน",
  headline = "พร้อมถวายทรัพย์เลยไหม?",
  buttonTitle = "ถวายทรัพย์",
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
        <div className="text-xs font-medium text-ink-3">{eyebrow}</div>
        <h3 className="display text-xl tracking-tight text-ink sm:text-2xl">
          {headline}
        </h3>
      </div>

      <button
        type="button"
        onClick={onClick}
        aria-label={`${buttonTitle} - ${buttonSubtitle}`}
        className="group flex w-full items-center justify-between gap-4 rounded-2xl bg-brand p-5 text-left text-white transition-colors hover:bg-[var(--brand-hover)] active:scale-[0.99] sm:p-6 cursor-pointer"
      >
        <div className="flex min-w-0 items-center gap-4">
          <div className="grid size-12 shrink-0 place-items-center rounded-xl bg-white/15 text-white sm:size-14">
            <HandCoins className="size-6 sm:size-7" aria-hidden="true" />
          </div>

          <div className="min-w-0">
            <div className="text-xl font-extrabold leading-tight tracking-tight text-white sm:text-2xl">
              {buttonTitle}
            </div>
            <div className="mt-0.5 text-xs sm:text-sm font-semibold text-white/90">
              {buttonSubtitle}
            </div>
          </div>
        </div>

        <div className="grid size-10 shrink-0 place-items-center rounded-full bg-white/15 text-white transition-transform group-hover:translate-x-1 sm:size-11">
          <ArrowRight className="size-5 stroke-[2.2]" />
        </div>
      </button>

      {helperText && (
        <p className="pt-1 text-center text-xs font-medium leading-relaxed text-ink-3 sm:text-sm">
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
        "rounded-2xl border border-line bg-surface px-5 py-4 flex items-center justify-between gap-4",
        className
      )}
    >
      <div className="space-y-0.5">
        <div className="text-xs font-medium text-ink-3">{label}</div>
        <div
          role="timer"
          aria-label={label}
          className={cn(
            "text-3xl sm:text-4xl font-extrabold tabular-nums tracking-tight",
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
          className="btn-secondary min-h-10 px-3 py-1.5 text-xs"
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
        "rounded-2xl border border-line bg-paper-2 px-5 py-4 space-y-1",
        className
      )}
    >
      <div className="text-xs font-medium text-ink-3">{eyebrow}</div>
      <div className="text-base sm:text-lg font-bold text-ink">{title}</div>
      {updatedAtText && (
        <div className="text-xs text-ink-3">{updatedAtText}</div>
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
        "rounded-2xl border bg-surface p-5 space-y-3.5 transition-colors",
        selected
          ? "border-brand bg-tile-mint/30"
          : "border-line hover:border-[var(--field)]",
        className
      )}
    >
      <div className="space-y-0.5">
        <h4 className="text-xl sm:text-2xl font-bold text-ink tracking-tight">
          {title}
        </h4>
        <p className="text-xs sm:text-sm text-ink-2">{subtitle}</p>
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
                "px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors cursor-pointer tabular-nums focus-visible:ring-2 focus-visible:ring-brand active:scale-95",
                amountThb === preset
                  ? "border-brand bg-tile-mint text-tile-mint-ink"
                  : "border-line bg-surface text-ink-2 hover:bg-paper-2 hover:text-ink"
              )}
            >
              {formatAmount(preset, 0)} บาท
            </button>
          ))}
        </div>
      )}

      <div className="text-2xl sm:text-3xl font-extrabold text-ink tabular-nums">
        {formatAmount(amountThb)} บาท
      </div>

      <button
        type="button"
        onClick={onSelect}
        aria-label={`${ctaLabel}: ${title}`}
        className="btn-primary w-full py-3 px-5 text-sm sm:text-base cursor-pointer"
      >
        {ctaLabel}
      </button>
    </div>
  );
}

// ─── 5. Confirm Giving Action Card (Screen 3) ────────────────────────────────

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
        "rounded-2xl border border-line bg-surface p-4 sm:p-6 text-center space-y-4",
        className
      )}
    >
      <div className="space-y-1.5">
        <h3 className="text-lg sm:text-xl font-bold text-ink tracking-tight">
          {title}
        </h3>
        <p className="text-xs sm:text-sm text-ink-2 leading-relaxed max-w-md mx-auto">
          {description}
        </p>
      </div>

      {children && <div className="text-left">{children}</div>}

      <button
        type="button"
        onClick={onConfirm}
        disabled={disabled || loading}
        aria-busy={loading}
        className="btn-primary w-full py-3.5 px-5 text-sm sm:text-base cursor-pointer disabled:opacity-50"
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
        return <Smartphone className="w-6 h-6 text-white stroke-[2.2]" />;
      case "select":
        return <CalendarCheck2 className="w-6 h-6 text-white stroke-[2.2]" />;
      case "pay":
        return <CreditCard className="w-6 h-6 text-white stroke-[2.2]" />;
      case "done":
        return <Play className="w-6 h-6 text-white fill-white ml-0.5" />;
    }
  };

  return (
    <div
      data-station-poster="true"
      data-brand-prefix={brandPrefix}
      data-brand-highlight={brandHighlight}
      data-station-subheader={stationSubheader}
      data-headline-white={headlineWhite}
      data-headline-orange={headlineOrange}
      data-scan-prompt={scanPrompt}
      data-qr-value={qrValue}
      data-qr-center-badge={qrCenterBadge ?? ""}
      data-qr-caption={qrCaption ?? ""}
      data-footer-lead-white={footerLeadWhite}
      data-footer-lead-orange={footerLeadOrange}
      data-footer-subtext={footerSubtext}
      data-church-name={churchName ?? ""}
      className={cn(
        "inline-block w-full max-w-md mx-auto rounded-2xl border border-line bg-accent p-4 [print-color-adjust:exact] [-webkit-print-color-adjust:exact] sm:p-6 print:border-none",
        className
      )}
    >
      {/* Inner Sanctuary Poster Board */}
      <div className="relative space-y-6 overflow-hidden rounded-xl border border-line bg-surface px-6 py-8 text-center sm:px-8 sm:py-10">
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
              stroke="#171A18"
              strokeWidth="4.5"
              strokeLinejoin="round"
            />
            {/* Right half of hexagon (emerald door frame) */}
            <polygon
              points="60,10 102,32 102,78 60,100"
              fill="none"
              stroke="#087F5B"
              strokeWidth="4.5"
              strokeLinejoin="round"
            />
            {/* Open Emerald Door Panel */}
            <polygon points="62,22 86,14 86,90 62,82" fill="#087F5B" />
            {/* Door Handle */}
            <line
              x1="67"
              y1="49"
              x2="67"
              y2="57"
              stroke="#171A18"
              strokeWidth="3"
              strokeLinecap="round"
            />
            {/* Interior Offering Heart & Cross silhouette */}
            <circle cx="43" cy="48" r="8" fill="#171A18" />
            <path d="M31 74 C31 63 55 63 55 74 Z" fill="#171A18" />
            <line
              x1="30"
              y1="32"
              x2="30"
              y2="54"
              stroke="#171A18"
              strokeWidth="3.5"
              strokeLinecap="round"
            />
            <line
              x1="24"
              y1="39"
              x2="36"
              y2="39"
              stroke="#171A18"
              strokeWidth="3.5"
              strokeLinecap="round"
            />
            {/* Right side wave bars */}
            <line
              x1="110"
              y1="42"
              x2="110"
              y2="68"
              stroke="#087F5B"
              strokeWidth="4"
              strokeLinecap="round"
            />
            <line
              x1="117"
              y1="35"
              x2="117"
              y2="75"
              stroke="#087F5B"
              strokeWidth="4"
              strokeLinecap="round"
            />
            <line
              x1="124"
              y1="46"
              x2="124"
              y2="64"
              stroke="#087F5B"
              strokeWidth="4"
              strokeLinecap="round"
            />
          </svg>

          <div className="text-4xl sm:text-5xl font-extrabold tracking-tight leading-none mt-1">
            <span className="text-ink">{brandPrefix}</span>
            <span className="text-brand">{brandHighlight}</span>
          </div>

          <div className="flex items-center justify-center gap-2.5 w-full mt-2">
            <span className="h-[1.5px] w-10 bg-brand/40" />
            <span className="text-xs font-bold tracking-wide text-ink-3 sm:text-sm">
              {stationSubheader}
            </span>
            <span className="h-[1.5px] w-10 bg-brand/40" />
          </div>

          <div className="mt-2 text-xl sm:text-2xl font-bold tracking-tight">
            <span className="text-ink">{headlineWhite}</span>
            <span className="text-brand">{headlineOrange}</span>
          </div>

          {churchName && (
            <div className="mt-1 text-xs font-semibold text-ink-3">
              {churchName}
            </div>
          )}
        </div>

        {/* Scan Prompt + White QR Card */}
        <div className="space-y-2.5">
          <div className="text-sm font-bold text-ink sm:text-base">
            {scanPrompt}
          </div>

          <div
            data-qr-box="true"
            className="mx-auto w-52 space-y-1.5 rounded-xl border border-line bg-surface p-3.5 sm:w-56"
          >
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
                    fgColor="#171A18"
                    title="QR Code สำหรับถวายทรัพย์"
                    className="w-full h-full"
                  />
                ) : (
                  <div
                    role="img"
                    aria-label="ยังไม่ได้ตั้งค่า QR Code"
                    className="w-full h-full flex items-center justify-center rounded-lg border-2 border-dashed border-line p-3 text-center text-xs font-bold text-ink-3"
                  >
                    ยังไม่ได้ตั้งค่าลิงก์ QR Code
                  </div>
                )}
                {/* Subtle framing corners */}
                <span className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-ink/30 pointer-events-none" />
                <span className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-ink/30 pointer-events-none" />
                <span className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-ink/30 pointer-events-none" />
                <span className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-ink/30 pointer-events-none" />

                {/* Center Badge */}
                {qrCenterBadge && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <span className="rounded-sm border border-[var(--ink)] bg-accent px-1.5 py-0.5 text-xs font-black tracking-tight text-ink">
                      {qrCenterBadge}
                    </span>
                  </div>
                )}
              </div>
            )}

            {qrCaption && (
              <div className="text-xs font-semibold text-ink-3">
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
                  <div className="grid size-10 place-items-center rounded-xl bg-brand text-white sm:size-13 shadow-xs">
                    {renderStepIcon(step.icon)}
                  </div>
                  <div className="flex flex-col items-center gap-1 sm:flex-row">
                    <span className="grid size-4 shrink-0 place-items-center rounded-full border border-line bg-accent text-[10px] font-extrabold text-accent-foreground">
                      {step.number}
                    </span>
                    <span className="break-words text-center text-xs font-bold leading-tight text-ink sm:text-xs">
                      {step.label}
                    </span>
                  </div>
                </div>

                {idx < steps.length - 1 && (
                  <div className="shrink-0 pt-4 text-ink-3">
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
            <span className="text-ink">{footerLeadWhite} </span>
            <span className="text-brand">{footerLeadOrange}</span>
          </div>
          <p className="text-xs font-medium text-ink-2 sm:text-sm">
            {footerSubtext}
          </p>
        </div>
      </div>
    </div>
  );
}
