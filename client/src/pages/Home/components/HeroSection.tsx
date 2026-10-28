import { Illustration } from "@/components/Illustration";

/** A short greeting. The balance is the first thing a treasurer looks for,
 *  so the welcome stays one row high instead of a full-width banner. */
export function HeroSection() {
  return (
    <section
      aria-label="Grace-giving ส่วนต้อนรับ"
      className="animate-fade-up flex items-center gap-4 w-full"
    >
      <div className="size-14 sm:size-16 shrink-0 overflow-hidden rounded-2xl bg-tile-sand">
        <Illustration
          src="/illustrations/hero_jesus_shepherd.jpg"
          alt="พระเยซูคริสต์และลูกแกะ"
          className="h-full w-full object-cover object-[center_20%]"
          priority
          width={128}
          height={128}
        />
      </div>
      <div className="min-w-0 space-y-1">
        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-ink">
          <span>Grace</span> <span className="text-brand-ink">Ledger</span>
        </h1>
        <p className="text-sm text-ink-2">
          การเงินเชื่อมใจ เพื่อพันธกิจของพระเจ้า
        </p>
        <p className="flex flex-wrap items-baseline gap-x-2 text-xs text-ink-3">
          <span className="font-semibold text-tile-sand-ink">
            2 โครินธ์ 9:7
          </span>
          <span>“ผู้ให้ด้วยใจยินดี พระเจ้าทรงรัก”</span>
        </p>
      </div>
    </section>
  );
}
