# GRACE GIVING — PHASE 0 SYSTEM FORENSICS

**Audit date:** 2026-09-24  
**Repository:** `Suriyong1993/Graceful-giving`  
**Scope:** current working tree, tracked and untracked files  
**Change policy:** documentation only; no application code, migration, database data, or production configuration was modified.

## Executive verdict

Grace Giving is a working financial-management prototype with valuable controls, but it is **not yet a production-grade giving operations platform**. Its strongest implemented domain is weekly offering counting: shared satang arithmetic, role boundaries, separation of counter/verifier, variance explanation, compare-and-set posting, and history-preserving voids.

The highest blockers are financial and security concerns, not visual polish:

1. `finance_accounts.balance` is a mutable projection maintained only by application code; there is no immutable double-entry/journal source of truth.
2. Fund updates do not verify that a matching same-tenant fund row was updated, so an invalid `fundId` can create a transaction with no financial-account effect.
3. Audit insertion is separate from financial mutation transactions and does not store before/after snapshots.
4. No repository RLS/policies exist; authorization is application-only, while the tenant is hardcoded to `demo-church`.
5. LINE/slip/OCR is not an implemented runtime workflow. An untracked migration proposes evidence, matching, and idempotency tables, but current `schema.ts`, router, webhook handler, worker, and UI do not use them.
6. Live database/RLS state could not be verified because the configured host could not resolve. No live schema claim is made.
7. An untracked nonstandard environment file contains real-looking credentials and is not covered by `.env`; values were not copied into this report.

## Evidence status vocabulary

- **Verified in source:** directly supported by a cited file/line.
- **Design/runtime proposal:** only in an untracked SQL migration or documentation.
- **Unverified:** depends on live database, deployment environment, external integration, or browser.
- **Ambiguous:** business semantics are not defined well enough to change safely.

## A. Current architecture

- Full-stack TypeScript monolith: React 19/Vite SPA plus Express/tRPC server (`package.json:6-13`, `server/_core/app.ts:1-24`).
- Development and production are two entry paths; Vercel builds `api/index.js` as a serverless artifact and `dist/` as the Node application (`package.json:8`).
- Server domain logic is concentrated in `server/routers.ts` and `server/db.ts`; client and server share `AppRouter` types through `client/src/lib/trpc.ts`.
- PostgreSQL is accessed through Drizzle/postgres-js with a cached connection (`server/db.ts:60-75`).
- The app is effectively single-tenant: `DEFAULT_CHURCH_ID = "demo-church"` is used throughout routers (`server/db.ts:58`, `server/routers.ts:296-300,488-498,603-607,674-677,741-755`).
- Database access is missing/unreachable-tolerant: some reads return empty arrays when no DB is available (`server/db.ts:60-75,407-417`).
- The working tree is not the same as `origin/main`; it contains modified tracked files and untracked migrations/components/docs. This report audits the current tree, not a clean commit.

## B. Current user journeys

### Auth and setup

1. Clerk renders login/register (`client/src/main.tsx:77-83`, `client/src/pages/Login.tsx`, `client/src/pages/Register.tsx`).
2. Client sends a Clerk bearer token to tRPC (`client/src/main.tsx:47-60`).
3. Backend verifies the token and resolves/upserts a local user (`server/_core/sdk.ts:12-64`).
4. `AuthGate` redirects unauthenticated users (`client/src/App.tsx:41-71`).
5. Incomplete church setup redirects to `/setup` (`client/src/App.tsx:83-116`).

### Manual giving

`/offerings/new` → tRPC `offerings.create` → insert `offerings` → increment `finance_accounts.balance` if `fundId` exists → audit insert (`client/src/App.tsx:148-155`; `server/routers.ts:378-418`; `server/db.ts:486-505`).

### Weekly cash/batch-like count

`/counting` → create `counting_sessions` → add `offering_envelopes` and `cash_counts` → add bank records/deductions/documents → submit count (`counted`) → separate treasurer verifies (`verified`) → post creates `offerings` and approved `expenses` → close (`shared/counting.ts:166-193`; `server/routers.ts:936-1508`; `server/db.ts:1616-1707`).

This is a **counting round**, not yet a complete giving batch: it has no explicit batch entity or direct LINE/online-giving input workflow.

### Expenses and approvals

Manual expenses are created already `approved`; later updates can change status (`server/routers.ts:499-576`). Withdrawal requests have pending/approved/rejected/disbursed statuses, but disbursement changes only status and has no bank/fund/ledger effect (`drizzle/schema.ts:306-334`; `server/db.ts:863-880`).

### Reporting

Reports directly aggregate `offerings` and `expenses`; fund balances are read from `finance_accounts` (`server/routers.ts:736-780`; `server/db.ts:1052-1104,1729-1819`). There is no separate ledger statement or immutable journal.


## C. Current financial lifecycle

```text
Manual offering -> ACTIVE offering -> optional update -> optional VOID
Manual expense  -> APPROVED expense -> optional update -> optional VOID
Counting session -> COUNTING -> COUNTED -> VERIFIED -> POSTED -> CLOSED
Withdrawal      -> PENDING -> APPROVED/REJECTED -> DISBURSED
```

Counting transitions are centralized and tested (`shared/counting.ts:166-193`; `server/counting.reconcile.test.ts:222-254`). Posting uses a compare-and-set update from `verified` to `posted`, preventing a second post at the application level (`server/db.ts:1624-1640`).

Risks: manual offerings are effective immediately; manual expenses start `approved`; finance roles can broadly change expense status; withdrawal disbursement has no accounting effect; the offering update path excludes only `voided`; void is not modeled as an immutable reversal (`server/routers.ts:499-576`; `server/db.ts:507-555,863-880`).

## D. Current database model

| Domain | Tables | Notes |
|---|---|---|
| Identity | `users` | Global user; no `churchId`; coarse `role` plus `churchRole` (`schema.ts:111-128`). |
| Church/member | `church_profiles`, `members` | PII and envelope number; no household entity (`schema.ts:142-190`). |
| Giving | `offerings` | Amount, category, one optional fund, donor, method, reference, status (`schema.ts:253-278`). |
| Spending | `expenses`, `withdrawal_requests` | No general journal (`schema.ts:285-334`). |
| Funds/budget | `finance_accounts`, `budget_plans` | Mutable balance; no allocation table (`schema.ts:228-246,336-358`). |
| Weekly count | `counting_sessions`, `offering_envelopes`, `cash_counts`, `session_deductions`, `bank_records`, `session_documents` | Operational model, but no FK/check constraints found (`schema.ts:413-580`). |
| Operations | `audit_logs`, `notifications` | Metadata only; no before/after/reason or immutability (`schema.ts:195-224`). |

Migrations `0000`–`0002` are tracked; `0003` and `0004` are untracked. The journal registers only `0000` (`drizzle/meta/_journal.json:4-12`). Repository SQL contains no foreign keys, check constraints, RLS enablement, or policies based on the Phase 0 scan.

## E. Source-of-truth audit

| Concept | Current authority | Duplication/drift risk | Required decision |
|---|---|---|---|
| Person | `users` for login; `members` for directory | No identity link | Add stable person/member linkage |
| Household | None | Cannot represent family grouping | Decide if required |
| Giving evidence | Session documents only | Untracked `line_slips` proposes another model | Define immutable evidence |
| Giving transaction | `offerings` | Counted envelopes become offerings after posting | Define authoritative/posted state |
| Fund | `finance_accounts` | Balance is mutable projection | Keep definition separate from balance |
| Allocation | One optional `fundId` | No split allocation or DB equality constraint | Add validated allocation model |
| Batch | `counting_sessions` | Service count, not cross-channel batch | Decide subtype vs separate aggregate |
| Payment/deposit | `bank_records` | No bank account/statement identity | Define payment/deposit semantics |
| Ledger entry | None | `offerings`/`expenses` act as ledger substitutes | Define immutable journal |
| Statement | Dynamic reports | No frozen auditable statement | Define period close |
## F. Authentication / authorization

- Clerk token verification and local upsert are real (`server/_core/sdk.ts:12-64`).
- `protectedProcedure`, `adminProcedure`, finance, church-leader, counter, and verification helpers exist (`server/_core/trpc.ts:13-45`; `server/routers.ts:82-166`).
- Count verification blocks self-verification (`server/routers.ts:1365-1376`).
- Donor names are masked in offering reads for non-finance users (`server/db.ts:434-447,470-483`).
- Members list/detail is available to any protected user (`server/routers.ts:674-677`), including phone/email/notes; this needs an explicit least-privilege policy.
- `finance.accounts` is protected but not finance-gated (`server/routers.ts:319-321`); report read routes are protected only (`server/routers.ts:739-755`).
- No user-to-church membership/tenant table is present; `users` has no `churchId` (`schema.ts:111-128`).

## G. RLS

**Not verified / not present in repository.** No RLS enablement, policies, or `auth.uid()` definitions were found in tracked SQL. The direct privileged DB connection does not set tenant context (`server/db.ts:60-68`). Live inspection failed because the configured host could not resolve; live policies/grants are unknown, not assumed absent.

## H. LINE integration

**Not implemented in current runtime source.** No verified LINE webhook route, signature validation, event storage function, queue worker, or LINE UI exists. Untracked `drizzle/0003_line_event_idempotency.sql:20-103` proposes `line_slips`, jobs, unique event/reference indexes, extracted AI fields, matching, approval, and offering link. This is a migration proposal, not a working integration. Unknowns: webhook contract/secret, event schema, image storage, retry/dead-letter policy, retention, and whether LINE is the only source.

## I. OCR pipeline

**Not implemented in current runtime source.** The untracked migration stores raw text, parsed values, confidence, bank/reference, and sender fields, which is directionally appropriate for provenance, but no provider, parser, confidence policy, review mutation, or immutable evidence contract exists. AI must remain a suggestion; no runtime flow currently establishes that boundary.

## J. Member matching

**Not implemented for LINE slips.** Members have `envelopeNo`, name, phone, email, and an untracked migration proposes `lineUserId`, but no runtime matching function, candidate scoring, explainability, or human confirmation route exists. A financial identity must not be inferred from an unconfirmed suggestion.

## K. Approval workflow

Withdrawal approval/disbursement is role-gated and conditional on status (`server/routers.ts:629-671`; `server/db.ts:820-880`); deduction approval is role-gated; count verification is separate. Missing: maker-checker enforcement for withdrawals, explicit reason/rejection semantics in all paths, evidence review, and an authoritative transaction state machine for offerings/expenses.

## L. Batch workflow

`counting_sessions` is a useful operational batch for envelopes/cash/bank records and has a state machine. It is not a cross-channel giving batch and does not include LINE, online, manual, and deposit reconciliation as first-class inputs. Introduce a batch aggregate only after deciding whether a counting session is a subtype or separate aggregate.

## M. Fund workflow

Funds are `finance_accounts` with mutable `balance`; offering/expense mutations adjust it in the same application transaction but do not assert affected-row count (`server/db.ts:486-505,640-658,1616-1707`). Counting envelopes require `fundId`; direct offering/expense router inputs leave it optional (`server/routers.ts:378-389,499-510,986-1018`). No split allocation, transfer, or period-close model exists.

## N. Ledger integration

No immutable journal, double-entry, posting batch, or bank reconciliation ledger exists. Reports and dashboard sums query `offerings`/`expenses`; fund balances are a separate mutable projection (`server/db.ts:1052-1104,1729-1819`). This is the highest architectural ambiguity and must be decided before new financial workflows are built.

## O. Audit trail

`audit_logs` stores church, user, action, entity, optional entity ID, metadata, timestamp (`schema.ts:211-224`). Router create/update/void and counting transitions call it in several places, but not every financial mutation is covered. Metadata is not guaranteed before/after/why, and audit insert is outside the financial transaction. No read API, retention policy, immutability, or tamper evidence exists.

## P. UI architecture

Top-level routes are a flat Wouter switch (`client/src/App.tsx:135-200`). Production pages mostly use `AppLayout`; `Home` is a custom dashboard with tabs/dialogs. The shipped UI is hand-rolled with hardcoded colors, while `components/ui/*` is a mostly dormant Radix/shadcn-style library (`FIGMA_DESIGN_SYSTEM_RULES.md:8-51`). Mobile bottom navigation exists, but no browser/device acceptance suite covers critical flows.

## Q. Technical debt

- Current tree is dirty and diverged from `origin/main`; do not build a clean Phase 1 on an ambiguous baseline.
- `drizzle/meta/_journal.json` does not include `0001`–`0004`; migration process is not reproducible from the journal.
- Untracked migrations, docs, components, generated API artifact, and local env file are not a reviewable release unit.
- `api/index.js` is a generated/deployed artifact and tracked; stale artifact risk must be controlled.
- Repeated `parseFloat`/JS-number aggregation paths can introduce decimal representation issues even though counting uses satang.
- `getDb()` silently returns null/empty reads in some paths, which can look like empty production (`server/db.ts:60-75`).
- No lint script exists; `CLAUDE.md:28` documents typecheck/format instead.
- README and `FINAL_ENGINEERING_VERIFICATION.md` describe older baselines and cannot serve as current evidence.

## R. Duplicate concepts / risks

- `offerings`/`expenses` act as operational records and report/ledger inputs; `finance_accounts.balance` is a second financial truth.
- `counting_sessions` and untracked `line_slips` both propose transaction-like lifecycle/approval data, but neither is connected.
- `withdrawal_requests` and `session_deductions` both represent spending approval flows with different semantics.
- `offering_envelopes` and `offerings` duplicate amount/category/method/member/fund fields without an explicit derivation/version marker.
- Dormant UI primitives and hand-rolled production controls create interaction/accessibility drift.
- `env` and `.env.example` describe different authentication contracts; runtime uses Clerk while older CLAUDE documentation mentions OAuth/Manus (`CLAUDE.md:30-35`; `.env.example:1-7`).

## S. Risky financial logic

1. Invalid/missing fund effect: `UPDATE finance_accounts` result is not checked (`server/db.ts:497-501,651-655`).
2. A missing/incorrect `fundId` can make reports and fund balances disagree.
3. `finance_accounts.balance` can drift if any path bypasses paired mutation.
4. Direct and counting-posting paths can duplicate financial semantics.
5. Expense status is mutable without transition guards (`server/routers.ts:542-575`).
6. Withdrawal disbursement lacks a financial-account movement (`server/db.ts:863-880`).
7. Audit writes are not atomic and lack before/after snapshots.
8. Reversal is represented by void/status changes, not an immutable linked reversal.
9. No DB checks/FKs/tenant constraints were found to backstop invariants.
10. Database failure can degrade to empty data, risking false operational confirmation.

## T. Incomplete workflows and acceptance coverage

- LINE slip → evidence → OCR → candidate → review → approval: absent runtime.
- Duplicate slip prevention: proposed only in untracked migration; no tested worker.
- OCR wrong amount: no runtime review flow.
- Low-confidence member: no matching flow.
- Split fund allocation: unsupported.
- Approved transaction correction: partial audit; before/after absent.
- Cross-channel batch discrepancy: absent.
- Unauthorized giving history: donor-name masking exists; member/expense/report/storage access needs explicit backend tests.
- Duplicate submission: counting post has compare-and-set; direct offerings have only proposed untracked unique reference index.
- Reversal: no immutable reversal workflow.
- Mobile review: no browser-level evidence.

## Phase 0 validation evidence

- Targeted Vitest: **45 passed** (`counting.reconcile`, `security.regression`, `no-mock-data`).
- `pnpm check`: **passed**.
- Full `pnpm build` exceeded the tool's 30-second command window; no completed pass result is claimed.
- Read-only live metadata query: **unavailable**, host resolution failed; no migrations were run.

## Phase 0 stop decision

Stop here. Do not implement Phase 1 until the product owner decides: (a) canonical ledger model, (b) fund/allocation invariants, (c) tenant/RLS strategy, (d) evidence/OCR/LINE contract, and (e) whether counting sessions are batches or subtypes.

## Evidence index (selected)

- Identity/auth: `drizzle/schema.ts:111-128`; `server/_core/sdk.ts:12-64`; `server/_core/trpc.ts:13-45`.
- Financial tables: `drizzle/schema.ts:211-358`.
- Counting tables: `drizzle/schema.ts:413-580`.
- Financial mutations: `server/db.ts:486-555,640-880,1616-1707`.
- API permissions: `server/routers.ts:82-196,236-346,936-1508`.
- Routes: `client/src/App.tsx:135-200`.
- Proposed LINE model: untracked `drizzle/0003_line_event_idempotency.sql:20-103`.
- Existing audits: `PRODUCTION_ENGINEERING_AUDIT.md:20-84`; `FINAL_ENGINEERING_VERIFICATION.md:8-80`.

| Payment/deposit | `bank_records` | No bank account/statement identity | Define payment/deposit semantics |
| Ledger entry | None | `offerings`/`expenses` act as ledger substitutes | Define immutable journal |
| Statement | Dynamic reports | No frozen auditable statement | Define period close |

