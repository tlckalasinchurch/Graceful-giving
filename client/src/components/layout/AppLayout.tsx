import React, { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { useGuardedNavigate } from "@/hooks/useUnsavedChanges";
import { canAccessRoute } from "@/lib/routeAccess";
import { GuardedLink } from "./GuardedLink";
import {
  AppMenu,
  getNavGroup,
  isActiveRoute,
  getAuthorizedNavItems,
} from "./AppNavigation";
import { canManageFinance, getChurchRoleInfo } from "@shared/roles";
import {
  Bell,
  CalendarDays,
  FileBarChart,
  LayoutGrid,
  Menu,
  Plus,
  ReceiptText,
  Sprout,
} from "lucide-react";

type MobileTabItem = {
  path: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  match: (path: string) => boolean;
};

const OVERVIEW_TAB: MobileTabItem = {
  path: "/",
  label: "ภาพรวม",
  icon: LayoutGrid,
  match: p => p === "/",
};

const TRANSACTIONS_TAB: MobileTabItem = {
  path: "/transactions",
  label: "รายการ",
  icon: ReceiptText,
  match: p =>
    isActiveRoute(p, "/transactions") ||
    isActiveRoute(p, "/offerings") ||
    isActiveRoute(p, "/expenses"),
};

const REPORTS_TAB: MobileTabItem = {
  path: "/reports",
  label: "รายงาน",
  icon: FileBarChart,
  match: p => isActiveRoute(p, "/reports"),
};

// A member who cannot open reports gets the news feed in that slot, so the bar
// never links to a page that answers "access restricted".
const UPDATES_TAB: MobileTabItem = {
  path: "/updates",
  label: "ข่าวสาร",
  icon: CalendarDays,
  match: p => isActiveRoute(p, "/updates"),
};

/** Paths reached through the tabs. Every other page highlights "เมนู". */
function isTabPath(path: string) {
  return [OVERVIEW_TAB, TRANSACTIONS_TAB, REPORTS_TAB, UPDATES_TAB].some(t =>
    t.match(path)
  );
}

const tabClass = (active: boolean) =>
  `flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl px-1 text-[11px] leading-none transition-colors focus-visible:outline-2 focus-visible:outline-offset-[-2px] ${
    active
      ? "font-semibold text-primary-strong"
      : "font-medium text-muted-foreground hover:text-foreground"
  }`;

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
      type="button"
      onClick={onSelect}
      aria-current={active ? "page" : undefined}
      className={tabClass(active)}
    >
      <span
        className={`flex h-7 w-12 items-center justify-center rounded-full ${
          active ? "bg-accent" : ""
        }`}
      >
        <Icon className="size-5" aria-hidden="true" />
      </span>
      <span>{tab.label}</span>
    </button>
  );
}

interface AppLayoutProps {
  children: React.ReactNode;
  activeRoute?: string;
  title?: string;
  subtitle?: string;
  /** Show the subtitle on phones too, when it carries data (a date, a name). */
  subtitleOnMobile?: boolean;
  action?: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  children,
  activeRoute,
  title,
  subtitle,
  subtitleOnMobile = false,
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

  // Per-route document title, so browser tabs, history and shared links say
  // which page they are. Pages without a title prop fall back to the section.
  const pageTitle =
    title ?? (currentPath === "/" ? "ภาพรวมการเงิน" : undefined);
  useEffect(() => {
    document.title = pageTitle
      ? `${pageTitle} · Grace-giving`
      : "Grace-giving — ระบบบัญชีการเงินคริสตจักร";
  }, [pageTitle]);

  const churchName =
    churchProfile?.name || user?.name || "คริสตจักรพระคุณสมบูรณ์";
  // Recording an offering is a finance action (offerings.create is
  // financeProcedure). The shortcut only appears for roles that can save one.
  const canRecordOffering = canManageFinance(user);
  const thirdTab = canAccessRoute("/reports", user) ? REPORTS_TAB : UPDATES_TAB;
  const menuActive = !isTabPath(currentPath);

  return (
    <div className="min-h-dvh bg-background text-foreground flex flex-col font-sans selection:bg-accent overflow-x-clip">
      <div className="flex-1 flex flex-row w-full min-w-0">
        {/* DESKTOP SIDEBAR (lg: >= 1024px) */}
        <aside className="hidden lg:flex flex-col w-64 xl:w-72 bg-sidebar border-r border-sidebar-border px-4 py-5 sticky top-0 h-dvh overflow-y-auto shrink-0 z-30">
          <GuardedLink
            href="/"
            className="flex items-center gap-3 px-2 mb-5 select-none rounded-xl"
          >
            <div className="size-10 rounded-xl bg-primary flex items-center justify-center shrink-0">
              <Sprout
                className="size-5 text-primary-foreground"
                aria-hidden="true"
              />
            </div>
            <div className="min-w-0">
              <p className="text-lg font-bold leading-tight tracking-tight text-sidebar-foreground">
                Grace <span className="text-brand">Ledger</span>
              </p>
              <p className="text-xs text-sidebar-muted leading-tight">
                การเงินเชื่อมใจ เพื่อคริสตจักร
              </p>
            </div>
          </GuardedLink>

          {canRecordOffering && (
            <button
              type="button"
              onClick={() => navigate("/offerings/new")}
              className="w-full mb-5 min-h-11 px-4 rounded-xl bg-primary hover:bg-primary-strong text-primary-foreground font-semibold text-sm flex items-center justify-center gap-2"
            >
              <Plus className="size-4 stroke-[2.5]" aria-hidden="true" />
              <span>บันทึกการถวาย</span>
            </button>
          )}

          <nav aria-label="เมนูนำทางหลัก" className="flex-1 space-y-0.5">
            {getAuthorizedNavItems(user).reduce<React.ReactNode[]>(
              (content, item, index, items) => {
                const previous = items[index - 1];
                const group = getNavGroup(item.path);
                const previousGroup = previous
                  ? getNavGroup(previous.path)
                  : undefined;
                const Icon = item.icon;
                const isActive = isActiveRoute(currentPath, item.path);
                if (group !== previousGroup) {
                  content.push(
                    <p
                      key={`desktop-group-${group}`}
                      className="px-3 pt-4 pb-1 text-[11px] font-semibold tracking-wide text-sidebar-muted first:pt-0"
                    >
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
                        ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold shadow-[inset_3px_0_0_var(--brand)]"
                        : "text-sidebar-foreground/85 font-medium hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                    }`}
                  >
                    <Icon
                      className={`size-[18px] shrink-0 ${isActive ? "text-brand" : "text-sidebar-muted"}`}
                      aria-hidden="true"
                    />
                    <span className="truncate">{item.label}</span>
                  </GuardedLink>
                );
                return content;
              },
              []
            )}
          </nav>

          <div className="pt-4 mt-4 border-t border-sidebar-border">
            <GuardedLink
              href="/profile"
              className="flex items-center gap-3 p-2 rounded-xl hover:bg-sidebar-accent transition-colors"
            >
              <div className="size-9 rounded-full bg-brand flex items-center justify-center text-foreground font-semibold text-sm shrink-0">
                {user?.name ? user.name.slice(0, 1) : "ศ"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-sidebar-foreground truncate">
                  {churchName}
                </p>
                <p className="text-xs text-sidebar-muted truncate">
                  {getChurchRoleInfo(user?.churchRole).label}
                </p>
              </div>
            </GuardedLink>
          </div>
        </aside>

        <div className="flex-1 min-w-0 flex flex-col">
          {/* MOBILE TOP BAR: church identity and notifications. The page's own
              title follows below, so the bar stays one line and 56px tall. */}
          <div className="lg:hidden sticky top-0 z-30 border-b border-divider bg-background/95 backdrop-blur-md pt-[env(safe-area-inset-top)]">
            <div className="flex h-14 items-center justify-between gap-3 px-4">
              <GuardedLink
                href="/"
                className="flex min-w-0 items-center gap-2.5 rounded-xl py-1"
              >
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary">
                  <Sprout
                    className="size-4 text-primary-foreground"
                    aria-hidden="true"
                  />
                </span>
                <span className="truncate text-[15px] font-semibold text-foreground">
                  {churchName}
                </span>
              </GuardedLink>
              <GuardedLink
                href="/notifications"
                className="-mr-1.5 flex size-11 shrink-0 items-center justify-center rounded-xl text-foreground-soft hover:bg-muted"
                aria-label="การแจ้งเตือน"
              >
                <Bell className="size-5" aria-hidden="true" />
              </GuardedLink>
            </div>
          </div>

          {/* The column is capped at --content-max and centred in whatever
              space is left beside the sidebar, so a row's date and its amount
              stay within reading distance of each other on a wide monitor. */}
          <main className="flex-1 w-full max-w-[var(--content-max)] mx-auto px-4 sm:px-6 lg:px-10 pt-5 sm:pt-6 lg:pt-8 flex flex-col pb-[calc(var(--mobile-nav-clearance)+env(safe-area-inset-bottom))] lg:pb-16 min-w-0">
            {/* Page header. On phones it only renders when the page has a
                title or actions; on desktop it also carries the bell. */}
            <header
              className={`${title || action ? "flex" : "hidden lg:flex"} flex-wrap items-start justify-between gap-x-4 gap-y-3 mb-5 sm:mb-6`}
            >
              {title && (
                <div className="min-w-0 flex-1 basis-full sm:basis-0">
                  <h1 className="text-[22px] sm:text-2xl lg:text-3xl font-bold leading-tight tracking-tight text-foreground">
                    {title}
                  </h1>
                  {subtitle && (
                    // Phones skip a descriptive subtitle: it restates the
                    // title and pushes the page's content further down.
                    <p
                      className={`mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground ${subtitleOnMobile ? "" : "hidden sm:block"}`}
                    >
                      {subtitle}
                    </p>
                  )}
                </div>
              )}
              <div className="flex max-w-full flex-wrap items-center gap-2 lg:ml-auto">
                {action && (
                  <div className="flex max-w-full flex-wrap items-center gap-2 [&>div]:flex-wrap [&_button]:min-h-11">
                    {action}
                  </div>
                )}
                <GuardedLink
                  href="/notifications"
                  className="hidden lg:flex size-11 shrink-0 items-center justify-center rounded-xl border border-border bg-card text-foreground-soft hover:bg-muted"
                  aria-label="การแจ้งเตือน"
                >
                  <Bell className="size-5" aria-hidden="true" />
                </GuardedLink>
              </div>
            </header>

            <div className="space-y-6 w-full">{children}</div>
          </main>
        </div>
      </div>

      {/* MOBILE BOTTOM NAVIGATION: four destinations plus, for finance roles,
          the offering shortcut in the thumb-reach centre. */}
      <nav
        aria-label="เมนูนำทางหลักบนมือถือ"
        className="lg:hidden fixed bottom-0 inset-x-0 z-40 border-t border-border bg-card/95 backdrop-blur-md px-2 pt-1 pb-[max(0.25rem,env(safe-area-inset-bottom))]"
      >
        <div
          className={`mx-auto grid max-w-md items-end ${canRecordOffering ? "grid-cols-5" : "grid-cols-4"}`}
        >
          <MobileTab
            tab={OVERVIEW_TAB}
            active={OVERVIEW_TAB.match(currentPath)}
            onSelect={() => navigate(OVERVIEW_TAB.path)}
          />
          <MobileTab
            tab={TRANSACTIONS_TAB}
            active={TRANSACTIONS_TAB.match(currentPath)}
            onSelect={() => navigate(TRANSACTIONS_TAB.path)}
          />
          {canRecordOffering && (
            <button
              type="button"
              onClick={() => navigate("/offerings/new")}
              aria-current={
                isActiveRoute(currentPath, "/offerings/new")
                  ? "page"
                  : undefined
              }
              className="flex min-h-14 flex-col items-center justify-center gap-1 text-[11px] font-semibold leading-none text-primary-strong"
            >
              <span className="flex size-10 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm">
                <Plus className="size-5 stroke-[2.5]" aria-hidden="true" />
              </span>
              <span>ถวาย</span>
            </button>
          )}
          <MobileTab
            tab={thirdTab}
            active={thirdTab.match(currentPath)}
            onSelect={() => navigate(thirdTab.path)}
          />
          <AppMenu>
            <button
              type="button"
              className={tabClass(menuActive)}
              aria-current={menuActive ? "page" : undefined}
            >
              <span
                className={`flex h-7 w-12 items-center justify-center rounded-full ${
                  menuActive ? "bg-accent" : ""
                }`}
              >
                <Menu className="size-5" aria-hidden="true" />
              </span>
              <span>เมนู</span>
            </button>
          </AppMenu>
        </div>
      </nav>
    </div>
  );
};

export default AppLayout;
