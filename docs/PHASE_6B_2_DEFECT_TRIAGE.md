# PHASE 6B.2 — DEFECT TRIAGE REPORT: DEF-P2-03

**Project:** Graceful Giving (Church Financial Accounting System)  
**Investigation Target:** DEF-P2-03 (`/withdrawals/new` Member Access Inconsistency)  
**Date:** 2026-11-07  
**Auditor:** Principal Software Engineer, Authentication & Security Engineer, QA Architect

---

## 1. Executive Summary & Conclusion

### Required Conclusion: **CONFIRMED DEFECT — Frontend route access is inconsistent with business requirements.**

The investigation confirms that ordinary church members (`MEMBER`) are **intended by product and backend architecture to submit withdrawal / reimbursement requests**. The backend procedures and test suites explicitly authorize and test ordinary members submitting requests. Furthermore, the frontend route in `client/src/App.tsx` was explicitly declared without a `RoleGuard`, with comments stating any member can request one.

However, a frontend navigation guard bug in `client/src/lib/routeAccess.ts` traps members: `STATION_ONLY_PATHS` is an overly restrictive allowlist that omitted `"/withdrawals/new"`. Consequently, whenever an ordinary member visits `/withdrawals/new`, `stationOnlyRedirect` intercepts the request and redirects them to `/giving/station`.

---

## 2. Complete Access Path Trace for `/withdrawals/new`

### Step 1: Frontend Route Declaration (`client/src/App.tsx`)

In `client/src/App.tsx` lines 390–393:

```tsx
{
  /* Withdrawal requests — any signed-in member can ask for one;
    approval/disbursement stays gated on the Approvals page. */
}
<Route path="/withdrawals/new" component={NewWithdrawal} />;
```

- **Observation:** Notice that unlike `/transactions`, `/counting`, `/settings`, and `/reports`, which wrap their component inside `<RoleGuard canAccess={...}>`, `<Route path="/withdrawals/new" component={NewWithdrawal} />` has **no RoleGuard**.
- **Architectural Intent:** The comment explicitly documents that _any signed-in member can ask for one_, while approval/disbursement remains restricted to authorized signers on `/approvals`.

### Step 2: Route Access Map (`client/src/lib/routeAccess.ts`)

In `client/src/lib/routeAccess.ts` lines 30–52:

```ts
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
    hasChurchRole(u, "SUPER_ADMIN", "PASTOR", "TREASURER", "DEACON"),
};

export function canAccessRoute(basePath: string, user: AuthUser): boolean {
  const check = ROUTE_ACCESS[basePath];
  return check ? check(user) : true;
}
```

- **Observation:** `/withdrawals/new` is intentionally absent from `ROUTE_ACCESS`. Therefore, `canAccessRoute("/withdrawals/new", user)` returns `true` for all authenticated users.

### Step 3: Frontend Component Behavior (`client/src/pages/NewWithdrawal.tsx`)

In `client/src/pages/NewWithdrawal.tsx` lines 26–28 and 54–56:

```tsx
const canOpenApprovals = canAccessRoute("/approvals", user);
const returnPath = canOpenApprovals ? "/approvals" : "/";
const returnLabel = canOpenApprovals ? "หน้าการอนุมัติ" : "หน้าหลัก";

const fundsQuery = trpc.finance.fundOptions.useQuery(undefined, {
  retry: false,
});
```

- **Observation:** The component explicitly handles users who _cannot_ access `/approvals` (ordinary members). If a member creates a request, their return path points to `"/"` (which redirects them safely to their station).
- **Backend Data Fetching:** It queries `trpc.finance.fundOptions`, which was architected specifically for withdrawal request forms.

### Step 4: Backend Fund Options (`server/routers.ts`)

In `server/routers.ts` lines 904–908:

```ts
/** Fund names only, no balances: any member can pick one on a withdrawal request. */
fundOptions: protectedProcedure.query(async () => {
  const accounts = await listFinanceAccounts();
  return accounts.map(a => ({ id: a.id, name: a.name, type: a.type }));
}),
```

- **Observation:** The endpoint uses `protectedProcedure` (any signed-in user) and strips financial balances so that ordinary members can pick a fund without viewing sensitive church financial balances.

### Step 5: Backend Mutation Procedure (`server/routers.ts`)

In `server/routers.ts` lines 1573–1596:

```ts
create: protectedProcedure
  .input(
    z.object({
      amount: z
        .number()
        .positive()
        .max(MAX_WITHDRAWAL_AMOUNT, "จำนวนเงินสูงเกินกำหนด"),
      purpose: z.string().trim().min(5).max(280),
      details: z.string().trim().max(1000).optional(),
      fundId: z.number().int().positive().optional(),
    })
  )
  .mutation(async ({ ctx, input }) => {
    if (input.fundId !== undefined) await assertActiveFund(input.fundId);
    const id = await createWithdrawalRequest({
      amount: input.amount.toFixed(2),
      purpose: input.purpose,
      details: input.details ?? null,
      fundId: input.fundId,
      requestedBy: ctx.user.id,
      requestDate: new Date(),
    });
    return { id };
  }),
```

- **Observation:** The procedure requires only `protectedProcedure` (`ctx.user !== null`). There are no staff role constraints. The request records `requestedBy: ctx.user.id`.

### Step 6: Backend Access Control Test Suite (`server/withdrawals.access.test.ts`)

In `server/withdrawals.access.test.ts` lines 121–158:

```ts
describe("withdrawals.create: input limits", () => {
  const valid = { amount: 500, purpose: "ค่าอุปกรณ์ฝ่ายดนตรี" };

  it("refuses an amount above the limit", async () => {
    const caller = appRouter.createCaller(createContext(member));
    await expect(
      caller.withdrawals.create({
        ...valid,
        amount: MAX_WITHDRAWAL_AMOUNT + 1,
      })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("passes validation at the limit and only then reaches the database", async () => {
    // No database here, so the call fails at the insert, not at validation.
    const caller = appRouter.createCaller(createContext(member));
    await expect(
      caller.withdrawals.create({ ...valid, amount: MAX_WITHDRAWAL_AMOUNT })
    ).rejects.toMatchObject({ code: "INTERNAL_SERVER_ERROR" });
  });
});
```

- **Observation:** The test author explicitly instantiated the caller with `member` (`churchRole: "MEMBER"`). The test validates that `member` passes authorization and reaches the database execution phase.

### Step 7: Root Cause of the Defect (`client/src/lib/routeAccess.ts`)

In `client/src/App.tsx` lines 79–83:

```tsx
// An ordinary member sees the giving station and nothing else. This is the
// UI side of it; the server still checks every request by role.
const stationPath = stationOnlyRedirect(user, location);
if (stationPath) return <Redirect to={stationPath} />;
```

And in `client/src/lib/routeAccess.ts` lines 54–74:

```ts
/** The only pages an ordinary member can open: the giving station and privacy notice. */
export const STATION_ONLY_PATHS = [
  "/giving/station",
  "/give",
  "/privacy",
  "/404",
];

export function stationOnlyRedirect(
  user: Parameters<typeof isStationOnlyUser>[0],
  path: string
): string | null {
  if (!isStationOnlyUser(user)) return null;
  const clean = path.length > 1 ? path.replace(/\/+$/, "") : path;
  return STATION_ONLY_PATHS.includes(clean) ? null : "/giving/station";
}
```

- **Root Cause:** When an ordinary member navigates to `/withdrawals/new`, `stationOnlyRedirect` checks whether `"/withdrawals/new"` is in `STATION_ONLY_PATHS`. Because it is not in the list, `stationOnlyRedirect` returns `"/giving/station"`, and `AuthGate` bounces the member before `<NewWithdrawal />` can render.

---

## 3. Detailed Answers to Mission Questions

| #   | Investigation Question                                         | Finding / Answer                                                                                                                                                 |
| --- | -------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Which roles are allowed by the route declaration?              | **All authenticated roles** (no `RoleGuard` wrapper on `<Route path="/withdrawals/new" component={NewWithdrawal} />`).                                           |
| 2   | Which roles are allowed by `routeAccess`?                      | **All authenticated roles** (`canAccessRoute` returns `true` because `/withdrawals/new` is not restricted in `ROUTE_ACCESS`).                                    |
| 3   | Why is MEMBER redirected?                                      | Because `stationOnlyRedirect` enforces `STATION_ONLY_PATHS`, which omits `"/withdrawals/new"`.                                                                   |
| 4   | What exactly does `STATION_ONLY_PATHS` mean?                   | It is an allowlist defining the sole routes an ordinary member (holding strictly `MEMBER` without staff roles) may visit.                                        |
| 5   | Is MEMBER supposed to submit withdrawal requests?              | **YES.** Both `App.tsx` comments, `NewWithdrawal.tsx` logic, and `server/routers.ts` explicitly describe member reimbursement submissions.                       |
| 6   | Does the backend independently authorize MEMBER?               | **YES.** `withdrawals.create` is on `protectedProcedure`, `fundOptions` is sanitized for members, and `withdrawals.access.test.ts` uses `member` as test caller. |
| 7   | Can the route configuration and server authorization disagree? | **YES.** The backend and router route declarations allow members, but the client-side `stationOnlyRedirect` filter creates an unintended blocking trap.          |

---

## 4. Minimal Recommended Correction

In `client/src/lib/routeAccess.ts`:

```diff
--- a/client/src/lib/routeAccess.ts
+++ b/client/src/lib/routeAccess.ts
@@ -57,6 +57,7 @@ export const STATION_ONLY_PATHS = [
   "/give",
   "/privacy",
   "/404",
+  "/withdrawals/new",
 ];
```

### Required Regression Tests

1. **Unit Test (`client/src/lib/stationOnly.test.ts`):**  
   Assert that `stationOnlyRedirect(memberUser, "/withdrawals/new")` returns `null`.
2. **Security Test (`server/roles.stationOnly.test.ts`):**  
   Assert that `stationOnlyRedirect(memberUser, "/transactions")`, `"/reports"`, and `"/settings"` continue to return `"/giving/station"`.
3. **Component Test (`client/src/pages/NewWithdrawal.test.tsx`):**  
   Verify that `NewWithdrawal` renders for a member and successfully submits a reimbursement request.
