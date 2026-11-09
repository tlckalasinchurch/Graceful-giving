import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TextField } from "./pages/ChurchSetup/components/SetupSteps";

const ROOT = join(__dirname);
const CONTROL =
  /<(input|select|textarea|NativeSelect|Input|Textarea|Checkbox|Switch)\b/;

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap(name => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    const skip =
      /\.test\.tsx?$/.test(name) ||
      name === "ComponentShowcase.tsx" ||
      path.includes(`${join("components", "ui")}`);
    return path.endsWith(".tsx") && !skip ? [path] : [];
  });
}

/** Labels with no htmlFor and no control inside them, per file. */
function unlinkedLabels(file: string): number {
  const src = readFileSync(file, "utf8");
  let count = 0;
  const labels = /<label\b([^>]*)>([\s\S]*?)<\/label>/g;
  let m: RegExpExecArray | null;
  while ((m = labels.exec(src))) {
    if (m[1].includes("htmlFor") || CONTROL.test(m[2])) continue;
    count += 1;
  }
  return count;
}

/**
 * `Field` wraps its children inside the label, which links them without
 * htmlFor. Do not add to this list to silence the test. Link the label with
 * htmlFor, name a button group with fieldset and legend, or use
 * aria-labelledby when a button shares the row.
 */
const GROUP_LABELS: Record<string, number> = {
  "pages/Updates/components/updatesUtils.tsx": 1,
};

describe("form labels", () => {
  it("every label is linked to its field, except the known group labels", () => {
    const found: Record<string, number> = {};
    for (const file of sourceFiles(ROOT)) {
      const n = unlinkedLabels(file);
      if (n) found[relative(ROOT, file)] = n;
    }
    expect(found).toEqual(GROUP_LABELS);
  });

  it("the setup wizard text field names its input", () => {
    render(<TextField label="ชื่อคริสตจักร" value="" onChange={() => {}} />);
    expect(screen.getByLabelText("ชื่อคริสตจักร").tagName).toBe("INPUT");
  });

  it("names each button group with a fieldset and a legend", () => {
    for (const file of ["pages/NewExpense.tsx", "pages/NewOffering.tsx"]) {
      const src = readFileSync(join(ROOT, file), "utf8");
      const fieldsets = (src.match(/<fieldset\b/g) ?? []).length;
      const legends = (src.match(/<legend\b/g) ?? []).length;
      expect(fieldsets).toBeGreaterThan(0);
      expect(legends).toBe(fieldsets);
    }
  });
});
