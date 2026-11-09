# Frontend System Map

Date: 2026-11-08. Scope: `client/`. Method: source inspection, `pnpm check`, `pnpm test`, `pnpm build`, and a Playwright run against the production build.

## 1. Stack

- React 19 SPA, Vite 7, `wouter` router, Tailwind, Radix/shadcn primitives.
- Data: `@trpc/react-query` over `@tanstack/react-query`. The client imports `AppRouter` from `server/routers.ts`.
- Entry: `client/src/main.tsx` creates one `QueryClient` and one `httpBatchLink` (`/api/trpc`, cookies included, `superjson`).
- Shell: `App.tsx` wraps `ErrorBoundary > ThemeProvider > TooltipProvider > Toaster > SetupGate + Suspense > AuthGate > Router`.

## 2. Verified route count

`App.tsx` declares 35 `<Route>` elements:

- 34 routes with a path. 33 exist in production. `/ui-showcase` exists in dev builds only.
- 1 catch-all route (`NotFound`).
- `/register` is a redirect to `/login`. `/giving-inbox` is an alias of `/giving/inbox`.
- 30 distinct lazy-loaded pages in production (31 with `ComponentShowcase`).

## 3. Route table

| Route                                    | Page                            | Guard                                                          |
| ---------------------------------------- | ------------------------------- | -------------------------------------------------------------- |
| `/login`, `/give`, `/privacy`, `/404`    | Login, Give, Privacy, NotFound  | Public (`PUBLIC_PATHS`)                                        |
| `/`                                      | Home                            | Signed in                                                      |
| `/setup`                                 | ChurchSetup                     | Signed in. `SetupGate` sends leaders here until setup is done. |
| `/transactions`, `/transactions/:id`     | Transactions, TransactionDetail | `canViewFinanceRecords`                                        |
| `/counting`, `/counting/:id`             | Counting, CountingDetail        | `canCountOfferings`                                            |
| `/offerings`                             | Offerings                       | `canViewFinanceRecords`                                        |
| `/offerings/new`                         | NewOffering                     | `canManageFinance`                                             |
| `/giving/station`                        | GivingStation                   | Signed in (also the only page an ordinary member sees)         |
| `/giving/inbox`, `/giving-inbox`         | GivingInbox                     | `canManageFinance`                                             |
| `/expenses`, `/expenses/new`             | Expenses, NewExpense            | finance or church-settings role                                |
| `/funds`, `/funds/:id`                   | Funds, FundDetail               | finance or church-settings role                                |
| `/budgets`, `/budgets/:id`               | Budgets, BudgetDetail           | `canManageBudgets`                                             |
| `/ministries`, `/ministries/:id`         | Ministries, MinistryDetail      | Signed in                                                      |
| `/members`, `/members/:id`               | Members, MemberDetail           | SUPER_ADMIN, PASTOR, TREASURER, DEACON                         |
| `/reports`                               | Reports                         | `canViewReports`                                               |
| `/approvals`                             | Approvals                       | finance, church-settings role, or bank signer                  |
| `/withdrawals/new`                       | NewWithdrawal                   | Signed in                                                      |
| `/notifications`, `/profile`, `/updates` | Notifications, Profile, Updates | Signed in                                                      |
| `/settings`                              | Settings                        | `isSuperAdmin`                                                 |
| `/ui-showcase`                           | ComponentShowcase               | Dev builds only                                                |

## 4. Layers

| Layer          | Location                                                                                                               | Notes                                                                                                                                                       |
| -------------- | ---------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Presentation   | `pages/*`, `components/{common,finance,giving,layout}`, `components/ui`                                                | `components/ui` is the shadcn layer. `common/CommonUI.tsx` holds `LoadingSkeleton`, `EmptyState`, `ErrorState`, `PageHeader`, `FilterBar`, `ConfirmDialog`. |
| Application    | `lib/routeAccess.ts`, `hooks/useUnsavedChanges.ts`, `pages/*Draft.ts`, `pages/givingStationFlow.ts`, `pages/Home/*.ts` | Pure logic is split into small `.ts` files with unit tests.                                                                                                 |
| Data access    | `lib/trpc.ts`, `_core/hooks/useAuth.ts`, `trpc.*.useQuery/useMutation` in pages                                        | No separate API layer. Pages call tRPC hooks directly. 31 page and component files use `useQuery`.                                                          |
| State          | React Query cache for server state. `useState` for forms. `localStorage` for theme.                                    | No global client store.                                                                                                                                     |
| Authorization  | `lib/routeAccess.ts` (`ROUTE_ACCESS`)                                                                                  | One map. `AppNavigation` and `RoleGuard` both read it. The server still checks every request.                                                               |
| Error handling | `ErrorBoundary`, `friendlyErrorMessage` (`lib/errors.ts`), `ErrorState`, sonner toasts                                 | `main.tsx` redirects to `/login` on UNAUTHORIZED. It adds no other global handler.                                                                          |

## 5. Shared layout

`AppLayout` gives the page header, the desktop menu (`AppNavigation`), and the mobile bottom tab bar (4 tabs). `StationOnlyFrame` frames the member-only view. `GuardedLink` and `useGuardedNavigate` block navigation when a form has unsaved changes.

## 6. Largest pages (lines)

GivingStation 2116, GivingInbox 1877, Settings 1728, Profile 832, TransactionDetail 783, NewExpense 710, Expenses 694. `ComponentShowcase` (1539) is dev only.

## 7. Existing tests

- 90 test files run (85 pass, 5 skip because they need a live database). 975 tests pass, 106 skip.
- 52 server test files. 31 client test files (jsdom). Client tests cover Home, CountingDetail, GivingStation, Give, GivingInbox receiver check, Approvals signature progress, CommonUI, ErrorBoundary, theme contrast, and `lib/*` helpers.
- No test covers: Funds, Expenses, NewExpense, NewOffering, Transactions, Budgets, Members, Ministries, Reports, Settings, Profile, Notifications pages as rendered pages.
- No browser end-to-end suite exists in the repository.

## 8. Risks and technical debt (evidence-based)

| ID  | Finding                                                                                                           | Severity | Status                                                 |
| --- | ----------------------------------------------------------------------------------------------------------------- | -------- | ------------------------------------------------------ |
| D1  | `Funds.tsx`: the create-fund submit button stayed active during the request. A double tap could create two funds. | High     | Fixed                                                  |
| D2  | `AdminManager.tsx`: 8 mutations had no `onError`. A failed create, edit, status change or delete showed nothing.  | High     | Fixed                                                  |
| D3  | `AdminManager.tsx`: a failed `updates.adminList` query showed an empty list with no error.                        | Medium   | Fixed                                                  |
| T1  | `VoucherModal.tsx` and `AppLayout.tsx` read a query without an error branch.                                      | Low      | Open                                                   |
| T2  | Pages over 1500 lines (GivingStation, GivingInbox, Settings) are hard to test and review.                         | Medium   | Open, no change proposed without a demonstrated defect |
| T3  | No global default for mutation errors. Each page must remember `onError`.                                         | Medium   | Open                                                   |
| T4  | 45 uses of `any` in `pages`, `components`, `lib`.                                                                 | Low      | Open                                                   |
| T5  | Client bundle chunks above 500 kB (Vite warning).                                                                 | Low      | Open                                                   |
| T6  | Dev tool `ComponentShowcase` has an icon button without an accessible name and a `console.log`. Dev only.         | Info     | Open                                                   |
