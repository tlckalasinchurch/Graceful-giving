import { Illustration } from "@/components/Illustration";

export function HeroSection() {
  return (
    <section
      aria-label="Grace Giving ส่วนต้อนรับ"
      className="relative flex w-full flex-col sm:flex-row sm:items-center justify-between gap-5 rounded-3xl bg-gradient-to-br from-surface via-surface to-amber-50/25 dark:from-surface dark:via-surface dark:to-emerald-950/20 border border-line p-6 sm:p-7 shadow-xs overflow-hidden"
    >
      <div className="relative z-10 min-w-0 space-y-2.5">
        <div className="flex items-center gap-2">
          <span
            className="size-2 rounded-full bg-emerald-500 animate-pulse"
            aria-hidden="true"
          />
          <span className="text-xs font-bold tracking-wider text-emerald-800 dark:text-emerald-400 uppercase">
            Church Financial Ledger
          </span>
        </div>

        <h1 className="display text-2xl font-bold text-ink sm:text-3xl lg:text-4xl tracking-tight">
          <span>Grace</span>{" "}
          <span className="text-emerald-700 dark:text-emerald-400">Giving</span>
        </h1>

        <p className="text-sm font-medium text-ink-2 sm:text-base">
          การเงินเชื่อมใจ เพื่อพันธกิจของพระเจ้า
        </p>

        <div className="flex flex-wrap items-center gap-2 pt-1 text-ink/90">
          <div className="inline-flex flex-wrap items-center gap-2 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200/80 dark:border-amber-800/60 px-3 py-1.5 shadow-2xs">
            <span className="text-amber-500 text-xs" aria-hidden="true">
              ✨
            </span>
            <span className="text-xs sm:text-sm font-semibold italic text-amber-950 dark:text-amber-200">
              “ผู้ให้ด้วยใจยินดี พระเจ้าทรงรัก”
            </span>
            <span className="rounded-md bg-amber-200/70 dark:bg-amber-800/60 px-2 py-0.5 text-xs font-bold text-amber-900 dark:text-amber-100">
              2 โครินธ์ 9:7
            </span>
          </div>
        </div>
      </div>

      <div className="relative z-10 size-16 sm:size-24 lg:size-28 shrink-0 self-end sm:self-center overflow-hidden rounded-2xl bg-paper-2 p-1 border border-amber-200/60 dark:border-line shadow-xs ring-2 ring-emerald-500/10">
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
