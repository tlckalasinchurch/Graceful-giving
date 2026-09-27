# Withdrawal Accounting Decision

**Date:** 2026-09-26  
**Status:** DECISION ANALYSIS ONLY — NO IMPLEMENTATION AUTHORIZED  
**Scope:** Withdrawal accounting semantics only; no code, schema, or migration changes.

## Current Behavior

### Withdrawal Request Lifecycle

```text
request (pending)
  ↓
approve (approved/rejected)
  ↓
disburse (disbursed)
```

### Current Implementation

**State: PENDING → APPROVED**
- Input: `amount`, `purpose`, `details`, optional `fundId`
- Database change: Updates `withdrawal_requests.status` to `"approved"` or `"rejected"`
- Sets: `approvedBy`, `approvalDate`, `approvalNote` or `rejectionReason`
- **Financial effect:** NONE
- Evidence: `server/routers.ts:762-790`, `server/db.ts:950-979`

**State: APPROVED → DISBURSED**
- Input: withdrawal `id`
- Database change: Updates `withdrawal_requests.status` to `"disbursed"`
- **Financial effect:** NONE — only status change
- Evidence: `server/routers.ts:791-799`, `server/db.ts:981-999`

### Financial Records Created

**NONE** — The current implementation creates no financial records during withdrawal approval or disbursement. No `finance_accounts.balance` change, no journal entries, no expense records.

### Comparison with Existing Financial Flows

| Flow | Financial Record Created | Balance Effect | Journal |
|------|------------------------|----------------|---------|
| Offering creation | `offerings` row | Increments `finance_accounts.balance` | No |
| Expense creation | `expenses` row | Decrements `finance_accounts.balance` | No |
| Withdrawal disbursement | **NONE** | **NONE** | **No** |

**Evidence:** `server/db.ts:486-505` (offering balance increment), `server/db.ts:640-658` (expense balance decrement), `server/db.ts:981-999` (withdrawal status-only change)

## Financial Meaning

### Possible Domain Interpretations

Based on the existing codebase model and approved architecture decisions, a withdrawal could represent:

**A. Expense**
- Similar to manual expenses: church spending for a purpose
- Evidence: `expenses` table exists with `amount`, `category`, `fundId`, `payee`, `status`
- Current withdrawal has `purpose`, `fundId`, `amount` — similar shape
- Expense lifecycle: `draft → approved → paid → voided`
- Withdrawal lifecycle: `pending → approved → disbursed` (parallel)

**B. Transfer between funds**
- Movement from one fund to another
- Evidence: Architecture Decision 2 defines allocation model but does not mention inter-fund transfers
- No transfer table or transaction type exists in current schema
- Withdrawal has only one `fundId`, not source + destination

**C. Liability settlement**
- Paying a liability (money owed to someone)
- Evidence: No liability table or payable tracking exists
- Withdrawal has `purpose` field but no payee identification (unlike expenses)

**D. Domain-specific withdrawal type**
- A separate financial transaction type distinct from expenses
- Evidence: `withdrawal_requests` table exists as separate entity from `expenses`
- Has its own status enum and approval workflow
- Architecture Decision 1 does not explicitly classify withdrawal meaning

### Supported by Current Model

**Current schema supports:**
- A (Expense): `expenses` table with fund linkage and status workflow
- D (Domain-specific): `withdrawal_requests` table as separate approval workflow

**Current schema does NOT support:**
- B (Transfer): No inter-fund transfer mechanism
- C (Liability): No liability/payable tracking

### Architecture Decision Alignment

Decision 1 (Hybrid Financial Source of Truth) states:
- "Canonical financial fact is an immutable journal entry set associated with an approved financial transaction"
- "The transaction record is the operational/business document"
- "Posted journal sets are immutable; reversal appends compensating entries"

Decision 2 (Fund Allocation) states:
- "Fund is required at posting/approval"
- "Unresolved fund is allowed only before approval/posting"

**Status:** Withdrawal financial meaning is **OWNER DECISION REQUIRED** between (A) Expense subtype or (D) Separate withdrawal transaction type.

## Debit Account

### Possible Debit Accounts

Based on existing `finance_accounts` model (lines 287-304 in schema):

**1. Expense/Payment Account**
- Debit when church pays money out
- Evidence: Expenses currently decrement `finance_accounts.balance` (credit effect in accounting terms)
- No explicit expense account type exists in schema

**2. Specific Fund Account**
- Debit the specific fund from which withdrawal is made
- Evidence: Withdrawal has optional `fundId` field
- Current expenses also use `fundId`
- `finance_accounts.type` enum: `general`, `tithe`, `mission`, `building`, `welfare`, `special`

**3. Cash/Bank Account**
- Debit bank/cash on hand when payment occurs
- Evidence: `bank_records` table tracks deposits/transfers
- No explicit cash/bank account type in `finance_accounts`

### Current Model Constraints

- `finance_accounts` has `type` enum but no explicit "cash" or "bank" account type
- No separate chart of accounts beyond fund types
- Current expense flow: decrement `finance_accounts.balance` directly without account classification

**Status:** Debit account is **OWNER DECISION REQUIRED** — need chart of accounts definition.

## Credit Account

### Possible Credit Accounts

**1. Cash/Bank Account**
- Credit cash/bank when money leaves
- Evidence: `bank_records` tracks bank deposits and transfers
- Architecture Decision 1 mentions "bank reconciliation" but no explicit bank account

**2. Payable/Liability Account**
- Credit liability when settling
- Evidence: No liability table exists

**3. Suspense/Disbursement Account**
- Credit a temporary account during disbursement
- Evidence: No suspense account exists

### Current Model Constraints

- No explicit cash/bank account in `finance_accounts`
- No liability tracking
- No suspense or clearing accounts

**Status:** Credit account is **OWNER DECISION REQUIRED** — need chart of accounts definition.

## Fund Impact

### Current Withdrawal Fund Relationship

- Withdrawal has optional `fundId` field (line 378 in schema)
- No current financial effect on fund balance during disbursement
- Similar to expenses which have `fundId` and decrement balance

### Possible Fund Impacts

**A. Decrease fund balance**
- Similar to current expense behavior
- Debit fund, credit cash/bank
- Evidence: Expenses currently decrement `finance_accounts.balance`

**B. No fund impact (pure cash movement)**
- Transfer between cash/bank accounts only
- Fund balance unchanged
- Evidence: Not supported by current expense model

**C. Require fund at approval**
- Fund must be specified before approval (per Decision 2)
- No unresolved fund posting
- Evidence: Decision 2 states "Fund is required at posting/approval"

### Supported by Current Model

- A (Decrease fund balance): Supported by expense pattern
- C (Require fund at approval): Required by Decision 2

**Status:** Fund impact is **OWNER DECISION REQUIRED** — confirm whether withdrawal decreases fund balance like expenses.

## Cash / Bank Impact

### Current Cash/Bank Tracking

- `bank_records` table tracks `transfer_in` and `cash_deposit` (lines 588-612 in schema)
- No explicit cash/bank account balance tracking
- No bank account reconciliation workflow

### Possible Cash/Bank Impacts

**A. Decrease bank account balance**
- Credit bank account when withdrawal is paid
- Requires bank account entity and balance tracking
- Evidence: `bank_records` exists but no bank account table

**B. No bank account tracking**
- Cash disbursement only
- No bank balance reconciliation
- Evidence: Current implementation has no bank account model

**C. Record disbursement evidence only**
- Track that disbursement occurred
- No balance reconciliation
- Evidence: Could extend `bank_records` or create evidence record

### Supported by Current Model

- C (Evidence only): Could add disbursement record to `bank_records` or new table
- A (Bank balance): Requires new bank account entity

**Status:** Cash/bank impact is **OWNER DECISION REQUIRED** — need bank account tracking decision.

## Posting Point

### Current Posting Points

The current withdrawal lifecycle has three state transitions:

**1. Request (PENDING)**
- Action: Create withdrawal request
- Financial posting: NONE
- Evidence: `withdrawals.create` in routers, no financial mutation

**2. Approve (APPROVED/REJECTED)**
- Action: Change status and record approval/rejection
- Financial posting: NONE
- Evidence: `withdrawals.approve` in routers, status-only change

**3. Disburse (DISBURSED)**
- Action: Change status to disbursed
- Financial posting: NONE
- Evidence: `withdrawals.disburse` in routers, status-only change

### Possible Posting Points

**A. Post at approval**
- Create financial record when approved
- Debit fund, credit cash/bank (per chart of accounts)
- Evidence: Expenses start `approved` and have immediate financial effect
- Domain semantics: Approval = commitment to pay

**B. Post at disbursement**
- Create financial record when actually paid
- Debit fund, credit cash/bank
- Evidence: Withdrawal has separate disbursement step
- Domain semantics: Disbursement = actual cash movement

**C. Post at request**
- Create financial record immediately upon request
- Evidence: Current offerings create financial record immediately
- Domain semantics: Request = immediate obligation

### Domain Semantics Analysis

**Approval vs Disbursement distinction:**
- Current model separates approval and disbursement
- Suggests different financial events
- Approval = authorization to pay
- Disbursement = actual payment

**Architecture Decision 1 alignment:**
- "Posting creates the approved transaction and journal effects exactly once"
- "Posted transactions cannot be silently edited"
- Suggests posting should occur at a single clear boundary

### Comparison with Existing Flows

| Flow | Posting Point | Financial Effect |
|------|--------------|------------------|
| Offering | Creation | Immediate balance increment |
| Expense | Creation | Immediate balance decrement |
| Withdrawal | **NONE** | **No financial effect** |

**Status:** Posting point is **OWNER DECISION REQUIRED** — choose between approval (commitment) or disbursement (actual payment).

## Financial Invariants

### Invariants Required by Architecture Decision 1

**A. Debit = Credit**
- Every journal entry set must balance
- Evidence: Decision 1 states "Every posted journal set must balance by debit and credit"

**B. Posted amount = withdrawal amount**
- Journal amount must equal approved withdrawal amount
- Evidence: Decision 1 states "Posted journal sets are immutable"

**C. Fund allocation = valid**
- Fund must exist, be active, same tenant
- Evidence: Decision 2 states "Same-tenant fund validation" and "active fund"

**D. No negative balance**
- Fund balance cannot go negative
- Evidence: Not explicitly stated in decisions, but implied by financial correctness

**E. No duplicate posting**
- Cannot post same withdrawal twice
- Evidence: Decision 1 states "Posting is idempotent; retries cannot create duplicate journal effects"

### Current Model Support

| Invariant | Supported | Current Implementation |
|-----------|-----------|------------------------|
| Debit = Credit | **No** | No journal exists |
| Posted amount = withdrawal amount | **No** | No posting exists |
| Fund allocation = valid | **Partial** | `fundId` exists but no validation of active/same-tenant |
| No negative balance | **No** | No balance constraint |
| No duplicate posting | **No** | No posting mechanism |

**Status:** All invariants are **OWNER DECISION REQUIRED** for specification and enforcement.

## Approval / Disbursement Lifecycle

### Current State Machine

```text
PENDING → APPROVED → DISBURSED
          ↓
        REJECTED
```

### Possible Financial Posting Points in Lifecycle

**Option 1: Post at APPROVED**
```text
PENDING → APPROVED (post journal) → DISBURSED (no financial effect)
          ↓
        REJECTED (no financial effect)
```

**Option 2: Post at DISBURSED**
```text
PENDING → APPROVED (no financial effect) → DISBURSED (post journal)
          ↓
        REJECTED (no financial effect)
```

**Option 3: Post at REQUEST**
```text
PENDING (post journal) → APPROVED (no financial effect) → DISBURSED (no financial effect)
```

### Domain Semantics by Option

| Option | Financial Meaning | Business Risk |
|--------|------------------|---------------|
| Post at request | Immediate obligation on request | High risk of unapproved obligations |
| Post at approval | Commitment to pay when approved | Standard accrual accounting |
| Post at disbursement | Actual cash movement only | Cash-basis accounting |

### Evidence from Architecture Decisions

Decision 1 states:
- "Posting creates the approved transaction and journal effects exactly once"
- Suggests posting should occur at approval, not request

Decision 5 (LINE/OCR) states:
- "Only an approved, validated transaction may create canonical allocations and journal entries"
- Reinforces approval as posting boundary

**Status:** Approval/disbursement lifecycle with posting point is **OWNER DECISION REQUIRED**.

## Failure Cases

### Insufficient Fund

**Current behavior:** Not enforced — no financial effect, so no balance check

**Possible policies:**
1. **Block withdrawal** if fund balance < withdrawal amount
2. **Allow negative balance** with warning
3. **Allow cross-fund transfer** to cover shortfall
4. **Require fund balance verification** at approval or disbursement

**Evidence:** Decision 2 requires fund at posting but does not specify insufficient fund policy.

**Status:** Insufficient fund policy is **OWNER DECISION REQUIRED**.

### Double Disbursement

**Current behavior:** Possible — `disburseWithdrawal` only checks status is "approved", not if already disbursed

**Evidence:** `server/db.ts:994` checks `eq(withdrawalRequests.status, "approved")` but does not prevent race condition

**Possible policies:**
1. **Compare-and-set** update on status (similar to counting post)
2. **Unique constraint** on disbursement event
3. **Idempotency key** on disbursement operation

**Status:** Double disbursement prevention is **OWNER DECISION REQUIRED**.

### Partial Disbursement

**Current behavior:** Not supported — withdrawal has single amount

**Possible policies:**
1. **Forbid partial** — full amount or nothing
2. **Allow partial** with multiple disbursement records
3. **Require new withdrawal request** for remaining amount

**Evidence:** No partial disbursement mechanism exists in schema.

**Status:** Partial disbursement policy is **OWNER DECISION REQUIRED**.

### Cancelled Withdrawal

**Current behavior:** Rejection only — no cancellation state

**Possible policies:**
1. **Rejection only** — no cancellation, just rejection
2. **Cancellation before approval** — separate from rejection
3. **Cancellation after approval** — requires reversal

**Evidence:** Status enum has `rejected` but no `cancelled`.

**Status:** Cancellation semantics is **OWNER DECISION REQUIRED**.

### Rejected Withdrawal

**Current behavior:** Status change to "rejected" with `rejectionReason`

**Financial effect:** NONE (no journal, no balance change)

**Evidence:** `server/db.ts:950-979` updates status and rejection reason

**Status:** Rejected withdrawal policy is **OWNER DECISION REQUIRED** for whether any financial record is created.

### Post-Disbursement Correction

**Current behavior:** Not supported — no correction mechanism

**Possible policies:**
1. **Linked reversal transaction** (per Decision 1)
2. **Void and reissue** new withdrawal
3. **Adjustment transaction** with reason

**Evidence:** Decision 1 states "Create a linked reversal journal entry set and a reversal business record."

**Status:** Post-disbursement correction is **OWNER DECISION REQUIRED**.

### Reversal

**Current behavior:** Not supported — no reversal mechanism

**Evidence:** Decision 1 states reversal semantics for corrections but no implementation.

**Possible policies:**
1. **Reversal journal entry** + reversal business record
2. **Reversal must be approved** with reason
3. **Original preserved** (immutable per Decision 1)

**Status:** Reversal policy is **OWNER DECISION REQUIRED**.

## Audit Requirements

### Current Audit Coverage

**Withdrawal request creation:**
- Audit log created? **NO** — router does not call `createAuditLog`
- Evidence: `server/routers.ts:742-761` — no audit call

**Withdrawal approval:**
- Audit log created? **NO** — router does not call `createAuditLog`
- Evidence: `server/routers.ts:762-790` — no audit call

**Withdrawal disbursement:**
- Audit log created? **NO** — router does not call `createAuditLog`
- Evidence: `server/routers.ts:791-799` — no audit call

### Required Audit Events (per Decision 1)

Decision 1 states:
- "Audit is both transaction-level and journal-level"
- "Journal records actor, timestamp, reason, source transaction, and before/after posting state"
- "Financial mutation and AuditEvent share one transaction boundary"

**Required events:**
1. Withdrawal request creation
2. Approval/rejection decision
3. Disbursement execution
4. Journal posting (if implemented)
5. Correction/reversal (if implemented)

**Status:** Audit requirements are **OWNER DECISION REQUIRED** for scope and before/after data.

## Owner Decisions Required

| Decision | Options | Owner Decision | Status |
|----------|---------|----------------|--------|
| Withdrawal financial meaning | A. Expense subtype<br>B. Transfer between funds<br>C. Liability settlement<br>D. Separate withdrawal transaction type | | OPEN |
| Debit account | 1. Expense/Payment account<br>2. Specific fund account<br>3. Cash/Bank account | | OPEN |
| Credit account | 1. Cash/Bank account<br>2. Payable/Liability account<br>3. Suspense/Disbursement account | | OPEN |
| Posting point | A. Post at request<br>B. Post at approval<br>C. Post at disbursement | | OPEN |
| Fund impact | A. Decrease fund balance<br>B. No fund impact<br>C. Require fund at approval | | OPEN |
| Cash/bank impact | A. Decrease bank account balance<br>B. No bank account tracking<br>C. Record disbursement evidence only | | OPEN |
| Insufficient funds | 1. Block withdrawal<br>2. Allow negative with warning<br>3. Allow cross-fund transfer<br>4. Require balance verification | | OPEN |
| Partial disbursement | 1. Forbid partial<br>2. Allow partial with multiple records<br>3. Require new request | | OPEN |
| Cancellation | 1. Rejection only<br>2. Cancellation before approval<br>3. Cancellation after approval | | OPEN |
| Rejection financial effect | 1. No financial record<br>2. Create audit record only<br>3. Create pending liability record | | OPEN |
| Post-disbursement correction | 1. Linked reversal transaction<br>2. Void and reissue<br>3. Adjustment transaction | | OPEN |
| Reversal | 1. Reversal journal + business record<br>2. Must be approved with reason<br>3. Original preserved | | OPEN |
| Audit scope | 1. Transaction-level only<br>2. Journal-level only<br>3. Both with before/after | | OPEN |
| Chart of accounts | 1. Use existing fund types as accounts<br>2. Define full chart of accounts<br>3. Minimal account set | | OPEN |

## Approved Policy

**NONE** — No withdrawal accounting policy has been approved. Implementation is BLOCKED until owner decisions are made.

---

## Evidence References

- Schema: `drizzle/schema.ts:372-394` (withdrawal_requests table)
- Disbursement function: `server/db.ts:981-999`
- Withdrawal router: `server/routers.ts:732-799`
- Expense balance decrement: `server/db.ts:640-658`
- Offering balance increment: `server/db.ts:486-505`
- Architecture Decision 1: `GRACE_ARCHITECTURE_DECISIONS.md:25-56`
- Architecture Decision 2: `GRACE_ARCHITECTURE_DECISIONS.md:58-89`
- Forensics: `GRACE_GIVING_FORENSICS.md:86-94` (financial tables)
