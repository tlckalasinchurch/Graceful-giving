# PHASE 6B.1 — COMPREHENSIVE DEFECT & ISSUE LOG

**Project:** Graceful Giving (Church Financial Accounting System)  
**Audit Phase:** Phase 6B.1 Authenticated E2E Completion  
**Date:** 2026-11-07  
**Auditor:** Senior QA Automation Engineer & Security Systems Auditor

---

## 1. Summary of Defects

| Severity                          | Count | Status     | Description                                                                                         |
| --------------------------------- | ----- | ---------- | --------------------------------------------------------------------------------------------------- |
| **P0 (Blocker)**                  | 0     | None       | No system crashes, fatal runtime exceptions, or blocking release bugs.                              |
| **P1 (Critical / Financial)**     | 0     | Resolved   | Financial aggregation and CSV export 1,000-row limits were permanently fixed in Phase 6A / 6A.1.    |
| **P2 (Moderate / Architectural)** | 3     | Documented | Staging database unavailability, synthetic mock test suite, and Station-Only withdrawal route lock. |
| **P3 (Minor / Usability)**        | 2     | Documented | Missing `aria-describedby` links and missing `<noscript>` fallback tag.                             |

---

## 2. Detailed Defect Analysis

### DEF-P2-01: Dedicated Staging Environment & Isolated Database Absent for Browser E2E

- **Severity:** P2 (Moderate / Operational Constraint)
- **Component:** Testing Infrastructure & CI/CD Pipeline
- **Observation:**  
  The project currently lacks an isolated staging environment or local containerized database instance (no local `psql`, no local Docker service, and no dedicated preview database). The production deployment at `https://graceful-giving.vercel.app` is connected to a live church database.
- **Impact:**  
  Per strict security and financial auditing guidelines, creating mock users, generating fake offerings/expenses, or simulating multi-role logins against the production database is strictly prohibited. Consequently, authenticated browser E2E journeys on the live production domain could not be executed without violating safety boundaries.
- **Root Cause:**  
  The development workflow relies on Vercel deployment and local Vitest suites with bypassed database connections when `DATABASE_URL` is unset.
- **Minimal Recommended Correction:**  
  Provision a lightweight Supabase preview branch or containerized PostgreSQL instance for automated testing, pre-seeded with fixtures for each role (`test-superadmin`, `test-pastor`, `test-treasurer`, `test-deacon`, `test-counter`, `test-member`).

---

### DEF-P2-02: Previous Accessibility Suite Used Synthetic Mock Components

- **Severity:** P2 (Moderate / Test Integrity)
- **Component:** `client/src/phase6.a11yAndInteractions.test.tsx`
- **Observation:**  
  The test file created during Phase 6 tested synthetic mock wrappers (`MockAccessibleModal`, `MockProgressBar`) rather than mounting the actual production components from `client/src/pages/` or `client/src/components/`.
- **Impact:**  
  Passing tests in this suite gave a false sense of real component verification, although the actual production components were not directly exercised by those assertions.
- **Root Cause:**  
  Attempted quick validation of ARIA concepts without wiring up full tRPC query mocks for production page components.
- **Minimal Recommended Correction:**  
  Update `phase6.a11yAndInteractions.test.tsx` to mount real components (such as `client/src/pages/Funds.tsx` or `client/src/components/finance/budget.tsx`) with a mock tRPC wrapper.

---

### DEF-P2-03: `stationOnlyRedirect` Blocks Ordinary Members from `/withdrawals/new`

- **Severity:** P2 (Moderate / Functional Discrepancy)
- **Component:** `client/src/lib/routeAccess.ts` vs `client/src/App.tsx`
- **Observation:**  
  In `client/src/App.tsx` line 390:
  ```tsx
  {
    /* Withdrawal requests — any signed-in member can ask for one;
      approval/disbursement stays gated on the Approvals page. */
  }
  <Route path="/withdrawals/new" component={NewWithdrawal} />;
  ```
  The architectural intent is for any church member to be able to submit a reimbursement or withdrawal request. However, in `client/src/lib/routeAccess.ts`:
  ```ts
  export const STATION_ONLY_PATHS = [
    "/giving/station",
    "/give",
    "/privacy",
    "/404",
  ];
  ```
  Because `/withdrawals/new` is omitted from `STATION_ONLY_PATHS`, any user holding exclusively the `MEMBER` role who attempts to open `/withdrawals/new` is immediately intercepted by `stationOnlyRedirect` and bounced back to `/giving/station`.
- **Impact:**  
  Ordinary church members cannot access the withdrawal request form from their accounts despite the route itself having no `RoleGuard`.
- **Root Cause:**  
  `STATION_ONLY_PATHS` list was not updated when `/withdrawals/new` was made accessible to members.
- **Minimal Recommended Correction:**  
  In `client/src/lib/routeAccess.ts`, add `"/withdrawals/new"` to `STATION_ONLY_PATHS`:
  ```ts
  export const STATION_ONLY_PATHS = [
    "/giving/station",
    "/give",
    "/privacy",
    "/404",
    "/withdrawals/new",
  ];
  ```

---

### DEF-P3-01: Giving Station Helper Text ARIA Association

- **Severity:** P3 (Minor / A11y Enhancement)
- **Component:** `client/src/pages/GivingStation.tsx`
- **Observation:**  
  Helper text below the multi-category split amount inputs displays category descriptions but lacks explicit `id` and `aria-describedby` links to the corresponding `<input>` element.
- **Impact:**  
  Screen reader users may not automatically hear the descriptive context when tabbing into the amount field.
- **Minimal Recommended Correction:**  
  Add `id={`hint-${cat.id}`}` to the helper text and `aria-describedby={`hint-${cat.id}`}` to the input.

---

### DEF-P3-02: Missing `<noscript>` Fallback in Production HTML

- **Severity:** P3 (Minor / Usability)
- **Component:** `client/index.html`
- **Observation:**  
  If a user opens the application with JavaScript disabled or blocked by strict enterprise browser policies, a blank white screen is displayed without explanation.
- **Impact:**  
  Poor user experience for clients with script execution disabled.
- **Minimal Recommended Correction:**  
  Add a styled `<noscript>` tag inside `<body>` advising the user to enable JavaScript to use Graceful Giving.
