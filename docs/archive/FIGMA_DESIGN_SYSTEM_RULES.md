# Figma Design System Rules

Audit date: 2026-09-16. Evidence-based only — every rule cites file paths. Confidence is marked
where inference was required. This is audit + rule extraction, not a redesign; no code was changed.

> **Update 2026-09-24: palette, type and radius refresh.** The audit below describes the
> design before this change. Its hex values are now out of date; the structural findings
> (hard-coded hex in pages, tokens used mainly in `components/ui/*`) still apply.
>
> | Role                            | Before                    | Now                   | Contrast on white     |
> | ------------------------------- | ------------------------- | --------------------- | --------------------- |
> | Primary (buttons, active)       | `#E99A4A`                 | `#B9530F`             | 4.9:1 with white text |
> | Primary hover / orange text     | `#D88939`, `#BD7B42`      | `#A34A0C`             | 5.9:1                 |
> | Orange tint (active nav, chips) | `#FBE9CD`                 | `#FDEBD8`             | —                     |
> | Page background                 | `#FFF9EE`                 | `#FAF8F5`             | —                     |
> | Panel / subtle surface          | `#FFF4DF`                 | `#F4F1ED`             | —                     |
> | Border                          | `#E9D9BF`                 | `#E4DED7`             | —                     |
> | Primary text                    | `#38251B`                 | `#1F1A17`             | 17:1                  |
> | Secondary text                  | `#70452E`, `#674F42`      | `#57504A`             | 7.9:1                 |
> | Tertiary text                   | `#927D6D` (3.9:1, failed) | `#736A63`             | 5.3:1                 |
> | Success                         | `#4F8B33` / `#3D7826`     | `#2F7A45` / `#1F5C33` | 5.3:1 / 7.5:1         |
> | Danger                          | `#D45945`                 | `#C8372D`             | 5.2:1                 |
>
> Other rules from the refresh: the font is IBM Plex Sans Thai (was Prompt/Noto Sans Thai);
> cards use `rounded-2xl` (16px) and controls `rounded-xl` (12px); weights are 400–700 only
> (`font-black`/`font-extrabold` removed); text colors are never faded with opacity
> (`text-[#57504A]/70` was replaced by the tertiary text color); nav icons are one color.
> Every page passes `title` and `subtitle` to `AppLayout` instead of drawing its own hero.

## 1. Source of Truth

**Critical finding, confidence: High.** This codebase contains **two parallel, largely disjoint
UI systems**, not one:

1. **`client/src/components/ui/*`** (55 files) — a complete shadcn/ui-style library on Radix +
   CVA, styled entirely through the semantic Tailwind tokens (`bg-primary`, `text-muted-foreground`,
   etc.) defined in `client/src/index.css`. Well-engineered, but **only fully exercised by
   `client/src/pages/ComponentShowcase.tsx`**, a dev-only route (`import.meta.env.DEV` gated in
   `App.tsx:137-139`, statically stripped from production builds).
2. **The hand-rolled "clay" system** — `AppLayout.tsx`, `AppNavigation.tsx`,
   `components/common/CommonUI.tsx`, and the markup inside every page in `client/src/pages/`
   (Home, Transactions, Offerings, Expenses, Reports, etc.). This uses raw HTML elements
   (`<button>`, `<input>`, `<div>`) styled with **hardcoded hex Tailwind arbitrary values**
   (`bg-[#E99A4A]`, `text-[#38251B]`, `border-[#E9D9BF]`) that happen to match the "clay" tokens
   in `index.css` but do not reference them.

**Evidence:** grepping `client/src/pages` for the seven most common clay hex literals
(`#E99A4A`, `#FFF9EE`, `#38251B`, `#70452E`, `#927D6D`, `#E9D9BF`, `#A8C978`) returns **1046
occurrences across 24 of 24 page files** (every single page). Grepping the same directory for
shadcn semantic classes (`bg-primary`, `text-primary`, `bg-secondary`, `text-muted-foreground`,
`bg-destructive`, `border-border`) returns **26 occurrences, all 26 in `ComponentShowcase.tsx`
only** — zero in any real page. Grepping for `<Button`/`from "@/components/ui/button"` and
`<Input`/`from "@/components/ui/input"` across all pages: **only `ComponentShowcase.tsx`
imports either.** Grepping for `useForm(`/`zodResolver`/`from "@/components/ui/form"` across all
pages: **zero matches anywhere**, despite `react-hook-form`, `@hookform/resolvers`, and `zod`
being installed dependencies and `components/ui/form.tsx` existing.

**Ruling for Figma → code work: the hand-rolled "clay" system is the actual source of truth for
what ships to users.** `components/ui/*` is a mostly-dormant internal library, not the production
design system, with these documented exceptions where it genuinely is reused in production
(full detail in §4/§15):

- `Dialog` (`ui/dialog.tsx`) — reused via `CommonUI.tsx`'s `ConfirmDialog` wrapper, imported by
  many pages.
- `Sheet` (`ui/sheet.tsx`) — reused via `AppNavigation.tsx`'s `AppMenu` (mobile nav drawer).
- `Sonner`/`Toaster` (`ui/sonner.tsx`) — mounted globally in `App.tsx:153`.
- `Tooltip`/`TooltipProvider` (`ui/tooltip.tsx`) — mounted globally in `App.tsx:152`.

**Correction during audit:** an initial pass flagged `ui/table.tsx` as reused in `Members.tsx`,
`Expenses.tsx`, `Reports.tsx`, `Transactions.tsx` based on a grep for `<table`/`from ".../table"`
combined — re-checked with a precise import-only grep (`from "@/components/ui/table"`) and found
**only `ComponentShowcase.tsx` imports it**. The pages listed above contain raw `<table>` HTML
elements styled by hand instead (confirmed directly in `Transactions.tsx:1-21`, which imports only
`AppLayout` + `CommonUI` pieces + `lucide-react`, no `ui/table`). `Table` is dormant, like the
rest of `components/ui/*` — corrected below.

`DashboardLayout.tsx` + `DashboardLayoutSkeleton.tsx` are **dead code** — confidence: High.
Evidence: not imported by `App.tsx` or any page; its `menuItems` are literally placeholder data
(`"Page 1"`, `"Page 2"`, path `/some-path`) — starter-template boilerplate the app never adopted.
Do not treat it as representative of the app; do not extend it.

## 2. Frameworks & Libraries

Confirmed installed and their actual production usage:

| Technology                                  | Version                             | Production Usage                                                                              | Evidence                                   |
| ------------------------------------------- | ----------------------------------- | --------------------------------------------------------------------------------------------- | ------------------------------------------ |
| React                                       | 19.2.1                              | Full — function components/hooks only                                                         | `package.json`                             |
| TypeScript                                  | 5.9.3                               | Full, strict, `tsc --noEmit` only check                                                       | `package.json`, `CLAUDE.md`                |
| Vite                                        | 7.1.7                               | Build tool + dev server (NOT Next.js)                                                         | `vite.config.ts`                           |
| Tailwind CSS                                | 4.1.14 (`@tailwindcss/vite` plugin) | Utility-first, ~100% of styling                                                               | `index.css`, no `tailwind.config.*` exists |
| Radix UI                                    | ~25 `@radix-ui/react-*` packages    | Used inside `components/ui/*` only                                                            | `package.json`                             |
| shadcn/ui pattern                           | n/a (source-owned, not a dep)       | Present, but production-inert — see §1                                                        | `components/ui/*`                          |
| class-variance-authority                    | 0.7.1                               | Used inside `components/ui/*` variants only                                                   | `button.tsx`, `badge.tsx`                  |
| clsx / tailwind-merge                       | 2.1.1 / 3.3.1                       | `cn()` helper, used everywhere incl. clay pages                                               | `client/src/lib/utils.ts`                  |
| Framer Motion                               | 12.23.22                            | Installed; not confirmed in any audited page (Confidence: Medium, spot-check only)            | `package.json`                             |
| lucide-react                                | 0.453.0                             | Sole icon library, used everywhere                                                            | see §6                                     |
| recharts                                    | 2.15.2                              | Installed; **`Reports.tsx` does NOT use it** — hand-built bar chart with raw `<div>`s instead | `Reports.tsx:152+`                         |
| react-hook-form / @hookform/resolvers / zod | 7.64 / 5.2.2 / 4.1.12               | Installed; **zero usage in any page** — all forms are manual `useState`                       | grep, `NewExpense.tsx`                     |
| @tanstack/react-query + tRPC                | 5.90.2 / 11.6.0                     | Full — all server state                                                                       | `client/src/lib/trpc.ts`                   |
| wouter                                      | 3.3.5 (patched)                     | Router, flat `<Switch>`                                                                       | `App.tsx`                                  |
| date-fns / react-day-picker                 | 4.1.0 / 9.11.1                      | Installed; usage not confirmed in audited pages                                               | `package.json`                             |
| next-themes                                 | 0.4.6                               | Installed but **unused** — app has its own hand-rolled `ThemeContext.tsx` instead             | grep shows no import                       |

**Correction to prior session context:** this is a **Vite SPA**, not Next.js. No `app/`/`pages/`
router, no `next.config.*`. Do not apply App Router/RSC conventions.

## 3. Design Tokens

### 3.1 Colors

**Defined tokens** (`client/src/index.css:7-73`) — Confidence: High, real live values:

| Token                                          | Value       | Usage (verified)                                                                                                                                                        |
| ---------------------------------------------- | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--primary` / `--color-clay-orange`            | `#e99a4a`   | Same color, two names. Semantic form used only in `components/ui/*`; literal `#E99A4A` used ~everywhere in pages (buttons, active states, accents)                      |
| `--background` / `--color-clay-bg`             | `#fff9ee`   | Page background — pages hardcode `bg-[#FFF9EE]` (e.g. `AppLayout.tsx:44`) rather than `bg-background`                                                                   |
| `--foreground` / `--color-clay-dark`           | `#38251b`   | Primary text color                                                                                                                                                      |
| `--card`                                       | `#ffffff`   | shadcn card bg; pages hardcode `bg-white` directly (equivalent, untracked as a token)                                                                                   |
| `--secondary` / `--color-clay-cream`           | `#fff4df`   | Sidebar bg (`AppLayout.tsx:47`: `bg-[#FFF4DF]/85`), secondary surfaces                                                                                                  |
| `--muted`                                      | `#f8f2e6`   | Rarely referenced literally in pages (Confidence: Medium — pages more often use `--color-clay-cream`/`#FFF4DF` for muted-adjacent surfaces, a near-duplicate — see §16) |
| `--muted-foreground` / `--color-clay-muted`    | `#927d6d`   | Secondary/caption text — heavily used, e.g. `CommonUI.tsx:73`                                                                                                           |
| `--accent` / `--color-clay-lightsage`          | `#dcecc5`   | Success-tinted backgrounds (`StatusBadge` "approved" bg is `#EAF5E4`, a **different, undeclared near-duplicate** — see §16)                                             |
| `--accent-foreground`                          | `#3b6b22`   | Not found hardcoded verbatim in pages audited (Confidence: Medium)                                                                                                      |
| `--destructive` / `--color-clay-peach`         | `#f7b6a6`   | Used as a decorative accent color (chart bar, selection color) as much as an actual error color — semantic drift, see §16                                               |
| `--border` / `--input` / `--color-clay-border` | `#e9d9bf`   | The single most-used literal across every page (`border-[#E9D9BF]`)                                                                                                     |
| `--ring`                                       | `#e99a4a`   | Used in shadcn focus rings; pages hand-roll `focus-visible:ring-2 focus-visible:ring-[#E99A4A]` instead of the `ring` utility                                           |
| `--color-clay-sage`                            | `#a8c978`   | "Success"/positive accent — active nav icon color, status dot                                                                                                           |
| `--color-clay-sky`                             | `#a9d4ed`   | Decorative accent (funds icon color, `AppNavigation.tsx:52`)                                                                                                            |
| `--color-clay-brown`                           | `#70452e`   | Secondary heading/text color, nav active-state text                                                                                                                     |
| `--radius`                                     | `1rem` base | `radius-sm/md/lg/xl/2xl` derive from it; pages also use arbitrary pixel radii off this scale — see §3.4                                                                 |

**Undeclared colors found only in page code, not in `index.css` at all** (Confidence: High):

| Value                             | Where seen                                              | Apparent role                                                                                                                                        |
| --------------------------------- | ------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `#DE8640`                         | `AppLayout.tsx:77`, `CommonUI.tsx:78`, `Reports.tsx:72` | Primary button hover state (darker orange) — repeated, real, but **no token**                                                                        |
| `#EAF5E4` / `#4F8B33` / `#D2EAC7` | `CommonUI.tsx:108`                                      | `StatusBadge` "approved" bg/text/border — near-duplicate of `--accent` family, distinct values                                                       |
| `#FFEBE5` / `#D45945` / `#F7D5CD` | `CommonUI.tsx:114`                                      | `StatusBadge` "rejected" — a genuinely new red family, not in `index.css` at all                                                                     |
| `#FFF3DF` / `#C26B1E` / `#F6E1BF` | `CommonUI.tsx:120`                                      | `StatusBadge` "pending" — third undeclared color family                                                                                              |
| `#1b5e3a` / `#c7382d`             | `CommonUI.tsx:153-154`                                  | `MoneyDisplay` income (green)/expense (red) — a **fourth** undeclared color pair for the single most important semantic distinction in a finance app |
| `#FBE9CD`                         | `AppLayout.tsx:218`                                     | Mobile bottom-nav active-tab background                                                                                                              |
| `#C39BD3`, `#D45945` (icon)       | `AppNavigation.tsx:58, 88`                              | Budget/Updates nav icon colors — decorative, one-off                                                                                                 |

**Ruling:** the "clay" palette in `index.css` is necessary but not sufficient — real screens use
at least 4 additional undeclared color families (status green/red/amber, income/expense
green/red) that should be formalized as tokens before Figma variable export, or Figma will end up
with 15-20 ad hoc color styles that don't map to anything in code.

### 3.2 Typography

**Defined** (`index.css:8-10`): `--font-sans`/`--font-display` = `"Prompt", "Noto Sans Thai",
sans-serif`; `--font-script` = `"Caveat", cursive` (`.font-script`, used once for the "All for His
Glory ♥" tagline in `AppLayout.tsx:296` — a decorative flourish, not a real type-scale tier).

**No named type-scale tokens exist** (no `--text-h1`, `--text-body`, etc.) — Tailwind's default
scale/arbitrary classes are used directly and inconsistently per page. Observed sizes (Confidence:
High, directly observed, not a declared system):

| Role (inferred)           | Classes actually seen                                                                                            | Where                                                                                               |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Page H1                   | `text-xl md:text-2xl font-extrabold`                                                                             | `AppLayout.tsx:155`, `CommonUI.tsx:200`                                                             |
| Section/card H3           | `text-lg font-bold`                                                                                              | `CommonUI.tsx:324`, `Reports.tsx:133`                                                               |
| Hero/stat display         | `text-2xl md:text-3xl font-bold` (Reports) vs. `text-3xl sm:text-4xl md:text-5xl font-black` (MoneyDisplay `xl`) | `Reports.tsx:53`, `CommonUI.tsx:165` — **two different scales for "big number" text, unreconciled** |
| Body                      | `text-sm`                                                                                                        | pervasive                                                                                           |
| Caption/muted             | `text-xs`                                                                                                        | pervasive                                                                                           |
| Micro (badges/nav labels) | `text-[10px]` / `text-[11px]`                                                                                    | `AppLayout.tsx:56,68,124,225` — arbitrary pixel sizes, not on Tailwind's default scale              |

Font weights (`font-medium`/`semibold`/`bold`/`extrabold`/`black`) appear with no documented rule
mapping weight to role — e.g. page H1 is `font-extrabold` in `AppLayout.tsx:155` but `font-bold`
for an arguably equivalent role in `Reports.tsx:53`. Confidence: Medium — reads as organic drift.

### 3.3 Spacing

No custom spacing scale — pure Tailwind default (`p-4`, `gap-2`, `space-y-6`). Arbitrary values
that do appear (`pb-[calc(9rem+env(safe-area-inset-bottom))]`, `AppLayout.tsx:138`;
`pb-[max(1.25rem,env(safe-area-inset-bottom))]`, `AppLayout.tsx:210`) are justified iOS
safe-area-inset handling, not drift. Confidence: High this is intentional.

### 3.4 Radius

**Declared scale** (`index.css:11-16`): `sm`/`md`/`lg`/`xl`/`2xl` derive from `--radius: 1rem`;
`3xl` is hardcoded separately to `1.75rem` (not derived — a minor scale break).

**Actual usage is heavily arbitrary-pixel-based**, not the declared scale: grepping
`client/src/pages` for `rounded-[`, `rounded-full`, `rounded-2xl`, `rounded-3xl`, `rounded-xl`
returns **542 occurrences across 25 files**. Literal pixel values off the declared scale are
common — `rounded-[28px]`, `rounded-[24px]`, `rounded-[30px]`, `rounded-[20px]` (seen in
`CommonUI.tsx:60,62,66`) — close to but not identical to what `rounded-2xl`/`3xl` compute to,
suggesting hand-tuning per component rather than a shared scale. Confidence: High, Impact: Medium.

### 3.5 Shadows

**Declared custom utilities** (`index.css:112-135`) — the real elevation system, reused correctly
across pages (Confidence: High, this part IS a working shared system):

- `.clay-card-shadow` — standard card elevation, pervasive (`CommonUI.tsx:60,197`)
- `.clay-button-shadow` — primary button glow, used on all primary CTA buttons
- `.clay-inset-bevel` — declared but usage not confirmed in audited pages (Confidence: Low)
- `.clay-balance-glow` — explicitly reserved for "the single most important figure on the page"
  per its own code comment; used once (home balance card)

Tailwind's own `shadow-xs`/`shadow-sm`/`shadow-lg` also appear directly alongside `.clay-*`
classes (e.g. `Reports.tsx:47` uses `shadow-sm` where a sibling card uses `clay-card-shadow`) —
two elevation systems coexisting. Confidence: High.

### 3.6 Motion

- `.animate-fade-up` (`index.css:141-160`) — entrance animation, reduced-motion safe, used for
  above-the-fold Home sections only (per its own code comment).
- Global button/link transition + active-press-scale rules (`index.css:175-188`), reduced-motion
  gated.
- **No declared duration/easing tokens** — `cubic-bezier(0.16,1,0.3,1)`, `180ms`, `0.6s` are
  inlined where used, not centralized as reusable primitives. Confidence: High.
- Framer Motion is installed but not confirmed in use in any audited page — CSS does all observed
  motion work. Confidence: Medium (spot-check only).

## 4. Component System

`client/src/components/ui/*` holds 55 files. Only **11 of 55** formally declare `cva()` variant
sets (`alert.tsx`, `badge.tsx`, `button-group.tsx`, `button.tsx`, `empty.tsx`, `field.tsx`,
`input-group.tsx`, `item.tsx`, `navigation-menu.tsx`, `sidebar.tsx`, `toggle.tsx`); the rest
(`card.tsx`, `table.tsx`, `input.tsx`, `avatar.tsx`, `separator.tsx`, etc.) are simpler
`data-slot` + `cn()` wrappers with no variant prop at all — a single fixed visual treatment.
Every file uses the `data-slot="<name>"` attribute convention consistently. Confidence: High.

**Production component inventory** — which pieces are actually reused vs. only present in the
dormant library (Confidence: High for all rows, based on grep + direct reads):

| Component                                                                                                                                                                                                                                                                                                                                                                      | Path             | Status in production                                                                                                                                                  | Evidence                                                         |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| `Dialog`                                                                                                                                                                                                                                                                                                                                                                       | `ui/dialog.tsx`  | **Reused** — wrapped by `CommonUI.tsx`'s `ConfirmDialog`                                                                                                              | `CommonUI.tsx:299-356`                                           |
| `Sheet`                                                                                                                                                                                                                                                                                                                                                                        | `ui/sheet.tsx`   | **Reused** — mobile nav drawer via `AppNavigation.tsx`'s `AppMenu`                                                                                                    | `AppNavigation.tsx:104-163`                                      |
| `Table`                                                                                                                                                                                                                                                                                                                                                                        | `ui/table.tsx`   | **Reused directly** in 4 pages                                                                                                                                        | `Members.tsx`, `Expenses.tsx`, `Reports.tsx`, `Transactions.tsx` |
| `Sonner`/`Toaster`                                                                                                                                                                                                                                                                                                                                                             | `ui/sonner.tsx`  | **Reused** — global toast provider                                                                                                                                    | `App.tsx:153`                                                    |
| `Tooltip`                                                                                                                                                                                                                                                                                                                                                                      | `ui/tooltip.tsx` | **Reused** — global provider only; individual `<Tooltip>` usage in pages not confirmed                                                                                | `App.tsx:152`                                                    |
| `Table`                                                                                                                                                                                                                                                                                                                                                                        | `ui/table.tsx`   | **Dormant** — corrected finding; pages with data tables (`Transactions.tsx`, `Expenses.tsx`, `Members.tsx`, `Reports.tsx`) use raw hand-styled `<table>` HTML instead | precise import grep, `Transactions.tsx:1-21`                     |
| `Button`                                                                                                                                                                                                                                                                                                                                                                       | `ui/button.tsx`  | **Dormant** — imported only by `ComponentShowcase.tsx`                                                                                                                | grep                                                             |
| `Input`                                                                                                                                                                                                                                                                                                                                                                        | `ui/input.tsx`   | **Dormant** — imported only by `ComponentShowcase.tsx`; pages use raw `<input>`                                                                                       | grep                                                             |
| `Form`                                                                                                                                                                                                                                                                                                                                                                         | `ui/form.tsx`    | **Dormant** — zero imports anywhere in `pages/`                                                                                                                       | grep                                                             |
| `Card`                                                                                                                                                                                                                                                                                                                                                                         | `ui/card.tsx`    | **Dormant** — pages build card-like surfaces from raw `<div className="bg-white rounded-[...] border ...">` instead                                                   | grep, `CommonUI.tsx:60,197`                                      |
| `Badge`                                                                                                                                                                                                                                                                                                                                                                        | `ui/badge.tsx`   | **Dormant** — pages use `CommonUI.tsx`'s custom `StatusBadge` instead (different markup, different colors)                                                            | `CommonUI.tsx:97-139`                                            |
| `Avatar`                                                                                                                                                                                                                                                                                                                                                                       | `ui/avatar.tsx`  | **Dormant** in pages — used internally by the dead `DashboardLayout.tsx`; pages hand-roll avatar circles (`AppLayout.tsx:117`)                                        | grep                                                             |
| `Sidebar`                                                                                                                                                                                                                                                                                                                                                                      | `ui/sidebar.tsx` | **Dormant** — only consumed by the dead `DashboardLayout.tsx`; the real desktop nav in `AppLayout.tsx` is a hand-rolled `<aside>`                                     | `AppLayout.tsx:47-135`                                           |
| `Chart`                                                                                                                                                                                                                                                                                                                                                                        | `ui/chart.tsx`   | **Dormant** — `Reports.tsx` hand-builds its bar chart with raw `<div>`s instead of `recharts`/this wrapper                                                            | `Reports.tsx:152+`                                               |
| Everything else (accordion, alert-dialog, breadcrumb, calendar, carousel, checkbox, collapsible, command, context-menu, drawer, dropdown-menu, empty, field, hover-card, input-otp, item, kbd, label, menubar, pagination, popover, progress, radio-group, resizable, scroll-area, select, separator, skeleton, slider, spinner, switch, tabs, textarea, toggle, toggle-group) | `ui/*`           | **Unconfirmed/likely dormant** in pages — not spot-checked individually; treat as not proven reused unless verified before relying on them for a Figma mapping        | audit scope limit                                                |

**Domain-layer components** (the actual production building blocks — Confidence: High):

| Component                               | Path                                     | Role                                                                             |
| --------------------------------------- | ---------------------------------------- | -------------------------------------------------------------------------------- |
| `AppLayout`                             | `components/layout/AppLayout.tsx`        | Page shell: desktop sidebar, mobile bottom nav, header, safe-area padding        |
| `AppNavigation` (`navItems`, `AppMenu`) | `components/layout/AppNavigation.tsx`    | Nav item registry + mobile full-menu `Sheet`                                     |
| `LoadingSkeleton`                       | `components/common/CommonUI.tsx:15-37`   | Pulse-animated placeholder rows                                                  |
| `EmptyState`                            | `components/common/CommonUI.tsx:41-85`   | Illustration + title/description/CTA empty state                                 |
| `StatusBadge`                           | `components/common/CommonUI.tsx:97-139`  | Pill badge, 3 status families (approved/rejected/pending), own undeclared colors |
| `MoneyDisplay`                          | `components/common/CommonUI.tsx:143-185` | Thai-baht-formatted currency text, income/expense/neutral coloring, 4 sizes      |
| `PageHeader`                            | `components/common/CommonUI.tsx:189-216` | Card-style page title + optional action slot                                     |
| `FilterBar`                             | `components/common/CommonUI.tsx:220-295` | Search input + filter chip row                                                   |
| `ConfirmDialog`                         | `components/common/CommonUI.tsx:299-356` | Confirm/cancel modal, wraps `ui/dialog.tsx`                                      |
| `Illustration`                          | `components/Illustration.tsx`            | Wrapper around the `public/illustrations/*.jpg` assets                           |

**Bespoke interaction components** (extend the domain layer for marketing/landing effects, not
shadcn defaults): `arrow-fill-button.tsx` (+ co-located `.css`), `interactive-hover-button.tsx`,
`flip-text.tsx` (ported from ObsidianUI, MIT — attribution comment at `index.css:205-208`). Used
in `Home.tsx` and `ComponentShowcase.tsx`.

## 5. Component Variant Audit

### Button

Two unreconciled implementations:

- `ui/button.tsx` (dormant): `default`/`destructive`/`outline`/`secondary`/`ghost`/`link` variants
  × `default`/`sm`/`lg`/`icon`/`icon-sm`/`icon-lg` sizes, full disabled/focus-visible states — a
  complete, well-built variant system nobody in production calls.
- Production reality: every page hand-writes a `<button>` per call site with its own hardcoded
  hex classes (e.g. `AppLayout.tsx:75-82` primary CTA vs. `CommonUI.tsx:332-339` dialog cancel
  button vs. `Reports.tsx:65-73` toolbar button) — **no shared button component exists for
  production code**, so "variants" are really N independent one-off implementations that happen
  to look similar. States observed ad hoc per instance: hover (`hover:bg-[#DE8640]`), active
  (`active:scale-95`, only on the mobile FAB), focus-visible ring, disabled (only in
  `ConfirmDialog`, via plain `disabled` attribute + no visual disabled style declared —
  **potential a11y/visual gap**, Confidence: Medium).

### Input

- `ui/input.tsx` (dormant): single fixed style, full state coverage (focus/disabled/invalid via
  `aria-invalid`).
- Production reality: `CommonUI.tsx`'s `FilterBar` hand-rolls a `<input type="search">` with its
  own focus/placeholder styling (`CommonUI.tsx:245-252`); other forms (`NewExpense.tsx`) use plain
  `<input>`/`<select>` per field with per-field hardcoded classes, not observed to share a common
  input treatment. No confirmed "with icon"/"with helper text" pattern beyond the search input's
  inline icon. Error-state styling not found in `NewExpense.tsx` (validation is toast-based, not
  inline field errors — Confidence: Medium, only one form page audited).

### Card

- `ui/card.tsx` (dormant): single flat style (`bg-card`, `rounded-xl`, `border`, `shadow-sm`).
- Production reality: card-like surfaces are built ad hoc, e.g. `bg-white rounded-[28px] border
border-[#E9D9BF] clay-card-shadow` (`CommonUI.tsx:60`, `CommonUI.tsx:197`) vs. `bg-[#FFF4DF]
border border-[#E9D9BF] rounded-3xl ... shadow-sm` (`Reports.tsx:47`, uses Tailwind's `shadow-sm`
  instead of `clay-card-shadow`). At least two radius values (`rounded-[28px]` vs. `rounded-3xl` =
  1.75rem = 28px — these are numerically identical but expressed two different ways, Confidence:
  High) and two shadow systems in the same "card" role.

**Ruling:** variant systems exist and are well-designed in `components/ui/*`, but describe a
library the product doesn't actually run on. Any Figma component/variant mapping must be built
from the _production_ patterns (informal, per-instance) — see §16 for the full inconsistency
list, and treat `ui/button.tsx`/`ui/input.tsx`/`ui/card.tsx` variants as a **future consolidation
target**, not a current source of truth.

## 6. Icon System

- **Library:** `lucide-react` 0.453.0, exclusively — no heroicons, radix-icons, custom SVG set,
  or emoji-as-icon usage found. Confidence: High.
- **Import pattern:** named PascalCase imports matching Lucide's own export names 1:1, no local
  wrapper/rename layer, e.g. `import { Wallet, TrendingUp, TrendingDown } from "lucide-react"`
  (`Home.tsx`).
- **Size inconsistency (Confidence: High, directly measured):** grepping `client/src/pages` for
  icon-sizing class patterns found significant split usage: `w-4 h-4`/`w-5 h-5` (Tailwind
  two-class width+height) appears heavily in the clay/domain pages (173 occurrences across 25
  files for the `w-4 h-4`/`w-5 h-5`/`h-4 w-4` family), while `size-4`/`size-5` (Tailwind's
  single-utility shorthand, and what `ui/button.tsx`'s auto-sizing rule expects:
  `[&_svg:not([class*='size-'])]:size-4`) is comparatively rare outside `components/ui/*`
  internals. **These two conventions do not compose safely** — an icon sized with `w-5 h-5` inside
  a `ui/button.tsx` `Button` would double-apply sizing intent unpredictably (the button's
  auto-size rule only skips icons whose class contains the literal string `size-`).
- **Stroke width:** default Lucide stroke (2) is used mostly as-is, but the mobile bottom nav and
  FAB explicitly override it (`stroke-[2.2]`, `stroke-[2.5]`, `stroke-[2.8]` — `AppLayout.tsx:80,
224,252`) for visual weight at small sizes — an intentional, repeated pattern for
  navigation/CTA icons specifically, not applied elsewhere. Confidence: High.
- **Color convention:** icons mostly inherit `currentColor` via `text-*` classes on a parent, but
  `AppNavigation.tsx`'s `navItems` registry assigns each nav item its **own individual accent
  color** (`iconColor: "text-[#E99A4A]"`, `"text-[#A8C978]"`, `"text-[#F7B6A6]"`, etc. —
  `AppNavigation.tsx:29-95`) — a deliberate multi-color nav icon system, not monochrome. This is a
  real, systemic pattern (12 nav items, each with a fixed assigned color) worth preserving as a
  named token set if formalized for Figma.
- **Accessibility:** decorative icons are inconsistently marked — some correctly get
  `aria-hidden="true"` (`AppLayout.tsx:148`, `AppNavigation.tsx:115,152`), others (e.g. icons
  inside unlabeled nav buttons) do not; see §9 for the full accessibility gap list.

**Icon Rules (derived from actual usage):**

- Preferred/only library: `lucide-react`. Do not introduce a second icon family.
- Standard interactive-icon size in the clay/domain layer: `w-5 h-5` (nav, header actions);
  `w-4 h-4` for smaller inline/secondary icons. `size-*` shorthand is reserved for
  `components/ui/*` internals — don't mix the two conventions on the same icon.
- Decorative icons (chevrons, ambient icons next to already-labeled text) should carry
  `aria-hidden="true"`; icons that are the _only_ content of an interactive element (icon-only
  buttons) require the element to carry `aria-label` — this pattern is already followed correctly
  in `AppLayout.tsx`'s notification bell and offering FAB, and should be the standard going
  forward.
- Nav icons may carry a per-item semantic color (see `AppNavigation.tsx` registry) — this is
  intentional, not an error, and should be preserved 1:1 if translated to Figma.

## 7. Asset Audit

| Asset                                                                                                                                    | Location                                      | Type                      | Usage                                                                                                                        |
| ---------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- | ------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `hero_jesus_shepherd.jpg`, `income_hand_heart.jpg`, `expense_hand_coin.jpg`, `balance_wallet.jpg`, `bible_cross.jpg`, `offering_box.jpg` | `client/public/illustrations/`                | JPG, static               | Served root-relative (`/illustrations/*.jpg`); `offering_box.jpg` is `EmptyState`'s default illustration (`CommonUI.tsx:52`) |
| `debug-collector.js`, `version.json`                                                                                                     | `client/public/__manus__/`                    | Dev tooling, non-visual   | Injected only in dev builds (`vite.config.ts:81-98`) — not a design asset                                                    |
| `@assets` alias target                                                                                                                   | `attached_assets/` (via `vite.config.ts:161`) | Build-time-imported media | **Directory does not currently exist in the repo** — created on demand, not populated yet                                    |

- **Logo:** no logo image file exists — the "GraceLedger" wordmark is rendered as styled text
  (two `<span>`s, one per color) plus a Lucide `Sprout` icon in a colored circle
  (`AppLayout.tsx:53-67`), not an SVG/PNG asset. Confidence: High.
- **Image component:** `components/Illustration.tsx` wraps `<img>` for the illustration JPGs
  (explicit `width`/`height` props observed passed at call sites, e.g. `CommonUI.tsx:67-69`) —
  the one place `width`/`height` discipline is followed.
- **Object-fit convention:** `object-cover` used for illustration thumbnails (`CommonUI.tsx:66`).
- **No responsive image pipeline:** no `srcset`, no `next/image`-equivalent, no automatic
  resizing/format conversion. Single JPG per illustration, one resolution.
- **No CDN configuration** — single Express/Vite deployable serves everything (per `CLAUDE.md`).
- **SVG:** no standalone `.svg` asset files found in `client/public` or referenced via `@assets`;
  all iconography is Lucide's inline SVG components, not files.

## 8. Layout System

- **Max content width:** `1440px` outer shell (`AppLayout.tsx:45`, `max-w-[1440px] mx-auto`);
  main content column caps at `max-w-[560px] md:max-w-4xl xl:max-w-5xl` (`AppLayout.tsx:138`) —
  a deliberately narrow, readable column on mobile widening at `md`/`xl`, not a full-bleed grid.
- **Sidebar width:** fixed `w-72` (18rem/288px), desktop-only (`hidden lg:flex`,
  `AppLayout.tsx:47`) — appears only at `lg:` (1024px) and above; there is no intermediate
  tablet-specific sidebar treatment (tablet gets the mobile bottom-nav layout, not a
  collapsed/icon sidebar). Confidence: High.
- **Header:** not a fixed pixel height — flex row with `gap-4 mb-6 pb-4 border-b`
  (`AppLayout.tsx:140`), height derived from content, differs slightly between mobile (menu +
  bell row above title) and desktop (title + actions in one row).
- **Mobile bottom navigation:** fixed, `z-40`, `bg-[#FFF4DF]/95 backdrop-blur-md`, 5 items (home,
  transactions, center FAB, reports, settings — a curated subset of the full 12-item
  `navItems` registry, not all of it), safe-area-aware bottom padding
  (`pb-[max(1.25rem,env(safe-area-inset-bottom))]`). `lg:hidden` — disappears entirely at
  desktop width in favor of the sidebar. `AppLayout.tsx:208-300`.
- **Content padding:** `px-4 py-4 md:px-8 md:py-6` on the main column (`AppLayout.tsx:138`) —
  standard two-tier mobile/desktop padding, consistently applied at the layout level (pages don't
  need to re-declare outer padding).
- **Grid columns:** no CSS Grid-based page layout found in audited files — layouts are Flexbox
  (`flex flex-col`/`flex-row` + `gap-*`), including what look like "card grids" (likely
  `flex flex-wrap` or narrow `grid-cols-2`-style patterns per page, not confirmed as a single
  shared grid system — Confidence: Medium, not exhaustively checked across all 24 pages).
- **Breakpoints:** standard Tailwind v4 defaults only (`sm`/`md`/`lg`/`xl`) — no custom breakpoint
  tokens declared anywhere in `index.css`. `md:`/`lg:` are the two most-used breakpoint prefixes
  (245 combined occurrences across all pages); the practical "desktop" threshold for
  sidebar-vs-bottom-nav is specifically `lg:` (1024px), not `md:`.

## 9. Responsive Design Audit

Based on `AppLayout.tsx` (the shared shell every page renders inside) plus spot-checks of
`Home.tsx`, `Reports.tsx`, `CommonUI.tsx`:

### Desktop (≥ `lg`, 1024px)

- Fixed `w-72` left sidebar with full nav + branding + quick-action button + user card
  (`AppLayout.tsx:47-135`), `hidden` below `lg`.
- No mobile bottom nav (`lg:hidden` on that element).
- Header is a single row: title/subtitle on the left, action slot + notification bell on the
  right (`AppLayout.tsx:140-200`).
- Content column widens progressively: `max-w-4xl` at `md`, `max-w-5xl` at `xl`.

### Tablet (between `sm`/`md` and `lg`)

- **No distinct tablet treatment exists.** The layout has exactly two states — `lg:` and
  everything below it — so a tablet viewport (e.g. 768-1023px) gets the _mobile_ layout (bottom
  nav + hamburger `Sheet` menu), not an intermediate collapsed sidebar. Confidence: High, this is
  a binary breakpoint system, not a 3-tier one. Whether this is intentional or a gap depends on
  product intent — flag before assuming it's a bug.
- `PageHeader`/`FilterBar`/cards do get `sm:`/`md:` adjustments independently per component
  (e.g. `PageHeader`: `flex-col sm:flex-row`, `CommonUI.tsx:196`), so _content_ reflows at
  standard breakpoints even though the _shell_ only has two states.

### Mobile (< `lg`)

- Hamburger (`AppMenu`, full `Sheet` with all 12 nav items) + notification bell replace the
  sidebar (`AppLayout.tsx:141-150`).
- Fixed bottom nav bar with 5 curated items + center FAB, `z-40`, safe-area-aware
  (`AppLayout.tsx:208-300`).
- Main content gets extra bottom padding to clear the fixed bottom nav:
  `pb-[calc(9rem+env(safe-area-inset-bottom))]` (`AppLayout.tsx:138`) — a real, necessary
  mobile-only spacing rule, not present on `lg:` (`lg:pb-16` instead, much smaller since no
  floating nav to clear).
- Touch targets: bottom-nav buttons enforce `min-h-[48px]` / `min-w-[56px]`
  (`AppLayout.tsx:216`), header icon buttons enforce `size-11` (44px,
  `AppLayout.tsx:145,194`) — both meet or exceed the common ~44px touch-target guideline.
  Confidence: High, this is a deliberately-sized, consistent pattern.
- Search input in `FilterBar` uses `text-base md:text-sm` (`CommonUI.tsx:251`) — the classic
  "16px on mobile to prevent iOS auto-zoom-on-focus" pattern, correctly applied.
- Table behavior on mobile: not confirmed — `Table` (`ui/table.tsx`) only wraps in
  `overflow-x-auto`, no responsive card-collapse variant observed; pages using `<Table>`
  (`Transactions.tsx`, `Expenses.tsx`, `Members.tsx`, `Reports.tsx`) were not individually
  re-audited for a mobile-specific row layout. Confidence: Low — flag for follow-up before
  assuming tables reflow gracefully on narrow screens.
- Modal/sheet behavior: `Dialog` (via `ConfirmDialog`) is capped `max-w-sm` regardless of
  viewport (`CommonUI.tsx:322`) — same treatment mobile and desktop, no separate mobile "sheet
  from bottom" pattern for confirmations (the `Sheet` component is reserved for the nav menu
  specifically, `side="left"`, not reused as a bottom-sheet action pattern elsewhere in the
  audited files).

## 10. Accessibility Audit

### Existing (verified in code)

- `aria-label` used correctly and pervasively for icon-only interactive elements: notification
  bell (`AppLayout.tsx:146,195`), offering FAB (`AppLayout.tsx:78,250`), hamburger menu
  (`AppNavigation.tsx`, via visible text so less critical there), search input
  (`CommonUI.tsx:247`), filter chip group (`role="group" aria-label="กรองรายการ"`,
  `CommonUI.tsx:258-259`).
- `aria-current="page"` applied consistently on active nav links/buttons across desktop sidebar,
  mobile bottom nav, and the full `AppMenu` sheet (`AppLayout.tsx:97,222,238,269,286`,
  `AppNavigation.tsx:140`) — a real, systemic pattern, not a one-off.
- `aria-hidden="true"` correctly applied to decorative icons paired with visible/labeled text in
  several places (`AppLayout.tsx:148`, `AppNavigation.tsx:115,152`).
- `aria-pressed` used on filter chip toggle buttons (`CommonUI.tsx:268`).
- Semantic landmark elements: `<nav aria-label="...">` used three times with distinct Thai labels
  for the three different nav surfaces (desktop sidebar nav, mobile bottom nav, full menu sheet —
  `AppLayout.tsx:86,209`, `AppNavigation.tsx:131`) — genuinely good practice, not generic
  `<div>` soup.
- Focus-visible rings declared globally (`index.css:91-98`, 3px orange outline) _and_ re-declared
  per-component with Tailwind's `focus-visible:ring-2 focus-visible:ring-[#E99A4A]` — belt and
  suspenders, consistent focus treatment site-wide.
- `role="alert"` correctly present in `ui/alert.tsx:30` (though that component is dormant in
  production, so this correctness isn't currently benefiting real users — see §4).
- Form labels: not confirmed as consistently paired with inputs — `NewExpense.tsx`'s fields were
  not individually checked for `<label htmlFor>` association in this pass. Confidence: Low, flag
  for follow-up.

### Gaps

- **Hand-rolled buttons have no declared disabled visual state** in most call sites — e.g.
  `ConfirmDialog`'s buttons set the `disabled` HTML attribute but no `disabled:opacity-50` or
  equivalent class (`CommonUI.tsx:332-350`), unlike `ui/button.tsx` which does declare
  `disabled:pointer-events-none disabled:opacity-50`. Confidence: Medium (spot-checked one
  component, pattern likely repeats given the "one-off button per call site" finding in §5).
- **Icon-color-only status communication risk:** `StatusBadge` (`CommonUI.tsx:97-139`) does pair
  color with text (a status dot _and_ a label), which is correct — but the dot itself
  (`CommonUI.tsx:132-135`) is `aria-hidden` and carries no independent text alternative beyond the
  adjacent label, which is fine since the label is present. No violation found here, noted only
  because it's the kind of pattern worth re-checking if the label ever becomes optional.
- **Table mobile behavior unconfirmed** (see §9) — could not verify horizontally-scrolling tables
  remain fully keyboard/screen-reader navigable on narrow viewports.
- **`components/ui/*` accessibility work is stranded** — Radix primitives (Dialog, Sheet, Select,
  Dropdown, etc.) carry strong built-in a11y (focus trap, ARIA roles, keyboard nav) by default,
  but since most of that library is dormant in production (§4), the app isn't benefiting from
  Radix's accessibility engineering for components it hand-rolled instead (custom buttons,
  custom card surfaces, custom badges).
- Color contrast was not computationally verified against WCAG AA in this pass (no tooling run) —
  flag as unverified, not as failing. Confidence: N/A (out of audit scope this pass).

### Recommended (future standard, not currently implemented)

- Adopt a single shared button component (real one, not just `ui/button.tsx` sitting unused) so
  disabled/hover/focus states are declared once and can't silently regress per call site.
- Run an automated contrast check (e.g. axe or Lighthouse) against the clay palette pairs
  actually used for text-on-background (e.g. `#927D6D` muted text on `#FFF9EE` background) before
  relying on them for body copy at small sizes.
- Verify/establish a documented mobile table pattern (horizontal scroll vs. card-collapse) since
  4 pages already depend on `<Table>`.

## 11. Styling Architecture

Confirmed hierarchy, in the order actually followed by the codebase (Confidence: High):

1. **Design tokens** (`index.css` — `@theme inline` + `:root` CSS custom properties) — exist and
   are correct, but are the _least_-referenced layer in production page code (see §1/§3).
2. **`components/ui/*` variant systems** (CVA) — exist, correctly consume the tokens from layer 1,
   but are largely unconsumed by pages (§4).
3. **Tailwind utility classes inline in JSX** — the dominant, actually-followed layer for both
   `components/ui/*` internals and, overwhelmingly, for production pages — except production pages
   use **hardcoded arbitrary hex values** (`bg-[#E99A4A]`) instead of token-referencing utilities
   (`bg-primary`), meaning layer 3 in practice bypasses layer 1 rather than consuming it.
4. **Component-specific CSS** — rare, one confirmed instance: `arrow-fill-button.css`, co-located
   with its `.tsx` file, for an effect (fill-on-hover) not cleanly expressible in Tailwind alone.
5. **Inline `style={}` props** — used narrowly and appropriately where Tailwind can't express a
   value: `DashboardLayoutSkeleton`/`DashboardLayout`'s dynamic `--sidebar-width` CSS variable
   (dead code, but the technique itself is sound) and `resizable.tsx`-style panel width state.
   Not found used as a general escape hatch elsewhere.

**`cn()` (`clsx` + `tailwind-merge`, `client/src/lib/utils.ts`)** is the universal class-merging
helper, used consistently in `components/ui/*`. **Production clay pages frequently do NOT use
`cn()`** — they template-literal-concatenate className strings directly (e.g.
`` `w-full flex ... ${isActive ? "..." : "..."}` `` in `AppLayout.tsx:98-102`), which works but
loses `tailwind-merge`'s conflict-resolution safety net (e.g. two conflicting `bg-*` classes would
silently produce unpredictable CSS specificity behavior instead of the last one cleanly winning).
Confidence: High this pattern exists; Medium on whether it has caused an actual bug (not tested).

## 12. Visual Language Audit

| Pattern                                                                            | Classification                                                                                     | Evidence                                                                                                                                                                |
| ---------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Warm cream/orange "clay" palette (`#FFF9EE` bg, `#E99A4A` primary, `#38251B` text) | **Systemic**                                                                                       | Declared as tokens in `index.css`, used in all 24 pages                                                                                                                 |
| Soft, large corner radii (`rounded-2xl`/`3xl`/arbitrary 24-30px)                   | **Systemic**                                                                                       | 542 occurrences across 25 files, consistent "soft/friendly" visual identity                                                                                             |
| Layered soft shadows (`.clay-card-shadow`, `.clay-button-shadow`)                  | **Systemic**, with a **Local** exception                                                           | Used pervasively, but some cards use plain Tailwind `shadow-sm` instead (`Reports.tsx:47`) — see §16                                                                    |
| Illustrated photography (hand/heart/coin/wallet/cross imagery)                     | **Repeated**                                                                                       | 6 illustration JPGs reused across empty states and likely hero sections; a real, intentional motif, not exhaustively verified on every page                             |
| Multi-color semantic nav icons (each nav item owns a fixed accent color)           | **Systemic**                                                                                       | `AppNavigation.tsx:29-95`, 12 items each with a declared `iconColor`                                                                                                    |
| Script/handwritten accent font (`Caveat`) for a single tagline                     | **Local**                                                                                          | One occurrence (`AppLayout.tsx:296`), not a recurring type-scale tier — don't generalize into "every page needs a script accent"                                        |
| Bilingual Thai/English UI text, Thai-dominant in production copy                   | **Systemic**                                                                                       | Nearly all visible strings audited (nav labels, buttons, dialogs) are Thai; English appears mainly in the "GraceLedger" wordmark and code/dev surfaces                  |
| Thai-baht-formatted, color-coded money figures (green income / red expense)        | **Systemic**                                                                                       | `MoneyDisplay` component, used for the app's core domain data                                                                                                           |
| Status pill badges (colored bg + dot + label)                                      | **Systemic**, but **Inconsistent** colors vs. declared tokens                                      | `StatusBadge` — 3 status families, all using undeclared hex not in `index.css` (§3.1)                                                                                   |
| Dark surfaces / dark mode                                                          | **Missing**                                                                                        | No `.dark` overrides exist despite scaffolding (§1, §13)                                                                                                                |
| Glassmorphism / blur                                                               | **Local**                                                                                          | Only `backdrop-blur-md` on the mobile bottom nav bg (`AppLayout.tsx:210`) — a single functional use (readability over scrolling content), not a broader glass aesthetic |
| Gradients                                                                          | **Not found** in audited files — Confidence: Medium, not exhaustively searched across all 24 pages | —                                                                                                                                                                       |

## 13. Page Pattern Audit

Derived from `App.tsx`'s route table (24 routes, grouped by comment into 12 domains: Transactions,
Offerings, Expenses, Funds, Budgets, Ministries, Members, Reports, Approvals, Notifications,
Settings, Updates — plus Core/Auth) and direct reads of `Home.tsx`, `Transactions.tsx`,
`NewExpense.tsx`. Every domain follows a **List → Detail** shape, some also add a **Create** page;
Reports/Settings/Approvals/Notifications/Updates are singletons (no detail/create sub-route).

### List pattern (e.g. `Transactions.tsx`, `Expenses.tsx`, `Offerings.tsx`, `Funds.tsx`,

`Budgets.tsx`, `Ministries.tsx`, `Members.tsx`) — Confidence: High for `Transactions.tsx`
(directly read), Medium for siblings (inferred from shared import pattern, not each individually
re-read in full)

```text
<AppLayout title=... subtitle=... action={...}>
├── FilterBar (search + filter chips)              — CommonUI.tsx
├── Main content
│   ├── LoadingSkeleton                             — while trpc query pending
│   ├── EmptyState                                  — if list is empty after load
│   └── Row list (hand-rolled <div>/<table> rows)    — StatusBadge + MoneyDisplay per row
└── Responsive: FilterBar stacks full-width on mobile; rows likely reflow narrower
    (table behavior on mobile not independently confirmed, see §9)
```

Data source: tRPC list queries (e.g. `trpc.offerings.list.useQuery`), client-side combined/derived
via `useMemo` when a page blends multiple entities (`Transactions.tsx` merges offerings +
expenses into one feed, `Transactions.tsx:36-60`).

### Detail pattern (e.g. `TransactionDetail.tsx`, `FundDetail.tsx`, `BudgetDetail.tsx`,

`MinistryDetail.tsx`, `MemberDetail.tsx`) — Confidence: Medium, inferred from route shape
(`/:id` params) and shared `AppLayout`/`CommonUI` imports; not individually read in full this pass.

```text
<AppLayout title=... action={...}>
├── Header/summary card (likely PageHeader or ad hoc equivalent)
├── Detail content (entity-specific fields, likely MoneyDisplay for amounts)
└── Secondary content (related records / history — not confirmed per page)
```

### Create/Form pattern (`NewOffering.tsx`, `NewExpense.tsx`) — Confidence: High for

`NewExpense.tsx` (directly read)

```text
<AppLayout>
├── Back navigation (ArrowLeft icon button)
├── Form fields — plain useState per field, native <input>/<select>, NOT react-hook-form
├── Submit handler — manual validation via toast.error(), then trpc mutation
└── Success state — ConfirmDialog-style modal (showSuccessModal), not a route redirect
```

Notably, `NewExpense.tsx`'s `onError` handler for the create mutation shows success anyway
("ระบบจำลอง" / "simulated system", `NewExpense.tsx:58-64`) — a demo/offline-friendly fallback
worth knowing about if Figma prototyping needs to represent real error states, since the current
code intentionally masks them here.

### Singleton pattern (`Reports.tsx`, `Settings.tsx`, `Approvals.tsx`, `Notifications.tsx`,

`Updates.tsx`) — Confidence: Medium, `Reports.tsx` partially read (header/toolbar/chart section),
others inferred.

```text
<AppLayout>
├── Hero/summary card (large, own background tint — e.g. Reports.tsx:47 bg-[#FFF4DF])
├── Toolbar (period toggle buttons, date picker, export action)
└── Content panels (hand-built chart, tables, or status lists per domain)
```

### Auth/onboarding pattern (`Login.tsx`, `Register.tsx`, `ChurchSetup.tsx`) — Confidence: Low,

not read this pass; route-gated by `SetupGate` in `App.tsx:51-81` which redirects logged-in users
without a completed church profile to `/setup` unless explicitly skipped.

## 14. Figma MCP Mapping Rules

| Code concept                                                                                                                        | Figma concept                                                                            | Status                                                                                                                                                                                                                                            |
| ----------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `index.css` `:root`/`@theme inline` CSS custom properties                                                                           | Figma Variables (color/number collections)                                               | **Recommended mapping** — not currently represented in any Figma file audited (none was available to this audit; this is a code-side readiness assessment only)                                                                                   |
| Undeclared hex literals (§3.1 table, `#DE8640`, `#EAF5E4` family, `#1b5e3a`/`#c7382d`, etc.)                                        | Figma Variables                                                                          | **RECOMMENDED — NOT CURRENTLY IMPLEMENTED** in code as tokens; must be formalized in code _before_ or _alongside_ Figma variable creation, or Figma and code will drift immediately                                                               |
| `components/ui/*` (Dialog, Sheet, Sonner, Tooltip — the 4 genuinely-reused pieces)                                                  | Figma Component + variants                                                               | **Recommended mapping**, existing mapping candidate — these are real, shared, token-driven code, safe to treat as source of truth                                                                                                                 |
| `components/ui/*` (Button, Input, Card, Table, Badge, Form — dormant)                                                               | Figma Component                                                                          | **Not currently representative of production** — mapping these would produce a Figma library that doesn't match shipped screens. Map the _clay_ patterns below instead, or explicitly mark these as "future/aspirational system" in Figma if kept |
| `CommonUI.tsx` exports (`EmptyState`, `StatusBadge`, `MoneyDisplay`, `PageHeader`, `FilterBar`, `ConfirmDialog`, `LoadingSkeleton`) | Figma Component + variants                                                               | **Existing mapping candidate — highest priority.** This is the actual reused production component set; each should become a real Figma component with variants matching the states documented in §5/§10                                           |
| Per-page hand-rolled buttons/cards (no shared component in code)                                                                    | Figma Component (net-new)                                                                | **Recommended — not currently implemented in code.** Figma can/should define a single Button and Card component even though code doesn't yet have one; this is the clearest normalization opportunity (see §17)                                   |
| Nav item registry (`AppNavigation.tsx` `navItems`, label + icon + color per item)                                                   | Figma Component instance list / Figma Variables (per-item color)                         | **Existing mapping candidate** — this is a clean, already-structured data source or navigation                                                                                                                                                    |
| `AppLayout.tsx` (sidebar + header + bottom nav shell)                                                                               | Figma Frame (page template / layout grid)                                                | **Existing mapping candidate** — one shell, reused by every page                                                                                                                                                                                  |
| Lucide icons                                                                                                                        | Figma Component / Instance, via a Lucide-for-Figma icon set (official community library) | **Existing mapping candidate** — use the same icon names 1:1 (`Sprout`, `Bell`, `Plus`, etc.) so Figma instance swaps map directly to `lucide-react` import names                                                                                 |
| Font families (`Prompt`, `Noto Sans Thai`, `Caveat`)                                                                                | Figma Text Styles                                                                        | **Recommended mapping** — must include Thai glyph coverage for `Noto Sans Thai` styles specifically, since production copy is Thai-dominant                                                                                                       |
| `.clay-card-shadow`/`.clay-button-shadow`/`.clay-balance-glow`                                                                      | Figma Effect Styles                                                                      | **Existing mapping candidate** — 3 real, reusable shadow definitions                                                                                                                                                                              |
| Radius values (`rounded-2xl`, arbitrary `rounded-[Npx]`)                                                                            | Figma corner-radius tokens                                                               | **Recommended mapping**, but first needs code-side normalization (§17) — mapping the current arbitrary-pixel sprawl 1:1 would produce 10+ near-duplicate radius tokens in Figma                                                                   |
| `.animate-fade-up` / button press-scale / transition durations                                                                      | Figma prototyping "Smart Animate" + easing curve presets                                 | **Recommended mapping** — durations/easing exist in code but aren't named tokens; name them first (§17)                                                                                                                                           |
| Dark mode (`.dark` class, `ThemeContext`, `THEMES.dark` in `chart.tsx`)                                                             | Figma mode/variable collection (Light/Dark)                                              | **Not currently implemented in code** — do not build dark-mode Figma frames as if translating an existing implementation; this is 100% new scope                                                                                                  |

## 15. Figma Variable Taxonomy

Proposed structure, built only from values verified to exist in code (§3). Items with no current
code-side value are explicitly marked `RECOMMENDED — NOT CURRENTLY IMPLEMENTED`.

```text
Primitives
├── Color
│   ├── clay/bg          #fff9ee
│   ├── clay/cream       #fff4df
│   ├── clay/sage        #a8c978
│   ├── clay/lightsage   #dcecc5
│   ├── clay/peach       #f7b6a6
│   ├── clay/orange      #e99a4a
│   ├── clay/orange-hover #de8640   (RECOMMENDED — NOT CURRENTLY A NAMED TOKEN, real hex found 3x in code)
│   ├── clay/sky         #a9d4ed
│   ├── clay/brown       #70452e
│   ├── clay/dark        #38251b
│   ├── clay/muted       #927d6d
│   ├── clay/border      #e9d9bf
│   ├── status/success-bg    #eaf5e4  (RECOMMENDED — NOT CURRENTLY A NAMED TOKEN)
│   ├── status/success-text  #4f8b33  (RECOMMENDED — NOT CURRENTLY A NAMED TOKEN)
│   ├── status/danger-bg     #ffebe5  (RECOMMENDED — NOT CURRENTLY A NAMED TOKEN)
│   ├── status/danger-text   #d45945  (RECOMMENDED — NOT CURRENTLY A NAMED TOKEN)
│   ├── status/pending-bg    #fff3df  (RECOMMENDED — NOT CURRENTLY A NAMED TOKEN)
│   ├── status/pending-text  #c26b1e  (RECOMMENDED — NOT CURRENTLY A NAMED TOKEN)
│   ├── money/income     #1b5e3a  (RECOMMENDED — NOT CURRENTLY A NAMED TOKEN)
│   └── money/expense    #c7382d  (RECOMMENDED — NOT CURRENTLY A NAMED TOKEN)
├── Spacing        — Tailwind default scale, no custom primitive tokens exist
├── Radius
│   ├── radius/sm   (--radius - 4px = 12px)
│   ├── radius/md   (--radius - 2px = 14px)
│   ├── radius/lg   (--radius = 16px)
│   ├── radius/xl   (--radius + 6px = 22px)
│   ├── radius/2xl  (--radius + 12px = 28px)
│   ├── radius/3xl  (1.75rem = 28px, independently declared, numerically equal to 2xl — flag as
│   │                 a near-duplicate to resolve, see §16)
│   └── radius/full
├── Typography
│   ├── font/sans     "Prompt", "Noto Sans Thai", sans-serif
│   ├── font/script    "Caveat", cursive (decorative, single use — do not over-generalize)
│   └── Named size/weight tiers — RECOMMENDED — NOT CURRENTLY IMPLEMENTED (see §3.2; only ad hoc
│       Tailwind classes exist today, no declared H1/H2/Body/Caption tokens)
└── Motion
    ├── duration/fast   180ms   (RECOMMENDED as a named token — currently inlined only)
    ├── duration/normal 600ms   (RECOMMENDED as a named token — currently inlined only)
    └── ease/out-expo   cubic-bezier(0.16,1,0.3,1)  (RECOMMENDED as a named token)

Semantic
├── Background   → clay/bg
├── Foreground   → clay/dark
├── Primary      → clay/orange (+ clay/orange-hover for interaction state)
├── Secondary    → clay/cream
├── Muted        → clay/muted (text), a near-duplicate of clay/cream (surface) — see §16
├── Border       → clay/border
├── Success      → status/success-bg + status/success-text (RECOMMENDED, unifies StatusBadge
│                   "approved" with the declared clay/sage-lightsage family — currently distinct)
├── Warning      → status/pending-bg + status/pending-text (RECOMMENDED — NOT CURRENTLY UNIFIED
│                   with any existing token)
└── Destructive  → status/danger-bg + status/danger-text (RECOMMENDED — currently split between
                    the declared --destructive token, the StatusBadge "rejected" hex family, and
                    MoneyDisplay's expense hex — three different reds for one semantic role, see §16)
```

## 16. Design System Inconsistency Report

| Issue                                                                                                                                                                                                                                                    | Evidence                                                                                                                                                                                | Impact                                                                                                                                                                                         | Recommended Resolution                                                                                                                                                                                                                     |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Two disjoint component systems: `components/ui/*` (token-driven, dormant) vs. hand-rolled clay pages (hex-hardcoded, production)                                                                                                                         | §1 — 1046 hex literals vs. 26 semantic-token uses (all in dev-only `ComponentShowcase.tsx`); zero pages import `Button`/`Input`/`Form`/`Table`/`Card`/`Badge`                           | **High** — every future feature built by copying an existing page inherits hardcoded hex instead of tokens, widening the gap permanently                                                       | Decide deliberately: either (a) retire/relabel `components/ui/*` as "internal primitives only" and formalize the clay pattern as the real system, or (b) migrate pages onto `components/ui/*` incrementally. Do not keep drifting silently |
| Three+ separate red/green/amber color families for one semantic role each                                                                                                                                                                                | §3.1 — `--destructive` (`#f7b6a6`), `StatusBadge` rejected (`#D45945`/`#FFEBE5`), `MoneyDisplay` expense (`#c7382d`) all mean roughly "negative/danger" but are visually different reds | **High** — a designer picking "the red" in Figma has no single correct answer                                                                                                                  | Consolidate to one `status/danger` + one `money/expense` pair (money ≠ status semantically, so 2 tokens is correct, not 1 — see taxonomy §15) and update all 3 call sites                                                                  |
| Duplicate/near-identical radius: `rounded-3xl` (1.75rem/28px, independently hardcoded) vs. `rounded-2xl` (`--radius` + 12px = also 28px) vs. arbitrary `rounded-[28px]`                                                                                  | §3.4, `index.css:16` vs. `CommonUI.tsx:60`                                                                                                                                              | **Medium** — visually invisible today (same computed value) but three different ways to express one radius makes Figma↔code sync error-prone                                                  | Pick one canonical expression (`rounded-3xl`) and replace the arbitrary-pixel and derived-2xl usages that were intended to mean "the largest radius"                                                                                       |
| Two elevation systems coexisting: `.clay-card-shadow` vs. plain Tailwind `shadow-sm`/`shadow-xs` for what reads as the same "card" role                                                                                                                  | §3.5, `CommonUI.tsx:60` vs. `Reports.tsx:47`                                                                                                                                            | **Medium**                                                                                                                                                                                     | Standardize all card-level surfaces on the `.clay-*` shadow family; reserve bare Tailwind shadow utilities for non-card chrome only                                                                                                        |
| `--muted` (`#f8f2e6`) declared but effectively unused; pages reach for `--color-clay-cream`/`#FFF4DF` for the same "muted surface" role instead                                                                                                          | §3.1                                                                                                                                                                                    | **Low-Medium**                                                                                                                                                                                 | Either retire `--muted` or intentionally redefine one of the two as the canonical muted-surface token                                                                                                                                      |
| Icon sizing split: `w-4 h-4`/`w-5 h-5` (clay pages, 173 occurrences) vs. `size-4`/`size-5` (shadcn internals)                                                                                                                                            | §6                                                                                                                                                                                      | **Medium** — the two conventions don't compose safely inside `ui/button.tsx`'s auto-size rule                                                                                                  | Standardize on one sizing convention codebase-wide; if keeping both, document which convention applies inside `components/ui/*` vs. page code                                                                                              |
| Typography scale not centralized: two different "big number" scales (`text-2xl md:text-3xl font-bold` in Reports vs. `text-3xl sm:text-4xl md:text-5xl font-black` in MoneyDisplay `xl`); H1 weight varies `font-extrabold` vs. `font-bold` across pages | §3.2                                                                                                                                                                                    | **Medium**                                                                                                                                                                                     | Name a small set of type-scale tokens (Display, H1, Body, Caption at minimum) and apply consistently                                                                                                                                       |
| `react-hook-form`/`zod`/`ui/form.tsx` fully installed and built, zero production usage; forms are manual per-field `useState` with toast-based (not inline) validation                                                                                   | §1, §2, `NewExpense.tsx`                                                                                                                                                                | **Medium** — inconsistent validation UX, duplicated boilerplate per form page, no schema reuse between client validation and the tRPC/Zod server schema that likely already exists server-side | Either adopt `react-hook-form` + `zod` for new/edited forms (reusing server-side Zod schemas where they exist) or remove the unused dependency to reduce confusion                                                                         |
| `recharts` + `ui/chart.tsx` installed and built, zero usage; `Reports.tsx` hand-builds a bar chart from raw `<div>`s with 2 hardcoded colors                                                                                                             | §2, §4, `Reports.tsx:152+`                                                                                                                                                              | **Medium** — hand-rolled charts don't get recharts' accessibility/responsiveness/tooltip features for free, and can't scale past the 2 hardcoded series colors already observed                | Migrate `Reports.tsx` onto `recharts` via `ui/chart.tsx`, defining `--chart-1`..`n` tokens (currently absent entirely)                                                                                                                     |
| `DashboardLayout.tsx` + `DashboardLayoutSkeleton.tsx` — full dead-code alternate layout with placeholder content ("Page 1"/"Page 2")                                                                                                                     | §1                                                                                                                                                                                      | **Low** (no user-facing impact, but a real maintenance/onboarding hazard — an unfamiliar contributor or AI agent could mistake it for the real shell)                                          | Delete, or clearly mark as an unused starter-template remnant if kept for reference                                                                                                                                                        |
| Dark mode scaffolded three separate places (`ThemeContext.tsx`, `@custom-variant dark` in `index.css`, `THEMES.dark` in `chart.tsx`) but functionally inert — no `.dark {}` token overrides, no UI toggle, `switchable` defaults false                   | §1, §3.6, §14                                                                                                                                                                           | **Low** (not currently a bug — dark mode simply doesn't exist yet)                                                                                                                             | Either finish the implementation (add `.dark {}` token overrides + a toggle) or remove the scaffolding to avoid implying a feature that isn't there                                                                                        |
| `cn()` (tailwind-merge) used in `components/ui/*` but bypassed by string-concatenation in clay pages                                                                                                                                                     | §11, `AppLayout.tsx:98-102`                                                                                                                                                             | **Low-Medium**                                                                                                                                                                                 | Adopt `cn()` in page-level conditional className logic for conflict-safety, especially as the codebase grows                                                                                                                               |
| Hand-rolled buttons across call sites don't share a disabled-state visual treatment                                                                                                                                                                      | §10, `CommonUI.tsx:332-350`                                                                                                                                                             | **Medium (a11y/UX)**                                                                                                                                                                           | Consolidate on one button implementation with declared disabled/hover/focus states (ties into the component-system decision above)                                                                                                         |

## 17. Design System Maturity

No overall score — evaluated per category with evidence.

| Category        | Status                                                                                                                                                                                          | Evidence                                                                                                                                                                                                 |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tokens          | **Partially established**                                                                                                                                                                       | Colors/radius/shadow/font-family tokens exist and are correctly structured in `index.css`, but are bypassed by ~all production page code in favor of hardcoded hex (§1, §3)                              |
| Typography      | **Inconsistent**                                                                                                                                                                                | No named type-scale tokens; ad hoc size/weight combinations per page with observed drift on equivalent roles (§3.2)                                                                                      |
| Color           | **Inconsistent**                                                                                                                                                                                | Declared palette exists, but at least 4 undeclared color families are load-bearing in production (status pills, money display) with no token backing (§3.1, §16)                                         |
| Components      | **Partially established, bifurcated**                                                                                                                                                           | A complete, well-built component library exists (`components/ui/*`) but is almost entirely unused; the actually-used component set (`CommonUI.tsx`, 7 exports) is smaller and informally maintained (§4) |
| Variants        | **Inconsistent**                                                                                                                                                                                | Where variant systems exist (`ui/button.tsx`) they're unused; where components are actually reused (buttons, cards in pages) there is no variant system, just N ad hoc implementations (§5)              |
| Icons           | **Partially established**                                                                                                                                                                       | Single library (`lucide-react`) consistently chosen — good — but sizing convention (`w-5 h-5` vs `size-5`) is split (§6)                                                                                 |
| Assets          | **Established** for the narrow slice audited (6 illustration JPGs, consistent `object-cover` + explicit dimensions via `Illustration.tsx`); **no** responsive/optimization pipeline exists (§7) |
| Layout          | **Established**                                                                                                                                                                                 | `AppLayout.tsx` is a single, consistently-applied shell for every page; deliberate 2-tier (mobile/desktop) breakpoint model (§8)                                                                         |
| Responsive      | **Partially established**                                                                                                                                                                       | Shell responsiveness is solid and deliberate (safe-area handling, touch targets, iOS zoom-prevention font size); table mobile behavior and true tablet-specific layout are unverified/likely absent (§9) |
| Accessibility   | **Partially established**                                                                                                                                                                       | Strong, repeated patterns for `aria-current`/`aria-label`/`aria-hidden`/focus-visible in the shared layout layer; gaps in disabled-state styling and unverified color contrast (§10)                     |
| Motion          | **Partially established**                                                                                                                                                                       | A working, reduced-motion-safe animation exists for one use case; no centralized duration/easing tokens (§3.6)                                                                                           |
| Documentation   | **Missing**                                                                                                                                                                                     | No Storybook, no component docs site; `ComponentShowcase.tsx` is the closest artifact but documents the dormant system, not the production one                                                           |
| Figma readiness | **Missing → this document is the first step**                                                                                                                                                   | No prior Figma variable/component mapping existed to audit; this document establishes the baseline (§14/§15)                                                                                             |

## 18. Rules for AI-Generated UI

```text
DO:
- Build new production UI following the hand-rolled "clay" pattern (AppLayout + CommonUI.tsx
  exports + per-page hex-matched-to-clay-palette classes) — this is what actually ships, per §1.
- Reuse CommonUI.tsx's EmptyState, StatusBadge, MoneyDisplay, PageHeader, FilterBar,
  ConfirmDialog, LoadingSkeleton before writing new equivalents.
- Match colors to the declared clay hex values (§3.1) exactly — #E99A4A, #38251B, #FFF9EE,
  #70452E, #927D6D, #E9D9BF, #A8C978, #F7B6A6, #DCECC5, #A9D4ED — and to the undeclared-but-real
  status/money hex families documented in §3.1/§15 rather than inventing new ones.
- Use lucide-react exclusively for icons; match existing sizing (w-5 h-5 nav/header, w-4 h-4
  secondary) and the per-nav-item color registry in AppNavigation.tsx where extending nav.
- Reuse the .clay-card-shadow / .clay-button-shadow / .clay-balance-glow shadow utilities for
  elevation instead of introducing new box-shadow values.
- Preserve the safe-area-aware mobile bottom-nav padding and 44px+ touch targets already
  established in AppLayout.tsx.
- Preserve the aria-current/aria-label/aria-hidden/focus-visible patterns already used
  consistently in AppLayout.tsx/AppNavigation.tsx when adding new nav or interactive elements.
- Keep bilingual readiness in mind — Thai (Noto Sans Thai) glyph coverage is required for any
  new text-bearing UI, since production copy is Thai-dominant.
- Use cn() (clsx + tailwind-merge) for any conditional className logic, even in clay-pattern page
  code, for conflict-safety — this is a genuine improvement over the current string-concatenation
  norm (§16), not a deviation from it.

DO NOT:
- Do not import Button/Input/Form/Card/Badge/Table from components/ui/* into new pages as if they
  were the established production system — they are dormant (§1/§4); using them would create a
  third, even-more-fragmented visual language unless a deliberate migration decision is made
  first.
- Do not invent new hex colors for status/success/warning/money roles — reuse the undeclared-but-
  real families already documented in §3.1/§15 (there are already 4 too many; don't add a 5th).
- Do not introduce a second icon library alongside lucide-react.
- Do not add a new arbitrary-pixel border-radius value without checking whether an existing
  rounded-2xl/3xl/full already expresses it (§3.4/§16).
- Do not assume dark mode exists or needs matching — it is scaffolded but inert (§1/§16); adding
  dark-mode-specific styling is net-new scope, not a translation task.
- Do not assume this is a Next.js project — it is a Vite SPA with wouter routing (§2). Do not
  apply App Router/RSC/Server Component conventions.
- Do not silently duplicate CommonUI.tsx-equivalent logic (another status badge, another money
  formatter) — grep for an existing implementation first.
```

## 19. Rules for Figma → Code

1. Before translating any Figma frame, check whether it matches an existing `CommonUI.tsx` export
   or `AppLayout`/`AppNavigation` pattern (§4/§13) — most "new" screens are recompositions of the
   same handful of primitives (list row, status badge, money figure, empty state, filter bar).
2. Map Figma color styles to the clay hex palette (§3.1) first; if a Figma color doesn't match any
   entry in §3.1 or §15's taxonomy, flag it for a design decision rather than inlining a new hex
   value into code.
3. Map Figma text styles to the observed role table in §3.2 (Page H1, Section H3, Body, Caption,
   Micro) — do not introduce a 6th unrelated size tier without checking whether an existing role
   already covers the intent.
4. Map Figma corner-radius values to the canonical scale in §15 (`sm`/`md`/`lg`/`xl`/`2xl`/`3xl`/
   `full`) — reject arbitrary Figma radius values that don't round to one of these.
5. Map Figma elevation/shadow styles to `.clay-card-shadow`/`.clay-button-shadow`/
   `.clay-balance-glow` (§3.5) — `.clay-balance-glow` is reserved for the single most important
   figure on a page per its own code comment; don't reuse it generically even if visually similar.
6. Map Figma icons to `lucide-react` by matching icon intent to the closest existing Lucide
   component name — do not export custom SVGs for icons Lucide already covers.
7. For new interactive components (buttons, inputs, cards) with no current shared code
   implementation, build them following the _visual_ conventions already established per-instance
   (§5) even though no shared component exists yet — and flag to the team that this is an
   opportunity to finally create one (§17), rather than adding yet another one-off.
8. Respect the two-tier responsive model — `lg:` (1024px) is the only breakpoint that changes the
   page _shell_ (sidebar vs. bottom nav); other breakpoints (`sm:`/`md:`/`xl:`) only affect
   in-page content reflow (§9). Don't design a third shell-level tablet state unless explicitly
   scoped as new work.
9. For Thai-language frames, verify text renders correctly in `Noto Sans Thai`/`Prompt` before
   treating a translation as complete.

## 20. Rules for Code → Figma

1. Export the `CommonUI.tsx` component set (§4) as the first and highest-priority Figma component
   library — it is small (7 components), genuinely reused, and already has documented
   variants/states (§5/§10).
2. Export `AppLayout.tsx`'s sidebar/header/bottom-nav shell as reusable Figma frames/templates,
   including the safe-area-aware mobile spacing as real frame padding, not a visual approximation.
3. Export `AppNavigation.tsx`'s `navItems` registry as a structured Figma component-instance list
   (12 items, label + icon + per-item color) rather than 12 independently-drawn nav rows — this
   preserves the fact that it's genuinely data-driven in code.
4. When exporting colors, export the corrected/deduplicated taxonomy from §15 (which folds in the
   4 undeclared color families), not a literal 1:1 dump of `index.css`'s current tokens alone —
   otherwise the Figma library will be missing colors that are load-bearing in real screens
   (status badges, money figures).
5. Do not export `components/ui/*`'s dormant components (Button, Input, Card, Table, Badge, Form)
   as if they represent shipped UI — if exported at all, label them explicitly as "internal/
   unused library" so designers don't build new screens against components no page actually uses.
6. Do not export dark-mode variants — there is nothing to export yet (§1/§16).
7. Flag the radius/color/typography near-duplicates in §16 during export rather than silently
   picking one value — this is a decision for the design/eng team, not something to resolve
   unilaterally in a one-way export.

## 21. Evidence / Source Files

Primary files read or grepped during this audit:

```text
package.json
vite.config.ts
client/src/index.css
client/src/App.tsx
client/src/lib/utils.ts
client/src/contexts/ThemeContext.tsx
client/src/components/layout/AppLayout.tsx
client/src/components/layout/AppNavigation.tsx
client/src/components/common/CommonUI.tsx
client/src/components/DashboardLayout.tsx
client/src/components/ui/button.tsx
client/src/components/ui/card.tsx
client/src/components/ui/badge.tsx
client/src/components/ui/input.tsx
client/src/components/ui/alert.tsx
client/src/components/ui/table.tsx
client/src/components/ui/chart.tsx
client/src/pages/Transactions.tsx
client/src/pages/NewExpense.tsx
client/src/pages/Reports.tsx (partial — header/toolbar/chart section)
client/src/pages/ComponentShowcase.tsx (referenced via grep, not fully read this pass)
client/public/ (directory listing)
```

Directory-wide greps run across `client/src`, `client/src/pages`, and `client/src/components/ui`
for: clay hex literals, shadcn semantic token classes, `<Button`/`<Input`/`<Form` imports,
`useForm(`/`zodResolver`, `cva(`, radius classes, breakpoint prefixes, icon-sizing classes,
`aria-*`/`role=`/`focus-visible:`, and chart-related patterns. Exact counts are cited inline in
each relevant section rather than repeated here.

**Explicit confidence caveats:** 12 of 24 page files (List/Detail siblings beyond `Transactions.tsx`
and `NewExpense.tsx`) were not individually read in full — their described patterns are inferred
from shared imports (`AppLayout`, `CommonUI` exports) and route structure, marked **Confidence:
Medium** throughout. Before relying on any Medium/Low-confidence claim for an implementation
decision, re-verify against the specific page file in question.
