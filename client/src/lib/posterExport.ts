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

const FONT_DISPLAY = `"Plus Jakarta Sans", "Manrope", "IBM Plex Sans Thai", sans-serif`;
const FONT_SANS = `"Manrope", "IBM Plex Sans Thai", sans-serif`;

const COLORS = {
  ink: "#171A18",
  ink2: "#3A3F39",
  ink3: "#6B7069",
  brand: "#087F5B",
  lime: "#B8F34A",
  surface: "#FFFFFF",
  line: "#E2E5DC",
} as const;

function drawRoundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function fillAndStrokeRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  fill: string,
  stroke?: string,
  lineWidth = 4
) {
  drawRoundedRectPath(ctx, x, y, w, h, r);
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
  }
}

function drawTwoToneCenteredText(
  ctx: CanvasRenderingContext2D,
  leftText: string,
  rightText: string,
  centerX: number,
  y: number,
  font: string,
  leftColor: string,
  rightColor: string
) {
  ctx.font = font;
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "left";
  const w1 = ctx.measureText(leftText).width;
  const w2 = ctx.measureText(rightText).width;
  const startX = centerX - (w1 + w2) / 2;
  ctx.fillStyle = leftColor;
  ctx.fillText(leftText, startX, y);
  ctx.fillStyle = rightColor;
  ctx.fillText(rightText, startX + w1, y);
}

function wrapTextLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  if (!text) return [];
  if (ctx.measureText(text).width <= maxWidth) return [text];
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (ctx.measureText(candidate).width <= maxWidth) {
      current = candidate;
    } else {
      if (current) lines.push(current);
      // If a single Thai segment is wider than maxWidth, slice by character
      if (ctx.measureText(word).width > maxWidth) {
        let chunk = "";
        for (const ch of Array.from(word)) {
          if (ctx.measureText(chunk + ch).width > maxWidth && chunk) {
            lines.push(chunk);
            chunk = ch;
          } else {
            chunk += ch;
          }
        }
        current = chunk;
      } else {
        current = word;
      }
    }
  }
  if (current) lines.push(current);
  return lines.slice(0, 2);
}

function drawTopIsometricLogo(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  topY: number,
  scale: number
) {
  ctx.save();
  ctx.translate(centerX - (130 * scale) / 2, topY);
  ctx.scale(scale, scale);

  // Left half of hexagon
  ctx.beginPath();
  ctx.moveTo(60, 10);
  ctx.lineTo(18, 32);
  ctx.lineTo(18, 78);
  ctx.lineTo(60, 100);
  ctx.closePath();
  ctx.strokeStyle = COLORS.ink;
  ctx.lineWidth = 4.5;
  ctx.lineJoin = "round";
  ctx.stroke();

  // Right half of hexagon (emerald door frame)
  ctx.beginPath();
  ctx.moveTo(60, 10);
  ctx.lineTo(102, 32);
  ctx.lineTo(102, 78);
  ctx.lineTo(60, 100);
  ctx.closePath();
  ctx.strokeStyle = COLORS.brand;
  ctx.lineWidth = 4.5;
  ctx.lineJoin = "round";
  ctx.stroke();

  // Open Emerald Door Panel
  ctx.beginPath();
  ctx.moveTo(62, 22);
  ctx.lineTo(86, 14);
  ctx.lineTo(86, 90);
  ctx.lineTo(62, 82);
  ctx.closePath();
  ctx.fillStyle = COLORS.brand;
  ctx.fill();

  // Door Handle
  ctx.beginPath();
  ctx.moveTo(67, 49);
  ctx.lineTo(67, 57);
  ctx.strokeStyle = COLORS.ink;
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  ctx.stroke();

  // Interior Person & Cross silhouette
  ctx.beginPath();
  ctx.arc(43, 48, 8, 0, Math.PI * 2);
  ctx.fillStyle = COLORS.ink;
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(31, 74);
  ctx.bezierCurveTo(31, 63, 55, 63, 55, 74);
  ctx.closePath();
  ctx.fillStyle = COLORS.ink;
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(30, 32);
  ctx.lineTo(30, 54);
  ctx.moveTo(24, 39);
  ctx.lineTo(36, 39);
  ctx.strokeStyle = COLORS.ink;
  ctx.lineWidth = 3.5;
  ctx.lineCap = "round";
  ctx.stroke();

  // Right side wave bars
  ctx.beginPath();
  ctx.moveTo(110, 42);
  ctx.lineTo(110, 68);
  ctx.moveTo(117, 35);
  ctx.lineTo(117, 75);
  ctx.moveTo(124, 46);
  ctx.lineTo(124, 64);
  ctx.strokeStyle = COLORS.brand;
  ctx.lineWidth = 4;
  ctx.lineCap = "round";
  ctx.stroke();

  ctx.restore();
}

function drawStepIcon(
  ctx: CanvasRenderingContext2D,
  kind: "scan" | "select" | "pay" | "done",
  cx: number,
  cy: number
) {
  ctx.save();
  ctx.strokeStyle = "#FFFFFF";
  ctx.fillStyle = "#FFFFFF";
  ctx.lineWidth = 4;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  if (kind === "scan") {
    // Smartphone icon
    drawRoundedRectPath(ctx, cx - 14, cy - 22, 28, 44, 5);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, cy + 14, 2, 0, Math.PI * 2);
    ctx.fill();
  } else if (kind === "select") {
    // CalendarCheck icon
    drawRoundedRectPath(ctx, cx - 18, cy - 16, 36, 34, 5);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx - 10, cy - 22);
    ctx.lineTo(cx - 10, cy - 12);
    ctx.moveTo(cx + 10, cy - 22);
    ctx.lineTo(cx + 10, cy - 12);
    ctx.moveTo(cx - 18, cy - 4);
    ctx.lineTo(cx + 18, cy - 4);
    ctx.moveTo(cx - 7, cy + 6);
    ctx.lineTo(cx - 2, cy + 11);
    ctx.lineTo(cx + 8, cy + 1);
    ctx.stroke();
  } else if (kind === "pay") {
    // CreditCard icon
    drawRoundedRectPath(ctx, cx - 20, cy - 14, 40, 28, 5);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx - 20, cy - 4);
    ctx.lineTo(cx + 20, cy - 4);
    ctx.stroke();
  } else {
    // Play triangle icon
    ctx.beginPath();
    ctx.moveTo(cx - 10, cy - 15);
    ctx.lineTo(cx + 14, cy);
    ctx.lineTo(cx - 10, cy + 15);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("โหลดรูป QR Code ไม่สำเร็จ"));
    img.src = src;
  });
}

async function drawQrContent(
  ctx: CanvasRenderingContext2D,
  posterEl: HTMLElement,
  qrX: number,
  qrY: number,
  qrSize: number
) {
  const customImg = posterEl.querySelector<HTMLImageElement>(
    "[data-qr-box] img, img[alt*='QR']"
  );
  if (customImg && customImg.src) {
    try {
      const loaded = await loadImageElement(customImg.src);
      ctx.drawImage(loaded, qrX, qrY, qrSize, qrSize);
      return;
    } catch {
      // Fall through to SVG QR if custom image fails
    }
  }

  const qrSvg = posterEl.querySelector<SVGSVGElement>(
    "[data-qr-box] svg, svg[title*='QR']"
  );
  if (qrSvg) {
    const vbAttr = qrSvg.getAttribute("viewBox");
    const vbParts = vbAttr ? vbAttr.trim().split(/[\s,]+/).map(Number) : [];
    const vbWidth = vbParts[2] && vbParts[2] > 0 ? vbParts[2] : 41;
    const vbHeight = vbParts[3] && vbParts[3] > 0 ? vbParts[3] : vbWidth;

    const paths = Array.from(qrSvg.querySelectorAll("path"));
    if (paths.length > 0 && typeof Path2D !== "undefined") {
      ctx.save();
      ctx.translate(qrX, qrY);
      ctx.scale(qrSize / vbWidth, qrSize / vbHeight);
      for (const p of paths) {
        const d = p.getAttribute("d");
        const fill = p.getAttribute("fill") || COLORS.ink;
        if (d) {
          ctx.fillStyle = fill;
          ctx.fill(new Path2D(d));
        }
      }
      ctx.restore();
      return;
    }

    // Fallback: serialize pure QR SVG (no foreignObject) to data URL
    const serialized = new XMLSerializer().serializeToString(qrSvg);
    const svgUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(serialized)}`;
    const loaded = await loadImageElement(svgUrl);
    ctx.drawImage(loaded, qrX, qrY, qrSize, qrSize);
  }
}

/**
 * Renders the StationQrPoster directly onto a high-resolution HTML5 Canvas
 * without `<foreignObject>`, avoiding WebKit/iOS Safari decode hangs, tainted
 * canvases, and multi-megabyte webfont fetches.
 */
export async function renderPosterCanvas(
  node: HTMLElement
): Promise<HTMLCanvasElement> {
  if (typeof document !== "undefined" && document.fonts?.ready) {
    await Promise.race([
      document.fonts.ready,
      new Promise(resolve => setTimeout(resolve, 1200)),
    ]);
  }

  const posterEl =
    node.querySelector<HTMLElement>("[data-station-poster='true']") ?? node;
  const ds = posterEl.dataset;

  const brandPrefix = ds.brandPrefix ?? "Grace";
  const brandHighlight = ds.brandHighlight ?? "Box";
  const stationSubheader = ds.stationSubheader ?? "S T A T I O N";
  const headlineWhite = ds.headlineWhite ?? "จุดถวายทรัพย์";
  const headlineOrange = ds.headlineOrange ?? "อัตโนมัติ";
  const churchName = ds.churchName ?? "";
  const scanPrompt = ds.scanPrompt ?? "สแกน LINE หรือ QR เพื่อเริ่มใช้งาน";
  const qrCenterBadge = ds.qrCenterBadge ?? "LINE";
  const qrCaption = ds.qrCaption ?? "LINE OFFICIAL";
  const footerLeadWhite = ds.footerLeadWhite ?? "ใจยินดี?";
  const footerLeadOrange = ds.footerLeadOrange ?? "ร่วมถวายได้เลย";
  const footerSubtext =
    ds.footerSubtext ??
    "เปิดรับถวายทุกกองทุน ส่งสลิปให้เหรัญญิกตรวจสอบก่อนบันทึกเข้าบัญชี";

  const width = 1200;
  const height = 1697; // Exact A4/A5 1:sqrt(2) aspect ratio
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("เบราว์เซอร์ไม่รองรับการสร้างรูปโปสเตอร์");
  }

  // 1. Clean white page background
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, width, height);

  // 2. Outer Acid Lime Poster Frame + Neo-Brutalist offset shadow
  const outerX = 56;
  const outerY = 48;
  const outerW = width - outerX * 2 - 14;
  const outerH = height - outerY * 2 - 14;

  // Offset shadow
  drawRoundedRectPath(ctx, outerX + 14, outerY + 14, outerW, outerH, 44);
  ctx.fillStyle = COLORS.ink;
  ctx.fill();

  // Outer lime frame
  fillAndStrokeRoundedRect(
    ctx,
    outerX,
    outerY,
    outerW,
    outerH,
    44,
    COLORS.lime,
    COLORS.ink,
    6
  );

  // 3. Inner White Sanctuary Board
  const innerPad = 48;
  const innerX = outerX + innerPad;
  const innerY = outerY + innerPad;
  const innerW = outerW - innerPad * 2;
  const innerH = outerH - innerPad * 2;

  fillAndStrokeRoundedRect(
    ctx,
    innerX,
    innerY,
    innerW,
    innerH,
    34,
    COLORS.surface,
    COLORS.ink,
    5
  );

  const centerX = innerX + innerW / 2;
  let cursorY = innerY + 56;

  // 4. Top Isometric Logo
  drawTopIsometricLogo(ctx, centerX, cursorY, 1.85);
  cursorY += 110 * 1.85 + 68;

  // 5. Brand Lockup (GraceBox)
  drawTwoToneCenteredText(
    ctx,
    brandPrefix,
    brandHighlight,
    centerX,
    cursorY,
    `800 96px ${FONT_DISPLAY}`,
    COLORS.ink,
    COLORS.brand
  );
  cursorY += 46;

  // 6. S T A T I O N Subheader + Emerald rules
  ctx.font = `700 26px ${FONT_SANS}`;
  ctx.fillStyle = COLORS.ink3;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const subW = ctx.measureText(stationSubheader).width;
  ctx.fillText(stationSubheader, centerX, cursorY);

  ctx.strokeStyle = "rgba(8, 127, 91, 0.45)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(centerX - subW / 2 - 96, cursorY);
  ctx.lineTo(centerX - subW / 2 - 24, cursorY);
  ctx.moveTo(centerX + subW / 2 + 24, cursorY);
  ctx.lineTo(centerX + subW / 2 + 96, cursorY);
  ctx.stroke();

  cursorY += 66;

  // 7. Headline (จุดถวายทรัพย์อัตโนมัติ)
  drawTwoToneCenteredText(
    ctx,
    headlineWhite,
    headlineOrange,
    centerX,
    cursorY,
    `800 52px ${FONT_DISPLAY}`,
    COLORS.ink,
    COLORS.brand
  );

  if (churchName.trim()) {
    cursorY += 42;
    ctx.font = `600 28px ${FONT_SANS}`;
    ctx.fillStyle = COLORS.ink3;
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    ctx.fillText(churchName.trim(), centerX, cursorY);
  }

  cursorY += 62;

  // 8. Scan Prompt
  ctx.font = `700 34px ${FONT_SANS}`;
  ctx.fillStyle = COLORS.ink;
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillText(scanPrompt, centerX, cursorY);

  cursorY += 32;

  // 9. White QR Card
  const qrCardW = 470;
  const qrCardH = qrCaption.trim() ? 510 : 470;
  const qrCardX = centerX - qrCardW / 2;
  const qrCardY = cursorY;

  fillAndStrokeRoundedRect(
    ctx,
    qrCardX,
    qrCardY,
    qrCardW,
    qrCardH,
    30,
    COLORS.surface,
    COLORS.ink,
    5
  );

  const qrPad = 32;
  const qrBoxX = qrCardX + qrPad;
  const qrBoxY = qrCardY + qrPad;
  const qrBoxSize = qrCardW - qrPad * 2;

  await drawQrContent(ctx, posterEl, qrBoxX, qrBoxY, qrBoxSize);

  // Subtle corner framing brackets inside QR box
  const cornerLen = 28;
  ctx.strokeStyle = "rgba(23, 26, 24, 0.32)";
  ctx.lineWidth = 4;
  ctx.beginPath();
  // Top-left
  ctx.moveTo(qrBoxX, qrBoxY + cornerLen);
  ctx.lineTo(qrBoxX, qrBoxY);
  ctx.lineTo(qrBoxX + cornerLen, qrBoxY);
  // Top-right
  ctx.moveTo(qrBoxX + qrBoxSize - cornerLen, qrBoxY);
  ctx.lineTo(qrBoxX + qrBoxSize, qrBoxY);
  ctx.lineTo(qrBoxX + qrBoxSize, qrBoxY + cornerLen);
  // Bottom-left
  ctx.moveTo(qrBoxX, qrBoxY + qrBoxSize - cornerLen);
  ctx.lineTo(qrBoxX, qrBoxY + qrBoxSize);
  ctx.lineTo(qrBoxX + cornerLen, qrBoxY + qrBoxSize);
  // Bottom-right
  ctx.moveTo(qrBoxX + qrBoxSize - cornerLen, qrBoxY + qrBoxSize);
  ctx.lineTo(qrBoxX + qrBoxSize, qrBoxY + qrBoxSize);
  ctx.lineTo(qrBoxX + qrBoxSize, qrBoxY + qrBoxSize - cornerLen);
  ctx.stroke();

  // Center Badge inside QR
  if (qrCenterBadge.trim()) {
    ctx.font = `900 26px ${FONT_DISPLAY}`;
    const badgeTextW = ctx.measureText(qrCenterBadge.trim()).width;
    const badgeW = badgeTextW + 28;
    const badgeH = 42;
    const badgeX = centerX - badgeW / 2;
    const badgeY = qrBoxY + qrBoxSize / 2 - badgeH / 2;
    fillAndStrokeRoundedRect(
      ctx,
      badgeX,
      badgeY,
      badgeW,
      badgeH,
      8,
      COLORS.lime,
      COLORS.ink,
      3.5
    );
    ctx.fillStyle = COLORS.ink;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(qrCenterBadge.trim(), centerX, badgeY + badgeH / 2 + 1);
  }

  // QR Caption
  if (qrCaption.trim()) {
    ctx.font = `800 24px ${FONT_SANS}`;
    ctx.fillStyle = COLORS.ink3;
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    ctx.fillText(
      qrCaption.trim().toUpperCase(),
      centerX,
      qrCardY + qrCardH - 22
    );
  }

  cursorY = qrCardY + qrCardH + 46;

  // 10. 4-Step Flow
  const steps: {
    number: number;
    label: string;
    icon: "scan" | "select" | "pay" | "done";
  }[] = [
    { number: 1, label: "สแกน", icon: "scan" },
    { number: 2, label: "เลือกประเภท", icon: "select" },
    { number: 3, label: "โอน/สลิป", icon: "pay" },
    { number: 4, label: "ขอบคุณพระเจ้า", icon: "done" },
  ];

  const flowLeft = innerX + 46;
  const flowRight = innerX + innerW - 46;
  const flowW = flowRight - flowLeft;
  const stepSpan = flowW / steps.length;
  const iconBoxSize = 96;

  steps.forEach((step, idx) => {
    const stepCx = flowLeft + stepSpan * idx + stepSpan / 2;
    const iconBoxX = stepCx - iconBoxSize / 2;
    const iconBoxY = cursorY;

    fillAndStrokeRoundedRect(
      ctx,
      iconBoxX,
      iconBoxY,
      iconBoxSize,
      iconBoxSize,
      24,
      COLORS.brand,
      COLORS.ink,
      4
    );
    drawStepIcon(ctx, step.icon, stepCx, iconBoxY + iconBoxSize / 2);

    // Chevron between steps
    if (idx < steps.length - 1) {
      const chevX = flowLeft + stepSpan * (idx + 1);
      const chevY = iconBoxY + iconBoxSize / 2;
      ctx.save();
      ctx.strokeStyle = COLORS.ink3;
      ctx.lineWidth = 4.5;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(chevX - 7, chevY - 12);
      ctx.lineTo(chevX + 6, chevY);
      ctx.lineTo(chevX - 7, chevY + 12);
      ctx.stroke();
      ctx.restore();
    }

    // Number pill + label under icon box
    const badgeY = iconBoxY + iconBoxSize + 28;
    ctx.beginPath();
    ctx.arc(stepCx, badgeY, 17, 0, Math.PI * 2);
    ctx.fillStyle = COLORS.lime;
    ctx.fill();
    ctx.strokeStyle = COLORS.ink;
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.font = `800 21px ${FONT_DISPLAY}`;
    ctx.fillStyle = COLORS.ink;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(String(step.number), stepCx, badgeY + 1);

    ctx.font = `700 25px ${FONT_SANS}`;
    ctx.fillStyle = COLORS.ink;
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    ctx.fillText(step.label, stepCx, badgeY + 46);
  });

  cursorY += iconBoxSize + 138;

  // 11. Bottom Callout
  drawTwoToneCenteredText(
    ctx,
    `${footerLeadWhite} `,
    footerLeadOrange,
    centerX,
    cursorY,
    `800 50px ${FONT_DISPLAY}`,
    COLORS.ink,
    COLORS.brand
  );

  cursorY += 44;
  ctx.font = `600 27px ${FONT_SANS}`;
  ctx.fillStyle = COLORS.ink2;
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  const subLines = wrapTextLines(ctx, footerSubtext, innerW - 96);
  subLines.forEach((line, idx) => {
    ctx.fillText(line, centerX, cursorY + idx * 36);
  });

  return canvas;
}

function dataUrlToBlob(dataUrl: string): Blob {
  const parts = dataUrl.split(",");
  const mimeMatch = parts[0]?.match(/:(.*?);/);
  const mime = mimeMatch?.[1] || "image/png";
  const binary = atob(parts[1] || "");
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: mime });
}

/** Draws the poster element into an image and returns it as a data URL. */
export async function renderPosterImage(
  node: HTMLElement,
  type: PosterImageType
): Promise<string> {
  const canvas = await renderPosterCanvas(node);
  const mime = type === "jpeg" ? "image/jpeg" : "image/png";
  return canvas.toDataURL(mime, 0.95);
}

/** Draws the poster into an image file. A Blob is more reliable to save than a data URL. */
export async function renderPosterBlob(
  node: HTMLElement,
  type: PosterImageType
): Promise<Blob> {
  const { blob } = await renderPosterExport(node, type);
  return blob;
}

/** Renders the poster once and returns both a Blob and a base64 Data URL. */
export async function renderPosterExport(
  node: HTMLElement,
  type: PosterImageType
): Promise<{ blob: Blob; dataUrl: string }> {
  const canvas = await renderPosterCanvas(node);
  const mime = type === "jpeg" ? "image/jpeg" : "image/png";
  const dataUrl = canvas.toDataURL(mime, 0.95);
  const blob = await new Promise<Blob>(resolve => {
    if (typeof canvas.toBlob === "function") {
      canvas.toBlob(
        b => resolve(b ?? dataUrlToBlob(dataUrl)),
        mime,
        0.95
      );
    } else {
      resolve(dataUrlToBlob(dataUrl));
    }
  });
  return { blob, dataUrl };
}

/** Starts a file download from a Blob URL or Data URL. */
export function downloadObjectUrl(objectUrl: string, fileName: string): void {
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = fileName;
  link.rel = "noopener";
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  window.setTimeout(() => link.remove(), 250);
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
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  window.setTimeout(() => link.remove(), 250);
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
