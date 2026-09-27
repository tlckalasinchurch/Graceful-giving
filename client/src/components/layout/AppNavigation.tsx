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
    paths: ["/transactions", "/counting", "/offerings", "/giving/inbox", "/expenses"],
  },
  { label: "วางแผนและควบคุม", paths: ["/funds", "/budgets", "/approvals"] },
  { label: "คริสตจักร", paths: ["/ministries", "/members", "/updates"] },
  { label: "วิเคราะห์", paths: ["/reports"] },
  { label: "บัญชีผู้ใช้", paths: ["/profile", "/settings"] },
] as const;

export function getNavGroup(path: string) {
  return NAV_GROUPS.find(group => group.paths.some(item => item === path))?.label ?? "เมนู";
}

export function isActiveRoute(currentPath: string, path: string) {
  return (
    currentPath === path || (path !== "/" && currentPath.startsWith(`${path}/`))
  );
}

export function AppMenu({ children }: { children?: ReactNode }) {
  const [location] = useLocation();
  const { user } = useAuth();
  const authorizedNavItems = getAuthorizedNavItems(user);

  return (
    <Sheet>
      <SheetTrigger asChild>
        {children || (
          <button
            type="button"
            className="flex min-h-11 shrink-0 items-center gap-2 rounded-xl border border-[#E7DCC8] bg-white px-3.5 text-sm font-semibold text-[#171311] hover:bg-[#FFF8EA]"
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
        <SheetHeader className="border-b border-[#51443A] p-5 pr-16">
          <SheetTitle className="text-lg font-bold text-[#FFF4D6]">
            เมนูทั้งหมด
          </SheetTitle>
          <SheetDescription className="text-sm text-[#F6C09B] mt-0.5">
            จัดการการเงินและพันธกิจคริสตจักร
          </SheetDescription>
        </SheetHeader>
        <nav
          aria-label="เมนูทุกหมวด"
          className="min-h-0 flex-1 space-y-0.5 overflow-y-auto overscroll-contain p-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
        >
          {authorizedNavItems.reduce<ReactNode[]>((content, item, index) => {
            const previous = authorizedNavItems[index - 1];
            const group = getNavGroup(item.path);
            const previousGroup = previous ? getNavGroup(previous.path) : undefined;
            const active = isActiveRoute(location, item.path);
            const Icon = item.icon;
            if (group !== previousGroup) {
              content.push(
                <p key={`group-${group}`} className="px-3.5 pb-1 pt-4 text-[11px] font-bold uppercase tracking-[0.14em] text-[#807266] first:pt-0">
                  {group}
                </p>
              );
            }
            content.push(
              <SheetClose asChild key={item.path}>
                <GuardedLink
                  href={item.path}
                  aria-current={active ? "page" : undefined}
                  onFocus={e => e.currentTarget.scrollIntoView({ block: "nearest" })}
                  className={`flex min-h-11 items-center gap-3 rounded-lg px-3.5 text-[15px] ${
                    active
                      ? "bg-[#2997FF] font-semibold text-[#171311]"
                      : "font-medium text-[#FFF4D6] hover:bg-[#2A211C]"
                  }`}
                >
                  <Icon className={`size-5 shrink-0 ${active ? "text-[#171311]" : "text-[#2997FF]"}`} aria-hidden="true" />
                  <span>{item.label}</span>
                </GuardedLink>
              </SheetClose>
            );
            return content;
          }, [])}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
