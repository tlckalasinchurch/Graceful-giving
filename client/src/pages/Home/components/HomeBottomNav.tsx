import {
  CircleUserRound,
  FileBarChart,
  Home as HomeIcon,
  Plus,
  ReceiptText,
} from "lucide-react";

type HomeTab = "home" | "ledger" | "reports" | "profile";

interface HomeBottomNavProps {
  activeTab: HomeTab;
  onTabChange: (tab: HomeTab) => void;
  onOpenOffering: () => void;
}

export function HomeBottomNav({
  activeTab,
  onTabChange,
  onOpenOffering,
}: HomeBottomNavProps) {
  return (
    <nav
      aria-label="เมนูนำทางหลักบนมือถือ"
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-surface/95 backdrop-blur-md border-t border-hairline px-4 pt-2 pb-[max(1.25rem,env(safe-area-inset-bottom))]"
    >
      <div className="max-w-md mx-auto flex items-center justify-between relative">
        {/* 1. หน้าแรก */}
        <button
          type="button"
          onClick={() => onTabChange("home")}
          className={`flex flex-col items-center justify-center min-w-[56px] min-h-[48px] py-1 px-2.5 rounded-xl transition-all ${
            activeTab === "home"
              ? "bg-primary/10 text-primary font-semibold"
              : "text-muted-foreground hover:text-foreground"
          }`}
          aria-label="ไปที่หน้าแรก"
          aria-current={activeTab === "home" ? "page" : undefined}
        >
          <HomeIcon className="w-5 h-5 stroke-[2.2]" />
          <span className="text-[11px] mt-0.5 font-medium">หน้าแรก</span>
        </button>

        {/* 2. รายการ */}
        <button
          type="button"
          onClick={() => onTabChange("ledger")}
          className={`flex flex-col items-center justify-center min-w-[56px] min-h-[48px] py-1 px-2.5 rounded-xl transition-all ${
            activeTab === "ledger"
              ? "bg-primary/10 text-primary font-semibold"
              : "text-muted-foreground hover:text-foreground"
          }`}
          aria-label="ไปที่รายการการเงิน"
          aria-current={activeTab === "ledger" ? "page" : undefined}
        >
          <ReceiptText className="w-5 h-5 stroke-[2.2]" />
          <span className="text-[11px] mt-0.5 font-medium">รายการ</span>
        </button>

        {/* 3. CENTER PRIMARY FAB */}
        <div className="relative -top-5 flex flex-col items-center">
          <button
            type="button"
            onClick={onOpenOffering}
            className="w-14 h-14 rounded-full bg-primary hover:bg-[#0071e3] text-white flex items-center justify-center transition-transform active:scale-95 border-4 border-background focus-visible:ring-2 focus-visible:ring-[#0071e3]"
            aria-label="บันทึกการถวายใหม่ (เพิ่มรายการ)"
          >
            <Plus className="w-7 h-7 stroke-[2.8]" />
          </button>
          <span className="text-[11px] font-semibold text-primary mt-0.5">
            เพิ่ม
          </span>
        </div>

        {/* 4. รายงาน */}
        <button
          type="button"
          onClick={() => onTabChange("reports")}
          className={`flex flex-col items-center justify-center min-w-[56px] min-h-[48px] py-1 px-2.5 rounded-xl transition-all ${
            activeTab === "reports"
              ? "bg-primary/10 text-primary font-semibold"
              : "text-muted-foreground hover:text-foreground"
          }`}
          aria-label="ไปที่หน้ารายงาน"
          aria-current={activeTab === "reports" ? "page" : undefined}
        >
          <FileBarChart className="w-5 h-5 stroke-[2.2]" />
          <span className="text-[11px] mt-0.5 font-medium">รายงาน</span>
        </button>

        {/* 5. ฉัน */}
        <button
          type="button"
          onClick={() => onTabChange("profile")}
          className={`flex flex-col items-center justify-center min-w-[56px] min-h-[48px] py-1 px-2.5 rounded-xl transition-all ${
            activeTab === "profile"
              ? "bg-primary/10 text-primary font-semibold"
              : "text-muted-foreground hover:text-foreground"
          }`}
          aria-label="ไปที่หน้าฉัน (โปรไฟล์)"
          aria-current={activeTab === "profile" ? "page" : undefined}
        >
          <CircleUserRound className="w-5 h-5 stroke-[2.2]" />
          <span className="text-[11px] mt-0.5 font-medium">ฉัน</span>
        </button>
      </div>

      {/* Script Brand Signature: "All for His Glory ♥" */}
      <div className="pt-1.5 text-center">
        <p className="font-script text-xs md:text-sm text-muted-foreground tracking-wide">
          All for His Glory ♥
        </p>
      </div>
    </nav>
  );
}
