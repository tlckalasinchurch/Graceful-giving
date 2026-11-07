import { Illustration } from "@/components/Illustration";
import { Sparkles } from "lucide-react";

export function HeroSection() {
  return (
    <section
      aria-label="Grace Giving ส่วนต้อนรับ"
      className="dot-grid relative flex w-full flex-col justify-between gap-5 overflow-hidden rounded-2xl border border-line bg-surface p-5 sm:flex-row sm:items-center sm:p-7"
    >
      <div className="relative z-10 min-w-0 space-y-3">
        <span className="eyebrow">
          <Sparkles className="size-3.5" aria-hidden="true" />
          Church Financial Ledger
        </span>

        <h1 className="display text-[clamp(2.15rem,5.5vw,3.25rem)] leading-[1.08] tracking-tight text-ink">
          Grace <span className="text-brand">Giving</span>
        </h1>

        <p className="max-w-md text-base font-medium leading-relaxed text-ink-2 sm:text-lg">
          การเงินเชื่อมใจ เพื่อพันธกิจของพระเจ้า
        </p>

        <div className="inline-flex flex-wrap items-center gap-x-2.5 gap-y-1.5 rounded-xl border border-line bg-ground px-3.5 py-2">
          <span className="text-xs sm:text-sm font-semibold italic text-ink-2">
            “ผู้ให้ด้วยใจยินดี พระเจ้าทรงรัก”
          </span>
          <span className="rounded-md bg-accent px-2 py-0.5 text-xs font-bold uppercase tracking-wider text-accent-foreground">
            2 โครินธ์ 9:7
          </span>
        </div>
      </div>

      <div className="relative z-10 size-20 shrink-0 self-end overflow-hidden rounded-xl border-2 border-[var(--ink)] bg-ground p-1 shadow-[4px_4px_0_var(--ink)] sm:size-24 lg:size-28 sm:self-center">
        <Illustration
          src="/illustrations/hero_jesus_shepherd.jpg"
          alt="พระเยซูคริสต์และลูกแกะ"
          className="h-full w-full rounded-lg object-cover object-[center_20%]"
          priority
          width={128}
          height={128}
        />
      </div>
    </section>
  );
}
