import { type ReactNode } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { canAccessRoute } from "@/lib/routeAccess";
import { GuardedLink } from "./GuardedLink";
import {
  CalendarDays,
  CheckCircle2,
  CircleUserRound,
  Coins,
  CreditCard,
  FileBarChart,
  HandCoins,
  Home,
  Inbox,
  Landmark,
  Menu,
  PieChart,
  ReceiptText,
  Settings2,
  Sprout,
  UsersRound,
} from "lucide-react";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

export const navItems = [
  { label: "หน้าหลัก", path: "/", icon: Home },
  {
    label: "รายการ",
    path: "/transactions",
    icon: ReceiptText,
  },
  {
    label: "นับเงินถวาย",
    path: "/counting",
    icon: Coins,
  },
  {
    label: "ถวายทรัพย์",
    path: "/offerings",
    icon: HandCoins,
  },
  {
    label: "กล่องสลิป LINE",
    path: "/giving/inbox",
    icon: Inbox,
  },
  {
    label: "รายจ่าย",
    path: "/expenses",
    icon: CreditCard,
  },
  {
    label: "กองทุน",
    path: "/funds",
    icon: Landmark,
  },
  {
    label: "งบประมาณ",
    path: "/budgets",
    icon: PieChart,
  },
  {
    label: "พันธกิจ",
    path: "/ministries",
    icon: Sprout,
  },
  {
    label: "สมาชิก",
    path: "/members",
    icon: UsersRound,
  },
  {
    label: "รายงาน",
    path: "/reports",
    icon: FileBarChart,
  },
  {
    label: "การอนุมัติ",
    path: "/approvals",
    icon: CheckCircle2,
  },
  {
    label: "ข่าวสารและกิจกรรม",
    path: "/updates",
    icon: CalendarDays,
  },
  {
    label: "โปรไฟล์",
    path: "/profile",
    icon: CircleUserRound,
  },
  {
    label: "ตั้งค่า",
    path: "/settings",
    icon: Settings2,
  },
];

export function getAuthorizedNavItems(
  user?: { role?: string; churchRole?: string | null } | null
) {
  return navItems.filter(item => canAccessRoute(item.path, user));
}

const NAV_GROUPS = [
  { label: "ภาพรวม", paths: ["/"] },
  {
    label: "การเงิน",
    paths: [
      "/transactions",
      "/counting",
      "/offerings",
      "/giving/inbox",
      "/expenses",
    ],
  },
  { label: "วางแผนและควบคุม", paths: ["/funds", "/budgets", "/approvals"] },
  { label: "คริสตจักร", paths: ["/ministries", "/members", "/updates"] },
  { label: "วิเคราะห์", paths: ["/reports"] },
  { label: "บัญชีผู้ใช้", paths: ["/profile", "/settings"] },
] as const;

export function getNavGroup(path: string) {
  return (
    NAV_GROUPS.find(group => group.paths.some(item => item === path))?.label ??
    "เมนู"
  );
}

/**
 * Authorized nav items bucketed by NAV_GROUPS, in group order.
 *
 * navItems is a flat list, and some groups are not contiguous in it
 * (/approvals sits after /reports, for example). Rendering the flat list
 * printed the same group heading twice, under a duplicate React key.
 */
export function getGroupedNavItems(
  user?: { role?: string; churchRole?: string | null } | null
) {
  const items = getAuthorizedNavItems(user);
  return NAV_GROUPS.map(group => ({
    label: group.label,
    items: items.filter(item => getNavGroup(item.path) === group.label),
  })).filter(group => group.items.length > 0);
}

export function isActiveRoute(currentPath: string, path: string) {
  return (
    currentPath === path || (path !== "/" && currentPath.startsWith(`${path}/`))
  );
}

export function AppMenu({ children }: { children?: ReactNode }) {
  const [location] = useLocation();
  const { user } = useAuth();

  return (
    <Sheet>
      <SheetTrigger asChild>
        {children || (
          <button
            type="button"
            className="flex min-h-11 shrink-0 items-center gap-2 rounded-xl border border-[#E7DCC8] bg-white px-3.5 text-sm font-semibold text-[#171311] shadow-xs transition-all duration-200 ease-in-out hover:bg-[#FFF4D6] active:scale-[0.98]"
          >
            <Menu className="size-5" aria-hidden="true" />
            <span>เมนูทั้งหมด</span>
          </button>
        )}
      </SheetTrigger>
      <SheetContent
        side="left"
        className="w-[calc(100%-2rem)] max-w-sm gap-0 bg-[#171311] text-[#FFF4D6]"
      >
        <SheetHeader className="border-b border-[#2E2520] p-5 pr-16">
          <SheetTitle className="text-lg font-bold text-[#FFF4D6]">
            เมนูทั้งหมด
          </SheetTitle>
          <SheetDescription className="text-sm text-[#F6C09B] mt-0.5">
            จัดการการเงินและพันธกิจคริสตจักร
          </SheetDescription>
        </SheetHeader>
        <nav
          aria-label="เมนูทุกหมวด"
          className="min-h-0 flex-1 space-y-0.5 overflow-y-auto [&>div:first-child>p]:pt-0 overscroll-contain p-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
        >
          {getGroupedNavItems(user).map(group => (
            <div key={group.label} role="group" aria-label={group.label}>
              <p className="px-3.5 pb-1.5 pt-5 text-[11px] font-semibold tracking-wide text-[#8C7B6B]">
                {group.label}
              </p>
              {group.items.map(item => {
                const active = isActiveRoute(location, item.path);
                const Icon = item.icon;
                return (
                  <SheetClose asChild key={item.path}>
                    <GuardedLink
                      href={item.path}
                      aria-current={active ? "page" : undefined}
                      onFocus={e =>
                        e.currentTarget.scrollIntoView({ block: "nearest" })
                      }
                      className={`flex min-h-12 items-center gap-3 rounded-xl px-3.5 text-[15px] transition-all duration-200 ease-in-out ${
                        active
                          ? "bg-[#C94F16] font-semibold text-white shadow-sm"
                          : "font-medium text-[#E9DDC8] hover:bg-white/[0.06] hover:text-white"
                      }`}
                    >
                      <Icon
                        className={`size-5 shrink-0 ${active ? "text-white" : "text-[#F6C09B]"}`}
                        aria-hidden="true"
                      />
                      <span>{item.label}</span>
                    </GuardedLink>
                  </SheetClose>
                );
              })}
            </div>
          ))}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
