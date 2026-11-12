import { BookOpen } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

interface ChurchNewsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ChurchNewsSheet({ open, onOpenChange }: ChurchNewsSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto border-l border-line bg-surface p-6 pt-[max(1.5rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:max-w-lg sm:p-8">
        <SheetHeader className="mb-6">
          <SheetTitle className="display flex items-center gap-3 text-xl text-ink sm:text-2xl">
            <span className="flex size-10 items-center justify-center rounded-xl bg-tile-sand text-tile-sand-ink">
              <BookOpen className="size-5" />
            </span>
            <span>ข่าวสารและประกาศคริสตจักร</span>
          </SheetTitle>
          <SheetDescription className="text-sm sm:text-base text-ink-3 font-medium mt-1">
            ติดตามกิจกรรม พันธกิจ และคำพยานพระพร
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4">
          <div className="space-y-2.5 rounded-[20px] border border-line bg-ground p-5 sm:p-6">
            <span className="inline-block rounded-full bg-tile-sky px-3 py-1 text-xs font-semibold text-tile-sky-ink">
              ประกาศสำคัญ
            </span>
            <h4 className="display text-lg text-ink">
              ค่ายสามัคคีธรรมประจำปี 2026
            </h4>
            <p className="text-sm sm:text-base text-ink-2 leading-relaxed">
              ขอเชิญชวนพี่น้องสมาชิกทุกท่านร่วมค่ายสามัคคีธรรม วันที่ 18-20 ต.ค.
              นี้ ณ ศูนย์ฝึกอบรมคริสเตียน
            </p>
          </div>

          <div className="space-y-2.5 rounded-[20px] border border-line bg-surface p-5 sm:p-6">
            <span className="inline-block rounded-full bg-tile-mint px-3 py-1 text-xs font-semibold text-tile-mint-ink">
              รายงานพันธกิจ
            </span>
            <h4 className="display text-lg text-ink">
              โครงการแจกถุงยังชีพสู่ชุมชนรอบโบสถ์
            </h4>
            <p className="text-sm sm:text-base text-ink-2 leading-relaxed">
              คริสตจักรได้ส่งมอบถุงยังชีพจำนวน 120 ชุดแก่ครอบครัวยากไร้
              ขอบคุณพระเจ้าสำหรับทุกการถวาย
            </p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
