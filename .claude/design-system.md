# Design System Reference (for Figma MCP integration)

This document maps Graceful-giving's actual design-system implementation so Figma designs can be
translated into this codebase's real tokens, components, and conventions instead of generic
Tailwind/shadcn defaults. Generated from a direct audit of the repo on 2026-09-16 — re-verify
against current files before trusting stale line numbers or file paths.

## 1. Token Definitions

**Location:** `client/src/index.css` — there is **no `tailwind.config.js`**. This project is on
**Tailwind CSS v4**, which defines design tokens directly in CSS via `@theme`, not a JS config file.

### Structure

- `@theme inline { ... }` (lines 7-50) declares the Tailwind-consumable token layer: font families,
  radius scale, and semantic color aliases (`--color-primary`, `--color-border`, etc.) that map to
  raw CSS custom properties.
- `:root { ... }` (lines 52-73) declares the actual raw values for the semantic tokens (hex colors,
  `--radius: 1rem`). This is the layer to edit when re-theming.
- A `.dark` variant is wired via `@custom-variant dark (&:is(.dark *));` but **no `.dark { ... }`
  block currently overrides the `:root` values** — dark mode is not actually implemented yet
  despite `next-themes` being a dependency. Don't assume dark tokens exist; check before styling
  for dark mode.

### Semantic tokens (shadcn/ui convention)

```
--background / --foreground
--card / --card-foreground
--popover / --popover-foreground
--primary / --primary-foreground
--secondary / --secondary-foreground
--muted / --muted-foreground
--accent / --accent-foreground
--destructive / --destructive-foreground
--border / --input / --ring
--radius (base = 1rem; sm/md/lg/xl/2xl/3xl derive from it)
```

### Brand-specific tokens ("Clay" palette)

A custom warm, illustrated "clay" aesthetic layered on top of shadcn tokens — this is the product's
actual visual identity, distinct from default shadcn gray:

```
--color-clay-bg:        #fff9ee   (page background)
--color-clay-cream:     #fff4df
--color-clay-sage:      #a8c978   (secondary accent — success/positive)
--color-clay-lightsage: #dcecc5
--color-clay-peach:     #f7b6a6
--color-clay-orange:    #e99a4a   (== --primary)
--color-clay-sky:       #a9d4ed
--color-clay-brown:     #70452e
--color-clay-dark:      #38251b   (== --foreground)
--color-clay-muted:     #927d6d
--color-clay-border:    #e9d9bf
```

Use Tailwind utility classes generated from these (`bg-clay-sage`, `text-clay-brown`, etc.) for
brand-specific surfaces; use the semantic tokens (`bg-primary`, `text-muted-foreground`) for
shadcn-derived UI primitives so component variants stay theme-consistent.

### Typography tokens

```
--font-sans / --font-display: "Prompt", "Noto Sans Thai", sans-serif
--font-script: "Caveat", cursive   (applied via .font-script utility class)
```

Fonts are loaded via a Google Fonts `@import` at the top of `index.css` (not self-hosted) — Thai
(`Noto Sans Thai`) and Latin (`Prompt`) are both required since the product is bilingual
Thai/English (see `aria-label="Grace-giving ส่วนต้อนรับ"` patterns in `Home.tsx`).

### Shadow / effect tokens (utility classes, not CSS vars)

Custom box-shadow utility classes in `index.css` implement the "clay" soft-3D look — reuse these
rather than inventing new shadow values when a Figma design shows soft elevation:

- `.clay-card-shadow` — standard card elevation
- `.clay-button-shadow` — warm glow under primary buttons
- `.clay-inset-bevel` — inset highlight for pressed/embossed surfaces
- `.clay-balance-glow` — stronger sage-tinted glow, reserved for the single most important figure
  on a page (see the comment at index.css:128-130 — this is intentionally not reused generically)

### Motion tokens

- `.animate-fade-up` (keyframes `fade-slide-up`, 0.6s `cubic-bezier(0.16,1,0.3,1)`) — staggered
  entrance for above-the-fold content only, respects `prefers-reduced-motion`.
- Global button/link transitions (transform/background/color/box-shadow/border-color at 180ms) are
  set in a base layer, plus an active-state `scale(0.97)` press effect — don't re-declare these
  per-component.

**When implementing a Figma design:** extract colors/radii/type scale first against this token
list. If a Figma value doesn't map to an existing token, flag it — don't silently hardcode a new
hex value inline; add it to `:root`/`@theme inline` in `index.css` instead.

## 2. Component Library

**Location:** `client/src/components/ui/` (55 files) — this is a **shadcn/ui-style component
library**: source-owned, copy-pasted component code (not an installed npm package), built on Radix
UI primitives + `class-variance-authority` (CVA) for variants + `tailwind-merge`/`clsx` via the
`cn()` helper in `client/src/lib/utils.ts`.

### Architecture pattern (see `button.tsx` as the canonical example)

```tsx
const buttonVariants = cva("base classes...", {
  variants: { variant: { default, destructive, outline, secondary, ghost, link }, size: {...} },
  defaultVariants: { variant: "default", size: "default" },
});

function Button({ className, variant, size, asChild = false, ...props }) {
  const Comp = asChild ? Slot : "button";
  return <Comp data-slot="button" className={cn(buttonVariants({ variant, size, className }))} {...props} />;
}
```

- Every primitive uses `cva` for variant/size props and exposes a `data-slot="<name>"` attribute
  (used for targeting in complex compound components, e.g. `sidebar.tsx`).
- `asChild` + Radix `Slot` pattern is used throughout for polymorphic rendering.
- No Storybook, no component documentation site. **`client/src/pages/ComponentShowcase.tsx`** is
  the closest thing to a living component catalog/playground — check it when auditing what's
  already built before creating a new primitive.

### Two component tiers

1. `components/ui/*` — generic, app-agnostic primitives (accordion, dialog, button, table, sidebar,
   form, calendar, chart, etc.) — extend these, don't duplicate them.
2. Custom brand components layered on top, e.g. `arrow-fill-button.tsx` (+ co-located
   `arrow-fill-button.css` — one of the only components with a dedicated stylesheet instead of pure
   Tailwind), `interactive-hover-button.tsx`, `flip-text.tsx` (ported from ObsidianUI, MIT-licensed
   — see the attribution comment block in `index.css:205-208`). These are bespoke marketing/landing
   interaction components, not shadcn defaults — check here before building a new animated CTA.

**Before implementing a new Figma component:** grep `client/src/components/ui/` for an existing
match first (55 primitives already cover accordion, alert, avatar, badge, breadcrumb, calendar,
card, carousel, chart, checkbox, command palette, dialog/alert-dialog, drawer/sheet, dropdown,
empty state, field, form, hover-card, input/input-otp/input-group, item, kbd, label, menubar, nav
menu, pagination, popover, progress, radio, resizable panels, scroll-area, select, separator,
sidebar, skeleton, slider, sonner/toast, spinner, switch, table, tabs, textarea, toggle/toggle
group, tooltip). Extend an existing primitive's variants before writing a new file.

## 3. Frameworks & Libraries

| Layer                | Choice                                                                                                            | Notes                                                                                                                                                                                                          |
| -------------------- | ----------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| UI framework         | React 19.2                                                                                                        | function components + hooks only                                                                                                                                                                               |
| Router               | `wouter` 3.3.5                                                                                                    | flat `<Switch>` in `App.tsx`, no nested layouts; patched via `patches/wouter@3.7.1.patch`                                                                                                                      |
| Server state         | `@tanstack/react-query` 5 + `@trpc/react-query`                                                                   | type-safe API client, no REST/OpenAPI layer                                                                                                                                                                    |
| Forms                | `react-hook-form` 7 + `@hookform/resolvers` + `zod`                                                               | schema-first validation                                                                                                                                                                                        |
| Styling              | Tailwind CSS v4 (`@tailwindcss/vite` plugin, no PostCSS config needed) + `tailwindcss-animate` + `tw-animate-css` | utility-first, no CSS Modules/styled-components                                                                                                                                                                |
| Component primitives | Radix UI (`@radix-ui/react-*`, ~25 packages)                                                                      | headless/unstyled, styled via shadcn pattern                                                                                                                                                                   |
| Variant management   | `class-variance-authority` + `clsx` + `tailwind-merge`                                                            | via `cn()` helper                                                                                                                                                                                              |
| Icons                | `lucide-react` 0.453                                                                                              | see §5                                                                                                                                                                                                         |
| Animation            | `framer-motion` 12                                                                                                | for JS-driven motion beyond CSS transitions                                                                                                                                                                    |
| Charts               | `recharts` 2.15                                                                                                   | wrapped by `components/ui/chart.tsx`                                                                                                                                                                           |
| Date handling        | `date-fns` 4, `react-day-picker` 9                                                                                |                                                                                                                                                                                                                |
| Build tool           | **Vite 7**                                                                                                        | not webpack/CRA/Next.js — this is a Vite SPA + separate Express backend, not a Next.js app despite CLAUDE.md mentioning "nextjs" in project-type metadata (that's inaccurate; verify against `vite.config.ts`) |
| Bundler (server)     | `esbuild`                                                                                                         | bundles `server/_core/index.ts` → `dist/`, plus a separate serverless entry `api/index.js` for Vercel                                                                                                          |
| Type system          | TypeScript 5.9, strict                                                                                            | `tsc --noEmit` is the only "lint" step (no ESLint config present)                                                                                                                                              |
| Formatting           | Prettier 3.6                                                                                                      | `pnpm format`                                                                                                                                                                                                  |
| Package manager      | pnpm 10                                                                                                           | required — see `packageManager` field                                                                                                                                                                          |

**Important correction:** despite ambient session context describing this as a Next.js project,
it is **not** — there's no `app/` or `pages/` router, no `next.config`, and `vite.config.ts` is
authoritative. Treat all Next.js-specific guidance (App Router, RSC, Server Actions) as
inapplicable here.

## 4. Asset Management

- **Static/public assets:** `client/public/` — served as-is by Vite, referenced with root-relative
  paths (`/illustrations/hero_jesus_shepherd.jpg`). Contains an `illustrations/` folder of hand
  photography/illustration JPGs used across Home/dashboard sections (hero shepherd, income hand
  heart, expense hand coin, balance wallet, bible cross, offering box) — these are the brand's
  illustrated-photo motif; reuse existing files before requesting new asset generation for the same
  concepts.
- **Build-time imported assets:** path alias `@assets` → `attached_assets/` (configured in
  `vite.config.ts:161`) for assets imported directly into components (processed/hashed by Vite),
  as opposed to `client/public/` which is copied verbatim. The `attached_assets/` directory doesn't
  currently exist in the repo (created on demand) — check before assuming assets live there.
- **No image optimization pipeline** (no `next/image` equivalent, no responsive `srcset` generation
  visible) — images are used as plain `<img>` tags. If Figma exports require multiple resolutions,
  that's a manual/new concern, not an existing pattern.
- **No CDN config** — everything ships from the single Express/Vite deployable (see CLAUDE.md
  "single deployable Node process").

## 5. Icon System

- **Library:** `lucide-react` exclusively — no custom SVG icon set, no icon sprite sheet, no
  `client/src/icons/` directory.
- **Usage pattern:** named imports directly in the consuming component, e.g. in `Home.tsx`:
  ```tsx
  import { Wallet, TrendingUp, TrendingDown, ... } from "lucide-react";
  ```
  Icons are sized via Tailwind (`className="size-4"` etc.) — note `button.tsx`'s base classes
  auto-size any child `<svg>` without an explicit `size-*` class to `size-4` (`[&_svg:not([class*='size-'])]:size-4`).
- **Naming convention:** PascalCase, matches Lucide's own export names 1:1 — no local renaming/
  wrapping layer. When translating a Figma icon to code, find the closest Lucide equivalent by name
  rather than exporting a custom SVG, unless the icon is truly bespoke (e.g. brand marks).

## 6. Styling Approach

- **Methodology:** Tailwind utility classes inline in JSX is the dominant approach (~98% of
  styling). `cn()` (`clsx` + `tailwind-merge`) is the standard way to compose conditional/overridable
  classes — always merge through `cn()`, never string-concatenate `className`.
- **Global styles:** single file, `client/src/index.css` — font imports, Tailwind/tw-animate-css
  imports, `@theme`, `:root` tokens, base layer resets, custom utility classes (`.clay-*`,
  `.animate-fade-up`, `.flip-char`), and scrollbar styling. There is no separate `typography.css`/
  `tokens.css` split — everything lives in this one file (267 lines as audited).
- **Component-scoped CSS:** rare exception — `arrow-fill-button.css` is co-located with its `.tsx`
  file for effects not expressible cleanly in Tailwind (fill-on-hover animation). This is the
  pattern to follow if a Figma interaction can't be done with utilities: co-locate a small `.css`
  file next to the component, don't add another global stylesheet.
- **Responsive design:** standard Tailwind breakpoint prefixes (`md:`, `lg:`) used ad hoc per
  component — no custom breakpoint tokens beyond Tailwind v4 defaults. Mobile-first authoring
  (base classes = mobile, `md:`/`lg:` overrides for larger viewports), consistent with
  `rounded-[28px] md:rounded-[32px]` style patterns seen in `Home.tsx`.
- **Dark mode:** `@custom-variant dark` is declared but unused (no `.dark` token overrides exist
  yet, see §1) — don't build dark-mode-specific Figma frames as if there's an existing dark theme
  to match against.

## 7. Project Structure

```
client/
  src/
    components/
      ui/            # shadcn-style primitives + a few bespoke brand components (flat, not per-feature)
    pages/           # one file per route (Home.tsx, ComponentShowcase.tsx, etc.) — not grouped in folders
    lib/             # utils.ts (cn helper), trpc.ts (API client)
    App.tsx          # flat wouter <Switch>, routes grouped by comment (Core/Auth, Transactions, Offerings, ...)
    index.css        # single global stylesheet + design tokens
  public/            # static assets (illustrations/, __manus__ dev tooling)
attached_assets/      # @assets alias target for build-time-imported media (create on demand)
server/               # Express + tRPC backend (routers.ts, db.ts, storage.ts) + server/_core/ framework plumbing
shared/                # code shared between client and server (constants, error helpers)
drizzle/               # DB schema (source of truth for data shapes surfaced in UI)
```

Path aliases (`vite.config.ts`): `@` → `client/src`, `@shared` → `shared`, `@assets` →
`attached_assets`. Always import via these aliases, never long relative chains (`../../../`).

Components are organized **by type** (`components/ui/`) rather than by feature — this is a
deliberate shadcn convention, not an oversight; don't restructure into `components/hero/`,
`components/scrolly-section/`-style feature folders unless asked, since it would diverge from the
rest of the codebase's existing pattern.

## 8. Practical Rules for Figma → Code Translation

1. **Match colors to the "clay" token palette first** (§1) before introducing new hex values.
   Primary brand orange is `#e99a4a` / `--color-clay-orange` / `--primary` — these are the same
   color under three names; use the semantic alias appropriate to context (`bg-primary` for
   interactive UI, `bg-clay-orange` only if styling something clearly outside the shadcn primitive
   system).
2. **Reuse `components/ui/*` primitives** — check `ComponentShowcase.tsx` and the 55-file inventory
   in §2 before generating new component code from a Figma frame.
3. **Respect the bilingual Thai/English requirement** — text content and `aria-label`s often need
   both `Prompt` (Latin) and `Noto Sans Thai` coverage; don't swap in a font that lacks Thai glyph
   support.
4. **New shadows/elevation** should extend the `.clay-*` utility class family in `index.css`, not
   introduce raw inline `box-shadow` Tailwind arbitrary values, unless the effect is truly one-off.
5. **Motion** should respect `prefers-reduced-motion` like the existing `.animate-fade-up` and
   `.flip-char` rules do — always pair new CSS animations with a reduced-motion override.
6. **No dark mode yet** — if a Figma file includes dark frames, that's net-new scope (adding a
   `.dark { ... }` token block), not a translation of an existing theme.
7. **This is a Vite SPA, not Next.js** — don't apply App Router/RSC/Server Component conventions
   when translating Figma layouts to routes; routes are flat `wouter` pages in `pages/`.
