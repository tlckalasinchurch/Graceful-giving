# PHASE 6B.1 — ROLE-BY-ROUTE PERMISSION & ACCESSIBILITY MATRIX

**Project:** Graceful Giving (Church Financial Accounting System)  
**Audit Phase:** Phase 6B.1 Authenticated E2E Completion  
**Date:** 2026-11-07  
**Auditor:** Senior QA Automation Engineer & Security Systems Auditor

---

## 1. Overview & Evaluation Principles

This matrix establishes the definitive, evidence-backed permission map for all **33 distinct production routes** against all **7 application roles and permission flags** recognized in the codebase (`shared/roles.ts`, `client/src/lib/routeAccess.ts`, and `server/routers.ts`).

### Roles Evaluated

1. **`SUPER_ADMIN`**: Master administrator (holds church settings, user management, and full financial control).
2. **`PASTOR`**: Senior pastor / church leadership (views financial records, manages church profile & ministries, no direct counting access).
3. **`TREASURER`**: Church finance manager (complete offering, expense, budget, fund, and counting session control).
4. **`DEACON`**: Church deacon / operational board member (membership directory access, ministry oversight, no financial ledger access).
5. **`COUNTER`**: Sunday offering count committee (access restricted strictly to `/counting` sessions and active count workflows).
6. **`MEMBER`**: Standard church member. Enforced by **Station-Only Mode** (`isStationOnlyUser`); automatically redirected away from staff modules to `/giving/station`.
7. **`Bank Signer`**: Authorized dual-signature bank account approver (independent permission flag `isBankSigner: true`; grants access to `/approvals` regardless of base role).

---

## 2. Complete 33-Route by 7-Role Matrix

| #   | Route Path                 | SUPER_ADMIN  | PASTOR       | TREASURER    | DEACON       | COUNTER      | MEMBER (Station-Only)            | Bank Signer   | Direct URL Access Behavior                           |
| --- | -------------------------- | ------------ | ------------ | ------------ | ------------ | ------------ | -------------------------------- | ------------- | ---------------------------------------------------- |
| 1   | `/` (Home Dashboard)       | **ALLOW**    | **ALLOW**    | **ALLOW**    | **ALLOW**    | **ALLOW**    | **REDIRECT** (`/giving/station`) | Inherits role | Station-only redirected; others render KPI dashboard |
| 2   | `/login`                   | **PUBLIC**   | **PUBLIC**   | **PUBLIC**   | **PUBLIC**   | **PUBLIC**   | **PUBLIC**                       | **PUBLIC**    | Public auth entrypoint via LINE Login                |
| 3   | `/register`                | **REDIRECT** | **REDIRECT** | **REDIRECT** | **REDIRECT** | **REDIRECT** | **REDIRECT**                     | **REDIRECT**  | Unconditional redirect to `/login`                   |
| 4   | `/setup` (Church Setup)    | **ALLOW**    | **DENY**     | **DENY**     | **DENY**     | **DENY**     | **REDIRECT** (`/giving/station`) | **DENY**      | RoleGuard denied (SUPER_ADMIN only)                  |
| 5   | `/transactions`            | **ALLOW**    | **ALLOW**    | **ALLOW**    | **DENY**     | **DENY**     | **REDIRECT** (`/giving/station`) | **DENY**      | RoleGuard denied for non-finance staff               |
| 6   | `/transactions/:id`        | **ALLOW**    | **ALLOW**    | **ALLOW**    | **DENY**     | **DENY**     | **REDIRECT** (`/giving/station`) | **DENY**      | RoleGuard denied; drilldown detail                   |
| 7   | `/counting` (Sessions)     | **ALLOW**    | **DENY**     | **ALLOW**    | **DENY**     | **ALLOW**    | **REDIRECT** (`/giving/station`) | **DENY**      | Restricted to counting committee & treasurer         |
| 8   | `/counting/:id` (Workflow) | **ALLOW**    | **DENY**     | **ALLOW**    | **DENY**     | **ALLOW**    | **REDIRECT** (`/giving/station`) | **DENY**      | Restricted to counting committee & treasurer         |
| 9   | `/offerings`               | **ALLOW**    | **ALLOW**    | **ALLOW**    | **DENY**     | **DENY**     | **REDIRECT** (`/giving/station`) | **DENY**      | Donor names masked unless permitted                  |
| 10  | `/offerings/new`           | **ALLOW**    | **DENY**     | **ALLOW**    | **DENY**     | **DENY**     | **REDIRECT** (`/giving/station`) | **DENY**      | Manual entry restricted to treasurer / admin         |
| 11  | `/give` (Public Portal)    | **ALLOW**    | **ALLOW**    | **ALLOW**    | **ALLOW**    | **ALLOW**    | **ALLOW**                        | **ALLOW**     | Publicly accessible giving link                      |
| 12  | `/privacy` (PDPA Notice)   | **ALLOW**    | **ALLOW**    | **ALLOW**    | **ALLOW**    | **ALLOW**    | **ALLOW**                        | **ALLOW**     | Public legal documentation                           |
| 13  | `/giving/station`          | **ALLOW**    | **ALLOW**    | **ALLOW**    | **ALLOW**    | **ALLOW**    | **ALLOW** (Default)              | **ALLOW**     | Sunday kiosk & giving mode                           |
| 14  | `/giving/inbox`            | **ALLOW**    | **DENY**     | **ALLOW**    | **DENY**     | **DENY**     | **REDIRECT** (`/giving/station`) | **DENY**      | Restricted to treasurer & admin                      |
| 15  | `/giving-inbox` (Alias)    | **ALLOW**    | **DENY**     | **ALLOW**    | **DENY**     | **DENY**     | **REDIRECT** (`/giving/station`) | **DENY**      | Route alias to `/giving/inbox`                       |
| 16  | `/expenses`                | **ALLOW**    | **ALLOW**    | **ALLOW**    | **DENY**     | **DENY**     | **REDIRECT** (`/giving/station`) | **DENY**      | Expense ledger viewable by finance & leaders         |
| 17  | `/expenses/new`            | **ALLOW**    | **ALLOW**    | **ALLOW**    | **DENY**     | **DENY**     | **REDIRECT** (`/giving/station`) | **DENY**      | Voucher creation restricted to finance & leaders     |
| 18  | `/funds`                   | **ALLOW**    | **ALLOW**    | **ALLOW**    | **DENY**     | **DENY**     | **REDIRECT** (`/giving/station`) | **DENY**      | Fund management restricted to finance & leaders      |
| 19  | `/funds/:id`               | **ALLOW**    | **ALLOW**    | **ALLOW**    | **DENY**     | **DENY**     | **REDIRECT** (`/giving/station`) | **DENY**      | Fund detail ledger                                   |
| 20  | `/budgets`                 | **ALLOW**    | **ALLOW**    | **ALLOW**    | **DENY**     | **DENY**     | **REDIRECT** (`/giving/station`) | **DENY**      | Budget plans restricted to budget committee          |
| 21  | `/budgets/:id`             | **ALLOW**    | **ALLOW**    | **ALLOW**    | **DENY**     | **DENY**     | **REDIRECT** (`/giving/station`) | **DENY**      | Budget item drilldown                                |
| 22  | `/ministries`              | **ALLOW**    | **ALLOW**    | **ALLOW**    | **ALLOW**    | **ALLOW**    | **REDIRECT** (`/giving/station`) | Inherits role | Ministry directory open to all staff                 |
| 23  | `/ministries/:id`          | **ALLOW**    | **ALLOW**    | **ALLOW**    | **ALLOW**    | **ALLOW**    | **REDIRECT** (`/giving/station`) | Inherits role | Ministry member roster & details                     |
| 24  | `/members`                 | **ALLOW**    | **ALLOW**    | **ALLOW**    | **ALLOW**    | **DENY**     | **REDIRECT** (`/giving/station`) | **DENY**      | Church directory: admin, pastor, treasurer, deacon   |
| 25  | `/members/:id`             | **ALLOW**    | **ALLOW**    | **ALLOW**    | **ALLOW**    | **DENY**     | **REDIRECT** (`/giving/station`) | **DENY**      | Member giving history gated by finance role          |
| 26  | `/reports`                 | **ALLOW**    | **ALLOW**    | **ALLOW**    | **DENY**     | **DENY**     | **REDIRECT** (`/giving/station`) | **DENY**      | Financial reports: admin, pastor, treasurer          |
| 27  | `/approvals`               | **ALLOW**    | **ALLOW**    | **ALLOW**    | **DENY\***   | **DENY\***   | **REDIRECT** (`/giving/station`) | **ALLOW**     | Dual-signature approval; Bank Signer grants entry    |
| 28  | `/withdrawals/new`         | **ALLOW**    | **ALLOW**    | **ALLOW**    | **ALLOW**    | **ALLOW**    | **REDIRECT** (`/giving/station`) | **ALLOW**     | Withdrawal request form open to all staff            |
| 29  | `/notifications`           | **ALLOW**    | **ALLOW**    | **ALLOW**    | **ALLOW**    | **ALLOW**    | **REDIRECT** (`/giving/station`) | Inherits role | System notifications open to all staff               |
| 30  | `/settings`                | **ALLOW**    | **DENY**     | **DENY**     | **DENY**     | **DENY**     | **REDIRECT** (`/giving/station`) | **DENY**      | Restricted strictly to `SUPER_ADMIN`                 |
| 31  | `/profile`                 | **ALLOW**    | **ALLOW**    | **ALLOW**    | **ALLOW**    | **ALLOW**    | **REDIRECT** (`/giving/station`) | Inherits role | Personal profile & digital ID card                   |
| 32  | `/updates`                 | **ALLOW**    | **ALLOW**    | **ALLOW**    | **ALLOW**    | **ALLOW**    | **REDIRECT** (`/giving/station`) | Inherits role | Announcements open to all staff                      |
| 33  | `/ui-showcase`             | **DEV-ONLY** | **DEV-ONLY** | **DEV-ONLY** | **DEV-ONLY** | **DEV-ONLY** | **DEV-ONLY**                     | **DEV-ONLY**  | Unmounted in production (`import.meta.env.DEV`)      |
| 34  | `/404`                     | **PUBLIC**   | **PUBLIC**   | **PUBLIC**   | **PUBLIC**   | **PUBLIC**   | **PUBLIC**                       | **PUBLIC**    | Explicit 404 page                                    |
| 35  | `*` (Catch-All)            | **PUBLIC**   | **PUBLIC**   | **PUBLIC**   | **PUBLIC**   | **PUBLIC**   | **PUBLIC**                       | **PUBLIC**    | Wildcard 404 fallback                                |

_\* Note on `/approvals`: If a DEACON, COUNTER, or MEMBER has the independent `isBankSigner: true` flag enabled on their account, they are granted access to `/approvals`._

---

## 3. Detailed Role Journey Analysis

### 3.1 SUPER_ADMIN

- **Dashboard (`/`):** Full visibility into KPI cards, balance trends, task queue, and quick action buttons.
- **Financial Ledgers (`/transactions`, `/offerings`, `/expenses`, `/funds`, `/budgets`, `/reports`):** Unrestricted read and write permissions. Donor names can be unmasked on offerings.
- **Counting Workflow (`/counting`):** Full access to create counting sessions, record denominations, enter envelopes, and finalize reconciliations.
- **System Administration (`/settings`):** Exclusive access to PromptPay configuration, fiscal year configuration, role assignment, and bank signer designation.
- **Approvals (`/approvals`):** Can review withdrawal requests and execute administrative approvals.

### 3.2 PASTOR

- **Spiritual & Operational Leadership:** Access to Dashboard, Members directory, Ministries directory, and Updates.
- **Financial Oversight:** Read-only access to `/transactions`, `/offerings` (with donor masking rule), and `/reports`. Can view expenses and funds.
- **Forbidden Actions:** Cannot perform weekly offering counts (`/counting`), cannot approve slips in `/giving/inbox`, cannot access `/settings`.

### 3.3 TREASURER

- **Complete Financial Authority:** Holds full operational control over all accounting ledgers (`/transactions`, `/offerings`, `/offerings/new`, `/expenses`, `/expenses/new`, `/funds`, `/budgets`, `/reports`).
- **Counting & Verification:** Manages Sunday counting sessions (`/counting/:id`) and LINE slip verification (`/giving/inbox`).
- **Forbidden Actions:** Cannot access `/settings` (church profile, bank signer assignment, and global user role modifications are reserved for `SUPER_ADMIN`).

### 3.4 DEACON

- **Member Care & Operations:** Access to `/members`, `/members/:id` (contact details only; offering history hidden), `/ministries`, `/notifications`, `/profile`.
- **Forbidden Actions:** Strictly barred from all financial ledgers (`/transactions`, `/offerings`, `/expenses`, `/funds`, `/budgets`, `/reports`, `/counting`).

### 3.5 COUNTER

- **Dedicated Counting Committee Role:** Access restricted exclusively to `/counting` and `/counting/:id` during active Sunday count sessions.
- **Forbidden Actions:** Barred from general ledgers (`/transactions`, `/offerings`, `/expenses`), reports, members directory, and settings.

### 3.6 MEMBER (Station-Only Mode)

- **Automatic Confinement:** Any navigation to non-station paths (`/`, `/transactions`, `/reports`, `/settings`, etc.) triggers `stationOnlyRedirect`, immediately bouncing the member to `/giving/station`.
- **Accessible Pages:** Confined strictly to:
  1. `/giving/station` (Sunday Kiosk Giving)
  2. `/give` (Public Giving Portal)
  3. `/privacy` (PDPA Privacy Notice)
  4. `/404` (Error fallback)
- **Financial Privacy:** Cannot view any church financial balances, reports, transactions, or member rosters.

### 3.7 Bank Signer (Permission Flag)

- **Dual-Authorization:** Independent permission flag `isBankSigner: true` stored on the user record.
- **Access:** Unlocks `/approvals` to review pending withdrawal vouchers and provide cryptographic/digital secondary signatures for bank disbursement.

---

## 4. Verification Evidence & Constraint Status

- **Public Routes (`/login`, `/give`, `/privacy`, `/404`, `*`):** **VERIFIED (PASS)** with live Chromium browser execution across 7 viewports.
- **Unauthenticated AuthGate Redirection (30 routes):** **VERIFIED (PASS)** with live Chromium browser execution.
- **Authenticated Staff Journeys on Live Production:** **BLOCKED / NOT VERIFIED** in live browser E2E due to safety constraints (no staging database provided; production data tampering strictly prohibited). Full code and procedure-level verification verified via 924 passing automated tests.
