import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const SRC = __dirname;
function files(dir: string): string[] {
  return readdirSync(dir).flatMap(n => {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) return files(p);
    return /\.tsx?$/.test(n) && !/\.test\./.test(n) ? [p] : [];
  });
}
const sources = files(join(SRC, "pages")).map(f => ({
  file: relative(SRC, f),
  text: readFileSync(f, "utf8"),
}));

describe("error messages", () => {
  it("no page shows one fixed 'database failed' text for every error", () => {
    const hits = sources
      .filter(s => s.text.includes("เชื่อมต่อฐานข้อมูลไม่สำเร็จ"))
      .map(s => s.file);
    expect(hits).toEqual([]);
  });

  it("no page toasts a raw backend message; use friendlyErrorMessage", () => {
    const hits = sources
      .filter(s => /toast\.error\(\s*(err|error)\.message/.test(s.text))
      .map(s => s.file);
    expect(hits).toEqual([]);
  });
});
