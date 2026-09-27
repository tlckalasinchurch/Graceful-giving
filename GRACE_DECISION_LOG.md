# GRACE DECISION LOG

**Version:** 0.1 — 2026-09-24  
**Purpose:** Record security containment and the nine architecture/business decisions required before Phase 1 implementation.  
**Status:** No implementation is authorized. Secret rotation and formal approvals remain pending.

## Decision governance

Each decision records: conclusion, options, recommendation, approver, deadline, and system impact. `OPEN` means not decided. `BLOCKED` means affected implementation must not proceed. `VERIFIED` means evidence was collected, not necessarily approved.

**Required approver:** Product Owner plus the responsible Finance/Accounting, Security/Platform, or Data/Privacy owner.  
**Current approval state:** No formal Product Owner approval recorded in this repository.  
**Implementation gate:** CLOSED until P0 secret containment and applicable approvals are complete.

## P0 Secret Incident Containment

**Conclusion required:** All potentially exposed credentials must be revoked/rotated, removed from unsafe storage/history where necessary, moved to the approved secret manager/environment system, and production usage verified.

**Evidence collected (no secret values reproduced):**
- `.env` and `env` exist locally.
- `.env` is ignored; `env` is not ignored and is currently untracked.
- Current tracked-file scan found no matching credential pattern.
- Public repository page does not list `env` as a tracked file.
- Public history shows LINE/OCR/storage feature commits, while the local tree differs from the visible public branch history; this discrepancy requires owner/platform verification.
- No rotation, revocation, secret-manager migration, or production verification was performed in this documentation-only step.
- Public PR #27 verification (2026-09-24): PR is Draft, branch `security/p0-secret-containment`, no reviewer approval is visible, and it has not been merged. A Vercel Preview deployment was generated, which does not prove credential rotation or production safety.
- Repository ruleset `Protect main - P0 security gate` was reported active by the repository owner; public unauthenticated verification of the ruleset page was unavailable. Treat the owner report as pending evidence until an authorized maintainer confirms it.

**Options:** (1) rotate/revoke in place; (2) rotate/revoke, migrate to secret manager, remove unsafe local files, scan history, and verify production (recommended); (3) defer (not acceptable for P0).

**Recommendation:** Option 2. Treat every credential in `env`/`.env` as compromised until the owner proves otherwise. Do not copy values into tickets, logs, documents, or chat.

**Owner/approver:** Repository owner + Vercel/Clerk/database/storage credential owners.  
**Deadline:** Before any Phase 1 implementation or production deployment.  
**Blocker:** YES — P0.  
**Required evidence:** Revocation/rotation records, secret-manager references, GitHub secret-scan result, history review, production configuration verification, and confirmation old credentials no longer authenticate.

## Decision 1 — Chart of Accounts and Debit/Credit Rules

**Conclusion required:** Define canonical accounts, debit/credit direction, posting rules for giving/expense/withdrawal/reversal, and legacy account mapping.

**Options:** A) immutable double-entry journal; B) transaction-centric ledger; C) hybrid transaction + journal (current architecture decision).  
**Recommendation:** C.  
**Approver:** Product Owner + Finance/Accounting owner.  
**Deadline:** Before migration 002 design.  
**Impact:** Journal schema, backfill, reports, reversal, reconciliation, and acceptance tests.  
**Status:** OPEN — direction selected, account policy not approved.

## Decision 2 — Unresolved Fund Policy

**Conclusion required:** Define whether unresolved gifts use suspense, remain unposted, or follow another policy; define resolver and unresolved duration.

**Options:** A) block posting until selected; B) approved suspense account; C) configurable combination.  
**Recommendation:** C, with no silent default fund.  
**Approver:** Product Owner + Finance/Accounting owner.  
**Deadline:** Before allocation/posting implementation.  
**Impact:** Transaction states, allocation invariants, reports, permissions, and staff workflow.  
**Status:** OPEN.

## Decision 3 — User–Church Authorization

**Conclusion required:** Define User↔Church membership, role assignment, invitation/removal, and authorization boundary for single-tenant-now.

**Options:** A) fixed single church; B) full multi-tenant membership; C) explicit single-tenant membership with tenant-safe future shape (current decision).  
**Recommendation:** C.  
**Approver:** Product Owner + Security owner.  
**Deadline:** Before any Phase 1 financial/evidence mutation.  
**Impact:** RLS, service authorization, member privacy, cross-tenant tests, role administration.  
**Status:** OPEN — exact membership model not approved.

## Decision 4 — Batch and Reconciliation

**Conclusion required:** Define batch identity, lifecycle names, counting relationship, channels, discrepancy handling, close rules, and posting ownership.

**Options:** A) counting session is batch; B) batch aggregate with counting subtype (current decision); C) unrelated batch model.  
**Recommendation:** B.  
**Approver:** Product Owner + Finance/Operations owner.  
**Deadline:** Before migration 004.  
**Impact:** Counting, deposits, totals, close/reopen, reports, duplicate prevention.  
**Status:** OPEN — relationship selected; state/close policy not approved.


## Decision 5 — Access Rights

**Conclusion required:** Define who may view donor identity/contact, evidence, receipts, financial reports, exports, audit history, and privileged operations.

**Options:** A) role-only application checks; B) role + tenant + backend policy + RLS; C) broad authenticated access.  
**Recommendation:** B.  
**Approver:** Product Owner + Security/Privacy owner.  
**Deadline:** Before sensitive evidence or financial read paths change.  
**Impact:** RLS/grants, service authorization, signed URLs, audit access, member privacy.  
**Status:** OPEN — broad current routes are a P0/P1 risk.

## Decision 6 — LINE Webhook Contract

**Conclusion required:** Define channel type, event schema, signature verification, event idempotency, retry/dead-letter behavior, storage ownership, and replay handling.

**Options:** A) LINE as transaction source; B) LINE as evidence ingestion channel (current decision); C) defer LINE.  
**Recommendation:** B.  
**Approver:** Product Owner + Integration/Security owner.  
**Deadline:** Before evidence ingestion implementation.  
**Impact:** Webhook security, storage, duplicates, audit, retries, LINE operations.  
**Status:** OPEN — contract unknown; `OCR PROVIDER = UNDECIDED`.

## Decision 7 — OCR Provider and Retention

**Conclusion required:** Select provider abstraction implementation, model, thresholds, human review, raw/extracted retention, and fallback behavior.

**Options:** A) vendor-specific; B) provider-neutral `OcrProvider` (current decision); C) no OCR automation.  
**Recommendation:** B.  
**Approver:** Product Owner + Finance/Operations + Security/Privacy owner.  
**Deadline:** Before OCR implementation; not required for core journal/allocation design.  
**Impact:** Evidence quality, privacy, cost, duplicates, review workload, portability.  
**Status:** OPEN — `OCR VENDOR = UNDECIDED`.

## Decision 8 — Legal Retention and Deletion

**Conclusion required:** Define retention periods, legal hold, donor deletion, evidence deletion, audit retention, and financial-record immutability by jurisdiction/church policy.

**Options:** A) indefinite; B) fixed periods; C) configurable policy with legal hold (recommendation).  
**Recommendation:** C.  
**Approver:** Product Owner + Privacy/Legal owner.  
**Deadline:** Before production evidence storage or deletion features.  
**Impact:** Storage, compliance, donor rights, audit integrity, signed URLs, data requests.  
**Status:** OPEN — exact periods are not inferred.

## Decision 9 — Secret Incident Containment Decision

**Conclusion required:** Decide whether the incident is contained, what credentials are revoked/rotated, whether history rewrite is required, and who authorizes production verification.

**Options:** A) rotate and verify; B) rotate plus history/provider audit; C) defer.  
**Recommendation:** B until review proves history rewrite unnecessary.  
**Approver:** Repository owner + Security/Platform owner.  
**Deadline:** Immediate; before any implementation command.  
**Impact:** Production availability, Git history, Vercel/Clerk/database/storage credentials, incident response, release gate.  
**Status:** BLOCKED — no revoke/rotate action performed in this step.

## Approval record

| Decision | Conclusion | Options | Recommendation | Approver | Deadline | Status | Impact |
|---|---|---|---|---|---|---|---|
| 1 Chart/Debit-Credit | Required | A/B/C | C Hybrid | Product + Finance | Before 002 | OPEN | Yes |
| 2 Unresolved Fund | Required | A/B/C | C configurable/no default | Product + Finance | Before allocation | OPEN | Yes |
| 3 User-Church Auth | Required | A/B/C | C explicit single-tenant-safe | Product + Security | Before mutations | OPEN | Yes |
| 4 Batch/Reconciliation | Required | A/B/C | B batch + counting subtype | Product + Operations | Before 004 | OPEN | Yes |
| 5 Access Rights | Required | A/B/C | B role + tenant + RLS | Product + Security/Privacy | Before sensitive reads | OPEN | Yes |
| 6 LINE Webhook | Required | A/B/C | B evidence channel | Product + Integration/Security | Before ingestion | OPEN | Yes |
| 7 OCR/Retention | Required | A/B/C | B provider abstraction | Product + Finance/Security/Privacy | Before OCR | OPEN | Yes |
| 8 Legal Retention | Required | A/B/C | C configurable + legal hold | Product + Privacy/Legal | Before production evidence | OPEN | Yes |
| 9 Secret Incident | Required | A/B/C | B rotate + audit/history decision | Repository + Security/Platform | Immediate | BLOCKED | Yes |

## Gate status

**IMPLEMENTATION GATE: CLOSED**

Required before opening:
- [ ] P0 secret incident contained and verified
- [ ] All nine decisions formally approved or explicitly deferred with owner/date
- [ ] Blueprint updated to approved version/date
- [ ] Backup and migration rollback/recovery plan approved
- [ ] Product Owner issues a separate implementation command with scope and change authority
