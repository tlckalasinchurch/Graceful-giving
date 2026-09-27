import { ChevronRight, PieChart } from "lucide-react";

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
      className="bg-card rounded-2xl p-5 sm:p-6 border border-[#E7DCC8] shadow-xs space-y-4 w-full"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-[#171311]">
          แผนการใช้จ่าย
        </h2>
        {canOpenReports && (
          <button
            onClick={onOpenReports}
            className="min-h-11 -mr-2 px-3 rounded-xl text-sm font-semibold text-[#9F3B0F] flex items-center gap-1 transition-all duration-200 ease-in-out hover:bg-[#FFF4D6] focus-visible:ring-2 focus-visible:ring-[#C94F16]"
          >
            <span>ดูรายงาน</span>
            <ChevronRight className="size-4" />
          </button>
        )}
      </div>
      <div className="flex items-center gap-4 rounded-xl border border-dashed border-[#E0CFB3] bg-[#FAF8F5] p-4">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[#FFF4D6] text-[#C94F16]">
          <PieChart className="size-5" aria-hidden="true" />
        </span>
        <p className="text-sm leading-relaxed text-[#51443A]">
          ยังไม่มีข้อมูลแผนการใช้จ่ายจากระบบ จึงยังไม่แสดงตัวเลขประมาณการ
        </p>
      </div>
    </section>
  );
}
