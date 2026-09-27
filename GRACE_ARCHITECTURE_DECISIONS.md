# Grace Architecture Decisions

**Gate:** Architecture Decision Gate — one round  
**Date:** 2026-09-24  
**Inputs:** Phase 0 forensics, adaptation matrix, backlog, worklog, and current source  
**Scope:** decisions only; no application code, schema, migration, deployment, package, or UI change.

## Executive Summary

Six architecture decisions close the implementation boundary for Phase 1. The selected direction is a **hybrid financial architecture**: a transaction-centric operational model backed by an immutable journal as the accounting authority. Funds receive explicit allocations; counting sessions remain a cash-control subtype of a broader giving batch. LINE is an ingestion channel, never a transaction source. Evidence is private, provenance-bearing data, while OCR remains advisory.

The product remains **single-tenant operationally for now, with tenant-safe boundaries**. This is not a multi-tenant product decision: the evidence shows a single `demo-church` product. However, every financial/evidence query must stop relying on a hidden global tenant and must use an explicit church boundary before data or integrations grow.

| Decision | Status |
|---|---|
| Financial Source of Truth | DECIDED — Hybrid |
| Fund Allocation | DECIDED — Canonical allocation model |
| Tenancy | DECIDED — Single-tenant now + tenant-safe architecture |
| Counting vs Batch | DECIDED — Batch aggregate with counting subtype |
| LINE/OCR | DECIDED — Channel/evidence pipeline; provider UNDECIDED |
| Privacy/Evidence | DECIDED — Classified private financial evidence; exact retention parameters UNDECIDED |

**Gate result: DECIDED for architecture direction. READY FOR PHASE 1 only after the preconditions at the end of this document are met; implementation is not started by this document.**

## Decision 1 — Financial Source of Truth

**DECISION:** Choose **C. Hybrid**.

**WHY:** The current model is transaction-oriented but has no replayable accounting authority; immutable journal entries supply that authority while transactions retain operational meaning.

**Canonical record:** The canonical financial fact is an immutable **journal entry set** associated with an approved financial transaction. The transaction record is the operational/business document (giving, expense, withdrawal, counting posting); the journal is the accounting authority for posted financial effects. A journal entry set must balance by debit and credit and is never edited in place.

**Balance derivation:** `finance_accounts.balance` becomes a projection/cache of posted journal entries for each account, not an independently editable source of truth. Reports may read the journal for financial truth and may use projections for current balances. Recomputation/reconciliation must be possible from journal entries.

**Adjustments/corrections:** Never rewrite a posted amount or fund allocation in place. Create a new approved adjustment/correction transaction with a reason and audit event, linked to the original transaction. Pre-post corrections may edit a draft, but the pre-post version and actor are audited.

**Reversal:** Create a linked reversal journal entry set and a reversal business record. Preserve the original transaction, original journal, reason, actor, and timestamp. A void is permitted only before posting; after posting, use reversal.

**Audit level:** Audit is both transaction-level and journal-level. Journal records actor, timestamp, reason, source transaction, and before/after posting state. Operational audit includes all state transitions and access to sensitive evidence.

**Reports:** Financial reports read journal entries/transaction postings, not independently maintained balance deltas. Operational listings may join transaction records for descriptions and status.

**Existing `finance_accounts.balance`:** Preserve as a derived projection for compatibility and performance during Phase 1 migration. It must never be the only record of a balance. A repair/rebuild path is required.

**Rejected alternatives:**
- **A alone:** double-entry is strong but cannot, by itself, represent evidence review, member attribution, batch workflow, or operational state.
- **B alone:** transaction-centric is flexible but leaves mutable balance projections without a replayable accounting authority.

**Evidence:** Forensics finds `offerings`/`expenses` used as both operational and report inputs, with `finance_accounts.balance` independently mutated (`GRACE_GIVING_FORENSICS.md:95-108,179-190`; `server/db.ts:486-555,1616-1707`). Counting posting already uses compare-and-set and a transaction (`server/db.ts:1624-1640`), which is reusable.

**Trade-offs:** More schema and migration work; reconciliation and repair become explicit. Benefit: replayability, traceable corrections, and no silent balance drift.

**Consequences — Phase 1 must:** define journal account semantics, debit/credit invariants, posting idempotency, reversal semantics, balance rebuild, and migration mapping from existing offerings/expenses. It must make audit atomic with posting.

**Consequences — Phase 1 must not:** continue creating authoritative money solely by mutating `finance_accounts.balance`, edit posted journal rows, or use void as a post-posting reversal.


## Decision 2 — Fund Allocation

**WHY:** A single optional `fundId` cannot represent split gifts or preserve attribution; explicit allocations make the financial effect auditable and enforceable.

**DECISION:** Use the canonical model:

```text
Giving (approved financial transaction)
  ↓ 1..N
Allocation
  ↓ exactly one active Fund
Fund
```

A giving may be split across multiple funds. Allocation rows are the authoritative fund attribution for that giving. `Fund.balance` remains a derived projection under Decision 1.

**Fund requiredness:** Fund is **required at posting/approval**, not necessarily at raw capture. Evidence or an unmatched gift may temporarily be fund-unspecified. It must be resolved before the transaction can become posted. Anonymous/unallocated giving is not allowed to silently post to an arbitrary fund.

**Split timing:** Support multiple allocations in the Phase 1 domain contract and validation model. Do not expose a split UI until the canonical transaction/allocation boundary and migration mapping are approved. The domain invariant is mandatory: sum of allocation amounts equals the approved transaction amount, in satang/minor units.

**Offering batch relationship:** A batch is an operational collection of giving transactions. Individual giving is the canonical financial unit; a batch groups transactions for service/period reconciliation and does not replace the transaction.

**Unspecified fund:** Store as unresolved evidence/transaction state, not `null` on a posted transaction. Require staff selection or an explicit approved suspense/unallocated account policy; exact suspense-account policy is **UNDECIDED** and must not be invented.

**Rejected alternatives:** keep one optional `fundId` because it cannot represent split gifts and permits unclassified money; require fund at raw capture because it blocks legitimate review/unmatched workflows.

**Evidence:** Direct giving/expense `fundId` is optional, while counting envelopes require it (`GRACE_GIVING_FORENSICS.md:101-104`; `server/routers.ts:378-389,499-510,986-1018`). No allocation table exists. The matrix identifies split allocation and sum invariant as P1 (`GRACE_ADAPTATION_MATRIX.md:10-12`).

**Trade-offs:** More rows and validation; split gifts become explainable and balance-safe. Requiring fund only at posting preserves operational capture flexibility.

**Consequences — Phase 1 must:** define allocation identity, amount precision, same-tenant fund validation, sum enforcement, and behavior for edits after approval. Phase 1 must not treat `offerings.fundId` and `finance_accounts.balance` as independent financial truths.

## Decision 3 — Tenancy

**WHY:** The evidence shows one active church, but hardcoded implicit tenancy and absent database policies create a security risk; explicit boundaries are the minimum safe design.

**DECISION:** Choose **C. Single-tenant now + tenant-safe architecture**.

**Tenant boundary:** The boundary is the church/tenant identifier on every financial, evidence, member, audit, and batch record. The current product is one church; the implementation must nevertheless require an explicit tenant context at service boundaries instead of silently defaulting to `demo-church` inside data functions.

**User → church relationship:** A Clerk identity is a login identity, not a tenant membership. Phase 1 must have an explicit local user-to-church relationship or an explicit, reviewable single-church membership policy. The exact membership table design is **UNDECIDED** because no multi-church product requirement is evidenced.

**Authorization boundary:** Authorization is enforced in the backend service/API layer now, with every query carrying the explicit church boundary. UI hiding is never sufficient. Database RLS/grants are required before production if the deployment can use any non-service-role database path; whether the current direct connection can support RLS is **UNDECIDED** pending live inspection.

**RLS boundary:** RLS must be scoped to the church identifier and authenticated user membership when RLS is enabled. No policy may rely on a global `demo-church` value. Until live state is verified, RLS status is **not production-verified**, not assumed absent or present.

**When `demo-church` must disappear:** It must disappear from shared data-layer defaults and request/service context before Phase 1 financial/evidence mutations. It may remain only as an explicit development fixture or deployment configuration, never as an implicit production fallback.

**Phase 1 tenant ID:** Phase 1 must require the existing `churchId` boundary in canonical financial/evidence contracts and mutations. A new tenant table or multi-tenant membership schema is not required unless product scope explicitly expands to multiple churches.

**Rejected alternatives:**
- **A:** permanently hardcoded single-tenant is not safe because current code has no explicit boundary and no RLS.
- **B:** full tenant-aware multi-tenant is not justified by current product evidence and would expand Phase 1 risk unnecessarily.

**Evidence:** Forensics records `DEFAULT_CHURCH_ID = "demo-church"`, missing user `churchId`, no repository RLS, and application-only authorization (`GRACE_GIVING_FORENSICS.md:29-37,105-121`; `server/db.ts:58,60-68`; `drizzle/schema.ts:111-128`).

**Trade-offs:** Explicit tenant context costs refactoring but prevents silent cross-church access. It preserves the current single-church product while keeping future tenant safety possible.

**Consequences — Phase 1 must:** remove implicit production tenant defaults from financial/evidence write paths, pass tenant explicitly, and define service-level authorization tests. Phase 1 must not add multi-tenant billing/isolation features or claim RLS without live verification.

## Decision 4 — Counting / Batch

**WHY:** The existing counting session is a valuable cash-control unit, but the product workflow needs one batch boundary across cash, transfer, LINE, and manual channels.

**DECISION:** Choose a **Giving Batch aggregate with Counting Session as a subtype/operational child**.

**Counting session:** A controlled physical cash-count and reconciliation event for one worship service/round. It is not the universal giving transaction or universal batch. Existing `countingSessions` represent service date/round and contain envelopes, cash counts, deductions, bank records, and documents (`drizzle/schema.ts:415-448,450-580`).

**Giving batch:** The operational envelope for a defined service/period and channel set. It groups individual giving transactions and reconciliation evidence; it does not replace a transaction or own the financial amount independently.

**Transaction creation:** A financial giving transaction is created only after evidence/entry is reviewed and approved. For a physical envelope, the envelope remains capture/evidence until batch approval; for LINE/OCR, raw slip/extraction remains evidence until review. Posting creates the approved transaction and journal effects exactly once.

**Counting relationship:** Counting session is a subtype/child of a batch when the batch represents a service. A batch may include manual, transfer, LINE, check, and other channels without pretending cash count represents all channels.

**Channels:** Cash, transfer, LINE, and OCR enter through the same evidence/review/approval contract. Cash additionally has count/reconciliation controls; LINE has ingestion, OCR, match, and duplicate controls. Neither channel is a separate financial truth.

**Reconciliation:** Belongs to the batch and/or counting control, comparing expected inputs, counted cash, bank/deposit records, and approved transactions. It produces visible differences and blocks closure/posting when policy requires an explanation.

**Canonical lifecycle:**

```text
Capture
→ Review
→ Match/Validate
→ Approve
→ Count/Reconcile (where applicable)
→ Post
→ Ledger
→ Closed/Reconciled
```

Exact persisted state names and whether Closed is distinct from Reconciled are **UNDECIDED** until business rules define the vocabulary.

**Rejected alternatives:** make counting session the batch (cannot represent all channels); make every raw slip a transaction immediately (violates evidence/AI boundary); introduce a batch without linking counting (loses current controls).

**Evidence:** Forensics identifies `counting_sessions` as a service count and says it is not a complete batch; post creates offerings only after `verified` (`GRACE_GIVING_FORENSICS.md:53-57,135-141`; `server/db.ts:1610-1707`).

**Trade-offs:** An aggregate adds relationships and lifecycle complexity but gives one operational reconciliation boundary across channels.

**Consequences — Phase 1 must:** define batch membership, transaction uniqueness, reconciliation ownership, separation of duties, and variance explanation. It must not post raw LINE/OCR output or use cash count totals as canonical ledger.

## Decision 5 — LINE / OCR

**WHY:** LINE and OCR are external evidence channels, not trusted financial authorities; separating ingestion, extraction, review, and posting prevents AI/provider errors from becoming money.

**DECISION:** LINE is an **ingestion channel**, not a transaction source. Provider is **UNDECIDED**. The contract must be provider-neutral.

**Canonical pipeline:**

```text
RAW INPUT
→ OCR / EXTRACTION
→ MEMBER MATCH CANDIDATES
→ HUMAN REVIEW
→ APPROVAL
→ POST
```

**Webhook responsibility:** A dedicated ingestion boundary authenticates the channel, validates event authenticity, records idempotency before processing, stores raw event metadata, and enqueues/retries work. It must not approve or post money. Signature/event contract is **UNDECIDED** until the LINE channel contract is known.

**Slip storage:** Store an immutable private evidence object/reference, content hash, source event, channel, received time, tenant, and provider metadata. Provider image URLs are not canonical storage. The exact object store is **UNDECIDED**; no verified private LINE storage flow exists.

**OCR boundary:** Provider adapter returns raw text, extracted amount/date/bank/reference/sender, field confidence, provider/model, processed time, and provenance. OCR output is advisory and never authoritative.

**Matching:** Matching produces ranked candidates with explainable reasons and confidence. It cannot create a financial identity without human confirmation. A low-confidence result remains unresolved. Matching rules and threshold are **UNDECIDED** pending product data.

**Human review:** Reviewer sees evidence, extracted values, confidence, candidates/reasons, duplicate signals, and enters/approves final values. Review and approval are audited.

**Duplicate detection:** Use provider event identity plus content/reference/hash signals. Idempotency must prevent duplicate evidence and duplicate financial effects; exact hash/reference policy is **UNDECIDED** and must be tested.

**Posting:** Only an approved, validated transaction may create canonical allocations and journal entries. Retries must be idempotent and cannot create a second transaction.

**Rejected alternatives:** LINE as transaction source (violates evidence/AI rule); provider-specific domain model (blocks replacement/testing); auto-post low-confidence OCR (financial correctness risk).

**Evidence:** Runtime search finds no LINE/OCR implementation. The untracked migration proposes slips/jobs/confidence/matching fields, but it is not a runtime contract (`GRACE_GIVING_FORENSICS.md:18,123-129`; `drizzle/0003_line_event_idempotency.sql:20-103`).

**Trade-offs:** Provider abstraction and human review add latency but protect financial correctness and permit provider replacement.

**Consequences — Phase 1 must:** define evidence provenance, provider interface, idempotency boundary, review states, and post contract. It must not choose a provider without evidence or let AI write authoritative financial fields.

## Decision 6 — Privacy / Evidence

**WHY:** Donor identity, contact data, slips, receipts, OCR output, and financial records can expose sensitive personal or church financial information; classification and backend authorization must precede storage or reporting changes.

**DECISION:** Adopt the following classification and access policy.

| Data | Classification | Default boundary |
|---|---|---|
| Public church profile/name/logo | PUBLIC | Public read only |
| Published news/events | PUBLIC | Published read only |
| General app navigation/non-sensitive UI | INTERNAL | Authenticated users as permitted |
| Church settings, member directory | CONFIDENTIAL | Authorized staff; least privilege |
| Giving/expense amounts, balances, reports, bank/deposit records | HIGHLY SENSITIVE | Finance-authorized staff; backend enforced |
| Slip/receipt images, OCR raw/extracted data, donor phone/email, audit details | HIGHLY SENSITIVE | Named finance/authorized staff; no public URL |
| Credentials, tokens, storage keys | HIGHLY SENSITIVE secret | Never client-visible; rotate and scan |

**Data classification:** Raw evidence and OCR output are evidence, not public content and not authoritative financial truth. Financial records are highly sensitive even if the donor is anonymous.

**Retention:** Exact durations are **UNDECIDED** because no legal/jurisdictional policy is evidenced. Phase 1 must define configurable retention classes and legal-hold behavior before deleting production evidence. Default policy is never silent deletion.

**Access control:** Backend authorization is authoritative. Normal members must not access another member's giving history. Finance roles have controlled access; admin/super-admin access must be audited. Frontend hiding is insufficient.

**Storage visibility:** Evidence and receipts must be private by default. Store object keys, not public URLs. Access through short-lived signed URLs or an authenticated server proxy. The current generic storage proxy requires hardening and tenant/role authorization before sensitive use.

**Signed URL:** A signed URL is short-lived, non-cacheable where appropriate, scoped to one authorized object, and generated only after backend authorization. It must not be stored as the canonical evidence reference.

**Audit requirement:** Log upload, view/signed-URL issuance, download, review, match, approval, correction, posting, reversal, export, and deletion/retention actions with actor, time, object/transaction, reason where appropriate, and outcome.

**Deletion policy:** Financial history and posted journal entries are not hard-deleted. Evidence deletion follows retention/legal-hold policy and leaves an audit tombstone. A user deletion request does not silently erase financial records.

**Privacy boundary:** Staff with legitimate financial duties may access sensitive records; ordinary members and public visitors do not. Anonymous giving remains anonymous in donor-facing views, but authorized finance staff may still access underlying evidence under policy.

**Staff/admin access:** SUPER_ADMIN/TREASURER are privileged financial actors; access is justified, scoped, and audited. `admin` is a coarse system role and must not be treated as unlimited donor-data permission without policy.

**Evidence:** Forensics identifies masked donor names, broad member/report/account routes, generic storage proxy, untracked private receipt proposal, and no privacy/retention policy (`GRACE_GIVING_FORENSICS.md:105-121,149-175`; `server/_core/storageProxy.ts:4-47`; `drizzle/0004_private_expense_receipts.sql:5-18`).

**Trade-offs:** Strong privacy adds authorization and storage work, but prevents donor data exposure and preserves financial evidence.

**Consequences — Phase 1 must:** define access matrix, private storage, signed URL authorization, audit events, retention/legal hold, and non-destructive deletion semantics. It must not expose raw slips, OCR data, donor contact data, receipts, or financial reports through public storage or broad member routes.

## Cross-Domain Model

```text
Identity (Clerk login)
  → explicit church boundary (single tenant now, tenant-safe)
  → authorized service context

Raw input / physical capture
  → Evidence
  → OCR/extraction or cash count
  → Match/Validate
  → Human review
  → Approval
  → Financial transaction
       → Allocations (fund required; split allowed)
       → Journal entry set (immutable accounting authority)
       → Audit events
  → Giving Batch (service/period grouping)
       → Counting Session subtype for physical cash
       → Reconciliation
       → Post/close semantics
  → Ledger
  → Reports / Statements
```

### Cross-domain consistency rules

1. **Giving:** raw evidence is not a giving transaction; approved transaction is not a balance mutation alone.
2. **Expense:** manual/withdrawal/deduction flows must eventually produce the same journal and audit contract; no disbursement may be status-only.
3. **Fund:** allocation is authoritative attribution; fund balance is a journal-derived projection.
4. **Batch:** groups transactions/evidence; does not duplicate transaction amounts as an independent truth.
5. **Counting:** subtype/control for physical cash; preserves count/verify/post protections.
6. **Ledger:** only approved posting creates journal effects; reports derive from journal/transaction postings.
7. **Approval:** human approval is required before authoritative financial creation; separation of duties remains explicit.
8. **Audit:** every state transition, posting, reversal, evidence access, and correction is traceable.
9. **Tenant:** every financial/evidence object carries explicit church boundary; no implicit `demo-church` in production paths.
10. **LINE:** channel input only; raw/OCR data cannot bypass evidence and review.
11. **Reports:** read canonical postings and derived projections, with discrepancies visible.

### Contradiction check

| Pair | Result | Resolution |
|---|---|---|
| Hybrid ledger + transaction model | Compatible | Transaction is operational document; journal is accounting authority |
| Allocations + journal | Compatible | Allocations drive debit/credit destination accounts; journal proves posting |
| Required fund at posting + unresolved capture | Compatible | Capture may be unresolved; posting cannot be unresolved |
| Single tenant + tenant-safe | Compatible | One active tenant now; explicit boundary and no implicit fallback |
| Counting subtype + broad batch | Compatible | Counting is cash control child; batch covers all channels |
| LINE channel + human approval | Compatible | LINE captures evidence; only review/approval posts |
| Private evidence + finance reporting | Compatible | Reports use authorized derived postings; raw evidence remains restricted |
| Immutable posting + audit corrections | Compatible | Corrections/reversals append new records; originals remain |

No unresolved contradiction was found among the six selected decisions. The remaining `UNDECIDED` items are policy/provider details, not contradictions in the chosen direction.

## Open Questions

These questions are deliberately not answered by inference:

1. What exact journal account set and sign/debit-credit semantics apply to this church's financial policy?
2. What is the approved suspense/unallocated fund policy for unresolved gifts?
3. Is the product explicitly limited to one church, or will multiple churches be supported later?
4. What is the authoritative user-to-church membership model?
5. What are the exact batch state names and close/reconcile rules?
6. Which LINE webhook/event contract and signature scheme will be used?
7. Which OCR provider, model, confidence thresholds, and retention rules are approved?
8. What are the legal retention periods, legal-hold rules, and donor deletion requirements for the operating jurisdiction?
9. Which staff roles may view donor identity, phone/email, slips, receipts, exports, and audit history?

## Phase 1 Preconditions

Phase 1 may begin only when all of the following are true:

- [ ] Product owner approves the hybrid journal + transaction direction and account semantics.
- [ ] Product owner approves fund allocation invariants and unresolved-fund policy.
- [ ] Product owner approves single-tenant-now/tenant-safe boundary and user-to-church policy.
- [ ] Product owner approves batch/counting relationship and close/reconciliation vocabulary.
- [ ] Product owner approves LINE/OCR evidence pipeline and leaves provider selection explicitly undecided or selects one.
- [ ] Product owner approves privacy classification, access matrix, retention/legal-hold policy, and deletion semantics.
- [ ] P0 secret incident is contained: exposed credential rotated, file secured, secret scan enabled.
- [ ] Clean/reviewable baseline is established; untracked migrations are not treated as approved.
- [ ] Change-control note defines exact files/tables, migration risk, regression risk, acceptance criteria, and rollback/rebuild strategy.
- [ ] Phase 1 acceptance tests cover duplicate evidence, OCR correction, low-confidence match, split allocation, audited edit, batch variance, unauthorized access, duplicate post, reversal, and mobile review.

**Implementation is intentionally not started by this decision document.**

## Final Gate

| Decision | Status |
|---|---|
| Financial Source of Truth | DECIDED — Hybrid |
| Fund Allocation | DECIDED — Canonical allocation model |
| Tenancy | DECIDED — Single-tenant now + tenant-safe architecture |
| Counting vs Batch | DECIDED — Batch aggregate with counting subtype |
| LINE/OCR | DECIDED — Channel/evidence pipeline; provider UNDECIDED |
| Privacy/Evidence | DECIDED — Private financial evidence; exact retention UNDECIDED |

### READY FOR PHASE 1

Architecture direction is decided. Phase 1 is **conditionally ready** after the listed preconditions are approved and verified. No implementation has begun in this gate.
