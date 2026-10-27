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
      className={`relative flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-xl transition-all duration-150 active:scale-95 ${
        active ? "text-[#FC6C26]" : "text-[#FFF4D6]/75 hover:text-white"
      }`}
    >
      <Icon className="size-[22px] transition-transform duration-150" />
      <span
        className={`text-[11px] leading-tight ${active ? "font-bold text-[#FC6C26]" : "font-medium"}`}
      >
        {tab.label}
      </span>
      {active && (
        <span
          className="absolute bottom-0.5 size-1 rounded-full bg-[#FC6C26] shadow-xs shadow-[#FC6C26]"
          aria-hidden="true"
        />
      )}
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
        <aside className="hidden lg:flex flex-col w-64 xl:w-72 bg-gradient-to-b from-[#1E1916] via-[#171311] to-[#110E0D] border-r border-[#51443A]/40 px-4 py-5 sticky top-0 h-screen overflow-y-auto shrink-0 z-30 shadow-xl">
          {/* 1. Grace-giving Branding */}
          <GuardedLink
            href="/"
            className="flex items-center gap-3 px-2 mb-5 cursor-pointer select-none group"
          >
            <div className="size-10 rounded-xl bg-gradient-to-tr from-[#C94F16] to-[#FC6C26] flex items-center justify-center shrink-0 shadow-sm shadow-[#FC6C26]/30 group-hover:scale-105 transition-transform">
              <Sprout className="size-5 text-white" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <p className="text-lg font-bold leading-tight tracking-tight text-[#FFF4D6]">
                Grace <span className="text-[#FC6C26]">Ledger</span>
              </p>
              <p className="text-xs text-[#807266] leading-tight">
                การเงินเชื่อมใจ เพื่อคริสตจักร
              </p>
            </div>
          </GuardedLink>

          {/* Quick Offering Action Button */}
          <button
            onClick={() => navigate("/offerings/new")}
            className="w-full mb-5 min-h-11 px-4 rounded-xl bg-gradient-to-r from-[#FC6C26] to-[#E55613] hover:from-[#E55613] hover:to-[#C94F16] text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md shadow-[#FC6C26]/20 transition-all hover:shadow-[#FC6C26]/30 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-[#FC6C26]"
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
                  <p key={`desktop-group-${group}`} className="px-3 pt-4 pb-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[#807266] first:pt-0">
                    {group}
                  </p>
                );
              }
              content.push(
                <GuardedLink
                  key={item.path}
                  href={item.path}
                  aria-current={isActive ? "page" : undefined}
                  className={`w-full flex min-h-10 items-center gap-3 px-3 rounded-xl text-sm transition-all duration-150 ${
                    isActive
                      ? "bg-gradient-to-r from-[#FC6C26] to-[#E55613] text-white font-semibold shadow-sm shadow-[#FC6C26]/25"
                      : "text-[#FFF4D6]/80 font-medium hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <Icon className={`size-[18px] shrink-0 ${isActive ? "text-white" : "text-[#FC6C26]"}`} aria-hidden="true" />
                  <span className="truncate">{item.label}</span>
                </GuardedLink>
              );
              return content;
            }, [])}
          </nav>

          {/* User Profile Card at Sidebar Bottom */}
          <div className="pt-4 mt-4 border-t border-[#51443A]/40">
            <GuardedLink
              href="/profile"
              className="flex items-center gap-3 p-2.5 rounded-xl cursor-pointer hover:bg-white/5 transition-colors border border-transparent hover:border-white/5"
            >
              <div className="size-9 rounded-full bg-gradient-to-tr from-[#FC6C26] to-[#E55613] flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-sm shadow-[#FC6C26]/25">
                {user?.name ? user.name.slice(0, 1) : "ศ"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[#FFF4D6] truncate">
                  {churchName}
                </p>
                <p className="text-xs text-[#807266] truncate">
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
        <main className="flex-1 w-full max-w-[var(--content-max)] mx-auto bg-gradient-to-b from-[#FFFDF9] via-[#FFF9EE] to-[#FFF4D6] px-4 sm:px-6 md:px-8 lg:px-10 xl:px-12 py-4 sm:py-6 md:py-8 flex flex-col pb-[calc(var(--mobile-nav-clearance)+env(safe-area-inset-bottom))] lg:pb-16 min-w-0">
          {/* Top Bar for Desktop and Mobile */}
          <header className="flex flex-wrap items-end justify-between gap-3 sm:gap-4 mb-5 sm:mb-6">
            <div className="flex w-full items-center justify-between lg:hidden mb-2">
              <AppMenu />
              <GuardedLink
                href="/notifications"
                className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-[#E7DCC8] bg-white/90 backdrop-blur-sm text-[#3F3833] hover:bg-[#FFF8EA] shadow-2xs transition-colors"
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

            {/* Right: Actions and Notification */}
            <div className="flex max-w-full flex-wrap items-center gap-2.5">
              {action && (
                <div className="max-w-full [&>div]:flex-wrap [&_button]:min-h-11">
                  {action}
                </div>
              )}

              <button
                onClick={() => navigate("/notifications")}
                className="hidden lg:flex size-11 shrink-0 rounded-xl bg-white/90 backdrop-blur-sm border border-[#E7DCC8] items-center justify-center text-[#3F3833] hover:bg-[#FFF8EA] transition-colors relative focus-visible:ring-2 focus-visible:ring-[#C94F16] shadow-2xs"
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
        className="lg:hidden fixed bottom-3 inset-x-3 sm:inset-x-8 max-w-lg mx-auto z-40 fintech-glass-dark rounded-2xl px-2 py-1.5 shadow-2xl shadow-black/35"
      >
        <div className="grid grid-cols-5 items-end">
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
              className="-mt-6 size-12 rounded-2xl bg-gradient-to-tr from-[#E55613] to-[#FC6C26] text-white flex items-center justify-center shadow-lg shadow-[#FC6C26]/30 ring-4 ring-[#171311] active:scale-95 transition-transform"
              aria-label="บันทึกการถวายใหม่"
            >
              <Plus className="size-6 stroke-[2.5]" />
            </button>
            <span className="mt-1 text-[11px] font-semibold text-[#FFF4D6]">
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
