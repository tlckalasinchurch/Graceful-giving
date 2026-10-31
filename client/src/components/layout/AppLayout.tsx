import React from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { canAccessRoute } from "@/lib/routeAccess";
import { useGuardedNavigate } from "@/hooks/useUnsavedChanges";
import { GuardedLink } from "./GuardedLink";
import {
  AppMenu,
  getNavGroup,
  isActiveRoute,
  getAuthorizedNavItems,
} from "./AppNavigation";
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
      className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl transition-colors ${
        active ? "text-brand" : "text-ink-3 hover:text-ink"
      }`}
    >
      <span
        className={`flex h-7 w-12 items-center justify-center rounded-full transition-colors ${
          active ? "bg-tile-lilac text-brand" : ""
        }`}
      >
        <Icon className="size-5" />
      </span>
      <span
        className={`text-xs leading-none ${active ? "font-bold" : "font-medium"}`}
      >
        {tab.label}
      </span>
    </button>
  );
}

/** One row in the desktop sidebar: icon and a visible label. */
function SidebarLink({
  href,
  label,
  active,
  icon: Icon,
  badge,
}: {
  href: string;
  label: string;
  active: boolean;
  icon: React.ComponentType<{ className?: string }>;
  badge?: React.ReactNode;
}) {
  return (
    <GuardedLink
      href={href}
      aria-current={active ? "page" : undefined}
      className={`flex min-h-10 w-full items-center gap-3 rounded-xl px-3.5 text-sm transition-all focus-visible:ring-2 focus-visible:ring-brand ${
        active
          ? "bg-brand font-bold text-white shadow-sm shadow-brand/25"
          : "font-medium text-ink-2 hover:bg-paper hover:text-ink"
      }`}
    >
      <Icon className="size-[18px] shrink-0" aria-hidden="true" />
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {badge}
    </GuardedLink>
  );
}

interface AppLayoutProps {
  children: React.ReactNode;
  activeRoute?: string;
  title?: string;
  subtitle?: string;
  /** Small caps label above the title, e.g. "Ledger". Latin reads best. */
  eyebrow?: string;
  action?: React.ReactNode;
  /** Leaves the title block off the printed page, e.g. for a poster. */
  hideHeaderOnPrint?: boolean;
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  children,
  activeRoute,
  title,
  subtitle,
  eyebrow,
  action,
  hideHeaderOnPrint = false,
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
  const roleLabel = getChurchRoleInfo(user?.churchRole).label;
  const railItems = getAuthorizedNavItems(user);
  const mobileTabs = MOBILE_TABS.filter(tab => canAccessRoute(tab.path, user));
  const canRecordOffering = canAccessRoute("/offerings/new", user);
  const tabsBeforeGive = Math.ceil(mobileTabs.length / 2);
  const mobileColumns = mobileTabs.length + (canRecordOffering ? 1 : 0);

  return (
    <div className="min-h-dvh bg-ground text-ink flex flex-col font-sans selection:bg-tile-lilac overflow-x-clip">
      <div className="flex-1 flex flex-row w-full min-w-0">
        {/* DESKTOP SIDEBAR (lg: >= 1024px) */}
        <aside className="hidden lg:flex print:hidden! w-64 shrink-0 sticky top-0 h-screen flex-col gap-4 bg-surface/90 backdrop-blur-xl border-r border-line/80 px-4 py-5 z-30">
          <GuardedLink
            href="/"
            aria-label="Grace Giving หน้าหลัก"
            className="flex items-center gap-3 rounded-2xl px-1.5 py-1.5 hover:bg-paper/60 transition-colors"
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-brand text-white shadow-md shadow-brand/25">
              <Sprout className="size-5" aria-hidden="true" />
            </span>
            <span className="min-w-0">
              <span className="display block truncate text-lg leading-none text-ink">
                Grace <span className="text-brand">Ledger</span>
              </span>
              <span className="mt-1 block truncate text-xs font-medium text-ink-3">
                {churchName}
              </span>
            </span>
          </GuardedLink>

          {canRecordOffering && (
            <button
              onClick={() => navigate("/offerings/new")}
              className="flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl bg-brand px-4 text-sm font-bold text-white shadow-md shadow-brand/25 hover:bg-brand-ink focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
            >
              <Plus className="size-4 stroke-[2.5]" aria-hidden="true" />
              บันทึกการถวาย
            </button>
          )}

          <nav
            aria-label="เมนูนำทางหลัก"
            className="no-scrollbar -mx-1 flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto px-1"
          >
            {railItems.reduce<React.ReactNode[]>((content, item, index) => {
              const previous = railItems[index - 1];
              const group = getNavGroup(item.path);
              if (!previous || getNavGroup(previous.path) !== group) {
                content.push(
                  <p
                    key={`group-${item.path}`}
                    className={`px-3.5 pb-1 text-[11px] font-bold uppercase tracking-wider text-ink-3 ${index === 0 ? "" : "pt-3.5"}`}
                  >
                    {group}
                  </p>
                );
              }
              content.push(
                <SidebarLink
                  key={item.path}
                  href={item.path}
                  label={item.label}
                  icon={item.icon}
                  active={isActiveRoute(currentPath, item.path)}
                />
              );
              return content;
            }, [])}
          </nav>

          <div className="space-y-1.5 border-t border-line/80 pt-3">
            <SidebarLink
              href="/notifications"
              label="การแจ้งเตือน"
              icon={Bell}
              active={isActiveRoute(currentPath, "/notifications")}
            />
            <GuardedLink
              href="/profile"
              aria-label={`โปรไฟล์ ${user?.name ?? ""} ${roleLabel}`}
              className="flex items-center gap-3 rounded-2xl bg-paper/70 border border-line/60 px-3 py-2.5 hover:bg-paper-2 transition-colors"
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-tile-lilac text-sm font-bold text-tile-lilac-ink">
                {user?.name ? user.name.slice(0, 1) : "ศ"}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-bold text-ink">
                  {user?.name || "ผู้ใช้"}
                </span>
                <span className="block truncate text-xs font-medium text-ink-3">
                  {roleLabel}
                </span>
              </span>
            </GuardedLink>
          </div>
        </aside>

        {/* Main Content Column */}
        <main className="flex-1 w-full max-w-[var(--content-max)] mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8 flex flex-col pb-[calc(var(--mobile-nav-clearance)+env(safe-area-inset-bottom))] lg:pb-12 min-w-0">
          <header
            className={`flex flex-wrap items-end justify-between gap-3 sm:gap-4 mb-6 sm:mb-8 ${
              title ? "border-b border-line/80 pb-5 sm:pb-6" : ""
            } ${hideHeaderOnPrint ? "print:hidden" : ""}`}
          >
            <div className="flex w-full items-center justify-between lg:hidden">
              <AppMenu />
              <GuardedLink
                href="/notifications"
                className="flex size-11 shrink-0 items-center justify-center rounded-2xl border border-line bg-surface text-ink-2 shadow-2xs hover:bg-paper hover:text-ink"
                aria-label="การแจ้งเตือน"
              >
                <Bell className="size-5" aria-hidden="true" />
              </GuardedLink>
            </div>
            {title && (
              <div className="min-w-0 flex-1 basis-full sm:basis-0">
                {eyebrow && <p className="eyebrow mb-2.5">{eyebrow}</p>}
                <h1 className="display text-3xl md:text-4xl text-ink break-words">
                  {title}
                </h1>
                {subtitle && (
                  <p className="text-sm leading-relaxed text-ink-2 mt-2 max-w-2xl">
                    {subtitle}
                  </p>
                )}
              </div>
            )}

            {action && (
              <div className="flex max-w-full flex-wrap items-center gap-2.5">
                <div className="max-w-full [&>div]:flex-wrap [&_button]:min-h-11">
                  {action}
                </div>
              </div>
            )}
          </header>

          <div className="space-y-6 w-full">{children}</div>
        </main>
      </div>

      {/* MOBILE BOTTOM BAR */}
      <nav
        aria-label="เมนูนำทางหลักบนมือถือ"
        className="lg:hidden print:hidden fixed bottom-0 inset-x-0 z-40 border-t border-line/80 bg-surface/90 backdrop-blur-xl shadow-[0_-8px_30px_rgba(15,23,42,0.06)] pb-[env(safe-area-inset-bottom)]"
      >
        <div
          className="mx-auto grid max-w-lg items-center px-2 py-1.5"
          style={{
            gridTemplateColumns: `repeat(${mobileColumns}, minmax(0, 1fr))`,
          }}
        >
          {mobileTabs.slice(0, tabsBeforeGive).map(tab => (
            <MobileTab
              key={tab.path}
              tab={tab}
              active={tab.match(currentPath)}
              onSelect={() => navigate(tab.path)}
            />
          ))}

          {canRecordOffering && (
            <button
              onClick={() => navigate("/offerings/new")}
              aria-label="บันทึกการถวายใหม่"
              className="flex min-h-14 flex-col items-center justify-center gap-1"
            >
              <span className="flex size-10 items-center justify-center rounded-2xl bg-brand text-white shadow-md shadow-brand/30">
                <Plus className="size-5 stroke-[2.5]" />
              </span>
              <span className="text-xs font-bold leading-none text-brand">
                ถวาย
              </span>
            </button>
          )}

          {mobileTabs.slice(tabsBeforeGive).map(tab => (
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
