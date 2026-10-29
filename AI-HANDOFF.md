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
- Card surfaces are `bg-white` with border `#E7DCC8`; anything sitting *inside* a
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
