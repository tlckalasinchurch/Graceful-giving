import {
  canCountOfferings,
  canManageBudgets,
  canManageChurchSettings,
  canManageFinance,
  canViewFinanceRecords,
  canViewReports,
  isSuperAdmin,
} from "@shared/roles";

type AuthUser =
  | { role?: string; churchRole?: string | null; isBankSigner?: boolean }
  | null
  | undefined;

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
    canManageChurchSettings(u) ||
    canManageFinance(u) ||
    u?.churchRole === "DEACON",
};

export function canAccessRoute(basePath: string, user: AuthUser): boolean {
  const check = ROUTE_ACCESS[basePath];
  return check ? check(user) : true;
}
