import { Sprout } from "lucide-react";
import { Illustration } from "@/components/Illustration";

// A title strip, not a banner: the balance below it is the first thing a
// treasurer needs to read, so the brand stays short enough to keep that
// figure above the fold on a 390px phone.
export function HeroSection() {
  return (
    <section
      aria-label="Grace-giving ส่วนต้อนรับ"
      className="flex items-center justify-between gap-6 w-full"
    >
      <div className="min-w-0 space-y-2">
        <h1 className="flex flex-wrap items-center gap-x-2 text-2xl sm:text-3xl font-semibold tracking-tight leading-tight font-display">
          <span className="text-[#171311]">Grace</span>
          <Sprout
            className="size-5 sm:size-6 text-[#1F5C33] stroke-[2.5]"
            aria-hidden="true"
          />
          <span className="text-[#0066CC]">Ledger</span>
        </h1>
        <p className="text-sm sm:text-base text-[#51443A] leading-relaxed">
          การเงินเชื่อมใจ เพื่อพันธกิจของพระเจ้า
        </p>
        <p className="flex flex-wrap gap-x-2 text-xs sm:text-sm leading-relaxed">
          <span className="whitespace-nowrap font-semibold text-[#0052A3]">
            2 โครินธ์ 9:7
          </span>
          <span className="text-[#51443A]">
            “ผู้ให้ด้วยใจยินดี พระเจ้าทรงรัก”
          </span>
        </p>
      </div>

      <div className="hidden sm:block shrink-0 size-24 md:size-28 rounded-2xl overflow-hidden border border-[#E7DCC8] bg-[#FFF8EA]">
        <Illustration
          src="/illustrations/hero_jesus_shepherd.jpg"
          alt="พระเยซูคริสต์และลูกแกะ"
          className="w-full h-full object-cover object-[center_20%]"
          width={224}
          height={224}
        />
      </div>
    </section>
  );
}
