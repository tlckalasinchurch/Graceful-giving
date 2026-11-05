---
name: Grace Ledger (Grace-giving)
description: Thai church finance ledger — contemporary Editorial FinTech (WW/STUDIO x Finexy), signature coral brand, jet-black ink on a warm stone canvas.
colors:
  canvas: "#F6F4F1"
  paper: "#FAF8F5"
  paper-2: "#EDE8E1"
  surface: "#FFFFFF"
  ink: "#080808"
  ink-muted: "#5C5850"
  line: "#E4DED2"
  field: "#6C675F"
  brand: "#F95C4B"
  brand-ink: "#E54937"
  income: "#047857"
  danger: "#B91C1C"
  line-brand: "#06C755"
  dark-background: "#080808"
  dark-card: "#121214"
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
  xl: "14px"
  2xl: "16px"
  3xl: "20px"
spacing:
  xs: "8px"
  sm: "12px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.brand}"
    textColor: "#080808"
    rounded: "{rounded.2xl}"
    height: "44px"
  button-primary-hover:
    backgroundColor: "{colors.brand-ink}"
  button-danger:
    backgroundColor: "{colors.danger}"
    textColor: "#FFFFFF"
    rounded: "{rounded.2xl}"
    height: "44px"
  card:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.3xl}"
  input:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.xl}"
  linemark-button:
    backgroundColor: "{colors.line-brand}"
    textColor: "#080808"
    rounded: "{rounded.2xl}"
    height: "48px"
---

# Grace Ledger — Design System

## Overview

A Thai-language church finance app (Operate mode): offerings, counting, expenses, budgets, approvals. One coherent world — **flat surfaces, jet-black ink, warm stone canvas (#F6F4F1), signature coral accent (#F95C4B)**. Depth is tonal, not shadowed; the only edge is a 1px ring of `--line` (#E4DED2). Dark mode is a first-class counterpart (`.dark` class, tokens swatch everything) and is guarded by `client/src/theme.contrast.test.ts`.

All tokens live in `client/src/index.css` (`@theme inline` + `:root` / `.dark`). **`index.css` is the single source of truth — never copy a hex into a component** outside the exceptions listed under Colors.

## Colors

| Role                | Token                           | Value                                             |
| ------------------- | ------------------------------- | ------------------------------------------------- |
| Canvas (page bg)    | `--background`, `--color-ground`| `#F6F4F1`                                         |
| Raised surfaces     | `--card` / `--popover`          | `#FFFFFF` / `#121214` (dark)                      |
| Body text           | `--foreground`, `--color-ink`   | `#080808` (dark: `#F8FAFC`)                       |
| Secondary text      | `text-ink-2`, `text-ink-3`      | `#5C5850`                                         |
| Hairlines / borders | `--border`, `--color-line`      | `#E4DED2`                                         |
| Brand actions       | `bg-brand`, `--primary`         | `#F95C4B`, text **black** (6.66:1 contrast)      |
| Brand hover         | `bg-brand-ink`                  | `#E54937`                                         |
| Money-in semantics  | `text-income`, `--color-income` | `#047857`                                         |
| Danger              | `text-danger`, `--destructive`  | `#B91C1C` (light; dark `--destructive` `#FB7185`) |

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
- Mobile bottom nav reserves `--mobile-nav-clearance: 5.5rem` — content must not hide behind it.
- Viewports: use `min-h-dvh` and `env(safe-area-inset-*)` (never `100vh`); `html` sets `viewport-fit=cover` and `text-size-adjust: 100%`.
- Data tables get `overflow-x-auto` (or a `hidden md:block` table + card fallback on mobile, as in `Transactions`/`Expenses`).
- Tab strips and chip rows scroll horizontally (`overflow-x-auto no-scrollbar`), with `touch-pan-x` where the strip could fight vertical scroll.

## Elevation & Depth

**Flat by design.** No blurred glows, no large soft shadows at rest:

- Elevation is tonal: canvas → surface → accent step (`ground → paper → surface`).
- The only shadows in the system: the `.card-elevation-sm` family (2–6% near-black, sub-visible) and the focus ring (2px `--color-brand` outline, 2px offset).
- Floating bars (`fintech-glass`) are **opaque** fills with a 1px `--line` border, never backdrop blur.
- Buttons declare no shadow at rest (`button-elevation: none`).

## Shapes

Radius scale in `index.css`: 6 / 8 / 12 / 14 / 16 / 20px (`sm`–`3xl`). Convention:

- **Cards & sheets: 16–20px** (`rounded-2xl`, `rounded-3xl`).
- **Controls (buttons, inputs, chips): 8–14px** (`rounded-xl`/`2xl`).
- **Pills (`rounded-full`) only for small status chips, badges, and nav indicators — never as card radius.**
- Dialogs: `rounded-2xl` with a `border-line` ring, opaque `bg-surface`.

## Components

- **Buttons:** primary = `bg-brand` + black text (AA-certified by the contrast test), hover `bg-brand-ink`, press `active:scale-[0.98]`; minimum interactive height 44px (`min-h-11`+). Focus is a global 2px brand `:focus-visible` ring — don't re-declare per component.
- **Confirm dialogs** go through `client/src/lib/sweetalert.ts` (`Swal.confirm/fire`) — the custom token-rendered helper. Custom confirm buttons take a **CSS color string, so use `var(--destructive)`**, never a hex. Forward-looking commitments (post, close, match) take no color override and render the default brand `bg-brand text-black` button.
- **Inputs:** `bg-surface`, `border-line`, `rounded-xl`, focus `ring-brand`; labels and error text from `SetupSteps.tsx` lead (`text-danger`, required `*`).
- **Toasts:** Sonner, `position="top-center"` `richColors` — errors speak Thai and name the recovery.
- **Icons:** Lucide, single stroke weight (`size-5`/`size-[18px]`), `aria-hidden` when decorative; interactive icon buttons carry Thai `aria-label`s.
- **Print kit:** `station-giving-kit.tsx` renders opaque, `[print-color-adjust:exact]`, poster-safe.

## Do's and Don'ts

**Do**

- Add new colors by editing `client/src/index.css`, then using utilities (`text-ink-2`, `bg-accent`).
- Run `pnpm exec vitest run client/src/theme.contrast.test.ts` after any token change; keep every light-surface pair ≥ 4.5:1 (danger included, canvas included).
- Keep motion inside the gated patterns: `.animate-fade-up`, `.flip-char`, and the `prefers-reduced-motion` guards; one authored moment per page.
- Write UI copy and ARIA labels in Thai; errors name the problem and the recovery.
- Verify dark mode after new surfaces — every token must have a `.dark` value that reads on `--card: #121214`.

**Don't**

- Don't re-hard-code old-world utilities on light surfaces (`text-white/60`, `text-stone-300`, `border-white/15`, `bg-white/5`). This class of bug has shipped twice (pre-#120, and `/login` + `/give` in 2026-11); new dark surfaces must derive from `.dark` tokens.
- Don't color confirm dialogs ad hoc; the amber/brown/green hex sprinkles (`#D97706`, `#51443A`, …) were removed — intent expresses through `var(--destructive)` or the default brand button.
- Don't add glass/blur, gradient text, or colored zero-offset halos.
- Don't invent category-default light/dark: theme from the scene this surface is used in, and keep the switch through `ThemeContext`.
