import React from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { useGuardedNavigate } from "@/hooks/useUnsavedChanges";
import { GuardedLink } from "./GuardedLink";
import { AppMenu, getGroupedNavItems, isActiveRoute } from "./AppNavigation";
import { getChurchRoleInfo } from "@shared/roles";
import {
  Bell,
  CircleUserRound,
  FileBarChart,
  Home as HomeIcon,
  Plus,
  ReceiptText,
  Sprout,
} from "lucide-react";

type MobileTabItem = {
  path: string;
  label: string;
  ariaLabel: string;
  icon: React.ComponentType<{ className?: string }>;
  match: (path: string) => boolean;
};

const MOBILE_TABS: MobileTabItem[] = [
  {
    path: "/",
    label: "หน้าแรก",
    ariaLabel: "ไปที่หน้าแรก",
    icon: HomeIcon,
    match: p => p === "/",
  },
  {
    path: "/transactions",
    label: "รายการ",
    ariaLabel: "ไปที่รายการการเงิน",
    icon: ReceiptText,
    match: p => isActiveRoute(p, "/transactions"),
  },
  {
    path: "/reports",
    label: "รายงาน",
    ariaLabel: "ไปที่หน้ารายงาน",
    icon: FileBarChart,
    match: p => isActiveRoute(p, "/reports"),
  },
  {
    path: "/profile",
    label: "ฉัน",
    ariaLabel: "ไปที่หน้าโปรไฟล์",
    icon: CircleUserRound,
    match: p => isActiveRoute(p, "/profile") || isActiveRoute(p, "/settings"),
  },
];

function MobileTab({
  tab,
  active,
  onSelect,
}: {
  tab: MobileTabItem;
  active: boolean;
  onSelect: () => void;
}) {
  const Icon = tab.icon;
  return (
    <button
      onClick={onSelect}
      aria-label={tab.ariaLabel}
      aria-current={active ? "page" : undefined}
      className={`group flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl transition-all duration-200 ease-in-out active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FC6C26] ${
        active ? "text-[#FC6C26]" : "text-[#D9CBB5] hover:text-white"
      }`}
    >
      <span
        className={`flex h-7 w-12 items-center justify-center rounded-full transition-all duration-200 ease-in-out ${
          active ? "bg-[#FC6C26]/15" : "group-hover:bg-white/5"
        }`}
      >
        <Icon className="size-[22px]" aria-hidden="true" />
      </span>
      <span
        className={`text-[11px] leading-none ${active ? "font-semibold" : "font-medium"}`}
      >
        {tab.label}
      </span>
    </button>
  );
}

interface AppLayoutProps {
  children: React.ReactNode;
  activeRoute?: string;
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  children,
  activeRoute,
  title,
  subtitle,
  action,
}) => {
  const [location] = useLocation();
  const navigate = useGuardedNavigate();
  const { user } = useAuth();
  const currentPath = activeRoute || location;

  const { data: churchProfile } = trpc.church.getProfile.useQuery(undefined, {
    retry: false,
    staleTime: 60_000,
  });

  const churchName =
    churchProfile?.name || user?.name || "คริสตจักรพระคุณสมบูรณ์";

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans selection:bg-[#FFF4D6] overflow-x-clip">
      <div className="flex-1 flex flex-row w-full max-w-none mx-auto min-w-0">
        {/* DESKTOP FIXED SIDEBAR (Visible on lg: >= 1024px) */}
        <aside className="hidden lg:flex flex-col w-64 xl:w-72 bg-[#171311] border-r border-[#2E2520] px-4 py-6 sticky top-0 h-screen overflow-y-auto no-scrollbar shrink-0 z-30">
          {/* 1. Grace-giving Branding */}
          <GuardedLink
            href="/"
            className="flex items-center gap-3 px-2 mb-6 cursor-pointer select-none rounded-xl transition-all duration-200 ease-in-out hover:opacity-90"
          >
            <div className="size-10 rounded-xl bg-[#C94F16] ring-1 ring-white/10 flex items-center justify-center shrink-0">
              <Sprout className="size-5 text-white" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <p className="text-lg font-bold leading-tight tracking-tight text-[#FFF4D6]">
                Grace <span className="text-[#FC6C26]">Ledger</span>
              </p>
              <p className="text-xs text-[#A89684] leading-tight mt-0.5">
                การเงินเชื่อมใจ เพื่อคริสตจักร
              </p>
            </div>
          </GuardedLink>

          {/* Quick Offering Action Button */}
          <button
            onClick={() => navigate("/offerings/new")}
            className="w-full mb-6 min-h-11 px-4 rounded-xl bg-[#C94F16] hover:bg-[#E05A1B] active:scale-[0.98] text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-sm transition-all duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FC6C26] focus-visible:ring-offset-2 focus-visible:ring-offset-[#171311]"
            aria-label="บันทึกการถวายใหม่"
          >
            <Plus className="size-4 stroke-[2.5]" />
            <span>บันทึกการถวาย</span>
          </button>

          <nav aria-label="เมนูนำทางหลัก" className="flex-1 space-y-0.5">
            {getGroupedNavItems(user).map((group, groupIndex) => (
              <div key={group.label} role="group" aria-label={group.label}>
                <p
                  className={`px-3 pb-1.5 text-[11px] font-semibold tracking-wide text-[#8C7B6B] ${groupIndex === 0 ? "pt-0" : "pt-5"}`}
                >
                  {group.label}
                </p>
                <div className="space-y-0.5">
                  {group.items.map(item => {
                    const Icon = item.icon;
                    const isActive = isActiveRoute(currentPath, item.path);
                    return (
                      <GuardedLink
                        key={item.path}
                        href={item.path}
                        aria-current={isActive ? "page" : undefined}
                        className={`relative w-full flex min-h-10 items-center gap-3 px-3 rounded-xl text-sm transition-all duration-200 ease-in-out ${
                          isActive
                            ? "bg-[#C94F16] text-white font-semibold shadow-sm"
                            : "text-[#E9DDC8] font-medium hover:bg-white/[0.06] hover:text-white"
                        }`}
                      >
                        <Icon
                          className={`size-[18px] shrink-0 transition-colors duration-200 ${isActive ? "text-white" : "text-[#F6C09B]"}`}
                          aria-hidden="true"
                        />
                        <span className="truncate">{item.label}</span>
                      </GuardedLink>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>

          {/* User Profile Card at Sidebar Bottom */}
          <div className="pt-4 mt-4 border-t border-[#2E2520]">
            <GuardedLink
              href="/profile"
              className="flex items-center gap-3 p-2.5 rounded-xl cursor-pointer bg-white/[0.03] border border-white/5 hover:bg-white/[0.07] transition-all duration-200 ease-in-out"
            >
              <div className="size-9 rounded-full bg-[#FC6C26] flex items-center justify-center text-[#171311] font-semibold text-sm shrink-0">
                {user?.name ? user.name.slice(0, 1) : "ศ"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[#FFF4D6] truncate">
                  {churchName}
                </p>
                <p className="text-xs text-[#A89684] truncate">
                  {getChurchRoleInfo(user?.churchRole).label}
                </p>
              </div>
            </GuardedLink>
          </div>
        </aside>

        {/* MAIN CONTAINER (Auto-filling 100% available space across all screens) */}
        {/* The column is capped at --content-max and centred in whatever space
            is left beside the sidebar, so a row's date and its amount stay
            within reading distance of each other on a wide monitor. */}
        <main className="flex-1 w-full max-w-[var(--content-max)] mx-auto bg-background px-4 sm:px-6 md:px-8 lg:px-10 xl:px-12 py-4 sm:py-6 md:py-8 flex flex-col pb-[calc(var(--mobile-nav-clearance)+env(safe-area-inset-bottom))] lg:pb-16 min-w-0">
          {/* Top Bar for Desktop and Mobile */}
          <header className="flex flex-wrap items-end justify-between gap-3 sm:gap-4 mb-6">
            <div className="flex w-full items-center justify-between lg:hidden">
              <AppMenu />
              <GuardedLink
                href="/notifications"
                className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-[#E7DCC8] bg-white text-[#51443A] shadow-xs transition-all duration-200 ease-in-out hover:bg-[#FFF4D6] hover:text-[#171311]"
                aria-label="การแจ้งเตือน"
              >
                <Bell className="size-5" aria-hidden="true" />
              </GuardedLink>
            </div>
            {/* Left: Page Title */}
            {title && (
              <div className="min-w-0 flex-1 basis-full sm:basis-0">
                <h1 className="text-2xl md:text-3xl font-bold text-[#171311] tracking-tight break-words">
                  {title}
                </h1>
                {subtitle && (
                  <p className="text-sm leading-relaxed text-[#51443A] mt-1 max-w-2xl">
                    {subtitle}
                  </p>
                )}
              </div>
            )}
            {/* No brand lockup here when a page passes no title. The sidebar
                already carries it on lg:, and every title-less page (Home,
                Funds, Expenses, Approvals, Settings and the two entry forms)
                opens with its own hero or banner, so the fallback only ever
                repeated a mark the user could already see. */}

            {/* Right: Actions and Notification */}
            <div className="ml-auto flex max-w-full flex-wrap items-center gap-2.5">
              {action && (
                <div className="max-w-full [&>div]:flex-wrap [&_button]:min-h-11">
                  {action}
                </div>
              )}

              <button
                onClick={() => navigate("/notifications")}
                className="hidden lg:flex size-11 shrink-0 rounded-xl bg-white border border-[#E7DCC8] items-center justify-center text-[#51443A] shadow-xs hover:bg-[#FFF4D6] hover:text-[#171311] transition-all duration-200 ease-in-out relative focus-visible:ring-2 focus-visible:ring-[#C94F16]"
                aria-label="การแจ้งเตือน"
              >
                <Bell className="w-5 h-5" />
              </button>
            </div>
          </header>

          {/* Children Content */}
          <div className="space-y-6 w-full">{children}</div>
        </main>
      </div>

      {/* MOBILE FIXED BOTTOM NAVIGATION BAR */}
      <nav
        aria-label="เมนูนำทางหลักบนมือถือ"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#171311]/95 backdrop-blur-md border-t border-[#2E2520] px-[max(0.5rem,env(safe-area-inset-left))] pt-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))]"
      >
        <div className="max-w-md mx-auto grid grid-cols-5 items-end">
          {MOBILE_TABS.slice(0, 2).map(tab => (
            <MobileTab
              key={tab.path}
              tab={tab}
              active={tab.match(currentPath)}
              onSelect={() => navigate(tab.path)}
            />
          ))}

          {/* Centre primary action */}
          <div className="flex flex-col items-center">
            <button
              onClick={() => navigate("/offerings/new")}
              className="-mt-6 size-14 rounded-2xl bg-[#C94F16] hover:bg-[#E05A1B] active:scale-95 text-white flex items-center justify-center shadow-md ring-4 ring-[#FAF8F5] transition-all duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-[#FC6C26]"
              aria-label="บันทึกการถวายใหม่"
            >
              <Plus className="size-6 stroke-[2.5]" />
            </button>
            <span className="mt-2 text-[11px] leading-none font-medium text-[#D9CBB5]">
              ถวาย
            </span>
          </div>

          {MOBILE_TABS.slice(2).map(tab => (
            <MobileTab
              key={tab.path}
              tab={tab}
              active={tab.match(currentPath)}
              onSelect={() => navigate(tab.path)}
            />
          ))}
        </div>
      </nav>
    </div>
  );
};

export default AppLayout;
