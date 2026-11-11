# Release Double Check

Date: 2026-11-09
Candidate: `origin/main` at `278bb3d` (merge of PR #144, which includes PR #143).
Method: incremental. Only the delta and the critical risks were checked. No full audit was repeated.
Rules followed: no source change, no commit, no push, no merge, no deploy, no production data, no mock data.

## 1. Verdict

**READY WITH ACCEPTED RISKS**

The code is ready. Four external integrations and the live deployment have no evidence in this environment. The owner must accept those risks or test them on staging before release (see section 6).

## 2. Inputs read

| Source | What was used | Note |
| --- | --- | --- |
| `RELEASE_READINESS_REPORT.md`, `GRACE_FINAL_RELEASE_GATE.md`, `UX_FINAL_VERIFICATION.md` (on `origin/main`) | Verdict, domain table, findings | Verdict in the source: READY WITH ACCEPTED RISKS |
| `FRONTEND_COMPLETION_TRACKER.md` (checkpoint 4) | Real-database results, defects, "not verified" list | Already merged through PR #143 |
| `FINAL_ENGINEERING_VERIFICATION.md` | Read only to date it | **Stale.** Baseline `8f1f400`. It says NOT READY. Later work replaced it. |

## 3. Scope of the delta

- The branch `claude/tender-mayer-8j18m1` (HEAD `35695c1`) is **behind** `origin/main`. PR #143 is already merged. The release candidate is `origin/main`, not this branch.
- Delta from HEAD to `origin/main`: 34 files, UX and accessibility work in `client/`, plus tests and reports.
- Only two server files changed: `server/db.ts` (audit log functions) and `server/routers.ts` (one line in `audit.list`).
- Not changed: `drizzle/`, `shared/`, `api/`, `vercel.json`, `package.json`, `pnpm-lock.yaml`, auth, `routeAccess.ts`.

## 4. Results

### VERIFIED (run by this check, with evidence)

| Risk area | Evidence |
| --- | --- |
| Type safety | `pnpm check` (`tsc --noEmit`) passed on `278bb3d`, as the first step of `pnpm run ci`. |
| Unit and UX regression tests | `pnpm run ci`: 109 files passed, 5 skipped. 1097 tests passed, 106 skipped, 0 failed. Exit code 0. The skipped tests need a database. |
| Production build | `pnpm build` passed. Exit code 0. |
| Migrations | `server/migrations.test.ts` (8 tests, in-memory PGlite) passed. This includes the financial integrity indexes and the non-owner role case. A real Postgres 16 also accepted `pnpm db:migrate` on an empty scratch database. |
| Tenant isolation, financial integrity (database) | Six suites run on a scratch Postgres 16: `tenant.isolation` 14, `counting.workflow` 28, `reports.integration` 17, `withdrawals.workflow` 9, `finance.dateIntegrity.integration` 50, `budgets.integration` 2. Total 120 passed, 0 failed. |
| Audit log tenant filter (the only changed server logic) | `audit.isolation.test.ts` mocks the database, so it does not prove the SQL filter. I ran `createAuditLog` and `listAuditLogs` on the scratch database with two tenants. Result: tenant A saw only its row (`X`), tenant B saw only its row (`Y`). |
| Audit permission | `audit.list` uses `adminProcedure`. The test file covers UNAUTHORIZED and FORBIDDEN for MEMBER, TREASURER, PASTOR, DEACON and COUNTER. The router passes `DEFAULT_CHURCH_ID` and ignores a client `churchId`. These tests passed in the CI run. |
| Permission code unchanged by PR #144 | The diff of Approvals, CountingDetail, Funds, GivingInbox, Settings and NewExpense shows indentation, an added `role="button"` and one audit label. No `canManage*` or `canView*` condition changed. `routeAccess.ts` is not in the diff. |
| Duplicate-save protection survived the merge | `useSubmitLock` is still used in NewOffering (`lock()` at line 193), NewExpense, NewWithdrawal, Funds, Budgets, Members and Counting. The guard tests `submitLock.guard.test.ts` and `Funds.createGuard.test.tsx` passed. |
| Success-dialog duplicate path in NewOffering | `onOpenChange` only closes the dialog. The fields are already cleared at save time (lines 154-160). A second submit after Escape has no amount, so it cannot save the same row twice. |

### BASELINE PASS (taken from earlier reports, not run again)

| Claim | Source | Why not rerun |
| --- | --- | --- |
| Role matrix: 14 routes x 7 roles (98 checks) in a real browser, 38 refused writes, 12 read procedures | Tracker, checkpoint 4 | No change to permission code in the delta. Server unit tests for roles passed in CI. |
| Withdrawal approval with two signers on a real server | Tracker, checkpoint 4 | `withdrawals.workflow` (9 tests) passed again on the database. |
| Real-server UI workflows: offering, expense, fund balance 759.75 | Tracker, checkpoint 4 | Needs a signed-in browser session. Not rebuilt here. |
| WCAG 2.2 AA items and mobile layout | `WCAG_22_AUDIT.md`, `UX_FINAL_VERIFICATION.md` | Covered by jsdom tests only. Theme contrast test passed in CI. |
| Single-entry cash-basis ledger (no journal table) | `GRACE_FINAL_RELEASE_GATE.md` finding 1.1 | Accepted risk for v1.0 in the source report. |

### BLOCKED (no input available here)

| Item | Missing input |
| --- | --- |
| LINE Login with real LINE servers | `LINE_LOGIN_CHANNEL_ID` and `LINE_LOGIN_CHANNEL_SECRET` |
| Supabase Storage (receipt upload, signed slip URL) | `SUPABASE_SERVICE_ROLE_KEY` and network access |
| LINE slip webhook with a real LINE signature | LINE channel secret and a public URL |
| AI slip reader | Gemini key |
| Vercel production environment variables and migration step | Production access. Vercel and Supabase connectors were not queried. |

### NOT TESTED

| Item | Reason |
| --- | --- |
| Browser re-run of the PR #144 UI changes (Login pending view, role-based primary actions, 5-step counting stepper) | Only jsdom tests ran. No signed-in browser session was built in this check. |
| Real double-click in a browser after the merge | The lock is verified in source and tests only. |
| Restore from a Supabase backup | Needs the Supabase dashboard. |
| Load and concurrency of fund balance updates | No test in scope. |

### FAILED

None found in this check.

## 5. Observations (not blockers)

1. **Outdated claim in `UX_FINAL_VERIFICATION.md`.** It says `createOfferingMutation.isPending` prevents duplicates. The tracker showed that `isPending` updates one render late. The real protection is `useSubmitLock`. The code is correct. The report text is not. Correct the report.
2. **Login screen shows the user's own LINE OpenID** to a pending user, now inside a collapsed `<details>`. This is the user's own identifier and it was already shown before. No action needed. The owner may confirm it is acceptable.
3. **Stale report.** `FINAL_ENGINEERING_VERIFICATION.md` still says NOT READY. Mark it as superseded to avoid confusion.
4. **Audit isolation test** uses a database mock. A real-database test for `listAuditLogs` does not exist in the repository. The ad-hoc check above passed. Add a permanent test later if wanted. I did not add one because the instruction allows tests only when necessary.

## 6. Accepted risks the owner must sign

1. LINE Login, Storage, webhook and AI slip reader are unverified live. If a variable is wrong on Vercel, sign-in or slip intake fails. Action: run one smoke test on staging with a real LINE account before release.
2. Production deployment and migration are unverified. The migration runs only on production builds and uses `DATABASE_URL_MIGRATE`. Action: confirm that variable is set and read the first build log.
3. The ledger is single-entry cash-basis. State this in the operating guide.

## 7. Environment used

- Scratch worktree of `origin/main` outside the repository. Removed after the check.
- Scratch local Postgres 16 with no production data. Stopped and deleted after the check.
- No change to tracked files. This file is the only new file and it is not committed.
