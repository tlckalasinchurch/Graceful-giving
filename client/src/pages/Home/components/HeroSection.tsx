import { Illustration } from "@/components/Illustration";

/** A short greeting. The balance is the first thing a treasurer looks for,
 *  so the welcome stays one row high instead of a full-width banner. */
export function HeroSection() {
  return (
    <section
      aria-label="Grace-giving ส่วนต้อนรับ"
      className="animate-fade-up flex w-full items-center justify-between gap-5 border-b border-line pb-6 sm:pb-8"
    >
      <div className="order-2 size-16 shrink-0 overflow-hidden rounded-xl bg-tile-sand sm:size-24">
        <Illustration
          src="/illustrations/hero_jesus_shepherd.jpg"
          alt="พระเยซูคริสต์และลูกแกะ"
          className="h-full w-full object-cover object-[center_20%]"
          priority
          width={128}
          height={128}
        />
      </div>
      <div className="order-1 min-w-0 space-y-2">
        <p className="eyebrow">Church finance</p>
        <h1 className="display text-4xl text-ink sm:text-5xl">
          <span>Grace</span> <span className="text-brand-ink">Ledger</span>
        </h1>
        <p className="text-sm text-ink-2 sm:text-base">
          การเงินเชื่อมใจ เพื่อพันธกิจของพระเจ้า
        </p>
        <p className="flex flex-wrap items-baseline gap-x-2 pt-1 text-xs text-ink-3">
          <span className="font-semibold text-brand-ink">2 โครินธ์ 9:7</span>
          <span>“ผู้ให้ด้วยใจยินดี พระเจ้าทรงรัก”</span>
        </p>
      </div>
    </section>
  );
}
