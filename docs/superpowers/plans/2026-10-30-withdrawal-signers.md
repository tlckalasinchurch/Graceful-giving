# Withdrawal Approval by Bank Signers — Implementation Plan

> **For the AI tool picking this up (Codex, Cursor, Claude, Gemini, any):** this plan is self-contained. Read "Handoff" and "Global Constraints" first, then the spec, then do the tasks in order. Each task is test-first: write the test, run it and see it fail, implement, run it and see it pass, commit. Steps use checkboxes (`- [x]`); tick them as you go so the next tool can resume.

**Goal:** Withdrawals are approved by the people named on the church's bank account (the required signer, i.e. the pastor, plus at least one more), and "paid" drops a bank withdrawal line into the counting round automatically.

**Architecture:** Two new tables (`bank_signers`, `withdrawal_approvals`, one row per signature) and a pure rule function decide each request's status. `withdrawals.sign` replaces the role-based `withdrawals.approve`. `withdrawals.disburse` links the request to the next unposted counting round via `bank_records.withdrawalRequestId`.

**Tech Stack:** TypeScript, Express + tRPC v11 + Zod, Drizzle ORM (postgres-js), React 19 + wouter + TanStack Query, Vitest (node for `server/**`, jsdom for `client/**`), pnpm.

**Spec:** `docs/superpowers/specs/2026-10-30-withdrawal-signers-design.md` (binding; this plan argues from it). Prior part: `docs/superpowers/specs/2026-10-30-counting-carry-forward-design.md`.

## Handoff

- **Repo:** `tlckalasinchurch/Graceful-giving`. **Branch:** `feat/withdrawal-signers`, stacked on `feat/counting-carry-forward` (PR #57, not merged yet). Open the PR with base `feat/counting-carry-forward`. After #57 merges, rebase onto `main` and retarget the PR.
- **Read first:** `CLAUDE.md` (commands, architecture, auth, test tenancy). Also `AGENTS.md` if your tool reads that.
- **Commands:** `pnpm install` · `pnpm check` (tsc) · `pnpm exec vitest run <file>` · gate before every push: `pnpm run ci`. Use `pnpm run ci`, not `pnpm ci`, which is pnpm's unimplemented builtin and errors out.
- **No database locally (as of 2026-10-30).** Suites guarded by `describeDb` skip without `DATABASE_URL`. For those, you cannot watch RED/GREEN. Write them anyway, and report each as **NOT VERIFIED** with the reason. Never set `CHURCH_ID` yourself; `server/test/setupTenant.ts` does it.
- **Who decides what:** user decisions are listed in the spec under "การตัดสินใจของผู้ใช้". Do not reopen them. Where this plan and the spec disagree, the spec wins. Note every deviation in the PR body under "Rulings".
- **User's standing rules:** commit per task on this branch. Do **not** merge, push to `main`, deploy, or touch production data. Label claims in your final report as VERIFIED (with the command) / NOT VERIFIED / ASSUMPTION / BLOCKER / NEXT. Reply to the user in Thai.

## Global Constraints

- Every schema change goes into **both** `drizzle/schema.ts` and `server/schema_init.ts` (idempotent DDL run by `getDb()`), plus a hand-written `drizzle/0007_withdrawal_signers.sql`. **Do not run `drizzle-kit generate`**: the journal only knows `0000`, so it emits a migration that recreates every table.
- New enum values: `ALTER TYPE "public"."withdrawal_status" ADD VALUE IF NOT EXISTS 'cancelled';` as its own `ENUM_STATEMENTS` entry. It cannot sit inside a `DO` block.
- Money: `z.number()` in, `amount.toFixed(2)` to the DB, `parseFloat` / the `num()` helper out.
- Every query is scoped by `churchId` (default `DEFAULT_CHURCH_ID`). Every mutation writes `createAuditLog({ churchId, userId, action, entity, entityId, metadata })` like its neighbours.
- User-facing copy and error messages are Thai, in the tone of the existing `withdrawals` / `counting` routers.
- UI: reuse existing tokens and patterns (`border-line`, `bg-paper-2`, `text-ink-2`, `text-brand-ink`, `text-income`, `text-danger`, `font-display`, `fmtBaht` / `formatBaht`, `Swal.confirm`, `toast`). No new gradients, glass, emoji or icon decoration. Read the `CarryForwardLedger` component from Part 1 for the house style.
- Line endings: the repo stores LF and `core.autocrlf=true`. Don't mass-reformat. Run `pnpm exec prettier --write` only on files you changed, and revert any hunks it touches outside your change.
- Commit messages: Conventional Commits, ending with the attribution line your tool uses.

## Review Focus

1. **Two signers press approve at the same moment.** Both rows must persist, and the request flips to `approved` exactly once. The unique index (`requestId`, `userId`) and the compare-and-set from `pending` carry this. Tested in Task 4 (DB).
2. **The required signer is changed after someone has signed.** The outcome must use `wasRequiredSigner` stored on the signature, not today's list. Tested in Task 1 (pure).
3. **Disburse when no counting round exists yet, then the round is created.** The withdrawal line must appear exactly once. Tested in Task 5 (DB).
4. **Resetting a counting round that holds a request-linked withdrawal.** The line must survive. Tested in Task 5 (DB).
5. **A withdrawal disbursed on a Sunday after that Sunday's round is already posted.** It goes to the next round, never into the posted one. Tested in Task 5 (DB).

---

### Task 1: Approval rule

**Files:** Create `shared/withdrawals.ts`. Test: `server/withdrawals.rules.test.ts`.

**Produces:**
```ts
export type SignatureDecision = "approved" | "rejected";
export interface Signature { userId: number; decision: SignatureDecision; wasRequiredSigner: boolean }
export type ApprovalOutcome = "pending" | "approved" | "rejected";
export interface ApprovalState { outcome: ApprovalOutcome; approvedCount: number; requiredSignerApproved: boolean }
export function approvalState(signatures: readonly Signature[]): ApprovalState;
export const MIN_APPROVALS = 2;
```

- [x] **Step 1: Failing tests** (`describe("approvalState")`):
  - `[]` → `{ outcome: "pending", approvedCount: 0, requiredSignerApproved: false }`
  - required signer approved alone → `pending`
  - two non-required approved → `pending` (`requiredSignerApproved: false`)
  - required + one other approved → `approved`, `approvedCount: 2`
  - required + two others approved → `approved`, `approvedCount: 3`
  - any `rejected`, even after the rule was met → `rejected`
  - Review Focus 2: signature `{ userId: 1, wasRequiredSigner: true }` + `{ userId: 2, wasRequiredSigner: false }` → `approved`. The rule never looks up a current signer list.
- [x] **Step 2:** `pnpm exec vitest run server/withdrawals.rules.test.ts` → FAIL (module not found).
- [x] **Step 3:** Implement. Pure, no imports from `server/`.
- [x] **Step 4:** Same command → PASS. `pnpm check` → clean.
- [x] **Step 5:** Commit `feat(withdrawals): approval rule for bank signers`.

---

### Task 2: Schema

**Files:** Modify `drizzle/schema.ts` (`withdrawalStatusEnum`, `withdrawalRequests`, `bankRecords`, two new tables), `server/schema_init.ts`. Create `drizzle/0007_withdrawal_signers.sql`. Test: `server/schema_init.test.ts`.

**Produces** (column names exact):
- `bank_signers`: `id` serial PK, `churchId` varchar(64) not null, `userId` integer not null, `isRequired` boolean not null default false, `addedBy` integer, `createdAt` timestamp default now. Indexes: unique (`churchId`, `userId`) `bank_signers_user_uniq`; partial unique `bank_signers_required_uniq` on (`churchId`) where `"isRequired" = true`.
- `withdrawal_approvals`: `id` serial PK, `churchId` varchar(64) not null, `requestId` integer not null, `userId` integer not null, `decision` varchar(10) not null, `note` text, `wasRequiredSigner` boolean not null, `createdAt` timestamp default now. Unique (`requestId`, `userId`) `withdrawal_approvals_signer_uniq`.
- `withdrawal_requests` + `disbursedAt` timestamp, `disbursedBy` integer, `cancelledAt` timestamp, `cancelledBy` integer, `cancelReason` text.
- `withdrawal_status` + `cancelled`.
- `bank_records` + `withdrawalRequestId` integer. Partial unique `bank_records_withdrawal_uniq` on (`withdrawalRequestId`) where not null.
- Drizzle exports: `bankSigners`, `withdrawalApprovals`, types `BankSigner`, `InsertBankSigner`, `WithdrawalApproval`, `InsertWithdrawalApproval`.

- [x] **Step 1: Failing tests** in `server/schema_init.test.ts`, following the existing `describe("counting carry-forward schema")` block:
  - `ENUM_STATEMENTS` contains exactly ``ALTER TYPE "public"."withdrawal_status" ADD VALUE IF NOT EXISTS 'cancelled';``
  - `TABLE_STATEMENTS` has a `CREATE TABLE IF NOT EXISTS "bank_signers"` and one for `"withdrawal_approvals"`
  - `TABLE_STATEMENTS` has `ADD COLUMN IF NOT EXISTS` for each of the 5 new `withdrawal_requests` columns and `bank_records.withdrawalRequestId`
  - `INDEX_STATEMENTS` contains the four index names above
- [x] **Step 2:** `pnpm exec vitest run server/schema_init.test.ts` → FAIL.
- [x] **Step 3:** Implement in all three places. In `0007`, add a header comment saying to run statements one at a time.
- [x] **Step 4:** Test PASS. `pnpm check` clean.
- [x] **Step 5:** Commit `feat(withdrawals): schema for bank signers and per-signer approvals`.

---

### Task 3: Bank signers (server)

**Files:** `server/db.ts`, `server/routers.ts` (new `bankSigners` router; `auth.me`). Test: `server/withdrawals.access.test.ts` (new; copy the `createContext` / user fixtures from `server/counting.access.test.ts`).

**Consumes:** Task 2 tables.
**Produces** (`server/db.ts`):
```ts
listBankSigners(churchId?): Promise<Array<{ userId: number; name: string | null; isRequired: boolean }>>
isBankSigner(userId: number, churchId?): Promise<{ isRequired: boolean } | null>
addBankSigner(userId: number, addedBy: number, churchId?): Promise<boolean>        // false if already a signer
removeBankSigner(userId: number, churchId?): Promise<boolean>
setRequiredBankSigner(userId: number, churchId?): Promise<boolean>                 // clears the old flag and sets the new one in one transaction
```
Router `bankSigners`:
- `list`: readable by finance roles (`canManageFinance`) or any signer. Everyone else gets `FORBIDDEN`.
- `add({ userId })`, `remove({ userId })`, `setRequired({ userId })`: SUPER_ADMIN only (use the existing `isSuperAdmin`-style check in `routers.ts`). Audit actions `SIGNER_ADD` / `SIGNER_REMOVE` / `SIGNER_REQUIRED`.

`auth.me` adds `isBankSigner: boolean` (false when there is no DB).

- [x] **Step 1: Failing tests** (no DB needed; they fail at auth before any query):
  - member, counter, treasurer and pastor calling `bankSigners.add` / `remove` / `setRequired` → `FORBIDDEN`
  - unauthenticated `bankSigners.list` → `UNAUTHORIZED`
  - `bankSigners.add({ userId: 0 })` as SUPER_ADMIN → `BAD_REQUEST` (zod `int().positive()`)
- [x] **Step 2:** Run → FAIL.
- [x] **Step 3:** Implement.
- [x] **Step 4:** Run → PASS. `pnpm check` clean.
- [x] **Step 5:** Commit `feat(withdrawals): manage bank signers`.

---

### Task 4: Sign, cancel, list

**Files:** `server/db.ts`, `server/routers.ts` (`withdrawals` router). Tests: `server/withdrawals.access.test.ts`, new `server/withdrawals.workflow.test.ts` (DB; copy the structure of `server/counting.workflow.test.ts`: `hasDb`, `describeDb`, `purgeTenant` in a file-level `afterAll`).

**Consumes:** `approvalState` (Task 1), `isBankSigner` (Task 3).
**Produces:**
- `withdrawals.sign({ id, decision: "approved" | "rejected", note?: string })`. `protectedProcedure`, then `isBankSigner(ctx.user.id)`; not a signer → `FORBIDDEN "เฉพาะผู้มีอำนาจลงนามในบัญชีธนาคาร"`. `rejected` without a note → `BAD_REQUEST`, enforced in the zod schema (`.refine`), because input parsing runs before the handler. In one `db.transaction`:
  1. load the request; not `pending` → `CONFLICT`
  2. insert the signature with `wasRequiredSigner` from the signer row; a unique violation → `CONFLICT "คุณลงนามคำขอนี้แล้ว"`
  3. read all signatures and run `approvalState`
  4. `approved` → compare-and-set `pending`→`approved` with `approvedBy = ctx.user.id`, `approvalDate = now`; `rejected` → CAS to `rejected` with `rejectionReason = note`
  5. audit `SIGN`

  Return `{ outcome }`.
- `withdrawals.cancel({ id, reason: z.string().trim().min(3).max(500) })`. Only the requester or a signer may cancel; anyone else → `FORBIDDEN`. Status must be `pending` / `approved`, otherwise `CONFLICT`. Sets `cancelled`, `cancelledAt`, `cancelledBy`, `cancelReason`. Audit `CANCEL`.
- `withdrawals.list`: signers see all requests, like finance roles. Each row gains `signatures: Array<{ userId; name; decision; note; createdAt; wasRequiredSigner }>` and `approval: ApprovalState`.
- Delete `withdrawals.approve`, the `canApproveWithdrawals` helper and `db.approveWithdrawal` once no caller remains. `client/src/pages/Approvals.tsx` is the only client caller and is rewritten in Task 6. Keep `pnpm check` green at commit time by stubbing the page call minimally, the same way Part 1's Task 1 did.

- [x] **Step 1: Failing tests**
  - access file (no DB): a non-signer member calling `withdrawals.sign` → `FORBIDDEN`. `sign` with `decision: "rejected"` and no note → `BAD_REQUEST`. `cancel` with a 1-character reason → `BAD_REQUEST`. **Note:** the FORBIDDEN case needs `isBankSigner` to return null, which happens with no DB. Assert only `code`.
  - workflow file (DB):
    - `"approves once the pastor and one more have signed"`: seed 3 signers (pastor required), a request from a member; sign as pastor → `pending`; sign as treasurer → `approved`; the third signer's `sign` → `CONFLICT`.
    - `"lets the requester's own signature count but still needs another"`: the pastor requests and signs → `pending`; the assistant signs → `approved`.
    - `"cancels on the first refusal"`: one approval then one rejection → `rejected`, and `rejectionReason` is set.
    - `"refuses a second signature from the same person"` → `CONFLICT`.
    - `"records both signatures when two signers press at once"` (Review Focus 1): `Promise.allSettled([sign(pastor), sign(treasurer)])` → both rows exist, status `approved`, and exactly one audit `SIGN` row ends in an `approved` transition. Assert on the status and the count of rows in `withdrawal_approvals`.
    - `"cancels before payout and refuses after"`.
- [x] **Step 2:** Run the access file → FAIL. The workflow file skips: record **NOT VERIFIED**.
- [x] **Step 3:** Implement.
- [x] **Step 4:** Access file PASS. `pnpm check` clean.
- [x] **Step 5:** Commit `feat(withdrawals): sign by bank signers, cancel, list signatures`.

---

### Task 5: Disburse into the counting round

**Files:** `server/db.ts` (`disburseWithdrawal`, `resetCountingSession`, `createCountingSession` caller), `server/routers.ts` (`withdrawals.disburse`, `counting.create`, guard `bank_records` with `withdrawalRequestId` against removal if any removal path exists). Tests: `server/withdrawals.workflow.test.ts`, `server/counting.workflow.test.ts`.

**Consumes:** `bank_records.withdrawalRequestId` (Task 2). The `withdrawal` bank record type and counting ordering `(serviceDate, serviceRound, id)` come from Part 1 (`findPreviousPostedSession` shows the tuple-compare pattern).
**Produces:**
```ts
attachWithdrawalToCounting(requestId: number, tx, churchId?): Promise<number | null>  // returns the counting session id or null
attachPendingWithdrawals(session: CountingSession, churchId?): Promise<number>        // returns how many were attached
```
- "Date" means the calendar date in Asia/Bangkok. Compare with `(... AT TIME ZONE 'Asia/Bangkok')::date` in SQL, or one helper in `shared/` if the codebase already has one; search `THAI_LOCALE` / `Asia/Bangkok` first.
- The target round is the first with status `counting|counted|verified` whose date is ≥ the `disbursedAt` date, ordered by `(serviceDate, serviceRound, id)`.
- `disburse` runs the status CAS (`approved`→`disbursed`, setting `disbursedAt` and `disbursedBy`) and the attach in **one transaction**. Audit `DISBURSE` with the attached session id (or null).
- `counting.create` calls `attachPendingWithdrawals` after creating the session: requests `disbursed` with no `bank_records` row whose `disbursedAt` date ≤ the session date.
- `resetCountingSession` keeps `bank_records` rows where `withdrawalRequestId` is not null.

- [x] **Step 1: Failing tests** (DB):
  - `"puts the payout into this Sunday's open round"`
  - `"waits for the next round when none is open, then attaches once"` (Review Focus 3): disburse, then `counting.create`; exactly one `withdrawal` row; a second `counting.create` for a later Sunday attaches nothing.
  - `"skips a round that is already posted"` (Review Focus 5)
  - `"keeps request-linked withdrawals when a round is reset"` (Review Focus 4), in `counting.workflow.test.ts`
- [x] **Step 2:** The suites skip without a DB: **NOT VERIFIED**. Still run `pnpm check`.
- [x] **Step 3:** Implement.
- [x] **Step 4:** `pnpm check` clean. `pnpm exec vitest run server/withdrawals.access.test.ts server/withdrawals.rules.test.ts` PASS.
- [x] **Step 5:** Commit `feat(withdrawals): payout lands in the counting round`.

---

### Task 6: Screens

**Files:** `client/src/pages/Approvals.tsx`, `client/src/pages/Settings.tsx` (new section), `client/src/pages/Home.tsx` + `client/src/pages/Home/taskQueue.ts`, `client/src/lib/routeAccess.ts`. Tests: `client/src/pages/Home/taskQueue.test.ts`, `server/routeAccess.matrix.test.ts`, new `client/src/pages/Approvals/SignatureProgress.test.tsx`.

**Consumes:** `withdrawals.list` rows with `signatures` and `approval`, `withdrawals.sign` / `cancel` / `disburse`, `bankSigners.*`, `auth.me().isBankSigner`.
**Produces:**
- `SignatureProgress` component (`client/src/pages/Approvals/SignatureProgress.tsx`), props `{ signatures, approval }`. Lists each signer's decision and time, and states what is missing: `"รอศิษยาภิบาลลงนาม"` when `!approval.requiredSignerApproved`, `"รออีก N คน"` when `approvedCount < MIN_APPROVALS`, `"ครบตามเงื่อนไขธนาคาร"` when approved.
- Approvals row actions:
  - อนุมัติ / ปฏิเสธ: only for a signer who hasn't signed and only while `pending`. ปฏิเสธ asks for a reason via `Swal`.
  - จ่ายแล้ว: finance roles, `approved` only. The confirm text says the amount goes into the next counting round.
  - ยกเลิก: requester or signer, `pending` / `approved`.
- Settings section "ผู้มีอำนาจลงนามบัญชีธนาคาร" (SUPER_ADMIN only): list, add from `auth.listUsers`, remove, mark the required signer. Show a warning when there is no required signer or fewer than 2 signers: "ยังอนุมัติคำขอเบิกไม่ได้ จนกว่าจะมีผู้ลงนามที่ต้องลงนามทุกครั้ง และรวมอย่างน้อย 2 คน".
- `TaskQueueInput.pendingWithdrawals` now means "requests waiting for **my** signature". `Home.tsx` computes it for signers as `pending` requests with no signature from `user.id`. Update the `withdrawals` row copy accordingly.
- `routeAccess.ts`: `/approvals` allows `canManageFinance(u) || canManageChurchSettings(u) || u?.isBankSigner === true`. Update `server/routeAccess.matrix.test.ts` with a signer case.

- [x] **Step 1: Failing tests**
  - `SignatureProgress`: `{ pastor approved }` → shows "รออีก 1 คน". `{}` → shows "รอศิษยาภิบาลลงนาม". Approved → "ครบตามเงื่อนไขธนาคาร".
  - `taskQueue.test.ts`: `pendingWithdrawals: 2` → the row's copy says it is waiting for your signature.
  - `routeAccess.matrix.test.ts`: a MEMBER with `isBankSigner: true` can open `/approvals`; one without cannot.
- [x] **Step 2:** Run those three files → FAIL.
- [x] **Step 3:** Implement. Remove any Task 4 stub.
- [x] **Step 4:** Those files PASS. `pnpm check` clean. `pnpm run ci` green. Browser check is **NOT VERIFIED** without a DB; say so.
- [x] **Step 5:** Commit `feat(withdrawals): signer screens, approvals progress, task queue`.

---

## Finish

- [x] `pnpm run ci` and `pnpm build` both exit 0. Revert `api/index.js` if the build rewrote it (`git checkout -- api/index.js`).
- [x] Push `feat/withdrawal-signers` and open a PR with **base `feat/counting-carry-forward`**. The body covers: why, what changes, Rulings (every deviation), NOT VERIFIED list (every skipped DB suite by name), and the deploy note: **"After deploying, a SUPER_ADMIN must add the three bank signers in Settings and mark the pastor as required; until then no withdrawal can be approved."**
- [x] Report to the user in Thai with VERIFIED / NOT VERIFIED / BLOCKER / NEXT labels.
