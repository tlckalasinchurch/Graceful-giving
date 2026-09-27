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
      className="bg-white rounded-2xl p-5 sm:p-6 border border-[#E7DCC8] space-y-4 w-full"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-lg sm:text-xl font-bold text-[#171311]">
          แผนการใช้จ่าย
        </h2>
        {canOpenReports && (
          <button
            onClick={onOpenReports}
            className="min-h-11 -mr-2 px-2 text-sm sm:text-base font-bold text-[#0052A3] hover:underline flex items-center gap-1 focus-visible:ring-2 focus-visible:ring-[#0066CC]"
          >
            <span>ดูรายงาน</span>
            <ChevronRight className="w-5 h-5" />
          </button>
        )}
      </div>
      <div className="space-y-3 py-2">
        <p className="text-sm sm:text-base text-[#51443A] leading-relaxed">
          ยังไม่มีข้อมูลแผนการใช้จ่ายจากระบบ จึงยังไม่แสดงตัวเลขประมาณการ
        </p>
        {canOpenBudgets && (
          <button
            onClick={onOpenBudgets}
            className="inline-flex items-center gap-2 min-h-11 px-4 rounded-xl bg-white hover:bg-[#FFF8EA] text-[#171311] text-sm sm:text-base font-bold border border-[#E7DCC8] hover:border-[#0066CC] transition-colors focus-visible:ring-2 focus-visible:ring-[#0066CC]"
          >
            <span>จัดการงบประมาณ</span>
            <ChevronRight className="w-4 h-4 text-[#3F3833]" />
          </button>
        )}
      </div>
    </section>
  );
}
