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
      <SheetContent className="w-full overflow-y-auto border-l-2 border-[var(--ink)] bg-surface p-6 pt-[max(1.5rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:max-w-lg sm:p-8">
        <SheetHeader className="mb-6">
          <SheetTitle className="display flex items-center gap-3 text-xl text-ink sm:text-2xl">
            <span className="flex size-10 items-center justify-center rounded-xl border-2 border-[var(--ink)] bg-accent text-accent-foreground shadow-[3px_3px_0_var(--ink)]">
              <BookOpen className="size-5" />
            </span>
            <span>ข่าวสารและประกาศคริสตจักร</span>
          </SheetTitle>
          <SheetDescription className="text-sm sm:text-base text-ink-3 font-medium mt-1">
            ติดตามกิจกรรม พันธกิจ และคำพยานพระพร
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-5">
          <div className="space-y-3 rounded-2xl border-2 border-[var(--ink)] bg-paper-2 p-5 shadow-[3px_3px_0_var(--ink)] sm:p-6">
            <span className="inline-block rounded-md border border-[var(--ink)] bg-brand px-2.5 py-1 text-xs font-bold uppercase tracking-[0.1em] text-white">
              ประกาศสำคัญ
            </span>
            <h4 className="display text-lg text-ink sm:text-xl">
              ค่ายสามัคคีธรรมประจำปี 2026
            </h4>
            <p className="text-sm sm:text-base text-ink-2 leading-relaxed font-medium">
              ขอเชิญชวนพี่น้องสมาชิกทุกท่านร่วมค่ายสามัคคีธรรม วันที่ 18-20 ต.ค.
              นี้ ณ ศูนย์ฝึกอบรมคริสเตียน
            </p>
          </div>

          <div className="space-y-3 rounded-2xl border-2 border-[var(--ink)] bg-tile-mint p-5 shadow-[3px_3px_0_var(--ink)] sm:p-6">
            <span className="inline-block rounded-md border border-[var(--ink)] bg-accent px-2.5 py-1 text-xs font-bold uppercase tracking-[0.1em] text-accent-foreground">
              รายงานพันธกิจ
            </span>
            <h4 className="display text-lg text-tile-mint-ink sm:text-xl">
              โครงการแจกถุงยังชีพสู่ชุมชนรอบโบสถ์
            </h4>
            <p className="text-sm sm:text-base text-ink-2 leading-relaxed font-medium">
              คริสตจักรได้ส่งมอบถุงยังชีพจำนวน 120 ชุดแก่ครอบครัวยากไร้
              ขอบคุณพระเจ้าสำหรับทุกการถวาย
            </p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
