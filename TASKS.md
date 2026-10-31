# GRACE Implementation Tasks

> This queue is based on the current repository implementation and verified evidence. It is not copied from an older product blueprint.

## Verified baseline

- `pnpm check`: PASS
- `pnpm run ci`: PASS
- Automated tests: 244 PASS, 36 SKIPPED
- `pnpm build`: PASS
- `git diff --check`: PASS
- Working tree at tracker creation: CLEAN
- Live database verification: NOT VERIFIED
- RLS verification: NOT VERIFIED
- Browser/E2E verification: NOT VERIFIED

## Completed / verified in repository

### TASK-001 — TypeScript and CI baseline
Status: COMPLETED
Type: TEST
Objective:
Maintain a passing type-check and automated test baseline.
Acceptance Criteria:
- TypeScript compilation passes.
- Repository CI script passes.
- Test results are recorded without overstating skipped tests.
Dependencies:
- None
Verification:
- `pnpm check`: PASS
- `pnpm run ci`: PASS
Notes:
- 244 tests passed and 36 integration/workflow tests were skipped because their live dependencies were unavailable.

### TASK-002 — Production build baseline
Status: COMPLETED
Type: VERIFY
Objective:
Confirm that the current application can produce its production bundles.
Acceptance Criteria:
- Client and server production bundles build successfully.
- No diff-check errors are introduced by the build/verification process.
Dependencies:
- TASK-001
Verification:
- `pnpm build`: PASS
- `git diff --check`: PASS
Notes:
- Vite reports several chunks above 500 kB. This is a performance follow-up, not a build failure.

### TASK-003 — Existing access-control and tenant-isolation coverage
Status: COMPLETED
Type: SECURITY
Objective:
Preserve the existing automated coverage for authentication, route access, role access, and tenant isolation.
Acceptance Criteria:
- Existing access and isolation tests pass.
- No new authorization regression is present in the current baseline.
Dependencies:
- TASK-001
Verification:
- `server/auth.logout.test.ts`: PASS
- `server/routeAccess.matrix.test.ts`: PASS
- `server/tenant.isolation.test.ts`: PASS
- `server/security.regression.test.ts`: PASS
Notes:
- Live database/RLS enforcement remains NOT VERIFIED.

### TASK-004 — Existing finance, counting, budgets, ministries, updates, and integration logic
Status: COMPLETED
Type: VERIFY
Objective:
Record that the currently implemented feature areas have automated repository coverage without recreating them from an old checklist.
Acceptance Criteria:
- Existing relevant unit/access tests pass.
- No duplicate implementation is created solely because an old blueprint lists the feature as incomplete.
Dependencies:
- TASK-001
Verification:
- Counting, budgets, ministries, updates, LINE inbox/OCR, schema initialization, and reporting tests passed where enabled.
Notes:
- Integration tests that require live services are recorded as SKIPPED by the test runner.

## Active queue

### TASK-012 — Dark theme accessibility audit
Status: COMPLETED
Type: VERIFY
Objective:
Fix contrast defects that PR #73 (dark bento theme) introduced, and guard them.
Acceptance Criteria:
- Text on the orange brand colour is black (7.3:1). White gave 2.87:1.
- Form control borders reach 3:1 against the card surface.
- Text on the LINE green button is black (white gave 2.3:1).
- Old indigo shadows and the stale palette comment are removed.
- A test fails when a token drops below its contrast target.
Verification:
- `pnpm run ci`: PASS — 658 passed, 56 skipped
- `inspect.mjs --app` on the production build for `/login` and `/give`: contrast FAIL cleared.
Notes:
- `/login` still reports a gradient button. It is the bento brand signature and was kept on purpose.
- Pages behind sign-in are NOT VERIFIED in a browser: the inspector cannot sign in.


### TASK-009 — Frontend finance flow and accessibility hardening
Status: COMPLETED
Type: VERIFY
Objective:
Improve the existing finance UI flow without changing backend business rules.
Acceptance Criteria:
- Dashboard clearly communicates overview, actions, and tracking.
- Financial ledger records are keyboard-operable and semantically labelled.
- Missing statuses are not presented as approved.
- Expense form errors are visible beside fields and focusable on submit.
Dependencies:
- Existing frontend components and route guards
Verification:
- `pnpm check`: PASS
- `pnpm test`: PASS — 244 passed, 36 skipped
- `pnpm build`: PASS
- `git diff --check`: PASS
Notes:
- Research and adaptation details are recorded in `FRONTEND_UX_RESEARCH.md`.
- Live database, RLS, and browser/E2E verification remain NOT VERIFIED.

### TASK-010 — Global frontend visual language
Status: COMPLETED
Type: REFACTOR
Objective:
Replace the inconsistent card-heavy visual treatment with a restrained, coherent financial workspace style across the frontend.
Acceptance Criteria:
- Shared palette, geometry, typography, elevation, and focus treatment are coherent across routes.
- Desktop and mobile navigation use the same task-oriented grouping.
- Existing route guards, product behavior, and backend contracts remain unchanged.
- All pages compile, tests pass, and production build succeeds.
Dependencies:
- TASK-009
Verification:
- `pnpm check`: PASS
- `pnpm test`: PASS — 244 passed, 36 skipped
- `pnpm build`: PASS
- `git diff --check`: PASS
Notes:
- Global palette was shifted to a quiet ledger palette: ink, slate, teal, and cool neutral surfaces.
- Browser screenshot review at every route remains NOT VERIFIED in this session.

### TASK-011 — Burnt orange and vanilla visual direction
Status: COMPLETED
Type: REFINEMENT
Objective:
Align the global frontend tone with the supplied reference: dark chrome, burnt orange accents, and vanilla surfaces.
Acceptance Criteria:
- Teal/cool-grey UI accents are replaced by the requested orange/vanilla direction.
- Navigation chrome uses dark ink with high-contrast active states.
- Action text remains readable on orange buttons by using a darker accessible action shade where needed.
- All routes compile and existing behavior remains unchanged.
Verification:
- `pnpm check`: PASS
- `pnpm test`: PASS — 244 passed, 36 skipped
- `pnpm build`: PASS
- `git diff --check`: PASS
Notes:
- This refinement is local and not deployed yet.
- Browser screenshot review remains NOT VERIFIED.

### TASK-005 — Live database and RLS verification
Status: BLOCKED
Type: PRODUCTION_READINESS
Objective:
Verify runtime database schema, migrations, authorization boundaries, and RLS policies against the deployed environment.
Acceptance Criteria:
- A target database/Supabase project is identified.
- Migrations are applied or confirmed against that target.
- RLS policies are inspected and tested with authorized and unauthorized roles.
- Database integration tests execute against the target environment.
Dependencies:
- Access to the target database/Supabase project and safe test credentials.
Verification:
- Database: NOT VERIFIED
- RLS: NOT VERIFIED
- Integration tests requiring a live database: SKIPPED
Notes:
- This is blocked because no live database project or credentials are available in the current session. Do not fabricate PASS status.

### TASK-006 — Production browser/E2E verification
Status: BLOCKED
Type: PRODUCTION_READINESS
Objective:
Verify critical user journeys in an authorized production or staging browser session.
Acceptance Criteria:
- Authentication and role-specific navigation work.
- Core member, offering, expense, counting, and reporting journeys are smoke-tested.
- Mobile viewport behavior is checked for critical screens.
Dependencies:
- Authorized browser session and accessible deployment environment.
Verification:
- Browser/E2E: NOT VERIFIED
Notes:
- Anonymous production smoke testing was previously blocked by deployment SSO.

### TASK-007 — Financial integration regression coverage
Status: PENDING
Type: TEST
Objective:
Execute and, where necessary, strengthen integration coverage for financial mutations, fund balances, void/reversal behavior, and audit records.
Acceptance Criteria:
- Tests run against a real database or a documented equivalent test database.
- Financial mutation atomicity and repeated-void rejection are verified at runtime.
- Audit records and tenant boundaries are verified for the critical flows.
Dependencies:
- TASK-005
Verification:
- Not started; blocked until a database test target is available.

### TASK-008 — Performance follow-up for oversized client chunks
Status: PENDING
Type: REFACTOR
Objective:
Reduce avoidable initial client bundle cost without changing product behavior.
Acceptance Criteria:
- Identify the largest initial chunks and their import paths.
- Apply targeted code-splitting only where it does not break routing or UX.
- Re-run build and relevant UI tests.
Dependencies:
- TASK-001, TASK-002
Verification:
- Not started
Notes:
- This is lower priority than database, RLS, and production verification.

## Queue rule

Select one task at a time. Do not reopen a completed task without concrete evidence of a test failure, security defect, production defect, business-rule contradiction, or regression.
