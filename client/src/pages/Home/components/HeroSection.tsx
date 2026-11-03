import { Illustration } from "@/components/Illustration";

export function HeroSection() {
  return (
    <section
      aria-label="Grace Giving ส่วนต้อนรับ"
      className="animate-fade-up relative flex w-full items-center justify-between gap-4 rounded-[28px] bg-[#0E0E10] border border-white/[0.07] p-6 sm:gap-6 sm:p-8"
    >
      <div className="relative z-10 order-1 min-w-0 space-y-2.5">
        <h1 className="display text-4xl font-black text-white sm:text-6xl">
          <span>Grace</span> <span className="bg-gradient-to-r from-[#FF6A00] to-[#00F58A] bg-clip-text text-transparent">Giving</span>
        </h1>
        <p className="text-sm font-medium text-white/75 sm:text-base">
          การเงินเชื่อมใจ เพื่อพันธกิจของพระเจ้า
        </p>
        <p className="inline-flex flex-col gap-0.5 pt-0.5">
          <span className="text-sm font-semibold text-white/90 sm:text-base">
            “ผู้ให้ด้วยใจยินดี พระเจ้าทรงรัก”
          </span>
          <span className="text-xs font-bold tracking-wide text-white/60">
            2 โครินธ์ 9:7
          </span>
        </p>
      </div>

      <div className="relative z-10 order-2 size-20 shrink-0 overflow-hidden rounded-3xl bg-white/[0.06] p-1.5 sm:size-28 lg:size-32">
        <Illustration
          src="/illustrations/hero_jesus_shepherd.jpg"
          alt="พระเยซูคริสต์และลูกแกะ"
          className="h-full w-full rounded-2xl object-cover object-[center_20%]"
          priority
          width={128}
          height={128}
        />
      </div>
    </section>
  );
}
