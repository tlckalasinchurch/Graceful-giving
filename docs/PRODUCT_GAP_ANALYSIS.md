# GRACEFUL GIVING — PRODUCT & FINANCIAL GAP ANALYSIS (`docs/PRODUCT_GAP_ANALYSIS.md`)

**Date:** 2026-11-07  
**Target System:** `https://graceful-giving.vercel.app` (`Graceful-giving`)

---

## 1. Financial Accuracy & Reconciliation Analysis

### 1.1 How Financial Balances Are Stored and Calculated (Verified Baseline)

- **Source of Truth (`drizzle/schema.ts` & `server/db.ts`):**
  - `accounts` (Funds): Holds `balance` (`decimal(15, 2)`). Whenever an offering (`status = "approved"`) is created or voided, or an expense (`status = "approved"`) is created, approved, or voided, `server/db.ts` atomically updates `accounts.balance` inside the database logic.
  - `reports.monthlySummary` and `reports.annualSummary` (`server/db.ts`): Aggregate all `approved` offerings and `approved` expenses directly in SQL/server memory for the requested year/month.
  - **Important Constraint:** The core server-side balance accounting (`accounts.balance`, `counting.post`, `withdrawals`, `reports`) is covered by integration tests (`server/counting.workflow.test.ts`, `server/reports.integration.test.ts`, `server/budgets.integration.test.ts`, `server/withdrawals.workflow.test.ts`) and is mathematically sound. **We will NOT alter the core accounting formulas.**

### 1.2 Why On-Screen Ledger Pages Fail to Reconcile (Critical Gap #1 — P0)

While the database and `/reports` are accurate, **four client-side ledger pages** fetch truncated slices of global records without server-side filtering and compute misleading totals in browser memory:

| Page                                                 | Current Query                                                                                       | What Breaks                                                                                                                                                                                                                                                                                                                                        |
| ---------------------------------------------------- | --------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/transactions` (`Transactions.tsx:49, 61, 129-143`) | `offerings.list({ limit: 50 })` + `expenses.list({ limit: 50 })`                                    | Sums the latest 50 offerings (e.g., 1–2 weeks of Sunday tithes) and latest 50 expenses (e.g., 6 months of utility bills) into `"รายรับทั้งหมด"`, `"รายจ่ายทั้งหมด"`, and `"ยอดสุทธิ"`. Because the two 50-row windows cover completely different date ranges, `"ยอดสุทธิ"` is financially meaningless and never reconciles with `/reports` or `/`. |
| `/funds/:id` (`FundDetail.tsx:37, 41, 58-83`)        | `offerings.list({ limit: 100 })` + `expenses.list({ limit: 100 })` (global, unfiltered by `fundId`) | Filters the church's global latest 100 records by `o.fundId === fund.id` in the browser. Any transaction in this fund older than the church's latest 100 global records disappears from both the on-screen fund ledger (`รายรับสะสม` / `รายจ่ายสะสม`) and the exported Fund Statement CSV!                                                         |
| `/offerings` (`Offerings.tsx:45`)                    | `offerings.list({ limit: 50 })`                                                                     | Truncates the offering ledger, summary total, and CSV export at 50 rows with no date filter.                                                                                                                                                                                                                                                       |
| `/expenses` (`Expenses.tsx:66`)                      | `expenses.list({ limit: 50 })`                                                                      | Truncates the expense ledger, summary total, and CSV export at 50 rows with no date filter.                                                                                                                                                                                                                                                        |

**Required Architectural Fix (Backward-Compatible, Preserves Business Logic):**

1. Extend `trpc.offerings.list` and `trpc.expenses.list` (`server/routers.ts` and `server/db.ts`: `listOfferings` / `listExpenses`) to accept optional filter parameters:
   - `fundId?: number`
   - `startDate?: Date`
   - `endDate?: Date`
   - Increase the allowed `limit` cap from `200` to `500`.
2. Update `FundDetail.tsx` to pass `{ fundId: fund.id, limit: 500 }` so every fund statement fetches that specific fund's transactions directly from PostgreSQL and reconciles with `fund.balance`.
3. Update `Transactions.tsx`, `Offerings.tsx`, and `Expenses.tsx` to include a **Period / Date Range Filter** (`เดือนนี้`, `เดือนที่แล้ว`, `3 เดือนล่าสุด`, `ปีนี้`, `ทั้งหมด`, or custom date range) and pass `startDate` / `endDate` (with `limit: 500`) to `offerings.list` and `expenses.list`.

---

## 2. Broken Data Lifecycles & Incomplete Features

### 2.1 Gap #2 (P0): Member Envelope Number (`envelopeNo`) & Donor Member Linking (`donorMemberId`)

- **Database Support Exists:**
  - `members.envelopeNo` (`varchar(32)`) exists in `drizzle/schema.ts:247`.
  - `offerings.donorMemberId` (`integer`) exists in `drizzle/schema.ts:104`.
- **Where the Workflow Breaks:**
  1. `server/routers.ts` (`members.create` at `L819-835` and `members.update` at `L837-858`) does **not** accept `envelopeNo`!
  2. `Members.tsx` and `MemberDetail.tsx` have **no input field** to view, set, or edit `envelopeNo`.
  3. `server/routers.ts` (`offerings.create` at `L956-970` and `offerings.update` at `L986-1020`) does **not** accept `donorMemberId`!
  4. `NewOffering.tsx` only submits `donorName` as plain text—never `donorMemberId`—so manually recorded offerings never appear on `/members/:id` (`MemberDetail.tsx`) or in the member's Annual Tax Donation Certificate!
  5. `EnvelopesTab.tsx` (`/counting/:id` Step 1) and `NewOffering.tsx` do not auto-match `envelopeNo` ↔ `memberId` when typing an envelope number or selecting a member.

### 2.2 Gap #3 (P0): Missing Expense `details` & Locked Fields in `TransactionDetail.tsx`

- **Where the Workflow Breaks:**
  1. `NewExpense.tsx:498` collects `"หมายเหตุเพิ่มเติม / วัตถุประสงค์"` and sends it as `details` to `trpc.expenses.create`.
  2. `db.createExpense` saves `details` to `expenses.details` in PostgreSQL.
  3. However, `db.getExpenseById` (`server/db.ts:851-882`) omits `details` from `ExpenseRow`, and `TransactionDetail.tsx:181` hardcodes `notes: null` for expenses. The treasurer's explanation is completely hidden on `/transactions/EXP-...`!
  4. When clicking `"แก้ไข"` on `/transactions/:id` (`TransactionDetail.tsx:337-410`), the user cannot edit `category`, `receiptDate`/`expenseDate`, `method`, or `receiptRef` because both the UI form and `trpc.offerings.update` / `trpc.expenses.update` omit those fields.

### 2.3 Gap #4 (P0): `ChurchSetup.tsx` Profile Overwrite & Discarded Steps

- **Where the Workflow Breaks:**
  1. `ChurchSetup.tsx` initializes local state with empty strings and never loads `trpc.church.getProfile.useQuery()` or `trpc.finance.accounts.useQuery()`.
  2. If an administrator visits `/setup` after initial setup, completing the wizard overwrites saved profile fields with blanks and creates duplicate default funds.
  3. Step 4 (`offeringCategories`) and Step 6 (`budgetYear` / `fiscalYearStartMonth`) are not persisted when finishing the wizard.

### 2.4 Gap #5 (P1): Weekly Counting Session (`CountingDetail`) Friction

- **Where the Workflow Breaks:**
  1. In `ReconciliationSummaryTab.tsx` (Step 6), `"ลงบัญชีเข้าระบบ"` is disabled when `!canPost`, which depends on Step 5 (`CarryForwardLedger`: both `actualCashInBox` and `passbookBalance` must be saved), Step 4 (`DeductionsTab`: all deductions must be approved), and `varianceNote` (if variance != 0). When `!canPost` is true, the user is given **no visual checklist** explaining which requirement is incomplete.
  2. In `CashCountTab.tsx` (Step 2), `onChange` schedules a 350ms debounced mutation while `onBlur` fires an immediate mutation without clearing the timer, causing duplicate network writes and 7 query invalidations per input blur.

### 2.5 Gap #6 (P1): Search & Visibility Gaps in Ledgers

- `Offerings.tsx` hides `donorName` from its table and mobile cards (even for `TREASURER` and `SUPER_ADMIN` who have `canViewDonorNames = true`), and its search bar fails to match `fundName` or `receiptRef`.
- `Expenses.tsx` search bar fails to match `fundName`, `category`, or `receiptRef`.
- `Transactions.tsx` fails to map `donorName` and `payee` onto `TransactionItem`, so searching by a donor or vendor name returns 0 results.

### 2.6 Gap #7 (P1): Settings, Profile & Dead UI Controls

- `FundDetail.tsx:170-180` renders a `"โอนเงินระหว่างกองทุน"` button that only shows a placeholder toast.
- `Settings.tsx` Tab 1 omits inputs for `assistantPastorName`, `website`, and `fiscalYearStartMonth`.
- `Settings.tsx` Tab 2 omits `COUNTER` from the official role reference cards and lacks a mobile card view for the Users table.
- `Settings.tsx` Tab 5 (Audit Log) lacks a mobile card view and filters for `"update_user_role"` instead of the actual `"AUTH_SET_CHURCH_ROLE"` / `"AUTH_APPROVE_USER"` action codes.
- `Profile.tsx:196-199` fires an unused `trpc.withdrawals.list.useQuery({ myOnly: false })` query on mount and renders a static decorative `<QrCode>` icon in the Digital ID Card modal.

---

## 3. Summary Matrix of Defects by Priority

| ID         | Defect / Gap                                                                                                                                        | Affected Files                                                                                                                          | Priority    |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| **GAP-01** | 50/100-row client truncation & un-reconciled totals on `/transactions`, `/offerings`, `/expenses`, `/funds/:id`                                     | `server/db.ts`, `server/routers.ts`, `Transactions.tsx`, `Offerings.tsx`, `Expenses.tsx`, `FundDetail.tsx`                              | **P0**      |
| **GAP-02** | Missing `envelopeNo` in Member CRUD & missing `donorMemberId` in `NewOffering.tsx` / `offerings.create`                                             | `server/db.ts`, `server/routers.ts`, `Members.tsx`, `MemberDetail.tsx`, `NewOffering.tsx`, `EnvelopesTab.tsx`                           | **P0**      |
| **GAP-03** | Expense `details` missing in `getExpenseById` / `TransactionDetail.tsx` & incomplete edit fields (`date`, `category`, `method`, `receiptRef`)       | `server/db.ts`, `server/routers.ts`, `TransactionDetail.tsx`                                                                            | **P0**      |
| **GAP-04** | `ChurchSetup.tsx` overwrites saved profile, duplicates funds, and discards fiscal year                                                              | `ChurchSetup.tsx`                                                                                                                       | **P0**      |
| **GAP-05** | `ReconciliationSummaryTab.tsx` disables `"ลงบัญชีเข้าระบบ"` without a pre-post checklist; `CashCountTab.tsx` double-fires mutations on blur         | `ReconciliationSummaryTab.tsx`, `CashCountTab.tsx`                                                                                      | **P0 / P1** |
| **GAP-06** | `Offerings.tsx` hides `donorName`; `Transactions.tsx`, `Offerings.tsx`, `Expenses.tsx` search misses `donorName`, `payee`, `fundName`, `receiptRef` | `Transactions.tsx`, `Offerings.tsx`, `Expenses.tsx`                                                                                     | **P1**      |
| **GAP-07** | `Settings.tsx` missing profile fields, missing `COUNTER` card, broken audit filter, and mobile table overflow on Tab 2 & Tab 5                      | `Settings.tsx`                                                                                                                          | **P1**      |
| **GAP-08** | `Profile.tsx` unused unauthorized `withdrawals.list` query, fake QR icon, `<44px` avatar buttons                                                    | `Profile.tsx`                                                                                                                           | **P1**      |
| **GAP-09** | `GivingStation.tsx` & `NewExpense.tsx` mobile error auto-scroll + large camera photo downscaling                                                    | `GivingStation.tsx`, `NewExpense.tsx`, `GivingInbox.tsx`                                                                                | **P1**      |
| **GAP-10** | Accessibility & Touch Targets (`< 44px` buttons, keyboard table rows, modal `Escape` & `role="dialog"`, mobile theme toggle)                        | `AppLayout.tsx`, `AppNavigation.tsx`, `index.css`, `Funds.tsx`, `NewWithdrawal.tsx`, `Approvals.tsx`, `Budgets.tsx`, `BudgetDetail.tsx` | **P1 / P2** |
