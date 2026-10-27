import { ChevronRight } from "lucide-react";

interface BudgetSectionProps {
  canOpenReports: boolean;
  onOpenReports: () => void;
}

export function BudgetSection({
  canOpenReports,
  onOpenReports,
}: BudgetSectionProps) {
  return (
    <section
      aria-label="แผนการใช้จ่ายงบประมาณ"
      className="bg-white rounded-3xl p-6 sm:p-7 border border-[#E7DCC8]/90 fintech-card space-y-4 w-full"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-lg sm:text-xl font-bold text-[#171311]">
          แผนการใช้จ่าย
        </h2>
        {canOpenReports && (
          <button
            onClick={onOpenReports}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#FFF8EA] hover:bg-[#FFF2DF] text-xs sm:text-sm font-bold text-[#9F3B0F] border border-[#E7DCC8] shadow-2xs transition-all active:scale-95 focus-visible:ring-2 focus-visible:ring-[#C94F16]"
          >
            <span>ดูรายงาน</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>
      <p className="py-6 text-sm sm:text-base text-[#51443A] font-medium">
        ยังไม่มีข้อมูลแผนการใช้จ่ายจากระบบ จึงยังไม่แสดงตัวเลขประมาณการ
      </p>
    </section>
  );
}
