import { describe, expect, it } from "vitest";
import { decodeSlipImage, SlipImageError } from "./slipImage";
import { MAX_SLIP_IMAGE_BYTES } from "../../shared/givingLimits";

const b64 = (bytes: number[], pad = 0) =>
  Buffer.concat([Buffer.from(bytes), Buffer.alloc(pad)]).toString("base64");

describe("decodeSlipImage", () => {
  it("accepts JPEG, PNG and WebP by their first bytes", () => {
    expect(decodeSlipImage(b64([0xff, 0xd8, 0xff, 0xe0])).extension).toBe(
      "jpg"
    );
    expect(
      decodeSlipImage(b64([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
        .contentType
    ).toBe("image/png");
    const webp = Buffer.concat([
      Buffer.from("RIFF"),
      Buffer.alloc(4),
      Buffer.from("WEBP"),
    ]).toString("base64");
    expect(decodeSlipImage(`data:image/webp;base64,${webp}`).extension).toBe(
      "webp"
    );
  });

  it("ignores the MIME type the client claims", () => {
    const html = Buffer.from("<html><script>1</script></html>").toString(
      "base64"
    );
    expect(() => decodeSlipImage(`data:image/png;base64,${html}`)).toThrow(
      SlipImageError
    );
  });

  it("refuses SVG, empty and malformed input", () => {
    const svg = Buffer.from("<svg/>").toString("base64");
    expect(() => decodeSlipImage(`data:image/svg+xml;base64,${svg}`)).toThrow(
      SlipImageError
    );
    expect(() => decodeSlipImage("")).toThrow(SlipImageError);
    expect(() => decodeSlipImage("not base64 !!")).toThrow(SlipImageError);
  });

  it("refuses an image over the size limit", () => {
    const big = b64([0xff, 0xd8, 0xff], MAX_SLIP_IMAGE_BYTES);
    expect(() => decodeSlipImage(big)).toThrow(/ไม่เกิน/);
  });
});
