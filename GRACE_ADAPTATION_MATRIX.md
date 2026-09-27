# GRACE ADAPTATION MATRIX

**Phase 0:** evidence-based adaptation only. Reference products are used as workflow benchmarks; no branding, visual identity, wording, or implementation is copied.

| Reference Pattern | Source Product / Class | Why It Matters | Current Grace Giving | Gap | Proposed Adaptation | Risk | Priority | Affected Files | Affected Tables | Migration Required | Status |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Exception-first operational inbox | Church giving platforms | Staff need attention queue, not decorative dashboard | No giving inbox; Home mixes summaries and dialogs | No review/unmatched/duplicate/OCR queue | Contextual Inbox after canonical model decision | High | P1 | `App.tsx`, new Inbox, `routers.ts` | Evidence/transaction tables | Yes | Proposed |
| Immutable evidence before money | Financial SaaS | OCR/slip is a claim, not ledger truth | Session documents only; no LINE runtime | No evidence provenance/review contract | Evidence + extraction provenance; human creates transaction | High | P0/P1 | `db.ts`, `routers.ts`, storage | New evidence model | Yes | Blocked |
| Explainable member matching | Giving platforms | Confidence/reasons reduce misattribution | No runtime matching | No candidates, confidence, confirmation | Candidate model + contextual human confirmation | Medium/high | P1 | Matcher, Inbox | Member/link/evidence | Yes | Proposed |
| Explicit transaction lifecycle | Financial SaaS | Prevent impossible state changes | Broad offering/expense statuses; counting has good state machine | No reversal or complete transition guard | Minimal state machine with actor/reason/audit | High | P1 | `routers.ts`, `db.ts`, schema | offerings/expenses/audit | Yes | Decision |
| Multi-fund allocation invariant | Church finance | Split gifts must total source amount | One optional `fundId` | No split/equality constraint | Allocation children and validated total | High | P1 | `db.ts`, forms | offerings/allocations/funds | Yes | Proposed |
| Service batch | Church operations | Group service inputs/totals | `counting_sessions` is service count | Not cross-channel batch | Decide subtype vs separate aggregate | High | P1 | counting/Inbox | counting/batch | Maybe | Decision |
| First-class reconciliation | ChurchTrac-style operations | Show expected vs bank/cash/deposit variance | Strong cash satang reconciliation | No account/statement/cross-channel model | Add account/deposit identity and visible variance | High | P1 | counting/bank/reports | bank/deposit/reconciliation | Yes | Proposed |
| Immutable audit history | Financial SaaS | Trace who/what/when/before/after/why | Metadata-only audit | No before/after, atomicity, immutability | Transactional audit and finance timeline | High | P0/P1 | `db.ts`, `routers.ts` | audit/financial tables | Yes | Proposed |
| Least privilege | Modern SaaS | Donor/finance data needs role/tenant controls | Clerk/role middleware; no RLS; broad member/report reads | DB and route policy gaps | Tenant model/RLS or documented single-tenant boundary; gate PII | Critical | P0 | auth/routers/migrations | users/all tenant tables | Yes | Blocked |
| Exception-first Home | Church operations | “What needs attention?” should lead | Home shows financial status/dialogs | No pending-work summary | Reorder Home after Inbox exists | Medium | P2 | Home files | none | No | Proposed |
| Mobile review workspace | Mobile giving | Field review must work on mobile | Mobile nav exists | No evidence/review/device tests | Mobile-first Inbox/match/approval | Medium | P2 | Inbox/layout | evidence/transaction | Follows Phase 2 | Proposed |
| Consistent financial UX | Product UX benchmark | Calm, reusable controls | Hardcoded styles + dormant primitives | Drift/accessibility cost | Consolidate after P0/P1 | Medium | P2 | UI files | none | No | Proposed |

## Gate rules

- P0/P1 items require business semantics and migration review.
- No product is copied; only workflow patterns are considered.
- `0003` and `0004` are untracked and absent from the journal; they are not approved migrations.
- No implementation starts until the row is approved with acceptance criteria.

## Dependency order

1. Credential containment and live schema/RLS verification.
2. Canonical financial model: journal, transaction, allocation, reversal, tenant.
3. Migration journal/reproducibility and constraints.
4. Evidence/OCR/LINE contract, Inbox, matching.
5. State machine and approvals.
6. Batch/reconciliation, audit, security.
7. UX/design system and exception-first Home.

## Decisions blocking implementation

- Immutable journal or single canonical transaction with derived balances?
- Must every giving/expense have a fund? Is split allocation immediate?
- Permanently single-tenant, or tenant-aware users/RLS now?
- Is `counting_sessions` the batch aggregate or a subtype?
- Which LINE/OCR provider and webhook contract are authoritative?
- What evidence retention and donor privacy rules apply?
