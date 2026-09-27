import { Sprout } from "lucide-react";
import { Illustration } from "@/components/Illustration";

export function HeroSection() {
  return (
    <section
      aria-label="Grace-giving ส่วนต้อนรับ"
      className="animate-fade-up relative rounded-2xl overflow-hidden bg-card border border-[#E7DCC8] shadow-xs p-5 sm:p-6 md:p-7 w-full"
    >
      {/* Hero Content Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-8 lg:gap-10 items-center relative z-10 w-full">
        {/* Left Column: Generous typography & clear hierarchy */}
        <div className="min-w-0 md:col-span-7 space-y-4 w-full flex flex-col justify-center">
          {/* Brand Title */}
          <h1 className="flex flex-col">
            <span className="flex items-center gap-2 sm:gap-3">
              <span className="text-3xl sm:text-4xl lg:text-5xl font-bold text-[#171311] tracking-tight leading-none font-display">
                Grace
              </span>
              <span className="text-[#2D6A2E]">
                <Sprout className="w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10 stroke-[2.5]" />
              </span>
            </span>
            <span className="text-3xl sm:text-4xl lg:text-5xl font-bold text-[#C94F16] tracking-tight leading-none font-display mt-1">
              Ledger
            </span>
          </h1>

          {/* Tagline */}
          <p className="text-base sm:text-lg font-semibold text-[#51443A] leading-relaxed">
            การเงินเชื่อมใจ เพื่อพันธกิจของพระเจ้า
          </p>

          {/* Bible Scripture Badge */}
          <div className="inline-flex flex-wrap items-center gap-2 sm:gap-3 px-3.5 py-2 rounded-full bg-[#FFF4D6] border border-[#F9D2AE] text-xs sm:text-sm text-[#171311] max-w-full">
            <span className="whitespace-nowrap font-bold text-[#9F3B0F] shrink-0">
              2 โครินธ์ 9:7
            </span>
            <span className="text-[#51443A] font-medium">
              “ผู้ให้ด้วยใจยินดี พระเจ้าทรงรัก”
            </span>
          </div>
        </div>

        {/* Right Column: Clean illustration card */}
        <div className="min-w-0 md:col-span-5 flex items-center justify-center md:justify-end w-full">
          <div className="relative w-full max-w-sm sm:max-w-md md:max-w-none aspect-[16/9] rounded-2xl overflow-hidden border border-[#E7DCC8] bg-[#FFF4D6]/50 shadow-xs">
            <Illustration
              src="/illustrations/hero_jesus_shepherd.jpg"
              alt="พระเยซูคริสต์และลูกแกะ"
              className="w-full h-full object-cover object-[center_20%]"
              priority
              width={512}
              height={384}
            />
            <div className="absolute bottom-3 left-3 pointer-events-none">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/95 backdrop-blur-xs border border-[#E7DCC8] shadow-2xs">
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
