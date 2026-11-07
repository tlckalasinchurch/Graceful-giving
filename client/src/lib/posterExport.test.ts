import { describe, expect, it, vi } from "vitest";
import {
  buildPosterPrintHtml,
  posterFileName,
  renderPosterExport,
} from "./posterExport";

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

  it("renders the station poster onto a 2D canvas and returns both blob and dataUrl", async () => {
    const fakeCtx = {
      fillStyle: "",
      strokeStyle: "",
      lineWidth: 1,
      lineJoin: "round",
      font: "",
      textAlign: "left",
      textBaseline: "alphabetic",
      imageSmoothingEnabled: true,
      fillRect: vi.fn(),
      strokeRect: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      bezierCurveTo: vi.fn(),
      quadraticCurveTo: vi.fn(),
      arcTo: vi.fn(),
      arc: vi.fn(),
      closePath: vi.fn(),
      fill: vi.fn(),
      stroke: vi.fn(),
      clip: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      translate: vi.fn(),
      scale: vi.fn(),
      fillText: vi.fn(),
      measureText: vi.fn((text: string) => ({ width: text.length * 12 })),
      drawImage: vi.fn(),
      createLinearGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
    };

    const getContextSpy = vi
      .spyOn(HTMLCanvasElement.prototype, "getContext")
      .mockReturnValue(fakeCtx as unknown as CanvasRenderingContext2D);
    const toDataURLSpy = vi
      .spyOn(HTMLCanvasElement.prototype, "toDataURL")
      .mockReturnValue(
        "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
      );
    const toBlobSpy = vi
      .spyOn(HTMLCanvasElement.prototype, "toBlob")
      .mockImplementation(cb => {
        cb(new Blob(["png-bytes"], { type: "image/png" }));
      });

    const container = document.createElement("div");
    const poster = document.createElement("div");
    poster.setAttribute("data-station-poster", "true");
    poster.setAttribute("data-brand-prefix", "Grace");
    poster.setAttribute("data-brand-highlight", "Box");
    poster.setAttribute("data-headline-white", "จุดถวายทรัพย์");
    poster.setAttribute("data-headline-orange", "อัตโนมัติ");
    container.appendChild(poster);

    const result = await renderPosterExport(container, "png");
    expect(result.dataUrl).toMatch(/^data:image\/png;base64,/);
    expect(result.blob.type).toBe("image/png");
    expect(fakeCtx.fillText).toHaveBeenCalled();

    getContextSpy.mockRestore();
    toDataURLSpy.mockRestore();
    toBlobSpy.mockRestore();
  });
});

describe("canShareImage", () => {
  it("is false where the browser has no share sheet for files", async () => {
    const { canShareImage } = await import("./posterExport");
    expect(canShareImage(new Blob(["x"], { type: "image/png" }), "a.png")).toBe(
      false
    );
  });
});
