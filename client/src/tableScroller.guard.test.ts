import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const SRC = __dirname;
function files(dir: string): string[] {
  return readdirSync(dir).flatMap(n => {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) return files(p);
    return /\.tsx$/.test(n) && !/\.test\./.test(n) ? [p] : [];
  });
}

/**
 * Visually hidden text (sr-only) is positioned absolutely. Inside a scroller
 * with no positioned ancestor it escapes the scroller, sits at the far end of
 * the table, and makes the whole page scroll sideways at tablet widths.
 */
describe("table scrollers", () => {
  it("every overflow-x-auto wrapper around a table is a positioned box", () => {
    const bad: string[] = [];
    for (const f of files(SRC)) {
      const src = readFileSync(f, "utf8");
      const re = /className="([^"]*\boverflow-x-auto\b[^"]*)">\s*<table\b/g;
      let m: RegExpExecArray | null;
      while ((m = re.exec(src))) {
        if (!/\brelative\b/.test(m[1])) bad.push(relative(SRC, f));
      }
    }
    expect(bad).toEqual([]);
  });
});
