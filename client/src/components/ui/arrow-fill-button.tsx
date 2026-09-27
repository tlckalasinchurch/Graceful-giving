import type { ButtonHTMLAttributes, CSSProperties } from "react";

import { cn } from "@/lib/utils";
import "./arrow-fill-button.css";

/**
 * Adapted from ObsidianUI (MIT) — free component `arrow-fill-button`.
 * Ported from JSX to TSX + defaults re-themed to Graceful-giving clay palette:
 * primary #C94F16 base, clay-dark #171311 fill.
 *
 * Always renders a native <button> (no polymorphic `as`/`asChild`): the
 * animated fill needs two internal siblings (label span + circle overlay)
 * that this component owns, so it can't compose `./button.tsx` via Slot the
 * way a single-child wrapper would — Slot clones props onto exactly one
 * child, which this markup doesn't have. Add a real `asChild` only if a
 * link variant of this exact effect is actually needed.
 */
type ArrowFillButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  bgColor?: string;
  textColor?: string;
  fillBgColor?: string;
  fillTextColor?: string;
  hoverFillBgColor?: string;
  hoverFillTextColor?: string;
  arrowColor?: string;
  hoverArrowColor?: string;
};

export function ArrowFillButton({
  children = "Explore components",
  className = "",
  bgColor = "#C94F16",
  // #171311 on #C94F16 is ~6.3:1 — white was ~2.3:1, failing WCAG AA (4.5:1).
  textColor = "#171311",
  fillBgColor = "#171311",
  fillTextColor = "#FAF8F5",
  hoverFillBgColor = "#171311",
  hoverFillTextColor = "#FAF8F5",
  arrowColor,
  hoverArrowColor,
  type = "button",
  style,
  ...props
}: ArrowFillButtonProps) {
  return (
    <button
      type={type}
      data-slot="button"
      {...props}
      className={cn("obsidian-arrow-fill-btn", className)}
      style={
        {
          "--btn-bg": bgColor,
          "--btn-text": textColor,
          "--btn-fill-bg": fillBgColor,
          "--btn-fill-text": fillTextColor,
          "--btn-fill-bg-hover": hoverFillBgColor,
          "--btn-fill-text-hover": hoverFillTextColor,
          "--btn-arrow": arrowColor || fillTextColor,
          "--btn-arrow-hover": hoverArrowColor || hoverFillTextColor,
          ...style,
        } as CSSProperties
      }
    >
      <span className="obsidian-arrow-fill-btn__text">{children}</span>

      <div aria-hidden="true" className="obsidian-arrow-fill-btn__circle">
        <span>{children}</span>

        <div className="obsidian-arrow-fill-btn__circle-text">
          <svg
            viewBox="0 0 10 10"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
            className="obsidian-arrow-fill-btn__icon"
          >
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M3.82475e-07 5.625L7.625 5.625L4.125 9.125L5 10L10 5L5 -4.37114e-07L4.125 0.874999L7.625 4.375L4.91753e-07 4.375L3.82475e-07 5.625Z"
              className="obsidian-arrow-fill-btn__path"
            />
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M3.82475e-07 5.625L7.625 5.625L4.125 9.125L5 10L10 5L5 -4.37114e-07L4.125 0.874999L7.625 4.375L4.91753e-07 4.375L3.82475e-07 5.625Z"
              className="obsidian-arrow-fill-btn__path"
            />
          </svg>
        </div>
      </div>
    </button>
  );
}

export default ArrowFillButton;
