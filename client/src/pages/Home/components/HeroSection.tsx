import { Illustration } from "@/components/Illustration";

export function HeroSection() {
  return (
    <section
      aria-label="Grace Giving ส่วนต้อนรับ"
      className="relative flex w-full items-center justify-between gap-4 rounded-2xl bg-surface border border-line p-5 sm:gap-6 sm:p-6"
    >
      <div className="relative z-10 order-1 min-w-0 space-y-2">
        <h1 className="display text-2xl font-bold text-ink sm:text-4xl">
          <span>Grace</span> <span>Giving</span>
        </h1>
        <p className="text-sm font-medium text-ink-2 sm:text-base">
          การเงินเชื่อมใจ เพื่อพันธกิจของพระเจ้า
        </p>
        <p className="hidden flex-col gap-0.5 pt-0.5 sm:inline-flex">
          <span className="text-sm font-semibold text-ink/90 sm:text-base">
            “ผู้ให้ด้วยใจยินดี พระเจ้าทรงรัก”
          </span>
          <span className="text-xs font-semibold tracking-normal text-ink-3">
            2 โครินธ์ 9:7
          </span>
        </p>
      </div>

      <div className="relative z-10 order-2 size-16 shrink-0 overflow-hidden rounded-xl bg-paper-2 p-1.5 sm:size-24 lg:size-28 border border-line">
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
