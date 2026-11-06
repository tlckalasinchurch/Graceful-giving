import { Illustration } from "@/components/Illustration";

/**
 * The dashboard masthead. It is a letterhead, not a billboard: the wordmark,
 * one line saying what this system is for, and the verse the ministry stands
 * on. No gradient, no status pulse, no emoji — nothing here should compete
 * with the numbers directly below it.
 */
export function HeroSection() {
  return (
    <section
      aria-label="Grace Giving ส่วนต้อนรับ"
      className="w-full border-b border-line pb-5"
    >
      <div className="flex items-start justify-between gap-6">
        <div className="min-w-0">
          <p className="label">ระบบบัญชีการเงินคริสตจักร</p>
          <h1 className="display mt-2 text-[1.9rem] leading-[1.05] text-ink sm:text-[2.4rem]">
            <span>Grace</span> <span className="text-brand">Giving</span>
          </h1>
          <p className="mt-2.5 max-w-lg text-sm text-ink-2">
            การเงินเชื่อมใจ เพื่อพันธกิจของพระเจ้า
          </p>
        </div>

        <Illustration
          src="/illustrations/hero_jesus_shepherd.jpg"
          alt="พระเยซูคริสต์และลูกแกะ"
          className="size-14 shrink-0 rounded-lg border border-line object-cover object-[center_20%] sm:size-20"
          priority
          width={80}
          height={80}
        />
      </div>

      <p className="mt-4 flex flex-wrap items-baseline gap-x-2 gap-y-1 text-xs text-ink-3">
        <span>“ผู้ให้ด้วยใจยินดี พระเจ้าทรงรัก”</span>
        <span className="text-ink-2">2 โครินธ์ 9:7</span>
      </p>
    </section>
  );
}
