# GRACE BACKLOG

**Phase 0 backlog — no item is implemented by this document.** Priorities: P0 financial/security/data integrity; P1 critical workflow; P2 architecture/UX; P3 enhancement.

## P0 — financial correctness / security / data corruption

| ID | Finding/evidence | Action | Affected files/tables | Risk | Acceptance evidence | Status |
|---|---|---|---|---|---|---|
| P0-01 | Untracked `env` contains real-looking credentials and is not ignored like `.env` (`.gitignore:10-15`) | Rotate credentials; secure/remove file; add secret scanning; verify Git/Vercel history | `.gitignore`, env contract, CI | Secret incident; never print values | Secret scan clean; rotation evidence | OPEN |
| P0-02 | No RLS/policies; privileged direct DB and fixed tenant (`server/db.ts:58,60-68`) | Decide tenant model; implement RLS/grants or documented boundary; verify live DB | all tenant tables, context | High | Unauthorized access blocked | OPEN |
| P0-03 | `finance_accounts.balance` is mutable projection with no journal | Decide canonical ledger; introduce journal or formally define balance authority | offerings, expenses, funds, reports | High semantics | Balance equals approved postings | DECISION |
| P0-04 | Fund updates do not verify affected rows (`server/db.ts:497-501,651-655`) | Validate same-tenant active fund; rollback zero-row update; add constraints | funds, offerings, expenses | Medium/high | Invalid fund rejects; valid updates once | OPEN |
| P0-05 | Audit is outside financial transaction and lacks before/after (`db.ts:1011-1039`) | Make audit atomic; capture before/after/reason/actor; define retention | audit_logs, financial mutations | Medium/high | Failure leaves no financial effect | OPEN |
| P0-06 | Withdrawal disbursement has no fund/bank/ledger effect (`db.ts:863-880`) | Define accounting event; require fund/account and idempotent posting | withdrawals, funds, ledger | High decision | One traceable movement | DECISION |
| P0-07 | Expense status updates lack transition rules (`routers.ts:542-575`) | Define/enforce legal transitions | expenses/audit | Medium | Impossible transitions rejected | OPEN |

## P1 — critical workflow / architecture

| ID | Finding/evidence | Action | Affected files/tables | Risk | Acceptance evidence | Status |
|---|---|---|---|---|---|---|
| P1-01 | LINE/slip/OCR exists only as untracked migration; no webhook/worker/UI | Define integration contract; implement evidence ingestion, signature/idempotency, review | `0003`, schema, server/UI | High | Duplicate webhook one evidence item | BLOCKED |
| P1-02 | No evidence vs authoritative transaction separation | Define evidence, provenance, human approval, canonical transaction | new evidence/transaction tables | High | OCR never directly posts money | DECISION |
| P1-03 | No runtime member matching/explainability | Add candidate scores/reasons and confirmation | members/evidence/transaction | Medium | Low confidence unresolved | OPEN |
| P1-04 | One optional `fundId`; no split allocations | Add allocation model with sum invariant | offerings/allocations/funds | High | 2,000 split 1,500/500 posts once | DECISION |
| P1-05 | `counting_sessions` is not cross-channel batch | Decide aggregate relationship/lifecycle | counting/batch/bank | High | Totals include channels; close after reconcile | DECISION |
| P1-06 | Bank/deposit lacks account/statement identity | Add payment/deposit/account match workflow | bank_records/funds | High | Deposit reconciles with visible difference | OPEN |
| P1-07 | Journal excludes 0001–0004; untracked SQL not reproducible | Establish reviewed sequence and CI drift check | `drizzle/meta`, SQL | High | Empty DB reaches current schema | OPEN |
| P1-08 | No DB FK/check/tenant constraints found | Add references, positive amounts, same-tenant links, uniqueness | financial tables | Medium | Constraint probes reject invalid data | OPEN |
| P1-09 | Broad member/report/account reads (`routers.ts:319-321,674-677,739-755`) | Define role matrix; backend enforce least privilege | procedures/users/members | Medium | Unauthorized tests fail closed | OPEN |


## P2 — architecture / UX

| ID | Finding/evidence | Action | Affected files | Acceptance evidence | Status |
|---|---|---|---|---|---|
| P2-01 | No exception-first Giving Inbox | Build contextual queue after evidence model | App/routes/Home/Inbox | Review/unmatched/duplicate/low-confidence in one workspace | OPEN |
| P2-02 | Hand-rolled UI and dormant primitives drift | Define tokens/primitives; migrate incrementally | `components/ui`, CommonUI, pages | No duplicate primitive; accessibility checks | OPEN |
| P2-03 | Home does not lead with pending work | Reorder to exceptions/pending/financial status | Home components | First viewport answers what needs attention | OPEN |
| P2-04 | No browser/mobile acceptance suite | Add critical journey E2E at mobile/desktop widths | tests/pages | Scenarios 1–10 automated | OPEN |
| P2-05 | Documentation is stale | Update README/runbooks after decisions | docs/README | Architecture matches tree | OPEN |
| P2-06 | `window.confirm` and inconsistent page shells | Replace with accessible contextual workflow | Approvals/CommonUI | Keyboard/mobile confirmation tested | OPEN |

## P3 — enhancements

| ID | Item | Status |
|---|---|---|
| P3-01 | Add household/relationship model if required | DECISION REQUIRED |
| P3-02 | Add statement snapshots/period close | BLOCKED BY LEDGER |
| P3-03 | Add AI anomaly/insight layer using provenance only | BLOCKED |
| P3-04 | Remove/quarantine dead layouts and unused primitives | OPEN |

## Acceptance scenarios to track

1. Duplicate LINE slip → one evidence/financial effect.
2. OCR wrong amount → human review catches it.
3. Low-confidence member → remains unresolved.
4. Split gift → allocation total equals transaction total.
5. Approved edit → before/after audit exists.
6. Batch mismatch → difference visible and close blocked/explained.
7. Unauthorized giving history → backend denies.
8. Re-submit approved transaction → idempotency prevents duplicate effect.
9. Reversal → original remains and linked reversal exists.
10. Mobile reviewer completes evidence → approval without unnecessary navigation.

## Explicit non-goals for Phase 0

No code, migration, RLS policy, LINE/OCR provider, new page, or visual redesign is implemented until the forensic decisions are approved.
