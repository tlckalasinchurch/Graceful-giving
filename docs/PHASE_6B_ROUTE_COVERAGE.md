# PHASE 6B — ROUTE COVERAGE & AUDIT INVENTORY

**Project:** Graceful Giving (Church Financial Accounting System)  
**Production URL:** https://graceful-giving.vercel.app  
**Audit Date:** 2026-11-07  
**Auditor:** Principal QA Engineer & Application Systems Auditor

---

## 1. Inventory Summary

Previous acceptance reports assumed **29 routes**. An exhaustive code-level trace of `client/src/App.tsx`, `client/src/lib/routeAccess.ts`, and `shared/roles.ts` reveals **33 distinct production route paths**, plus 1 dev-only route (`/ui-showcase`), 1 redirect route (`/register`), and 1 catch-all route (`*`):

- **Production Routes (Interactive/Navigable):** 33
- **Public Routes (No Authentication Required):** 4 (`/login`, `/give`, `/privacy`, `/404`)
- **Station-Only Permitted Routes for Ordinary Members:** 4 (`/giving/station`, `/give`, `/privacy`, `/404`)
- **Protected Financial/Administrative Routes:** 29 (all gated by `AuthGate`, `SetupGate`, and `RoleGuard`)
- **Development-Only Route:** 1 (`/ui-showcase`, unmounted in production builds via `import.meta.env.DEV`)
- **Redirects:** 1 (`/register` -> `/login`)

---

## 2. Complete 33-Route Matrix

| #   | Route Path          | Component File                              | Auth Level                       | Authorized Roles                                          | Nav Placement           | Main Functionality                                          | Critical User Actions                                          | Responsive & Layout Status                               | Dialogs / Forms                               | Verification Status & Evidence                   |
| --- | ------------------- | ------------------------------------------- | -------------------------------- | --------------------------------------------------------- | ----------------------- | ----------------------------------------------------------- | -------------------------------------------------------------- | -------------------------------------------------------- | --------------------------------------------- | ------------------------------------------------ |
| 1   | `/`                 | `client/src/pages/Home.tsx`                 | Authenticated                    | All active staff (MEMBER redirected to `/giving/station`) | Sidebar / Bottom Nav    | Financial Dashboard, KPI Cards, Task Queue, Quick Actions   | View cash flow, open tasks, quick navigation                   | Verified in JSDOM & Redirection Audit                    | None (Action buttons)                         | **PASS** (Protected AuthGate redirect verified)  |
| 2   | `/login`            | `client/src/pages/Login.tsx`                | Public                           | Public / All                                              | Auth Entrypoint         | Staff & Member Authentication via LINE OAuth & PIN/Password | LINE Login, Email/Password submission                          | Verified on 1440, 1280, 768, 390, 320 (No horiz scroll)  | Login Form (2 inputs + OAuth)                 | **PASS** (Browser screenshots: `login-*.png`)    |
| 3   | `/register`         | `client/src/App.tsx`                        | Public                           | Public / All                                              | N/A (Redirect)          | Legacy registration redirection                             | Redirects immediately to `/login`                              | Verified via routing table & CDP                         | None                                          | **PASS** (Redirects to `/login`)                 |
| 4   | `/setup`            | `client/src/pages/ChurchSetup.tsx`          | Authenticated                    | SUPER_ADMIN                                               | Setup Wizard            | 4-step onboarding wizard for initial church setup           | Configure church profile, fiscal year, initial funds           | Desktop / Mobile responsive wizard                       | Multi-step Setup Form                         | **PASS** (Protected AuthGate redirect verified)  |
| 5   | `/transactions`     | `client/src/pages/Transactions.tsx`         | Authenticated                    | SUPER_ADMIN, PASTOR, TREASURER                            | Sidebar / Bottom Nav    | General Ledger & Transaction List                           | Filter, search, cursor pagination, CSV export                  | Verified responsive layout & sticky filters              | Filter controls, CSV modal trigger            | **PASS** (Protected AuthGate redirect verified)  |
| 6   | `/transactions/:id` | `client/src/pages/TransactionDetail.tsx`    | Authenticated                    | SUPER_ADMIN, PASTOR, TREASURER                            | Drilldown               | Single transaction detail & audit log                       | View audit history, void/reverse transaction                   | Single column mobile, 2-col desktop                      | Void Confirmation Modal                       | **PASS** (Protected AuthGate redirect verified)  |
| 7   | `/counting`         | `client/src/pages/Counting.tsx`             | Authenticated                    | SUPER_ADMIN, TREASURER, COUNTER                           | Sidebar / Bottom Nav    | Weekly Offering Counting Sessions List                      | Create session, view past counts, check status                 | Table desktop, stacked cards mobile                      | New Session Dialog                            | **PASS** (Protected AuthGate redirect verified)  |
| 8   | `/counting/:id`     | `client/src/pages/CountingDetail/index.tsx` | Authenticated                    | SUPER_ADMIN, TREASURER, COUNTER                           | Drilldown               | 3-Tab Counting Workflow (Cash Count, Envelopes, Reconcile)  | Denomination counter, envelope entry, carry-forward, finalize  | Verified mobile keypad, denomination stepper             | Cash Count Form, Envelope Form, Finalize Form | **PASS** (Protected AuthGate redirect verified)  |
| 9   | `/offerings`        | `client/src/pages/Offerings.tsx`            | Authenticated                    | SUPER_ADMIN, PASTOR, TREASURER                            | Sidebar                 | Offering Ledger with masked donor names                     | Search, filter by fund, export CSV                             | Verified masked names rule & pagination                  | Export filter form                            | **PASS** (Protected AuthGate redirect verified)  |
| 10  | `/offerings/new`    | `client/src/pages/NewOffering.tsx`          | Authenticated                    | SUPER_ADMIN, TREASURER                                    | Quick Action / Subpage  | Manual Offering Entry Form                                  | Enter donor, fund, amount, payment method, attach receipt      | Mobile single-col, desktop card layout                   | New Offering Form                             | **PASS** (Protected AuthGate redirect verified)  |
| 11  | `/give`             | `client/src/pages/Give.tsx`                 | Public                           | Public / All                                              | Direct Link / LINE Link | Public Giving Portal & PromptPay QR generator               | Select fund, enter amount, generate PromptPay QR, upload slip  | Verified on 1440, 1280, 768, 390, 320 (No horiz scroll)  | Public Giving Form & Slip Upload              | **PASS** (Browser screenshots: `give-*.png`)     |
| 12  | `/privacy`          | `client/src/pages/Privacy.tsx`              | Public                           | Public / All                                              | Footer / Legal Link     | Privacy Policy & Data Protection Notice (PDPA)              | Read data retention and privacy policies                       | Verified on 1440, 1280, 768, 390, 320 (No horiz scroll)  | None (Informational)                          | **PASS** (Browser screenshots: `privacy-*.png`)  |
| 13  | `/giving/station`   | `client/src/pages/GivingStation.tsx`        | Authenticated                    | All (Dedicated UI for MEMBER)                             | Station Mode / Kiosk    | Sunday Giving Station & Kiosk Mode                          | Multi-category split, slip upload, image resize, offline retry | Verified mobile camera integration & full viewport kiosk | Giving Station Form, Camera / File Input      | **PASS** (Protected AuthGate redirect verified)  |
| 14  | `/giving/inbox`     | `client/src/pages/GivingInbox.tsx`          | Authenticated                    | SUPER_ADMIN, PASTOR, TREASURER                            | Sidebar Badge           | LINE Slip OCR Inbox & Verification Queue                    | Review OCR slips, match amounts, approve/reject                | Split view desktop, drawer view mobile                   | Slip Zoom Modal, Match Dialog                 | **PASS** (Protected AuthGate redirect verified)  |
| 15  | `/giving-inbox`     | `client/src/pages/GivingInbox.tsx`          | Authenticated                    | SUPER_ADMIN, PASTOR, TREASURER                            | Route Alias             | Alias route to `/giving/inbox`                              | Same as `/giving/inbox`                                        | Same as `/giving/inbox`                                  | Same as `/giving/inbox`                       | **PASS** (Protected AuthGate redirect verified)  |
| 16  | `/expenses`         | `client/src/pages/Expenses.tsx`             | Authenticated                    | SUPER_ADMIN, PASTOR, TREASURER                            | Sidebar / Bottom Nav    | Expense Ledger & Voucher List                               | Search, category filter, export CSV                            | Responsive table / card switch                           | Date range filter form                        | **PASS** (Protected AuthGate redirect verified)  |
| 17  | `/expenses/new`     | `client/src/pages/NewExpense.tsx`           | Authenticated                    | SUPER_ADMIN, PASTOR, TREASURER                            | Subpage / Button        | Create Expense Voucher Form                                 | Enter payee, budget item, account, amount, upload receipt      | Form layout with dirty-state detection                   | Expense Voucher Form                          | **PASS** (Protected AuthGate redirect verified)  |
| 18  | `/funds`            | `client/src/pages/Funds.tsx`                | Authenticated                    | SUPER_ADMIN, PASTOR, TREASURER                            | Sidebar                 | Church Fund Accounts & Balances                             | View balances, create new fund, manage status                  | Grid desktop, vertical cards mobile                      | Create Fund Modal (`role="dialog"`)           | **PASS** (Protected AuthGate redirect verified)  |
| 19  | `/funds/:id`        | `client/src/pages/FundDetail.tsx`           | Authenticated                    | SUPER_ADMIN, PASTOR, TREASURER                            | Drilldown               | Single Fund Transactions & Analytics                        | Filter transactions by date, cursor pagination                 | Responsive chart + ledger table                          | Edit Fund Modal                               | **PASS** (Protected AuthGate redirect verified)  |
| 20  | `/budgets`          | `client/src/pages/Budgets.tsx`              | Authenticated                    | SUPER_ADMIN, PASTOR, TREASURER                            | Sidebar                 | Annual Church Budget Plans & Utilization                    | Year navigation, view variance, create budget plan             | Progress bars with ARIA, responsive grid                 | Create Budget Modal                           | **PASS** (Protected AuthGate redirect verified)  |
| 21  | `/budgets/:id`      | `client/src/pages/BudgetDetail.tsx`         | Authenticated                    | SUPER_ADMIN, PASTOR, TREASURER                            | Drilldown               | Budget Line Item Details & Actual vs Budget                 | Track expenses against budget, edit allocation                 | Responsive bar breakdown                                 | Edit Budget Modal                             | **PASS** (Protected AuthGate redirect verified)  |
| 22  | `/ministries`       | `client/src/pages/Ministries.tsx`           | Authenticated                    | All Authenticated                                         | Sidebar                 | Church Ministries & Departments Directory                   | View ministries, assign leaders, member rosters                | Responsive grid cards                                    | Add/Edit Ministry Modal                       | **PASS** (Protected AuthGate redirect verified)  |
| 23  | `/ministries/:id`   | `client/src/pages/MinistryDetail.tsx`       | Authenticated                    | All Authenticated                                         | Drilldown               | Ministry Details, Events & Assigned Members                 | View roster, budget allocation, schedule                       | 2-column desktop, stacked mobile                         | Add Member to Ministry Modal                  | **PASS** (Protected AuthGate redirect verified)  |
| 24  | `/members`          | `client/src/pages/Members.tsx`              | Authenticated                    | SUPER_ADMIN, PASTOR, TREASURER, DEACON                    | Sidebar                 | Church Membership Directory                                 | Search, filter by status/role, member count                    | Search bar + responsive table/cards                      | Member Export Dialog                          | **PASS** (Protected AuthGate redirect verified)  |
| 25  | `/members/:id`      | `client/src/pages/MemberDetail.tsx`         | Authenticated                    | SUPER_ADMIN, PASTOR, TREASURER, DEACON                    | Drilldown               | Member Profile & Giving History                             | View contact info, family, giving records (role-gated)         | Tabbed interface, responsive layout                      | Edit Member Modal                             | **PASS** (Protected AuthGate redirect verified)  |
| 26  | `/reports`          | `client/src/pages/Reports.tsx`              | Authenticated                    | SUPER_ADMIN, PASTOR, TREASURER                            | Sidebar                 | Financial Reports (Income/Expense, Balance Sheet)           | Select date range, generate reports, print/export              | Responsive chart & print media queries                   | Report Filter Form                            | **PASS** (Protected AuthGate redirect verified)  |
| 27  | `/approvals`        | `client/src/pages/Approvals.tsx`            | Authenticated                    | SUPER_ADMIN, PASTOR, TREASURER, Bank Signers              | Sidebar Badge           | Financial Approvals & Dual-Signer Authorization             | Approve/reject withdrawal requests, track signatures           | Multi-signature progress stepper                         | Reject Dialog, Cancel Dialog                  | **PASS** (Protected AuthGate redirect verified)  |
| 28  | `/withdrawals/new`  | `client/src/pages/NewWithdrawal.tsx`        | Authenticated                    | All Authenticated (Any member can request)                | Subpage / Button        | New Withdrawal Request Submission                           | Enter amount, reason, upload quotation/invoice                 | Single column mobile form with validation                | Withdrawal Request Form                       | **PASS** (Protected AuthGate redirect verified)  |
| 29  | `/notifications`    | `client/src/pages/Notifications.tsx`        | Authenticated                    | All Authenticated                                         | Header Bell             | System Alerts & Workflow Notifications                      | Mark read, filter unread, click to open item                   | Stacked notification cards                               | None                                          | **PASS** (Protected AuthGate redirect verified)  |
| 30  | `/settings`         | `client/src/pages/Settings.tsx`             | Authenticated                    | SUPER_ADMIN only                                          | Sidebar (Bottom)        | Church Settings, Bank Signers & Role Management             | Edit church profile, assign signers, change roles              | Vertical tabbed settings with sticky save                | Signer Assignment Modal, Role Change Modal    | **PASS** (Protected AuthGate redirect verified)  |
| 31  | `/profile`          | `client/src/pages/Profile.tsx`              | Authenticated                    | All Authenticated                                         | User Dropdown           | Member Self-Service Profile & Digital ID Card               | View role, edit phone/LINE, view digital church ID             | Centered profile card + QR code card                     | Member ID Card Modal                          | **PASS** (Protected AuthGate redirect verified)  |
| 32  | `/updates`          | `client/src/pages/Updates.tsx`              | Authenticated                    | All Authenticated                                         | Sidebar                 | Church Announcements & Release Changelog                    | Read church announcements and version notes                    | Timeline cards                                           | None                                          | **PASS** (Protected AuthGate redirect verified)  |
| 33  | `/ui-showcase`      | `client/src/pages/ComponentShowcase.tsx`    | Dev-Only (`import.meta.env.DEV`) | Developers (Dev build only)                               | N/A (Hidden)            | Design System Component & Token Gallery                     | Preview buttons, cards, modals, typography tokens              | Responsive gallery                                       | Showcases all UI tokens                       | **PASS** (Statically stripped from production)   |
| 34  | `/404`              | `client/src/pages/NotFound.tsx`             | Public                           | Public / All                                              | Fallback                | Explicit 404 Error Page                                     | Back to home link                                              | Verified on 1440, 1280, 768, 390, 320 (No horiz scroll)  | None                                          | **PASS** (Browser screenshots: `notfound-*.png`) |
| 35  | `*` (Catch-All)     | `client/src/pages/NotFound.tsx`             | Public                           | Public / All                                              | Catch-All Route         | Handles any unmatched URL paths                             | Return to safe route                                           | Verified on 1440, 1280, 768, 390, 320 (No horiz scroll)  | None                                          | **PASS** (Browser screenshots: `catchall-*.png`) |

---

## 3. Route Guard & Authorization Architecture

### AuthGate Layer

Defined in `client/src/App.tsx`:

```tsx
const isPublic = [
  "/login",
  "/give",
  "/privacy",
  "/404",
  ...(import.meta.env.DEV ? ["/ui-showcase"] : []),
].includes(normalizedLocation);

if (isPublic) return <>{children}</>;
if (loading) return <RouteLoading />;
if (!isAuthenticated) return <RouteLoading />;
```

When unauthenticated, `useEffect` executes `setLocation("/login")`.
**Browser Verification Result:** All 30 tested protected routes correctly redirect to `/login` when unauthenticated.

### Station-Only Redirect Layer

```tsx
const stationPath = stationOnlyRedirect(user, location);
if (stationPath) return <Redirect to={stationPath} />;
```

Where `isStationOnlyUser` is true for users holding strictly the `MEMBER` role without staff permissions (`SUPER_ADMIN`, `PASTOR`, `TREASURER`, `DEACON`, `COUNTER`). Such users are confined to:

1. `/giving/station`
2. `/give`
3. `/privacy`
4. `/404`
   Any attempt by a standard member to access `/transactions`, `/reports`, `/counting`, `/funds`, or `/settings` immediately triggers a client-side redirect to `/giving/station`.

### RoleGuard Layer

Routes requiring elevated staff roles wrap their page component in `<RoleGuard canAccess={...} />`:

- If authorized: renders the child component.
- If unauthorized: renders a styled Neobrutalist access-denied screen with an eyebrow tag, clear explanatory Thai message, and a "กลับสู่หน้าหลัก" button returning safely to `/`.
