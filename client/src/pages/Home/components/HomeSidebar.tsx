import {
  CheckCircle2, CreditCard, FileBarChart, HandCoins, Home as HomeIcon,
  Landmark, PieChart, Plus, ReceiptText, Settings2, Sprout, UsersRound,
} from "lucide-react";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";

type HomeTab = "home" | "ledger" | "reports" | "profile";

interface HomeSidebarProps {
  activeTab: HomeTab;
  onTabChange: (tab: HomeTab) => void;
  onOpenOffering: () => void;
}

export function HomeSidebar({ activeTab, onTabChange, onOpenOffering }: HomeSidebarProps) {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { data: churchProfile } = trpc.church.getProfile.useQuery(undefined, { retry: false });

  const sidebarNavItems = [
    { label: "หน้าหลัก", tab: "home" as HomeTab, icon: HomeIcon, iconColor: "text-primary", isTab: true },
    { label: "รายการ", tab: "ledger" as HomeTab, icon: ReceiptText, iconColor: "text-success", isTab: true },
    { label: "ถวายทรัพย์", path: "/offerings", icon: HandCoins, iconColor: "text-[#F7B6A6]", isTab: false },
    { label: "รายจ่าย", path: "/expenses", icon: CreditCard, iconColor: "text-primary", isTab: false },
    { label: "กองทุน", path: "/funds", icon: Landmark, iconColor: "text-info", isTab: false },
    { label: "งบประมาณ", path: "/budgets", icon: PieChart, iconColor: "text-[#C39BD3]", isTab: false },
    { label: "พันธกิจ", path: "/ministries", icon: Sprout, iconColor: "text-success", isTab: false },
    { label: "สมาชิก", path: "/members", icon: UsersRound, iconColor: "text-primary", isTab: false },
    { label: "รายงาน", tab: "reports" as HomeTab, icon: FileBarChart, iconColor: "text-[#A9D4ED]", isTab: true },
    { label: "การอนุมัติ", path: "/approvals", icon: CheckCircle2, iconColor: "text-success", isTab: false },
    { label: "ตั้งค่า", path: "/settings", icon: Settings2, iconColor: "text-secondary-foreground", isTab: false },
  ];


  return (
    <aside className="hidden lg:flex flex-col w-72 bg-surface-subtle/85 border-r border-hairline p-6 sticky top-0 h-screen overflow-y-auto shrink-0 z-30">
      {/* 1. Grace-giving (branding) */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/30 flex items-center justify-center relative overflow-hidden shrink-0">
          <Sprout className="w-7 h-7 text-secondary-foreground" />
          <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-success flex items-center justify-center">
            <span className="text-[10px] text-white font-bold">✝</span>
          </div>
        </div>
        <div>
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-bold text-foreground tracking-tight">Grace</span>
            <span className="text-xl font-bold text-primary tracking-tight">Ledger</span>
          </div>
          <p className="text-[11px] text-muted-foreground font-medium leading-tight">
            การเงินเชื่อมใจ เพื่อคริสตจักร
          </p>
        </div>
      </div>

      {/* Quick Offering Action Button on Sidebar */}
      <button
        onClick={onOpenOffering}
        className="w-full mb-6 py-3 px-4 rounded-2xl bg-primary hover:bg-[#0071e3] text-white font-bold flex items-center justify-center gap-2 clay-button-shadow transition-all"
        aria-label="บันทึกการถวายใหม่"
      >
        <Plus className="w-5 h-5 stroke-[2.5]" />
        <span>บันทึกการถวาย</span>
      </button>

      {/* Sidebar Nav Links in Exact Specified Order */}
      <nav className="flex-1 space-y-1 text-sm font-medium">
        {sidebarNavItems.map(item => {
          const Icon = item.icon;
          const isActive = item.isTab && activeTab === item.tab;
          return (
            <button
              key={item.label}
              onClick={() =>
                item.isTab ? onTabChange(item.tab!) : setLocation(item.path!)
              }
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-2xl transition-all ${
                isActive
                  ? "bg-surface-subtle text-secondary-foreground font-bold border border-hairline"
                  : "text-secondary-foreground/80 hover:bg-surface-subtle/60 hover:text-foreground"
              }`}
            >
              <Icon className={`w-5 h-5 ${item.iconColor}`} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* User Profile Card on Sidebar Bottom */}
      <div className="pt-4 mt-auto border-t border-hairline/80">
        <div className="flex items-center gap-3 p-3 rounded-2xl bg-surface-subtle border border-hairline">
          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-secondary-foreground font-bold text-sm">
            {user?.name ? user.name.slice(0, 1) : "ศ"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-secondary-foreground truncate">
              {user?.name || churchProfile?.name || "คริสตจักรพระคุณสมบูรณ์"}
            </p>
            <p className="text-[11px] text-success font-bold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-success" />
              {user?.churchRole === "SUPER_ADMIN"
                ? "ผู้ดูแลระบบสูงสุด"
                : user?.churchRole === "TREASURER"
                  ? "เหรัญญิกคริสตจักร"
                  : "สมาชิกคริสตจักร"}
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}