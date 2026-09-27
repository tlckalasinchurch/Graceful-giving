import { ChevronRight } from "lucide-react";

interface BudgetSectionProps {
  canOpenReports: boolean;
  onOpenReports: () => void;
  canOpenBudgets: boolean;
  onOpenBudgets: () => void;
}

export function BudgetSection({
  canOpenReports,
  onOpenReports,
  canOpenBudgets,
  onOpenBudgets,
}: BudgetSectionProps) {
  return (
    <section
      aria-label="แผนการใช้จ่ายงบประมาณ"
      className="bg-[#FFFFFF] rounded-2xl p-5 sm:p-6 border border-[#E5E1D8] space-y-4 w-full"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-lg sm:text-xl font-semibold tracking-tight text-white">
          แผนการใช้จ่าย
        </h2>
        {canOpenReports && (
          <button
            onClick={onOpenReports}
            className="min-h-11 -mr-2 px-2 text-sm sm:text-base font-bold text-[#F97316] hover:underline flex items-center gap-1 focus-visible:ring-2 focus-visible:ring-[#F97316]"
          >
            <span>ดูรายงาน</span>
            <ChevronRight className="w-5 h-5" />
          </button>
        )}
      </div>
      <div className="space-y-3 py-2">
        <p className="text-sm sm:text-base text-[#5F5B55] leading-relaxed">
          ยังไม่มีข้อมูลแผนการใช้จ่ายจากระบบ จึงยังไม่แสดงตัวเลขประมาณการ
        </p>
        {canOpenBudgets && (
          <button
            onClick={onOpenBudgets}
            className="inline-flex items-center gap-2 min-h-11 px-4 rounded-xl bg-[#F1EFE9] hover:bg-[#242529] text-white text-sm sm:text-base font-bold border border-[#E5E1D8] hover:border-[#F97316]/50 transition-colors focus-visible:ring-2 focus-visible:ring-[#F97316]"
          >
            <span>จัดการงบประมาณ</span>
            <ChevronRight className="w-4 h-4 text-[#5F5B55]" />
          </button>
        )}
      </div>
    </section>
  );
}
