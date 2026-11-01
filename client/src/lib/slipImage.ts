import { MAX_SLIP_IMAGE_BYTES } from "@shared/givingLimits";

/** Image types the server accepts for a slip. */
export const SLIP_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

/** Largest file we try to shrink. Bigger files are refused without decoding. */
export const MAX_SLIP_SOURCE_BYTES = 25 * 1024 * 1024;

/** Longest side, in pixels, of a shrunk slip. A slip stays readable at this size. */
const MAX_SIDE = 2000;
const JPEG_QUALITY = 0.85;

/** Scales (w, h) down so the longer side is at most `maxSide`. Never scales up. */
export function fitWithin(
  width: number,
  height: number,
  maxSide: number
): { width: number; height: number } {
  const longest = Math.max(width, height);
  if (longest <= maxSide) return { width, height };
  const scale = maxSide / longest;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

export class SlipFileError extends Error {}

function readAsDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () =>
      reject(new SlipFileError("อ่านไฟล์รูปสลิปไม่สำเร็จ"));
    reader.readAsDataURL(blob);
  });
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new SlipFileError("เปิดรูปสลิปไม่ได้ กรุณาเลือกไฟล์รูปอื่น"));
    };
    img.src = url;
  });
}

/**
 * Turns a picked file into a data URL the server will accept. A file already
 * under the server limit is sent as is. A larger phone photo is shrunk to
 * JPEG, so the donor does not have to take a screenshot instead.
 */
export async function prepareSlipImage(file: File): Promise<string> {
  if (!SLIP_IMAGE_TYPES.includes(file.type)) {
    throw new SlipFileError("รองรับเฉพาะรูปสลิปแบบ JPEG, PNG หรือ WebP");
  }
  if (file.size <= MAX_SLIP_IMAGE_BYTES) return readAsDataUrl(file);
  if (file.size > MAX_SLIP_SOURCE_BYTES) {
    throw new SlipFileError(
      `ไฟล์ใหญ่เกินไป (สูงสุด ${MAX_SLIP_SOURCE_BYTES / 1024 / 1024} MB)`
    );
  }

  const img = await loadImage(file);
  const { width, height } = fitWithin(
    img.naturalWidth,
    img.naturalHeight,
    MAX_SIDE
  );
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new SlipFileError("ย่อรูปสลิปไม่สำเร็จ");
  // A white base keeps a transparent PNG from turning black as JPEG.
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(img, 0, 0, width, height);

  const blob = await new Promise<Blob | null>(resolve =>
    canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY)
  );
  if (!blob || blob.size > MAX_SLIP_IMAGE_BYTES) {
    throw new SlipFileError(
      "ย่อรูปสลิปแล้วยังใหญ่เกินไป กรุณาแคปหน้าจอสลิปแทน"
    );
  }
  return readAsDataUrl(blob);
}
