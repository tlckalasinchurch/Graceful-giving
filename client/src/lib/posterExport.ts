import { toCanvas, toJpeg, toPng } from "html-to-image";

export type PosterPaper = "A4" | "A5";
export type PosterImageType = "png" | "jpeg";

/** Page size in millimetres, portrait. */
const PAPER_MM: Record<PosterPaper, { width: number; height: number }> = {
  A4: { width: 210, height: 297 },
  A5: { width: 148, height: 210 },
};

/** White margin kept around the poster on paper, in millimetres. */
const PRINT_MARGIN_MM = 6;

/** The file name for a saved poster, for example "grace-station-poster.png". */
export function posterFileName(type: PosterImageType): string {
  return `grace-station-poster.${type === "jpeg" ? "jpg" : "png"}`;
}

/**
 * The HTML written into the hidden print frame. The poster is one image on a
 * page of a fixed size, so it always prints on exactly one sheet and keeps its
 * colours. An image also avoids the browser dropping background colours.
 */
export function buildPosterPrintHtml(
  imageUrl: string,
  paper: PosterPaper
): string {
  const { width, height } = PAPER_MM[paper];
  const boxWidth = width - PRINT_MARGIN_MM * 2;
  const boxHeight = height - PRINT_MARGIN_MM * 2;
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>Poster ${paper}</title>
<style>
  @page { size: ${paper} portrait; margin: 0; }
  html, body { margin: 0; padding: 0; background: #fff; }
  body {
    width: ${width}mm;
    height: ${height}mm;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  img {
    max-width: ${boxWidth}mm;
    max-height: ${boxHeight}mm;
    object-fit: contain;
    display: block;
  }
</style>
</head>
<body><img src="${imageUrl}" alt="" /></body>
</html>`;
}

const IMAGE_OPTIONS = {
  pixelRatio: 3,
  cacheBust: true,
  backgroundColor: "#ffffff",
} as const;

/** Draws the poster element into an image and returns it as a data URL. */
export async function renderPosterImage(
  node: HTMLElement,
  type: PosterImageType
): Promise<string> {
  return type === "jpeg"
    ? toJpeg(node, { ...IMAGE_OPTIONS, quality: 0.95 })
    : toPng(node, IMAGE_OPTIONS);
}

/** Draws the poster into an image file. A Blob is more reliable to save than a data URL. */
export async function renderPosterBlob(
  node: HTMLElement,
  type: PosterImageType
): Promise<Blob> {
  const canvas = await toCanvas(node, IMAGE_OPTIONS);
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      blob =>
        blob ? resolve(blob) : reject(new Error("สร้างไฟล์รูปไม่สำเร็จ")),
      type === "jpeg" ? "image/jpeg" : "image/png",
      0.95
    );
  });
}

/** Starts a file download from a Blob URL. The caller owns the URL and revokes it. */
export function downloadObjectUrl(objectUrl: string, fileName: string): void {
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = fileName;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  link.remove();
}

/** True when this browser can hand the image to the share sheet (most phones). */
export function canShareImage(blob: Blob, fileName: string): boolean {
  if (typeof navigator === "undefined" || !navigator.canShare) return false;
  try {
    return navigator.canShare({
      files: [new File([blob], fileName, { type: blob.type })],
    });
  } catch {
    return false;
  }
}

export async function shareImage(blob: Blob, fileName: string): Promise<void> {
  await navigator.share({
    files: [new File([blob], fileName, { type: blob.type })],
  });
}

export function downloadDataUrl(dataUrl: string, fileName: string): void {
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
}

/** Prints the image on one page of the chosen paper size, through a hidden frame. */
export function printPosterImage(
  imageUrl: string,
  paper: PosterPaper
): Promise<void> {
  return new Promise((resolve, reject) => {
    const frame = document.createElement("iframe");
    frame.setAttribute("aria-hidden", "true");
    frame.style.cssText =
      "position:fixed;right:0;bottom:0;width:0;height:0;border:0;";
    const cleanup = () => window.setTimeout(() => frame.remove(), 1000);

    frame.onload = () => {
      const win = frame.contentWindow;
      const img = frame.contentDocument?.querySelector("img");
      if (!win || !img) {
        cleanup();
        reject(new Error("เปิดหน้าต่างพิมพ์ไม่ได้"));
        return;
      }
      const run = () => {
        try {
          win.focus();
          win.print();
          resolve();
        } catch (err) {
          reject(err instanceof Error ? err : new Error("พิมพ์ไม่สำเร็จ"));
        } finally {
          cleanup();
        }
      };
      if (img.complete) run();
      else {
        img.onload = run;
        img.onerror = () => {
          cleanup();
          reject(new Error("โหลดรูปโปสเตอร์ไม่สำเร็จ"));
        };
      }
    };

    frame.srcdoc = buildPosterPrintHtml(imageUrl, paper);
    document.body.appendChild(frame);
  });
}
