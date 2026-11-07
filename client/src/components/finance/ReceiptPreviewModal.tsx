import React from "react";
import { X, ExternalLink, Download, FileText } from "lucide-react";

interface ReceiptPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  receiptUrl: string | null;
  title?: string;
  refCode?: string;
}

export const ReceiptPreviewModal: React.FC<ReceiptPreviewModalProps> = ({
  isOpen,
  onClose,
  receiptUrl,
  title,
  refCode,
}) => {
  if (!isOpen || !receiptUrl) return null;

  const isPdf = receiptUrl.toLowerCase().includes(".pdf");

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-ink/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="neo-modal w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-ground border-b-2 border-[var(--ink)]">
          <div>
            <span className="eyebrow-quiet mb-1 block">DOCUMENT PREVIEW</span>
            <h3 className="display text-base text-ink">
              หลักฐานสลิป / ใบเสร็จแนบ
            </h3>
            {refCode && (
              <p className="text-xs text-ink-3 font-mono mt-0.5">
                {refCode} {title && `• ${title}`}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <a
              href={receiptUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary inline-flex min-h-10 items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>เปิดลิงก์เต็ม</span>
            </a>
            <button
              onClick={onClose}
              aria-label="ปิดตัวอย่างใบเสร็จ"
              className="min-h-11 min-w-11 inline-flex items-center justify-center p-1.5 text-ink-2 hover:text-ink hover:bg-paper-2 rounded-xl border border-transparent hover:border-[var(--ink)] transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body Preview */}
        <div className="p-4 sm:p-6 flex-1 overflow-y-auto flex items-center justify-center bg-paper-2/60 min-h-[300px]">
          {isPdf ? (
            <div className="text-center p-8 bg-surface rounded-2xl border-2 border-[var(--ink)] shadow-[4px_4px_0_var(--ink)] max-w-sm">
              <div className="w-16 h-16 rounded-2xl bg-accent border-2 border-[var(--ink)] shadow-[3px_3px_0_var(--ink)] flex items-center justify-center mx-auto mb-4">
                <FileText className="w-8 h-8 text-accent-foreground" />
              </div>
              <p className="display text-base text-ink">เอกสารแนบรูปแบบ PDF</p>
              <p className="text-xs text-ink-3 mt-1.5 mb-5 leading-relaxed">
                ไฟล์เอกสาร PDF เก็บไว้ใน Supabase Storage อย่างปลอดภัย
              </p>
              <a
                href={receiptUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary inline-flex min-h-11 items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all"
              >
                <Download className="w-4 h-4" />
                <span>เปิดและดาวน์โหลด PDF</span>
              </a>
            </div>
          ) : (
            <div className="max-w-full max-h-[70vh] flex items-center justify-center overflow-hidden rounded-2xl border-2 border-[var(--ink)] bg-surface p-2 shadow-[4px_4px_0_var(--ink)]">
              <img
                src={receiptUrl}
                alt="Receipt Full Preview"
                className="max-h-[65vh] w-auto object-contain rounded-xl"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
