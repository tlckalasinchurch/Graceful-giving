# GRACEFUL GIVING — REAL-WORLD UX/UI & PRODUCT AUDIT (`docs/UX_AUDIT.md`)

**Audit Date:** 2026-11-07  
**Target System:** `https://graceful-giving.vercel.app` (Repository: `Graceful-giving`, branch `main` @ `e8053cf`)  
**Auditors:** Principal Product Designer, Senior UX Engineer, Financial Software Architect, QA Automation Engineer

---

## 1. Executive Summary & Baseline Architecture (Phase 0)

### 1.1 Tech Stack & Architecture

- **Frontend (`client/`):** React 19 SPA bundled by Vite 7, styled with Tailwind CSS v4 (`@tailwindcss/vite`) and custom CSS tokens in `client/src/index.css`. Routing uses `wouter` v3.7.1 (`patched` in `patches/`). State & RPC use `@tanstack/react-query` v5 + `@trpc/client` v11 (`superjson` transformer). Modals use a mix of Radix UI (`@radix-ui/react-dialog`), SweetAlert2 (`client/src/lib/sweetalert.ts`), and custom `fixed inset-0` overlays.
- **Backend (`server/`):** Express + tRPC v11 (`server/routers.ts`), serving both as a Vercel Serverless Function (`api/index.js` built from `server/_core/apiHandler.ts`) and a self-hosted monolith (`server/_core/index.ts`).
- **Database (`drizzle/`):** PostgreSQL (Supabase transaction pooler, `prepare: false`) via `drizzle-orm/postgres-js`. Schema defined in `drizzle/schema.ts` (16 tables + 14 enums). Money is validated as `z.number()` at the API boundary and stored as `decimal(..., 2)` strings (`toFixed(2)`).
- **Storage & AI (`server/storage.ts`, `server/slipOcr.ts`):** Supabase REST storage (`receipts` public bucket; `slips` private bucket served exclusively via 1-hour signed URLs `getSlipSignedUrl`). Slip OCR uses Gemini (`@google/genai`).
- **Authentication & Role Model (`shared/roles.ts`, `client/src/lib/routeAccess.ts`, `server/routers.ts`):**
  - Authentication via LINE Login OAuth (`server/lineAuth.ts`) + session cookie (`server/_core/cookies.ts`).
  - Two role dimensions on `users`: coarse `role` (`"user" | "admin"`) and fine `churchRole` (+ comma-separated `churchRoles`): `SUPER_ADMIN | PASTOR | TREASURER | DEACON | COUNTER | MEMBER`.
  - **Important security rule:** `user.role === "admin"` passes every `hasAnyRole` gate on both client and server.
  - Donor privacy rule: Donor names on offerings are masked to `"ผู้ถวายนิรนาม"` inside `db.listOfferings` / `db.getOfferingById` unless `showDonorNames` (`canViewDonorNames`: `SUPER_ADMIN`, `TREASURER`, `PASTOR`) is true.

### 1.2 Complete Route & Page Inventory (29 Routes / 28 User-Facing Pages + 1 Dev Showcase)

Every route defined in `client/src/App.tsx` has been inspected first-hand:

| #   | Route Pattern                         | Page Component                                       | Access Gate (`routeAccess.ts`)                                            | Priority |
| --- | ------------------------------------- | ---------------------------------------------------- | ------------------------------------------------------------------------- | -------- |
| 1   | `/`                                   | `client/src/pages/Home.tsx`                          | `isAuthenticated` (all active users; unauthenticated sees public landing) | **P1**   |
| 2   | `/login` (`/register` redirects here) | `client/src/pages/Login.tsx`                         | Public                                                                    | **P2**   |
| 3   | `/setup`                              | `client/src/pages/ChurchSetup.tsx`                   | `canManageChurchSettings` (`SUPER_ADMIN`, `PASTOR`)                       | **P0**   |
| 4   | `/privacy`                            | `client/src/pages/Privacy.tsx`                       | Public                                                                    | **P2**   |
| 5   | `/404` (+ wildcard fallback)          | `client/src/pages/NotFound.tsx`                      | Public                                                                    | **P3**   |
| 6   | `/give`                               | `client/src/pages/Give.tsx`                          | Public                                                                    | **P2**   |
| 7   | `/giving/station`                     | `client/src/pages/GivingStation.tsx`                 | Public                                                                    | **P1**   |
| 8   | `/giving/inbox`, `/giving-inbox`      | `client/src/pages/GivingInbox.tsx`                   | `canAccessGivingInbox` (`SUPER_ADMIN`, `TREASURER`, `COUNTER`)            | **P1**   |
| 9   | `/transactions`                       | `client/src/pages/Transactions.tsx`                  | `canViewFinanceOverview` (`SUPER_ADMIN`, `PASTOR`, `TREASURER`)           | **P0**   |
| 10  | `/transactions/:id`                   | `client/src/pages/TransactionDetail.tsx`             | `canViewFinanceOverview` (`SUPER_ADMIN`, `PASTOR`, `TREASURER`)           | **P0**   |
| 11  | `/counting`                           | `client/src/pages/Counting.tsx`                      | `canAccessCounting` (`SUPER_ADMIN`, `TREASURER`, `PASTOR`, `COUNTER`)     | **P1**   |
| 12  | `/counting/:id`                       | `client/src/pages/CountingDetail.tsx` (+ 6 sub-tabs) | `canAccessCounting` (`SUPER_ADMIN`, `TREASURER`, `PASTOR`, `COUNTER`)     | **P0**   |
| 13  | `/offerings`                          | `client/src/pages/Offerings.tsx`                     | `canManageFinance` (`SUPER_ADMIN`, `TREASURER`)                           | **P0**   |
| 14  | `/offerings/new`                      | `client/src/pages/NewOffering.tsx`                   | `canManageFinance` (`SUPER_ADMIN`, `TREASURER`)                           | **P0**   |
| 15  | `/expenses`                           | `client/src/pages/Expenses.tsx`                      | `canManageFinance` (`SUPER_ADMIN`, `TREASURER`)                           | **P0**   |
| 16  | `/expenses/new`                       | `client/src/pages/NewExpense.tsx`                    | `canManageFinance` (`SUPER_ADMIN`, `TREASURER`)                           | **P1**   |
| 17  | `/withdrawals/new`                    | `client/src/pages/NewWithdrawal.tsx`                 | `canRequestWithdrawal` (`SUPER_ADMIN`, `PASTOR`, `TREASURER`, `DEACON`)   | **P1**   |
| 18  | `/funds`                              | `client/src/pages/Funds.tsx`                         | `canViewFinanceOverview` (`SUPER_ADMIN`, `PASTOR`, `TREASURER`)           | **P1**   |
| 19  | `/funds/:id`                          | `client/src/pages/FundDetail.tsx`                    | `canViewFinanceOverview` (`SUPER_ADMIN`, `PASTOR`, `TREASURER`)           | **P0**   |
| 20  | `/budgets`                            | `client/src/pages/Budgets.tsx`                       | `canViewBudgets` (`SUPER_ADMIN`, `PASTOR`, `TREASURER`, `DEACON`)         | **P1**   |
| 21  | `/budgets/:id`                        | `client/src/pages/BudgetDetail.tsx`                  | `canViewBudgets` (`SUPER_ADMIN`, `PASTOR`, `TREASURER`, `DEACON`)         | **P1**   |
| 22  | `/ministries`                         | `client/src/pages/Ministries.tsx`                    | `canViewMinistries` (`SUPER_ADMIN`, `PASTOR`, `TREASURER`, `DEACON`)      | **P2**   |
| 23  | `/ministries/:id`                     | `client/src/pages/MinistryDetail.tsx`                | `canViewMinistries` (`SUPER_ADMIN`, `PASTOR`, `TREASURER`, `DEACON`)      | **P2**   |
| 24  | `/members`                            | `client/src/pages/Members.tsx`                       | `canViewMembers` (`SUPER_ADMIN`, `PASTOR`, `TREASURER`, `DEACON`)         | **P0**   |
| 25  | `/members/:id`                        | `client/src/pages/MemberDetail.tsx`                  | `canViewMembers` (`SUPER_ADMIN`, `PASTOR`, `TREASURER`, `DEACON`)         | **P0**   |
| 26  | `/reports`                            | `client/src/pages/Reports.tsx`                       | `canViewReports` (`SUPER_ADMIN`, `PASTOR`, `TREASURER`)                   | **P1**   |
| 27  | `/approvals`                          | `client/src/pages/Approvals.tsx`                     | `canViewApprovals` (`SUPER_ADMIN`, `PASTOR`, `TREASURER`, `DEACON`)       | **P1**   |
| 28  | `/notifications`                      | `client/src/pages/Notifications.tsx`                 | `isAuthenticated`                                                         | **P2**   |
| 29  | `/settings`                           | `client/src/pages/Settings.tsx`                      | `canManageChurchSettings` (`SUPER_ADMIN`, `PASTOR`)                       | **P1**   |
| 30  | `/profile`                            | `client/src/pages/Profile.tsx`                       | `isAuthenticated`                                                         | **P1**   |
| 31  | `/updates`                            | `client/src/pages/Updates.tsx`                       | Public / `isAuthenticated`                                                | **P2**   |
| —   | `/ui-showcase`                        | `client/src/pages/ComponentShowcase.tsx`             | Dev-only (`import.meta.env.DEV`)                                          | —        |

---

## 2. Shared Layout, Navigation & Design System Audit

### 2.1 Shared Shell (`AppLayout.tsx`, `AppNavigation.tsx`, `index.css`)

- **Current Functionality:**
  - `AppLayout.tsx` provides a responsive desktop sidebar (`lg:w-64`), mobile top header (`lg:hidden`), mobile bottom 4-tab bar + `"เมนู"` drawer (`MobileBottomBar`), notification popover (`NotificationCenter`), and `RoleGuard` wrapper.
  - `index.css` defines a warm editorial + neo-brutalist palette (`--paper`, `--ink`, `--brand`, `--accent`) with `IBM Plex Sans Thai Looped` body font, `Niramit` display font, and `JetBrains Mono` (`tabular-nums`) for `.money`.
  - Fluid root font sizing was added (`16px` mobile, `17px` tablet, `16.5px` desktop) and `.text-xs` was raised to `0.8125rem` (`13px`).
- **Usability & Visual Problems:**
  - **Heavy Neo-Brutalist Visual Noise on Dense Financial Screens:** Every `.bento-card`, `.bento-card-static`, `.neo-input`, `.neo-pill`, and status badge uses thick `1.5px–2px solid var(--ink)` borders and `3px–5px` hard offset shadows (`shadow-[4px_4px_0_var(--ink)]`). On data-dense pages (`Transactions`, `CountingDetail`, `Settings`, `Reports`), hundreds of competing black outlines and hard shadows create severe visual fatigue for older church treasurers.
  - **Notification Bell Touch Target (`AppLayout.tsx:161`):** The notification bell trigger uses `h-10 w-10` (`40×40px`), below the `44×44px` (`min-h-11 min-w-11`) mobile accessibility standard.
  - **Theme Toggle Hidden on Mobile (`AppLayout.tsx:96, 179`):** The dark-mode toggle button is only rendered in the desktop sidebar (`lg:flex`) and desktop top bar (`hidden lg:flex`). Mobile users inside the `"เมนู"` drawer (`AppNavigation.tsx:266-399`) have no way to switch between Light and Dark mode.

---

## 3. Page-by-Page UX, Visual, Mobile, Accessibility & Functional Audit

---

### Page 1: `/` — Dashboard & Public Landing (`client/src/pages/Home.tsx`)

- **Priority:** **P1**
- **Current Functionality:**
  - Unauthenticated users see `PublicWelcomeLanding` (hero, QR giving CTA, LINE login).
  - Pending users (`accountStatus === "pending"`) see `PendingApprovalScreen`.
  - Active non-finance roles (`MEMBER`, `COUNTER`, `DEACON`) see `MemberPortalView` (role workspace shortcuts + announcements).
  - Finance roles (`SUPER_ADMIN`, `PASTOR`, `TREASURER`) see the Financial Dashboard: `BalanceCard` (total balance, general vs. restricted split `fundPoolSplit`, monthly net change, privacy toggle, fund share bar), Monthly Income/Expense summary cards, 6-month `CashflowChart`, `AttentionList` (pending slips, open counting sessions, pending withdrawals, negative funds), and `RecentActivityList`.
- **Usability Problems:**
  - `AttentionList` only appears when counts > 0, which is clean, but there is no quick-action bar at the top of the dashboard for the 3 most common weekly tasks (`+ บันทึกเงินถวาย`, `+ บันทึกรายจ่าย`, `เปิดรอบนับเงิน`)—forcing treasurers to open the sidebar or navigate into subpages first.
  - `CashflowChart` (`Home/components/CashflowChart.tsx:76, 102`) uses `text-[11px]` for bar labels, which is hard for older users to read on mobile.
- **Visual Problems:**
  - Good hierarchy overall after the `BalanceCard` general/restricted split update, though competing `4px` hard shadows on every nested card can be softened for a cleaner editorial look.
- **Mobile Problems (375px–430px):**
  - `CashflowChart` 6-month paired bars are tight at `375px`, and `text-[11px]` labels crowd when numbers exceed 6 digits.
- **Accessibility Issues:**
  - Privacy eye button in `BalanceCard.tsx` is `min-h-11`, good; chart bars rely on hover/title attributes without keyboard focus or visible compact values on mobile.
- **Functional Defects:**
  - `Home.tsx:81-96` fetches `{ limit: 15 }` offerings and `{ limit: 15 }` expenses to build the top-8 `RecentActivityList` and passes `expenses={expensesData ?? []}` to `AttentionList` (`L288`), which counts `status === "pending"` only within the latest 15 expenses (`Home/components/AttentionList.tsx:31-33`). If an older expense is still pending, it is missed.
- **Recommended Improvements:**
  - Add a prominent Quick Actions strip (`+ บันทึกเงินถวาย`, `+ บันทึกรายจ่าย`, `ห้องนับเงิน`, `กล่องสลิป`) for `canManageFinance` users.
  - Increase `CashflowChart` axis/label font size to `text-xs` (`13px`) and make values readable without hover.

---

### Page 2: `/login` — Sign In (`client/src/pages/Login.tsx`)

- **Priority:** **P2**
- **Current Functionality:**
  - LINE Login OAuth entry screen with trust badges, return-to redirect preservation (`getLoginReturnTo`), and link to `/give`.
- **Usability Problems:**
  - Does not explain clearly to first-time church staff that after signing in with LINE for the first time, their account enters `"รออนุมัติสิทธิ์"` (`pending`) until the Church Admin approves them in `/settings`.
- **Visual Problems:** Clean two-column desktop / single-column mobile card.
- **Mobile Problems:** None at 375px–430px.
- **Accessibility Issues:** Good button sizing (`min-h-12`).
- **Functional Defects:** None.
- **Recommended Improvements:** Add a concise 1-line note explaining the post-login admin approval process for new staff accounts.

---

### Page 3: `/setup` — Church Setup Wizard (`client/src/pages/ChurchSetup.tsx`)

- **Priority:** **P0**
- **Current Functionality:**
  - 6-step onboarding wizard (`SetupSteps.tsx`): Church info, Pastor/Treasurer info, Bank info, Offering categories, Initial funds, and Fiscal year.
- **Usability Problems:**
  - Users revisiting `/setup` see empty/default fields instead of their saved church profile.
  - Step 4 (`offeringCategories`) and Step 6 (`budgetYear`) collect user input that is completely thrown away on save.
- **Visual Problems:**
  - Wizard progress indicator overflows horizontally on narrow mobile screens (`375px`).
- **Mobile Problems:**
  - Step pills in `ChurchSetup.tsx` wrap awkwardly at `375px`.
- **Accessibility Issues:**
  - Missing `aria-current="step"` on the active wizard step.
- **Functional Defects (CRITICAL P0):**
  1. **Overwrites Existing Church Profile (`ChurchSetup.tsx:42-60, 113-128`):** Never queries `trpc.church.getProfile` on mount. If an admin opens `/setup` and clicks finish, `updateProfileMutation` overwrites existing fields with blanks.
  2. **Discards Step 4 & Step 6 Data (`ChurchSetup.tsx:113-128`):** `offeringCategories` (Step 4) and `budgetYear` / `fiscalYearStartMonth` (Step 6) are never sent to `updateProfileMutation`.
  3. **Duplicate Default Funds on Re-run (`ChurchSetup.tsx:130-141`):** Re-running setup unconditionally calls `createAccountMutation.mutateAsync` for every checked fund in `form.funds`, creating duplicate funds or failing halfway.
- **Recommended Improvements:**
  - Pre-populate `form` from `trpc.church.getProfile` and `trpc.finance.accounts` on mount; only create funds that do not already exist; persist `fiscalYearStartMonth` to `church.updateProfile`.

---

### Page 4: `/privacy` — PDPA Privacy Notice (`client/src/pages/Privacy.tsx`)

- **Priority:** **P2**
- **Current Functionality:** Static PDPA privacy policy page for donors and members.
- **Usability Problems:** Contact section at the bottom is generic rather than pulling public church contact info if available.
- **Visual / Mobile / Accessibility / Functional Defects:** Clean, readable, responsive, no functional defects.
- **Recommended Improvements:** Keep clean editorial layout; ensure back navigation works whether opened from `/giving/station` or `/login`.

---

### Page 5: `/404` — Not Found (`client/src/pages/NotFound.tsx`)

- **Priority:** **P3**
- **Current Functionality:** Friendly Thai 404 screen with `"กลับสู่หน้าหลัก"` and `"ย้อนกลับ"` buttons.
- **Problems:** None (`min-h-11` buttons, clean layout).

---

### Page 6: `/give` — Public Giving Landing (`client/src/pages/Give.tsx`)

- **Priority:** **P2**
- **Current Functionality:** Public informational page explaining how to give via QR / Bank Transfer and linking to `/giving/station`.
- **Usability Problems:** Adds an extra click before `/giving/station` if shared directly, though the CTA to `/giving/station` is clear.
- **Visual / Mobile / Accessibility / Functional Defects:** Responsive and accessible.
- **Recommended Improvements:** Ensure bank account copy button and direct CTA to `/giving/station` remain prominent above the fold on mobile (`375px`).

---

### Page 7: `/giving/station` — Digital Giving Station (`client/src/pages/GivingStation.tsx`)

- **Priority:** **P1**
- **Current Functionality:**
  - Public 4-step wizard + Poster Mode (`?poster=1`):
    - Step 1: Select offering category & amount + PromptPay QR / Bank transfer details + 3-step transfer guide + Save QR / Print / Poster actions.
    - Step 2: Donor details (anonymous toggle, name, phone, email, PDPA consent, tax receipt toggle).
    - Step 3: Upload transfer slip image + Gemini AI OCR auto-read (`analyzeSlip`).
    - Step 4: Review & confirm submission (`submitSlip`) + Digital E-Receipt download (`exportNodeAsPng`).
- **Usability Problems:**
  - Earlier friction points (3-step transfer instruction, draft-restored banner, anti-duplicate notice, poster/receipt PNG export in LINE WebView) were fixed in PR #137.
  - Remaining UX issue: When a slip submission fails on mobile (e.g., network timeout or oversized image from iOS camera), the error banner at the top of the card (`ไม่สามารถบันทึกสลิปได้ กรุณาลองใหม่อีกครั้ง`) can scroll out of view on short viewports (`375×667`), and doesn't offer a 1-tap retry button right next to the message.
- **Visual Problems:**
  - Step 1 is tall on mobile because category selection, amount presets, QR code, and bank copy card are all stacked in one step.
- **Mobile Problems:**
  - In LINE in-app browser (LIFF/WebView), the top error alert may sit above the current scroll position when clicking `"ยืนยันและส่งสลิปถวาย"` at the bottom of Step 4.
- **Accessibility Issues:**
  - Error banner should use `role="alert"` and `scrollIntoView({ behavior: "smooth", block: "center" })` when an error occurs so screen readers and mobile users immediately see it.
- **Functional Defects:**
  - Client-side image compression before base64 upload should be verified/hardened so 12MP iOS camera photos don't exceed serverless payload limits (`4.5MB` on Vercel functions).
- **Recommended Improvements:**
  - Auto-scroll error alert into view on Step 3/4 error + ensure client-side canvas downscaling compresses large camera photos to `< 1.2MB` before calling `analyzeSlip` / `submitSlip`.

---

### Page 8: `/giving/inbox` — Slip Verification Inbox (`client/src/pages/GivingInbox.tsx`)

- **Priority:** **P1**
- **Current Functionality:**
  - Queue of donor-submitted slips from LINE webhook & `/giving/station` with status tabs (`pending`, `approved`, `rejected`, `all`), AI OCR badge, slip image preview (via signed URL), member matching (with quick search added in PR #137), fund/category assignment, and approve/reject actions.
- **Usability Problems:**
  - Approving 20–30 Sunday slips requires opening a modal for each slip one by one; there is no `"อนุมัติและเปิดรายการถัดไป"` (Approve & Next) button in the modal.
  - Slip image in the modal cannot be zoomed or rotated when a donor uploads a sideways or small photo.
- **Visual Problems:**
  - Dense badge clusters on each row.
- **Mobile Problems:**
  - Filter tabs and action buttons wrap tightly on `375px`.
- **Accessibility Issues:**
  - Uses Radix `Dialog` (good), but some filter pills are `min-h-9` (`36px`).
- **Functional Defects:**
  - None critical after member search addition; adding `"อนุมัติและตรวจรายการถัดไป"` will cut treasurer processing time in half.
- **Recommended Improvements:**
  - Add zoom/open-original toggle on the slip preview image and an `"อนุมัติและเปิดรายการถัดไป"` action button when multiple pending slips exist.

---

### Page 9: `/transactions` — Unified Transaction Ledger (`client/src/pages/Transactions.tsx`)

- **Priority:** **P0**
- **Current Functionality:**
  - Unified list of offerings (income) and expenses (outcome) with type tabs (`all`, `income`, `expense`), search input, fund filter, status filter, 3 KPI summary cards (`รายรับทั้งหมด`, `รายจ่ายทั้งหมด`, `ยอดสุทธิ`), mobile cards, and desktop table.
- **Usability Problems:**
  - **Cannot search by Donor Name or Payee/Vendor (`Transactions.tsx:75-105, 118-125`):** `TransactionItem` only maps `title`, `category`, `fundName`, and `reference`. Searching for a member's name or a vendor (`"การไฟฟ้า"`) returns 0 results!
  - **No Date Range or Month Filter:** Treasurers and auditors cannot filter `/transactions` by month, quarter, or date range.
  - **Header Action Mismatch (`Transactions.tsx:207-213`):** Shows `"บันทึกการถวาย"` unconditionally—even to `PASTOR`, who is read-only and hits an access-denied screen upon clicking it—and offers no `"บันทึกรายจ่าย"` button for `TREASURER`.
- **Visual Problems:**
  - Summary KPI cards look like global church totals (`"รายรับทั้งหมด"`, `"รายจ่ายทั้งหมด"`, `"ยอดสุทธิ"`), misleading users when they only sum the truncated 50-row slice.
- **Mobile Problems:**
  - Filter bar stacks cleanly, though no indication is shown when results are capped.
- **Accessibility Issues:**
  - Desktop table rows use `<tr onClick>` (`L367-370`) without `tabIndex={0}`, `role="link"`, or keyboard `onKeyDown` (`Enter`/`Space`) support.
- **Functional Defects (CRITICAL P0):**
  1. **Silent 50-Row Truncation & Financially Invalid `"ยอดสุทธิ"` (`Transactions.tsx:49, 61, 129-143`):** Fetches `{ limit: 50 }` offerings and `{ limit: 50 }` expenses with no date filter, then sums those two arbitrary 50-row windows into `"ยอดสุทธิ"`. Because 50 offerings (e.g., 1–2 Sundays) and 50 expenses (e.g., 6 months of bills) cover completely different date ranges, `"ยอดสุทธิ"` is mathematically meaningless and contradicts both `/` (`Home`) and `/reports`.
- **Recommended Improvements:**
  - Add Date Range / Month filter (`เดือนนี้`, `เดือนที่แล้ว`, `ปีนี้`, `ทั้งหมด` / custom start–end date) and raise/paginate the query limit (`limit: 200` + `"แสดงเพิ่ม"` or server date filter).
  - Include `donorName`, `payee`, and `notes` in `TransactionItem` and search matching, and display `donorName` / `payee` as a subtitle in each row.
  - Gate `"บันทึกการถวาย"` and `"บันทึกรายจ่าย"` buttons behind `canManageFinance(user)`.
  - Label summary cards clearly as `"รายรับ (ตามตัวกรอง)"`, `"รายจ่าย (ตามตัวกรอง)"`, `"ดุลสุทธิ (ตามตัวกรอง)"` so they always reconcile with the filtered date range.

---

### Page 10: `/transactions/:id` — Transaction Detail & Edit (`client/src/pages/TransactionDetail.tsx`)

- **Priority:** **P0**
- **Current Functionality:**
  - Displays full details of a single offering (`/transactions/INC-123` or `?type=income`) or expense (`/transactions/EXP-123` or `?type=expense`), evidence image/PDF preview, inline Edit mode, Void (`ยกเลิกรายการ`) with reason, and E-Receipt PNG download/share for offerings.
- **Usability Problems:**
  - **Incomplete Edit Form (`TransactionDetail.tsx:337-410`):** When a treasurer clicks `"แก้ไข"`, they can only edit `amount`, `fundId`, `donorName`/`payee`, and `notes`/`description`. They **cannot** edit the **Date** (`receiptDate`/`expenseDate`), **Category** (`category`), **Payment Method** (`method`), or **Receipt Reference** (`receiptRef`). If a treasurer picked the wrong date or category, their only option is to Void the transaction and re-key it from scratch!
- **Visual Problems:**
  - Top action bar (`แก้ไข`, `ยกเลิกรายการ`, `แชร์ใบเสร็จ`, `ดาวน์โหลดใบเสร็จ`) uses `min-h-9` (`36px`) buttons that crowd on mobile.
- **Mobile Problems:**
  - Action buttons at `L281-319` use `min-h-9` (`36px`), below the `44px` touch target minimum.
- **Accessibility Issues:**
  - Action buttons need `min-h-11` (`44px`).
- **Functional Defects (CRITICAL P0):**
  1. **Expense `details` ("หมายเหตุเพิ่มเติม / วัตถุประสงค์") Never Displayed (`server/db.ts:851-882`, `TransactionDetail.tsx:181`):** `NewExpense.tsx:498` saves additional details into `expenses.details`, and `db.createExpense` persists it (`drizzle/schema.ts:144`). However, `db.getExpenseById` (`server/db.ts:851-882`) omits `details` from `ExpenseRow`, and `TransactionDetail.tsx:181` hardcodes `notes: null` for expenses! Thus, expense notes/details entered by the treasurer vanish from `/transactions/:id`.
  2. **Server `offerings.update` & `expenses.update` Missing Fields (`server/routers.ts:986-1020, 1083-1116`):** Need to support updating `category`, `receiptDate`/`expenseDate`, `method`, and `receiptRef` (with full audit logging).
- **Recommended Improvements:**
  - Return `details` from `db.getExpenseById` and display/edit it in `TransactionDetail.tsx`.
  - Allow editing `category`, `date` (`receiptDate`/`expenseDate`), `method`, and `receiptRef` in `TransactionDetail.tsx` (and corresponding tRPC `offerings.update` / `expenses.update` procedures).
  - Upgrade action buttons to `min-h-11`.

---

### Page 11: `/counting` — Counting Sessions List (`client/src/pages/Counting.tsx`)

- **Priority:** **P1**
- **Current Functionality:**
  - Lists weekly worship offering counting sessions (`open`, `posted`, `voided`) and provides a form to open a new counting session (`countDate`, `serviceLabel`, `notes`).
- **Usability Problems:**
  - Does not show a quick summary of each session's total counted amount (`grandTotal`) directly on the session list card if available, or clearly distinguish sessions that are ready to post vs. just started.
- **Visual Problems:** Clean layout.
- **Mobile Problems:**
  - Close form button (`L129`) is `size-10` (`40px`) and Open Session button (`L98`) is `min-h-10` (`40px`).
- **Accessibility Issues:**
  - Upgrade `min-h-10` / `size-10` buttons to `min-h-11` / `size-11`.
- **Functional Defects:** None.
- **Recommended Improvements:** Upgrade touch targets to `44px` (`min-h-11` / `size-11`).

---

### Page 12: `/counting/:id` — Counting Session Workspace (`client/src/pages/CountingDetail.tsx` & Sub-tabs)

- **Priority:** **P0**
- **Current Functionality:**
  - 6-step weekly counting workflow:
    1. `EnvelopesTab.tsx` (Individual offering envelopes)
    2. `CashCountTab.tsx` (Denomination bill/coin tally: 1000, 500, 100, 50, 20, 10, 5, 2, 1 + loose cash)
    3. `BankRecordsTab.tsx` (QR/Bank transfer records during service)
    4. `DeductionsTab.tsx` (Immediate cash deductions/expenses paid from cash box)
    5. `CarryForwardLedger.tsx` (Cash box carry-forward & bank passbook reconciliation)
    6. `ReconciliationSummaryTab.tsx` (Final reconciliation, counters' names, and `"ลงบัญชีเข้าระบบ"` post action)
- **Usability Problems:**
  1. **No Auto-Match Between Envelope No. and Member (`EnvelopesTab.tsx:128-152`):** Typing an envelope number (e.g., `012`) does not auto-select the member whose `envelopeNo === "012"`, nor does picking a member from the dropdown auto-fill their `envelopeNo`.
  2. **Silent Disabled `"ลงบัญชีเข้าระบบ"` Button (`ReconciliationSummaryTab.tsx:248-261`):** The final Post button is disabled (`!canPost`) until `carryForwardReady` (both actual cash in box AND passbook balance entered in Step 5), `deductionsReady` (all deductions approved), and variance note (if variance != 0) are satisfied. However, when `!canPost`, there is **no checklist telling the treasurer why the button is disabled**! Treasurers get stuck on Step 6 wondering why they cannot post.
  3. **No `"กลับไปแก้ไขขั้นตอนที่..."` Shortcut Links on Step 6:** When a prerequisite is missing on Step 6, the user should be able to click a 1-tap link to jump directly to Step 2 (`นับธนบัตร`), Step 4 (`หักค่าใช้จ่าย`), or Step 5 (`สมุดคุมเงินสด`).
- **Visual Problems:**
  - Step progress buttons (`CountingDetail.tsx:270-310`) are dense on mobile.
- **Mobile Problems:**
  - Delete row buttons (`size-10` in `EnvelopesTab`, `BankRecordsTab`, `DeductionsTab`) and void button (`min-h-10`) are `40px` instead of `44px`.
- **Accessibility Issues:**
  - Disabled Post button has no `aria-describedby` explaining missing requirements.
- **Functional Defects:**
  - **Duplicate Mutation Calls in `CashCountTab.tsx` (`L43-67, 131-143`):** Typing a bill quantity schedules a 350ms debounced `setCashCount.mutate`, and tabbing out (`onBlur`) immediately fires a second `setCashCount.mutate` without canceling the timer, while `CountingDetail.tsx:78-97` invalidates 7 queries on every single `setCashCount.onSuccess`.
- **Recommended Improvements:**
  - Add bidirectional `envelopeNo` ↔ `memberId` auto-matching in `EnvelopesTab.tsx`.
  - Add an explicit **"รายการตรวจสอบก่อนลงบัญชี (Pre-Post Checklist)"** callout above the `"ลงบัญชีเข้าระบบ"` button in `ReconciliationSummaryTab.tsx` showing exactly which items are complete (`✓`) or missing (`!`) with 1-tap jump buttons to the relevant step.
  - Cancel pending debounce timer on `onBlur` in `CashCountTab.tsx` and skip mutation if value hasn't changed from server state.

---

### Page 13: `/offerings` — Offerings Ledger (`client/src/pages/Offerings.tsx`)

- **Priority:** **P0**
- **Current Functionality:**
  - Lists offering records with search input, status filter (`all`, `approved`, `voided`), summary card, mobile cards, and desktop table, plus CSV export.
- **Usability Problems:**
  1. **Donor Name Hidden on Every Row (`Offerings.tsx:184-260`):** Even though `/offerings` is restricted to `TREASURER` and `SUPER_ADMIN` (who have `canViewDonorNames === true`), neither the mobile card nor the desktop table renders `o.donorName`! Every row just says `"ถวายสิบลด"` or `"ถวายทั่วไป"` with no indication of who gave it unless the user clicks into `/transactions/INC-...`.
  2. **Search Box Lies About Searching Funds (`Offerings.tsx:74-83, 190`):** The input placeholder says `"ค้นหาประเภทถวายหรือกองทุน..."`, but `filtered` (`L74-83`) only checks `o.title` and `o.donorName`—it never checks `fundName` or `receiptRef`!
  3. **No Date / Month Filter or Category Filter:** Cannot filter offerings by month/date range or offering category.
- **Visual Problems:**
  - Missing donor name and receipt reference columns make the table look sparse yet uninformative.
- **Mobile Problems:**
  - Good card layout, but missing donor name and date range filter.
- **Accessibility Issues:**
  - Desktop table rows use `<tr onClick>` (`L232-243`) without keyboard `tabIndex={0}` / `onKeyDown`.
- **Functional Defects (CRITICAL P0):**
  - **Hardcoded `limit: 50` Truncates Table & CSV Export (`Offerings.tsx:45, 95-125`):** Queries `trpc.offerings.list.useQuery({ limit: 50 })`. Both the on-screen total and the `"ส่งออก CSV"` button only export at most 50 rows!
- **Recommended Improvements:**
  - Display `o.donorName` (and `o.receiptRef`) on both mobile cards and desktop table rows.
  - Fix search to match `title`, `donorName`, `fundName`, and `receiptRef`.
  - Add Date Range / Month filter + Category filter and increase query limit (`limit: 200` + load more / date range filter) so totals and CSV export are complete.
  - Make desktop table rows keyboard-accessible.

---

### Page 14: `/offerings/new` — Record New Offering (`client/src/pages/NewOffering.tsx`)

- **Priority:** **P0**
- **Current Functionality:**
  - Form to record an offering (`category`, `amount`, `fundId`, `method`, `receiptDate`, `serviceType`, `donorName`, `envelopeNumber`, `notes`, and slip/evidence attachment).
- **Usability Problems:**
  - **Cannot Link Offering to a Member Record (`NewOffering.tsx:111-125, 323-344`):** The form fetches `trpc.members.list`, puts member names into an HTML `<datalist>`, and stores only a free-text `donorName` string. It never records `donorMemberId`! Furthermore, typing an `envelopeNumber` (`L350-362`) does not auto-fill the member with that `envelopeNo`, and selecting a member does not auto-fill their `envelopeNo`.
- **Visual Problems:** Clean 2-column layout with live summary preview.
- **Mobile Problems:** Works well at `375px`, sticky/clear submit buttons.
- **Accessibility Issues:** `<datalist>` works poorly on iOS Safari; a searchable member selector or auto-matched badge (`"เชื่อมโยงสมาชิก: ... (ซอง #...)"`) is much clearer for older users.
- **Functional Defects (CRITICAL P0):**
  - **`trpc.offerings.create` Does Not Accept `donorMemberId` (`server/routers.ts:956-970`, `NewOffering.tsx:161-175`):** Even though `offerings.donorMemberId` exists in `drizzle/schema.ts:104` and `db.createOffering` (`server/db.ts`) supports `donorMemberId`, `server/routers.ts` omits `donorMemberId: z.number().int().positive().nullable().optional()` from `offerings.create` input! Consequently, **zero manually recorded offerings are ever linked to a member's profile (`/members/:id`)**!
- **Recommended Improvements:**
  - Add `donorMemberId` to `offerings.create` (and `offerings.update`) in `server/routers.ts` and `server/db.ts`.
  - In `NewOffering.tsx`, link the selected member (`donorMemberId`), show a clear `"เชื่อมโยงกับสมาชิก: ชื่อ (รหัสซอง #...)"` badge, and auto-match when typing either the member's name/phone or `envelopeNumber`.

---

### Page 15: `/expenses` — Expenses Ledger (`client/src/pages/Expenses.tsx`)

- **Priority:** **P0**
- **Current Functionality:**
  - Lists expense records with search input, status tabs (`all`, `approved`, `pending`, `voided`), summary card, quick Approve (`อนุมัติ`) / Void (`ยกเลิก`) actions, mobile cards, desktop table, and CSV export.
- **Usability Problems:**
  - **Search Box Lies About Searching Funds (`Expenses.tsx:86-98, 250`):** Placeholder says `"ค้นหารายการจ่ายหรือกองทุน..."`, but `filtered` only checks `e.description` and `e.payee`—never `fundName` or `category`!
  - **No Date / Month Filter:** Treasurers cannot filter expenses by month or date range.
- **Visual Problems:** Clean status badges.
- **Mobile Problems:**
  - Quick action buttons (`อนุมัติ` / `ยกเลิก` at `L295-320` and `L385-410`) use `min-h-9` (`36px`), which is too small for reliable thumb tapping on mobile and risks accidental taps next to row navigation.
- **Accessibility Issues:**
  - Desktop table rows use `<tr onClick>` without keyboard `tabIndex={0}` / `onKeyDown`; action buttons are `< 44px` (`min-h-9`).
- **Functional Defects (CRITICAL P0):**
  - **Hardcoded `limit: 50` Truncates Table & CSV Export (`Expenses.tsx:66, 110-140`):** Queries `trpc.expenses.list.useQuery({ limit: 50 })`, truncating both on-screen totals and CSV exports after 50 expenses.
- **Recommended Improvements:**
  - Fix search to match `description`, `payee`, `fundName`, `category`, and `receiptRef`.
  - Add Date Range / Month filter and increase query limit (`limit: 200` + date filter).
  - Increase `อนุมัติ` / `ยกเลิก` buttons to `min-h-11` (`44px`) and make desktop rows keyboard-accessible.

---

### Page 16: `/expenses/new` — Record New Expense (`client/src/pages/NewExpense.tsx`)

- **Priority:** **P1**
- **Current Functionality:**
  - Form to record a church expense (`category`, `amount`, `fundId`, `method`, `expenseDate`, `description`, `payee`, `receiptRef`, `details`, and receipt/invoice upload with AI OCR `analyzeExpenseReceipt`).
- **Usability Problems:**
  - Shows the selected fund's current balance, and warns if `amount > selectedFund.balance`, which is good.
  - However, the `details` field (`"หมายเหตุเพิ่มเติม / วัตถุประสงค์"`, `L498`) was previously invisible on `TransactionDetail.tsx` after saving (fixed in P0 item on `TransactionDetail.tsx`).
- **Visual / Mobile / Accessibility:**
  - Clean layout, good touch targets (`min-h-11`), unsaved-changes guard active.
- **Functional Defects:**
  - None in `NewExpense.tsx` itself once `getExpenseById` returns `details`.
- **Recommended Improvements:**
  - Ensure AI receipt OCR errors scroll into view on mobile and keep the fund balance warning prominent.

---

### Page 17: `/withdrawals/new` — Request Fund Withdrawal (`client/src/pages/NewWithdrawal.tsx`)

- **Priority:** **P1**
- **Current Functionality:**
  - Form for deacons/leaders/treasurers to submit a withdrawal request (`title`, `amount`, `fundId`, `category`, `urgency`, `payeeName`, `payeeBank`, `payeeAccount`, `description`, supporting document upload) with confirmation modal.
- **Usability Problems:**
  - Confirmation modal (`L221-298`) is a custom `<div className="fixed inset-0">` that does not close on `Escape` and lacks focus trapping.
- **Visual / Mobile Problems:**
  - Good mobile form layout; confirmation modal buttons are `min-h-11`.
- **Accessibility Issues:**
  - Convert custom confirmation modal (`L221`) to Radix `Dialog` (or add `role="dialog"`, `aria-modal="true"`, Escape key handler).
- **Functional Defects:** None.

---

### Page 18: `/funds` — Church Funds Overview (`client/src/pages/Funds.tsx`)

- **Priority:** **P1**
- **Current Functionality:**
  - Displays total balance across all funds, proportional `FundBreakdown` bar, divided list of funds with balance and share percentage, and `"สร้างกองทุนใหม่"` modal.
- **Usability Problems:**
  - Does not visually separate **General Operating Funds** (`general`, `tithe`) from **Restricted / Designated Funds** (`mission`, `building`, `welfare`, `special`) in the header summary (unlike `Home.tsx`, which now shows `เงินกองทุนทั่วไป` vs `เงินกองทุนเฉพาะกิจ`).
- **Visual / Mobile Problems:**
  - Clean list layout (`min-h-16` rows).
- **Accessibility Issues:**
  - `"สร้างกองทุนใหม่"` modal (`L216-302`) uses a raw `<div className="fixed inset-0">` without `role="dialog"`, `aria-modal="true"`, or `Escape` key handler, and its submit button isn't disabled during `createAccountMutation.isPending`.
- **Functional Defects:**
  - Submit button (`L291-297`) does not set `disabled={createAccountMutation.isPending}`, allowing accidental double-clicks when creating a fund.
- **Recommended Improvements:**
  - Show General vs. Restricted subtotals in the `/funds` summary header to match `Home.tsx`.
  - Disable `"สร้างกองทุน"` button while `createAccountMutation.isPending` and add `role="dialog"` / `Escape` handling to the modal.

---

### Page 19: `/funds/:id` — Fund Statement & Ledger (`client/src/pages/FundDetail.tsx`)

- **Priority:** **P0**
- **Current Functionality:**
  - Shows a single fund's current balance, total income, total expense, transaction history table/cards, CSV statement export (`ดาวน์โหลด Statement (CSV)`), and a `"โอนเงินระหว่างกองทุน"` button.
- **Usability Problems:**
  - **Dead `"โอนเงินระหว่างกองทุน"` Button (`FundDetail.tsx:170-180`):** Clicking `"โอนเงินระหว่างกองทุน"` only pops an info toast: `"ฟังก์ชันโอนเงินจะเปิดใช้เมื่อมี workflow จากระบบรองรับ"`. In a financial system, a primary action button that does nothing erodes user trust.
- **Visual / Mobile Problems:**
  - Good card/table responsiveness.
- **Accessibility Issues:**
  - Desktop table rows use `<tr onClick>` (`L288-292`) without keyboard navigation.
- **Functional Defects (CRITICAL P0):**
  - **Fund Ledger & Statement CSV Truncated by Global 100-Row Limit (`FundDetail.tsx:37, 41, 58-83`):** Instead of querying transactions filtered by `fundId` on the server, `FundDetail.tsx` fetches the church's global latest 100 offerings (`offerings.list({ limit: 100 })`) and global latest 100 expenses (`expenses.list({ limit: 100 })`), then filters by `o.fundId === fund.id` in browser memory!
  - **Impact:** For a fund like `"กองทุนอาคาร"` or `"กองทุนสวัสดิการ"` whose donations happened 2 months ago (more than 100 general offerings ago), `FundDetail.tsx` shows `รายรับสะสม: ฿0.00` and an empty transaction list even though `fund.balance` is `฿150,000.00`! The exported Fund Statement CSV also misses those rows and fails to reconcile with `fund.balance`.
- **Recommended Improvements:**
  - Add optional `fundId` filter and higher limit (`limit: 500`) to `trpc.offerings.list` and `trpc.expenses.list` (and `db.listOfferings` / `db.listExpenses`) so `FundDetail.tsx` fetches all transactions belonging to `fund.id` directly from PostgreSQL.
  - Replace the non-functional `"โอนเงินระหว่างกองทุน"` toast button with a guided action or remove the dead trigger until inter-fund transfer is enabled (or provide a clear modal explaining how to record fund reallocation via approved adjustment).

---

### Page 20: `/budgets` — Annual Budgets (`client/src/pages/Budgets.tsx`)

- **Priority:** **P1**
- **Current Functionality:**
  - Lists budgets by fiscal year with utilization progress bars (`spentAmount / allocatedAmount`), status badges (`normal`, `near_limit`, `over_budget`), and inline create form (`name`, `fiscalYear`, `allocatedAmount`, `category`, `fundId`, `notes`).
- **Usability Problems:**
  - Does not show the selected fund name on each budget card if linked to a specific fund.
- **Visual / Mobile Problems:**
  - Close button on the create form (`L137`) is `size-10` (`40px`).
- **Accessibility Issues:**
  - Progress bars should have `role="progressbar"` and `aria-valuenow`.
- **Functional Defects:** None (`server/budgets.integration.test.ts` verifies dynamic `spentAmount` calculation from approved expenses matching `budget.category` / `budget.fundId` within `fiscalYear`).
- **Recommended Improvements:** Upgrade close button to `size-11` and add `role="progressbar"` to budget bars.

---

### Page 21: `/budgets/:id` — Budget Detail & Edit (`client/src/pages/BudgetDetail.tsx`)

- **Priority:** **P1**
- **Current Functionality:**
  - Shows budget utilization metrics (`allocatedAmount`, `spentAmount`, `remainingAmount`, `utilizationPct`) and allows managers (`canManageBudgets`) to edit or archive the budget.
- **Usability Problems:**
  - Shows aggregate `spentAmount`, but does not show a link or list of the underlying expenses that consumed this budget (`ดูรายการจ่ายในหมวดงบประมาณนี้`).
- **Visual / Mobile / Accessibility:** Clean layout, good `min-h-11` buttons.
- **Functional Defects:** None.
- **Recommended Improvements:** Add a quick link to `/expenses` (or inline list of matching expenses for this budget's category/year) so treasurers and pastors can inspect what was spent.

---

### Page 22: `/ministries` — Church Ministries (`client/src/pages/Ministries.tsx`)

- **Priority:** **P2**
- **Current Functionality:** Lists church ministries/departments (`name`, `leaderName`, `meetingSchedule`, `status`) and inline creation form.
- **Usability / Mobile / Accessibility Issues:**
  - Close form button (`L108`) is `size-10` (`40px`); upgrade to `size-11` (`44px`).
- **Functional Defects:** None.

---

### Page 23: `/ministries/:id` — Ministry Detail & Edit (`client/src/pages/MinistryDetail.tsx`)

- **Priority:** **P2**
- **Current Functionality:** View/edit ministry details and toggle `active`/`inactive` status.
- **Usability / Mobile / Accessibility / Functional Defects:** Clean, uses `seededIdRef` to prevent refetch overwrites, `min-h-11` buttons. No defects.

---

### Page 24: `/members` — Church Members Directory (`client/src/pages/Members.tsx`)

- **Priority:** **P0**
- **Current Functionality:**
  - Lists church members with search input (`name`, `phone`, `email`) and inline creation form (`fullName`, `phone`, `email`, `address`, `notes`).
- **Usability & Functional Defects (CRITICAL P0):**
  1. **Cannot Set or View `envelopeNo` (รหัสซองถวาย) (`Members.tsx:123-159`, `server/routers.ts:819-835`):**
     - The database schema (`drizzle/schema.ts:247`) has `members.envelopeNo`, and `GivingInbox.tsx`, `NewOffering.tsx`, and `EnvelopesTab.tsx` all display or rely on `member.envelopeNo`.
     - However, `Members.tsx` has **no input field for `envelopeNo`**, does **not display `envelopeNo`** on member cards, cannot search by `envelopeNo`, and `server/routers.ts` (`members.create`) doesn't even accept `envelopeNo`!
     - As a result, church staff have **zero way in the entire UI** to assign an envelope number to a member!
- **Mobile / Accessibility Issues:**
  - Close button on the create form (`L129`) is `size-10` (`40px`); upgrade to `size-11`.
- **Recommended Improvements:**
  - Add `envelopeNo` to `trpc.members.create` and `trpc.members.update` in `server/routers.ts` and `server/db.ts`.
  - Add an `"รหัสซองถวาย (เช่น 001, A-12)"` input field in `Members.tsx` and `MemberDetail.tsx`, display the envelope badge on member cards, and allow searching `/members` by `envelopeNo`.

---

### Page 25: `/members/:id` — Member Detail & Giving History (`client/src/pages/MemberDetail.tsx`)

- **Priority:** **P0**
- **Current Functionality:**
  - Displays/edits a member's profile (`fullName`, `phone`, `email`, `address`, `notes`, `status`) and shows their linked offering history (`offerings` table where `donorMemberId = member.id`) + Annual Tax Donation Certificate print/export (`ใบอนุโมทนาบัตร / หนังสือรับรองการบริจาคประจำปี`).
- **Usability & Functional Defects (CRITICAL P0):**
  1. **Cannot View or Edit `envelopeNo` (`MemberDetail.tsx:185-221`):** Just like `Members.tsx`, `MemberDetail.tsx` omits `envelopeNo` from both the edit form and read-only view.
  2. **Giving History Empty for Manually Recorded Offerings:** Because `NewOffering.tsx` did not submit `donorMemberId`, any offering recorded via `/offerings/new` was missing from the member's giving history and annual tax receipt on `/members/:id`!
- **Recommended Improvements:**
  - Add `envelopeNo` to `MemberDetail.tsx` (both edit form and read-only view) and display it on the Annual Donation Summary header.
  - Ensure offerings created/edited with `donorMemberId` in `NewOffering.tsx` and `TransactionDetail.tsx` appear in `MemberDetail.tsx`.

---

### Page 26: `/reports` — Financial Reports & Statements (`client/src/pages/Reports.tsx`)

- **Priority:** **P1**
- **Current Functionality:**
  - Generates monthly and annual financial reports (`trpc.reports.monthlySummary`, `trpc.reports.annualSummary`), category breakdowns (income by category, expense by category), fund balances table, CSV export, and print-ready official report layout (`window.print()`) with pastor/treasurer signature lines.
- **Usability Problems:**
  - Does not explain why `/reports` totals (which accurately aggregate all approved database records for the selected month/year on the server) differed from `/transactions` totals (which previously only summed 50 rows).
  - Month/Year selectors and export buttons could be grouped more clearly for non-technical treasurers.
- **Visual / Mobile Problems:**
  - On `375px` mobile screens, the multi-column monthly breakdown table requires horizontal scrolling; adding a subtle scroll hint or compact mobile summary improves readability.
- **Accessibility Issues:** Good button sizing (`min-h-11`).
- **Functional Defects:**
  - Server-side `reports.monthlySummary` and `reports.annualSummary` (`server/db.ts` + `server/reports.integration.test.ts`) are mathematically accurate and filter out `voided`/`pending` records properly. Once `/transactions`, `/offerings`, `/expenses`, and `/funds/:id` fix their 50/100-row client truncation, all pages will reconcile 100% with `/reports`.

---

### Page 27: `/approvals` — Withdrawal Approvals & Dual-Signatory Workflow (`client/src/pages/Approvals.tsx`)

- **Priority:** **P1**
- **Current Functionality:**
  - Lists fund withdrawal requests (`pending`, `approved`, `paid`, `rejected`, `cancelled`) with multi-signer progress (`SignatureProgress.tsx`: 2-of-N bank signers for requests >= threshold), approve/reject actions, and treasurer `"บันทึกการโอนจ่ายเงิน"` (Mark Paid with payment slip & reference).
- **Usability Problems:**
  - Clear workflow overall, though the Mark Paid modal (`L431-530`) is a custom `<div className="fixed inset-0">` without `Escape` key support.
- **Visual / Mobile / Accessibility Issues:**
  - Convert custom modal overlay (`L431`) to support `role="dialog"`, `aria-modal="true"`, and `Escape` key closing.
- **Functional Defects:** None (`server/withdrawals.workflow.test.ts` covers the approval & payment state machine).

---

### Page 28: `/notifications` — In-App Notifications (`client/src/pages/Notifications.tsx`)

- **Priority:** **P2**
- **Current Functionality:** Lists user notifications with unread dot indicator, click-to-mark-read + navigate, and `"อ่านแล้วทั้งหมด"` button.
- **Usability / Visual / Mobile / Accessibility / Functional Defects:** Clean, `min-h-11` action button, `.sr-only` read status for screen readers. No defects.

---

### Page 29: `/settings` — Church Settings, Users, Signers, Line OA & Audit Log (`client/src/pages/Settings.tsx`)

- **Priority:** **P1**
- **Current Functionality:**
  - 5-tab administration center:
    - Tab 1 (`profile`): Church profile, pastor/treasurer names, bank account & PromptPay QR.
    - Tab 2 (`users`): User approval (`pending` → `active` / `suspended`), primary & secondary role assignment (`SUPER_ADMIN`, `PASTOR`, `TREASURER`, `DEACON`, `COUNTER`, `MEMBER`).
    - Tab 3 (`signers`): Authorized bank signers (`BankSignersSection.tsx`) and dual-signature threshold.
    - Tab 4 (`line`): LINE Official Account webhook & slip inbox diagnostics.
    - Tab 5 (`audit`): Security & financial audit log (`auditLogs`).
- **Usability & Functional Defects:**
  1. **Missing Profile Fields in Tab 1 (`Settings.tsx:462-545`):** `drizzle/schema.ts` and `trpc.church.updateProfile` support `website`, `assistantPastorName`, and `fiscalYearStartMonth`, and `Profile.tsx:280` reads `churchProfile.assistantPastorName`, yet Tab 1 in `Settings.tsx` has no inputs to view or edit those 3 fields!
  2. **`COUNTER` Role Missing from Official Role Reference Cards in Tab 2 (`Settings.tsx:283-354`):** The role reference cards list `SUPER_ADMIN`, `TREASURER`, `PASTOR`, `DEACON`, and `MEMBER`, completely omitting `COUNTER` (`กรรมการนับเงิน`).
  3. **Audit Log Filter Bug in Tab 5 (`Settings.tsx:1185-1220`):** The filter dropdown option `"เปลี่ยนบทบาทผู้ใช้"` filters for `action === "update_user_role"`, whereas `server/routers.ts` logs role changes as `"AUTH_SET_CHURCH_ROLE"`, `"AUTH_APPROVE_USER"`, and `"AUTH_SUSPEND_USER"`—so selecting that filter returns 0 rows!
- **Mobile & Accessibility Problems:**
  1. **Horizontal Overflow on Mobile (`375px`) in Tab 2 (Users Table, `L669-877`) and Tab 5 (Audit Log Table, `L1230-1350`):** Both tables render 4–5 wide columns with no mobile card view (`md:hidden`), forcing awkward horizontal scrolling on phones.
  2. **Tiny Touch Targets in User Management Table (`L790-865`):** Role/status action buttons use `py-1.5 px-3 text-xs` (~28px height), far below the `44px` minimum.
- **Recommended Improvements:**
  - Add `assistantPastorName`, `website`, and `fiscalYearStartMonth` inputs to Tab 1.
  - Add `COUNTER` to the role reference cards in Tab 2.
  - Add responsive mobile card views (`md:hidden`) for both the Users list (Tab 2) and Audit Log list (Tab 5), with `min-h-11` action buttons.
  - Fix the Audit Log action filter in Tab 5 so it matches actual recorded action codes (`AUTH_SET_CHURCH_ROLE`, `AUTH_APPROVE_USER`, `OFFERING_CREATE`, `EXPENSE_CREATE`, etc.).

---

### Page 30: `/profile` — User Profile & Digital Church ID (`client/src/pages/Profile.tsx`)

- **Priority:** **P1**
- **Current Functionality:**
  - Displays logged-in user's profile, role badge, quick workspace shortcut (`/counting` or `/settings`), Official Church Governance Roster (`ROSTER_TEMPLATES`), Edit Profile modal, Digital Church Member Card modal, and Logout button.
- **Usability & Functional Defects:**
  1. **Unauthorized Background Query (`Profile.tsx:196-199, 308-309`):** Unconditionally calls `trpc.withdrawals.list.useQuery({ myOnly: false })` on mount for every user to compute `pendingApprovalsCount`—which is **never even rendered in JSX**! For `MEMBER` or `COUNTER` roles, `{ myOnly: false }` is unauthorized or unnecessary network overhead.
  2. **Fake QR Code Icon on Digital ID Card (`Profile.tsx:624-629`):** The `"บัตรประจำตัวคริสตจักร"` modal renders a static Lucide `<QrCode className="w-24 h-24" />` decorative icon instead of a real scannable QR code or a genuine verification badge, which looks broken if someone tries to scan it.
- **Accessibility Issues:**
  - Preset avatar buttons (`L723-738`) are `w-7 h-7` (`28×28px`), below the `44px` touch target minimum.
  - Both modals (`showIdCardModal` at `L576` and `showEditProfileModal` at `L668`) use raw `<div className="fixed inset-0">` without `role="dialog"`, `aria-modal="true"`, or `Escape` key close.
- **Recommended Improvements:**
  - Remove the unused `pendingApprovalsQuery` from `Profile.tsx`.
  - Replace the fake `<QrCode>` icon in the Digital ID Card modal with a clean, honest Official Member Verification Badge showing Member ID, Role, Church Name, and Active Status (or a real SVG QR encoding the member verification ID).
  - Enlarge preset avatar selector buttons to `size-11` (`44×44px`) and add `role="dialog"` / `Escape` key support to both modals.

---

### Page 31: `/updates` — Church News, Events & Announcements (`client/src/pages/Updates.tsx`)

- **Priority:** **P2**
- **Current Functionality:**
  - Member-facing feed (`MemberFeed.tsx`) of church announcements, events, and service schedules, plus `AdminManager.tsx` tab for `SUPER_ADMIN` and `PASTOR` to create/edit/publish updates.
- **Usability / Mobile / Accessibility / Functional Defects:**
  - Clean layout, `min-h-11` tab buttons, clear role separation (`server/updates.access.test.ts` passes).

---

## 4. Phase 1 — Real User Journey Testing (4 Personas × 9 Workflows)

### Personas Simulated

1. **Church Treasurer (`TREASURER`):** Responsible for recording weekly offerings, verifying LINE/station slips, recording expenses with receipts, reconciling weekly counting sessions, and exporting monthly reports.
2. **Finance Administrator (`SUPER_ADMIN`):** Responsible for initial church setup, managing funds/budgets, approving user roles, configuring bank signers, and reviewing audit logs.
3. **Pastor (`PASTOR`):** Responsible for reviewing overall financial health, fund balances, monthly/annual reports, approving high-value withdrawals, and managing church updates/ministries (read-only on raw offering/expense creation).
4. **Read-Only Auditor (Simulated via `PASTOR` read-only ledger/report access & `DEACON` scoped access):** Responsible for verifying that transaction history, fund statements, and monthly/annual reports reconcile and that every expense/void has supporting evidence and audit trails.

---

### Workflow A: Login and Dashboard Access

- **Expected Behavior:**
  - User signs in via LINE, lands on `/` with a clear role-appropriate dashboard. Finance roles immediately see accurate total balance (split by General vs. Restricted funds), monthly income/expense, items requiring attention, and quick actions for weekly operations.
- **Actual Behavior:**
  - Login and role routing work reliably (`Home.tsx`). General vs. Restricted balance split (`fundPoolSplit`) is displayed clearly on `BalanceCard`.
  - **Problems Discovered:**
    1. `Home.tsx:86, 288` passes only the latest 15 expenses (`limit: 15`) to `AttentionList`, so if there are pending expenses older than the 15 most recent expenses, the `"รายจ่ายรออนุมัติ"` badge undercounts them.
    2. No top-level Quick Actions bar on `/` for `TREASURER`/`SUPER_ADMIN` to jump directly to `+ บันทึกเงินถวาย`, `+ บันทึกรายจ่าย`, or `ห้องนับเงิน` in 1 tap.
- **Severity:** **P2**
- **Recommended Solution:** Add a 1-tap Quick Actions bar on `/` for finance staff and ensure pending expense counts are accurate.

---

### Workflow B: Record Church Offerings (Manual, Slip Inbox & Counting Session)

- **Steps to Reproduce:**
  1. As `TREASURER`, go to `/members` or `/members/:id` to assign an envelope number (`envelopeNo`) to a member.
  2. Go to `/offerings/new`, select `"ถวายสิบลด"`, type the member's name or envelope number, enter `฿2,000`, and save.
  3. Go to `/members/:id` for that member and check their giving history.
  4. Go to `/counting/:id`, enter envelopes, cash bills, bank transfers, and go to Step 6 (`สรุปยอดและลงบัญชี`).
- **Expected Behavior:**
  - Treasurer can assign `envelopeNo` to a member, auto-match the member by name or `envelopeNo` in `/offerings/new` and `/counting/:id`, save the offering linked via `donorMemberId`, see it on `/members/:id`, and clearly see any remaining requirements before posting a counting session.
- **Actual Behavior:**
  - **Problems Discovered:**
    1. **P0 Defect:** Neither `/members` (`Members.tsx`) nor `/members/:id` (`MemberDetail.tsx`) has a field for `envelopeNo`!
    2. **P0 Defect:** `/offerings/new` (`NewOffering.tsx:161-175`) and `trpc.offerings.create` (`server/routers.ts:956-970`) do **not** pass or accept `donorMemberId`! Manually recorded offerings never appear on `/members/:id`.
    3. **P1 Defect:** In `/counting/:id` Step 6 (`ReconciliationSummaryTab.tsx:248-261`), the `"ลงบัญชีเข้าระบบ"` button is disabled until Step 5 (`CarryForwardLedger`) actual cash & passbook balance are saved, without showing a checklist explaining _why_ it is disabled.
- **Severity:** **P0**
- **Recommended Solution:** Add `envelopeNo` to Member create/edit UI & API; add `donorMemberId` to `offerings.create` & `NewOffering.tsx` with bidirectional `envelopeNo` ↔ member matching; add a visible Pre-Post Checklist on `ReconciliationSummaryTab.tsx`.

---

### Workflow C: Record Expenses with Supporting Evidence

- **Steps to Reproduce:**
  1. As `TREASURER`, navigate to `/expenses/new`.
  2. Upload a receipt photo/PDF, fill in `category`, `amount`, `fundId`, `payee`, and enter additional purpose notes in `"หมายเหตุเพิ่มเติม / วัตถุประสงค์"` (`details`).
  3. Submit the expense, then click the created expense in `/expenses` to open `/transactions/EXP-...`.
- **Expected Behavior:**
  - Expense is saved with its receipt attachment and all entered fields—including `"หมายเหตุเพิ่มเติม / วัตถุประสงค์"` (`details`)—are visible on `/transactions/EXP-...` for the Pastor and Auditor to review.
- **Actual Behavior:**
  - **Problems Discovered:**
    1. **P0 Defect:** `db.getExpenseById` (`server/db.ts:851-882`) omits `details` from `ExpenseRow`, and `TransactionDetail.tsx:181` hardcodes `notes: null` for expenses. The treasurer's explanation in `"หมายเหตุเพิ่มเติม / วัตถุประสงค์"` completely disappears on `/transactions/EXP-...`!
- **Severity:** **P0**
- **Recommended Solution:** Include `details` in `db.getExpenseById` and `expenses.update`, and display/edit it in `TransactionDetail.tsx`.

---

### Workflow D: Search and Review Historical Transactions

- **Steps to Reproduce:**
  1. As `TREASURER` or `PASTOR`, open `/transactions`, `/offerings`, and `/expenses`.
  2. In `/transactions`, type a donor's name (`"สมชาย"`) or vendor name (`"การไฟฟ้า"`) into the search box.
  3. In `/offerings`, look at the list of offerings to see who donated each item, or type a fund name (`"กองทุนพันธกิจ"`) into the search box (`"ค้นหาประเภทถวายหรือกองทุน..."`).
  4. Try to filter `/transactions`, `/offerings`, or `/expenses` to view transactions from 2 months ago.
- **Expected Behavior:**
  - Searching by donor name, payee, fund name, or reference returns matching rows; `/offerings` displays the donor name on each row for authorized users; date filters allow reviewing any historical month.
- **Actual Behavior:**
  - **Problems Discovered:**
    1. **P0 Defect:** `/transactions` (`Transactions.tsx:75-105, 118-125`) does not include `donorName` or `payee` in `TransactionItem`, so searching by donor or vendor name returns 0 results.
    2. **P0 Defect:** `/offerings` (`Offerings.tsx:184-260`) never displays `donorName` on the list rows, and its search filter (`L74-83`) ignores `fundName` despite the placeholder saying `"ค้นหาประเภทถวายหรือกองทุน..."`.
    3. **P0 Defect:** `/expenses` (`Expenses.tsx:86-98`) search filter also ignores `fundName` despite its placeholder saying `"ค้นหารายการจ่ายหรือกองทุน..."`.
    4. **P0 Defect:** `/transactions`, `/offerings`, and `/expenses` all hardcode `limit: 50` with no date range filter, making historical transactions beyond the latest 50 rows unreachable!
- **Severity:** **P0**
- **Recommended Solution:** Add Date Range / Month filters and higher limits (`limit: 200` + server date filtering) to `/transactions`, `/offerings`, and `/expenses`; display `donorName` on `/offerings` and `/transactions`; include `donorName`, `payee`, `fundName`, and `receiptRef` in search matching.

---

### Workflow E: Edit or Correct an Existing Transaction

- **Steps to Reproduce:**
  1. As `TREASURER`, open `/transactions/INC-...` or `/transactions/EXP-...` and click `"แก้ไข"`.
  2. Attempt to fix a typo in the transaction **Date** (`receiptDate` / `expenseDate`), **Category** (`category`), **Payment Method** (`method`), or **Receipt Reference** (`receiptRef`).
- **Expected Behavior:**
  - Treasurer can correct the date, category, method, reference, amount, fund, donor/payee, and notes, and the system records an audit log entry with the before/after values.
- **Actual Behavior:**
  - **Problems Discovered:**
    1. **P0 Defect:** `TransactionDetail.tsx:337-410` only allows editing `amount`, `fundId`, `donorName`/`payee`, and `notes`/`description`. Date, category, payment method, and receipt reference are locked, forcing treasurers to void and recreate transactions for simple date/category mistakes.
- **Severity:** **P0**
- **Recommended Solution:** Expand edit mode in `TransactionDetail.tsx` and `trpc.offerings.update` / `trpc.expenses.update` to support `category`, `receiptDate`/`expenseDate`, `method`, and `receiptRef` with audit logging.

---

### Workflow F: Review Monthly Financial Summaries & Fund Statements

- **Steps to Reproduce:**
  1. Compare the net total (`ยอดสุทธิ`) on `/transactions` against `/reports` and `/`.
  2. Open `/funds/:id` for a specific fund and compare `รายรับสะสม - รายจ่ายสะสม` against `ยอดคงเหลือปัจจุบัน` (`fund.balance`).
- **Expected Behavior:**
  - All financial summaries and fund statements reconcile with actual transaction records.
- **Actual Behavior:**
  - **Problems Discovered:**
    1. **P0 Defect:** `/transactions` (`Transactions.tsx:129-143`) sums the latest 50 offerings and latest 50 expenses (which span different time periods) and labels the difference `"ยอดสุทธิ"`.
    2. **P0 Defect:** `/funds/:id` (`FundDetail.tsx:37, 41, 58-83`) fetches only the global latest 100 offerings and 100 expenses across the entire church and filters by `fund.id` in memory, missing older transactions for that fund.
- **Severity:** **P0**
- **Recommended Solution:** Filter `offerings.list` and `expenses.list` by `fundId` (and date range) on the server in `db.ts` / `routers.ts`, and scope `/transactions` KPI cards to the active date/month filter.

---

### Workflow G: Generate and Export Reports

- **Steps to Reproduce:**
  1. Export CSV from `/reports`, `/funds/:id`, `/offerings`, and `/expenses`, and test Print (`พิมพ์รายงาน`) on `/reports` and `/members/:id`.
- **Expected Behavior:**
  - Exported CSVs and printed reports include all transactions for the selected period/fund and reconcile with the ledger balances.
- **Actual Behavior:**
  - `/reports` print and CSV export work well because they use server-side monthly/annual aggregations.
  - **Problems Discovered:**
    1. **P0 Defect:** CSV exports on `/funds/:id`, `/offerings`, and `/expenses` export only the truncated 50/100 client-side rows.
- **Severity:** **P0**
- **Recommended Solution:** Server-side `fundId` and date-range filtering + raised query limits ensure exported CSV statements match ledger totals.

---

### Workflow H: Review User Permissions & Role Guards

- **Steps to Reproduce:**
  1. Sign in as `PASTOR` (read-only on finance entry) and navigate to `/transactions`. Click `"บันทึกการถวาย"` in the top-right header.
  2. Sign in as `SUPER_ADMIN` and open `/settings` → Tab 2 (`จัดการผู้ใช้งานและสิทธิ์`) and Tab 5 (`Audit Log`).
  3. Sign in as `MEMBER` or `COUNTER` and open `/profile`.
- **Expected Behavior:**
  - Read-only users do not see write CTAs that lead to dead-end access-denied screens; `SUPER_ADMIN` sees all 6 church roles in the reference guide and can filter Audit Logs accurately; `Profile.tsx` only runs queries authorized for the current user.
- **Actual Behavior:**
  - **Problems Discovered:**
    1. **P1 Defect:** `Transactions.tsx:207-213` renders `"บันทึกการถวาย"` for `PASTOR` without checking `canManageFinance(user)`.
    2. **P1 Defect:** `Settings.tsx:283-354` omits `COUNTER` from the role guide cards, and Tab 5 (`L1185-1220`) filters for `"update_user_role"` instead of `"AUTH_SET_CHURCH_ROLE"`.
    3. **P1 Defect:** `Profile.tsx:196-199` calls `trpc.withdrawals.list.useQuery({ myOnly: false })` for all roles even though the result is unused.
- **Severity:** **P1**
- **Recommended Solution:** Gate write CTAs with `canManageFinance(user)`, add `COUNTER` to `Settings.tsx`, fix the Audit Log filter values, and remove the unused `withdrawals.list` query from `Profile.tsx`.

---

### Workflow I: Check Mobile Usability (375px, 390px, 430px, 768px)

- **Steps to Reproduce:**
  1. Inspect all 28 pages at `375px`, `390px`, `430px` (mobile) and `768px` (tablet).
- **Expected Behavior:**
  - No horizontal overflow; all interactive controls meet the `>= 44×44px` (`min-h-11`) touch target standard; tables adapt to mobile cards; modals trap focus and scroll cleanly inside `max-h-[90dvh]`; dark mode is accessible on mobile.
- **Actual Behavior:**
  - **Problems Discovered:**
    1. **Horizontal Overflow on `375px`:** `Settings.tsx` Tab 2 (Users table) and Tab 5 (Audit Log table) have no mobile card layout (`md:hidden`).
    2. **Touch Targets `< 44px`:** Found in `AppLayout.tsx` (bell `h-10 w-10`), `Expenses.tsx` (`min-h-9`), `TransactionDetail.tsx` (`min-h-9`), `Counting.tsx` (`min-h-10`, `size-10`), `CountingDetail` tabs (`size-10`, `min-h-10`), `Budgets.tsx` (`size-10`), `Ministries.tsx` (`size-10`), `Members.tsx` (`size-10`), `Settings.tsx` (`py-1.5`), and `Profile.tsx` (`w-7 h-7` avatar presets).
    3. **Missing Mobile Theme Toggle:** `AppNavigation.tsx` mobile drawer lacks the light/dark mode switch.
- **Severity:** **P1**
- **Recommended Solution:** Add mobile card views to `Settings.tsx` Tab 2 & Tab 5, upgrade all `< 44px` controls to `min-h-11` / `size-11`, and add the theme toggle to the mobile navigation drawer.
