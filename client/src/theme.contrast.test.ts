// @vitest-environment node
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

// Guards the theme against contrast regressions that type checks and logic
// tests cannot see. Tokens are read from index.css, not copied here, and var()
// chains are resolved so a page cannot drift by re-declaring a colour.
const css = readFileSync(resolve(import.meta.dirname, "index.css"), "utf8");

type Vars = Record<string, string>;

/** Split the stylesheet into { selector: declarations }. */
function blocks(source: string): Array<{ selector: string; vars: Vars }> {
  const out: Array<{ selector: string; vars: Vars }> = [];
  const pattern = /([^{}]+)\{([^{}]*)\}/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(source))) {
    const vars: Vars = {};
    for (const decl of match[2].matchAll(/--([\w-]+):\s*([^;]+);/g)) {
      vars[decl[1]] = decl[2].trim();
    }
    if (Object.keys(vars).length) out.push({ selector: match[1].trim(), vars });
  }
  return out;
}

const all = blocks(css);

function pick(predicate: (selector: string) => boolean): Vars {
  return all
    .filter(block => predicate(block.selector))
    .reduce<Vars>((acc, block) => ({ ...acc, ...block.vars }), {});
}

const base: Vars = {
  ...pick(selector => selector.includes(":root")),
  ...pick(selector => selector.includes("@theme")),
};
const dark: Vars = { ...base, ...pick(selector => selector.includes(".dark")) };

/** Follow var(--a) -> var(--b) -> #hex until a literal shows up. */
function resolveVar(vars: Vars, name: string, depth = 0): string {
  const raw = vars[name];
  if (raw === undefined) throw new Error(`Token --${name} not found`);
  if (depth > 8) throw new Error(`Token --${name} is circular`);
  const ref = raw.match(/^var\(--([\w-]+)\)$/);
  return ref ? resolveVar(vars, ref[1], depth + 1) : raw;
}

function token(name: string, mode: "light" | "dark" = "light"): string {
  return resolveVar(mode === "dark" ? dark : base, name);
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

describe.each(["light", "dark"] as const)("%s theme contrast", mode => {
  it("keeps the primary action legible (WCAG AA 4.5:1)", () => {
    expect(
      contrast(token("primary-foreground", mode), token("primary", mode))
    ).toBeGreaterThanOrEqual(4.5);
  });

  it("keeps body and muted text readable on a card", () => {
    expect(
      contrast(token("ink", mode), token("surface", mode))
    ).toBeGreaterThanOrEqual(7);
    expect(
      contrast(token("ink-3", mode), token("surface", mode))
    ).toBeGreaterThanOrEqual(4.5);
    expect(
      contrast(token("ink-3", mode), token("ground", mode))
    ).toBeGreaterThanOrEqual(4.5);
  });

  it("keeps control borders visible (WCAG 1.4.11, 3:1)", () => {
    expect(
      contrast(token("field", mode), token("surface", mode))
    ).toBeGreaterThanOrEqual(3);
  });

  it("keeps the LINE sign-in button legible (WCAG AA 4.5:1)", () => {
    expect(
      contrast(token("line-brand-ink", mode), token("line-brand", mode))
    ).toBeGreaterThanOrEqual(4.5);
  });

  it("keeps danger readable on canvas and card", () => {
    expect(
      contrast(token("danger", mode), token("surface", mode))
    ).toBeGreaterThanOrEqual(4.5);
    expect(
      contrast(token("danger", mode), token("ground", mode))
    ).toBeGreaterThanOrEqual(4.5);
  });

  it("keeps coral highlight action text legible (WCAG AA 4.5:1)", () => {
    expect(
      contrast(token("coral-ink", mode), token("coral", mode))
    ).toBeGreaterThanOrEqual(4.5);
  });
});
