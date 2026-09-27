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
      <SheetContent className="bg-card border-l border-border w-full sm:max-w-lg p-6 sm:p-8 overflow-y-auto">
        <SheetHeader className="mb-6">
          <SheetTitle className="text-xl sm:text-2xl font-bold text-foreground-soft flex items-center gap-3">
            <BookOpen className="w-6 h-6 text-primary" />
            <span>ข่าวสารและประกาศคริสตจักร</span>
          </SheetTitle>
          <SheetDescription className="text-sm sm:text-base text-muted-foreground font-medium mt-1">
            ติดตามกิจกรรม พันธกิจ และคำพยานพระพร
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-5">
          <div className="p-5 sm:p-6 rounded-2xl bg-muted border-2 border-border space-y-3 shadow-xs">
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-primary text-white inline-block">
              ประกาศสำคัญ
            </span>
            <h4 className="text-lg sm:text-xl font-bold text-foreground-soft">
              ค่ายสามัคคีธรรมประจำปี 2026
            </h4>
            <p className="text-sm sm:text-base text-foreground leading-relaxed font-medium">
              ขอเชิญชวนพี่น้องสมาชิกทุกท่านร่วมค่ายสามัคคีธรรม วันที่ 18-20 ต.ค.
              นี้ ณ ศูนย์ฝึกอบรมคริสเตียน
            </p>
          </div>

          <div className="p-5 sm:p-6 rounded-2xl bg-success-soft border-2 border-success-border space-y-3 shadow-xs">
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-success-border text-white inline-block">
              รายงานพันธกิจ
            </span>
            <h4 className="text-lg sm:text-xl font-bold text-success">
              โครงการแจกถุงยังชีพสู่ชุมชนรอบโบสถ์
            </h4>
            <p className="text-sm sm:text-base text-foreground leading-relaxed font-medium">
              คริสตจักรได้ส่งมอบถุงยังชีพจำนวน 120 ชุดแก่ครอบครัวยากไร้
              ขอบคุณพระเจ้าสำหรับทุกการถวาย
            </p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
