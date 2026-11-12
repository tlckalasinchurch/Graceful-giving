import { Illustration } from "@/components/Illustration";
import { Sparkles } from "lucide-react";

export function HeroSection() {
  return (
    <section
      aria-label="Grace Giving ส่วนต้อนรับ"
      className="relative flex w-full flex-col justify-between gap-5 overflow-hidden rounded-[20px] border border-line bg-surface p-5 sm:flex-row sm:items-center sm:p-7"
    >
      <div className="relative z-10 min-w-0 space-y-2.5">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-tile-mint px-3 py-1 text-xs font-semibold text-tile-mint-ink">
          <Sparkles className="size-3.5" aria-hidden="true" />
          บัญชีการเงินคริสตจักร
        </span>

        <h1 className="display text-[clamp(1.75rem,4vw,2.5rem)] leading-[1.12] tracking-tight text-ink">
          Grace <span className="text-brand">Giving</span>
        </h1>

        <p className="max-w-md text-sm sm:text-base font-medium leading-relaxed text-ink-2">
          การเงินเชื่อมใจ เพื่อพันธกิจของพระเจ้า
        </p>

        <div className="inline-flex flex-wrap items-center gap-x-2.5 gap-y-1.5 rounded-xl bg-ground px-3.5 py-2">
          <span className="text-xs sm:text-sm font-medium text-ink-2">
            “ผู้ให้ด้วยใจยินดี พระเจ้าทรงรัก”
          </span>
          <span className="rounded-full bg-surface px-2.5 py-0.5 text-xs font-semibold text-ink-2 border border-line">
            2 โครินธ์ 9:7
          </span>
        </div>
      </div>

      <div className="relative z-10 size-20 shrink-0 self-end overflow-hidden rounded-2xl bg-ground sm:size-24 lg:size-28 sm:self-center">
        <Illustration
          src="/illustrations/hero_jesus_shepherd.jpg"
          alt="พระเยซูคริสต์และลูกแกะ"
          className="h-full w-full object-cover object-[center_20%]"
          priority
          width={128}
          height={128}
        />
      </div>
    </section>
  );
}
