import { ChevronRight } from "lucide-react";
import { Illustration } from "@/components/Illustration";

interface ChurchNewsCardProps {
  onOpenNews: () => void;
}

export function ChurchNewsCard({ onOpenNews }: ChurchNewsCardProps) {
  return (
    <section aria-label="ข่าวสารจากคริสตจักร" className="w-full">
      <div
        onClick={onOpenNews}
        className="cursor-pointer bg-gradient-to-r from-card via-background to-muted border-2 border-border rounded-2xl sm:rounded-2xl p-5 sm:p-7 flex items-center justify-between gap-4 hover:border-primary transition-all shadow-xs"
        role="button"
        tabIndex={0}
        onKeyDown={e => {
          if (e.key === "Enter" || e.key === " ") {
            onOpenNews();
          }
        }}
        aria-label="เปิดดูข่าวสารจากคริสตจักร"
      >
        <div className="flex items-center gap-4">
          <div className="w-18 h-18 sm:w-22 sm:h-22 rounded-2xl overflow-hidden shrink-0 bg-white p-1.5 border border-border">
            <Illustration
              src="/illustrations/bible_cross.jpg"
              alt="พระคัมภีร์และกางเขน"
              className="w-full h-full object-cover rounded-xl"
              width={88}
              height={88}
              aria-hidden="true"
            />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-foreground">
              ข่าวสารจากคริสตจักร
            </h2>
            <p className="text-sm sm:text-base text-foreground-soft font-bold mt-0.5">
              ติดตามประกาศ กิจกรรม และพันธกิจต่าง ๆ
            </p>
          </div>
        </div>
        <div className="w-11 h-11 rounded-full bg-white flex items-center justify-center text-foreground border-2 border-border shrink-0 shadow-2xs">
          <ChevronRight className="w-6 h-6" />
        </div>
      </div>
    </section>
  );
}
