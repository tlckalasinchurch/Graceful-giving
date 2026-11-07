---
name: GraceBox — Grace-giving
description: Thai church finance ledger — dark warm charcoal system, signature orange gradient CTA with glow, glass cards, near-white ink on charcoal.
colors:
  canvas: "#0E0A08"
  paper: "#1A1210"
  paper-2: "#2A1D17"
  surface: "#211915"
  ink: "#FFF7ED"
  ink-muted: "#D6C7B8"
  line: "#3A2B22"
  field: "#C9B8A8"
  brand: "#FF7A1A"
  brand-ink: "#FF6200"
  income: "#4ADE80"
  danger: "#F87171"
  line-brand: "#06C755"
  dark-background: "#0E0A08"
  dark-card: "#211915"
typography:
  display:
    fontFamily: "Plus Jakarta Sans, Manrope, IBM Plex Sans Thai, system-ui, sans-serif"
    fontWeight: 800
    lineHeight: 1.15
    letterSpacing: "-0.025em"
  body:
    fontFamily: "Plus Jakarta Sans, Manrope, IBM Plex Sans Thai, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.6
  signature:
    fontFamily: "Caveat, cursive"
    fontSize: "1.25rem"
    fontWeight: 700
  eyebrow:
    fontFamily: "Plus Jakarta Sans, IBM Plex Sans Thai, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 600
    letterSpacing: "0.02em"
rounded:
  sm: "6px"
  md: "8px"
  lg: "12px"
  xl: "16px"
  2xl: "20px"
  3xl: "24px"
spacing:
  xs: "8px"
  sm: "12px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    background: "linear-gradient(135deg, #FFB347, #FF7A1A, #FF5E00)"
    textColor: "#0A0A0A"
    rounded: "{rounded.xl}"
    height: "48px"
    shadow: "0 0 24px rgba(255,122,26,0.55)"
  button-primary-hover:
    background: "linear-gradient(135deg, #FFBE6A, #FF8A2A, #FF6A00)"
  button-danger:
    backgroundColor: "{colors.danger}"
    textColor: "#0A0A0A"
    rounded: "{rounded.xl}"
    height: "48px"
  card:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.2xl}"
    border: "1px solid rgba(255,247,237,0.12)"
  input:
    backgroundColor: "{colors.canvas}"
    rounded: "{rounded.xl}"
  linemark-button:
    backgroundColor: "{colors.line-brand}"
    textColor: "#0A0A0A"
    rounded: "{rounded.xl}"
    height: "48px"
---

# GraceBox — Design System

## Overview

A Thai-language church finance app (Operate mode): offerings, counting, expenses, budgets, approvals. One coherent world — **dark warm charcoal (#0E0A08), near-white ink (#FFF7ED), signature orange gradient CTA (#FF7A1A → #FF5E00) with glow**. Depth is glass + glow, not flat tonal steps. All pages are dark-first (`.dark` is default); token values are guarded by `client/src/theme.contrast.test.ts`.

All tokens live in `client/src/index.css` (`@theme inline` + `:root` / `.dark`). **`index.css` is the single source of truth — never copy a hex into a component** outside the exceptions listed under Colors.

## Colors

| Role                | Token                            | Value                                                                |
| ------------------- | -------------------------------- | -------------------------------------------------------------------- |
| Canvas (page bg)    | `--background`, `--color-ground` | `#0E0A08`                                                            |
| Raised surfaces     | `--card` / `--popover`           | `#211915`                                                            |
| Body text           | `--foreground`, `--color-ink`    | `#FFF7ED`                                                            |
| Secondary text      | `text-ink-2`, `text-ink-3`       | `#D6C7B8`                                                            |
| Hairlines / borders | `--border`, `--color-line`       | `#3A2B22`                                                            |
| Brand actions       | `btn-cta-gradient`, `--primary`  | `linear-gradient(135deg, #FFB347, #FF7A1A, #FF5E00)`, text **black** |
| Brand hover         | `.btn-cta-gradient:hover`        | `linear-gradient(135deg, #FFBE6A, #FF8A2A, #FF6A00)`                 |
| Money-in semantics  | `text-income`, `--color-income`  | `#4ADE80`                                                            |
| Danger              | `text-danger`, `--destructive`   | `#F87171`                                                            |

**Allowed hard-coded colors:** LINE corporate green `#06C755` ONLY on LINE sign-in buttons, and the print poster kit (`station-giving-kit.tsx`) colors, which must render opaque on paper. Everything else uses tokens.

The tokens carry legacy aliases (`clay-*`, `brand-cream/sage/peach`) so old class names still resolve — do **not** use those aliases in new work; use the semantic tokens above.

## Typography

- **Stacks:** Latin/digits `"Plus Jakarta Sans" → "Manrope"`, Thai `"IBM Plex Sans Thai"`, signature simulation `"Caveat"`. Never ship a Thai UI string in only the Latin fonts.
- **Display:** `.display` utility — weight 800, line-height 1.15, tracking −0.025em (floor −0.04em), lining numerals.
- **Body: 15px / 1.6** (set on `body`, not per-component).
- **Numbers:** amounts use `.money` (`tabular-nums` + −0.02em) so columns settle without jitter.
- **Labels:** minimum readable text size is 12px (`text-xs`). Avoid arbitrary sub-12px micro-text (`text-[10px]`, `text-[11px]`) on financial ledger interfaces.
- **Labels & Headings:** the heading carries its own weight; avoid repetitive decorative kicker/eyebrow labels.

## Layout

- Max content width `--content-max: 88rem`; full-width pages pad `px-4 sm:px-6`.
- Mobile bottom nav reserves `--mobile-nav-clearance: 7rem` — content must not hide behind it.
- Viewports: use `min-h-dvh` and `env(safe-area-inset-*)` (never `100vh`); `html` sets `viewport-fit=cover` and `text-size-adjust: 100%`.
- Data tables get `overflow-x-auto` (or a `hidden md:block` table + card fallback on mobile, as in `Transactions`/`Expenses`).
- Tab strips and chip rows scroll horizontally (`overflow-x-auto no-scrollbar`), with `touch-pan-x` where the strip could fight vertical scroll.

## Elevation & Depth

**Glass + glow by design:**

- Elevation is glass: `glass-dark` (backdrop-blur + 1px white/12 border) + glow (`--glow-cta: 0 0 24px rgba(255,122,26,0.55)`).
- CTA buttons have orange gradient + outer glow; hover strengthens glow.
- Floating bars (`.fintech-glass`) are semi-transparent with blur, never opaque.
- Buttons declare glow shadow at rest (`.button-elevation: glow-cta`).

## Shapes

Radius scale in `index.css`: 6 / 8 / 12 / 16 / 20 / 24px (`sm`–`3xl`). Convention:

- **Cards & sheets: 20–24px** (`rounded-2xl`, `rounded-3xl`). Mobile sheet frames use `rounded-[28px]`.
- **Controls (buttons, inputs, chips): 12–20px** (`rounded-xl`/`2xl`).
- **Pills (`rounded-full`) only for small status chips, badges, and nav indicators — never as card radius.**
- Dialogs: `rounded-2xl` with a `border-line` ring, opaque `bg-surface`.

## Components

- **Buttons:** primary = `.btn-cta-gradient` (orange gradient + black text, AA-certified by the contrast test), hover stronger gradient + glow, press `active:scale-[0.98]`; minimum interactive height 44px (`min-h-11`+). Focus is a global 2px brand `:focus-visible` ring — don't re-declare per component.
- **Confirm dialogs** go through `client/src/lib/sweetalert.ts` (`Swal.confirm/fire`) — the custom token-rendered helper. Custom confirm buttons take a **CSS color string, so use `var(--destructive)`**, never a hex. Forward-looking commitments (post, close, match) take no color override and render the default brand CTA button.
- **Inputs:** dark `bg-background/60`, `border-line`, `rounded-xl`, focus `ring-brand`; labels and error text from `SetupSteps.tsx` lead (`text-danger`, required `*`).
- **Toasts:** Sonner, `position="top-center"` `richColors` — errors speak Thai and name the recovery.
- **Icons:** Lucide, single stroke weight (`size-5`/`size-[18px]`), `aria-hidden` when decorative; interactive icon buttons carry Thai `aria-label`s.
- **Print kit:** `station-giving-kit.tsx` renders opaque, `[print-color-adjust:exact]`, poster-safe.

## Do's and Don'ts

**Do**

- Add new colors by editing `client/src/index.css`, then using utilities (`text-ink-2`, `bg-accent`, `btn-cta-gradient`, `glass-dark`).
- Run `pnpm exec vitest run client/src/theme.contrast.test.ts` after any token change; keep every dark-surface pair ≥ 4.5:1 (danger included, canvas included).
- Keep motion inside the gated patterns: `.animate-fade-up`, `.flip-char`, and the `prefers-reduced-motion` guards; one authored moment per page.
- Write UI copy and ARIA labels in Thai; errors name the problem and the recovery.
- Use `glow-orange` and gradient CTA for primary actions only — secondary stays glass.

**Don't**

- Don't re-hard-code old light-world utilities (`bg-white`, `text-stone-900`, `border-stone-200`) on dark surfaces.
- Don't color confirm dialogs ad hoc; intent expresses through `var(--destructive)` or the default brand CTA button.
- Don't add gradient text on body copy (glow is reserved for CTA and hero numbers).
- Don't invent category-default light/dark: the entire system is dark; keep the switch through `ThemeContext`.
