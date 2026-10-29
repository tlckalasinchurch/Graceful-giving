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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
      className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl ${
        active ? "text-brand-ink" : "text-ink-2 hover:text-ink"
      }`}
    >
      <span
        className={`flex h-7 w-12 items-center justify-center rounded-full ${
          active ? "bg-tile-peach" : ""
        }`}
      >
        <Icon className="size-5" />
      </span>
      <span
        className={`text-xs leading-none ${active ? "font-semibold" : "font-medium"}`}
      >
        {tab.label}
      </span>
    </button>
  );
}

/** One icon in the desktop rail. The label lives in the tooltip and in
 *  aria-label, so the rail stays 56px wide without losing the name. */
function RailLink({
  href,
  label,
  active,
  icon: Icon,
}: {
  href: string;
  label: string;
  active: boolean;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <GuardedLink
          href={href}
          aria-label={label}
          aria-current={active ? "page" : undefined}
          className={`flex size-10 shrink-0 items-center justify-center rounded-2xl focus-visible:ring-2 focus-visible:ring-brand ${
            active
              ? "bg-tile-peach text-tile-peach-ink"
              : "text-ink-2 hover:bg-ground hover:text-ink"
          }`}
        >
          <Icon className="size-5" />
        </GuardedLink>
      </TooltipTrigger>
      <TooltipContent side="right" sideOffset={8}>
        {label}
      </TooltipContent>
    </Tooltip>
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
  const roleLabel = getChurchRoleInfo(user?.churchRole).label;
  const railItems = getAuthorizedNavItems(user);
  // A tab the role cannot open would only lead to the restricted-access page.
  const mobileTabs = MOBILE_TABS.filter(tab => canAccessRoute(tab.path, user));
  const canRecordOffering = canAccessRoute("/offerings/new", user);
  const tabsBeforeGive = Math.ceil(mobileTabs.length / 2);
  const mobileColumns = mobileTabs.length + (canRecordOffering ? 1 : 0);

  return (
    <div className="min-h-screen bg-ground text-ink flex flex-col font-sans selection:bg-tile-peach overflow-x-clip">
      <div className="flex-1 flex flex-row w-full min-w-0">
        {/* DESKTOP ICON RAIL (lg: >= 1024px) */}
        <TooltipProvider delayDuration={150}>
          <aside className="hidden lg:flex w-14 shrink-0 sticky top-0 h-screen flex-col items-center gap-2 bg-surface border-r border-line py-3 z-30">
            <Tooltip>
              <TooltipTrigger asChild>
                <GuardedLink
                  href="/"
                  aria-label="Grace Ledger หน้าหลัก"
                  className="flex size-10 items-center justify-center rounded-2xl bg-tile-peach text-tile-peach-ink"
                >
                  <Sprout className="size-5" aria-hidden="true" />
                </GuardedLink>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={8}>
                Grace Ledger
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => navigate("/offerings/new")}
                  aria-label="บันทึกการถวายใหม่"
                  className="flex size-10 items-center justify-center rounded-2xl bg-brand text-white shadow-[0_1px_3px_hsla(20,80%,30%,0.3)] hover:bg-brand-ink focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
                >
                  <Plus className="size-5 stroke-[2.5]" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={8}>
                บันทึกการถวาย
              </TooltipContent>
            </Tooltip>

            <nav
              aria-label="เมนูนำทางหลัก"
              className="no-scrollbar mt-1 flex w-full flex-1 flex-col items-center gap-1 overflow-y-auto border-t border-line pt-3"
            >
              {railItems.reduce<React.ReactNode[]>((content, item, index) => {
                const previous = railItems[index - 1];
                if (
                  previous &&
                  getNavGroup(previous.path) !== getNavGroup(item.path)
                ) {
                  content.push(
                    <span
                      key={`gap-${item.path}`}
                      className="my-1 h-px w-6 shrink-0 bg-line"
                      aria-hidden="true"
                    />
                  );
                }
                content.push(
                  <RailLink
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

            <div className="flex flex-col items-center gap-2 border-t border-line pt-3">
              <RailLink
                href="/notifications"
                label="การแจ้งเตือน"
                icon={Bell}
                active={isActiveRoute(currentPath, "/notifications")}
              />
              <Tooltip>
                <TooltipTrigger asChild>
                  <GuardedLink
                    href="/profile"
                    aria-label={`โปรไฟล์ ${churchName} ${roleLabel}`}
                    className="flex size-9 items-center justify-center rounded-full bg-tile-sky text-sm font-semibold text-tile-sky-ink"
                  >
                    {user?.name ? user.name.slice(0, 1) : "ศ"}
                  </GuardedLink>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={8}>
                  {churchName} · {roleLabel}
                </TooltipContent>
              </Tooltip>
            </div>
          </aside>
        </TooltipProvider>

        {/* The column is capped at --content-max and centred beside the rail,
            so a row's date and its amount stay within reading distance on a
            wide monitor. */}
        <main className="flex-1 w-full max-w-[var(--content-max)] mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8 flex flex-col pb-[calc(var(--mobile-nav-clearance)+env(safe-area-inset-bottom))] lg:pb-12 min-w-0">
          <header className="flex flex-wrap items-end justify-between gap-3 sm:gap-4 mb-5 sm:mb-6">
            <div className="flex w-full items-center justify-between lg:hidden">
              <AppMenu />
              <GuardedLink
                href="/notifications"
                className="flex size-11 shrink-0 items-center justify-center rounded-2xl border border-line bg-surface text-ink-2 hover:text-ink"
                aria-label="การแจ้งเตือน"
              >
                <Bell className="size-5" aria-hidden="true" />
              </GuardedLink>
            </div>
            {title && (
              <div className="min-w-0 flex-1 basis-full sm:basis-0">
                <h1 className="text-2xl md:text-3xl font-semibold text-ink tracking-tight break-words">
                  {title}
                </h1>
                {subtitle && (
                  <p className="text-sm leading-relaxed text-ink-2 mt-1 max-w-2xl">
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
        className="lg:hidden fixed bottom-0 inset-x-0 z-40 border-t border-line bg-surface/95 backdrop-blur-sm pb-[env(safe-area-inset-bottom)]"
      >
        <div
          className="mx-auto grid max-w-lg items-center px-2 py-1"
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
            <span className="flex size-9 items-center justify-center rounded-full bg-brand text-white shadow-[0_1px_3px_hsla(20,80%,30%,0.3)]">
              <Plus className="size-5 stroke-[2.5]" />
            </span>
            <span className="text-xs font-semibold leading-none text-brand-ink">
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
