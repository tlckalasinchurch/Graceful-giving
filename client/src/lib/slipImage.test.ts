import { describe, expect, it } from "vitest";
import {
  fitWithin,
  isSupportedImageFile,
  prepareSlipImage,
  SlipFileError,
  MAX_SLIP_SOURCE_BYTES,
  TARGET_MAX_SIDE,
} from "./slipImage";

describe("fitWithin", () => {
  it("keeps a small image as is", () => {
    expect(fitWithin(800, 600, TARGET_MAX_SIDE)).toEqual({
      width: 800,
      height: 600,
    });
  });

  it("scales the longer side down and keeps the ratio", () => {
    expect(fitWithin(3200, 2400, TARGET_MAX_SIDE)).toEqual({
      width: 1600,
      height: 1200,
    });
    expect(fitWithin(2400, 4800, TARGET_MAX_SIDE)).toEqual({
      width: 800,
      height: 1600,
    });
  });

  it("never returns a zero side", () => {
    expect(fitWithin(100000, 1, TARGET_MAX_SIDE).height).toBe(1);
    expect(fitWithin(0, 0, TARGET_MAX_SIDE)).toEqual({ width: 1, height: 1 });
  });
});

describe("isSupportedImageFile", () => {
  it("identifies supported standard MIME types", () => {
    expect(
      isSupportedImageFile(new File([], "slip.jpg", { type: "image/jpeg" }))
    ).toBe(true);
    expect(
      isSupportedImageFile(new File([], "slip.png", { type: "image/png" }))
    ).toBe(true);
    expect(
      isSupportedImageFile(new File([], "slip.webp", { type: "image/webp" }))
    ).toBe(true);
  });

  it("identifies mobile camera and HEIC files", () => {
    expect(
      isSupportedImageFile(new File([], "photo.heic", { type: "image/heic" }))
    ).toBe(true);
    expect(
      isSupportedImageFile(new File([], "IMG_9999.HEIC", { type: "" }))
    ).toBe(true);
    expect(
      isSupportedImageFile(new File([], "camera_capture.jpg", { type: "" }))
    ).toBe(true);
  });

  it("rejects non-image files such as PDF, SVG, and text", () => {
    expect(
      isSupportedImageFile(new File([], "doc.pdf", { type: "application/pdf" }))
    ).toBe(false);
    expect(
      isSupportedImageFile(
        new File([], "vector.svg", { type: "image/svg+xml" })
      )
    ).toBe(false);
    expect(
      isSupportedImageFile(new File([], "notes.txt", { type: "text/plain" }))
    ).toBe(false);
  });
});

describe("prepareSlipImage", () => {
  it("refuses a type the server does not accept", async () => {
    const svg = new File(["<svg/>"], "a.svg", { type: "image/svg+xml" });
    await expect(prepareSlipImage(svg)).rejects.toBeInstanceOf(SlipFileError);
    const pdf = new File(["%PDF"], "slip.pdf", { type: "application/pdf" });
    await expect(prepareSlipImage(pdf)).rejects.toBeInstanceOf(SlipFileError);
  });

  it("refuses oversized source files (> 25 MB)", async () => {
    const huge = new File(["x"], "huge.jpg", { type: "image/jpeg" });
    Object.defineProperty(huge, "size", {
      value: MAX_SLIP_SOURCE_BYTES + 1024,
    });
    await expect(prepareSlipImage(huge)).rejects.toThrow(
      "ไฟล์รูปภาพมีขนาดใหญ่เกินไป"
    );
  });

  it("passes a small image through unchanged as data URL", async () => {
    const png = new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], "a.png", {
      type: "image/png",
    });
    const url = await prepareSlipImage(png);
    expect(url.startsWith("data:image/png;base64,")).toBe(true);
  });
});
