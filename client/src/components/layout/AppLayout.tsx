import React from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { useGuardedNavigate } from "@/hooks/useUnsavedChanges";
import { GuardedLink } from "./GuardedLink";
import { AppMenu, getNavGroup, isActiveRoute, getAuthorizedNavItems } from "./AppNavigation";
import { getChurchRoleInfo } from "@shared/roles";
import {
  Bell,
  CircleUserRound,
  FileBarChart,
  Home as HomeIcon,
  Menu,
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
      className={`flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-xl ${
        active ? "text-[#FC6E20]" : "text-[#8F8477] hover:text-[#FFE7D0]"
      }`}
    >
      <Icon className="size-[22px]" />
      <span
        className={`text-[11px] ${active ? "font-semibold" : "font-medium"}`}
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
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans selection:bg-[#3D2A1A] overflow-x-clip">
      <div className="flex-1 flex flex-row w-full max-w-none mx-auto min-w-0">
        {/* DESKTOP FIXED SIDEBAR (Visible on lg: >= 1024px) */}
        <aside className="hidden lg:flex flex-col w-64 xl:w-72 bg-[#141414] border-r border-[#2E2E2E] px-4 py-5 sticky top-0 h-screen overflow-y-auto shrink-0 z-30">
          {/* 1. Grace-giving Branding */}
          <GuardedLink
            href="/"
            className="flex items-center gap-3 px-2 mb-5 cursor-pointer select-none"
          >
            <div className="size-10 rounded-xl bg-[#FC6E20] flex items-center justify-center shrink-0">
              <Sprout className="size-5 text-white" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <p className="text-lg font-bold leading-tight tracking-tight text-[#FFE7D0]">
                Grace <span className="text-[#FC6E20]">Ledger</span>
              </p>
              <p className="text-xs text-[#8F8477] leading-tight">
                การเงินเชื่อมใจ เพื่อคริสตจักร
              </p>
            </div>
          </GuardedLink>

          {/* Quick Offering Action Button */}
          <button
            onClick={() => navigate("/offerings/new")}
            className="w-full mb-5 min-h-11 px-4 rounded-xl bg-[#FC6E20] hover:bg-[#D9591A] text-[#1B1B1B] font-bold text-sm flex items-center justify-center gap-2 transition-colors focus-visible:ring-2 focus-visible:ring-[#FC6E20]"
            aria-label="บันทึกการถวายใหม่"
          >
            <Plus className="size-4 stroke-[2.5]" />
            <span>บันทึกการถวาย</span>
          </button>

          <nav aria-label="เมนูนำทางหลัก" className="flex-1 space-y-0.5">
            {getAuthorizedNavItems(user).reduce<React.ReactNode[]>((content, item, index, items) => {
              const previous = items[index - 1];
              const group = getNavGroup(item.path);
              const previousGroup = previous ? getNavGroup(previous.path) : undefined;
              const Icon = item.icon;
              const isActive = isActiveRoute(currentPath, item.path);
              if (group !== previousGroup) {
                content.push(
                  <p key={`desktop-group-${group}`} className="px-3 pt-4 pb-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[#8F8477] first:pt-0">
                    {group}
                  </p>
                );
              }
              content.push(
                <GuardedLink
                  key={item.path}
                  href={item.path}
                  aria-current={isActive ? "page" : undefined}
                  className={`w-full flex min-h-10 items-center gap-3 px-3 rounded-lg text-sm transition-colors ${
                    isActive
                      ? "bg-[#FC6E20] text-[#1B1B1B] font-semibold"
                      : "text-[#C9B8A8] font-medium hover:bg-[#262626] hover:text-[#FFE7D0]"
                  }`}
                >
                  <Icon className={`size-[18px] shrink-0 ${isActive ? "text-[#1B1B1B]" : "text-[#FC6E20]"}`} aria-hidden="true" />
                  <span className="truncate">{item.label}</span>
                </GuardedLink>
              );
              return content;
            }, [])}
          </nav>

          {/* User Profile Card at Sidebar Bottom */}
          <div className="pt-4 mt-4 border-t border-[#2E2E2E]">
            <GuardedLink
              href="/profile"
              className="flex items-center gap-3 p-2 rounded-xl cursor-pointer hover:bg-[#262626] transition-colors"
            >
              <div className="size-9 rounded-full bg-[#FC6E20] flex items-center justify-center text-[#1B1B1B] font-semibold text-sm shrink-0">
                {user?.name ? user.name.slice(0, 1) : "ศ"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[#FFE7D0] truncate">
                  {churchName}
                </p>
                <p className="text-xs text-[#8F8477] truncate">
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
        <main className="flex-1 w-full max-w-[var(--content-max)] mx-auto bg-[#1B1B1B] px-4 sm:px-6 md:px-8 lg:px-10 xl:px-12 py-4 sm:py-6 md:py-8 flex flex-col pb-[calc(var(--mobile-nav-clearance)+env(safe-area-inset-bottom))] lg:pb-16 min-w-0">
          {/* Top Bar for Desktop and Mobile */}
          <header className="flex flex-wrap items-end justify-between gap-3 sm:gap-4 mb-5 sm:mb-6">
            <div className="flex w-full items-center justify-between lg:hidden">
              <AppMenu>
                <button
                  type="button"
                  className="flex min-h-11 shrink-0 items-center gap-2 rounded-xl border border-[#3D3D3D] bg-[#262626] px-3.5 text-sm font-semibold text-[#FFE7D0] hover:bg-[#323232]"
                >
                  <Menu className="size-5" aria-hidden="true" />
                  <span>เมนูทั้งหมด</span>
                </button>
              </AppMenu>
              <GuardedLink
                href="/notifications"
                className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-[#3D3D3D] bg-[#262626] text-[#FFE7D0] hover:bg-[#323232]"
                aria-label="การแจ้งเตือน"
              >
                <Bell className="size-5" aria-hidden="true" />
              </GuardedLink>
            </div>
            {/* Left: Page Title */}
            {title && (
              <div className="min-w-0 flex-1 basis-full sm:basis-0">
                <h1 className="text-2xl md:text-3xl font-semibold tracking-tight break-words text-[#FFE7D0]">
                  {title}
                </h1>
                {subtitle && (
                  <p className="text-sm leading-relaxed mt-1 max-w-2xl text-[#C9B8A8]">
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
            <div className="flex max-w-full flex-wrap items-center gap-2.5">
              {action && (
                <div className="max-w-full [&>div]:flex-wrap [&_button]:min-h-11">
                  {action}
                </div>
              )}

              <button
                onClick={() => navigate("/notifications")}
                className="hidden lg:flex size-11 shrink-0 rounded-xl border items-center justify-center transition-colors relative focus-visible:ring-2 focus-visible:ring-[#FC6E20] bg-[#262626] border-[#3D3D3D] text-[#FFE7D0] hover:bg-[#323232]"
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
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#141414]/95 backdrop-blur-md border-t border-[#2E2E2E] px-2 pt-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))]"
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
              className="-mt-5 size-13 rounded-2xl bg-[#FC6E20] hover:bg-[#D9591A] text-[#1B1B1B] flex items-center justify-center shadow-lg shadow-[#FC6E20]/25 ring-4 ring-[#1B1B1B] focus-visible:ring-2 focus-visible:ring-[#FC6E20]"
              aria-label="บันทึกการถวายใหม่"
            >
              <Plus className="size-6 stroke-[2.5]" />
            </button>
            <span className="mt-1 text-[11px] font-medium text-[#FFE7D0]">
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
