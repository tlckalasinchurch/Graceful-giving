import React, { useEffect } from "react";
import { Download, ExternalLink, FileText, Share2, X } from "lucide-react";
import { shareOrCopy } from "@/lib/share";

interface ReceiptPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  receiptUrl: string | null;
  title?: string;
  refCode?: string;
}

const actionBase =
  "inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl border px-4 text-sm font-semibold transition-all duration-200 ease-in-out hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C94F16] focus-visible:ring-offset-2 sm:flex-none";

/**
 * Full-size view of an attached slip or receipt. The image sits on a white
 * "paper" mat; the actions stay in a bottom bar on a phone.
 */
export const ReceiptPreviewModal: React.FC<ReceiptPreviewModalProps> = ({
  isOpen,
  onClose,
  receiptUrl,
  title,
  refCode,
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  if (!isOpen || !receiptUrl) return null;

  const isPdf = receiptUrl.toLowerCase().includes(".pdf");
  const heading = "หลักฐานสลิป / ใบเสร็จ";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={heading}
      className="fixed inset-0 z-50 flex items-stretch justify-center bg-[#171311]/60 backdrop-blur-xs sm:items-center sm:p-4"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="flex max-h-[100dvh] w-full max-w-2xl flex-col overflow-hidden bg-[#F3EADB] shadow-lg animate-in fade-in zoom-in-95 duration-200 sm:max-h-[90vh] sm:rounded-2xl sm:border sm:border-[#E7DCC8]">
        <div className="flex items-center justify-between gap-3 border-b border-[#E7DCC8] bg-card px-4 py-3 sm:px-6">
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-[#171311]">{heading}</h3>
            {(refCode || title) && (
              <p className="truncate text-xs text-[#6E6155]">
                {refCode && <span className="font-mono">{refCode}</span>}
                {refCode && title && " · "}
                {title}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="ปิด"
            className="flex size-11 shrink-0 items-center justify-center rounded-xl text-[#51443A] transition-all duration-200 ease-in-out hover:bg-[#FFF4D6] hover:text-[#171311]"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="flex min-h-[300px] flex-1 items-center justify-center overflow-y-auto overscroll-contain p-4 sm:p-6">
          {isPdf ? (
            <div className="max-w-sm rounded-sm bg-white p-8 text-center shadow-[0_12px_32px_-12px_rgba(81,68,58,0.3)]">
              <span className="mx-auto mb-4 flex size-16 items-center justify-center rounded-2xl border border-[#F9D2AE] bg-[#FFF4D6] text-[#C94F16]">
                <FileText className="size-8" />
              </span>
              <p className="text-sm font-bold text-[#171311]">เอกสาร PDF</p>
              <p className="mt-1 text-xs text-[#6E6155]">
                เปิดไฟล์เพื่อดูหรือดาวน์โหลดเอกสารฉบับเต็ม
              </p>
            </div>
          ) : (
            <figure className="rounded-sm bg-white p-3 shadow-[0_12px_32px_-12px_rgba(81,68,58,0.3)]">
              <img
                src={receiptUrl}
                alt={title ? `หลักฐานของ ${title}` : "หลักฐานสลิปหรือใบเสร็จ"}
                className="max-h-[62vh] w-auto rounded-sm object-contain"
              />
            </figure>
          )}
        </div>

        <div className="grid grid-cols-3 gap-2 border-t border-[#E7DCC8] bg-card px-3 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:flex sm:justify-end sm:px-6">
          <button
            type="button"
            onClick={() =>
              shareOrCopy({
                title: heading,
                text: [heading, refCode, title].filter(Boolean).join(" · "),
                url: receiptUrl,
              })
            }
            className={`${actionBase} border-[#E7DCC8] bg-white text-[#51443A] hover:bg-[#FFF4D6]`}
          >
            <Share2 className="size-4" />
            แชร์
          </button>
          <a
            href={receiptUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`${actionBase} border-[#E7DCC8] bg-white text-[#51443A] hover:bg-[#FFF4D6]`}
          >
            <ExternalLink className="size-4" />
            เปิด
          </a>
          <a
            href={receiptUrl}
            download={refCode || true}
            target="_blank"
            rel="noopener noreferrer"
            className={`${actionBase} border-[#C94F16] bg-[#C94F16] text-white hover:bg-[#9F3B0F]`}
          >
            <Download className="size-4" />
            ดาวน์โหลด
          </a>
        </div>
      </div>
    </div>
  );
};
