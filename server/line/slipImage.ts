import { MAX_SLIP_IMAGE_BYTES } from "../../shared/givingLimits";

export type SlipImageType = {
  contentType: "image/jpeg" | "image/png" | "image/webp";
  extension: "jpg" | "png" | "webp";
};

export class SlipImageError extends Error {}

/** Identifies the image by its first bytes. The client's MIME type is not trusted. */
function sniff(buf: Buffer): SlipImageType | null {
  if (
    buf.length >= 3 &&
    buf[0] === 0xff &&
    buf[1] === 0xd8 &&
    buf[2] === 0xff
  ) {
    return { contentType: "image/jpeg", extension: "jpg" };
  }
  if (
    buf.length >= 8 &&
    buf
      .subarray(0, 8)
      .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  ) {
    return { contentType: "image/png", extension: "png" };
  }
  if (
    buf.length >= 12 &&
    buf.toString("ascii", 0, 4) === "RIFF" &&
    buf.toString("ascii", 8, 12) === "WEBP"
  ) {
    return { contentType: "image/webp", extension: "webp" };
  }
  return null;
}

/**
 * Decodes a base64 string or data URL into a slip image. Accepts JPEG, PNG and
 * WebP up to MAX_SLIP_IMAGE_BYTES; anything else (SVG, HTML, PDF) is refused.
 */
export function decodeSlipImage(
  input: string
): { buffer: Buffer } & SlipImageType {
  const raw = input.replace(/^data:[^;,]*;base64,/, "").trim();
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(raw)) {
    throw new SlipImageError("ข้อมูลรูปสลิปไม่ถูกต้อง");
  }
  const buffer = Buffer.from(raw, "base64");
  if (buffer.length === 0) {
    throw new SlipImageError("ข้อมูลรูปสลิปไม่ถูกต้อง");
  }
  if (buffer.length > MAX_SLIP_IMAGE_BYTES) {
    throw new SlipImageError(
      `รูปสลิปต้องมีขนาดไม่เกิน ${(MAX_SLIP_IMAGE_BYTES / 1024 / 1024).toFixed(1)} MB`
    );
  }
  const type = sniff(buffer);
  if (!type) {
    throw new SlipImageError("รองรับเฉพาะรูปสลิปแบบ JPEG, PNG หรือ WebP");
  }
  return { buffer, ...type };
}
