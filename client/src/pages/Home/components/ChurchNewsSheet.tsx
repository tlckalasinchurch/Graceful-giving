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
      <SheetContent className="bg-[#262626] border-l border-[#3D3D3D] w-full sm:max-w-lg p-6 sm:p-8 overflow-y-auto">
        <SheetHeader className="mb-6">
          <SheetTitle className="text-xl sm:text-2xl font-bold text-[#C9B8A8] flex items-center gap-3">
            <BookOpen className="w-6 h-6 text-primary" />
            <span>ข่าวสารและประกาศคริสตจักร</span>
          </SheetTitle>
          <SheetDescription className="text-sm sm:text-base text-[#8F8477] font-medium mt-1">
            ติดตามกิจกรรม พันธกิจ และคำพยานพระพร
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-5">
          <div className="p-5 sm:p-6 rounded-2xl bg-[#262626] border-2 border-[#3D3D3D] space-y-3 shadow-xs">
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-primary text-white inline-block">
              ประกาศสำคัญ
            </span>
            <h4 className="text-lg sm:text-xl font-semibold tracking-tight text-[#C9B8A8]">
              ค่ายสามัคคีธรรมประจำปี 2026
            </h4>
            <p className="text-sm sm:text-base text-foreground leading-relaxed font-medium">
              ขอเชิญชวนพี่น้องสมาชิกทุกท่านร่วมค่ายสามัคคีธรรม วันที่ 18-20 ต.ค.
              นี้ ณ ศูนย์ฝึกอบรมคริสเตียน
            </p>
          </div>

          <div className="p-5 sm:p-6 rounded-2xl bg-[#1A2E20] border-2 border-[#2E4A34] space-y-3 shadow-xs">
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-[#2E4A34] text-[#34D399] inline-block">
              รายงานพันธกิจ
            </span>
            <h4 className="text-lg sm:text-xl font-semibold tracking-tight text-[#34D399]">
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
