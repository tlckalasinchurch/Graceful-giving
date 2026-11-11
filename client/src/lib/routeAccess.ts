import {
  canCountOfferings,
  canManageBudgets,
  canManageChurchSettings,
  canManageFinance,
  canViewFinanceRecords,
  canViewReports,
  hasChurchRole,
  type RoleUser,
  isStationOnlyUser,
  isSuperAdmin,
} from "@shared/roles";

/**
 * auth.me returns the full role set of the person, so routes and menus judge
 * the complete set rather than only the primary churchRole. Bank signers
 * carry their own flag, granted outside the church-role list.
 */
type AuthUser = (RoleUser & { isBankSigner?: boolean }) | null | undefined;

/**
 * Single source of truth for which role can open which section, keyed by
 * the route's base path (a route with an :id param uses its list-page
 * path, e.g. "/counting/:id" checks against "/counting"). Both the nav
 * menu (AppNavigation.tsx, which hides items a user can't open) and the
 * route guards (App.tsx, which block direct URL access) read this same
 * map, so the two never drift out of sync. A path with no entry here is
 * open to every signed-in user.
 */
export const ROUTE_ACCESS: Record<string, (user: AuthUser) => boolean> = {
  "/settings": isSuperAdmin,
  // The giving-flow guide is for whoever runs any step of it: counters,
  // finance roles and church leadership. Ordinary members never reach it —
  // stationOnlyRedirect sends them to the giving station first. The path
  // avoids the "/giving" prefix so it never shares active state with
  // "/giving/inbox" in the nav.
  "/giving-guide": u => canCountOfferings(u) || canViewFinanceRecords(u),
  "/counting": canCountOfferings,
  "/transactions": canViewFinanceRecords,
  "/offerings": canViewFinanceRecords,
  "/offerings/new": canManageFinance,
  "/giving/inbox": canManageFinance,
  "/expenses": u => canManageFinance(u) || canManageChurchSettings(u),
  "/funds": u => canManageFinance(u) || canManageChurchSettings(u),
  "/budgets": canManageBudgets,
  "/reports": canViewReports,
  "/approvals": u =>
    canManageFinance(u) ||
    canManageChurchSettings(u) ||
    u?.isBankSigner === true,
  "/members": u =>
    hasChurchRole(u, "SUPER_ADMIN", "PASTOR", "TREASURER", "DEACON"),
};

export function canAccessRoute(basePath: string, user: AuthUser): boolean {
  const check = ROUTE_ACCESS[basePath];
  return check ? check(user) : true;
}

/** The only pages an ordinary member can open: the giving station and privacy notice. */
export const STATION_ONLY_PATHS = [
  "/giving/station",
  "/give",
  "/privacy",
  "/404",
  "/withdrawals/new",
];

/**
 * Where to send a signed-in person who is on `path`, or null to leave them be.
 * An ordinary member goes to the giving station from every other page. Staff
 * are never moved.
 */
export function stationOnlyRedirect(
  user: Parameters<typeof isStationOnlyUser>[0],
  path: string
): string | null {
  if (!isStationOnlyUser(user)) return null;
  const clean = path.length > 1 ? path.replace(/\/+$/, "") : path;
  return STATION_ONLY_PATHS.includes(clean) ? null : "/giving/station";
}
