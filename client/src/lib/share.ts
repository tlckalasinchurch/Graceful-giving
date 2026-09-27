import { toast } from "sonner";

/**
 * Opens the phone's share sheet (Web Share API). Where the browser has no
 * share sheet, the text is copied to the clipboard instead. A user who
 * closes the share sheet is not an error.
 */
export async function shareOrCopy(data: {
  title: string;
  text: string;
  url?: string;
}): Promise<void> {
  if (typeof navigator !== "undefined" && navigator.share) {
    try {
      await navigator.share(data);
      return;
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
    }
  }
  const payload = [data.text, data.url].filter(Boolean).join("\n");
  try {
    await navigator.clipboard.writeText(payload);
    toast.success("คัดลอกรายละเอียดแล้ว", {
      description: "วางข้อความใน LINE หรืออีเมลเพื่อส่งต่อได้ทันที",
    });
  } catch {
    toast.error("แชร์ไม่สำเร็จ", {
      description: "เบราว์เซอร์นี้ไม่อนุญาตให้แชร์หรือคัดลอกข้อความ",
    });
  }
}

/**
 * Opens the browser print dialog with the document title set to `fileName`,
 * so "Save as PDF" suggests that name. The previous title comes back after
 * the dialog closes.
 */
export function printAsPdf(fileName: string): void {
  const previous = document.title;
  document.title = fileName;
  const restore = () => {
    document.title = previous;
    window.removeEventListener("afterprint", restore);
  };
  window.addEventListener("afterprint", restore);
  window.print();
}
