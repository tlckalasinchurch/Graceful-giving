// @vitest-environment node
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

// Guards the dark theme against contrast regressions that type checks and
// logic tests cannot see. Tokens are read from index.css, not copied here.
const css = readFileSync(resolve(__dirname, "index.css"), "utf8");

function token(name: string): string {
  const match = css.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})\\s*;`));
  if (!match) throw new Error(`Token --${name} not found in index.css`);
  return match[1];
}

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map(i => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

describe("dark theme contrast", () => {
  it("keeps text on the orange brand at WCAG AA (4.5:1)", () => {
    expect(contrast(token("primary-foreground"), token("primary"))).toBeGreaterThanOrEqual(4.5);
    expect(contrast("#000000", token("color-brand"))).toBeGreaterThanOrEqual(4.5);
    expect(contrast("#000000", token("color-brand-ink"))).toBeGreaterThanOrEqual(4.5);
  });

  it("keeps body and muted text readable on the card surface", () => {
    expect(contrast(token("color-ink"), token("color-surface"))).toBeGreaterThanOrEqual(7);
    expect(contrast(token("color-ink-3"), token("color-surface"))).toBeGreaterThanOrEqual(4.5);
  });

  it("keeps form control borders visible (WCAG 1.4.11, 3:1)", () => {
    expect(contrast(token("input"), token("color-surface"))).toBeGreaterThanOrEqual(3);
    expect(contrast(token("color-field"), token("color-surface"))).toBeGreaterThanOrEqual(3);
  });
});
