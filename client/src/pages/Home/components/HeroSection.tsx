import { Illustration } from "@/components/Illustration";

export function HeroSection() {
  return (
    <section
      aria-label="Grace-giving ส่วนต้อนรับ"
      className="animate-fade-up relative overflow-hidden flex w-full items-center justify-between gap-5 rounded-3xl bg-surface/90 backdrop-blur-md p-6 sm:p-8 fintech-card"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-12 -top-12 size-48 rounded-full bg-tile-lilac/60 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-12 left-1/3 size-40 rounded-full bg-tile-mint/50 blur-3xl"
      />

      <div className="relative z-10 order-2 size-20 shrink-0 overflow-hidden rounded-3xl bg-tile-lilac p-1.5 shadow-sm sm:size-28">
        <Illustration
          src="/illustrations/hero_jesus_shepherd.jpg"
          alt="พระเยซูคริสต์และลูกแกะ"
          className="h-full w-full rounded-2xl object-cover object-[center_20%]"
          priority
          width={128}
          height={128}
        />
      </div>

      <div className="relative z-10 order-1 min-w-0 space-y-2.5">
        <p className="eyebrow">Church Finance</p>
        <h1 className="display text-3xl text-ink sm:text-5xl">
          <span>Grace</span> <span className="text-brand">Ledger</span>
        </h1>
        <p className="text-sm font-medium text-ink-2 sm:text-base">
          การเงินเชื่อมใจ เพื่อพันธกิจของพระเจ้า
        </p>
        <p className="inline-flex flex-wrap items-baseline gap-x-2 rounded-full bg-tile-lilac/70 px-3.5 py-1 text-xs text-ink-2">
          <span className="font-bold text-tile-lilac-ink">2 โครินธ์ 9:7</span>
          <span>“ผู้ให้ด้วยใจยินดี พระเจ้าทรงรัก”</span>
        </p>
      </div>
    </section>
  );
}
