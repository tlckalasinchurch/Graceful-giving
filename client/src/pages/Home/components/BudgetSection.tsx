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
      className="bg-white rounded-2xl p-5 sm:p-6 border border-[#E5E1D8] shadow-xs space-y-4 w-full"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-lg sm:text-xl font-bold text-[#171717]">
          แผนการใช้จ่าย
        </h2>
        {canOpenReports && (
          <button
            onClick={onOpenReports}
            className="min-h-11 -mr-2 px-2 text-sm sm:text-base font-bold text-[#D95E0B] hover:underline flex items-center gap-1 focus-visible:ring-2 focus-visible:ring-[#F97316]"
          >
            <span>ดูรายงาน</span>
            <ChevronRight className="w-5 h-5" />
          </button>
        )}
      </div>
      <p className="py-6 text-sm sm:text-base text-[#292929] font-bold">
        ยังไม่มีข้อมูลแผนการใช้จ่ายจากระบบ จึงยังไม่แสดงตัวเลขประมาณการ
      </p>
    </section>
  );
}
