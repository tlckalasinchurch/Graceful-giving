# AI-HANDOFF.md — Session state & owner working agreement

> A snapshot doc for any AI agent continuing work in this repo. Read `CLAUDE.md` for
> commands, architecture, and test conventions — this file intentionally does not
> repeat them. Check `git status` before trusting the snapshot below; it is dated.

## Hard rules (owner working agreement)

1. **The owner is the product owner, not a developer.** He is a church member with
   product ideas but no coding and no accounting knowledge. Never assume he can
   read diffs, TSX, or ledgers.
2. **Always reply in Thai.** Keep explanations in plain everyday language; when a
   finance concept is involved, explain it like explaining to a volunteer, and
   define any term the first time it appears.
3. **Working loop:** owner states an idea in words → agent restates it, asks
   clarifying questions, builds a visual mockup/preview HTML **before** writing
   code → owner approves → agent implements → runs `pnpm check` + `pnpm test` →
   reports results in a table. Use static HTML previews (single file, inline
   styles, Thai text) placed in
   `C:\Users\Administrator\AppData\Local\Temp\opencode\` and opened with
   PowerShell `Start-Process` so the owner can see them in a browser.
4. **Never commit, push, deploy, or run destructive git commands without an
   explicit instruction from the owner.** Stockpile working-tree changes and
   report their size each time. When the owner asks to commit, offer a split
   into logical commits and wait for his pick.
5. If the owner's request could lose financial data or is irreversible, show the
   consequence in plain language and get a yes/no before proceeding.

## Session changes (2026-10-26)

Base commit: `0ac8010` "refactor(ui): apply burnt orange vanilla theme (#31)" —
it was reviewed and found to break with dark-on-dark tokens in several places.

**The four fix groups below were committed on 2026-10-26 and pushed to
`origin/main`** (`13a25bd` theme tokens, `e942f42` destructive-action
confirms + sweetalert, `3faf97a` offerings bugs, `8034eee` counting state
reset). Verification before commit: `pnpm check` PASS, `pnpm test`
244 passed / 36 skipped (skip pattern is expected — see `CLAUDE.md`).

The changes form four logical groups (proposed commit split, not yet applied):

1. **fix(ui): theme tokens** — replace dark-on-dark/low-contrast classes after the
   burnt-orange theme refactor: `ErrorBoundary.tsx`, `ui/tabs.tsx`,
   `ReconciliationSummaryTab.tsx` (3 summary rows), `CashCountTab.tsx` (footer),
   `Funds.tsx` (also removes dead `const percentage = null;`),
   `Approvals.tsx` (REQ code now derives year from `req.date` instead of a
   hardcoded 2026), swap hard-to-see tab hover `#FFF8EA` → `#FAF8F5` in
   `CountingDetail.tsx`.
2. **fix(ui): confirm destructive finance actions** — `DeductionsTab.tsx`
   (confirm before removing a deduction transaction), `EnvelopesTab.tsx`
   (confirm before deleting an envelope), `ReconciliationSummaryTab.tsx`
   (confirm before **Post to ledger** and **Close permanently**, texts show the
   amounts involved), `BankRecordsTab.tsx` (confirm before passbook match, warns
   the date is forced to today and the status is not reversible).
3. **fix(offerings): real data corruption bugs** — `NewOffering.tsx`: payment
   method mapping compared UI labels against wrong strings ("โอน" vs the actual
   label "โอนเงิน"), so selecting bank transfer / PromptPay was saved as `cash`;
   the receipt date and donor name / anonymous checkbox were collected but never
   sent to `offerings.create` (server accepts `receiptDate`/`donorName` and
   represents anonymous as `donorName: null`). Now both are submitted.
4. **fix(counting): stale in-session state** — `CountingDetail.tsx`: the route
   keeps the component mounted across `/counting/:id` values; `useEffect` on
   `sessionId` now clears `draftCounts`, `varianceNote`, and resets the active
   tab, so reconciliation numbers could previously leak across sessions.

Gotcha: running `pnpm build` drops an untracked `api/index.js` artifact into the
working tree; clean it with `git checkout -- api/index.js` if `pnpm build` was
used only for verification.
Do not untrack or git-ignore `api/index.js`. Vercel finds the `/api` function
from files in the repo before the build runs. Without the file, `/api/*`
returns the SPA `index.html` (tested on a preview of PR #50).

## Design conventions (decided during this session, not in CLAUDE.md)

**Theme tokens** (burnt-orange vanilla, no dark mode in the app):

- Page/background paper: `#FAF8F5`; cream tint bands: `#FFF4D6` / `#FFF8EA`.
- Card surfaces are `bg-white` with border `#E7DCC8`; anything sitting _inside_ a
  white card uses `#FFF8EA` as the single inset step.
- Ink: `#171311` (headings), `#51443A` (body), `#807266` (muted), pill text on
  `#FAF8F5` with `#807266`.
- Action colors: primary orange `#C94F16` / hover `#9F3B0F`; verify/safe green
  `#2F7A45` / dark `#1F5C33`; danger red `#C8372D`; close/lock brown `#51443A`.
- Known open inconsistency: CTA green vs orange usage is not yet standardized
  across counting forms (see "Open findings").

**sweetalert.ts wrapper** (`client/src/lib/sweetalert.ts`) — the in-house Swal
replacement:

- Danger/colored confirm buttons: pass `confirmButtonColor` in options; `fire()`
  renders it as an inline `style="background:..."` with `hover:opacity-90`
  (dynamic values are invisible to the Tailwind JIT scanner — do not use
  arbitrary Tailwind classes for them). No option → default orange classes.
- Body text now renders `\n` as a line break (`whitespace-pre-line` was added).
- Existing pattern to follow for new confirms:
  `await Swal.confirm(title, text, { icon, confirmButtonText, confirmButtonColor,
cancelButtonText }); if (confirmed) mutate(...)` — see `handleDeleteThisSession`
  in `client/src/pages/CountingDetail.tsx`.
- Button color semantics used with `confirmButtonColor`: red `#C8372D` = delete,
  green `#1F5C33` / `#2F7A45` = post/verify, brown `#51443A` = permanent close,
  orange `#C94F16` = reset/recount.

## UX review program (owner-driven, page-by-page)

Pages are bundled into journeys to keep reviews comparable. Every reviewed page
uses the same five-frame report: first impression · workflow step list · how data
is saved (validation, feedback, confirm-on-destructive, unsaved-changes guard) ·
how data is displayed (states, formats) · friction points + quick wins.

- **A. Login/register/setup/profile/settings** — not started.
- **B. Home (doorway)** — not started.
- **C. Counting cycle** — **reviewed** (NewOffering, Counting, CountingDetail +
  5 tabs). All real bugs found were fixed (groups 1–4 above). Results were
  communicated to the owner as a journey map + per-page finding tables.
- **D. Ledger (Transactions/TransactionDetail/Offerings/Expenses/FundDetail)** —
  not started (owner's stated next choice after counting).
- **E. Withdrawal → approvals** — not started.
- **F. Planning (Budgets/Funds/Ministries/Members)** — not started.
- **G. Community (Updates/Notifications/GivingInbox)** — not started.

### Open findings from Journey C (known, deliberately deferred)

- **No delete/edit for bank records** (`BankRecordsTab`): a mistyped amount
  survives the whole round; needs a server-side remove API first. No UI
  workaround exists today.
- **Cash counting autosaves only on blur** (`CashCountTab`): on mobile, typing a
  value then switching tabs saves nothing; reconciliation can show the draft
  value while the server still holds the old one. Suggested fix: debounce
  autosave on change, or an explicit blur hint.
- **Button-color inconsistency**: green submit buttons on Counting create form /
  EnvelopesTab / BankRecordsTab vs orange submit on NewOffering; success dialog
  button in NewOffering uses `#9BCBA5` with white text (likely fails WCAG AA).
  Decide one CTA convention first (proposal: orange = record/save, green =
  verify).
- Minor: delete/reset session handlers are copy-pasted in `Counting.tsx` and
  `CountingDetail.tsx`; `serviceRound` is hardcoded to 1 in `counting.create`; a
  "Post" button disabled silently gives no inline reason (a prompt exists above
  it, but the button says nothing).
- `matchPassbook` always stamps "today"; passbook date choice would need router
  input changes.

## Next steps (as left off)

Owner's standing options: continue the UX journey review (D is queued), fix
deferred findings (bank-record removal is the server-work one), take his first
product idea, or split the 12-file working tree into the proposed commits.

## Resolved: commit plan (2026-10-26)

The owner picked a per-concern commit split. Delivered: `fix(ui)` theme
tokens `13a25bd`, `fix(counting)` confims `e942f42`, `fix(offerings)`
bugs `3faf97a`, `fix(counting)` state reset `8034eee`, plus this docs
file. No build artifact (`api/index.js`) is part of the history.

The owner has not yet stated his first product idea — when he does, start the
loop from Hard rules and produce an HTML mockup before any code.

## Session changes & Production Audit (2026-11-02)

**PR #85 Merged into `main` (`184fdf9`):** `fix: resolve production audit issues for timezone, state leak, CSV export, and role descriptions`

1. **State Leak on New Expense (`NewExpense.tsx`)**:
   - When clicking "บันทึกรายจ่ายรายการถัดไป" in success dialog, reset `receiptUrl`, `details`, `receiptFileName`, and `receiptContentType` in addition to basic fields, preventing previous receipt image and notes from leaking into subsequent expense entries.
2. **Timezone Offset Fix (`toLocalISODate` in `client/src/lib/format.ts`)**:
   - Replaced `d.toISOString().slice(0, 10)` (UTC-dependent) with `toLocalISODate()`. Between 00:00 and 06:59 AM Bangkok time, UTC was resolving to yesterday's date.
   - Applied to default dates in `NewOffering.tsx`, `NewExpense.tsx`, and `Counting.tsx` (`lastSunday()`).
   - In `Counting.tsx`, session creation now sends noon timestamp (`T12:00:00`) instead of midnight local (`T00:00:00`), preventing Sunday dates from shifting back to Saturday UTC.
   - In `server/routers.ts`, formatted unposted session warning message using `Asia/Bangkok` timezone.
3. **Safe CSV Export (`csvCell` in `client/src/lib/format.ts`)**:
   - Implemented `csvCell()` to escape internal quotes (`""`) and neutralize formula injection prefixes (`=`, `+`, `-`, `@`) with a leading `'`.
   - Applied across client-side export functions in `Offerings.tsx`, `Expenses.tsx`, and `Transactions.tsx`.
4. **Member Autocomplete in Manual Offerings (`NewOffering.tsx`)**:
   - Connected real church directory via `trpc.members.list.useQuery()` into `<datalist id="member-suggestions">`, displaying member name, envelope number (`envelopeNo`), and phone number for easy lookup while still supporting free-form donor names.
5. **Expanded Transaction Editing (`TransactionDetail.tsx`)**:
   - Enabled editing `fundId` (from actual finance account list) and `donorName`/`payee` directly in the transaction edit form, automatically updating ledger fund balances without requiring a void-and-reentry cycle.
6. **Church Leader Fund Setup (`server/routers.ts`)**:
   - Changed `finance.createAccount` procedure to `fundManageProcedure`, allowing users with `canManageChurchSettings` (e.g., `PASTOR`) to successfully create initial funds during the `ChurchSetup` wizard.
7. **Role Description Alignment (`shared/roles.ts`)**:
   - Updated `MEMBER` description to accurately reflect Giving Station access.

**Verification Status**:

- `pnpm check`: 0 errors
- `pnpm test`: 65 passed, 4 skipped, 769 tests passed
- `pnpm run ci`: 100% PASS
- Live site deployed via Vercel GitHub integration: `https://graceful-giving.vercel.app/`

## Session changes: input limits, readable errors, local test environment (2026-11-02)

Both PRs below are merged into `main` and deployed (Vercel production `READY`, no
runtime errors in the first hour after each deploy). Neither was tested on the live
site or on a real phone.

### PR #88 (`d71a730`): cap and validate withdrawal and ledger edit inputs

- `withdrawals.create`: amount capped at `MAX_WITHDRAWAL_AMOUNT` (10,000,000 THB,
  new in `shared/withdrawals.ts`); `fundId` must be an active fund (new helper
  `assertActiveFund` in `server/routers.ts`); `as any` removed.
- `offerings.update`: amount capped at `MAX_GIVING_AMOUNT`; active-fund check when
  `fundId` is a number; `as any` removed.
- `expenses.update`: amount capped at `MAX_GIVING_AMOUNT`.
- Any signed-in member can still file a withdrawal request through the API.
  `App.tsx` documents this as intended. The role was not restricted.
- Tests: 9 new cases in `server/withdrawals.access.test.ts`. 5 fail without the
  change.

### PR #89 (`a9fea3e`): readable message when an amount or input is rejected

- `server/_core/trpc.ts`: `errorFormatter` uses the first zod issue message for
  `BAD_REQUEST`. Before this, the forms showed the raw issue list as JSON in a toast.
  The status code and the rest of the shape did not change. Helper:
  `readableInputMessage`.
- `NewWithdrawal.tsx` and `TransactionDetail.tsx` check the amount limit before
  submit and show "จำนวนเงินต้องไม่เกิน 10,000,000 บาท". `TransactionDetail.tsx`
  covers the offering edit and the expense edit.
- The `max` attribute was not added to the inputs. A browser `max` shows an English
  browser message.
- Tests: `server/inputErrors.test.ts` (3 tests). `createCaller` skips the
  formatter, so the formatter itself was checked with real HTTP and Playwright.
- Verification at the end: `pnpm check` pass; `pnpm test` 66 files, 781 passed,
  56 skipped (need a live database).

### A finding that was wrong: do not repeat it

An early review said a bank signer could approve their own withdrawal request. That
is not a bug. `MIN_APPROVALS` is 2 and the required signer (the pastor) must
approve. The requester's own signature counts as one of the two, by design
(`docs/superpowers/specs/2026-10-30-withdrawal-signers-design.md` item 3, and the
test "lets the requester's own signature count but still needs another" in
`server/withdrawals.workflow.test.ts`). A block would stop the pastor from signing
the pastor's own request, and the request would never complete. A change needs an
owner decision.

### Open items (not done)

- Zod messages without a custom text are still English (for example
  `Too small: expected string to have >=5 characters`). They are one line now.
  Thai text needs a change in each schema.
- `NewOffering` and `NewExpense` get the new formatter but have no client-side
  amount-limit check.
- A `MEMBER` is redirected to `/giving/station` in the UI, but the API accepts
  `withdrawals.create` from a `MEMBER`. The comment in `App.tsx` ("any signed-in
  member can ask") is true at the API only. Owner decision: keep, or restrict the
  API.
- The browser's own `required` message is English ("Please select an item in the
  list.") in an English browser. The forms use `required`, not app text.
- `vercel.json` runs the LINE worker cron once a day (`0 0 * * *`). LINE
  notifications can be late by up to 24 hours. Check the Vercel plan and the
  wanted interval. Not checked.
- CSP `connect-src` in `vercel.json` has no Supabase domain. If the browser uploads
  to Supabase Storage directly, the upload fails. Not checked. If uploads go
  through the server, no issue.
- `buildCommand` runs `db:migrate:deploy` on every production build. A failed or
  destructive migration affects production directly.
- The repo root holds `Graceful-giving-fixed.zip` and
  `Graceful-giving-financial-hardening.patch`. Check for secrets, then remove.
- HTML shell (static audit, SPA): no favicon, no web app manifest, no `noindex`,
  a script in `<head>` without `defer`, no `preconnect` for LINE LIFF SDK. The
  "no `<h1>`/`<main>`" result may be wrong for a SPA.

### Local test environment (recipe; the files were deleted)

Nothing here touches production. Production and preview share one `DATABASE_URL`,
so never put that value in a local shell.

1. PostgreSQL 16 server binaries are in `/usr/lib/postgresql/16/bin`. Run `initdb`
   as the `postgres` user in a folder that user can read (for example
   `/var/lib/postgresql/<name>`), start it on `127.0.0.1:54329`, create a database.
2. `DATABASE_URL=postgresql://postgres@127.0.0.1:54329/<db> pnpm db:migrate`.
3. Seed `users` (`openId` `line:test-<role>`, `status` `active`, `churchRole`
   `SUPER_ADMIN`/`TREASURER`/`PASTOR`/`MEMBER`) and `finance_accounts` (the default
   tenant is `demo-church`). For the signing flow, add `bank_signers` rows.
4. Start the app: `NODE_ENV=development JWT_SECRET=<test value> PORT=3300
APP_URL=http://localhost:3300 pnpm exec tsx server/_core/index.ts`.
5. No LINE needed: sign a session with `signSession("line:test-<role>")` from
   `server/_core/session.ts` and send it as the `app_session_id` cookie.
6. A `PASTOR` is redirected to `/setup` until `church.updateProfile` and
   `church.completeSetup` run once.
7. tRPC over HTTP: `POST /api/trpc/<path>` with body `{"json": <input>}`.
8. Playwright and Chromium are installed in the cloud container. `require('playwright')`
   works from any folder.

Result on this environment: 21 of 21 API checks and the UI flows (390 px and 1280 px)
for #88 and #89 passed.

### Other repository (for context only)

`tlckalasinchurch/puntakit-kalasin` PR #73: `Groups.tsx` loads `LocationPicker` with
`lazy()`, so `maplibre-gl` (about 1 MB) loads when the pin dialog first opens, not
with the page. The chunk is still over 500 kB. The Vite warning remains.
