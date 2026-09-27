import { BookOpen, Sprout } from "lucide-react";
import { Illustration } from "@/components/Illustration";
import { getDailyScripture, getGreeting } from "./dailyContent";

interface HeroSectionProps {
  /** First name or display name of the signed-in user. */
  name?: string;
  /** Injected for tests; the live page uses the current time. */
  now?: Date;
}

export function HeroSection({ name, now = new Date() }: HeroSectionProps) {
  const greeting = getGreeting(now);
  const scripture = getDailyScripture(now);
  const GreetingIcon = greeting.icon;

  return (
    <section
      aria-label="Grace-giving ส่วนต้อนรับ"
      className="relative w-full overflow-hidden rounded-2xl border border-[#E7DCC8] bg-card p-5 shadow-xs sm:p-6 md:p-7"
    >
      {/* Warm light in the corner. Decorative only. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-24 -top-24 size-72 rounded-full bg-[#FFE7C2]/60 blur-3xl"
      />

      <div className="relative z-10 grid w-full grid-cols-1 items-center gap-6 md:grid-cols-12 md:gap-8">
        <div className="flex min-w-0 flex-col justify-center gap-4 md:col-span-7">
          {/* Brand */}
          <h1 className="flex items-center gap-1.5 text-sm font-bold tracking-tight">
            <Sprout className="size-4 text-[#2D6A2E]" aria-hidden="true" />
            <span className="text-[#171311]">Grace</span>
            <span className="text-[#C94F16]">Ledger</span>
          </h1>

          {/* Greeting for the time of day */}
          <div>
            <p className="flex items-center gap-2 font-script text-3xl leading-none text-[#C94F16] sm:text-4xl">
              <GreetingIcon
                className="size-6 shrink-0 text-[#E08A3C]"
                aria-hidden="true"
              />
              {greeting.script}
            </p>
            <h2 className="mt-2 text-2xl font-bold leading-tight tracking-tight text-[#171311] sm:text-3xl">
              {greeting.thai}
              {name ? `, ${name}` : ""}
            </h2>
            <p className="mt-1 text-base font-medium leading-relaxed text-[#51443A]">
              การเงินเชื่อมใจ เพื่อพันธกิจของพระเจ้า
            </p>
          </div>

          {/* Daily scripture */}
          <figure className="relative rounded-2xl border border-[#F9D2AE] bg-[#FFF4D6]/70 p-4 pl-5 sm:p-5 sm:pl-6">
            <span
              aria-hidden="true"
              className="absolute inset-y-4 left-0 w-1 rounded-full bg-[#C94F16]"
            />
            <figcaption className="mb-2 flex items-center justify-between gap-3">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#9F3B0F]">
                <BookOpen className="size-3.5" aria-hidden="true" />
                ข้อพระคัมภีร์ประจำวัน
              </span>
              <span className="font-script text-xl leading-none text-[#C94F16]/80">
                Verse of the Day
              </span>
            </figcaption>
            <blockquote className="text-lg font-semibold leading-relaxed text-[#171311] sm:text-xl">
              “{scripture.text}”
            </blockquote>
            <p className="mt-2 text-sm font-bold text-[#9F3B0F]">
              {scripture.reference}
            </p>
          </figure>
        </div>

        {/* Illustration */}
        <div className="flex w-full min-w-0 items-center justify-center md:col-span-5 md:justify-end">
          <div className="relative aspect-[16/9] w-full max-w-sm overflow-hidden rounded-2xl border border-[#E7DCC8] bg-[#FFF4D6]/50 shadow-xs sm:max-w-md md:aspect-[4/5] md:max-w-none lg:aspect-[16/11]">
            <Illustration
              src="/illustrations/hero_jesus_shepherd.jpg"
              alt="พระเยซูคริสต์และลูกแกะ"
              className="h-full w-full object-cover object-[center_20%]"
              priority
              width={512}
              height={384}
            />
            <div className="pointer-events-none absolute bottom-3 left-3">
              <div className="inline-flex items-center gap-1.5 rounded-full border border-[#E7DCC8] bg-white/95 px-3 py-1 shadow-2xs backdrop-blur-xs">
                <span className="text-xs font-bold text-[#51443A]">
                  พระเยซูผู้เลี้ยงที่ดี ♥
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
