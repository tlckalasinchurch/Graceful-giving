import { Illustration } from "@/components/Illustration";

export function HeroSection() {
  return (
    <section
      aria-label="Grace Giving ส่วนต้อนรับ"
      className="relative flex w-full flex-col sm:flex-row sm:items-center justify-between gap-5 rounded-3xl bg-surface border border-line p-6 sm:p-7 shadow-xs overflow-hidden"
    >
      <div className="relative z-10 min-w-0 space-y-2.5">
        <div className="flex items-center gap-2">
          <span className="size-2 rounded-full bg-income" aria-hidden="true" />
          <span className="text-xs font-semibold tracking-wider text-ink-2 uppercase">
            Church Financial Ledger
          </span>
        </div>

        <h1 className="display text-2xl font-bold text-ink sm:text-3xl lg:text-4xl tracking-tight">
          <span>Grace</span> <span>Giving</span>
        </h1>

        <p className="text-sm font-medium text-ink-2 sm:text-base">
          การเงินเชื่อมใจ เพื่อพันธกิจของพระเจ้า
        </p>

        <div className="flex flex-wrap items-baseline gap-2 pt-1 text-ink/90">
          <span className="text-xs sm:text-sm font-medium italic">
            “ผู้ให้ด้วยใจยินดี พระเจ้าทรงรัก”
          </span>
          <span className="rounded-md bg-paper-2 border border-line/80 px-2 py-0.5 text-xs font-semibold text-ink-3">
            2 โครินธ์ 9:7
          </span>
        </div>
      </div>

      <div className="relative z-10 size-16 sm:size-24 lg:size-28 shrink-0 self-end sm:self-center overflow-hidden rounded-2xl bg-paper-2 p-1 border border-line shadow-xs">
        <Illustration
          src="/illustrations/hero_jesus_shepherd.jpg"
          alt="พระเยซูคริสต์และลูกแกะ"
          className="h-full w-full rounded-xl object-cover object-[center_20%]"
          priority
          width={128}
          height={128}
        />
      </div>
    </section>
  );
}
