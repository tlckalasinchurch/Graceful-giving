# Grace Giving 2.0 — Complete Application Redesign Inventory

**Design Direction:** Gen Z × Gen Alpha × Bold Fintech × Playful Editorial × Controlled Neo-Brutalism  
**Core Brand Palette (`client/src/index.css`):**

- **Primary Emerald Green (`--brand`)**: `#087F5B`
- **Accent Acid Lime (`--accent-lime`)**: `#B8F34A`
- **Ground Warm White (`--ground`)**: `#F8F9F4`
- **Secondary Surface Warm Stone (`--paper-2`)**: `#F1F3EC`
- **Surface White (`--surface`)**: `#FFFFFF`
- **Foreground Deep Ink (`--ink`)**: `#171A18`
- **Secondary Accent Coral (`--coral`)**: `#FF6B7D`
- **Semantic Danger (`--danger`)**: `#B3261E`

---

## 1. Design System & Token Primitives (`client/src/index.css`)

| Utility / Token      | Definition                                                                                                             | Purpose                                                                                             |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `.bento-card`        | `border-2 border-[var(--ink)] bg-surface rounded-[20px] shadow-[4px_4px_0_var(--ink)]` + tactile hover/active          | Primary Hero cards, KPI summary tiles, primary interactive cards                                    |
| `.bento-card-static` | `border-[1.5px] border-[var(--ink)] bg-surface rounded-[18px] shadow-[2px_2px_0_var(--ink)]`                           | Secondary containers, ledger tables, filter bars, form sections                                     |
| `.btn-primary`       | `border-2 border-[var(--ink)] bg-brand text-white font-extrabold shadow-[3px_3px_0_var(--ink)]` + press animation      | Primary call-to-action buttons (fixes legacy unreadable `bg-brand text-black` across all 34 routes) |
| `.btn-secondary`     | `border-[1.5px] border-[var(--ink)] bg-surface text-ink font-bold shadow-[2px_2px_0_var(--ink)]` + hover `bg-paper-2`  | Secondary / cancel / navigation action buttons                                                      |
| `.neo-input`         | `border-[1.5px] border-[var(--ink)] bg-surface rounded-[14px]` + Acid Lime focus ring (`0 0 0 3px var(--accent-lime)`) | Text inputs, number inputs, date inputs, and textareas                                              |
| `.neo-modal`         | `border-2 border-[var(--ink)] bg-surface rounded-[22px] shadow-[6px_6px_0_var(--ink)]`                                 | All 10 custom modals, Radix Dialogs, and SweetAlert2 (`Swal`) dialogs                               |
| `.money`             | `font-variant-numeric: tabular-nums; font-feature-settings: "tnum" 1`                                                  | Financial amounts, ledger totals, denomination counters                                             |

---

## 2. Shared Components & Application Shell Redesigned

| Component                   | File Path                                                                           | Key Visual & UX Upgrades                                                                                                                                                                                                      |
| --------------------------- | ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Common UI Primitives        | `client/src/components/common/CommonUI.tsx`                                         | Redesigned `Card` (`.bento-card` / `.bento-card-static`), `StatCard`, `PageHeader`, `SectionHeader`, `Chip` (Acid Lime active pill with `2px` ink border, passing `CommonUI.test.tsx`), `Badge`, `EmptyState`, `LoadingState` |
| App Shell & Guards          | `client/src/App.tsx`                                                                | Redesigned `RouteLoading` spinner card and `RoleGuard` restricted-access screen with `.bento-card` and `.btn-primary`                                                                                                         |
| App Layout                  | `client/src/components/layout/AppLayout.tsx`                                        | Neo-brutalist desktop sidebar (`border-r-2 border-[var(--ink)]`), Acid Lime active route indicator (`shadow-[3px_3px_0_var(--ink)]`), mobile bottom navigation bar, and tactile header controls                               |
| Mobile Navigation Drawer    | `client/src/components/layout/AppNavigation.tsx`                                    | Upgraded mobile drawer header, user profile card, notification counter badge, and active menu pills                                                                                                                           |
| Member Station Frame        | `client/src/components/layout/StationOnlyFrame.tsx`                                 | Upgraded header bar (`border-b-2 border-[var(--ink)]`), brand badge (`bg-accent`), and bottom tab bar (`shadow-[4px_4px_0_var(--ink)]`)                                                                                       |
| Role Badges                 | `shared/roles.ts`                                                                   | Replaced legacy `text-sky-800` on `PASTOR` with semantic `text-tile-sky-ink`                                                                                                                                                  |
| Receipt Preview Modal       | `client/src/components/finance/ReceiptPreviewModal.tsx`                             | Upgraded modal container to `.neo-modal`, receipt paper preview border, and print/download buttons (`.btn-primary` / `.btn-secondary`)                                                                                        |
| Printable Voucher Modal     | `client/src/components/finance/VoucherModal.tsx`                                    | Upgraded modal container to `.neo-modal` and print/close actions while preserving `.voucher-printable` print rules                                                                                                            |
| Budget Progress & Form      | `client/src/components/finance/budget.tsx`                                          | Neo-brutalist progress bar (`border-[1.5px] border-[var(--ink)]`) with Emerald/Lime/Danger fill and `.neo-input` form controls                                                                                                |
| Split Offering Editor       | `client/src/components/giving/SplitEditor.tsx`                                      | Tactile category cards (`border-2 border-[var(--ink)] bg-accent` when selected) and tabular amount inputs                                                                                                                     |
| Give Chooser                | `client/src/components/giving/GiveChooser.tsx`                                      | Neo-brutalist mode switcher cards with `2px` ink borders and hard offset shadows                                                                                                                                              |
| PromptPay QR Card           | `client/src/components/ui/promptpay-qr-card.tsx`                                    | Framed QR code card with `border-2 border-[var(--ink)] shadow-[4px_4px_0_var(--ink)]` and Acid Lime amount pill                                                                                                               |
| Station Giving Kit          | `client/src/components/ui/station-giving-kit.tsx`                                   | Replaced legacy `border-amber-200`, `text-amber-700`, `text-orange-500` with brand tokens and neo-brutalist cards                                                                                                             |
| Radix Dialog & NativeSelect | `client/src/components/ui/dialog.tsx`, `client/src/components/ui/native-select.tsx` | Upgraded `DialogContent` to `border-2 border-[var(--ink)] shadow-[6px_6px_0_var(--ink)]` and `NativeSelect` to `1.5px` ink border with Acid Lime focus ring                                                                   |
| SweetAlert2 Utility         | `client/src/lib/sweetalert.ts`                                                      | Upgraded `Swal.fire` modal to `.neo-modal`, fixed `bg-tile-sky0/15` typo, and upgraded buttons to `.btn-primary` / `.btn-secondary`                                                                                           |
| Baht Text Utility           | `client/src/lib/bahtText.ts`                                                        | Restored corrupted UTF-8 Thai text (`ศูนย์บาทถ้วน`, `หนึ่ง`, `ยี่`, `เอ็ด`, `สตางค์`)                                                                                                                                         |

---

## 3. All 34 Routes Redesigned (Module-by-Module)

### Module A — Dashboard (1 Route)

1. **`/` (`client/src/pages/Home.tsx` + 9 sub-components in `client/src/pages/Home/components/`)**:
   - Asymmetric bento grid combining `HeroSection` (oversized tabular net balance, Emerald/Danger income/expense pills), `TaskQueue` (pending approvals, counting rounds, slip inbox badges), `PrimaryActions`, `CashFlowChart` (`#087F5B` / `#B3261E` / `#B8F34A`), `CategoryBreakdown`, `FundPositionList`, `RecentActivityCard`, `SummaryMetricGrid`, and `SystemStatusStrip`.

### Module B — Financial Management & Counting (11 Routes)

2. **`/transactions` (`client/src/pages/Transactions.tsx`)**:
   - Bento summary header, `.neo-input` search/date filters, neo-brutalist desktop table & mobile card ledger, receipt/voucher modal triggers, and void transaction confirmation.
3. **`/transactions/:id` (`client/src/pages/TransactionDetail.tsx`)**:
   - Fixed invisible white-on-white `ดูใบสำคัญจ่าย` button (`bg-surface text-white` -> `.btn-primary`), upgraded audit trail & slip preview cards to `.bento-card` / `.bento-card-static`.
4. **`/offerings` (`client/src/pages/Offerings.tsx`)**:
   - Bento KPI summary cards, category/method filter chips, donor privacy masking badge, and receipt generation actions.
5. **`/offerings/new` (`client/src/pages/NewOffering.tsx`)**:
   - High-clarity offering entry form with `.bento-card-static` sections, tactile payment method pills, and `.neo-input` fields.
6. **`/expenses` (`client/src/pages/Expenses.tsx`)**:
   - Expense ledger with category breakdown, receipt image viewer, and voucher print triggers.
7. **`/expenses/new` (`client/src/pages/NewExpense.tsx`)**:
   - Expense recording form with fund balance preview, `.neo-input` fields, and receipt upload dropzone.
8. **`/withdrawals/new` (`client/src/pages/NewWithdrawal.tsx`)**:
   - Withdrawal request form with real-time fund balance check, urgency toggle, and bank signer workflow notice.
9. **`/counting` (`client/src/pages/Counting.tsx`)**:
   - Worship service counting session list, status badges (`กำลังนับ`, `รอยืนยัน`, `สมบูรณ์`), and new session creation modal.
10. **`/counting/:id` (`client/src/pages/CountingDetail.tsx` + 7 components in `client/src/pages/CountingDetail/components/`)**:
    - Redesigned `TabBar` (`bg-accent` active tab with `2px` ink border), `SummaryTab`, `CashTab` (Thai baht denomination grid), `EnvelopesTab`, `TransfersTab`, `CarryForwardLedger` (passbook-style wallet reconciliation), and `ConfirmTab` (dual-counter verification).

### Module D — LINE Integration & Public Giving (5 Routes)

11. **`/give` (`client/src/pages/Give.tsx`)**:
    - Public QR giving entry page with neo-brutalist `HandHeart` badge (`bg-accent border-2 border-[var(--ink)] shadow-[3px_3px_0_var(--ink)]`), LINE Login CTA (`shadow-[4px_4px_0_var(--ink)]`), and numbered step guide (`.bento-card-static`).
12. **`/giving/station` (`client/src/pages/GivingStation.tsx`)**:
    - Self-service giving station (`PlainGivingStation`) with category split selector, PromptPay QR generation, slip upload & OCR status, personal giving history, and staff station management tabs (`รายการสลิป`, `สร้างลิงก์`, `โปสเตอร์ QR`, `ตั้งค่า`).
13. **`/giving/inbox` & `/giving-inbox` (`client/src/pages/GivingInbox.tsx`)**:
    - LINE Slip Inbox & OCR verification queue. Replaced all legacy `bg-brand text-black`, `bg-tile-sky0/15`, `text-sky-200`, and `text-stone-400` classes; upgraded both custom modals (Manual Slip Entry & Slip Detail/Approve) to `.neo-modal` with `.btn-primary` / `.btn-secondary`.

### Module E — Planning, Controls & Analytics (6 Routes)

14. **`/funds` (`client/src/pages/Funds.tsx`)**:
    - Fund cards with balance/target progress bars, fund type badges, and `.neo-modal` Create Fund dialog.
15. **`/funds/:id` (`client/src/pages/FundDetail.tsx`)**:
    - Fund detail view with 3-tile KPI strip (income, expense, net balance), Edit Fund `.neo-modal`, and transaction history ledger.
16. **`/budgets` (`client/src/pages/Budgets.tsx`)**:
    - Fiscal year budget overview, utilization bars, and Create Budget modal.
17. **`/budgets/:id` (`client/src/pages/BudgetDetail.tsx`)**:
    - Category budget detail, monthly spending breakdown, and Edit/Delete budget controls.
18. **`/approvals` (`client/src/pages/Approvals.tsx` + `client/src/pages/Approvals/SignatureProgress.tsx`)**:
    - Multi-signer withdrawal approval queue. Fixed critical UX bug where "ไม่อนุมัติ" and "ลงนามอนุมัติ" previously shared identical `bg-brand text-black` styling; upgraded both modals (Approval Decision & Create Withdrawal Request) to `.neo-modal`.
19. **`/reports` (`client/src/pages/Reports.tsx`)**:
    - Financial reports & analytics (`Recharts` bar/pie charts styled with `#087F5B`, `#B8F34A`, `#FF6B7D`, `#B3261E`), monthly income/expense matrix, and CSV/Print export actions.

### Module F — Ministries, Members, Content, Admin & System (11 Routes)

20. **`/ministries` (`client/src/pages/Ministries.tsx`)**:
    - Ministry directory cards with member counts, budget summaries, and Create Ministry `.neo-modal`.
21. **`/ministries/:id` (`client/src/pages/MinistryDetail.tsx`)**:
    - Ministry detail header, member roster management, and ministry financial ledger.
22. **`/members` (`client/src/pages/Members.tsx`)**:
    - Church member directory, role/status badges, search/filter bar, and Add Member `.neo-modal`.
23. **`/members/:id` (`client/src/pages/MemberDetail.tsx`)**:
    - Member profile card, confidential offering history, and annual tax/giving summary certificate print view.
24. **`/updates` (`client/src/pages/Updates.tsx` + 5 components in `client/src/pages/Updates/components/`)**:
    - Church news, announcements, and events feed (`MemberFeed`) + admin content manager (`AdminManager`, `AdminNewsDialog`, `AdminEventDialog`, `updatesUtils`). Replaced all legacy `amber`, `rose`, `purple`, `blue`, `orange` badges with palette tokens.
25. **`/notifications` (`client/src/pages/Notifications.tsx`)**:
    - Notification center with unread indicators (`bg-accent`), type badges, and mark-all-read action.
26. **`/settings` (`client/src/pages/Settings.tsx` + `client/src/pages/Settings/BankSignersSection.tsx`)**:
    - 5-tab church administration hub (`ข้อมูลคริสตจักร`, `บทบาทและสิทธิ์`, `หมวดหมู่บัญชี`, `บัญชีธนาคาร`, `ประวัติการใช้งาน`) with Acid Lime active tab pill, `.neo-input` forms, user role management table, bank signers section, and audit log viewer.
27. **`/profile` (`client/src/pages/Profile.tsx`)**:
    - Personal profile hero card (`.bento-card`), role workspace shortcuts, official church governance roster, Digital Church Member ID Card modal (`.neo-modal`), and Edit Profile modal (`.neo-modal`).
28. **`/setup` (`client/src/pages/ChurchSetup.tsx` + `client/src/pages/ChurchSetup/components/SetupSteps.tsx`)**:
    - 8-step church onboarding wizard with neo-brutalist progress bar (`bg-accent`), `.bento-card` step container, tactile category selectors, and sticky bottom navigation bar.
29. **`/login` (`client/src/pages/Login.tsx`)** & **`/register` (Redirect)**:
    - Split-screen editorial login page with `2 โครินธ์ 9:7` verse panel (`bg-paper-2 border-r-2 border-[var(--ink)]`), Acid Lime brand lockup, and tactile LINE Login button.
30. **`/privacy` (`client/src/pages/Privacy.tsx`)**:
    - PDPA compliance & donor privacy policy page with `.bento-card` sections and navigation header.
31. **`/404` (`client/src/pages/NotFound.tsx`)**:
    - Custom 404 page with `.bento-card`, Acid Lime compass badge, and `.btn-primary` / `.btn-secondary` recovery links.
32. **`/ui-showcase` (`client/src/pages/ComponentShowcase.tsx`)**:
    - Developer component showcase updated with Grace Giving 2.0 ground/brand tokens and neo-brutalist station kit preview frames.
