# Final Financial Date Integrity Report

Repository: `tlckalasinchurch/Graceful-giving`. Branch: `feat/phase-5-6-financial-audit-and-ux`. PR #138.
Start HEAD: `e0d2230c5892019212be3bd8f4f1c8c820ff01f6`. Date: 2026-11-07.

**Decision: FIXED WITH LIMITATIONS.** The withdrawal-to-counting fix has database-backed evidence. The Production time zone is NOT VERIFIED and the historical data impact is UNKNOWN. This report does not claim Production readiness.

## 1. Root cause

`timestamp` (without time zone) columns hold the UTC wall clock. Drizzle writes `toISOString()` and reads `value + "+0000"`. The helper `bangkokDate()` in `server/db.ts` was:

```sql
(<timestamp column> AT TIME ZONE 'Asia/Bangkok')::date
```

For a `timestamp` column, `AT TIME ZONE 'Asia/Bangkok'` reads the stored value as Bangkok local time. The stored value is UTC. The result is up to 14 hours wrong.

The helper was used on both sides of the comparison that attaches a paid withdrawal to a counting round, so the error did not cancel out. The counting page stores a Sunday round as 05:00 UTC (12:00 Bangkok). With the old helper:

- The round's date was read as Saturday.
- A payout from Sunday 00:00 to 13:59 Bangkok time was read as Saturday. The round was eligible.
- A payout from Sunday 14:00 to 23:59 Bangkok time was read as Sunday. The round was not eligible.

A payout on a counting Sunday from 14:00 on went to a later round, or stayed unattached until a new round opened.

Two other defects were found on the way:

1. **Date parameters crash the driver.** With `drizzle-orm` 0.44.6 and `postgres-js` 3.4.9, a raw JS `Date` inside a `sql` template is not serialised. The query fails with `The "string" argument must be of type string ... Received an instance of Date`. Two queries did this: the sweep in `attachPendingWithdrawals` and the round-order helper `countingSessionsBefore` (carry-forward). On the real driver, `counting.create` threw after it wrote the round, and every counting workflow test failed. I reproduced this on PostgreSQL 16. **I did not check Production.** I cannot say how Production behaved.
2. **Monthly calculations used UTC or server-local months.** See section 5.

## 2. Old and corrected semantics

| Item                                | Old                                                     | Corrected                                                                              |
| ----------------------------------- | ------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Date of a stored `timestamp` column | `(col AT TIME ZONE 'Asia/Bangkok')::date`               | `((col AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Bangkok')::date` (`bangkokDateOfColumn`) |
| Date of a JS `Date` parameter       | `$n::timestamp` with a raw `Date` (crashed)             | `'<ISO string>'::timestamptz AT TIME ZONE 'Asia/Bangkok'` (`bangkokDateOfInstant`)     |
| Round order                         | raw `Date` in a row comparison (crashed)                | ISO string cast to `timestamp`                                                         |
| Dashboard month, monthly chart      | server-local month (UTC on Vercel)                      | Asia/Bangkok month, half-open range                                                    |
| Budget period and month buckets     | explicit UTC month, `extract(month …)` on the UTC value | Asia/Bangkok month and year, half-open range                                           |
| Report range label                  | UTC date of the range                                   | Bangkok date of the range                                                              |

Proof of the old and new expressions (PostgreSQL 16, UTC session):

| Bangkok time | Stored value | Old date | Correct date |
| ------------ | ------------ | -------- | ------------ |
| Sun 00:00    | Sat 17:00    | Sat      | Sun          |
| Sun 07:00    | Sun 00:00    | Sat      | Sun          |
| Sun 13:59    | Sun 06:59    | Sat      | Sun          |
| Sun 14:00    | Sun 07:00    | Sun      | Sun          |
| Mon 00:00    | Sun 17:00    | Sun      | Mon          |

The new helpers do not depend on the session time zone. Tests run them with the session set to `UTC`, `Asia/Bangkok`, `America/New_York`, and `Pacific/Auckland`.

The business rule is unchanged: a paid withdrawal goes to the first round, in order of date, round number, then id, that is open (`counting`, `counted`, or `verified`) and whose Bangkok date is on or after the payout's Bangkok date. The dual-signer approval code and all role checks are unchanged.

## 3. Source files changed

| File                                                     | Change                                                                                                                                                                                                                                                                                                                                                                                                                               |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `server/db.ts`                                           | `bangkokDateOfColumn`, `bangkokDateOfInstant`, `bangkokLocalOfColumn` (exported). Two attach queries use them. `countingSessionsBefore` binds an ISO string. Month ranges in `getFinancialSummary`, `getMonthlyStats`, `budgetPeriod`, and the budget month bucket use Thai months. `getFinancialSummary` and `getMonthlyStats` take an optional `now` (default: the current time). The report range label uses `bangkokDateString`. |
| `shared/bangkokDate.ts`                                  | Adds `bangkokCalendarMonth` and `bangkokMonthStart`.                                                                                                                                                                                                                                                                                                                                                                                 |
| `server/finance.dateIntegrity.integration.test.ts` (new) | 50 PostgreSQL tests. Skipped without `DATABASE_URL`.                                                                                                                                                                                                                                                                                                                                                                                 |
| `server/withdrawals.workflow.test.ts`                    | Test repair only (section 4.3).                                                                                                                                                                                                                                                                                                                                                                                                      |
| `server/budgets.integration.test.ts`                     | One fixture moved from `01-31T23:00Z` to `01-31T16:00Z`, so it stays the last hour of January in Thai time.                                                                                                                                                                                                                                                                                                                          |
| `server/counting.workflow.test.ts`                       | Follow-up, test only: the "unbalanced session" test sets opening balances by hand (section 9).                                                                                                                                                                                                                                                                                                                                       |
| `server/reports.integration.test.ts`                     | Follow-up, test only: the offering enum test checks the shared ids plus the legacy ids (section 9).                                                                                                                                                                                                                                                                                                                                  |
| `docs/sql/withdrawal_attachment_diagnostic.sql` (new)    | Read-only diagnostic (section 8).                                                                                                                                                                                                                                                                                                                                                                                                    |
| `docs/sql/production_timezone_check.sql` (new)           | Read-only time zone checks (section 7).                                                                                                                                                                                                                                                                                                                                                                                              |
| `api/index.js`                                           | Regenerated by `pnpm build`, Prettier-formatted like the committed file.                                                                                                                                                                                                                                                                                                                                                             |

No change to the database schema, migrations, amounts, totals, role rules, or approval rules.

## 4. Withdrawal-to-counting results

Environment: PostgreSQL 16.15, local, throwaway cluster. The repo migrations 0000 to 0004 were applied with `pnpm db:migrate`. Each test file uses its own `test-<uuid>` tenant, which is dropped at the end. Production was not contacted.

### 4.1 New tests (50 passed)

For each of three ways a Sunday service date can be stored (browser noon = 05:00 UTC, date input read as UTC = 00:00 UTC, Bangkok midnight = 17:00 UTC of the day before):

| Case                                                    | Result                                                                                     |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Payout Sunday 08:00, 13:59, 14:00, 15:00, 23:59 Bangkok | Lands in that Sunday's round, once. A second attach returns null and makes no second line. |
| Payout Monday 00:00 Bangkok                             | Skips Sunday's round and takes the next Sunday's round.                                    |
| Payout Saturday 23:59 Bangkok                           | Lands in Sunday's round.                                                                   |

Other cases:

| Case                                                            | Result                                                                                                     |
| --------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Two rounds on the same date                                     | The lower round number takes the payout.                                                                   |
| Posted or closed rounds                                         | Skipped. The first `counting`, `counted`, or `verified` round takes it.                                    |
| Rounds created out of date order                                | The earlier date takes the payout.                                                                         |
| Round dated before the payout                                   | Not eligible. Returns null. No bank line.                                                                  |
| No round at all                                                 | Returns null. No bank line.                                                                                |
| Request not in `disbursed` status                               | Returns null.                                                                                              |
| Session time zone `Asia/Bangkok`                                | Same answer.                                                                                               |
| Transaction rollback                                            | No bank line remains. A later attach makes exactly one.                                                    |
| Two attaches at the same time                                   | Exactly one succeeds. Exactly one bank line.                                                               |
| New round collects waiting payouts (`attachPendingWithdrawals`) | Takes Saturday, Sunday 15:00, and Sunday 23:59 payouts. Leaves the Monday payout. A second run attaches 0. |

### 4.2 The tests catch the old behavior

- With the old column expression put back, 27 of 48 tests failed (at that time the file had 48 tests).
- With UTC month boundaries put back, 6 tests failed.
- A test also shows that, with the old expression, a Sunday round skipped every payout from 14:00 (`Sun 13:59` eligible, `Sun 14:00`, `Sun 15:00`, `Sun 23:59` not eligible).

### 4.3 Existing withdrawal workflow tests

Three tests in `server/withdrawals.workflow.test.ts` could not pass, for reasons unrelated to the dates. They had been skipped, so nobody saw it:

- Two tests did `await expect(res).resolves…` on a value that was already awaited.
- One test never called `disburse`.
- All three depended on the machine clock (they use `new Date()` and September 2026 rounds) and on rounds that earlier tests left open.

I fixed the clock to a Sunday, closed leftover open rounds at the start of each, called `disburse`, and removed the misuse of `.resolves`. Result: 9 of 9 pass. This is a test-only change.

## 5. Monthly calculation results

| Calculation                                                                 | Month used before                      | Month used now                                | Product need |
| --------------------------------------------------------------------------- | -------------------------------------- | --------------------------------------------- | ------------ |
| Dashboard summary (`getFinancialSummary`)                                   | server-local (UTC on Vercel)           | Asia/Bangkok                                  | Thai         |
| Monthly chart (`getMonthlyStats`)                                           | server-local                           | Asia/Bangkok                                  | Thai         |
| Budget period (`budgetPeriod`) and budget month bucket (`extract(month …)`) | UTC                                    | Asia/Bangkok                                  | Thai         |
| Report range label (`getFinancialReportSummary` `from`, `to`)               | UTC date                               | Bangkok date                                  | Label only   |
| Reports page ranges, CSV filters                                            | browser local time, sent by the client | unchanged (Bangkok for a browser in Thailand) | Already Thai |
| `date_trunc`                                                                | not used                               | not used                                      | –            |

The ranges are half-open `[start, next start)` in place of `BETWEEN start AND 23:59:59`. A row at 23:59:59.5 on the last day was left out before. It is counted now.

Tests (real PostgreSQL), with amounts 1, 10, 100, … so that a total names the rows counted:

| Record (Bangkok time) | Stored UTC   | Counted in                         |
| --------------------- | ------------ | ---------------------------------- |
| 31 Oct 23:59          | 31 Oct 16:59 | October                            |
| 1 Nov 00:00           | 31 Oct 17:00 | **November** (UTC month: October)  |
| 1 Nov 06:59           | 31 Oct 23:59 | **November** (UTC month: October)  |
| 1 Nov 07:00           | 1 Nov 00:00  | November                           |
| 30 Nov 23:59          | 30 Nov 16:59 | November                           |
| 1 Dec 00:00           | 30 Nov 17:00 | **December** (UTC month: November) |

Also tested: the "current month" changes at 00:00 Bangkok (`now` = 1 Nov 00:30 Bangkok is November, `now` = 1 Dec 00:10 Bangkok is December); month labels across a year start; year boundaries for annual budgets (1 Jan 00:00 Bangkok belongs to the new year); voided rows stay out. Monthly, annual, and detail views of a budget give the same total.

**Behavior change to confirm with the owner:** a record from 00:00 to 06:59 on the 1st of a month moves from the previous month to the month it is in for the church. Dashboard and budget "actual" figures change for such records. No amount changes.

## 6. Not changed (outside this task)

- The duplicate check for "no slip" giving uses a day range built from `dayStart` and `dayEnd` (`server/db.ts`, near the end of the file). I did not review it in depth and did not change it.
- Download file names use the UTC date of "now" (cosmetic).
- Other reports take their date range from the client.

## 7. Production time zone: NOT VERIFIED

I did not connect to Production. The file `docs/sql/production_timezone_check.sql` has four read-only statements:

1. `SHOW TIME ZONE;` Expected `UTC` or `Etc/UTC`.
2. `SELECT … FROM pg_settings WHERE name = 'TimeZone';` shows the value and where it comes from.
3. A query on `pg_db_role_setting` for time zone settings stored on the database or on a role (`app_user`).
4. `SELECT now()::timestamp, now() AT TIME ZONE 'UTC', now()::timestamp = (now() AT TIME ZONE 'UTC');` The last column must be `true`. If it is `false`, `DEFAULT now()` columns store local time, not UTC.

Run them through the same connection string, role, and pooler that the application uses (Supabase transaction pooler, role `app_user`), because a role or the pooler can set its own zone. Do not run `SET`, `ALTER DATABASE`, or `ALTER ROLE`.

The new Bangkok helpers do not depend on the session time zone for explicit dates. Columns that rely on `DEFAULT now()` do depend on it. In a Bangkok-zone session on PostgreSQL 16, `DEFAULT now()` stored 7 hours ahead of UTC. Most code writes explicit `Date` values.

## 8. Historical data impact

**Unknown. Not measured.** Records written before this fix may be in the wrong round:

- A payout made on a counting Sunday from 14:00 to 23:59 Bangkok time may sit in a later round.
- A payout may sit unattached although an open round exists.
- If the Date parameter crash also happened in Production, some rounds may have been created without the sweep running.

`docs/sql/withdrawal_attachment_diagnostic.sql` has two `SELECT` statements:

- **A.** Lines in a round that the corrected rule would not have chosen. It rebuilds which rounds existed and were open when the line was written, from `createdAt`, `postedAt`, and `closedAt`. Reasons: `SKIPPED_EARLIER_OPEN_ROUND`, `ATTACHED_BEFORE_PAYOUT_DATE`.
- **B.** Paid requests with no bank line although an open round could take them.

The query was tested on the local database inside a `READ ONLY` transaction (it lists the skipped line and the early line, leaves the correct line out, and changes no row). Limits: a round posted by hand without `postedAt` can hide a case or add a false one. The output is a list to review, not a verdict.

**No historical record was moved, deleted, or rewritten.** Any correction needs the owner's separate approval and reconciliation against the passbook. A posted round has frozen figures, so moving a line between rounds changes opening and closing balances.

## 9. Quality gate results

CI mode (no `DATABASE_URL`), run on the working tree after the last change:

| Command                             | Exit | Result                                                                                                                       |
| ----------------------------------- | ---- | ---------------------------------------------------------------------------------------------------------------------------- |
| `pnpm check`                        | 0    | No type errors                                                                                                               |
| `pnpm test`                         | 0    | 83 files passed, 5 skipped. 957 passed, 106 skipped, 0 failed. The 106 skipped are the PostgreSQL suites (56 older, 50 new). |
| `pnpm build`                        | 0    | Built. `api/index.js` equals a fresh build after Prettier formatting.                                                        |
| `prettier --check` on changed files | 0    | Clean                                                                                                                        |

With the isolated PostgreSQL (`DATABASE_URL` set):

| Run                                     | Result                                                                                                                                                                                                |
| --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `finance.dateIntegrity`                 | 50 of 50 passed                                                                                                                                                                                       |
| `withdrawals.workflow`                  | 9 of 9 passed                                                                                                                                                                                         |
| `counting.workflow`                     | 28 of 28 passed (27 before the follow-up)                                                                                                                                                             |
| `budgets.integration`                   | 2 of 2 passed                                                                                                                                                                                         |
| `reports.integration`                   | 17 of 17 passed (16 before the follow-up)                                                                                                                                                             |
| CSV, financial, route-access unit tests | all passed                                                                                                                                                                                            |
| Targeted run of the files above         | 257 passed, 0 failed                                                                                                                                                                                  |
| Whole suite                             | 17 failed, all of them tests that assume no database (below). No database integration test fails. At the untouched branch head the whole suite had 45 failures. No test fails only after this change. |

**Follow-up to the 2 older failing tests.** In the first version of this report, 2 older integration tests failed. They did not concern dates. I fixed both, test code only. No production code changed.

- `counting.workflow` "unbalanced session": the test expected opening balances to carry in from "the round above". That round belongs to an earlier test group, which deletes it before this group runs. The test now sets the opening balances by hand (cash 0, bank 0), as the first posting test does. It still checks that posting is refused until the variance is explained, and that it succeeds with a note.
- `reports.integration` offering enum: the test required the live enum to equal the shared list. PostgreSQL cannot drop enum values, so a migrated database keeps the legacy ids (`general`, `building`, `welfare`). The test now requires the live enum to equal the shared ids plus the legacy ids from `LEGACY_OFFERING_CATEGORY_LABELS`, compared without order. A missing or an unknown value still fails.

The 17 failures in the whole-suite run with a database are tests that assume that no database is present (ministries, budgets, Phase 5A and 5B, ledger, withdrawal limits, slip tests). They expect a write to fail. `pnpm ci` blanks `DATABASE_URL` for that reason. With a database, the write succeeds and they fail. One of them ("ministries: accepts an update that changes a single field") passes or fails depending on whether a row with id 1 exists. I did not change them.

## 10. Remaining limitations

1. Production time zone: NOT VERIFIED.
2. Historical data: not diagnosed. The diagnostic was not run on real data.
3. Evidence comes from a local PostgreSQL 16 and the app's own driver stack. It does not come from Supabase or its transaction pooler.
4. Tests that assume no database fail when they run with a database (section 9). Run the whole suite with `pnpm ci`, which blanks `DATABASE_URL`, and run the PostgreSQL suites by name.
5. The Date parameter crash is confirmed locally. Its effect in Production is unknown.
6. Dashboard and budget figures change for records from 00:00 to 06:59 on the 1st of a month. Confirm this with the owner.
7. The Vercel build for the pushed commit was not read in this step.
8. Earlier limits of PR #138 remain: no authenticated browser E2E, no staging, the CSV size and memory limits.
