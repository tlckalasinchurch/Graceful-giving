import React from "react";
import {
  AlertTriangle,
  ArrowUpRight,
  CircleAlert,
  Copy,
  Lightbulb,
  ShieldAlert,
} from "lucide-react";
import type { SlipRisk } from "@/lib/slipRisk";

const TONES = {
  duplicate: {
    box: "border-[#F8C8C5] bg-[#FFF6F5]",
    badge: "bg-[#C8372D] text-white",
    title: "text-[#A92D24]",
    icon: ShieldAlert,
    tag: "สลิปซ้ำ",
  },
  suspiciousHigh: {
    box: "border-[#FDE68A] bg-[#FFFBEB]",
    badge: "bg-[#F59E0B] text-white",
    title: "text-[#92400E]",
    icon: AlertTriangle,
    tag: "ต้องสงสัย",
  },
  suspiciousMedium: {
    box: "border-[#F9D2AE] bg-[#FFF8EA]",
    badge: "bg-[#C94F16] text-white",
    title: "text-[#9F3B0F]",
    icon: CircleAlert,
    tag: "ควรตรวจ",
  },
} as const;

/**
 * Tells the treasurer why the system flagged a slip: each reason on its own
 * line, a link to the slip or offering it matched, and what to do next.
 * Renders nothing for a slip with no concerns.
 */
export function SlipRiskPanel({
  risk,
  onOpenSlip,
  onOpenOffering,
}: {
  risk: SlipRisk;
  onOpenSlip: (id: number) => void;
  onOpenOffering: (id: number) => void;
}) {
  if (risk.level === "ok") return null;
  const hasHigh = risk.reasons.some(r => r.severity === "high");
  const tone =
    risk.level === "duplicate"
      ? TONES.duplicate
      : hasHigh
        ? TONES.suspiciousHigh
        : TONES.suspiciousMedium;
  const Icon = tone.icon;

  return (
    <section
      role="alert"
      aria-label={risk.headline}
      className={`rounded-2xl border p-4 sm:p-5 ${tone.box}`}
    >
      <header className="flex items-start gap-3">
        <span
          className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${tone.badge}`}
        >
          <Icon className="size-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <span
            className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-bold ${tone.badge}`}
          >
            {tone.tag}
          </span>
          <h3 className={`mt-1 text-base font-bold ${tone.title}`}>
            {risk.headline}
          </h3>
        </div>
      </header>

      <p className="mt-4 text-xs font-semibold text-[#51443A]">
        เหตุผลที่ระบบสงสัย
      </p>
      <ul className="mt-2 space-y-2">
        {risk.reasons.map(reason => (
          <li
            key={reason.text}
            className="flex items-start gap-2.5 rounded-xl bg-white/80 px-3 py-2.5 text-sm text-[#171311] ring-1 ring-inset ring-[#EFE5D3]"
          >
            <span
              aria-hidden="true"
              className={`mt-1.5 size-2 shrink-0 rounded-full ${reason.severity === "high" ? "bg-[#C8372D]" : "bg-[#F59E0B]"}`}
            />
            <span className="min-w-0 flex-1">{reason.text}</span>
            <span className="sr-only">
              {reason.severity === "high" ? "(สำคัญ)" : "(ควรตรวจ)"}
            </span>
          </li>
        ))}
      </ul>

      {(risk.relatedSlipId || risk.relatedOfferingId) && (
        <div className="mt-3 flex flex-wrap gap-2">
          {risk.relatedSlipId && (
            <button
              type="button"
              onClick={() => onOpenSlip(risk.relatedSlipId!)}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-[#E7DCC8] bg-white px-3.5 text-sm font-semibold text-[#51443A] shadow-xs transition-all duration-200 ease-in-out hover:-translate-y-0.5 hover:bg-[#FFF4D6] hover:shadow-md active:translate-y-0 active:scale-[0.98]"
            >
              <Copy className="size-4 text-[#C94F16]" />
              เปิดสลิป #{risk.relatedSlipId} เพื่อเทียบ
            </button>
          )}
          {risk.relatedOfferingId && (
            <button
              type="button"
              onClick={() => onOpenOffering(risk.relatedOfferingId!)}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-[#E7DCC8] bg-white px-3.5 text-sm font-semibold text-[#51443A] shadow-xs transition-all duration-200 ease-in-out hover:-translate-y-0.5 hover:bg-[#FFF4D6] hover:shadow-md active:translate-y-0 active:scale-[0.98]"
            >
              <ArrowUpRight className="size-4 text-[#C94F16]" />
              ดูเงินถวายรายการ #{risk.relatedOfferingId}
            </button>
          )}
        </div>
      )}

      <p className="mt-3 flex items-start gap-2 text-xs leading-relaxed text-[#51443A]">
        <Lightbulb
          className="mt-0.5 size-4 shrink-0 text-[#C94F16]"
          aria-hidden="true"
        />
        <span>{risk.advice}</span>
      </p>
    </section>
  );
}
