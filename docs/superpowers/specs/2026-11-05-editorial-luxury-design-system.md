# Grace Giving — Editorial Luxury Design System Proposal

- Date: 2026-11-05
- Status: Approved direction; design-system proposal and implementation plan
- Approved direction: 01 — Editorial Luxury / Warm Minimalism
- Theme scope: Light mode as the product's primary visual language
- Redesign scope: All authenticated application surfaces
- Baseline: `main` at `c179b7834173a2a6e97747c74c4a992a17d0bd71`
- Working branch: `docs/editorial-luxury-design-system`

## 1. Product design thesis

Grace Giving should feel like a premium, calm, trustworthy church-finance product: editorial in its typography and composition, precise in its financial data, warm in its surfaces, and extremely clear in its actions.

This is not a decorative reskin. Visual hierarchy must help each role answer:
1. What is the current financial position?
2. What needs my attention?
3. What action am I allowed to take?
4. Where can I verify the underlying record?

The design must not imply financial facts, approval states, or permissions that are not present in authoritative API data.

## 2. Audit findings from current main

### Existing foundation worth preserving
- React 19 + TypeScript + Vite; Tailwind CSS v4 tokens are defined in `client/src/index.css`.
- The app already has semantic CSS tokens, warm canvas/surface layers, Thai-capable typography, tabular money numerals, global focus styles, and reduced-motion handling.
- Shared shadcn/Radix primitives exist under `client/src/components/ui/`; `ComponentShowcase.tsx` is an existing component catalogue.
- `AppLayout.tsx` already provides role-filtered navigation, guarded links, mobile menu/bottom navigation, and route-aware active states.
- The dashboard is composed from dedicated components: HeroSection, TaskQueue, BalanceCard, PrimaryActions, SecondaryMenu, FinancialSummaryRow, RecentTransactions, BudgetSection and ChurchNewsSheet.
- Existing page components and their query/mutation logic should remain the source of truth.

### Inconsistencies and risks to resolve
- The current `DESIGN.md` describes a coherent warm editorial system but still names the product “Grace Ledger” and specifies signature Coral `#F95C4B` as the primary action.
- `client/src/index.css` currently uses Plus Jakarta Sans + Manrope + IBM Plex Sans Thai; the proposed system should simplify this to Manrope + IBM Plex Sans Thai unless an audit proves Plus Jakarta Sans is relied on elsewhere.
- Current CSS defines a dark token block, while the approved scope is Light Mode as the primary and only target for this redesign. Do not delete dark-mode support or ThemeProvider behavior in this proposal; that is a separate product decision.
- Existing pages contain component-level hard-coded colors and different card/action treatments. The implementation must migrate only presentation styles to semantic tokens, page by page.
- `AppLayout.tsx` uses role-authorized navigation. Any navigation reorganization must retain `getAuthorizedNavItems`, `canAccessRoute`, `GuardedLink`, and guarded navigation behavior.
- Existing `theme.contrast.test.ts` checks several token contrast pairs. Token changes must update/add tests without weakening thresholds.
- The project’s `CLAUDE.md` says `pnpm check`, `pnpm test`, and `pnpm build` are important gates; `pnpm ci` is the CI wrapper. There is no GitHub Actions workflow; Vercel performs the configured build pipeline. Preview and production share a database, so do not trigger database migrations or deployment as part of a visual-only change.

## 3. Proposed visual language

### 3.1 Palette — semantic roles

| Role | Proposed token | Value | Usage |
|---|---|---:|---|
| Warm canvas | `--color-ground` | `#F7F5F0` | Main app background |
| Soft paper | `--color-paper` | `#FBF9F5` | Secondary surface / hover |
| Elevated surface | `--color-surface` | `#FFFFFF` | Cards, sheets, menus |
| Primary ink | `--color-ink` | `#171715` | Headings, body text |
| Secondary ink | `--color-ink-2` | `#625D55` | Supporting text |
| Muted ink | `--color-ink-3` | `#746E65` | Metadata; calculated contrast 4.63:1 on proposed warm canvas `#F7F5F0` |
| Stone border | `--color-line` | `#E6E0D7` | Hairlines and outlines |
| Muted gold | `--color-accent-gold` | `#A8792D` | Small decorative accent, never sole status cue |
| Gold surface | `--color-accent-gold-soft` | `#F7F0E2` | Quiet highlight surface |
| Existing coral | `--color-brand` | `#F95C4B` | Retain as restrained brand accent, not blanket card fill |
| Income | `--color-income` | `#187A55` | Positive financial semantics |
| Danger | `--color-danger` | `#B91C1C` | Errors/destructive actions |

Important:
- These are proposal values, not yet applied tokens. Verify every text/background pair with contrast tests before implementation.
- Contrast spot-check (WCAG relative luminance calculation): `#746E65` on `#F7F5F0` ≈ 4.63:1; `#625D55` on `#F7F5F0` ≈ 5.99:1; `#171715` on `#FFFFFF` ≈ 17.95:1; `#A8792D` on `#FFFFFF` ≈ 3.86:1; `#187A55` on `#FFFFFF` ≈ 5.31:1. These calculations are design checks, not a substitute for the repository test suite.
- Gold `#A8792D` is decorative only: do not use it for normal-size text, icons that carry meaning, or controls on white. Use deep ink or a dark neutral CTA.
- The current `theme.contrast.test.ts` checks `color-ink-3` on the surface but does not check it on the warm canvas. Add that pair (and every new text/background pairing actually used) to the test before adopting the tokens.
- Do not encode income/expense/approval state by color alone; include labels/icons/text.
- Keep LINE's official green restricted to LINE-specific actions.
- Do not invent new category colors for existing business categories without a data/UX reason.

### 3.2 Typography

- Latin headings, navigation and numbers: Manrope, weights 500–800.
- Thai UI and long-form labels: IBM Plex Sans Thai, weights 400–700.
- Body default: 15px / 1.6; dense tables may use 14px with adequate line height.
- Page title: 28–32px desktop, 24–28px mobile; weight 700–800.
- Section title: 16–18px, weight 650–700.
- Body/control text: 14–16px.
- Important financial values: 28–44px responsive, tabular numerals.
- Financial metadata: target 12px minimum; never shrink essential values or statuses to fit.
- Keep `.money` tabular numeral behavior and Thai fallback fonts.
- Remove decorative script font from operational finance UI unless a specific brand moment warrants it.

### 3.3 Shape, spacing and elevation

- Base spacing: 4px scale; common gaps 8 / 12 / 16 / 24 / 32.
- Cards: 14–18px radius; avoid oversized pill-like cards.
- Inputs and buttons: 10–12px radius.
- Buttons: minimum 44px height; primary action generally 46–48px.
- Inputs: 48px preferred for high-frequency forms.
- Borders: 1px stone line; use tonal contrast before shadow.
- Shadows: near-imperceptible at rest; no glow, glassmorphism, clay bevels, or decorative gradients.
- Content max width: retain current `--content-max` unless viewport tests show a need to adjust.
- Desktop sidebar: target 240–256px; mobile navigation must preserve safe-area and content clearance.

## 4. Component standards

### Buttons
- Primary: deep ink background with white text for high-priority financial actions; verify 4.5:1 contrast.
- Secondary: white/soft-paper fill with stone border and ink text.
- Tertiary: text/ghost style for low-emphasis navigation.
- Destructive: semantic danger token, explicit action wording and confirmation where current business flow requires it.
- Keep disabled/loading states visible and non-interactive.
- Preserve native button semantics, accessible names, focus-visible outline, and existing event handlers.

### Cards and panels
- White surface on warm canvas, subtle border, no large shadow.
- Use hierarchy inside the card rather than multiple nested cards.
- KPI cards should prioritize label → value → context; no decorative charts or invented deltas.
- Dark ink balance card may remain a single signature contrast surface if contrast and content behavior are verified; avoid turning the whole app dark.

### Navigation
- Retain the existing role-aware route list and route guards.
- Desktop: clear group headings, compact but readable labels, active route indicated by background + weight + icon, not color alone.
- Mobile: preserve existing bottom tabs and menu behavior; keep touch targets at least 44px and safe-area spacing.
- Do not expose links the current role cannot access.

### Forms and financial tables
- Preserve field names, validation schemas, submission handlers, query/mutation calls, loading/error/empty states, and unsaved-change guards.
- Form labels and error text remain visible and associated with fields.
- Tables retain captions, header scopes, keyboard-accessible detail links, responsive card fallback where already implemented, and explicit unknown status labels.
- Amount alignment uses `.money`; never change rounding/formatting as part of visual work.

### Status and feedback
- Keep existing canonical status values and labels.
- Status chips use text plus optional icon; color is supplementary.
- Never convert missing/unknown status into “approved”, “complete”, or any stronger business state.
- Toasts, confirmation dialogs and recovery wording remain consistent with existing helpers.

## 5. Information architecture and page composition

Do not rename routes or remove features. Improve visual grouping while retaining the existing navigation data and authorization.

### Shared app shell
- Brand/header area: product identity, current church context where available, notifications, profile.
- Desktop: role-filtered grouped sidebar + constrained content column.
- Mobile: existing menu and bottom navigation with clear page title and context.
- Page header: title, concise description, contextual actions.

### Dashboard
1. Page header and period/context.
2. Role-aware attention/task queue.
3. Financial overview (balance, only when authorized).
4. Primary actions (offering/expense, only when route permissions allow).
5. Monthly income/expense/net summary (only when authorized).
6. Recent transactions.
7. Budget summary when accessible.
8. Church news sheet entry point.

The order may be tuned based on actual role visibility, but never fetch restricted data or display inaccessible actions. Keep current query enablement and role gates unchanged.

### Other page families
- Finance ledger: transactions, offerings, expenses, counting, giving inbox, withdrawals.
- Planning/control: funds, budgets, approvals.
- Church operations: ministries, members, news/events, notifications.
- Analysis: reports.
- Account/system: profile, settings, church setup.
- Public/donor flows: giving station, donor give flow, privacy/login. These have distinct user journeys; apply shared tokens and primitives but do not force the authenticated dashboard shell onto them.

## 6. Implementation sequence

Implement in small reviewable batches on a feature branch. Suggested sequence:

1. **Foundation tokens and shared primitives** — CSS variables, typography, Button, Input, Card, Badge, status and shared layout. Add contrast and component tests.
2. **App shell and navigation** — AppLayout, AppNavigation, mobile tabs, page headers.
3. **Dashboard** — Home and its existing child components; presentation only.
4. **Finance pages** — Transactions, Offerings, Expenses, Counting, Giving Inbox, withdrawal screens.
5. **Planning/control pages** — Funds, Budgets, Approvals.
6. **Church operations** — Ministries, Members, Updates, Notifications.
7. **Reports and account/system** — Reports, Profile, Settings, Church Setup.
8. **Public/donor flows** — GivingStation, Give, Login, Privacy; shared visual language without changing flow behavior.
9. **Responsive/accessibility pass** — 320px, 375px, 768px, 1024px, 1440px; keyboard, focus, zoom, reduced motion, Thai wrapping.
10. **Regression and handoff** — tests, typecheck, build, diff review, screenshots, PR.

Each batch should be independently reviewable and should not combine unrelated business-logic fixes.

## 7. Non-negotiable behavior-preservation rules

- No changes to server routers, database schema, migrations, authorization policy, role definitions, financial calculations, rounding, export content, workflow states, or API contracts in a visual-only PR.
- No query/mutation behavior changes, query-key changes, query enablement changes, or altered invalidation behavior.
- No changes to route paths, route guards, `canAccessRoute`, `getAuthorizedNavItems`, `GuardedLink`, or unsaved-change protection.
- No fake/sample financial values in production UI; empty/loading/error states must use existing state.
- No changing copy in ways that imply a different approval, reconciliation, or payment state.
- If a necessary behavior change is discovered, stop and propose it separately before implementing.
- Keep each commit focused; never force-push or modify `main`.

## 8. Verification plan

Run and record:
- `pnpm check`
- `pnpm test`
- `pnpm build`
- `pnpm exec vitest run client/src/theme.contrast.test.ts` after extending it to cover the new muted-ink-on-canvas pair and all new text/background combinations used by components.
- `git diff --check`
- Existing targeted page/component tests for touched areas.
- Browser screenshots and manual review at 320, 375, 768, 1024 and 1440 CSS px.
- Role matrix smoke tests for finance, church leadership, approver, member and unauthenticated/public routes, using existing test fixtures only.
- Keyboard navigation, focus visibility, 200%/400% zoom, Thai text wrapping, reduced motion, safe-area and no horizontal overflow.

No production deployment, live DB writes, or migration runs are part of this design-system work.

## 9. Open technical decisions / risks

1. **Light-only vs retained dark mode:** user approved Light Mode. Keep existing dark-mode code untouched until product explicitly decides whether to deprecate it. This redesign targets light mode first.
2. **Primary action color:** proposed ink/white CTA is more restrained than the current coral fill. Keep coral as brand accent and validate contrast; do not silently change all existing primary actions in one pass.
3. **Font loading:** Manrope + IBM Plex Sans Thai appears sufficient; confirm no pages depend on Plus Jakarta Sans before removing it.
4. **Navigation grouping:** visual grouping can be changed, but route authorization and order of accessible links must remain correct.
5. **Component-wide selectors:** global CSS changes may affect public donor/station/print experiences. Test these separately and avoid broad selectors without evidence.
6. **Existing branches:** numerous historical UI redesign branches exist. This work starts from current `main`; do not merge or cherry-pick stale branches without reviewing their diffs and ancestry.

## 10. Acceptance criteria

- A coherent light editorial design system exists with semantic tokens and documented component rules.
- All authenticated pages use consistent typography, spacing, buttons, surfaces, navigation and page headers.
- Public/donor journeys share the visual language without being forced into authenticated information architecture.
- Existing authorization, business logic, data calculations, routes and workflows are unchanged.
- No invented data or misleading financial statuses.
- Typecheck, tests, build and contrast checks pass, or failures are explicitly documented with evidence.
- Responsive and accessibility checks are recorded.
- Work is delivered in a feature branch and reviewed through a GitHub PR; nothing is merged or deployed without explicit approval.
