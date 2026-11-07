# PHASE 6B.2 — AUTHENTICATED BROWSER E2E TEST PLAN

**Project:** Graceful Giving (Church Financial Accounting System)  
**Execution Tool:** Playwright / Headless Chromium CDP  
**Target Environment:** Isolated Staging Environment  
**Date:** 2026-11-07  
**Auditor:** QA Architect, Principal Software Engineer, Security QA Engineer

---

## 1. Test Taxonomy & Testing Boundaries

To ensure rigorous quality engineering without inflated coverage metrics, this plan strictly differentiates between the four testing layers:

```
┌────────────────────────────────────────────────────────┐
│             Layer 4: Authenticated Browser E2E         │  <-- Focus of this plan
│  (Real browser, real DOM, real network cookies, CDP)   │
├────────────────────────────────────────────────────────┤
│             Layer 3: React Component Tests             │
│  (JSDOM, @testing-library/react, mocked tRPC client)   │
├────────────────────────────────────────────────────────┤
│             Layer 2: API & Authorization Tests         │
│  (Node.js, appRouter.createCaller, mock TrpcContext)   │
├────────────────────────────────────────────────────────┤
│             Layer 1: Pure Unit Tests                   │
│  (Formatters, satang math, regex, date calculations)   │
└────────────────────────────────────────────────────────┘
```

- **A mocked component is NOT a browser E2E test.**
- **An AuthGate redirect to Login is NOT a protected-page visual test.**
- **A server caller test with fake context is NOT a client-side interaction test.**
- **Only tests that launch a real browser, load real DOM assets, and execute real user journeys qualify as Layer 4 Browser E2E.**

---

## 2. Test Accounts & Pre-Seeded Role Journeys

The Staging environment will be populated with 7 distinct test accounts:

| Role ID  | Account Name   | Role Definition | Pre-Seeded Credentials / OpenID | Primary Test Journey                                                                   |
| -------- | -------------- | --------------- | ------------------------------- | -------------------------------------------------------------------------------------- |
| `USR-01` | Admin Somchai  | `SUPER_ADMIN`   | `openid-staging-admin`          | Full system setup, PromptPay settings, user role changes, signer appointments.         |
| `USR-02` | Pastor David   | `PASTOR`        | `openid-staging-pastor`         | Membership oversight, ministry roster, viewing financial reports (donor names masked). |
| `USR-03` | Treasurer Suda | `TREASURER`     | `openid-staging-treasurer`      | Full accounting ledgers, manual offerings, expenses, budgets, slip OCR approval.       |
| `USR-04` | Deacon Mana    | `DEACON`        | `openid-staging-deacon`         | Membership directory care, ministry events. Gated away from financial ledgers.         |
| `USR-05` | Counter Chai   | `COUNTER`       | `openid-staging-counter`        | Sunday cash counting session, note stepper, envelope entry, reconciliation.            |
| `USR-06` | Member Malee   | `MEMBER`        | `openid-staging-member`         | Sunday Giving Station, public give, reimbursement request (`/withdrawals/new`).        |
| `USR-07` | Signer Prasert | `Bank Signer`   | `openid-staging-signer`         | Dual-authorization on `/approvals`, reviewing withdrawal vouchers, signing.            |

---

## 3. Comprehensive 10-Point E2E Scenario Suite

### Scenario 1: Authentication & Session Bootstrapping

- **Positive Test:** Authenticate as each of the 7 roles. Verify that the session cookie (`app_session_id`) is set with `HttpOnly` and `SameSite=Lax`.
- **Negative Test:** Expired session token, malformed signature, or deleted user account. Verify immediate redirection to `/login` with friendly toast.

### Scenario 2: Direct Protected-Route Navigation

- **Test:** For every route in the 33-route inventory, attempt direct URL entry in the browser address bar.
- **Assertion:**
  - If authorized: page component renders, title updates, layout container loads.
  - If unauthorized: renders `<RoleGuard>` access-denied screen with "สิทธิ์การเข้าถึงถูกจำกัด" and return button.
  - If `MEMBER` visits non-station path: `stationOnlyRedirect` bounces to `/giving/station`.

### Scenario 3: Navigation Menu Visibility & Badges

- **Desktop Sidebar:** Inspect `AppNavigation.tsx`. Assert that only permitted menu items are rendered in the DOM.
- **Mobile Bottom Bar:** Verify sticky bottom bar displays the correct icon set for the user's role.
- **Notification & Approval Badges:** Verify count badges on `/giving/inbox` and `/approvals`.

### Scenario 4: Role-Based Core Actions

- **`SUPER_ADMIN`:** Open `/settings`, edit PromptPay phone number, click save, verify toast and database update.
- **`TREASURER`:** Open `/offerings/new`, enter donor, select fund, enter amount `1,500.00`, submit offering.
- **`COUNTER`:** Open `/counting/1`, enter denomination count (5x 1000฿ notes = 5,000฿), verify total calculation.
- **`Bank Signer`:** Open `/approvals`, inspect pending withdrawal, click "อนุมัติ (Approve)", verify signature counter increments (1/2 -> 2/2).
- **`MEMBER`:** Open `/withdrawals/new` (post DEF-P2-03 fix), submit reimbursement request for `500.00฿`, verify success modal.

### Scenario 5: Forbidden Action Enforcement

- Attempt to tamper with client DOM (e.g. enabling a hidden button or dispatching an API call directly).
- Verify server returns `403 FORBIDDEN` or `401 UNAUTHORIZED`.

### Scenario 6: Financial Privacy & Data Masking

- **Offerings Ledger (`/offerings`):**
  - As `SUPER_ADMIN` / `TREASURER`: Donor names are visible or toggleable.
  - As `PASTOR` without donor view permission: Donor names strictly render as `"ผู้ถวายนิรนาม"`.
- **Fund Balances (`/funds`):**
  - As `DEACON` or `COUNTER`: Navigation is blocked; direct API access returns `FORBIDDEN`.

### Scenario 7: Real Form Validation & Submission (12 Forms)

- Test required fields, empty submissions, negative numbers, decimal precision (`100.50`), and dirty-state prompt on all 12 forms.

### Scenario 8: Real Dialog Semantics & Interaction (10 Dialogs)

- Test trigger click, focus trap, `Escape` key close, backdrop click close, and vertical scroll containment on all 10 dialogs.

### Scenario 9: Responsive Layout Verification (7 Viewports)

- Run tests on 1440x900, 1280x800, 768x1024, 390x844, 375x812, 360x800, 320x568.
- Verify zero horizontal scrolling (`scrollWidth === innerWidth`).

### Scenario 10: Logout & Session Invalidation

- Click logout from profile dropdown.
- Assert session cookie cleared.
- Attempt browser Back button: page must not render cached authenticated data and must redirect to `/login`.

---

## 4. Implementation Sequencing for Next Phase

1. **Step 1: Staging Infrastructure Provisioning:**
   - Create separate Staging PostgreSQL database.
   - Configure Staging Vercel environment variables.
   - Create Staging LINE Developers channel.
2. **Step 2: DEF-P2-03 Correction & Unit Regression:**
   - Update `client/src/lib/routeAccess.ts` to include `"/withdrawals/new"` in `STATION_ONLY_PATHS`.
   - Run Vitest suite to verify 0 regressions.
3. **Step 3: Staging Fixture Seeding:**
   - Execute `scripts/seedStaging.ts` to populate the 7 test role accounts.
4. **Step 4: Automated Playwright E2E Test Suite Execution:**
   - Execute the 10-point test suite in real headless Chromium.
   - Archive evidence, traces, and video recordings.
