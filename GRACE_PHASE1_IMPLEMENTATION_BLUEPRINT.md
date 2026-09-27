# Grace Phase 1 Implementation Blueprint

**Date:** 2026-09-24  
**Status:** Planning artifact only; no implementation authorized by this document.  
**Inputs:** Phase 0 forensics, adaptation matrix, backlog, worklog, and Architecture Decision Gate.

## Executive Summary

Phase 1 establishes the financial foundation required by the approved architecture: an explicit tenant boundary, hybrid transaction + immutable journal model, allocations, batch/counting semantics, atomic audit, and evidence contracts. It does not build LINE/OCR UI, redesign screens, or create a provider-specific integration.

The implementation order is dependency-driven: tenant/foundation → financial core → allocation → batch/counting → approval/audit → evidence → security/RLS → projections/frontend integration. No migration is safe until existing balances and financial rows have a documented, tested backfill and reconciliation strategy.

**Non-goals for Phase 1:** copy another product; create a general ledger UI; choose an OCR vendor; hard-delete financial history; silently edit posted records; use `finance_accounts.balance` as source truth; or treat AI output as money.

## Canonical Domain Model

The model below is a contract, not permission to create every table immediately. Existing tables remain migration sources; new names are logical until the migration design is reviewed.

| Entity | Purpose / identity | Important fields | Ownership/lifecycle | Source of truth / mutability |
|---|---|---|---|---|
| **Church** | Tenant/institution; `churchId` | id, name, settings, setup state | Owns users, members, funds, batches, evidence, financial records | Canonical tenant identity; settings leader-controlled; history never hard-deleted |
| **User** | Clerk login/local operator; `userId` + provider subject | subject, name, email, role, churchRole, membership | Created/updated on auth; role changes privileged/audited | Identity/authorization source, not donor or money fact |
| **Member** | Person/donor directory; `memberId` | churchId, name, contact, status, envelope identifier | Church-owned create/update/deactivate | Canonical directory person; contact changes privacy-audited |
| **Fund** | Allocation/ledger destination; `fundId` | churchId, name, type, active, derived balance | Church-owned create/deactivate; inactive cannot receive posting | Definition canonical; balance derived only |
| **Giving** | Captured giving record; `givingId` | churchId, batchId?, source, amount, method, donor/member, evidence, status | Captured → reviewed → approved/rejected; editable only before post | Operational source; financial only after approved transaction |
| **GivingBatch** | Service/period grouping/reconciliation; `batchId` | churchId, service/period, channels, status, derived totals, close actor/time | opened → collecting → counting → discrepancy → reconciled → approved → posted → closed | Operational aggregate; totals derived, not independent truth |
| **CountingSession** | Physical cash control child; `countingSessionId` | batchId, service/round, counter/verifier, state, variance | opened → collecting → counting → discrepancy → reconciled | Operational evidence/control, not ledger |
| **Allocation** | Transaction-to-fund attribution; `allocationId` | transactionId, fundId, amount, status | Draft/reviewed/approved/posted; immutable after post | Canonical fund attribution; sum invariant at post |
| **Transaction** | Approved business event; `transactionId` | churchId, type, source, total, state, reversalOf, approval | draft/pending_review → approved → posted; posted immutable | Operational record; journal is accounting authority |
| **Journal** | Balanced immutable debit/credit set; `journalId` | transactionId, account, debit, credit, postedAt, reversalOf | Created during post; never updated/deleted; reversal appends | Canonical accounting source |
| **Approval** | Authorization decision; `approvalId` | subject, decision, actor, reason, time, policy version | requested → approved/rejected; immutable after decision | Canonical transition authorization |
| **Evidence** | Raw receipt/slip/image/document; `evidenceId` | churchId, source, object key, hash, metadata, review, OCR refs | received → stored → reviewed/linked/rejected/retained/deleted per policy | Canonical provenance; not public URL or money fact |
| **AuditEvent** | Append-only sensitive action; `auditEventId` | actor, action, entity/id, before, after, reason, correlationId, time | Append-only; privileged read/retention/legal hold | Canonical audit; atomic with financial mutation |

### Relationships and boundaries

```text
Church
 ├─ User / Member
 ├─ Fund ── Allocation[] ── Transaction ── Journal[]
 ├─ Giving ── (optional Batch membership) ── Evidence[]
 └─ GivingBatch ── CountingSession[]
                         └─ Count/Reconciliation evidence
```

`Member` is a person record; `User` is an operator identity. A member need not have a login, and a user is not automatically a donor. `Giving` is not `Transaction` until approval/posting. `Evidence` is not `Transaction`.


## Financial Lifecycle

```text
Raw capture → Review → Allocate → Reconcile (where applicable)
→ Approve → Post → Journal → Project balance
```

| Stage | Allowed mutation | Required result |
|---|---|---|
| Raw capture | Add source evidence/draft fields | Evidence provenance immutable; OCR advisory |
| Review | Correct extraction, match member, reject/duplicate, attach evidence | Actor/time and unresolved flags recorded |
| Allocate | Add/change draft allocations; validate positive amounts/total | Sum equals transaction total before approval |
| Reconcile | Record expected/actual/variance | Discrepancy visible; close/post policy enforced |
| Approve | Approve/reject with reason and separation of duties | Approval immutable; no silent status mutation |
| Post | Create posting and journal set atomically | Idempotent; posted transaction/journal immutable |
| Journal | Append balanced set; reversal creates compensating set | Original preserved; debits equal credits |
| Project balance | Recompute/update projection | Balance derived/rebuildable, never independent truth |

Mutation stops at approved/posted boundaries. Before approval, controlled draft edits are allowed. After posting, only a linked correction/reversal is created. Evidence deletion never removes financial history.

## Money Invariants

1. `Transaction.total_amount > 0` using exact minor units/satang or equivalent fixed precision.
2. `SUM(Allocation.amount) = Transaction.total_amount` for every posted transaction.
3. Every posted allocation references an active same-church fund.
4. Posted transactions cannot be silently edited; corrections append linked transactions.
5. Posted journal sets are immutable; reversal appends compensating entries.
6. `FinanceAccount.balance = derived projection of posted journal entries`.
7. Financial mutation and `AuditEvent` share one transaction boundary; failure rolls back both.
8. Posting is idempotent; retries cannot create duplicate journal effects.
9. OCR, evidence, batch totals, and UI values are never financial authority.
10. No hard delete of posted transactions, journal entries, or financial audit history.

## Batch / Counting Model

```text
GivingBatch
  └── CountingSession
        └── Count / Reconciliation
```

**Lifecycle:** `opened → collecting → counting → discrepancy → reconciled → approved → posted → closed`. `discrepancy` is a visible state/condition, not permission to hide variance. Exact state persistence is subject to the approved state-machine design.

- `GivingBatch` groups Giving/Transaction members by service/period and channel.
- `CountingSession` is a subtype/control child for physical cash; it is not a universal transaction.
- A `Giving` may be batched; a manual individual giving may be outside a physical count but still use the same evidence/review/approval contract.
- Cash, transfer, LINE, and OCR enter as evidence/capture channels, not competing ledger sources.
- Reconciliation compares expected inputs, counted cash, bank/deposit records, and approved transactions; it must expose difference and require explanation/policy action.
- Posting creates transactions and journal effects once; batch close cannot erase or duplicate posted transactions.

## Fund / Allocation

```text
Transaction
    ↓
Allocation[]
    ↓
Fund
```

- One fund: one allocation row.
- Multiple funds: two or more allocation rows; sum must equal transaction total.
- Unresolved fund: allowed only before approval/posting; it must remain an explicit unresolved condition, never silently assigned.
- Fund required: at approval/posting boundary; raw capture may wait for review.
- Validation: positive amounts, same church, active fund, exact total, no duplicate allocation identity.
- After posting, allocation rows are immutable; corrections use a linked transaction/reversal.
- `finance_accounts.balance` is never updated as an independent source; projection is rebuilt from journal.

## Evidence / OCR

```text
Evidence
  ├─ source/channel
  ├─ private storage object
  ├─ extracted data + confidence/provenance
  ├─ match candidates
  ├─ review status
  └─ linked financial record
```

```text
RAW EVIDENCE → OCR → MATCH → HUMAN REVIEW → FINANCIAL RECORD
```

Evidence supports receipt, payment slip, LINE evidence, and OCR output. Raw evidence is immutable; review decisions are audited. OCR is advisory. Provider abstraction:

```text
OcrProvider.extract(input) → rawText, fields, confidence, provider, processedAt
```

`OcrProvider` vendor/model/threshold is **OPEN/UNDECIDED**. The service must not post, approve, allocate, or mutate a financial record. Duplicate detection uses event identity plus hash/reference signals; exact policy is OPEN but idempotency is mandatory.

## Tenancy / Authorization

```text
User
 ↓
Tenant/Church Boundary
 ↓
Financial Data / Evidence
```

**Ownership boundary:** `churchId` is mandatory on all tenant-owned financial, member, batch, evidence, approval, and audit records. Current product is single church, but the boundary is explicit and passed through service calls; implicit `DEFAULT_CHURCH_ID` is not a production contract.

**Future tenant placement:** retain `churchId` on tenant-owned records and introduce an explicit User↔Church membership/authorization relationship if multi-church support is approved. Do not add a parallel tenant model in Phase 1 without evidence.

**Authorization boundary:** backend service/API is authoritative. UI route visibility is not security. `admin`, `SUPER_ADMIN`, `TREASURER`, `PASTOR`, `COUNTER`, and `MEMBER` permissions remain distinct. Normal members cannot access another member's giving history or sensitive evidence. Finance access and evidence access are audited.

**RLS boundary:** RLS/grants, if enabled, scope by church membership and authenticated database identity. Privileged service operations must use a controlled server-only path. Live RLS/grants are currently unverified; blueprint does not claim they exist.

**Hardcoded dependency:** before Phase 1 financial writes, remove implicit `demo-church` defaults from shared data-layer contracts. It may remain only as an explicit development fixture/configuration. All service inputs and tests carry church context.

## Audit Model

Audit event contract:

```text
actor
action
entity
entity_id
before
after
reason
timestamp
request/correlation_id
```

Required events include create/update/void-before-post, approval/rejection, allocation change, posting, correction, reversal, reconciliation, batch state change, evidence upload/view/export/delete, signed-URL issuance, role change, and failed privileged action.

**Transaction boundary:** financial mutation and its audit event must be committed in the same database transaction. If the audit insert fails, the financial mutation rolls back. Evidence access audit may be a separate security transaction when no financial mutation occurs, but must still be durable and correlated.

Audit is append-only. Before/after must be structured and redacted according to privacy classification; audit logs cannot become a secret bypass.

## Database Migration Plan

No migration is created in this blueprint. Logical sequence:

### 001 foundation
- Add/retain explicit church boundary and user↔church authorization foundation.
- Objects: membership/tenant support only if approved; indexes on `(churchId, id)`; non-empty tenant constraints.
- Backfill existing `churchId`; identify null/invalid tenant before constraints.
- RLS staged after live metadata and role contract verification.
- Risk: existing hardcoded paths; no data deletion.

### 002 financial core
- Tables: financial transaction, journal entry set/entries, posting/idempotency record, account mapping.
- Indexes: tenant/status/date, account/posting date, unique posting key.
- Constraints: positive total, balanced entry set, unique posting key, posted mutation guard.
- Backfill existing active offerings/expenses/withdrawals as draft/historical until journal mapping is approved.
- Risk: double-counting; reconciliation report required before activation.

### 003 allocation
- Tables: allocation and fund allocation identity.
- Indexes: transaction, fund, tenant/status.
- Constraints: positive amount, same tenant, unique transaction/fund identity, sum validation.
- Backfill one allocation per legacy `fundId`; null fund remains unresolved historical classification.
- Risk: legacy `fundId` divergence; retain source columns during transition.

### 004 batch/counting
- Tables: giving batch, batch members, reconciliation record; link counting session to batch.
- Indexes: batch status/date, counting batch, transaction/batch.
- Constraints: positive counts and state transition checks; session uniqueness only per approved policy.
- Backfill one batch per existing counting session/service date only after duplicate policy approval; no amount duplication.
- Risk: multiple sessions/rounds; stop on ambiguity.

### 005 audit
- Tables/columns: append-only audit event with before/after/reason/correlation/actor.
- Indexes: entity/time, actor/time, correlation.
- Constraints: required actor/action/entity/time; immutable after insert.
- Backfill existing rows; never fabricate missing before/after.
- Risk: privacy leakage and volume.

### 006 evidence
- Tables: evidence, extraction, match candidate/review, provider metadata, object key/hash.
- Indexes: source event/idempotency, hash, linked transaction, review status.
- Constraints: unique channel event identity, immutable raw object/hash, review before link/post.
- Backfill session documents only after storage ownership is verified.
- Risk: orphan files, duplicate slips, unapproved untracked migration `0003`.

### 007 security/RLS
- Enable/verify RLS and grants by table/role after service identity strategy approval.
- Policies: church boundary, role capability, sensitive evidence access.
- Functions/triggers: tenant context validation, audit access restrictions, immutable guards.
- No business-data backfill; policy validation only.
- Risk: lockout; test authorized/unauthorized roles before enforcement.

### 008 projections
- Objects: balance projection/rebuild, report read models, cache invalidation.
- Indexes: account/date and report dimensions.
## Existing Data Migration

| Existing data | Action | Blueprint rule |
|---|---|---|
| `finance_accounts.balance` | **KEEP temporarily → DERIVE** | Preserve for compatibility/projection only; never edit as authority; rebuild/compare from journal. |
| `finance_accounts` definitions | **KEEP** | Canonical fund/account definition; add identity/active constraints only after review. |
| `offerings` | **KEEP + MIGRATE** | Preserve rows; map to historical/draft giving/transaction based on lifecycle and source; do not duplicate posted effects. |
| `expenses` | **KEEP + MIGRATE** | Preserve rows; map to transaction/journal candidates; status semantics must be resolved before marking posted. |
| `withdrawal_requests` | **KEEP + MIGRATE** | Preserve approval history; disbursement requires a separate financial event, not status-only migration. |
| `offering_envelopes` | **KEEP as evidence/capture** | Map to giving capture and counting evidence; do not treat as separate ledger entries. |
| `counting_sessions` | **KEEP + MIGRATE** | Link to batch; preserve counter/verifier/variance history; do not duplicate amounts. |
| `cash_counts` | **KEEP as count input** | Recompute totals; do not trust stored aggregate if one exists. |
| `bank_records` | **KEEP + MIGRATE** | Preserve deposit/transfer evidence and reconciliation state; no invented bank statement identity. |
| `session_documents` | **KEEP + MIGRATE** | Map to evidence only when object ownership/visibility is verified. |
| `audit_logs` | **KEEP + EXTEND** | Preserve old metadata; mark missing before/after as incomplete, never fabricate. |
| `members` | **KEEP** | Preserve person/contact/envelope data; apply privacy/access policy; do not assume user identity. |
| untracked `0003`/`0004` | **DEFER/DECIDE** | Not approved migration inputs; inspect provenance and reconcile before any use. |

**Data-loss risk:** mapping a legacy row to both an old financial record and a new journal posting can double count. Every backfill must be idempotent, have a source-to-target key, produce a reconciliation report, and run in a non-production rehearsal first. No `DROP` or destructive rewrite is planned in Phase 1; `DROP LATER` requires separate approval after dual-read/rebuild evidence.

## Service Contracts

Services are logical boundaries. Do not create a service merely to wrap a single query; the boundary must own an invariant or transaction boundary.

### GivingService
- **Input:** church context, source, amount/method, donor/member optional, evidence refs, batch optional.
- **Output:** giving/capture ID, state, linked evidence, unresolved flags.
- **Invariants:** positive amount; no raw capture becomes posted; member/user separation.
- **Auth:** finance/counter capture; review permissions by state.
- **Transaction:** capture + evidence linkage + audit atomic.
- **Errors:** invalid amount, tenant mismatch, duplicate evidence, unauthorized, invalid state.

### EvidenceService
- **Input:** church context, private object metadata, source/channel, idempotency key, optional extraction request.
- **Output:** evidence ID, review state, provenance, authorized access reference.
- **Invariants:** raw object immutable; OCR cannot post; private storage.
- **Auth:** finance/authorized staff; signed URL only after authorization.
- **Transaction:** evidence metadata/idempotency/audit atomic; object storage cannot be rolled back, so compensating orphan cleanup is required.
- **Errors:** duplicate, invalid object, unauthorized, provider unavailable, policy retention conflict.

### AllocationService
- **Input:** church context, transaction ID, fund allocations with exact amounts.
- **Output:** validated allocation set and total.
- **Invariants:** positive rows, active same-church funds, exact total, no post-edit.
- **Auth:** finance/reviewer before approval; posting service revalidates.
- **Transaction:** allocation validation + transaction state + audit atomic.
- **Errors:** total mismatch, invalid fund, duplicate allocation, immutable posted allocation.

### ApprovalService
- **Input:** subject ID/type, decision, reason, actor, correlation ID.
- **Output:** immutable approval decision and next allowed transition.
- **Invariants:** separation of duties where required; no self-approval of protected actions; rejected state cannot post.
- **Auth:** role capability and church boundary.
- **Transaction:** decision + subject transition + audit atomic.
- **Errors:** unauthorized, invalid transition, stale version, missing reason.

### BatchService / CountingService
- **Input:** church context, service/period, channel/cash inputs, expected/actual reconciliation.
- **Output:** batch/count state, derived totals, variance, close eligibility.
- **Invariants:** no close with unexplained discrepancy; counter cannot verify self; no duplicate post.
- **Auth:** counter capture, treasurer verify/post, leader/finance as policy requires.
- **Transaction:** state transition + count/reconciliation + audit atomic.
- **Errors:** invalid transition, variance, self-verification, duplicate session/post, tenant mismatch.

### LedgerService
- **Input:** approved transaction/posting key, journal lines, idempotency key.
- **Output:** immutable journal set and posting result.
- **Invariants:** balanced lines, positive/authorized accounts, no duplicate posting, reversal linkage.
- **Auth:** posting capability only; service credential is server-only.
- **Transaction:** journal + transaction post + audit atomic; projection refresh after commit.
- **Errors:** unbalanced journal, duplicate post, invalid account, stale state.

### AuditService
- **Input:** actor, action, entity, before/after, reason, correlation ID.
- **Output:** append-only audit event ID.
- **Invariants:** required context; redaction; immutable.
## Frontend Contracts

Frontend keeps existing routes and does not introduce a new route in this blueprint. Existing forms/pages should consume the new service contracts only after backend contracts are stable.

| Operation | Query/mutation shape | Validation/loading/error | Cache policy |
|---|---|---|---|
| Giving list/detail | `giving.list/get` returns state, source, evidence summary, allocations, transaction/journal reference | Loading/empty/error states; donor fields redacted by server | Invalidate on review/approval/post/reversal |
| Capture giving | `giving.capture` accepts source, amount, method, optional member/evidence, batch | Client validates positive amount/format only; server is authority | No optimistic financial total |
| Review evidence | `evidence.get/review` returns extracted fields/confidence/candidates | Show server errors; no auto-approve | Invalidate evidence/giving/transaction |
| Allocation | `allocation.validate/set` accepts array of fund IDs/amounts | Client may show total; server enforces equality | No optimistic balance/fund display |
| Approval | `approval.decide` accepts decision/reason/version | Disable duplicate submit; show stale-state conflict | Invalidate subject/audit |
| Counting | `counting.get/add/submit/verify/post` returns reconciliation | Show discrepancy prominently; block invalid post | Invalidate on each state transition |
| Reports/balances | `ledger.report`/projection query returns freshness/derived status | Display unavailable/stale/error distinctly | Refresh after post/rebuild; never invent values |

**Form contract:** forms send IDs and exact decimal/minor-unit values, not trusted computed balances. Server rejects stale versions and invalid transitions.

**Optimistic updates:** forbidden for giving, expense, allocation, approval, posting, reversal, count verification, reconciliation, or balance projection. Safe optimistic updates are limited to non-financial UI preferences. Financial screens wait for server confirmation.

**Cache invalidation:** mutation success invalidates giving, allocation, transaction, journal, account projection, batch/counting, approval, audit, and evidence keys affected by the event. Errors do not update financial cache optimistically.

## Test Strategy

### Unit
- Money/minor-unit conversion, allocation sum, journal balance, state transitions, variance calculations, redaction, confidence/reason formatting.
- Pure tests must not require a database.

### Integration
- Real isolated PostgreSQL: create tenant/fund, capture evidence, allocate, approve, post, project balance, reverse, rebuild projection.
- Constraint tests: invalid fund, cross-tenant references, duplicate posting, invalid states, negative/zero amount, unbalanced journal.
- Migration rehearsal from a sanitized snapshot; migration idempotency and rollback/recovery.

### Workflow
- Giving: create → review → allocate → post → reverse.
- Fund: one fund, split funds, invalid total, unresolved until resolved.
- Counting: balanced, unbalanced, discrepancy, reconcile, verify, post once.
- Approval: approve, reject, duplicate submit, unauthorized, self-approval rule.
- Ledger: posting, reversal, projection equality, correction preserves original.
- Evidence: raw immutable, OCR wrong amount review, low confidence unresolved, duplicate slip one effect.

### Security / RLS
- Normal member cannot read another member's giving/evidence.
- Counter cannot verify self; pastor/member cannot post/verify unauthorized actions.
- Cross-church IDs fail closed.
- Service-only privileged operations cannot be invoked from client contracts.
- Audit access and signed URL issuance are role-scoped and recorded.
- Live RLS/grants are tested before enabling enforcement; policy absence is not treated as pass.

### E2E
- Browser-level critical journeys at mobile and desktop widths: capture, review, allocate, approve, post, discrepancy, reverse, and unauthorized access.
- No visual redesign assertions; focus task completion and server truth.

**Test rule:** financial tests must assert both visible state and persisted/derived truth. A successful HTTP response without database/audit evidence is insufficient.

## Implementation Sequence

### Phase 1A - Financial foundation
- Establish explicit church context, transaction/journal contracts, account mapping, posting idempotency, correction/reversal semantics, and migration rehearsal.
- Do not expose new financial routes.

### Phase 1B - Allocation
- Add allocation domain/contracts and exact sum validation; migrate/derive legacy fund links without duplicating money.

### Phase 1C - Batch/Counting
- Link existing counting session to batch, preserve count/verify/post safeguards, and define reconciliation output before state expansion.

### Phase 1D - Approval/Audit
- Implement immutable approval decisions and atomic audit events for financial mutations; enforce separation of duties and stale-version conflicts.

### Phase 1E - Evidence
- Add private evidence metadata, idempotent ingestion boundary, OCR provider abstraction, match/review contract, and duplicate protection. No vendor lock-in.

### Phase 1F - Security/RLS
- Verify live database roles/grants; implement and test RLS/grants and tenant context after service identity is approved. Rotate/contain P0 secret incident before production work.

### Phase 1G - Frontend integration
- Integrate existing routes/forms to stable contracts only after backend acceptance tests. No new route/UI redesign in this phase unless separately authorized.

**Dependency rule:** 1A precedes 1B; 1B precedes posting; 1C follows the financial transaction contract; 1D is required before posting is production-authoritative; 1E is independent of OCR vendor but not evidence privacy; 1F gates production; 1G consumes stable contracts.

## Acceptance Criteria

### Financial foundation
- [ ] No posted financial record is created by directly mutating `finance_accounts.balance` as source truth.
- [ ] Every posted transaction has one balanced immutable journal entry set.
- [ ] Posting is idempotent under retry/concurrent submission.
- [ ] Projection balance equals journal-derived balance after rebuild.
- [ ] Posted transactions cannot be edited/deleted through application contracts.
- [ ] Correction/reversal creates linked compensating records and preserves original history.

### Allocation
- [ ] One-fund transaction produces exactly one valid allocation.
- [ ] Split-fund transaction produces allocations whose sum equals total exactly.
- [ ] Invalid total, zero/negative allocation, inactive/cross-church fund rolls back.
- [ ] Unresolved fund is allowed only before approval/posting and remains visible.

### Batch / counting
- [ ] Existing counting data maps to a batch without duplicate financial effects.
- [ ] Counter/verifier separation remains enforced.
- [ ] Cash/deposit/transfer variances are deterministic and visible.
- [ ] Discrepancy blocks close/post unless approved policy requires explanation/approval.
- [ ] Replaying post cannot create a second transaction/journal set.

### Approval / audit
- [ ] Every financial mutation writes audit in the same transaction boundary.
- [ ] Audit includes actor, action, entity/id, before, after, reason, timestamp, correlation ID.
- [ ] Rejection, approval, correction, reversal, and failed privileged action are traceable.
- [ ] Unauthorized role and cross-church action fail closed.

### Evidence / OCR
- [ ] Raw evidence is private, immutable, hashed, and linked to source/idempotency identity.
- [ ] OCR stores provenance/confidence and cannot directly post.
- [ ] Low-confidence match remains unresolved until human confirmation.
- [ ] Duplicate webhook/slip produces one evidence item and one financial effect.
- [ ] Signed URL issuance requires backend authorization and is audited.

### Security / migration
- [ ] P0 secret is rotated/secured and secret scan enabled before production release.
- [ ] Empty database can apply the complete ordered migration sequence.
- [ ] Existing rows backfill idempotently with source-to-target reconciliation.
- [ ] RLS/grants are verified in the live target before enforcement.
- [ ] No destructive data operation occurs without separate approval and recovery evidence.

## Open Decisions

### DECIDED
- Hybrid transaction + immutable journal.
- Allocation sum invariant and split support in domain contract.
- Fund required at posting; unresolved before approval.
- Single-tenant now + tenant-safe boundary.
- GivingBatch with CountingSession subtype.
- LINE as ingestion channel; provider-neutral OCR contract.
- Private evidence classification and backend authorization boundary.

### OPEN - blockers before affected production work
- Exact journal account set and debit/credit policy.
- Approved suspense/unallocated fund policy.
- User-to-church membership model for explicit authorization.
- Exact batch state names/close/reconciliation policy.
- LINE webhook/event/signature contract.
- OCR vendor/model/threshold/retention policy.
- Legal retention/legal-hold/donor deletion policy.
- Staff access matrix for donor identity, evidence, exports, and audit.

### DEFERRED - not blockers to core Phase 1 design
- Household model; multi-church rollout beyond tenant-safe boundary.
- Vendor-specific OCR optimization; AI anomaly/insight.
- UI redesign/exception-first Inbox.
- Period-close statement snapshots beyond minimum foundation.

## Phase 1 Risks

| Risk | Severity | Mitigation / stop condition |
|---|---|---|
| Legacy rows double-post during backfill | P0 | Source-to-target map, idempotent rehearsal, reconciliation, no activation on mismatch |
| Balance projection drift | P0 | Journal rebuild, compare-before-cutover, freshness marker, no direct balance authority |
| Cross-tenant exposure | P0 | Explicit church context, backend auth, live RLS verification, fail-closed tests |
| Audit failure leaves financial mutation | P0 | Same transaction boundary and failure-injection tests |
| Allocation mismatch | P0 | Service + DB-safe validation, rollback/property tests |
| Posted history mutation | P0 | Immutable contracts, DB constraints/triggers where safe, negative tests |
| LINE duplicate/retry | P1 | Event idempotency, hash/reference review, one-effect test |
| OCR identity misattribution | P1 | Explainable candidates, human confirmation, low-confidence unresolved |
| Private evidence leakage | P0 | Private keys, authorized signed URLs, access audit, secret/URL scanning |
| Migration lockout/partial application | P0 | Backups, rehearsal, ordered migrations, recovery/rollback plan |
| Scope creep into UI/provider | P1 | Blueprint gate and explicit owner approval |

## Phase 1 Definition of Done

Phase 1 is complete only when:

- [ ] Migrations 001-008 are reviewed, rehearsal-tested, and applied through the approved process.
- [ ] All P0/P1 acceptance tests pass in an isolated database and relevant CI checks.
- [ ] Postings, allocations, reversals, projections, audit, and access controls have reproducible evidence.
- [ ] Existing data is preserved, mapped, reconciled, and rollback/recovery is proven.
- [ ] RLS/grants and tenant boundaries are verified in the target environment.
- [ ] Evidence privacy, retention/legal hold, signed URL, and audit access are enforced.
- [ ] Existing routes integrate stable contracts without unauthorized UI redesign.
- [ ] Documentation, worklog, change-control record, and operator runbook are updated.
- [ ] Product owner signs off on remaining OPEN decisions or explicitly defers them with owner/date.
