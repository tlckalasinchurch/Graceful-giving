import { MAX_SLIP_IMAGE_BYTES } from "@shared/givingLimits";

/** Image MIME types and extensions supported for bank slips and evidence. */
export const SLIP_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
  "image/jpg",
  "image/pjpeg",
];

/** Largest source file we accept from mobile cameras or gallery before resizing. */
export const MAX_SLIP_SOURCE_BYTES = 25 * 1024 * 1024; // 25 MB

/** Small files under this limit that already have a standard format can pass through directly. */
export const MAX_DIRECT_PASSTHROUGH_BYTES = 500 * 1024; // 500 KB

/** Target maximum side in pixels. 1600px preserves 100% of fine Thai text, account numbers, and QR codes. */
export const TARGET_MAX_SIDE = 1600;
export const FALLBACK_MAX_SIDE = 1200;

/** Target maximum size for the compressed image blob (under 1 MB ensures base64 fits well within Vercel's 4.5 MB limit). */
export const TARGET_MAX_BLOB_BYTES = 1024 * 1024; // 1 MB

export class SlipFileError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SlipFileError";
  }
}

/** Scales (w, h) down so the longer side is at most `maxSide`. Never scales up. */
export function fitWithin(
  width: number,
  height: number,
  maxSide: number
): { width: number; height: number } {
  if (width <= 0 || height <= 0) {
    return { width: Math.max(1, width), height: Math.max(1, height) };
  }
  const longest = Math.max(width, height);
  if (longest <= maxSide) return { width, height };
  const scale = maxSide / longest;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

/** Determines if a file is an image by MIME type or file extension. */
export function isSupportedImageFile(file: File): boolean {
  if (!file) return false;
  const mime = (file.type || "").toLowerCase().trim();
  if (mime && (SLIP_IMAGE_TYPES.includes(mime) || mime.startsWith("image/"))) {
    // Exclude SVG and vector images
    if (mime.includes("svg") || mime.includes("xml")) return false;
    return true;
  }
  const name = (file.name || "").toLowerCase().trim();
  return /\.(jpe?g|png|webp|heic|heif)$/i.test(name);
}

function readAsDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () =>
      reject(
        new SlipFileError("อ่านไฟล์รูปสลิปไม่สำเร็จ กรุณาลองใหม่อีกครั้ง")
      );
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
      reject(
        new SlipFileError(
          "เปิดไฟล์รูปภาพไม่ได้ กรุณาถ่ายใหม่หรือเลือกรูปสลิปอื่น"
        )
      );
    };
    img.src = url;
  });
}

async function canvasToBlob(
  canvas: HTMLCanvasElement,
  quality: number
): Promise<Blob | null> {
  return new Promise(resolve => canvas.toBlob(resolve, "image/jpeg", quality));
}

/**
 * Compresses an image through an off-screen canvas with progressive downscaling.
 * - Always draws onto a pure white base to eliminate transparent PNG black-fill artifacts.
 * - Employs bicubic image smoothing to preserve sharpness of account digits and OCR QR codes.
 * - Progressive compression ensures the resulting base64 payload stays well under the 4.5 MB request ceiling.
 */
export async function compressImageToJpeg(
  img: HTMLImageElement,
  maxSide: number = TARGET_MAX_SIDE,
  quality: number = 0.82
): Promise<Blob> {
  const { width, height } = fitWithin(
    img.naturalWidth || img.width,
    img.naturalHeight || img.height,
    maxSide
  );

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new SlipFileError("การประมวลผลรูปภาพล้มเหลว กรุณาลองใหม่อีกครั้ง");
  }

  // Smooth scaling settings
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  // White base for transparent backgrounds
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(img, 0, 0, width, height);

  let blob = await canvasToBlob(canvas, quality);

  // If initial compression exceeds target, retry with lower quality
  if (blob && blob.size > TARGET_MAX_BLOB_BYTES) {
    blob = await canvasToBlob(canvas, 0.72);
  }

  // If still too large, downscale dimension to fallback size and compress
  if (
    blob &&
    blob.size > TARGET_MAX_BLOB_BYTES &&
    maxSide > FALLBACK_MAX_SIDE
  ) {
    const smaller = fitWithin(
      img.naturalWidth || img.width,
      img.naturalHeight || img.height,
      FALLBACK_MAX_SIDE
    );
    canvas.width = smaller.width;
    canvas.height = smaller.height;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, smaller.width, smaller.height);
    ctx.drawImage(img, 0, 0, smaller.width, smaller.height);
    blob = await canvasToBlob(canvas, 0.68);
  }

  if (!blob || blob.size > MAX_SLIP_IMAGE_BYTES) {
    throw new SlipFileError(
      "ขนาดรูปสลิปยังใหญ่เกินไปหลังการย่อ กรุณาแคปหน้าจอรูปสลิปแล้วแนบใหม่อีกครั้ง"
    );
  }

  return blob;
}

/**
 * Validates, resizes, and optimizes a donor transfer slip before uploading.
 * - Checks file type against supported image formats.
 * - Enforces maximum source file size limit (25 MB).
 * - Passes small files already under 500 KB directly.
 * - Progressively downscales and compresses larger camera/gallery photos to crystal-clear JPEG under 1 MB.
 */
export async function prepareSlipImage(file: File): Promise<string> {
  if (!isSupportedImageFile(file)) {
    throw new SlipFileError("รองรับเฉพาะไฟล์รูปภาพ (JPEG, PNG, WebP) เท่านั้น");
  }

  if (file.size > MAX_SLIP_SOURCE_BYTES) {
    throw new SlipFileError(
      `ไฟล์รูปภาพมีขนาดใหญ่เกินไป (ขนาดสูงสุด ${MAX_SLIP_SOURCE_BYTES / (1024 * 1024)} MB)`
    );
  }

  // Direct passthrough for small already-formatted images
  if (
    file.size <= MAX_DIRECT_PASSTHROUGH_BYTES &&
    ["image/jpeg", "image/png", "image/webp"].includes(file.type.toLowerCase())
  ) {
    return readAsDataUrl(file);
  }

  // Load and compress
  const img = await loadImage(file);
  const compressedBlob = await compressImageToJpeg(img);
  return readAsDataUrl(compressedBlob);
}
