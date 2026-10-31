/**
 * Saves a rendered QR code (an <svg>) as a PNG. A donor on one phone cannot
 * scan their own screen, so they save the image and open it from the photo
 * album in their bank app.
 */
export async function downloadSvgAsPng(
  svg: SVGSVGElement,
  filename: string,
  size = 1024
): Promise<void> {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute("width", String(size));
  clone.setAttribute("height", String(size));
  if (!clone.getAttribute("xmlns")) {
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  }
  const url = URL.createObjectURL(
    new Blob([new XMLSerializer().serializeToString(clone)], {
      type: "image/svg+xml",
    })
  );
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("ไม่สามารถสร้างรูป QR ได้"));
      el.src = url;
    });

    // A white border keeps the quiet zone a scanner needs.
    const pad = Math.round(size * 0.06);
    const canvas = document.createElement("canvas");
    canvas.width = size + pad * 2;
    canvas.height = size + pad * 2;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("ไม่สามารถสร้างรูป QR ได้");
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, pad, pad, size, size);

    const blob = await new Promise<Blob | null>(resolve =>
      canvas.toBlob(resolve, "image/png")
    );
    if (!blob) throw new Error("ไม่สามารถสร้างรูป QR ได้");

    const link = document.createElement("a");
    const pngUrl = URL.createObjectURL(blob);
    link.href = pngUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(pngUrl), 1000);
  } finally {
    URL.revokeObjectURL(url);
  }
}
