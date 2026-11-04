# Grace Giving Premium Design System

## Direction

Grace Giving uses a warm, editorial financial interface: calm stone light surfaces, dark ink navigation, restrained emerald actions, flat tonal elevation, strong numerical hierarchy, and readable Thai typography. Premium quality comes from composition, rhythm, contrast, and interaction clarity—not from decoration.

The existing `client/src/index.css` remains the single source of truth for semantic tokens. New UI must use semantic classes and existing components rather than introducing one-off hex values.

## Principles

Financial accuracy comes before visual polish. The interface should make the next safe action obvious, show status in words as well as color, and preserve the context needed to review money. Use progressive disclosure: overview first, actions second, follow-up work third. Every surface should have a clear reason to exist.

## Tokens

The current semantic system is authoritative:

| Role | Token | Current intent |
|---|---|---|
| Page canvas | `bg-ground` / `--background` | Warm stone light, deep ink dark |
| Primary surface | `bg-surface` / `--card` | White light, obsidian dark |
| Secondary surface | `bg-paper` / `--secondary` | Quiet grouping surface |
| Elevated tonal surface | `bg-paper-2` / `--accent` | Filters, secondary emphasis |
| Primary text | `text-ink` / `--foreground` | High-contrast reading text |
| Secondary text | `text-ink-2` / `--muted-foreground` | Supporting context |
| Muted text | `text-ink-3` | Metadata and secondary labels |
| Border | `border-line` / `--border` | Hairline separation |
| Primary action | `bg-brand` / `--primary` | Emerald action with dark text |
| Positive finance | `text-income` | Income and positive balance semantics |
| Destructive | `text-danger` / `--destructive` | Safe, explicit danger state |

Do not copy color literals into new components. If a missing semantic role is required, add it to `index.css` and cover both light and dark themes.

## Typography

Use the existing stack: Plus Jakarta Sans and Manrope for Latin and numerals, with IBM Plex Sans Thai for Thai text. Use `.display` for strong page headings and `.money` for currency values. Keep body text at the established readable scale and avoid shrinking Thai labels to fit dense layouts.

Financial values should use tabular numerals, explicit currency context, and consistent sign treatment. Do not make a number appear more authoritative than its source status supports.

## Layout and spacing

Use `min-h-dvh`, safe-area-aware mobile clearance, and the existing content max width. Prefer a small number of purposeful regions over many nested cards. Use responsive grids only when the content relationships remain understandable at narrow widths.

Recommended dashboard sequence:

1. Page context and primary financial anchor.
2. Role-specific attention queue.
3. Period summary and financial movement.
4. Primary record actions.
5. Funds, budgets, and recent activity.

## Surfaces and depth

Elevation is tonal. Use page canvas → paper → surface rather than heavy shadows. Cards use the existing 16–20px radius family and a 1px semantic border. Avoid blur, glow, decorative gradients, and unbounded shadow. A premium surface should remain quiet enough that amounts and statuses remain the focus.

## Actions

Use one dominant primary action per context. Buttons require a minimum 44px interactive height, visible keyboard focus, clear Thai labels, and disabled/loading states. Destructive actions must be explicit and use the shared confirmation flow. Do not hide consequential finance actions behind icon-only controls.

## Data presentation

Use tables on wide screens only when column relationships are useful. On mobile, use prioritized cards or lists while retaining detail links, status text, amounts, and dates. Never rely on color alone for income, expense, pending, approved, or rejected states.

Charts must use real repository-backed values. If a value is unavailable, use a loading, empty, error, or unavailable state rather than a placeholder number.

## States

Every data surface should have considered loading, empty, error, permission-denied, and success states. Error copy should identify the problem and provide the next safe recovery action. Loading states must preserve approximate layout to reduce shift. Empty states should explain what the user can do next without implying that no data exists globally.

## Accessibility

Preserve native links for navigation, semantic table headers and captions, visible focus rings, keyboard operation, meaningful accessible names, and `aria-invalid`/described-by relationships for validation. Keep status meaning in text. Test reduced motion, narrow widths, and 400% zoom where possible.

## Theme rules

Dark mode is a first-class counterpart, not an inversion afterthought. Every new surface and token must be legible in both themes. Avoid light-only utilities on dark surfaces and dark-only utilities on light surfaces. Run the existing theme contrast test after token changes.

## Dashboard reference standard

The Dashboard should feel like a calm financial control center. Its first viewport should answer: what is the church's current financial position, what changed in the current period, and what needs attention from this user? It should not feel like a collection of colorful KPI tiles. Use editorial spacing, restrained accents, and clear provenance language.
