# Frontend Completion Tracker

Date: 2026-11-08. Branch: `claude/tender-mayer-8j18m1`. No commit made.

## Checkpoint 1

### Completed

| ID  | Change                                                                                | Files                                                  | Regression test                                         |
| --- | ------------------------------------------------------------------------------------- | ------------------------------------------------------ | ------------------------------------------------------- |
| D1  | Disable the create-fund submit button while the request runs. Ignore a second submit. | `client/src/pages/Funds.tsx`                           | `client/src/pages/Funds.createGuard.test.tsx` (2 tests) |
| D2  | Add `onError` toast (Thai title + `friendlyErrorMessage`) to 8 mutations.             | `client/src/pages/Updates/components/AdminManager.tsx` | `AdminManager.errors.test.tsx` (8 tests)                |
| D3  | Show `ErrorState` with a retry button when `updates.adminList` fails.                 | same                                                   | `AdminManager.errors.test.tsx` (2 tests)                |

Proof that the tests detect the defects: with the original source restored, 10 of the 12 new tests fail. With the fix, 12 of 12 pass. (The 2 that pass on the original source test normal behavior.)

No backend, schema, authentication, permission, or financial calculation file changed.

### In progress

- Workflow matrix verification with a signed-in session (blocked, see below).

### Next (small batches, in order)

1. Add an error branch to `VoucherModal` and `AppLayout` queries (T1).
2. Add render tests for pages with no test: Expenses, NewExpense, NewOffering, Transactions, Budgets, Members, Reports.
3. Audit each money form for double-submit and error feedback (NewExpense, NewOffering, NewWithdrawal, Counting).
4. Consider a default `MutationCache` `onError` toast only if step 3 finds more missing handlers (T3). This changes shared behavior, so it needs approval.
5. Accessibility pass with a signed-in session (keyboard order, focus return from dialogs).

### Blockers

- No database and no LINE credentials in this environment. The app cannot create a session. Signed-in pages and workflows cannot be driven in a browser here. Needs: a staging `DATABASE_URL`, LINE Login keys, and a test account for each role. See `docs/PHASE_6B_2_STAGING_READINESS.md`.

### Verification results

| Check                  | Result                                             |
| ---------------------- | -------------------------------------------------- |
| `pnpm check`           | Pass                                               |
| `pnpm test`            | 987 pass, 106 skip, 0 fail                         |
| `pnpm build`           | Pass                                               |
| Browser, public routes | Pass for 8 URLs at 1280 px and 390 px (see report) |

## Checkpoint 2 (UX consistency and accessibility)

### Completed

| ID  | Priority | Change                                                                                                                                                                                                                      | Files                                                                                                                                                  | Regression test                                                           |
| --- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------- |
| U1  | P0       | One money format. Every amount shows two decimals, a fixed locale, and the unit "บาท". Before: bare `toLocaleString()` dropped the second decimal in slip approval dialogs (`1234.5`), and "THB", "บาท" and "฿" were mixed. | `GivingInbox`, `GivingStation`, `TransactionDetail`, `NewWithdrawal`, `givingStationFlow.ts`, `station-giving-kit`, `promptpay-qr-card`, `GiveChooser` | Existing GivingStation and station kit tests, updated to the new text     |
| U2  | P1       | Withdrawal success dialog: closing it any way now clears the form. Before: Escape left the data in the form, so a second submit sent a duplicate request.                                                                   | `NewWithdrawal.tsx`                                                                                                                                    | `NewWithdrawal.success.test.tsx` (2)                                      |
| U3  | P2       | Six hand-built modals now use the shared `Dialog`: focus trap, focus return, scroll lock, Escape. Removed 4 manual Escape listeners and 3 custom close buttons.                                                             | `Funds`, `NewWithdrawal`, `Approvals` (reject, cancel), `Profile` (ID card, edit)                                                                      | `Funds.createGuard.test.tsx` (4). Others: see below                       |
| U4  | P2       | 36 form labels were not linked to their fields. 31 are now linked. 5 group labels stay, on a named list.                                                                                                                    | `NewExpense`, `NewWithdrawal`, `GivingInbox`, `Profile`, `Settings`, `SetupSteps`, `Funds`                                                             | `labels.association.test.tsx` (2). Fails if a new unlinked label appears. |
| U5  | P1       | Merged the duplicate route `/giving-inbox` into a redirect to `/giving/inbox`. Saved links still work.                                                                                                                      | `App.tsx`                                                                                                                                              | None (see below)                                                          |
| U6  | P2       | Added an accessible name to the two reason fields in the Approvals dialogs.                                                                                                                                                 | `Approvals.tsx`                                                                                                                                        | None (see below)                                                          |

### Browser evidence (production build, API responses intercepted in Playwright only; no product mock data)

1280x800 and 390x844. Funds dialog: focus stays inside while tabbing 12 times, label click focuses the field, Escape closes it, focus returns to the opening button, no horizontal overflow. Withdrawal: submit shows the success dialog, Escape closes it, form is empty. Profile: ID card and edit dialogs open and close with Escape, label links work. Screenshots were read after the open animation ended.

### Not verified

- Approvals reject and cancel dialogs: type check only. No render test, no browser run (the page needs many queries and a pending request).
- Redirect `/giving-inbox`: type check only.
- GivingInbox slip approval dialog text: type check and source review only.
- Every page that needs real data. The browser runs used intercepted responses for 5 procedures.

### Open items for a product decision (no change made)

- Profile ID card shows a QR icon, not a real code, and the fallback ID `GL-00001`. This can mislead people.
- Profile offers 4 stock photos hotlinked from Unsplash. They send each viewer's address to a third party and fail offline.
- The mobile tab bar and the home shortcut tiles both link to Reports.
- 5 group labels still use a `<label>` for a button group (`NewExpense`, `NewOffering` x2, `GivingInbox`, `Settings`, `updatesUtils`). `fieldset` and `legend` would be correct.

### Verification results

`pnpm check`: pass. `pnpm test`: 89 files pass, 5 skip. 993 tests pass, 106 skip, 0 fail. `pnpm build`: pass. `prettier --check client/src`: pass. `git diff --check`: pass.

## Checkpoint 3 (modules)

Note on "Orders": a search of the schema, shared code, routes and client found no orders feature (the matches were CSS and sorting words). The first finance item in the sidebar is "รายการ" (`/transactions`), which in Thai means the list of items or orders. "Orders" was read as **Transactions**: the list and the detail page (`/transactions/offering-N`, `/transactions/expense-N`) both have browser evidence. **Confirmed by the product owner: "Orders" means Transactions.** Module 1 is complete.

### Product decisions

| Decision          | Result                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Profile ID card   | The dialog is now "ข้อมูลโปรไฟล์". It shows the avatar, name, role, church, and email. Removed: the drawn QR icon, the invented ID (`GL-00001` when the user had none), the fixed "ยืนยันแล้ว (Active)" line, and the print button. The opening button uses a neutral icon. Guard test: `productDecisions.test.tsx`.                                                                                                                     |
| Avatars           | The 4 Unsplash hotlinks are replaced by 4 local SVG files in `client/public/avatars/`. Initials stay the fallback. Browser check: all 4 load. CSP allows `'self'` images.                                                                                                                                                                                                                                                                |
| Reports shortcuts | Checked who sees what. Every role that opens Reports also sees the balance card on Home, and gets the Expenses tab on mobile, not the Reports tab. The Home tile was the duplicate, so it is removed. The balance card button now reads "ดูรายงาน" (was "ดูรายละเอียด"). The sidebar and the "เพิ่มเติม" menu still list Reports. Note: the mobile Reports tab in `AppLayout.tsx` is never shown to any role (dead code, left in place). |

### Modules

| Module                                                    | Status       | Changes                                                                                                                                                                                                                                                                                                                       | Tests                                                                              |
| --------------------------------------------------------- | ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Transactions                                              | Done         | Shared paging hook, shared paging bar, shared CSV save. List error shows the real reason. Table scroller fixed (page scrolled sideways at 768–1100 px).                                                                                                                                                                       | `ledgers.test.tsx`                                                                 |
| Expenses                                                  | Done         | Same as Transactions. An export with 0 rows now shows a notice and downloads nothing (before: empty file and a success message).                                                                                                                                                                                              | `ledgers.test.tsx`                                                                 |
| Offerings                                                 | Done         | Same as Expenses.                                                                                                                                                                                                                                                                                                             | `ledgers.test.tsx`                                                                 |
| Counting                                                  | Done         | The "open round" rule was repeated in 4 places (tab count, list filter, card actions, completed count). It is now one function, `isOpenSession` (`pages/countingStatus.ts`). The search field had no accessible name and its clear button was an unlabeled icon. Both are named, and the clear button has a 44 px touch area. | `countingStatus.test.ts`, `Counting.list.test.tsx`                                 |
| Budgets                                                   | Done         | Cards, the Home budget section, and the Home fund breakdown rounded amounts to whole baht, while the detail page and the Funds page show two decimals. A budget of 12,345.67 read "฿ 12,346" on the card. All now show two decimals.                                                                                          | `moneyFormat.guard.test.tsx` (render test and a guard against whole-baht rounding) |
| Members                                                   | Done (small) | List error shows the real reason.                                                                                                                                                                                                                                                                                             | Source guard `errorMessages.guard.test.ts`                                         |
| Reports                                                   | Done (small) | CSV save uses the shared function. Table scroller fixed.                                                                                                                                                                                                                                                                      | `csvDownload.test.ts`, `tableScroller.guard.test.ts`                               |
| Settings                                                  | Done (small) | The role select now has a name per person. Raw backend text in 3 toasts replaced. Table scrollers fixed. Bank signer toasts fixed.                                                                                                                                                                                            | Guards                                                                             |
| Notifications, MemberDetail, Approvals (found on the way) | Done         | Error state shows the real reason instead of a fixed "database failed" text.                                                                                                                                                                                                                                                  | Guards                                                                             |

### Cross-cutting changes

- `lib/csvDownload.ts`: new `saveCsvFile`. Replaces 4 copies of the link, blob, and clean-up code.
- `hooks/useCursorPagination.ts`: new. Replaces 3 copies of paging state. The reset on filter change is derived, so the list is never fetched with the old cursor and the new filter.
- `components/common/CommonUI.tsx`: new `LedgerPagination`. Replaces 3 copies of the paging controls.
- `lib/errors.ts`: `friendlyErrorMessage` now keeps a Thai reason written by the server (for example an approval rule) before falling back to the generic text for the code. An ended session always gets the sign-in text. Before this, converting pages would have hidden business reasons. Tests: `lib/errors.test.ts` (6).
- 13 toasts that showed raw `err.message` now use `friendlyErrorMessage`. A guard test fails if a page adds one again, or hard-codes the database message.
- Search fields: 3 more were found with a placeholder and no name (GivingInbox, two in Settings) and named. `inputNames.guard.test.ts` fails if a new input has a placeholder and no name. A scan of icon-only buttons found no real case (16 hits were buttons with visible text).
- Search fields: 3 more were found with a placeholder and no name (GivingInbox, two in Settings) and named. `inputNames.guard.test.ts` fails if a new input has a placeholder and no name. A scan of icon-only buttons found no real case (16 hits were buttons with visible text).
- Group labels: 4 of the 5 remaining are done. NewExpense and NewOffering (x2) use `fieldset` and `legend`. The two GivingInbox labels use `aria-labelledby` because a button shares the row. The Settings role label is a `span` with a per-person `aria-label`. `updatesUtils` `Field` wraps its control inside the label, so it is already correct and stays on the exemption list with a note.
- `PromptPay` QR `title` now uses the shared money format.

### Browser evidence (production build, 1280, 768 and 390 px, API responses intercepted in Playwright only)

Ledgers: same paging bar, next button enables previous, empty export shows the notice, a forced FORBIDDEN error shows "บัญชีนี้ไม่มีสิทธิ์เข้าถึงข้อมูลส่วนนี้" with a retry button. Home: no Reports tile, one "ดูรายงาน" button. Profile: no QR, no `GL-`, 4 local avatars load. Page overflow at 768 and 1024 px on Expenses: found (scrollX 135 and 212) and fixed (sw 760 and 1016, scrollX 0). Same check on Transactions after the fix: pass.

### Route smoke (production build, 1280, 768 and 390 px)

25 routes x 3 widths = 75 page loads, signed in as SUPER_ADMIN with only the session and church profile answered (every other query returns null, so list pages show their loading or empty state). Result: 0 page errors, 0 console errors, 0 sideways scrolling, every page has a visible title. `/giving-inbox` redirects to `/giving/inbox` (verified).

### Data-backed browser check (production build, 1280, 768 and 390 px)

The Playwright script answers the API calls with realistic records (2 members, 2 budget plans, 2 counting sessions, a report with income and expense rows, 1 pending withdrawal request, 2 users). The records exist only in the test script. The product has no mock data.

60 checks, 0 failed (rerun with the Budgets, Counting, and Home changes: 78 checks, 0 failed):

- **Members:** both members listed. The add form labels are linked.
- **Budgets:** both plans shown.
- **Counting:** the open session shows "นับต่อ" and the posted one shows "ดูสรุป".
- **Reports:** income and expense totals shown (50,000.00 and 4,200.00).
- **Approvals:** the request is listed. The reject dialog opens, its reason field has a name, and Escape closes it. The cancel dialog does the same.
- **Settings:** the church name field is linked to its label. The role select is named per person ("บทบาทในระบบของ สมหญิง ศรัทธา").
- **Every page above:** no sideways scrolling and a clean console at all three widths.

Reading the Approvals reject dialog screenshot at 390 px: title, reason field, and both buttons are visible and fit the screen.

### Second data-backed check: Settings tabs and Transaction detail

39 checks, 0 failed, at 1280, 768 and 390 px, same method (records only in the test script):

- **Settings:** the "หมวดหมู่บัญชี", "บัญชีธนาคาร" and "ประวัติการใช้งาน" tabs render with content, do not scroll sideways, and the bank fields are linked to their labels ("ธนาคาร", "เลขที่บัญชี", "ชื่อบัญชี"). The audit entry shows.
- **Transaction detail** (`/transactions/offering-5`, `/transactions/expense-3`): the record shows with the amount in the shared format (500.00 and 1,234.50). No sideways scroll.
- **Console:** clean on every page.

My first run of the bank check failed because I used the wrong label text ("ชื่อธนาคาร"). The label in the code is "ธนาคาร". The fields were linked all along.

All eight Settings tabs and both halves of "Orders" (Transactions list and detail) now have browser evidence with records.

### Not verified

- Real server data and real writes. The browser checks used fixed records, so they do not prove the server returns those shapes or that saves succeed. Blocker B1: staging database, LINE keys, one account per role.
- Settings is still 1700+ lines in one component. Not split (no defect found that needs it).

### Verification results

`pnpm check`: pass. `pnpm test`: 99 files pass, 5 skip. 1037 tests pass, 106 skip, 0 fail. `pnpm build`: pass. `prettier --check client/src`: pass. `git diff --check`: pass.

## Checkpoint 4 (real server and real database)

This sandbox has a Postgres 16 server. I started it, migrated the real schema (`pnpm db:migrate`, 23 tables), created the first user with the app's own `upsertUser`, signed a session cookie with the app's own `signSession`, and ran the production build against it. No API call was intercepted. The database is a scratch one inside the sandbox. It holds no production data. LINE sign-in itself was not exercised.

### Real workflows, checked against the database

| Workflow                                       | Result in the database                                                                                                                       |
| ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| First sign-in, empty database                  | Redirected to the 8-step setup wizard. Finishing it saved the church profile (`setupCompleted = true`), 5 default funds, and an audit entry. |
| Record an offering (1,500.75, tithe, transfer) | One row, exact amount. The fund balance became 1,500.75. Audit entry written.                                                                |
| Record expenses                                | 3 rows totalling 741.00. The fund balance was 759.75 (1,500.75 − 741.00). The totals agree.                                                  |
| Budgets, Counting, Members                     | A plan of 50,000.50, a counting round, and a member were created and stored.                                                                 |
| Withdrawal request, then cancel with a reason  | Request stored, then `cancelled` with the reason text.                                                                                       |
| Settings: save the church motto                | New motto stored.                                                                                                                            |
| Reports and CSV export                         | The report page showed 1,500.75. The CSV file has a byte-order mark and the right header line.                                               |
| Transactions list and detail                   | The donor and the amount 1,500.75 show.                                                                                                      |
| Console and HTTP                               | No console errors and no 5xx responses in the final runs.                                                                                    |

### Defects found only because the server was real

1. **P0, duplicate expense (NewExpense).** After saving, pressing Escape closed the success dialog but left the form filled. A second submit saved the same expense again: 2 rows, and the fund balance fell by 641.00, not 320.50. The same cause I fixed on the withdrawal page. Fixed: closing the dialog any way clears the form. Test: `NewExpense.success.test.tsx`.
2. **P0, two clicks in the same instant created duplicates in 4 forms.** Before the fix: offering (2 rows of 77.00), withdrawal (2), expense (2), fund (3 funds with one name). The cause: a button that is disabled during the request is disabled one render too late, and the mutation `isPending` flag also updates late. **This corrects an earlier claim:** my first fix for the create-fund button (checkpoint 1, D1) relied on `isPending` and did not close this case. Fixed with `useSubmitLock`, a ref lock taken before the request and released when it ends. Used in 7 create paths: offering, expense, withdrawal, fund, budget, member, counting round. After the fix, the same double click created exactly 1 row in each of the 6 forms I repeated (offering, withdrawal, expense, fund, member, counting). The budget form is covered by the source guard and the hook test, not by a repeat on the real server. Tests: `useSubmitLock.test.ts`, `submitLock.guard.test.ts`, and a same-instant case in the Funds, NewExpense and NewWithdrawal tests.
3. **Accessibility, two success dialogs without a title.** NewOffering and NewExpense used a plain `<h3>`, so Radix warned that `DialogContent` has no `DialogTitle` and screen readers could not name the dialog. Both now use `DialogTitle` and `DialogDescription`. A test checks the NewExpense dialog.

Limit of this check: a person's double tap is slower than two clicks in the same instant, so the practical risk was lower than the test shows. The lock makes the protection exact.

### Database integration suites (previously skipped, now run against the real Postgres)

`budgets.integration` 2, `counting.workflow` 28, `finance.dateIntegrity.integration` 50, `reports.integration` 17, `withdrawals.workflow` 9, `tenant.isolation` 14: **120 tests, all pass.** The unit suites that assume no database fail if run with a database present. That is by design (`pnpm ci` blanks the variables), so those were not counted.

### Roles, approvals and server permissions (same real server and database)

Seven accounts were created with the app's own functions: the owner (admin), PASTOR, TREASURER, DEACON, COUNTER, MEMBER, and a PASTOR who is also the required bank signer (the treasurer was added as a second signer).

| Check                                            | Result                                                                                                                                                                                                                                                           |
| ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 14 routes x 7 accounts in a real browser         | 98 checks, 0 differ from the access map (`routeAccess.ts`). 0 server errors. A MEMBER is redirected from every page except the giving station, as designed.                                                                                                      |
| 12 read procedures x 7 accounts, called directly | Every route the browser blocks has its data refused by the server (FORBIDDEN). `withdrawals.list` answers every role, but returns only the caller's own requests unless the role is a finance role, church leader, or bank signer (checked with a real request). |
| 38 write calls as roles that should be refused   | 36 refused with FORBIDDEN. 2 were allowed to a PASTOR: `church.updateProfile` (church leaders may, by design) and `finance.createAccount` (finance roles or church leaders may, by design). No write succeeded that the code does not allow.                     |
| Withdrawal approval, real signers                | The required signer approved, the request stayed pending (1 of 2). The second signer approved, it became approved. The treasurer marked it paid, and it became `disbursed`. A separate request was rejected with a reason and became `rejected`. No page errors. |

Defect found on the way (fixed): the approval and payment confirmations showed both the sign and the word, for example "฿ 2,500.00 บาท". Both now show one unit. A guard test (`moneyFormat.guard.test.tsx`) blocks a new one.

Decision (confirmed by the product owner: leave it hidden, no change): a PASTOR can open the Funds page, and the server would let them create a fund, but the page hides the create button because it checks the finance role only. Showing the button would widen what the UI offers, so I treated it as a permission change.

Paying a request does not change a fund balance. The dialog says the amount goes into the next counting round. That is existing business logic, unchanged.

### Still not verified

- LINE sign-in. The sessions were signed with the app's own session function, not issued by LINE.
- Supabase storage (receipt and slip upload), the LINE slip webhook, and the AI slip reader. They need keys and network access this environment does not have.
- The production Vercel and Supabase deployment.

### Complete change set (Git status at the end of this work; HEAD `f645c7b`, nothing committed)

Modified (39):

- `client/src/App.tsx`
- `client/src/components/common/CommonUI.tsx`
- `client/src/components/finance/VoucherModal.tsx`
- `client/src/components/giving/GiveChooser.tsx`
- `client/src/components/ui/promptpay-qr-card.tsx`
- `client/src/components/ui/station-giving-kit.test.tsx`
- `client/src/components/ui/station-giving-kit.tsx`
- `client/src/lib/csvDownload.test.ts`
- `client/src/lib/csvDownload.ts`
- `client/src/lib/errors.ts`
- `client/src/pages/Approvals.tsx`
- `client/src/pages/Budgets.tsx`
- `client/src/pages/ChurchSetup/components/SetupSteps.tsx`
- `client/src/pages/Counting.tsx`
- `client/src/pages/Expenses.tsx`
- `client/src/pages/Funds.tsx`
- `client/src/pages/GivingInbox.tsx`
- `client/src/pages/GivingStation.test.tsx`
- `client/src/pages/GivingStation.tsx`
- `client/src/pages/Home.tsx`
- `client/src/pages/Home/components/BalanceCard.tsx`
- `client/src/pages/Home/components/BudgetSection.tsx`
- `client/src/pages/Home/components/FundBreakdown.tsx`
- `client/src/pages/Home/components/SecondaryMenu.tsx`
- `client/src/pages/MemberDetail.tsx`
- `client/src/pages/Members.tsx`
- `client/src/pages/NewExpense.tsx`
- `client/src/pages/NewOffering.tsx`
- `client/src/pages/NewWithdrawal.tsx`
- `client/src/pages/Notifications.tsx`
- `client/src/pages/Offerings.tsx`
- `client/src/pages/Profile.tsx`
- `client/src/pages/Reports.tsx`
- `client/src/pages/Settings.tsx`
- `client/src/pages/Settings/BankSignersSection.tsx`
- `client/src/pages/TransactionDetail.tsx`
- `client/src/pages/Transactions.tsx`
- `client/src/pages/Updates/components/AdminManager.tsx`
- `client/src/pages/givingStationFlow.ts`

New (24, a folder counts once):

- `FRONTEND_COMPLETION_TRACKER.md`
- `FRONTEND_ENGINEERING_REPORT.md`
- `FRONTEND_SYSTEM_MAP.md`
- `client/public/avatars/`
- `client/src/errorMessages.guard.test.ts`
- `client/src/hooks/useCursorPagination.test.ts`
- `client/src/hooks/useCursorPagination.ts`
- `client/src/hooks/useSubmitLock.test.ts`
- `client/src/hooks/useSubmitLock.ts`
- `client/src/inputNames.guard.test.ts`
- `client/src/labels.association.test.tsx`
- `client/src/lib/errors.test.ts`
- `client/src/moneyFormat.guard.test.tsx`
- `client/src/pages/Counting.list.test.tsx`
- `client/src/pages/Funds.createGuard.test.tsx`
- `client/src/pages/NewExpense.success.test.tsx`
- `client/src/pages/NewWithdrawal.success.test.tsx`
- `client/src/pages/Updates/components/AdminManager.errors.test.tsx`
- `client/src/pages/countingStatus.test.ts`
- `client/src/pages/countingStatus.ts`
- `client/src/pages/ledgers.test.tsx`
- `client/src/productDecisions.test.tsx`
- `client/src/submitLock.guard.test.ts`
- `client/src/tableScroller.guard.test.ts`
