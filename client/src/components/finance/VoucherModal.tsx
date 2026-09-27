import React, { useEffect } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { bahtText } from "@/lib/bahtText";
import { formatBaht } from "@/lib/format";
import { printAsPdf, shareOrCopy } from "@/lib/share";
import {
  CheckCircle2,
  FileDown,
  Printer,
  Share2,
  Sprout,
  X,
} from "lucide-react";
import { ChurchSeal } from "./ChurchSeal";

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

const money = (n: number) =>
  n.toLocaleString("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

/** One label/value pair in the document's detail grid. */
function Field({
  label,
  children,
  mono = false,
}: {
  label: string;
  children: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] font-medium text-[#6E6155]">{label}</dt>
      <dd
        className={`mt-0.5 break-words text-sm font-semibold text-[#171311] ${mono ? "font-mono" : ""}`}
      >
        {children}
      </dd>
    </div>
  );
}

function SignatureLine({ role, name }: { role: string; name?: string | null }) {
  return (
    <div className="flex flex-col items-center gap-2 text-center text-xs">
      <div className="h-10 w-full border-b border-dashed border-[#B9A78B]" />
      <p className="text-[#51443A]">
        ({name || "................................"})
      </p>
      <p className="font-semibold text-[#171311]">{role}</p>
      <p className="text-[10px] text-[#8C7B6B]">วันที่ ....../....../......</p>
    </div>
  );
}

/**
 * Receipt (offering) or payment voucher (expense) drawn as a paper document:
 * white sheet, an orange header rule, a perforated tear line before the
 * signature stub, and the church seal. Print, Save PDF and Share sit in a
 * bar that stays at the bottom of the screen on a phone.
 */
export const VoucherModal: React.FC<VoucherModalProps> = ({
  isOpen,
  onClose,
  type,
  data,
}) => {
  const churchQuery = trpc.church.getProfile.useQuery(undefined, {
    retry: false,
  });
  const church = churchQuery.data;

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  if (!isOpen || !data) return null;

  const isExpense = type === "expense";
  const docTitle = isExpense ? "ใบสำคัญจ่าย" : "ใบเสร็จรับเงินถวาย";
  const docTitleEn = isExpense ? "PAYMENT VOUCHER" : "OFFERING RECEIPT";
  const buddhistYear = new Date(data.date).getFullYear() + 543;
  const defaultDocNum = `${isExpense ? "PV" : "OR"}-${buddhistYear}-${String(
    data.id
  ).padStart(4, "0")}`;
  const docNumber = data.docNumber || defaultDocNum;
  const churchName = church?.name || "คริสตจักร";

  const formattedDate = new Date(data.date).toLocaleDateString("th-TH", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const shortDate = new Date(data.date).toLocaleDateString("th-TH", {
    year: "2-digit",
    month: "short",
    day: "numeric",
  });

  const paymentMethod = isExpense
    ? data.receiptRef || "-"
    : data.paymentMethod === "promptpay"
      ? "โอนเงินพร้อมเพย์"
      : data.paymentMethod || "เงินสด";

  const handleSavePdf = () => {
    toast.info("เลือก “บันทึกเป็น PDF” ในหน้าต่างพิมพ์", {
      description: `ชื่อไฟล์ที่แนะนำ: ${docNumber}.pdf`,
    });
    printAsPdf(docNumber);
  };

  const handleShare = () =>
    shareOrCopy({
      title: `${docTitle} ${docNumber}`,
      text: [
        `${docTitle} (${docTitleEn})`,
        churchName,
        `เลขที่: ${docNumber}`,
        `วันที่: ${formattedDate}`,
        `รายการ: ${data.titleOrDescription}`,
        `${isExpense ? "จ่ายให้" : "ได้รับจาก"}: ${
          data.payeeOrDonor || (isExpense ? "ทั่วไป" : "ผู้ถวายนิรนาม")
        }`,
        `จำนวนเงิน: ${formatBaht(data.amount)} (${bahtText(data.amount)})`,
      ].join("\n"),
    });

  const actionBase =
    "inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl border px-4 text-sm font-semibold transition-all duration-200 ease-in-out hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C94F16] focus-visible:ring-offset-2 sm:flex-none";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${docTitle} ${docNumber}`}
      className="fixed inset-0 z-50 flex items-stretch justify-center bg-[#171311]/55 backdrop-blur-xs sm:items-center sm:p-4 print:static print:block print:bg-white print:p-0"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="flex max-h-[100dvh] w-full max-w-3xl flex-col overflow-hidden bg-[#F3EADB] shadow-lg animate-in fade-in zoom-in-95 duration-200 sm:max-h-[92vh] sm:rounded-2xl sm:border sm:border-[#E7DCC8] print:max-h-none print:bg-white print:shadow-none">
        {/* Title bar */}
        <div className="flex items-center justify-between gap-3 border-b border-[#E7DCC8] bg-card px-4 py-3 sm:px-6 print:hidden">
          <div className="min-w-0">
            <p className="text-sm font-bold text-[#171311]">{docTitle}</p>
            <p className="font-mono text-xs text-[#6E6155]">{docNumber}</p>
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

        {/* Paper */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-3 py-5 sm:px-8 sm:py-8 print:overflow-visible print:p-0">
          <article className="voucher-print-area relative mx-auto max-w-2xl overflow-hidden rounded-sm bg-white text-[#171311] shadow-[0_1px_2px_rgba(81,68,58,0.08),0_12px_32px_-12px_rgba(81,68,58,0.25)] [print-color-adjust:exact] print:shadow-none">
            {/* Header rule */}
            <div className="h-2 bg-gradient-to-r from-[#9F3B0F] via-[#C94F16] to-[#E0621F]" />

            <div className="p-6 sm:p-10">
              {/* Letterhead */}
              <header className="flex flex-col gap-5 border-b border-[#E7DCC8] pb-6 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-start gap-3">
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[#C94F16] text-white">
                    <Sprout className="size-6" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <h1 className="text-lg font-bold leading-tight sm:text-xl">
                      {churchName}
                    </h1>
                    <p className="mt-1 max-w-sm text-xs leading-relaxed text-[#51443A]">
                      {church?.address || "ที่อยู่คริสตจักร"}
                    </p>
                    {(church?.phone || church?.email) && (
                      <p className="mt-0.5 text-xs text-[#6E6155]">
                        {church?.phone && `โทร ${church.phone}`}
                        {church?.phone && church?.email && " · "}
                        {church?.email}
                      </p>
                    )}
                  </div>
                </div>
                <div className="sm:text-right">
                  <p className="text-xl font-bold text-[#9F3B0F]">{docTitle}</p>
                  <p className="text-[11px] font-semibold tracking-[0.2em] text-[#8C7B6B]">
                    {docTitleEn}
                  </p>
                  <dl className="mt-3 inline-grid grid-cols-[auto_auto] gap-x-3 gap-y-0.5 text-xs sm:justify-end">
                    <dt className="text-[#6E6155]">เลขที่</dt>
                    <dd className="font-mono font-bold">{docNumber}</dd>
                    <dt className="text-[#6E6155]">วันที่</dt>
                    <dd className="font-semibold">{formattedDate}</dd>
                  </dl>
                </div>
              </header>

              {/* Details */}
              <dl className="grid grid-cols-1 gap-4 py-6 sm:grid-cols-2">
                <Field label={isExpense ? "จ่ายให้แก่" : "ได้รับเงินจาก"}>
                  {data.payeeOrDonor ||
                    (isExpense ? "ทั่วไป" : "ผู้ถวายนิรนาม")}
                </Field>
                <Field label={isExpense ? "ตัดจ่ายจากกองทุน" : "เข้ากองทุน"}>
                  {data.fundName || "กองทุนทั่วไป"}
                </Field>
                <Field label="หมวดหมู่">
                  {data.categoryLabel || data.category || "ทั่วไป"}
                </Field>
                <Field
                  label={isExpense ? "เอกสารอ้างอิง" : "วิธีการชำระ"}
                  mono={isExpense}
                >
                  {paymentMethod}
                </Field>
              </dl>

              {/* Line item */}
              <div className="overflow-hidden rounded-lg border border-[#E7DCC8]">
                <table className="w-full text-left text-sm">
                  <thead className="bg-[#FAF6EE] text-xs font-semibold text-[#51443A]">
                    <tr>
                      <th className="w-12 px-4 py-2.5 text-center">#</th>
                      <th className="px-4 py-2.5">รายการ</th>
                      <th className="px-4 py-2.5 text-right">
                        จำนวนเงิน (บาท)
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-t border-[#EFE5D3] align-top">
                      <td className="px-4 py-4 text-center font-mono text-[#6E6155]">
                        1
                      </td>
                      <td className="px-4 py-4">
                        <p className="font-semibold">
                          {data.titleOrDescription}
                        </p>
                        {data.notes && (
                          <p className="mt-1 text-xs text-[#6E6155]">
                            {data.notes}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-4 text-right font-mono font-semibold tabular-nums">
                        {money(data.amount)}
                      </td>
                    </tr>
                  </tbody>
                </table>
                <div className="flex flex-col gap-1 border-t-2 border-[#171311] bg-[#FFF8EA] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs text-[#51443A]">
                    ({bahtText(data.amount)})
                  </p>
                  <p className="text-right">
                    <span className="mr-2 text-xs font-semibold text-[#51443A]">
                      รวมทั้งสิ้น
                    </span>
                    <span className="font-mono text-xl font-bold tabular-nums">
                      ฿{money(data.amount)}
                    </span>
                  </p>
                </div>
              </div>

              {data.receiptUrl && (
                <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#C8E6C9] bg-[#E8F5E9] px-3 py-2 text-xs text-[#1B5E20] print:hidden">
                  <span className="inline-flex items-center gap-1.5">
                    <CheckCircle2 className="size-4 shrink-0" />
                    มีหลักฐานสลิป/ใบเสร็จแนบในระบบ
                  </span>
                  <a
                    href={data.receiptUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-9 items-center font-semibold underline underline-offset-2"
                  >
                    เปิดดูหลักฐาน
                  </a>
                </div>
              )}
            </div>

            {/* Perforated tear line */}
            <div className="relative" aria-hidden="true">
              <span className="absolute -left-3 top-1/2 size-6 -translate-y-1/2 rounded-full bg-[#F3EADB] print:hidden" />
              <span className="absolute -right-3 top-1/2 size-6 -translate-y-1/2 rounded-full bg-[#F3EADB] print:hidden" />
              <div className="mx-6 border-t-2 border-dashed border-[#D9C6A6] sm:mx-10" />
            </div>

            {/* Signature stub and seal */}
            <footer className="relative p-6 sm:p-10">
              <div
                className={`grid gap-6 ${isExpense ? "grid-cols-1 sm:grid-cols-3" : "grid-cols-1 sm:grid-cols-2 sm:pr-32"}`}
              >
                {isExpense ? (
                  <>
                    <SignatureLine role="ผู้รับเงิน" name={data.payeeOrDonor} />
                    <SignatureLine
                      role="เหรัญญิก / ผู้จ่ายเงิน"
                      name={church?.treasurerName}
                    />
                    <SignatureLine
                      role="ศิษยาภิบาล / ผู้อนุมัติ"
                      name={church?.pastorName}
                    />
                  </>
                ) : (
                  <>
                    <SignatureLine role="ผู้รับเงินถวาย / ผู้บันทึก" />
                    <SignatureLine
                      role="เหรัญญิกคริสตจักร"
                      name={church?.treasurerName}
                    />
                  </>
                )}
              </div>

              <ChurchSeal
                churchName={churchName}
                label={isExpense ? "อนุมัติจ่าย" : "ได้รับแล้ว"}
                date={shortDate}
                className={`pointer-events-none mx-auto mt-6 block size-28 -rotate-12 opacity-85 sm:absolute sm:mt-0 sm:size-32 ${
                  isExpense ? "sm:-top-14 sm:right-10" : "sm:right-10 sm:top-6"
                }`}
              />

              <p className="mt-8 text-center font-script text-lg text-[#9F3B0F]">
                {church?.motto
                  ? `“${church.motto}”`
                  : "God loves a cheerful giver — 2 Cor 9:7"}
              </p>
            </footer>
          </article>
        </div>

        {/* Actions: bottom bar on a phone, right-aligned on a desktop */}
        <div className="grid grid-cols-3 gap-2 border-t border-[#E7DCC8] bg-card px-3 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:flex sm:justify-end sm:px-6 print:hidden">
          <button
            type="button"
            onClick={handleShare}
            className={`${actionBase} border-[#E7DCC8] bg-white text-[#51443A] hover:bg-[#FFF4D6]`}
          >
            <Share2 className="size-4" />
            แชร์
          </button>
          <button
            type="button"
            onClick={handleSavePdf}
            className={`${actionBase} border-[#E7DCC8] bg-white text-[#51443A] hover:bg-[#FFF4D6]`}
          >
            <FileDown className="size-4" />
            <span>
              <span className="sm:hidden">PDF</span>
              <span className="hidden sm:inline">บันทึก PDF</span>
            </span>
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className={`${actionBase} border-[#C94F16] bg-[#C94F16] text-white hover:bg-[#9F3B0F]`}
          >
            <Printer className="size-4" />
            พิมพ์
          </button>
        </div>
      </div>

      {/* Print only the paper */}
      <style>{`
        @media print {
          @page { size: A4; margin: 12mm; }
          body * { visibility: hidden; }
          .voucher-print-area, .voucher-print-area * { visibility: visible; }
          .voucher-print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            max-width: none;
            margin: 0;
          }
        }
      `}</style>
    </div>
  );
};
