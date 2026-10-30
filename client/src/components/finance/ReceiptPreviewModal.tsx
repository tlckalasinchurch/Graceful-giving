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
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-line overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-paper border-b border-line">
          <div>
            <h3 className="font-bold text-sm text-ink">
              หลักฐานสลิป / ใบเสร็จแนบ
            </h3>
            {refCode && (
              <p className="text-xs text-ink-3 font-mono">
                {refCode} {title && `• ${title}`}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <a
              href={receiptUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-line text-ink-2 hover:bg-paper-2 text-xs font-medium transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>เปิดลิงก์เต็ม</span>
            </a>
            <button
              onClick={onClose}
              className="p-1.5 text-ink-3 hover:text-ink hover:bg-black/5 rounded-xl transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body Preview */}
        <div className="p-4 sm:p-6 flex-1 overflow-y-auto flex items-center justify-center bg-stone-100 min-h-[300px]">
          {isPdf ? (
            <div className="text-center p-8 bg-white rounded-2xl border border-stone-200 shadow-xs max-w-sm">
              <FileText className="w-16 h-16 text-brand mx-auto mb-3" />
              <p className="font-bold text-sm text-stone-800">
                เอกสารแนบรูปแบบ PDF
              </p>
              <p className="text-xs text-stone-500 mt-1 mb-4">
                ไฟล์เอกสาร PDF เก็บไว้ใน Supabase Storage อย่างปลอดภัย
              </p>
              <a
                href={receiptUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand hover:bg-brand-ink text-white text-xs font-bold shadow-xs transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>เปิดและดาวน์โหลด PDF</span>
              </a>
            </div>
          ) : (
            <div className="max-w-full max-h-[70vh] flex items-center justify-center overflow-hidden rounded-xl border border-stone-200 bg-white p-2">
              <img
                src={receiptUrl}
                alt="Receipt Full Preview"
                className="max-h-[65vh] w-auto object-contain rounded-lg shadow-xs"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
