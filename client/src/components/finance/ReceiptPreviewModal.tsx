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
      <div className="bg-card w-full max-w-2xl rounded-2xl shadow-lg border border-[#E7DCC8] overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#FAF8F5] border-b border-[#E7DCC8]">
          <div>
            <h3 className="font-bold text-sm text-[#171311]">
              หลักฐานสลิป / ใบเสร็จแนบ
            </h3>
            {refCode && (
              <p className="text-xs text-[#6E6155] font-mono">
                {refCode} {title && `• ${title}`}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <a
              href={receiptUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-card border border-[#E7DCC8] text-[#51443A] hover:bg-[#FFF4D6] text-xs font-medium transition-all duration-200 ease-in-out"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>เปิดลิงก์เต็ม</span>
            </a>
            <button
              onClick={onClose}
              className="p-1.5 text-[#6E6155] hover:text-[#171311] hover:bg-black/5 rounded-xl transition-all duration-200 ease-in-out"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body Preview */}
        <div className="p-4 sm:p-6 flex-1 overflow-y-auto flex items-center justify-center bg-[#F5EDE0] min-h-[300px]">
          {isPdf ? (
            <div className="text-center p-8 bg-card rounded-2xl border border-[#E7DCC8] shadow-xs max-w-sm">
              <FileText className="w-16 h-16 text-[#C94F16] mx-auto mb-3" />
              <p className="font-bold text-sm text-stone-800">
                เอกสารแนบรูปแบบ PDF
              </p>
              <p className="text-xs text-[#6E6155] mt-1 mb-4">
                ไฟล์เอกสาร PDF เก็บไว้ใน Supabase Storage อย่างปลอดภัย
              </p>
              <a
                href={receiptUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#C94F16] hover:bg-[#9F3B0F] text-white text-xs font-bold shadow-xs transition-all duration-200 ease-in-out"
              >
                <Download className="w-4 h-4" />
                <span>เปิดและดาวน์โหลด PDF</span>
              </a>
            </div>
          ) : (
            <div className="max-w-full max-h-[70vh] flex items-center justify-center overflow-hidden rounded-xl border border-[#E7DCC8] bg-card p-2">
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
