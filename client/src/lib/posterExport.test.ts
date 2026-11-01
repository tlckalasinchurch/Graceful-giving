import { describe, expect, it } from "vitest";
import { buildPosterPrintHtml, posterFileName } from "./posterExport";

describe("posterExport", () => {
  it("names saved files by type", () => {
    expect(posterFileName("png")).toBe("grace-station-poster.png");
    expect(posterFileName("jpeg")).toBe("grace-station-poster.jpg");
  });

  it("prints on one A5 page with no browser margin", () => {
    const html = buildPosterPrintHtml("data:image/png;base64,AAA", "A5");
    expect(html).toContain("size: A5 portrait");
    expect(html).toContain("margin: 0");
    expect(html).toContain("width: 148mm");
    expect(html).toContain("height: 210mm");
    expect(html).toContain("max-width: 136mm");
    expect(html).toContain("max-height: 198mm");
    expect(html).toContain('src="data:image/png;base64,AAA"');
  });

  it("prints on one A4 page", () => {
    const html = buildPosterPrintHtml("data:image/png;base64,AAA", "A4");
    expect(html).toContain("size: A4 portrait");
    expect(html).toContain("width: 210mm");
    expect(html).toContain("max-height: 285mm");
  });
});
