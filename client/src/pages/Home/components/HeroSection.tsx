import { Sprout } from "lucide-react";
import { Illustration } from "@/components/Illustration";

export function HeroSection() {
  return (
    <section
      aria-label="Grace-giving ส่วนต้อนรับ"
      className="animate-fade-up relative rounded-3xl overflow-hidden bg-gradient-to-br from-white via-[#FFFDF9] to-[#FFF6EB] border border-[#E7DCC8]/80 fintech-card p-6 sm:p-8 md:p-10 w-full"
    >
      {/* Ambient background glow for fintech warmth */}
      <div
        className="pointer-events-none absolute -right-16 -top-16 size-64 rounded-full bg-gradient-to-br from-[#FC6C26]/10 to-[#1F5C33]/8 blur-3xl"
        aria-hidden="true"
      />

      {/* Hero Content Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-8 lg:gap-10 items-center relative z-10 w-full">
        {/* Left Column: Generous typography & clear hierarchy */}
        <div className="min-w-0 md:col-span-7 space-y-4 w-full flex flex-col justify-center">
          {/* Brand Title */}
          <h1 className="flex flex-col">
            <span className="flex items-center gap-2 sm:gap-3">
              <span className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-[#171311] tracking-tight leading-none font-display">
                Grace
              </span>
              <span className="inline-flex items-center justify-center size-8 sm:size-10 md:size-12 rounded-2xl bg-gradient-to-tr from-[#1F5C33] to-[#2D6A2E] text-white shadow-sm shadow-[#1F5C33]/25 p-1.5">
                <Sprout className="w-full h-full stroke-[2.5]" />
              </span>
            </span>
            <span className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold bg-gradient-to-r from-[#C94F16] to-[#FC6C26] bg-clip-text text-transparent tracking-tight leading-none font-display mt-1">
              Ledger
            </span>
          </h1>

          {/* Tagline */}
          <p className="text-base sm:text-lg md:text-xl font-bold text-[#3F3833] leading-relaxed">
            การเงินเชื่อมใจ เพื่อพันธกิจของพระเจ้า
          </p>

          {/* Bible Scripture Badge (Modern frosted glass pill) */}
          <div className="inline-flex flex-wrap items-center gap-2 sm:gap-3 px-4 py-2 rounded-2xl bg-white/85 backdrop-blur-md border border-[#E7DCC8] shadow-2xs text-xs sm:text-sm text-[#171311] max-w-full">
            <span className="whitespace-nowrap font-bold text-[#9F3B0F] shrink-0">
              2 โครินธ์ 9:7
            </span>
            <span className="text-stone-700 font-medium">
              “ผู้ให้ด้วยใจยินดี พระเจ้าทรงรัก”
            </span>
          </div>
        </div>

        {/* Right Column: Clean illustration card */}
        <div className="min-w-0 md:col-span-5 flex items-center justify-center md:justify-end w-full">
          <div className="relative w-full max-w-sm sm:max-w-md md:max-w-none aspect-[16/10] rounded-2xl overflow-hidden border border-[#E7DCC8] bg-[#FFF8EA]/50 shadow-sm">
            <Illustration
              src="/illustrations/hero_jesus_shepherd.jpg"
              alt="พระเยซูคริสต์และลูกแกะ"
              className="w-full h-full object-cover object-[center_20%]"
              priority
              width={512}
              height={384}
            />
            <div className="absolute bottom-3 left-3 pointer-events-none">
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/90 backdrop-blur-md border border-[#E7DCC8] shadow-2xs">
                <span className="text-xs font-bold text-[#3F3833]">
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
