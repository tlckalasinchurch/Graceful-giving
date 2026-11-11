---
name: GraceBox — Grace-giving
description: Thai church finance ledger — light-default warm white and deep ink with an emerald brand, lime accent, hard offset shadows and a dark alternative.
colors:
  ground: "#f8f9f4"
  paper: "#ffffff"
  paper-2: "#f1f3ec"
  surface: "#ffffff"
  line: "#e2e5dc"
  ink: "#171a18"
  ink-2: "#3a3f39"
  ink-3: "#6b7069"
  field: "#171a18"
  brand: "#087f5b"
  brand-ink: "#ffffff"
  income: "#087f5b"
  danger: "#b3261e"
  accent-lime: "#b8f34a"
  accent-lime-ink: "#3f4a0b"
  coral: "#ff6b7d"
  line-brand: "#06c755"
  dark-ground: "#121615"
  dark-paper: "#1a1e1d"
  dark-paper-2: "#222826"
  dark-surface: "#1a1e1d"
  dark-line: "#2e3432"
  dark-ink: "#f5f8f6"
  dark-ink-2: "#c9d2cd"
  dark-ink-3: "#8f9992"
  dark-income: "#4ade80"
  dark-danger: "#ff6b6b"
typography:
  display:
    fontFamily: "Plus Jakarta Sans, Manrope, IBM Plex Sans Thai, system-ui, sans-serif"
    fontWeight: 800
    lineHeight: 1.15
    letterSpacing: "-0.025em"
  body:
    fontFamily: "Manrope, IBM Plex Sans Thai, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.65
  eyebrow:
    fontFamily: "Manrope, IBM Plex Sans Thai, system-ui, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 700
    letterSpacing: "0.08em"
rounded:
  sm: "0.375rem"
  md: "0.5rem"
  lg: "0.75rem"
  xl: "1rem"
  2xl: "1.25rem"
  3xl: "1.5rem"
spacing:
  xs: "8px"
  sm: "12px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    class: ".btn-primary (Button default variant)"
    backgroundColor: "{colors.brand}"
    textColor: "{colors.brand-ink}"
    border: "2px solid {colors.ink}"
    shadow: "4px 4px 0 {colors.ink}"
    minHeight: "min-h-11"
  button-secondary:
    class: ".btn-secondary"
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    border: "2px solid {colors.ink}"
    shadow: "3px 3px 0 {colors.ink}"
  button-destructive:
    class: ".btn-destructive (Button destructive variant)"
    backgroundColor: "{colors.danger}"
    border: "2px solid {colors.ink}"
    shadow: "4px 4px 0 {colors.ink}"
  card:
    class: ".bento-card"
    backgroundColor: "{colors.surface}"
    border: "1.5px solid {colors.ink}"
    shadow: "3px 3px 0 {colors.ink}"
    rounded: "{rounded.2xl}"
  input:
    class: ".neo-input"
    backgroundColor: "{colors.surface}"
    border: "1.5px solid {colors.line}"
    rounded: "{rounded.xl}"
  linemark-button:
    backgroundColor: "{colors.line-brand}"
    rounded: "{rounded.xl}"
---

# GraceBox — Design System

## Overview

A Thai-language church finance app (Operate mode): offerings, counting, expenses, budgets, approvals. One coherent world in two modes, built from the same tokens. **Light is the default**: warm white ground (`#f8f9f4`), white surfaces, deep ink (`#171a18`), hairline borders (`#e2e5dc`), an emerald brand (`#087f5b`) for primary actions and money-in, a lime accent (`#b8f34a`), and hard offset shadows (`4px 4px 0 var(--ink)`) in place of blur or glow. **Dark is the alternative**, opted into with the toggle (`.dark` on `<html>`): the same hierarchy on deep green-black ink (ground `#121615`, surfaces `#1a1e1d`, text `#f5f8f6`). The choice persists in `localStorage` key `theme`; only `light` and `dark` are accepted and anything else falls back to light. It is applied before first paint by `client/public/theme-init.js` (an external file, because the CSP forbids inline scripts), and `<meta name="theme-color">` follows `--ground`. The desktop toggle is in the sidebar and the mobile toggle is in the menu sheet; the station-only kiosk and signed-out `/give` have no toggle. Token values are guarded by `client/src/theme.contrast.test.ts`.

All tokens live in `client/src/index.css` (`@theme inline` + `:root` / `.dark`). **`index.css` is the single source of truth — never copy a hex into a component** outside the exceptions listed under Colors.

## Colors

Source of truth: `client/src/index.css` (`:root` for Light, `.dark` for Dark). Token names below are the CSS variable names; Tailwind exposes most of them as `--color-*` (`text-ink`, `bg-surface`, `border-line`, `text-income`, `text-danger`, `bg-brand`, `bg-accent`).

| Role                | Token (CSS var)                        | Light                 | Dark                                 |
| ------------------- | -------------------------------------- | --------------------- | ------------------------------------ |
| Page ground         | `--ground` (`--background`)            | `#f8f9f4`             | `#121615`                            |
| Cards, popovers     | `--surface` (`--card`, `--popover`)    | `#ffffff`             | `#1a1e1d`                            |
| Paper               | `--paper`                              | `#ffffff`             | `#1a1e1d`                            |
| Secondary surface   | `--paper-2` (`--secondary`, `--muted`) | `#f1f3ec`             | `#222826`                            |
| Hairlines / borders | `--line` (`--border`)                  | `#e2e5dc`             | `#2e3432`                            |
| Body text           | `--ink` (`--foreground`)               | `#171a18`             | `#f5f8f6`                            |
| Secondary text      | `--ink-2`                              | `#3a3f39`             | `#c9d2cd`                            |
| Muted text          | `--ink-3` (`--muted-foreground`)       | `#6b7069`             | `#8f9992`                            |
| Control border      | `--field`                              | `#171a18`             | `#f5f8f6`                            |
| Brand actions       | `--brand` (`--primary`)                | `#087f5b`             | `#087f5b`                            |
| Text on brand       | `--brand-ink`                          | `#ffffff`             | `#ffffff`                            |
| Money-in            | `--income`                             | `#087f5b`             | `#4ade80`                            |
| Danger              | `--danger` (`--destructive`)           | `#b3261e`             | `#ff6b6b`                            |
| Lime accent         | `--accent-lime` (`--accent`)           | `#b8f34a`             | `#b8f34a`                            |
| Text on lime        | `--accent-lime-ink`                    | `#3f4a0b`             | `#3f4a0b`                            |
| Coral highlight     | `--coral` / `--coral-ink`              | `#ff6b7d` / `#ffffff` | `#ff6b7d` / `#ffffff`                |
| LINE green          | `--line-brand`                         | `#06c755`             | `#06c755` (not redefined in `.dark`) |

`--field` equals `--ink` in both themes; `--ink` is also the offset-shadow and border colour (see Elevation). The `--tile-*` pastel category tiles are defined for Light only and are not redefined in `.dark`. `.btn-primary:hover` uses a literal `#066b48`.

**Allowed hard-coded colors:** LINE corporate green `#06C755` ONLY on LINE sign-in buttons, and the print poster kit (`station-giving-kit.tsx`) colors, which must render opaque on paper. Everything else uses tokens.

The tokens carry legacy aliases (`clay-*`, `brand-cream/sage/peach/orange`) so old class names still resolve — they now map to the current tokens, not to orange. Do **not** use those aliases in new work; use the semantic tokens above.

## Typography

- **Stacks:** body `"Manrope"` (`--font-sans`), display `"Plus Jakarta Sans" → "Manrope"` (`--font-display`), Thai `"IBM Plex Sans Thai"` in both. Never ship a Thai UI string in only the Latin fonts. `.font-script` declares `"Caveat"`, which the font `@import` does not load, so it falls back to a generic cursive.
- **Display:** `.display` utility — weight 800, line-height 1.15, tracking −0.025em (floor −0.04em), lining numerals.
- **Body: `1rem` / 1.65** (set on `body`, not per-component). The root size scales: 16.5px by default, 15.75px under 360px, 17px from 640px, 17.5px from 1024px, 18px from 1440px.
- **Numbers:** amounts use `.money` (`tabular-nums` + −0.02em) so columns settle without jitter.
- **Labels:** minimum readable text size is 12px (`text-xs`). Avoid arbitrary sub-12px micro-text (`text-[10px]`, `text-[11px]`) on financial ledger interfaces.
- **Labels & Headings:** the heading carries its own weight; avoid repetitive decorative kicker/eyebrow labels. `.eyebrow` is a lime tab (0.8125rem, 700, uppercase, 2px offset shadow); `.eyebrow-quiet` is the plain variant.

## Layout

- Max content width `--content-max: 88rem`; full-width pages pad `px-4 sm:px-6`.
- Mobile bottom nav reserves `--mobile-nav-clearance: 7.5rem` — content must not hide behind it.
- Viewports: use `min-h-dvh` and `env(safe-area-inset-*)` (never `100vh`); `html` sets `viewport-fit=cover` and `text-size-adjust: 100%`.
- Data tables get `overflow-x-auto` (or a `hidden md:block` table + card fallback on mobile, as in `Transactions`/`Expenses`).
- Tab strips and chip rows scroll horizontally (`overflow-x-auto no-scrollbar`), with `touch-pan-x` where the strip could fight vertical scroll.

## Elevation & Depth

Depth is a hard offset shadow in `--ink` with a matching ink border, not blur or glow. The press state moves the element onto its shadow.

| Class                                                | Treatment                                                                                      |
| ---------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `.btn-primary`, `.btn-destructive`                   | 2px ink border, `4px 4px 0 var(--ink)`; `:active` → `translate(3px, 3px)`, no shadow           |
| `.btn-secondary`                                     | 2px ink border, `3px 3px 0`; hover → lime fill, `4px 4px 0`; `:active` → `translate(2px, 2px)` |
| `.bento-card`                                        | 1.5px ink border, `3px 3px 0`; hover lifts `translateY(-2px)` with `5px 5px 0`                 |
| `.bento-card-static`                                 | same frame, `4px 4px 0`, no hover movement (forms, tables)                                     |
| `.neo-modal`, Dialog primitive                       | 2px ink border, `6px 6px 0`                                                                    |
| `.card-elevation-sm` / `-focus`, `.button-elevation` | utility shadows `4px` / `6px` / `4px` (defined; no `.tsx` uses them today)                     |
| `.neo-input:focus`                                   | `2px 2px 0 var(--brand)`                                                                       |

- Offset shadows are intentional, not everywhere: use them on actionable or grouped surfaces, not on every container.
- **Blur:** `backdrop-blur` appears on a few floating surfaces in TSX (for example the mobile bottom nav, `bg-surface/95 backdrop-blur`). `.glass-dark` is defined in `index.css` but is a fixed `rgba(255,255,255,0.85)` + 12px blur that does not adapt to Dark, and no `.tsx` uses it — do not use it in new work.
- **Glow:** `.glow-lime` and `.text-glow-lime` are defined, but no `.tsx` uses them. No current component uses glow; do not introduce it.
- **Decorative backgrounds:** `.give-aurora`, `.give-ledger` and `.dot-grid` are CSS gradients built from tokens for hero and empty-state backgrounds. They are not elevation.

## Shapes

Radius scale in `index.css`: 6 / 8 / 12 / 16 / 20 / 24px (`sm`–`3xl`). Convention:

- **Cards & sheets: 20–24px** (`rounded-2xl`, `rounded-3xl`). Mobile sheet frames use `rounded-[28px]`.
- **Controls (buttons, inputs, chips): 12–20px** (`rounded-xl`/`2xl`).
- **Pills (`rounded-full`) only for small status chips, badges, and nav indicators — never as card radius.**
- Dialogs: `rounded-2xl`, 2px ink border, opaque `bg-surface`, `6px 6px 0` offset shadow.

## Components

- **Buttons:** the `Button` primitive (`components/ui/button.tsx`) maps `default` → `.btn-primary` and `destructive` → `.btn-destructive` (solid fill, 2px ink border, offset shadow, press translates onto the shadow). Its `outline`, `secondary`, `ghost` and `link` variants are plain Tailwind and carry no offset shadow. `.btn-secondary` is also used directly as a class. `.btn-accent` and `.btn-coral` are defined in `index.css` but no `.tsx` uses them today. Minimum height is `min-h-11` for default and `lg`; `sm` is `min-h-9.5`. Focus is a global 2px brand `:focus-visible` outline in `index.css`, and the `Button` primitive adds a 3px `ring-ring/50` — don't add another per component.
- **Confirm dialogs** go through `client/src/lib/sweetalert.ts` (`Swal.confirm/fire`), which renders `.neo-modal`. The default confirm button is `.btn-primary` and the default cancel is `.btn-secondary`. Custom confirm buttons take a **CSS color string, so use `var(--destructive)`**, never a hex.
- **Inputs:** two treatments exist, so don't assume one. The `Input` primitive is `h-12 rounded-xl border border-line bg-surface` with a 3px focus ring. The `.neo-input` class (used across many pages) is `min-height: 3rem`, a 1.5px `--line` border, `max(16px, 0.95rem)` text to stop iOS zoom, and on focus a brand border plus `2px 2px 0 var(--brand)`. Labels and error text from `SetupSteps.tsx` lead (`text-danger`, required `*`).
- **Cards:** `.bento-card` (hover lift) and `.bento-card-static` (no movement) are the common frames; see Elevation.
- **Toasts:** Sonner, `position="top-center"` `richColors` (`App.tsx`), themed from `ThemeContext` — errors speak Thai and name the recovery.
- **Icons:** Lucide, single stroke weight (`size-5`/`size-[18px]`), `aria-hidden` when decorative; interactive icon buttons carry Thai `aria-label`s.
- **Print kit:** `station-giving-kit.tsx` renders opaque, `[print-color-adjust:exact]`, poster-safe.

## Do's and Don'ts

**Do**

- Add new colors by editing `client/src/index.css`, then using utilities (`text-ink-2`, `bg-accent`, `btn-primary`, `neo-modal`). Define each new token for both `:root` and `.dark`.
- Run `pnpm exec vitest run client/src/theme.contrast.test.ts` after any token change. It checks Light and Dark: the primary action pair ≥ 4.5:1, `--ink` and `--ink-3` on card and ground ≥ 4.5:1, `--field` against `--surface` ≥ 3:1 (WCAG 1.4.11), and `--danger` on card and ground ≥ 4.5:1.
- Keep motion inside the gated patterns: `.animate-fade-up`, `.flip-char`, and the `prefers-reduced-motion` guards; one authored moment per page.
- Write UI copy and ARIA labels in Thai; errors name the problem and the recovery.
- Keep interactive targets at least `min-h-11`, with visible focus.
- Use `.btn-primary` for the main action of a screen; secondary actions use `.btn-secondary`.

**Don't**

- Don't hard-code `bg-white`, `text-black`, `text-stone-*`, `border-stone-*` or hex values: they will not follow the theme and break in Dark. Use the tokens.
- Don't color confirm dialogs ad hoc; intent expresses through `var(--destructive)` or the default confirm button.
- Don't introduce glow, glow text-shadow or `.glass-dark` in new work (see Elevation).
- Don't invent a per-category light/dark default: the system default is light; keep the switch through `ThemeContext`.
