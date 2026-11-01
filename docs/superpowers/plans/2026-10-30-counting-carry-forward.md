# Counting Carry-Forward Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let each offering-count round carry a cash-on-hand and a bank balance forward to the next round, and check both against reality (cash box count, passbook).

**Architecture:** Extend the existing `counting` feature. `shared/counting.ts#reconcile` gets the two-wallet formula; `counting_sessions` gains opening/closing figures that are frozen when a round is posted; `server/db.ts` resolves a round's opening balances from the previous posted round; the `CountingDetail` tabs show and collect the new figures.

**Tech Stack:** TypeScript, Drizzle (postgres-js), tRPC v11 + Zod, React 19, Vitest.

**Spec:** `docs/superpowers/specs/2026-10-30-counting-carry-forward-design.md`

## Global Constraints

- Money math in satang only (`toSatang` / `sumSatang` / `toBaht`); never add baht floats.
- Money persisted as decimal strings: `amount.toFixed(2)`; read back with the existing `num()` helper in `server/db.ts`.
- Every schema change goes into **both** `drizzle/schema.ts` and `server/schema_init.ts`. Generate the Drizzle migration with `pnpm exec drizzle-kit generate` (no DB needed); do not hand-write migration SQL. Do not run `pnpm db:push` / `migrate` against any database.
- Every query scoped by `churchId` (default `DEFAULT_CHURCH_ID`); every new mutation writes `createAuditLog` like its neighbours in the `counting` router.
- User-facing strings and error messages in Thai, matching the existing `counting` router tone.
- Work on branch `feat/counting-carry-forward`. Commit steps run only once the user has OK'd committing in the session (user's standing rule).
- Gate per task: `pnpm check` and `pnpm exec vitest run <files touched>`; final gate `pnpm run ci` (not `pnpm ci`).

## Review Focus

1. **Postgres enum values added to a live DB.** `bank_record_type` already exists in production; `CREATE TYPE ... EXCEPTION WHEN duplicate_object` will never add the new values. Needs `ALTER TYPE ... ADD VALUE IF NOT EXISTS`, each as its own statement. → test in Task 2.
2. **Two rounds on the same Sunday** (`serviceRound` 1 and 2). "Previous round" must order by `(serviceDate, serviceRound, id)`, not `serviceDate` alone. → test in Task 3.
3. **Previous posted round predates the feature** (`closingBank` null). Must not be treated as a zero opening; the new round must ask for manual opening balances. → test in Task 3.
4. **Withdrawal larger than everything else** making `closingCashExpected` negative. Must display the negative figure and a variance, not throw or clamp. → test in Task 1.
5. **Satang coins in opening / closing figures** (e.g. opening 1,000.75). Carry-forward must stay exact across rounds. → test in Task 1.

---

### Task 1: Two-wallet reconcile

**Files:**
- Modify: `shared/counting.ts` (types ~L47-100, `reconcile` ~L103-149, `checkDepositIdentity` ~L151-163)
- Test: `server/counting.reconcile.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export const BANK_RECORD_TYPES = ["transfer_in","cash_deposit","withdrawal","other_in","other_out"] as const;
  export type BankRecordType = (typeof BANK_RECORD_TYPES)[number];
  export interface BankRecordInput { amount: number; type: BankRecordType }
  export interface CarryForwardInput {
    openingCash: number | null;      // null = no opening known (legacy / not set)
    openingBank: number | null;
    cashOnHandActual: number | null;
    passbookBalance: number | null;
  }
  export interface ReconciliationInput { /* existing 4 fields */ carry?: CarryForwardInput }
  // Reconciliation: REMOVE expectedDeposit, depositVariance. ADD:
  //   hasCarryForward: boolean   (openingCash !== null && openingBank !== null)
  //   openingCash, openingBank: number | null
  //   withdrawalTotal, otherInTotal, otherOutTotal: number
  //   closingCashExpected, closingBankExpected: number | null   (null when !hasCarryForward)
  //   cashOnHandActual: number | null
  //   cashOnHandVariance: number | null   (actual − expected; null if either null)
  //   passbookBalance: number | null
  //   passbookVariance: number | null     (passbook − closingBankExpected; null if either null)
  // isBalanced = cashVariance === 0 && transferVariance === 0
  //              && (!hasCarryForward || cashOnHandVariance === 0)
  ```
  `checkDepositIdentity` is deleted. Keep `actualCashDeposit`, `actualTransferIn`.

- [ ] **Step 1: Rewrite the tests**

Delete the `checkDepositIdentity` import and every assertion on `expectedDeposit` / `depositVariance`. Replace the `describe("reconcile: the church's audit invariant")` block with `describe("reconcile: cash and bank carry forward")` containing:

```ts
const sunday = {
  envelopes: [{ amount: 8000, method: "cash" as const }],
  cashCounts: [{ denomination: 1000, kind: "note" as const, quantity: 8 }],
  deductions: [{ amount: 1500 }],
};

it("keeps part of the cash and deposits the rest", () => {
  const r = reconcile({ ...sunday,
    bankRecords: [{ amount: 5000, type: "cash_deposit" }],
    carry: { openingCash: 2000, openingBank: 50000, cashOnHandActual: 3500, passbookBalance: null } });
  expect(r.closingCashExpected).toBe(3500);   // 2000 + 8000 + 0 − 1500 − 5000
  expect(r.cashOnHandVariance).toBe(0);
  expect(r.closingBankExpected).toBe(55000);
  expect(r.passbookVariance).toBeNull();
  expect(r.isBalanced).toBe(true);
});

it("withdraws from the bank to cover a heavy week", () => {
  const r = reconcile({ ...sunday, deductions: [{ amount: 12000 }],
    bankRecords: [{ amount: 5000, type: "withdrawal" }],
    carry: { openingCash: 0, openingBank: 50000, cashOnHandActual: 1000, passbookBalance: 45000 } });
  expect(r.closingCashExpected).toBe(1000);   // 0 + 8000 + 5000 − 12000
  expect(r.closingBankExpected).toBe(45000);
  expect(r.passbookVariance).toBe(0);
});

it("counts fees, interest and bills on the bank side only", () => {
  const r = reconcile({ ...sunday, deductions: [],
    bankRecords: [{ amount: 12.5, type: "other_in" }, { amount: 30, type: "other_out" }],
    carry: { openingCash: 0, openingBank: 1000, cashOnHandActual: 8000, passbookBalance: null } });
  expect(r.closingBankExpected).toBe(982.5);
  expect(r.closingCashExpected).toBe(8000);
});

it("reports a short cash box as a negative variance and unbalanced", () => {
  const r = reconcile({ ...sunday, bankRecords: [],
    carry: { openingCash: 0, openingBank: 0, cashOnHandActual: 6000, passbookBalance: null } });
  expect(r.cashOnHandVariance).toBe(-500);
  expect(r.isBalanced).toBe(false);
});

it("shows a negative expected cash instead of clamping", () => {   // Review Focus 4
  const r = reconcile({ ...sunday, deductions: [{ amount: 20000 }], bankRecords: [],
    carry: { openingCash: 0, openingBank: 0, cashOnHandActual: 0, passbookBalance: null } });
  expect(r.closingCashExpected).toBe(-12000);
  expect(r.cashOnHandVariance).toBe(12000);
});

it("stays exact with satang in the opening figures", () => {        // Review Focus 5
  const r = reconcile({ ...sunday, deductions: [], bankRecords: [],
    carry: { openingCash: 1000.75, openingBank: 0.25, cashOnHandActual: 9000.75, passbookBalance: 0.25 } });
  expect(r.closingCashExpected).toBe(9000.75);
  expect(r.cashOnHandVariance).toBe(0);
  expect(r.passbookVariance).toBe(0);
});

it("leaves carry-forward figures empty for a round without an opening", () => {
  const r = reconcile({ ...sunday, bankRecords: [] });
  expect(r.hasCarryForward).toBe(false);
  expect(r.closingCashExpected).toBeNull();
  expect(r.isBalanced).toBe(true);   // cash and transfer variances are 0
});

it("does not let a passbook difference unbalance the round", () => {
  const r = reconcile({ ...sunday, bankRecords: [],
    carry: { openingCash: 0, openingBank: 0, cashOnHandActual: 6500, passbookBalance: 999 } });
  expect(r.passbookVariance).toBe(999);
  expect(r.isBalanced).toBe(true);
});
```

Keep the existing denomination, `canTransition`, `isEditable` and `toSatang` tests unchanged.

- [ ] **Step 2: Run and see it fail**

Run: `pnpm exec vitest run server/counting.reconcile.test.ts`
Expected: FAIL (`closingCashExpected` undefined / type errors on `carry`).

- [ ] **Step 3: Implement in `shared/counting.ts`**

Add `BANK_RECORD_TYPES`, `BankRecordType`, `CarryForwardInput`, `carry?` on `ReconciliationInput`, the new `Reconciliation` fields; compute everything in satang inside `reconcile`. Delete `expectedDeposit`, `depositVariance`, `checkDepositIdentity`. Replace the "invariant the church audits against" doc comment with the cash-wallet formula from the spec.

- [ ] **Step 4: Run tests and typecheck**

Run: `pnpm exec vitest run server/counting.reconcile.test.ts` → PASS
Run: `pnpm check` → expected errors only in files Tasks 3–5 own (`server/db.ts`, `BankRecordsTab.tsx`, `ReconciliationSummaryTab.tsx`, `CountingDetail.tsx`) that reference removed fields. Fix the client references minimally now (remove the `expectedDeposit`/`depositVariance` rows) so `pnpm check` is clean; Task 5 rebuilds that UI.

- [ ] **Step 5: Commit**

```bash
git add shared/counting.ts server/counting.reconcile.test.ts client/src/pages/CountingDetail
git commit -m "feat(counting): two-wallet reconcile with cash and bank carry-forward"
```

---

### Task 2: Schema

**Files:**
- Modify: `drizzle/schema.ts` (`bankRecordTypeEnum` L97, `countingSessions` L479-505)
- Modify: `server/schema_init.ts` (`ENUM_STATEMENTS`, `TABLE_STATEMENTS` after `counting_sessions`)
- Create: generated migration under `drizzle/` (via drizzle-kit)
- Test: `server/schema_init.test.ts`

**Interfaces:**
- Consumes: `BANK_RECORD_TYPES` (Task 1) — `bankRecordTypeEnum` uses it.
- Produces: `countingSessions` columns, all `decimal(15,2)` nullable unless noted: `openingCash`, `openingBank`, `closingBank`, `cashOnHandActual`, `passbookBalance`; `passbookBalanceDate: timestamp` nullable.

- [ ] **Step 1: Write the failing test** in `server/schema_init.test.ts`

```ts
import { ENUM_STATEMENTS, TABLE_STATEMENTS } from "./schema_init";

describe("counting carry-forward schema", () => {
  it("adds the new bank record types to an existing enum", () => {   // Review Focus 1
    for (const v of ["withdrawal", "other_in", "other_out"]) {
      expect(ENUM_STATEMENTS).toContain(
        `ALTER TYPE "public"."bank_record_type" ADD VALUE IF NOT EXISTS '${v}';`
      );
    }
  });
  it("adds the carry-forward columns to existing counting_sessions", () => {
    for (const col of ["openingCash", "openingBank", "closingBank", "cashOnHandActual", "passbookBalance", "passbookBalanceDate"]) {
      expect(TABLE_STATEMENTS.some(s =>
        s.includes(`ALTER TABLE "counting_sessions" ADD COLUMN IF NOT EXISTS "${col}"`))).toBe(true);
    }
  });
});
```

- [ ] **Step 2: Run and see it fail** — `pnpm exec vitest run server/schema_init.test.ts` → FAIL.

- [ ] **Step 3: Implement**

`ENUM_STATEMENTS`: three `ALTER TYPE ... ADD VALUE IF NOT EXISTS` lines placed after the `bank_record_type` CREATE (each a separate array entry — `ADD VALUE` cannot share a `DO` block). `TABLE_STATEMENTS`: six `ALTER TABLE "counting_sessions" ADD COLUMN IF NOT EXISTS ...` entries after the `counting_sessions` CREATE, following the `users` ALTER pattern at L42-46. Mirror in `drizzle/schema.ts`. Then `pnpm exec drizzle-kit generate`.

- [ ] **Step 4: Verify** — `pnpm exec vitest run server/schema_init.test.ts` → PASS; `pnpm check` → clean.

- [ ] **Step 5: Commit**

```bash
git add drizzle server/schema_init.ts server/schema_init.test.ts
git commit -m "feat(counting): schema for carry-forward balances and new bank record types"
```

---

### Task 3: Opening balances and closing figures (server)

**Files:**
- Modify: `server/db.ts` (`getCountingSessionDetail` L1694-1754; add helpers near it)
- Modify: `server/routers.ts` (`counting` router: `addBankRecord` L1495, new procedures after `matchPassbook`)
- Test: `server/counting.workflow.test.ts`, `server/counting.access.test.ts`

**Interfaces:**
- Consumes: `CarryForwardInput`, `BANK_RECORD_TYPES` (Task 1); columns (Task 2).
- Produces (`server/db.ts`):
  ```ts
  export async function findPreviousPostedSession(session: CountingSession, churchId?): Promise<CountingSession | null>
  // latest posted/closed row ordered by (serviceDate, serviceRound, id) strictly before `session`
  export async function findEarlierUnpostedSession(session: CountingSession, churchId?): Promise<CountingSession | null>
  // earliest row before `session` (same ordering) with status counting|counted|verified
  export async function resolveOpeningBalances(session: CountingSession, churchId?):
    Promise<{ openingCash: number; openingBank: number; source: "stored" | "previous" } | null>
  // stored = session.openingCash/openingBank non-null; else previous posted session's
  // cashOnHandActual + closingBank when both non-null; else null (legacy prev or first round)
  export async function setCountingCarryFields(id: number, fields: Partial<Pick<InsertCountingSession,
    "openingCash"|"openingBank"|"cashOnHandActual"|"passbookBalance"|"passbookBalanceDate">>, churchId?): Promise<boolean>
  ```
  `getCountingSessionDetail` returns `openingSource: "stored" | "previous" | null` and passes `carry` to `reconcile`.
- Produces (router):
  - `counting.setOpeningBalances` — `financeProcedure`, input `{ id, openingCash: z.number().nonnegative(), openingBank: z.number() }`. `CONFLICT` if session posted/closed or `resolveOpeningBalances` already returns non-null. Audit action `"SET_OPENING"`.
  - `counting.setClosingFigures` — `financeProcedure`, input `{ id, cashOnHandActual?: z.number().nonnegative().nullable(), passbookBalance?: z.number().nullable(), passbookBalanceDate?: z.coerce.date().nullable() }`. `CONFLICT` if posted/closed. Audit action `"SET_CLOSING"`.
  - `addBankRecord.type` becomes `z.enum(BANK_RECORD_TYPES)`.

- [ ] **Step 1: Write failing tests**

`server/counting.access.test.ts` (no DB): a `MEMBER` and a counter-only user calling `setOpeningBalances` / `setClosingFigures` reject with `FORBIDDEN`.

`server/counting.workflow.test.ts`, new `describeDb("counting workflow: carry forward", …)` using the file's existing helpers and tenant:
- `it("asks for opening balances on the first round")` → `get` shows `reconciliation.hasCarryForward === false`, `openingSource === null`; `setOpeningBalances({ openingCash: 2000, openingBank: 50000 })` then `openingSource === "stored"`; a second `setOpeningBalances` rejects `CONFLICT`.
- `it("records a withdrawal and other bank items")` → `addBankRecord` with `withdrawal`, `other_in`, `other_out` succeeds and shows in `reconciliation.withdrawalTotal` etc.
- `it("rejects a negative cash-on-hand figure")` → `setClosingFigures({ cashOnHandActual: -1 })` rejects `BAD_REQUEST`.
- `it("orders two rounds on the same Sunday by serviceRound")` (Review Focus 2) → after Task 4 posts round 1, round 2 on the same date gets `openingSource === "previous"` from round 1. *(Write it now; it passes after Task 4.)*
- `it("does not carry forward from a pre-feature round")` (Review Focus 3) → seed a posted session with `closingBank` null via `db` directly, create the next round, assert `openingSource === null`.

- [ ] **Step 2: Run and see them fail**

Run: `pnpm exec vitest run server/counting.access.test.ts` → FAIL. Workflow file skips without `DATABASE_URL`; note it as **NOT VERIFIED** unless a throwaway DB is available.

- [ ] **Step 3: Implement** the db helpers and procedures above. Reuse `requireCountingSession`, `num()`, `createAuditLog`.

- [ ] **Step 4: Verify** — `pnpm exec vitest run server/counting.access.test.ts server/counting.reconcile.test.ts` → PASS; `pnpm check` → clean.

- [ ] **Step 5: Commit**

```bash
git add server/db.ts server/routers.ts server/counting.workflow.test.ts server/counting.access.test.ts
git commit -m "feat(counting): resolve opening balances and record closing figures"
```

---

### Task 4: Post guards and freezing the carry-forward

**Files:**
- Modify: `server/routers.ts` (`counting.post` ~L1712-1776)
- Modify: `server/db.ts` (`postCountingSession` L1976)
- Test: `server/counting.workflow.test.ts`

**Interfaces:**
- Consumes: `findEarlierUnpostedSession`, `resolveOpeningBalances`, `getCountingSessionDetail` (Task 3).
- Produces: `postCountingSession(id, postedBy, carry: { openingCash: number; openingBank: number; closingBank: number }, churchId?)` — writes the three columns in the same `update ... set` that claims `status: "posted"`.

- [ ] **Step 1: Write failing tests** (same `carry forward` describe):
- `it("will not post without the cash box count")` → `post` on a verified round with `cashOnHandActual` null rejects `BAD_REQUEST`.
- `it("will not post a round while an earlier one is still open")` → `CONFLICT`, message names the earlier `serviceDate`.
- `it("will not post without opening balances")` → first round, no `setOpeningBalances` → `BAD_REQUEST`.
- `it("carries round 1's closing figures into round 2")` → post round 1 (opening 2000/50000, envelopes 8000 cash, deduction 1500, deposit 5000, cash on hand 3500); round 2 `get` → `reconciliation.openingCash === 3500`, `openingBank === 55000`, `openingSource === "previous"`.
- `it("freezes opening balances when posted")` → after posting round 2, read its row directly: `openingCash === "3500.00"`, `openingBank === "55000.00"`, `closingBank` non-null; `get` reports `openingSource === "stored"`.

Update the existing `describeDb("counting workflow: an unbalanced session")` and the main workflow `post` cases so they first call `setOpeningBalances` and `setClosingFigures` (otherwise the new guards reject them).

- [ ] **Step 2: Run and see them fail** — needs DB; otherwise **NOT VERIFIED**, rely on `pnpm check`.

- [ ] **Step 3: Implement** — in `post`, after the existing status/deduction checks and before the variance-note check: `cashOnHandActual` null → `BAD_REQUEST "ต้องนับเงินสดคงเหลือในกล่องก่อนลงบัญชี"`; earlier unposted → `CONFLICT "ต้องลงบัญชีรอบวันที่ … ก่อน"`; `resolveOpeningBalances` null → `BAD_REQUEST "ต้องกรอกยอดยกมาก่อนลงบัญชี"`. Pass `{ openingCash, openingBank, closingBank: reconciliation.closingBankExpected }` to `postCountingSession`.

- [ ] **Step 4: Verify** — `pnpm check` clean; `pnpm exec vitest run server/counting.*.test.ts` → PASS (workflow skipped without DB).

- [ ] **Step 5: Commit**

```bash
git add server/routers.ts server/db.ts server/counting.workflow.test.ts
git commit -m "feat(counting): require cash count and in-order posting, freeze carry-forward"
```

---

### Task 5: Counting screen

**Files:**
- Modify: `client/src/pages/CountingDetail/components/BankRecordsTab.tsx` (type select L47-48, L111-112, label L194)
- Modify: `client/src/pages/CountingDetail/components/ReconciliationSummaryTab.tsx`
- Modify: `client/src/pages/CountingDetail.tsx` (wire the two new mutations, pass `openingSource`)

**Interfaces:**
- Consumes: `counting.get` output (`reconciliation` fields from Task 1, `openingSource`), `counting.setOpeningBalances`, `counting.setClosingFigures`, `BANK_RECORD_TYPES`.

- [ ] **Step 1: BankRecordsTab** — select options and row labels for all five types: `cash_deposit` นำเงินสดเข้าฝาก, `transfer_in` สมาชิกโอนเข้าบัญชี, `withdrawal` ถอนเงินสดจากธนาคาร, `other_in` เงินเข้าอื่นๆ (ดอกเบี้ย ฯลฯ), `other_out` เงินออกอื่นๆ (ค่าธรรมเนียม โอนจ่ายบิล). Make `notes` required in the form for `other_in` / `other_out`.

- [ ] **Step 2: ReconciliationSummaryTab** — two cards using existing `ui/` primitives and `fmtBaht`:
  - **เงินสดในมือ**: ยกมา, + ถวายเงินสด, + ถอนจากธนาคาร, − ค่าใช้จ่าย, − นำฝาก, = ยกไป (คำนวณ), input "นับเงินสดในกล่องได้จริง" (`cashOnHandActual`), variance coloured when ≠ 0.
  - **บัญชีธนาคาร**: ยกมา, + โอนเข้า, + นำฝาก, + เข้าอื่นๆ, − ถอน, − ออกอื่นๆ, = ยกไป (คำนวณ), inputs "ยอดล่าสุดในสมุดบัญชี" + date, difference shown as information (not an error colour), and "ยังไม่ได้ติ๊กสมุดบัญชี N รายการ" from `bankRecords.filter(r => !r.passbookMatched).length`.
  - `openingSource === null` and session not posted: finance users see a "กรอกยอดยกมา (ครั้งแรก)" form → `setOpeningBalances`; others see "รอฝ่ายการเงินกรอกยอดยกมา".
  - Posted session with `hasCarryForward === false`: single line "รอบนี้สร้างก่อนมีการยกยอด".
  - Inputs disabled once status is `posted`/`closed`.

- [ ] **Step 3: Verify** — `pnpm check` clean; `pnpm exec vitest run client` → PASS. Run `pnpm dev`, open a counting round, walk the first-round → post → second-round path. Without a DB this cannot be exercised end-to-end: report as **NOT VERIFIED** and say so.

- [ ] **Step 4: Final gate** — `pnpm run ci` → typecheck + all tests pass (DB suites skipped).

- [ ] **Step 5: Commit**

```bash
git add client/src/pages/CountingDetail.tsx client/src/pages/CountingDetail/components
git commit -m "feat(counting): show cash and bank carry-forward on the counting screen"
```
