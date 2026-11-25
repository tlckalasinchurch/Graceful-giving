export function HeroSection() {
  return (
    <section
      aria-label="Grace Giving ส่วนต้อนรับ"
      className="relative flex w-full flex-col justify-between gap-5 overflow-hidden rounded-[20px] border border-line bg-surface p-5 sm:flex-row sm:items-center sm:p-7"
    >
      <div className="relative z-10 min-w-0 space-y-2.5">
        <p className="text-sm font-medium text-ink-2">บัญชีการเงินคริสตจักร</p>

        <h1 className="display text-[clamp(1.75rem,4vw,2.5rem)] leading-[1.12] text-ink">
          Grace <span>Giving</span>
        </h1>

        <p className="max-w-md text-base font-normal leading-relaxed text-ink-2">
          การเงินเชื่อมใจ เพื่อพันธกิจของพระเจ้า
        </p>
      </div>
    </section>
  );
}
