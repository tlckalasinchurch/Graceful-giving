# Grace Giving UI/UX Audit

## Audit status

This audit was performed against the clean `main` branch at commit `16bb46d` before new implementation work. The repository already contains a substantial frontend UX pass and an established design system. The safest premium redesign path is therefore an incremental refinement rather than a wholesale rewrite.

## Current-state assessment

Grace Giving is a full-stack TypeScript church finance application with a React 19/Vite client, Express/tRPC server, Drizzle/PostgreSQL persistence, Clerk-style authentication, Supabase-backed storage, and role-aware finance procedures. Client and server share router types, so UI changes must remain isolated from financial contracts.

The current frontend has a credible foundation: a responsive application shell, role-filtered navigation, mobile bottom navigation, reusable Radix-based UI components, dark/light theme support, Thai typography, responsive transaction cards, inline form validation, and a dashboard composed from reusable sections. Existing documentation shows prior work on keyboard access and financial workflow clarity.

The visual direction currently uses warm stone light surfaces, dark ink navigation, emerald actions, flat tonal elevation, and Plus Jakarta Sans/Manrope with IBM Plex Sans Thai. This differs from the attached proposed burnt-orange/charcoal palette, but it is documented, tokenized, accessibility-tested, and already used across the application. Replacing it globally would create unnecessary risk. The premium pass should improve hierarchy, spacing, surface contrast, and dashboard composition while preserving the established token architecture.

## Screen and workflow inventory

The repository contains routes for home/dashboard, transactions, offerings, expenses, funds, budgets, approvals, counting, giving station/inbox, reports, members, ministries, withdrawals, notifications, updates, profile, settings, church setup, login, privacy, and transaction/member detail views. Navigation is filtered through `getAuthorizedNavItems`, route access helpers, and server-side authorization procedures.

The dashboard currently loads summary, fund accounts, offerings, expenses, inbox stats, withdrawals, counting sessions, pending users, and budgets conditionally by role. Its sections include a hero, task queue, balance card, financial summary, primary actions, secondary menu, budget section, fund breakdown, and recent transactions. This provides good data coverage, but the page can be made more premium by giving the page a stronger opening hierarchy and a clearer distinction between overview, action, and attention.

## Findings and opportunities

| Area | Finding | Risk | Recommendation |
|---|---|---:|---|
| Application shell | Navigation is role-aware and responsive, but some active states still use component-level hard-coded color utilities. | Medium | Replace new additions with semantic tokens and preserve existing route filtering. |
| Dashboard hierarchy | Useful financial content is present, but the first viewport can feel like a collection of modules rather than a single executive overview. | Medium | Make the primary balance and period context the anchor, then group attention and actions below it. |
| Action clarity | Primary offering action is available in the shell and dashboard. | Low | Keep one dominant action per context and avoid adding duplicate high-emphasis buttons. |
| Data integrity | Existing dashboard values come from tRPC queries and role-gated procedures. | High | Do not introduce client-side calculations beyond existing supported derivations. |
| Mobile | Existing bottom navigation and mobile cards are strong foundations. | Medium | Verify narrow widths, spacing, safe-area clearance, and long Thai labels after visual changes. |
| Typography | Thai font stack is already explicit and uses tabular numerals for money. | Low | Preserve the stack and improve type scale/line lengths rather than adding fonts. |
| Themes | Both light and dark tokens exist and have contrast tests. | Medium | Update only semantic tokens or scoped component treatments; run contrast checks after changes. |
| Tables | Responsive table/card patterns already exist. | Medium | Avoid global table rewrites; apply shared presentation changes only where verified. |
| Approval UX | Approval data and server rules exist, but authoritative audit/timeline context must not be fabricated. | High | Leave server/data work untouched in this visual phase. |
| Accessibility | Prior work added native links, captions, scopes, focus states, and inline validation. | Medium | Preserve these patterns and add no click-only interactive containers. |

## Premium redesign proposal

The first implementation milestone should refine the Dashboard as the reference surface. The page should open with a quiet context line, a strong Thai heading, and the current financial anchor. The balance surface should use a restrained premium treatment with clear posted-data context and a secondary period summary. The task queue should be visually distinct as attention work rather than another KPI card. Financial activity and funds should use consistent surfaces and a shared tonal rhythm.

The implementation should use the existing semantic token system in `client/src/index.css`, existing reusable dashboard components, and existing role gates. No new backend endpoint, schema, mock value, or financial calculation is required.

## Implementation order

1. Establish repository documentation and baseline verification.
2. Install dependencies and run the real typecheck/test/build commands.
3. Refine shared dashboard presentation and semantic tokens only where needed.
4. Implement the Dashboard reference composition.
5. Verify light/dark themes, mobile widths, keyboard focus, and role-gated content.
6. Apply only proven shared patterns to adjacent finance screens.
7. Run regression checks and document gaps.

## Explicit non-goals

This phase does not change database schema, tRPC procedures, financial calculations, money precision, authentication, authorization, RLS, tenant isolation, audit behavior, or transaction semantics. It does not invent executive metrics, approval timelines, or live audit evidence.

## Risks and blockers

The sandbox initially had no `node_modules`, so baseline typecheck could not run against the actual dependencies. The first verification step is therefore dependency installation. Live database behavior, RLS, production browser behavior, and authenticated role permutations are not verifiable without the relevant environment and credentials. These gaps must remain explicit in progress reporting.
