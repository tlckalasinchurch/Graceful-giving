import { describe, expect, it } from "vitest";
import { fitWithin, prepareSlipImage, SlipFileError } from "./slipImage";

describe("fitWithin", () => {
  it("keeps a small image as is", () => {
    expect(fitWithin(800, 600, 2000)).toEqual({ width: 800, height: 600 });
  });

  it("scales the longer side down and keeps the ratio", () => {
    expect(fitWithin(4000, 3000, 2000)).toEqual({ width: 2000, height: 1500 });
    expect(fitWithin(3000, 6000, 2000)).toEqual({ width: 1000, height: 2000 });
  });

  it("never returns a zero side", () => {
    expect(fitWithin(100000, 1, 2000).height).toBe(1);
  });
});

describe("prepareSlipImage", () => {
  it("refuses a type the server does not accept", async () => {
    const svg = new File(["<svg/>"], "a.svg", { type: "image/svg+xml" });
    await expect(prepareSlipImage(svg)).rejects.toBeInstanceOf(SlipFileError);
  });

  it("passes a small image through unchanged", async () => {
    const png = new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], "a.png", {
      type: "image/png",
    });
    const url = await prepareSlipImage(png);
    expect(url.startsWith("data:image/png;base64,")).toBe(true);
  });
});
