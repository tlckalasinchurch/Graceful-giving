import { type ReactNode } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { useTheme } from "@/contexts/ThemeContext";
import { canAccessRoute } from "@/lib/routeAccess";
import { getChurchRoleInfo, type RoleUser } from "@shared/roles";
import { GuardedLink } from "./GuardedLink";
import {
  Bell,
  CalendarDays,
  CheckCircle2,
  CircleUserRound,
  ClipboardList,
  Coins,
  CreditCard,
  FileBarChart,
  HandCoins,
  Home,
  Inbox,
  Landmark,
  Menu,
  Moon,
  PieChart,
  ReceiptText,
  Settings2,
  Sprout,
  Sun,
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
    label: "ขั้นตอนการถวาย",
    path: "/giving-guide",
    icon: ClipboardList,
  },
  {
    label: "ตรวจสลิป LINE",
    path: "/giving/inbox",
    icon: Inbox,
  },
  {
    label: "นับซองหน้างาน",
    path: "/counting",
    icon: Coins,
  },
  {
    label: "สมุดบัญชีถวาย",
    path: "/offerings",
    icon: HandCoins,
  },
  {
    label: "รายการ",
    path: "/transactions",
    icon: ReceiptText,
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

const NAV_GROUPS = [
  { label: "ภาพรวม", paths: ["/"] },
  {
    label: "ถวายและนับเงิน",
    paths: ["/giving-guide", "/giving/inbox", "/counting", "/offerings"],
  },
  { label: "การเงิน", paths: ["/transactions", "/expenses"] },
  {
    label: "วางแผนและควบคุม",
    paths: ["/funds", "/budgets", "/approvals", "/withdrawals"],
  },
  { label: "คริสตจักร", paths: ["/ministries", "/members", "/updates"] },
  { label: "วิเคราะห์", paths: ["/reports"] },
  { label: "บัญชีผู้ใช้", paths: ["/profile", "/settings", "/notifications"] },
] as const;

/**
 * Section label shown above a page title. A sub-page such as `/funds/12` or
 * `/expenses/new` takes the label of its parent path.
 */
export function getNavGroup(path: string) {
  return (
    NAV_GROUPS.find(group =>
      group.paths.some(item => isActiveRoute(path, item))
    )?.label ?? "เมนู"
  );
}

/**
 * Items the role can open, ordered by group so a group heading appears once.
 * Items inside a group keep the order of `navItems`.
 */
export function getAuthorizedNavItems(user?: RoleUser | null) {
  const groupOrder = (path: string) => {
    const index = NAV_GROUPS.findIndex(group =>
      group.paths.some(item => item === path)
    );
    return index === -1 ? NAV_GROUPS.length : index;
  };
  return navItems
    .map((item, position) => ({ item, position }))
    .filter(({ item }) => canAccessRoute(item.path, user))
    .sort(
      (a, b) =>
        groupOrder(a.item.path) - groupOrder(b.item.path) ||
        a.position - b.position
    )
    .map(({ item }) => item);
}

export function isActiveRoute(currentPath: string, path: string) {
  return (
    currentPath === path || (path !== "/" && currentPath.startsWith(`${path}/`))
  );
}

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  if (!toggleTheme) return null;
  const dark = theme === "dark";
  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={dark ? "เปลี่ยนเป็นโหมดสว่าง" : "เปลี่ยนเป็นโหมดมืด"}
      className="flex min-h-10 w-full items-center gap-3 rounded-xl border border-line bg-surface px-3 text-sm font-medium text-ink-2 transition-colors hover:border-[var(--field)] hover:text-ink cursor-pointer focus-visible:ring-2 focus-visible:ring-brand"
    >
      {dark ? (
        <Sun className="size-4 shrink-0 text-ink-3" aria-hidden="true" />
      ) : (
        <Moon className="size-4 shrink-0 text-ink-3" aria-hidden="true" />
      )}
      <span>{dark ? "โหมดสว่าง (Light)" : "โหมดมืด (Dark)"}</span>
    </button>
  );
}

export function AppMenu({ children }: { children?: ReactNode }) {
  const [location] = useLocation();
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const authorizedNavItems = getAuthorizedNavItems(user);
  const roleLabel = getChurchRoleInfo(user?.churchRole).label;

  return (
    <Sheet>
      <SheetTrigger asChild>
        {children || (
          <button
            type="button"
            className="btn-secondary flex min-h-11 shrink-0 items-center gap-2 rounded-xl px-4 text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-brand"
          >
            <Menu className="size-5" aria-hidden="true" />
            <span>เมนูทั้งหมด</span>
          </button>
        )}
      </SheetTrigger>
      <SheetContent
        side="left"
        className="w-[calc(100%-2rem)] max-w-sm gap-0 bg-surface text-ink border-r border-line shadow-xl flex flex-col"
      >
        <SheetHeader className="border-b border-line bg-ground p-5 pt-[max(1.25rem,env(safe-area-inset-top))] pr-16">
          <div className="mb-2 flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-xl bg-brand text-sm font-bold text-white">
              <Sprout className="size-4.5" aria-hidden="true" />
            </div>
            <div>
              <span className="font-display text-base font-bold tracking-tight text-ink block leading-none">
                Grace <span className="text-brand">Giving</span>
              </span>
              <span className="text-xs font-medium text-ink-3 mt-1 block">
                การเงินคริสตจักรที่โปร่งใส
              </span>
            </div>
          </div>
          <SheetTitle className="text-xs font-medium text-ink-3">
            เมนูทั้งหมด
          </SheetTitle>
          <SheetDescription className="text-sm text-ink-2 mt-0.5 max-w-xs">
            จัดการการเงินและพันธกิจคริสตจักรอย่างโปร่งใส
          </SheetDescription>
        </SheetHeader>
        <nav
          aria-label="เมนูทุกหมวด"
          className="min-h-0 flex-1 space-y-0.5 overflow-y-auto overscroll-contain p-4"
        >
          {authorizedNavItems.reduce<ReactNode[]>((content, item, index) => {
            const previous = authorizedNavItems[index - 1];
            const group = getNavGroup(item.path);
            const previousGroup = previous
              ? getNavGroup(previous.path)
              : undefined;
            const active = isActiveRoute(location, item.path);
            const Icon = item.icon;
            if (group !== previousGroup) {
              content.push(
                <p
                  key={`group-${group}`}
                  className="px-3 pb-1 pt-5 text-xs font-medium text-ink-3 first:pt-0"
                >
                  {group}
                </p>
              );
            }
            content.push(
              <SheetClose asChild key={item.path}>
                <GuardedLink
                  href={item.path}
                  aria-current={active ? "page" : undefined}
                  onFocus={e =>
                    e.currentTarget.scrollIntoView({ block: "nearest" })
                  }
                  className={`flex min-h-11 items-center gap-3 rounded-xl border px-3 text-base transition-colors ${
                    active
                      ? "border-line bg-paper-2 font-semibold text-ink"
                      : "border-transparent font-medium text-ink-2 hover:bg-paper-2 hover:text-ink"
                  }`}
                >
                  <Icon
                    className={`size-5 shrink-0 ${active ? "text-brand" : "text-ink-3"}`}
                    aria-hidden="true"
                  />
                  <span>{item.label}</span>
                </GuardedLink>
              </SheetClose>
            );
            return content;
          }, [])}
        </nav>
        <div className="p-4 pb-[max(1rem,env(safe-area-inset-bottom))] border-t border-line bg-ground space-y-2">
          {toggleTheme && (
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={
                theme === "dark" ? "เปลี่ยนเป็นโหมดสว่าง" : "เปลี่ยนเป็นโหมดมืด"
              }
              className="flex min-h-11 w-full items-center justify-between rounded-xl border border-line bg-surface px-3.5 text-sm font-medium text-ink-2 transition-colors hover:border-[var(--field)] hover:text-ink cursor-pointer"
            >
              <div className="flex items-center gap-3">
                {theme === "dark" ? (
                  <Sun
                    className="size-4 text-ink-2 shrink-0"
                    aria-hidden="true"
                  />
                ) : (
                  <Moon
                    className="size-4 text-brand shrink-0"
                    aria-hidden="true"
                  />
                )}
                <span>
                  {theme === "dark" ? "โหมดสว่าง (Light)" : "โหมดมืด (Dark)"}
                </span>
              </div>
              <span className="text-xs text-ink-3 font-medium">
                {theme === "dark" ? "เปิดอยู่" : "ปิดอยู่"}
              </span>
            </button>
          )}
          <SheetClose asChild>
            <GuardedLink
              href="/notifications"
              className="flex min-h-11 items-center gap-3 rounded-xl border border-line bg-surface px-3.5 text-sm font-medium text-ink-2 transition-colors hover:border-[var(--field)] hover:text-ink"
            >
              <Bell className="size-4 text-brand shrink-0" aria-hidden="true" />
              <span>การแจ้งเตือน</span>
            </GuardedLink>
          </SheetClose>
          <SheetClose asChild>
            <GuardedLink
              href="/profile"
              className="flex items-center gap-3 rounded-xl border border-line bg-surface px-3 py-2.5 transition-colors hover:border-[var(--field)]"
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-tile-mint text-sm font-semibold text-tile-mint-ink">
                {user?.name ? user.name.slice(0, 1) : "ศ"}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-ink">
                  {user?.name || "ผู้ใช้"}
                </span>
                <span className="block truncate text-xs font-normal text-ink-3">
                  {roleLabel}
                </span>
              </span>
            </GuardedLink>
          </SheetClose>
        </div>
      </SheetContent>
    </Sheet>
  );
}
