import { describe, expect, it } from "vitest";
import { canAccessRoute } from "../client/src/lib/routeAccess";
import type { ChurchRole } from "../shared/roles";

// Both the navigation menu (AppNavigation.getAuthorizedNavItems), the route
// guards (App.tsx RoleGuard) and the dashboard shortcut tiles (Home.tsx) read
// canAccessRoute, so this matrix is the contract all three share. A change
// here silently changes what a role sees in the menu AND what it can open by
// typing the URL, which is exactly the drift this table exists to catch.

const ROLES: ChurchRole[] = [
  "SUPER_ADMIN",
  "PASTOR",
  "TREASURER",
  "DEACON",
  "COUNTER",
  "MEMBER",
];

/** Roles allowed through each gated route. Every role not listed is denied. */
const ALLOWED: Record<string, ChurchRole[]> = {
  "/settings": ["SUPER_ADMIN"],
  "/counting": ["SUPER_ADMIN", "TREASURER", "COUNTER"],
  "/expenses": ["SUPER_ADMIN", "PASTOR", "TREASURER"],
  "/funds": ["SUPER_ADMIN", "PASTOR", "TREASURER"],
  "/budgets": ["SUPER_ADMIN", "PASTOR", "TREASURER"],
  "/reports": ["SUPER_ADMIN", "PASTOR", "TREASURER"],
  "/approvals": ["SUPER_ADMIN", "PASTOR", "TREASURER"],
  "/members": ["SUPER_ADMIN", "PASTOR", "TREASURER", "DEACON"],
  "/transactions": ["SUPER_ADMIN", "PASTOR", "TREASURER"],
  "/offerings": ["SUPER_ADMIN", "PASTOR", "TREASURER"],
  "/offerings/new": ["SUPER_ADMIN", "TREASURER"],
};

/** Routes with no entry in the map: open to anyone signed in. */
const UNGATED = [
  "/",
  "/withdrawals/new",
  "/ministries",
  "/updates",
  "/notifications",
  "/profile",
];

const asUser = (churchRole: ChurchRole, isBankSigner = false) =>
  isBankSigner
    ? { role: "user", churchRole, isBankSigner: true }
    : { role: "user", churchRole };

describe("route access matrix", () => {
  for (const [path, allowedRoles] of Object.entries(ALLOWED)) {
    describe(path, () => {
      for (const role of ROLES) {
        const shouldAllow = allowedRoles.includes(role);
        it(`${shouldAllow ? "allows" : "denies"} ${role}`, () => {
          expect(canAccessRoute(path, asUser(role))).toBe(shouldAllow);
        });
      }
    });
  }

  it("lets the coarse admin flag through every gated route", () => {
    const admin = { role: "admin", churchRole: "MEMBER" };
    for (const path of Object.keys(ALLOWED)) {
      expect(canAccessRoute(path, admin)).toBe(true);
    }
  });

  it("opens ungated routes to every role", () => {
    for (const path of UNGATED) {
      for (const role of ROLES) {
        expect(canAccessRoute(path, asUser(role))).toBe(true);
      }
    }
  });

  it("denies gated routes when there is no signed-in user", () => {
    for (const path of Object.keys(ALLOWED)) {
      expect(canAccessRoute(path, null)).toBe(false);
      expect(canAccessRoute(path, undefined)).toBe(false);
    }
  });

  // Withdrawal requests are deliberately open to every member: the approval
  // and disbursement steps are what finance roles gate, on /approvals.
  it("lets any role file a withdrawal request", () => {
    for (const role of ROLES) {
      expect(canAccessRoute("/withdrawals/new", asUser(role))).toBe(true);
    }
  });

  // Signing access: a MEMBER named on the bank account must be able to open
  // /approvals to press their signature, while an ordinary member keeps
  // meeting the same wall as before.
  it("lets a MEMBER who is a bank signer open /approvals", () => {
    expect(canAccessRoute("/approvals", asUser("MEMBER", true))).toBe(true);
  });

  it("still denies /approvals to a MEMBER who is not a signer", () => {
    expect(canAccessRoute("/approvals", asUser("MEMBER"))).toBe(false);
  });
});
