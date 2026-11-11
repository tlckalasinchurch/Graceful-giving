import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const SRC = __dirname;
function files(dir: string): string[] {
  return readdirSync(dir).flatMap(n => {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) return files(p);
    const skip = /\.test\./.test(n) || n === "ComponentShowcase.tsx";
    return /\.tsx$/.test(n) && !skip && !p.includes(join("components", "ui"))
      ? [p]
      : [];
  });
}

/**
 * A placeholder is not a name: it disappears when the person types and many
 * screen readers skip it. An input with a placeholder needs a label, an id
 * for one, an aria-label, or a label that wraps it.
 */
describe("text inputs", () => {
  it("every input with a placeholder has an accessible name", () => {
    const bad: string[] = [];
    for (const f of files(SRC)) {
      const src = readFileSync(f, "utf8");
      const re = /<input\b([^>]*?)\/?>/gs;
      let m: RegExpExecArray | null;
      while ((m = re.exec(src))) {
        const attrs = m[1];
        if (/type="(hidden|checkbox|radio|file)"/.test(attrs)) continue;
        if (!/placeholder/.test(attrs)) continue;
        if (/aria-label|aria-labelledby|\bid=/.test(attrs)) continue;
        // A label that wraps the input names it.
        const before = src.slice(Math.max(0, m.index - 400), m.index);
        if (before.lastIndexOf("<label") > before.lastIndexOf("</label>"))
          continue;
        bad.push(
          `${relative(SRC, f)}:${src.slice(0, m.index).split("\n").length}`
        );
      }
    }
    expect(bad).toEqual([]);
  });
});
