import React from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { canAccessRoute } from "@/lib/routeAccess";
import { useGuardedNavigate } from "@/hooks/useUnsavedChanges";
import { GuardedLink } from "./GuardedLink";
import {
  AppMenu,
  ThemeToggle,
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
      className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl px-1 transition-colors ${
        active ? "text-brand" : "text-ink-3 hover:text-ink"
      }`}
    >
      <span
        className={`flex h-7 w-12 items-center justify-center rounded-full transition-all ${
          active ? "bg-brand text-white shadow-[2px_2px_0_var(--ink)]" : ""
        }`}
      >
        <Icon className="size-5" />
      </span>
      <span
        className={`truncate max-w-full text-xs leading-tight ${active ? "font-bold text-brand" : "font-semibold text-ink-2"}`}
      >
        {tab.label}
      </span>
    </button>
  );
}

/** One row in the desktop sidebar: icon and a visible label. */
function UnreadBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span
      className="min-w-5 shrink-0 rounded-full bg-destructive px-1.5 text-center text-[11px] font-bold leading-5 text-white"
      aria-hidden="true"
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}

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
      className={`flex min-h-11 w-full items-center gap-3 rounded-xl px-3.5 text-sm transition-all border-2 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand ${
        active
          ? "border-[var(--ink)] bg-brand text-white font-bold shadow-[3px_3px_0_var(--ink)]"
          : "border-transparent font-semibold text-ink-2 hover:bg-accent hover:text-accent-foreground hover:border-[var(--ink)]"
      }`}
    >
      <Icon
        className={`size-5 shrink-0 ${active ? "text-white" : "text-ink-3"}`}
        aria-hidden="true"
      />
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
  /** @deprecated No longer rendered. Remove from callers. */
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
  action,
  hideHeaderOnPrint = false,
}) => {
  const [location] = useLocation();
  const navigate = useGuardedNavigate();
  const { user } = useAuth();
  const currentPath = activeRoute || location;

  const { data: unreadCount = 0 } = trpc.notifications.unreadCount.useQuery(
    undefined,
    { retry: false, staleTime: 60_000 }
  );
  const unreadLabel = unreadCount > 0 ? ` (ยังไม่ได้อ่าน ${unreadCount})` : "";

  const { data: churchProfile } = trpc.church.getProfile.useQuery(undefined, {
    retry: false,
    staleTime: 60_000,
  });

  const churchName =
    churchProfile?.name || user?.name || "คริสตจักรพระคุณสมบูรณ์";
  const roleLabel = getChurchRoleInfo(user?.churchRole).label;
  const railItems = getAuthorizedNavItems(user);
  const isFinance = canAccessRoute("/expenses", user);
  const baseTabs: MobileTabItem[] = [
    MOBILE_TABS[0],
    MOBILE_TABS[1],
    ...(isFinance
      ? [
          {
            path: "/expenses",
            label: "รายจ่าย",
            ariaLabel: "ไปที่หน้ารายจ่าย",
            icon: ReceiptText,
            match: (p: string) => isActiveRoute(p, "/expenses"),
          },
        ]
      : [MOBILE_TABS[2]]),
    MOBILE_TABS[3],
  ];
  const mobileTabs = baseTabs.filter(tab => canAccessRoute(tab.path, user));
  const canRecordOffering = canAccessRoute("/offerings/new", user);
  const tabsBeforeGive = Math.ceil(mobileTabs.length / 2);
  const mobileColumns = mobileTabs.length + (canRecordOffering ? 1 : 0);

  return (
    <div className="min-h-dvh bg-ground text-ink flex flex-col font-sans selection:bg-brand/30 overflow-x-clip">
      <div className="flex-1 flex flex-row w-full min-w-0">
        {/* DESKTOP SIDEBAR (lg: >= 1024px) */}
        <aside className="hidden lg:flex print:hidden! w-68 xl:w-72 shrink-0 sticky top-0 h-screen flex-col gap-4 bg-surface border-r border-line px-4 py-5 z-30">
          <GuardedLink
            href="/"
            aria-label="Grace Giving หน้าหลัก"
            className="flex items-center gap-3 rounded-2xl px-1.5 py-1.5 hover:bg-ground transition-colors"
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border-2 border-[var(--ink)] bg-brand text-white shadow-[3px_3px_0_var(--ink)]">
              <Sprout className="size-5" aria-hidden="true" />
            </span>
            <span className="min-w-0">
              <span className="font-display font-extrabold block truncate text-lg leading-none tracking-tight text-ink">
                Grace <span className="text-brand">Giving</span>
              </span>
              <span className="mt-1 block truncate text-xs font-medium text-ink-3">
                {churchName}
              </span>
            </span>
          </GuardedLink>

          {canRecordOffering && (
            <button
              onClick={() => navigate("/offerings/new")}
              className="btn-primary flex min-h-11 w-full items-center justify-center gap-2 rounded-xl px-4 text-sm font-bold focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
            >
              <Plus className="size-4" aria-hidden="true" />
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
                    className={`px-3.5 pb-1.5 text-xs font-extrabold uppercase tracking-[0.12em] text-ink-3 ${index === 0 ? "" : "pt-4"}`}
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
            <ThemeToggle />
            <SidebarLink
              href="/notifications"
              label="การแจ้งเตือน"
              icon={Bell}
              active={isActiveRoute(currentPath, "/notifications")}
              badge={<UnreadBadge count={unreadCount} />}
            />
            <GuardedLink
              href="/profile"
              aria-label={`โปรไฟล์ ${user?.name ?? ""} ${roleLabel}`}
              className="flex items-center gap-3 rounded-xl border-2 border-line bg-paper px-3 py-2.5 transition-colors hover:border-[var(--ink)] hover:bg-accent/30"
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand text-sm font-bold text-white">
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
        <main className="flex-1 w-full max-w-[var(--content-max)] mx-auto px-[max(1rem,env(safe-area-inset-left))] sm:px-6 lg:px-8 pt-[max(1rem,env(safe-area-inset-top))] sm:pt-6 lg:pt-8 flex flex-col pb-[calc(var(--mobile-nav-clearance)+env(safe-area-inset-bottom))] sm:pb-[calc(var(--mobile-nav-clearance)+env(safe-area-inset-bottom))] lg:pb-12 min-w-0">
          <header
            className={`mb-6 flex flex-wrap items-end justify-between gap-x-6 gap-y-4 sm:mb-8 ${
              title ? "border-b border-line pb-5 sm:pb-6" : ""
            } ${hideHeaderOnPrint ? "print:hidden" : ""}`}
          >
            <div className="flex w-full items-center justify-between gap-2 lg:hidden">
              <AppMenu />
              <GuardedLink
                href="/notifications"
                className="relative flex size-11 shrink-0 items-center justify-center rounded-xl border-2 border-[var(--ink)] bg-surface text-ink-2 shadow-[2px_2px_0_var(--ink)] hover:bg-ground"
                aria-label={`การแจ้งเตือน${unreadLabel}`}
              >
                <Bell className="size-5" aria-hidden="true" />
                {unreadCount > 0 && (
                  <span className="absolute -right-2 -top-2">
                    <UnreadBadge count={unreadCount} />
                  </span>
                )}
              </GuardedLink>
            </div>
            {title && (
              <div className="min-w-0 flex-1 basis-full sm:basis-0">
                <span className="eyebrow-quiet mb-2.5 block">
                  <span
                    className="size-1.5 rounded-full bg-brand"
                    aria-hidden="true"
                  />
                  {getNavGroup(activeRoute || location)}
                </span>
                <h1 className="display max-w-[24ch] text-[clamp(1.9rem,4.4vw,2.85rem)] leading-[1.14] text-ink break-words">
                  {title}
                </h1>
                <span className="title-rule mt-3" aria-hidden="true" />
                {subtitle && (
                  <p className="mt-3 max-w-2xl text-base leading-relaxed text-ink-2">
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

          <div className="w-full space-y-5 sm:space-y-6">{children}</div>
        </main>
      </div>

      {/* MOBILE BOTTOM BAR */}
      <nav
        aria-label="เมนูนำทางหลักบนมือถือ"
        className="lg:hidden print:hidden fixed bottom-0 inset-x-0 z-40 border-t border-line bg-surface/95 backdrop-blur px-[env(safe-area-inset-left)] pb-[max(0.25rem,env(safe-area-inset-bottom))]"
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
              <span className="alpha-press flex size-10 items-center justify-center rounded-xl border-2 border-[var(--ink)] bg-brand text-white shadow-[2px_2px_0_var(--ink)]">
                <Plus className="size-5 stroke-[2.5]" />
              </span>
              <span className="text-xs font-bold leading-tight text-ink">
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
