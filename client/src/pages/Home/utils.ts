import { useEffect, useState } from "react";

// ─── Formatting helpers ──────────────────────────────────────────────────────

export function fmtBaht(n: number) {
  return `฿${n.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function fmtShortBaht(n: number) {
  return `฿${n.toLocaleString("th-TH", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export function pctChange(current: number, prev: number) {
  if (prev === 0) return current > 0 ? "+∞%" : "0%";
  const pct = ((current - prev) / prev) * 100;
  return `${pct >= 0 ? "+" : ""}${pct.toFixed(0)}%`;
}

export function trendArrow(trend: string) {
  return trend.trim().startsWith("-") ? "↓" : "↑";
}

export function trendValue(trend: string) {
  return trend.replace(/^[+\-↑↓]\s*/, "");
}

export function fmtThaiDate(d: Date | string) {
  return new Intl.DateTimeFormat("th-TH", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(d));
}

/** Maps Thai payment-method button labels to the API enum values. */
export function mapPaymentMethod(m: string): "cash" | "transfer" | "check" {
  switch (m) {
    case "โอนธนาคาร":
    case "พร้อมเพย์ / QR":
      return "transfer";
    case "เช็ค":
      return "check";
    default:
      return "cash";
  }
}

// ─── Balance count-up (first-impression polish) ─────────────────────────────
// Animates the hero balance figure from 0 to its real value on mount/update
// instead of just appearing — skips straight to the final value for
// prefers-reduced-motion so no one is forced to watch a number tick up.
export function useCountUp(target: number, durationMs = 900): number {
  const [value, setValue] = useState(target);
  const prefersReducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  useEffect(() => {
    if (prefersReducedMotion) {
      setValue(target);
      return;
    }
    const start = performance.now();
    let frameId: number;
    const tick = (now: number) => {
      const progress = Math.min((now - start) / durationMs, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(target * eased);
      if (progress < 1) {
        frameId = requestAnimationFrame(tick);
      }
    };
    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, durationMs, prefersReducedMotion]);

  return value;
}
