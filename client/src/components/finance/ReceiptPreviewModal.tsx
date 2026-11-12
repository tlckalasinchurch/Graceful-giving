import React from "react";
import { X, ExternalLink, Download, FileText } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";

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
  if (!receiptUrl) return null;

  const isPdf = receiptUrl.toLowerCase().includes(".pdf");

  return (
    <Dialog
      open={isOpen}
      onOpenChange={open => {
        if (!open) onClose();
      }}
    >
      <DialogContent
        showCloseButton={false}
        className="w-[calc(100%-1.5rem)] max-w-2xl p-0 gap-0 overflow-hidden flex flex-col max-h-[90dvh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-ground border-b border-line">
          <div>
            <p className="text-xs font-medium text-ink-3">เอกสารแนบ</p>
            <DialogTitle className="display text-base text-ink">
              หลักฐานสลิป / ใบเสร็จแนบ
            </DialogTitle>
            <DialogDescription className="sr-only">
              ตัวอย่างหลักฐานสลิปหรือใบเสร็จแนบพร้อมลิงก์เปิดดูเต็มจอ
            </DialogDescription>
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
              className="btn-secondary inline-flex min-h-11 items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>เปิดลิงก์เต็ม</span>
            </a>
            <button
              type="button"
              onClick={onClose}
              aria-label="ปิดตัวอย่างใบเสร็จ"
              className="min-h-11 min-w-11 inline-flex items-center justify-center p-1.5 text-ink-2 hover:text-ink hover:bg-paper-2 rounded-xl transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body Preview */}
        <div className="p-4 sm:p-6 flex-1 overflow-y-auto flex items-center justify-center bg-paper-2/60 min-h-[300px]">
          {isPdf ? (
            <div className="text-center p-8 bg-surface rounded-[20px] border border-line max-w-sm">
              <div className="w-14 h-14 rounded-2xl bg-tile-sky text-tile-sky-ink flex items-center justify-center mx-auto mb-4">
                <FileText className="w-7 h-7" />
              </div>
              <p className="display text-base text-ink">เอกสารแนบรูปแบบ PDF</p>
              <p className="text-xs text-ink-3 mt-1.5 mb-5 leading-relaxed">
                ไฟล์เอกสาร PDF เก็บไว้ใน Supabase Storage อย่างปลอดภัย
              </p>
              <a
                href={receiptUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary inline-flex min-h-11 items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>เปิดและดาวน์โหลด PDF</span>
              </a>
            </div>
          ) : (
            <div className="max-w-full max-h-[70dvh] flex items-center justify-center overflow-hidden rounded-[20px] border border-line bg-surface p-2">
              <img
                src={receiptUrl}
                alt={
                  title
                    ? `ภาพตัวอย่างหลักฐาน: ${title}`
                    : "ภาพตัวอย่างหลักฐานสลิปหรือใบเสร็จ"
                }
                className="max-h-[65dvh] w-auto object-contain rounded-xl"
              />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
