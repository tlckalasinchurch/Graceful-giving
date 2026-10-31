import React, { useRef } from "react";
import { trpc } from "@/lib/trpc";
import { bahtText } from "@/lib/bahtText";
import { Printer, X, Building2, CheckCircle2 } from "lucide-react";
import { THAI_LOCALE } from "@/lib/format";

export interface VoucherData {
  id: number | string;
  docNumber?: string;
  date: Date | string;
  amount: number;
  category?: string;
  categoryLabel?: string;
  titleOrDescription: string;
  payeeOrDonor?: string;
  fundName?: string;
  paymentMethod?: string;
  receiptRef?: string;
  notes?: string;
  receiptUrl?: string | null;
}

interface VoucherModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: "expense" | "offering";
  data: VoucherData | null;
}

export const VoucherModal: React.FC<VoucherModalProps> = ({
  isOpen,
  onClose,
  type,
  data,
}) => {
  const printAreaRef = useRef<HTMLDivElement>(null);
  const churchQuery = trpc.church.getProfile.useQuery(undefined, {
    retry: false,
  });
  const church = churchQuery.data;

  if (!isOpen || !data) return null;

  const isExpense = type === "expense";
  const docTitle = isExpense
    ? "ใบสำคัญจ่าย (PAYMENT VOUCHER)"
    : "ใบเสร็จรับเงินถวาย (OFFERING RECEIPT)";
  const defaultDocNum = isExpense
    ? `PV-${new Date(data.date).getFullYear()}-${String(data.id).padStart(4, "0")}`
    : `OR-${new Date(data.date).getFullYear()}-${String(data.id).padStart(4, "0")}`;
  const docNumber = data.docNumber || defaultDocNum;

  const formattedDate = new Date(data.date).toLocaleDateString(THAI_LOCALE, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 print:p-0 print:bg-surface print:static print:overflow-visible">
      {/* Container */}
      <div className="bg-surface w-full max-w-3xl rounded-2xl shadow-2xl border border-line overflow-hidden flex flex-col max-h-[92vh] print:max-h-none print:shadow-none print:border-none print:rounded-none">
        {/* Modal Action Bar (Hidden in print) */}
        <div className="flex items-center justify-between px-6 py-4 bg-paper border-b border-line print:hidden">
          <div className="flex items-center gap-2 text-ink-2">
            <Building2 className="w-5 h-5 text-brand" />
            <span className="font-bold text-sm">
              เอกสารทางการคริสตจักร (A4 Printable)
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand hover:bg-brand-ink text-white font-medium text-xs shadow-xs transition-colors"
            >
              <Printer className="w-4 h-4" />
              <span>พิมพ์เอกสาร (Print / PDF)</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-ink-3 hover:text-ink hover:bg-black/5 rounded-xl transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Document Content */}
        <div className="p-6 md:p-10 overflow-y-auto print:p-0 print:overflow-visible">
          {/* Printable Voucher Card */}
          <div
            ref={printAreaRef}
            className="voucher-print-area max-w-2xl mx-auto bg-surface border border-field print:border-none p-8 sm:p-10 rounded-2xl text-ink font-sans"
          >
            {/* Header / Church Info */}
            <div className="border-b-2 border-stone-800 pb-5 mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-ink tracking-tight">
                  {church?.name || "คริสตจักร"}
                </h1>
                <p className="text-xs text-ink-2 mt-1 max-w-md">
                  {church?.address || "ที่อยู่คริสตจักร"}
                </p>
                <p className="text-xs text-ink-3 mt-0.5">
                  {church?.phone && `โทรศัพท์: ${church.phone}`}
                  {church?.email && ` | อีเมล: ${church.email}`}
                </p>
              </div>
              <div className="text-left sm:text-right bg-paper p-3 rounded-xl border border-line shrink-0">
                <p className="text-[11px] font-semibold text-ink-3 uppercase tracking-wider">
                  {isExpense ? "เลขที่ใบสำคัญจ่าย" : "เลขที่ใบเสร็จ"}
                </p>
                <p className="text-sm font-bold text-ink font-mono">
                  {docNumber}
                </p>
                <p className="text-[11px] text-ink-2 mt-1">
                  วันที่: {formattedDate}
                </p>
              </div>
            </div>

            {/* Document Title Banner */}
            <div className="text-center my-6">
              <span className="inline-block px-6 py-1.5 bg-paper border border-field rounded-lg text-sm sm:text-base font-bold text-ink tracking-wide">
                {docTitle}
              </span>
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-2 gap-4 text-xs mb-6 bg-paper/70 p-4 rounded-xl border border-line">
              <div>
                <span className="text-ink-3 font-medium">
                  {isExpense ? "จ่ายให้แก่ (Payee):" : "ได้รับเงินจาก (Donor):"}
                </span>
                <p className="font-bold text-ink text-sm mt-0.5">
                  {data.payeeOrDonor ||
                    (isExpense ? "ทั่วไป" : "ผู้ถวายนิรนาม")}
                </p>
              </div>
              <div>
                <span className="text-ink-3 font-medium">
                  หักจาก / เข้ากองทุน:
                </span>
                <p className="font-bold text-ink text-sm mt-0.5">
                  {data.fundName || "กองทุนทั่วไป"}
                </p>
              </div>
              <div>
                <span className="text-ink-3 font-medium">
                  หมวดหมู่รายการ:
                </span>
                <p className="font-semibold text-ink mt-0.5">
                  {data.categoryLabel || data.category || "ทั่วไป"}
                </p>
              </div>
              <div>
                <span className="text-ink-3 font-medium">
                  {isExpense ? "เอกสารอ้างอิง / เลขที่สลิป:" : "วิธีการชำระ:"}
                </span>
                <p className="font-semibold text-ink font-mono mt-0.5">
                  {isExpense
                    ? data.receiptRef || "-"
                    : data.paymentMethod === "promptpay"
                      ? "โอนเงินพร้อมเพย์"
                      : data.paymentMethod || "เงินสด"}
                </p>
              </div>
            </div>

            {/* Items Table */}
            <div className="border border-field rounded-xl overflow-hidden mb-6">
              <table className="w-full text-left text-xs">
                <thead className="bg-paper border-b border-field text-ink-2 font-bold">
                  <tr>
                    <th className="py-2.5 px-4 w-12 text-center">ลำดับ</th>
                    <th className="py-2.5 px-4">
                      รายการ / คำอธิบาย (Description)
                    </th>
                    <th className="py-2.5 px-4 text-right w-28">
                      จำนวนเงิน (บาท)
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200">
                  <tr>
                    <td className="py-4 px-4 text-center font-mono text-ink-3">
                      1
                    </td>
                    <td className="py-4 px-4">
                      <p className="font-bold text-ink text-sm">
                        {data.titleOrDescription}
                      </p>
                      {data.notes && (
                        <p className="text-ink-3 text-xs mt-1">
                          {data.notes}
                        </p>
                      )}
                    </td>
                    <td className="py-4 px-4 text-right font-mono font-bold text-ink text-sm">
                      {data.amount.toLocaleString(THAI_LOCALE, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </td>
                  </tr>
                </tbody>
                <tfoot className="bg-paper border-t-2 border-field font-bold">
                  <tr>
                    <td colSpan={2} className="py-3 px-4 text-ink-2">
                      จำนวนเงินรวมทั้งสิ้น (ตัวอักษร):
                      <span className="text-ink font-bold ml-2">
                        ({bahtText(data.amount)})
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right text-base text-ink font-mono">
                      {data.amount.toLocaleString(THAI_LOCALE, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Attached Receipt Notice if available */}
            {data.receiptUrl && (
              <div className="mb-6 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center justify-between text-xs text-emerald-300 print:hidden">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>
                    รายการนี้มีหลักฐานสลิป/ใบเสร็จแนบในระบบ Supabase Storage
                  </span>
                </div>
                <a
                  href={data.receiptUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-bold underline hover:text-emerald-200"
                >
                  เปิดดูหลักฐานแนบ →
                </a>
              </div>
            )}

            {/* Signatures Section */}
            <div className="mt-10 pt-6 border-t border-field">
              {isExpense ? (
                <div className="grid grid-cols-3 gap-6 text-center text-xs">
                  <div className="space-y-12">
                    <p className="text-ink-2 font-medium">
                      ผู้ขอเบิก / ผู้รับเงิน
                    </p>
                    <div className="border-b border-stone-400 mx-2"></div>
                    <p className="text-ink-3">
                      (
                      {data.payeeOrDonor ||
                        "........................................"}
                      )
                    </p>
                    <p className="text-[10px] text-stone-400">
                      วันที่ ......./......./.......
                    </p>
                  </div>
                  <div className="space-y-12">
                    <p className="text-ink-2 font-medium">
                      เหรัญญิก / ผู้จ่ายเงิน
                    </p>
                    <div className="border-b border-stone-400 mx-2"></div>
                    <p className="text-ink-3">
                      (
                      {church?.treasurerName ||
                        "........................................"}
                      )
                    </p>
                    <p className="text-[10px] text-stone-400">
                      วันที่ ......./......./.......
                    </p>
                  </div>
                  <div className="space-y-12">
                    <p className="text-ink-2 font-medium">
                      ศิษยาภิบาล / ผู้อนุมัติ
                    </p>
                    <div className="border-b border-stone-400 mx-2"></div>
                    <p className="text-ink-3">
                      (
                      {church?.pastorName ||
                        "........................................"}
                      )
                    </p>
                    <p className="text-[10px] text-stone-400">
                      วันที่ ......./......./.......
                    </p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-10 text-center text-xs max-w-md mx-auto">
                  <div className="space-y-12">
                    <p className="text-ink-2 font-medium">
                      ผู้รับเงินถวาย / ผู้บันทึก
                    </p>
                    <div className="border-b border-stone-400 mx-4"></div>
                    <p className="text-ink-3">
                      (........................................)
                    </p>
                    <p className="text-[10px] text-stone-400">
                      วันที่ ......./......./.......
                    </p>
                  </div>
                  <div className="space-y-12">
                    <p className="text-ink-2 font-medium">
                      เหรัญญิกคริสตจักร
                    </p>
                    <div className="border-b border-stone-400 mx-4"></div>
                    <p className="text-ink-3">
                      (
                      {church?.treasurerName ||
                        "........................................"}
                      )
                    </p>
                    <p className="text-[10px] text-stone-400">
                      วันที่ ......./......./.......
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Footer motto */}
            {church?.motto && (
              <p className="text-center text-[10px] text-stone-400 mt-8 italic">
                "{church.motto}"
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Print Specific CSS */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .voucher-print-area, .voucher-print-area * {
            visibility: visible;
          }
          .voucher-print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 20mm;
          }
        }
      `}</style>
    </div>
  );
};
