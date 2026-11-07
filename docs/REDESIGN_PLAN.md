# GRACEFUL GIVING — UI/UX & FINANCIAL REDESIGN PLAN (`docs/REDESIGN_PLAN.md`)

**Date:** 2026-11-07  
**Design Direction:** Modern Minimalist + Editorial Financial Dashboard (built on Graceful Giving's warm editorial tokens)

---

## 1. Phase 2 — UI/UX Redesign Direction & Design Token Refinement

### 1.1 Aesthetic Philosophy: Editorial Financial Clarity

Real church treasurers, pastors, and committee members—many of whom are older adults using smartphones or tablets after Sunday worship—need **calm, high-contrast, unmistakable clarity**.

We preserve Graceful Giving's warm identity (`--paper`, `--surface`, `--ink`, `--brand` forest green `#0F5338`, `--accent` warm gold `#F6C445`, `IBM Plex Sans Thai Looped`, `Niramit`, `JetBrains Mono`) while refining `client/src/index.css` so dense financial screens look like a **trustworthy modern financial ledger** rather than a heavy cartoon/neo-brutalist poster:

1. **Refined Card & Control Elevation (`client/src/index.css`):**
   - Soften `.bento-card` and `.bento-card-static` from heavy `2px solid var(--ink)` + `4px` hard black offset shadows to clean `1.5px solid var(--border)` (`color-mix(in oklab, var(--ink) 18%, transparent)`) with subtle editorial elevation (`0 2px 6px -1px rgb(20 19 16 / 0.06), 0 1px 2px -1px rgb(20 19 16 / 0.04)`), while keeping clear focus rings and high-contrast interactive primary buttons (`.btn-primary`).
   - Soften `.neo-input` and `.neo-select` borders in resting state (`1.5px solid color-mix(in oklab, var(--ink) 28%, transparent)`) with a crisp `var(--brand)` border and focus ring on `:focus-visible`, eliminating visual clutter across multi-field forms (`NewOffering`, `NewExpense`, `Settings`, `CountingDetail`).
2. **Typography & Readability for Older Users:**
   - Maintain fluid base font sizing (`16px`–`17px`) and `tabular-nums` on all `.money` figures.
   - Ensure no financial label, table cell, or chart axis drops below `12px–13px` (`0.75rem–0.8125rem`).
   - Clear Thai terminology on every control, status badge, and empty state.
3. **Touch Target & Interactive Standards (`>= 44×44px`):**
   - Every button, icon trigger, filter pill, and close button across all 28 pages must meet `min-h-11` (`44px`) or `size-11` (`44×44px`).
   - Add the Light/Dark theme switch inside the mobile navigation drawer (`AppNavigation.tsx`) so mobile users have full access to appearance settings.

---

## 2. Phase 3 — Financial UX Improvements (8 Core Areas)

### Area 1: Dashboard (`Home.tsx` & `Home/components/*`)

- Add a **Quick Operations Bar** at the top of the finance dashboard (`+ บันทึกเงินถวาย`, `+ บันทึกรายจ่าย`, `ห้องนับเงิน`, `กล่องสลิป`) for users with `canManageFinance` / `canAccessCounting`.
- Keep the `BalanceCard` General (`เงินกองทุนทั่วไป`) vs. Restricted (`เงินกองทุนเฉพาะกิจ`) split clear and prominent.
- Improve `CashflowChart` readability on mobile (`text-xs` labels, accessible summary values).

### Area 2: Offering Management (`Offerings.tsx`, `NewOffering.tsx`, `GivingStation.tsx`, `GivingInbox.tsx`, `CountingDetail/*`)

- **`Offerings.tsx`:**
  - Display `donorName` (and `envelopeNo` / `receiptRef` when present) on every row/card for authorized roles.
  - Add **Period / Date Range Filter** (`เดือนนี้`, `เดือนที่แล้ว`, `3 เดือนล่าสุด`, `ปีนี้`, `ทั้งหมด`) + Category Filter.
  - Fix search to match `title`, `donorName`, `fundName`, and `receiptRef`.
- **`NewOffering.tsx` & `server/routers.ts`:**
  - Accept and persist `donorMemberId` in `trpc.offerings.create` and `trpc.offerings.update`.
  - Add bidirectional matching between `envelopeNumber` and `members`: typing an envelope number (`001`) automatically selects the matching member and displays a confirmation pill (`เชื่อมโยงสมาชิก: คุณสมชาย ใจดี • ซอง #001`); selecting a member automatically fills their `envelopeNo`.
- **`GivingStation.tsx`:**
  - Auto-scroll error alert into view (`scrollIntoView`) if OCR or submission fails, and automatically downscale large camera images client-side so 12MP phone photos never fail upload in LINE WebView or mobile Safari.
- **`GivingInbox.tsx`:**
  - Add `"อนุมัติและเปิดรายการถัดไป"` (Approve & Next) button in the review modal when more pending slips remain, plus a 1-tap image zoom toggle.
- **`CountingDetail` (`EnvelopesTab.tsx`, `CashCountTab.tsx`, `ReconciliationSummaryTab.tsx`):**
  - Auto-match `envelopeNo` ↔ `memberId` in `EnvelopesTab.tsx`.
  - Fix duplicate `setCashCount.mutate` calls on blur in `CashCountTab.tsx`.
  - Add a clear **Pre-Post Checklist (`รายการตรวจสอบก่อนลงบัญชี`)** in `ReconciliationSummaryTab.tsx` so treasurers immediately see if Step 5 (`CarryForwardLedger`) or Step 4 (`DeductionsTab`) needs attention, with 1-tap buttons to jump to that step.

### Area 3: Expense Management (`Expenses.tsx`, `NewExpense.tsx`, `NewWithdrawal.tsx`, `Approvals.tsx`)

- **`Expenses.tsx`:**
  - Add **Period / Date Range Filter** (`เดือนนี้`, `เดือนที่แล้ว`, `3 เดือนล่าสุด`, `ปีนี้`, `ทั้งหมด`).
  - Fix search to match `description`, `payee`, `fundName`, `category`, and `receiptRef`.
  - Enlarge quick `อนุมัติ` / `ยกเลิก` buttons to `min-h-11` (`44px`).
- **`NewExpense.tsx` & `TransactionDetail.tsx`:**
  - Return `details` (`หมายเหตุเพิ่มเติม / วัตถุประสงค์`) from `db.getExpenseById` and display/edit it on `TransactionDetail.tsx`.
- **`NewWithdrawal.tsx` & `Approvals.tsx`:**
  - Add `role="dialog"`, `aria-modal="true"`, and `Escape` key closing to confirmation and payment modals.

### Area 4: Transaction History & Correction (`Transactions.tsx`, `TransactionDetail.tsx`)

- **`Transactions.tsx`:**
  - Add **Period / Date Range Filter** (`เดือนนี้`, `เดือนที่แล้ว`, `3 เดือนล่าสุด`, `ปีนี้`, `ทั้งหมด`) and pass `startDate` / `endDate` + `limit: 500` to the server.
  - Map `donorName`, `payee`, and `notes` onto `TransactionItem`, display `donorName` / `payee` on each row/card, and include them in search filtering.
  - Scope the 3 KPI summary cards (`รายรับตามตัวกรอง`, `รายจ่ายตามตัวกรอง`, `ดุลสุทธิตามตัวกรอง`) to the active period so they are always mathematically meaningful and reconcile with `/reports`.
  - Gate `"บันทึกการถวาย"` and `"บันทึกรายจ่าย"` buttons behind `canManageFinance(user)`.
- **`TransactionDetail.tsx`:**
  - Expand Edit mode (and `trpc.offerings.update` / `trpc.expenses.update`) so treasurers can correct `category`, `receiptDate`/`expenseDate`, `method`, and `receiptRef` in addition to `amount`, `fundId`, `donorName`/`payee`, `donorMemberId`, and `notes`/`details`.

### Area 5: Funds, Categories & Budgets (`Funds.tsx`, `FundDetail.tsx`, `Budgets.tsx`, `BudgetDetail.tsx`)

- **`Funds.tsx`:**
  - Display General (`เงินกองทุนทั่วไป`) vs. Restricted (`เงินกองทุนเฉพาะกิจ`) subtotals in the top summary card to match `Home.tsx`.
  - Disable the `"สร้างกองทุน"` submit button while `createAccountMutation.isPending` and add `Escape` / `role="dialog"` to the modal.
- **`FundDetail.tsx`:**
  - Pass `{ fundId: fund.id, limit: 500 }` to `trpc.offerings.list` and `trpc.expenses.list` so the fund ledger and CSV statement include all transactions for that fund and reconcile with `fund.balance`.
  - Remove the dead toast-only `"โอนเงินระหว่างกองทุน"` button (or replace with a clear link to record an offering/expense for this fund).
- **`BudgetDetail.tsx`:**
  - Show a list of the matching expenses that contributed to `spentAmount` (or a direct link to `/expenses` filtered by category) so pastors and deacons can inspect budget usage.

### Area 6: Financial Reports (`Reports.tsx`)

- Ensure `/reports` and `/transactions` (when filtered to the same month/year) show identical income, expense, and net totals.
- Add a mobile horizontal-scroll hint above wide monthly breakdown tables on `< 640px` screens.

### Area 7: Member & User Management (`Members.tsx`, `MemberDetail.tsx`, `Profile.tsx`)

- **`Members.tsx` & `MemberDetail.tsx`:**
  - Add `envelopeNo` (`รหัสซองถวาย`) input field to member creation and editing (`server/routers.ts`, `server/db.ts`, `Members.tsx`, `MemberDetail.tsx`).
  - Display the `ซอง #...` badge on member cards and allow searching `/members` by `envelopeNo`, name, phone, or email.
- **`Profile.tsx`:**
  - Remove the unused `trpc.withdrawals.list.useQuery({ myOnly: false })` query.
  - Replace the decorative `<QrCode>` icon in the Digital ID Card modal with a clean, authentic Official Church Member Verification badge, and upgrade preset avatar buttons to `size-11` (`44×44px`).

### Area 8: Church Setup & Settings (`ChurchSetup.tsx`, `Settings.tsx`)

- **`ChurchSetup.tsx`:**
  - Pre-load existing `church.getProfile` and `finance.accounts` data on mount so revisiting `/setup` never wipes existing church data or duplicates existing funds, and persist `fiscalYearStartMonth`.
- **`Settings.tsx`:**
  - Tab 1: Add inputs for `assistantPastorName`, `website`, and `fiscalYearStartMonth`.
  - Tab 2: Add `COUNTER` (`กรรมการนับเงิน`) to the role reference cards, and add a responsive **Mobile Card View (`md:hidden`)** for the User Management list with `min-h-11` buttons.
  - Tab 5: Fix the Audit Log action filter values to match actual database action codes (`AUTH_SET_CHURCH_ROLE`, `AUTH_APPROVE_USER`, `OFFERING_CREATE`, `EXPENSE_CREATE`, `WITHDRAWAL_APPROVE`, etc.) and add a responsive **Mobile Card View (`md:hidden`)** for Audit Log entries.

---

## 3. Phase 4 — Responsive & Accessibility Checklist

| Viewport / Check                       | Target Standard                                                              | Remediation Actions                                                                                                                                                                    |
| -------------------------------------- | ---------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Mobile (`375px`, `390px`, `430px`)** | Zero horizontal page overflow; tables adapt to cards; sticky/accessible CTAs | Add `md:hidden` mobile cards for `Settings.tsx` Tab 2 (Users) & Tab 5 (Audit Log); add mobile theme toggle in `AppNavigation.tsx`; ensure `ChurchSetup.tsx` step header wraps cleanly. |
| **Tablet (`768px`)**                   | Balanced 2-column grids; readable navigation                                 | Verify `AppLayout` header and 2-column form grids across `NewOffering`, `NewExpense`, `Settings`.                                                                                      |
| **Desktop (`1280px`, `1440px`)**       | Clean editorial ledger tables; keyboard-navigable rows                       | Add `tabIndex={0}`, `role="link"`, and `Enter`/`Space` key handlers to clickable `<tr>` rows in `Transactions.tsx`, `Offerings.tsx`, `Expenses.tsx`, `FundDetail.tsx`.                 |
| **Touch Targets (`>= 44×44px`)**       | All interactive elements `min-h-11` (`44px`) or `size-11`                    | Upgrade `< 44px` buttons in `AppLayout`, `Expenses`, `TransactionDetail`, `Counting`, `CountingDetail`, `Budgets`, `Ministries`, `Members`, `Settings`, `Profile`.                     |
| **Modals & Dialogs**                   | `role="dialog"`, `aria-modal="true"`, `Escape` key closes, focus management  | Upgrade custom `fixed inset-0` modals in `Funds.tsx`, `NewWithdrawal.tsx`, `Approvals.tsx`, `Profile.tsx`.                                                                             |

---

## 4. Phase 5 — Implementation Plan, Affected Files & Risk Assessment

### 4.1 Affected Files (26 Files)

1. **Backend / API (`server/` — Backward-Compatible Filter & Field Additions Only):**
   - `server/db.ts` — Add optional `fundId`, `startDate`, `endDate` filters to `listOfferings` & `listExpenses`; include `details` in `getExpenseById` & `updateExpense`; include `envelopeNo` in `createMember` & `updateMember`; include `donorMemberId`, `category`, `receiptDate`, `method`, `receiptRef` in `updateOffering`; include `category`, `expenseDate`, `method`, `receiptRef`, `details` in `updateExpense`.
   - `server/routers.ts` — Expose optional `fundId`, `startDate`, `endDate` (and `limit` up to `500`) on `offerings.list` & `expenses.list`; expose `donorMemberId` on `offerings.create` & `offerings.update`; expose `category`, `date`, `method`, `receiptRef`, `details` on `offerings.update` & `expenses.update`; expose `envelopeNo` on `members.create` & `members.update`.
2. **Design System & Layout (`client/src/`):**
   - `client/src/index.css` — Refine `.bento-card`, `.bento-card-static`, `.neo-input`, `.neo-select` borders/shadows for Modern Minimalist + Editorial Financial clarity while preserving all brand color tokens.
   - `client/src/components/layout/AppLayout.tsx` — Upgrade notification bell touch target to `size-11`.
   - `client/src/components/layout/AppNavigation.tsx` — Add Light/Dark mode toggle inside mobile drawer.
3. **Pages (`client/src/pages/`):**
   - `client/src/pages/Home.tsx` & `client/src/pages/Home/components/CashflowChart.tsx` — Add Quick Operations strip for finance staff; improve chart label readability.
   - `client/src/pages/Login.tsx` — Add 1-line note explaining first-time staff approval flow.
   - `client/src/pages/ChurchSetup.tsx` — Hydrate from `church.getProfile` & `finance.accounts` on mount; avoid duplicate fund creation; save `fiscalYearStartMonth`.
   - `client/src/pages/GivingStation.tsx` — Auto-scroll error alert into view on mobile; ensure client-side image compression before base64 upload.
   - `client/src/pages/GivingInbox.tsx` — Add `"อนุมัติและเปิดรายการถัดไป"` button and slip image zoom toggle.
   - `client/src/pages/Transactions.tsx` — Add Period/Date filter; map & search `donorName`, `payee`, `notes`; gate write CTAs by `canManageFinance`; add keyboard `<tr>` navigation.
   - `client/src/pages/TransactionDetail.tsx` — Display/edit expense `details`; allow editing `category`, `date`, `method`, `receiptRef`, `donorMemberId`; upgrade buttons to `min-h-11`.
   - `client/src/pages/Counting.tsx` — Upgrade button touch targets to `min-h-11` / `size-11`.
   - `client/src/pages/CountingDetail/components/EnvelopesTab.tsx` — Add bidirectional `envelopeNo` ↔ `memberId` auto-matching; `size-11` delete button.
   - `client/src/pages/CountingDetail/components/CashCountTab.tsx` — Prevent duplicate mutation on blur.
   - `client/src/pages/CountingDetail/components/ReconciliationSummaryTab.tsx` — Add visible Pre-Post Checklist (`รายการตรวจสอบก่อนลงบัญชี`) with 1-tap step jump buttons.
   - `client/src/pages/Offerings.tsx` — Display `donorName` & `receiptRef`; add Period & Category filter; fix `fundName` search; keyboard `<tr>` support.
   - `client/src/pages/NewOffering.tsx` — Link `donorMemberId` & bidirectional `envelopeNo` ↔ member auto-matching.
   - `client/src/pages/Expenses.tsx` — Add Period filter; fix `fundName` & `category` search; `min-h-11` action buttons; keyboard `<tr>` support.
   - `client/src/pages/NewWithdrawal.tsx` & `client/src/pages/Approvals.tsx` — Modal `role="dialog"` & `Escape` key support.
   - `client/src/pages/Funds.tsx` & `client/src/pages/FundDetail.tsx` — General vs. Restricted header split on `/funds`; server-filtered `{ fundId, limit: 500 }` on `/funds/:id`; remove dead transfer toast button.
   - `client/src/pages/Budgets.tsx` & `client/src/pages/BudgetDetail.tsx` — Show matching expenses on `BudgetDetail`; `size-11` buttons & `role="progressbar"`.
   - `client/src/pages/Ministries.tsx` — Upgrade close button to `size-11`.
   - `client/src/pages/Members.tsx` & `client/src/pages/MemberDetail.tsx` — Add `envelopeNo` input, badge display, and search support.
   - `client/src/pages/Reports.tsx` — Add mobile scroll hint on wide breakdown table.
   - `client/src/pages/Settings.tsx` — Add `assistantPastorName`, `website`, `fiscalYearStartMonth` in Tab 1; `COUNTER` role card & mobile user cards in Tab 2; fix Audit Log filter & add mobile cards in Tab 5.
   - `client/src/pages/Profile.tsx` — Remove unused `withdrawals.list` query; replace fake QR with verified member badge; `size-11` avatar buttons; modal accessibility.

### 4.2 Risks, Dependencies & Guardrails

- **Zero Database Schema Migration Needed:** Every field (`members.envelopeNo`, `offerings.donorMemberId`, `expenses.details`, `churchSettings.assistantPastorName`, `churchSettings.website`, `churchSettings.fiscalYearStartMonth`) **already exists in `drizzle/schema.ts` and the production database**! No SQL migration is required.
- **Zero Breaking Changes to Financial Accounting Rules:** Core balance updates (`accounts.balance`), counting reconciliation math, budget utilization math, and donor privacy masking (`canViewDonorNames` → `"ผู้ถวายนิรนาม"`) remain 100% intact.
- **Zero New NPM Dependencies:** All improvements reuse existing project dependencies.
- **Full Regression Verification (Phase 6 & Phase 7):** `pnpm check`, `pnpm test` (plus new unit tests for the updated router/UI workflows), and creation of `docs/FINAL_UX_AUDIT_REPORT.md`.
