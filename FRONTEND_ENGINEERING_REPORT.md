# Frontend Engineering Report

Date: 2026-11-08. Branch: `claude/tender-mayer-8j18m1`. Nothing committed, pushed, merged or deployed. HEAD is `f645c7b`.

## 1. Release readiness decision

**NOT READY for a release sign-off, but closer.** The frontend now runs against a real server and a real Postgres database, and its main write workflows save correctly (see `FRONTEND_COMPLETION_TRACKER.md`, checkpoint 4). What is still missing:

1. LINE sign-in. The sessions used in the real-server checks were signed with the app's own session function, not issued by LINE.
2. File storage (receipt and slip upload), the LINE slip webhook, and the AI slip reader. These need keys and network access.
3. The production Vercel and Supabase deployment.
4. No end-to-end suite exists in the repository. The browser and server checks live in scratch scripts.

Done on the real server and a real Postgres: first sign-in and setup, offerings, expenses, funds, budgets, counting, members, withdrawals (request, two-signer approval, payment, rejection, cancel), reports, CSV export, and 7 accounts (owner and every church role). Details are in `FRONTEND_COMPLETION_TRACKER.md`, checkpoint 4.

The code in this change set is safe to merge on its own. It changes no financial calculation, authentication rule, permission, database schema, or backend contract.

## 2. Summary of changes

| Area                   | Change                                                                                                                                                                                                                                                                                                 |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Money display          | One format for every amount: two decimals, fixed locale, unit "บาท". Before, slip approval dialogs showed `1234.5`, and "THB", "บาท" and "฿" were mixed.                                                                                                                                               |
| Duplicate-request risk | Create-fund button now disables during the request. Closing the withdrawal success dialog by any route clears the form.                                                                                                                                                                                |
| Dialogs                | 6 hand-built modals now use the shared `Dialog` (focus trap, focus return, Escape).                                                                                                                                                                                                                    |
| Forms                  | 31 labels linked to their fields. 4 group labels use `fieldset`/`legend` or `aria-labelledby`. A guard test blocks new unlinked labels.                                                                                                                                                                |
| Errors                 | Admin news and events: 8 mutations now report failure, and a failed list load shows an error with retry. Ledger, Members, Notifications, MemberDetail and Approvals lists show the real reason. 13 toasts no longer show raw backend text. `friendlyErrorMessage` keeps a Thai reason from the server. |
| Ledgers                | Transactions, Expenses, Offerings share one paging hook, one paging bar, and one CSV save function. An export with no rows downloads nothing and says so.                                                                                                                                              |
| Budgets and Home       | Budget cards, the Home budget section, and fund balances showed whole baht while detail pages showed two decimals. All show two decimals now.                                                                                                                                                          |
| Counting               | One rule for "open round" instead of four copies. The search field and its clear button are named.                                                                                                                                                                                                     |
| Search fields          | 4 unnamed search fields (Counting, GivingInbox, two in Settings) now have names. A guard test blocks new ones.                                                                                                                                                                                         |
| Layout                 | Page scrolled sideways at 768–1100 px on Expenses and Transactions. Cause: hidden screen-reader text escaped the table scroller. Fixed in 6 scrollers. A guard test blocks new ones.                                                                                                                   |
| Home                   | Removed the duplicate Reports tile. The balance card button now reads "ดูรายงาน".                                                                                                                                                                                                                      |
| Profile                | The ID card dialog no longer shows a fake QR, an invented ID, or a fixed "Active" status. It is now "ข้อมูลโปรไฟล์". Preset avatars are 4 local SVG files, not Unsplash hotlinks.                                                                                                                      |
| Routes                 | `/giving-inbox` redirects to `/giving/inbox`.                                                                                                                                                                                                                                                          |

Details by module are in `FRONTEND_COMPLETION_TRACKER.md`.

## 3. Test results

| Command                       | Result                                                                                                 |
| ----------------------------- | ------------------------------------------------------------------------------------------------------ |
| `pnpm check`                  | Pass                                                                                                   |
| `pnpm test`                   | 102 files pass, 5 skip. 1054 tests pass, 106 skip, 0 fail. The 106 skipped tests need a live database. |
| `pnpm build`                  | Pass                                                                                                   |
| `prettier --check client/src` | Pass                                                                                                   |
| `git diff --check`            | Pass                                                                                                   |

Baseline before this work: 85 files pass, 975 tests pass. New: 19 test files, 128 tests. In addition, 6 database integration suites (120 tests) were run against a real Postgres and all pass. With the original source restored, 18 of the new tests fail (first batch: 10, ledgers: 8), which shows they detect the defects.

## 4. Browser results (production build, API answered by the test script)

| Check                                                                                            | Result                                                                              |
| ------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------- |
| 25 routes x 3 widths (1280, 768, 390 px), signed in, empty data                                  | 75 loads, 0 page errors, 0 sideways scrolling, every page has a title               |
| 6 modules with records (Members, Budgets, Counting, Reports, Approvals, Settings) x 3 widths     | 78 checks, 0 failed (60 first run, 78 after the Budgets, Counting and Home changes) |
| Settings tabs (categories, bank, audit) and Transaction detail (offering and expense) x 3 widths | 39 checks, 0 failed                                                                 |
| Ledgers: paging, empty export, forced FORBIDDEN error                                            | Pass at all 3 widths                                                                |
| Funds, Withdrawal and Profile dialogs                                                            | Focus stays inside, Escape closes, focus returns, form clears (withdrawal)          |

Screenshots were read after the 200 ms dialog animation ended. Two earlier screenshots taken mid-animation were discarded.

## 5. Verified workflow matrix

V = verified by the evidence named. U = not verified.

| Workflow                                                     | Entry            | Validation | Request                 | Loading  | Success                         | Error     | Refresh            | Permission |
| ------------------------------------------------------------ | ---------------- | ---------- | ----------------------- | -------- | ------------------------------- | --------- | ------------------ | ---------- |
| Ledger browse and detail (Transactions, Expenses, Offerings) | V browser        | V test     | V real DB               | V test   | V browser                       | V browser | V browser (paging) | V source   |
| Ledger export                                                | V browser        | n/a        | V real DB               | V test   | V test                          | V test    | n/a                | V source   |
| Create fund                                                  | V browser        | V test     | V real DB               | V test   | V real DB                       | V source  | U                  | V source   |
| Withdrawal request                                           | V browser        | V test     | V real DB               | V source | V browser (dialog, form clears) | V source  | U                  | V source   |
| Approvals: reject and cancel                                 | V browser        | V source   | V real DB (cancel only) | V source | V real DB (cancel)              | V source  | U                  | V source   |
| Manage news and events                                       | U                | V source   | U                       | V source | V source                        | V test    | V source           | U          |
| Settings: church, roles, categories, bank, audit tabs        | V browser (open) | V source   | V real DB (save)        | V source | V real DB (save)                | V source  | U                  | V source   |
| Members, Budgets, Counting, Reports (read)                   | V browser        | n/a        | U                       | V source | V browser                       | V source  | n/a                | V source   |

"V source" is a code reading only. It is weaker than a test or a browser run. "V real DB" means the step ran against a real server and a real Postgres, and the stored rows were read back. Manage news and events, Members, Budgets and Counting were also saved on the real server (checkpoint 4), but their rows above keep the older evidence.

## 6. Open items

| ID  | Item                                                                                         | Decision needed                                                                                  |
| --- | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| B1  | No staging database, LINE keys, or per-role accounts.                                        | Provide them to run real workflows.                                                              |
| T1  | `VoucherModal` and `AppLayout` read a query with no error branch.                            | None. Next small batch.                                                                          |
| T2  | GivingStation (2100 lines), GivingInbox (1900), Settings (1700) are single large components. | None. No defect needs a split.                                                                   |
| T3  | Mobile "รายงาน" tab in `AppLayout.tsx` is never shown to any role (dead code).               | Remove it, or keep it for a future role.                                                         |
| T4  | 45 uses of `any` in pages, components and lib.                                               | None.                                                                                            |
| T5  | Bundle chunks above 500 kB.                                                                  | None.                                                                                            |
| T6  | Browser checks live only in a scratch script.                                                | Add a Playwright suite to the repository? It needs a way to answer API calls or a test database. |

## 7. Design system

No new visual language. New UI reuses `Dialog`, `ErrorState`, `btn-primary`, `btn-secondary`, and the existing tokens.
