import React from "react";
import { RotateCcw, Trash2 } from "lucide-react";
import { fmtBaht, Variance } from "./countingUtils";
import { Swal } from "@/lib/sweetalert";

interface ReconciliationSummaryTabProps {
  sessionId: number;
  status: string | undefined;
  canManageFinance?: boolean;
  countedBy?: number | null;
  currentUserId?: number;
  varianceNote: string;
  setVarianceNote: React.Dispatch<React.SetStateAction<string>>;
  sessionVarianceNote?: string | null;
  r: {
    offeringTotal: number;
    envelopeCashTotal: number;
    envelopeTransferTotal: number;
    envelopeCheckTotal: number;
    cashVariance: number;
    transferVariance: number;
    countedCashTotal: number;
    deductionTotal: number;
    hasCarryForward: boolean;
    cashOnHandActual: number | null;
    isBalanced: boolean;
  };
  unapprovedDeductions: Array<any>;
  isUnposted: boolean;
  submitCount: {
    mutate: (vars: { id: number }) => void;
    isPending: boolean;
  };
  reopenCount: {
    mutate: (vars: { id: number }) => void;
    isPending: boolean;
  };
  verify: {
    mutate: (vars: { id: number }) => void;
    isPending: boolean;
  };
  post: {
    mutate: (vars: { id: number; varianceNote?: string }) => void;
    isPending: boolean;
  };
  close: {
    mutate: (vars: { id: number }) => void;
    isPending: boolean;
  };
  handleResetThisSession: () => Promise<void>;
  handleDeleteThisSession: () => Promise<void>;
  resetSessionPending: boolean;
  deleteSessionPending: boolean;
}

export function ReconciliationSummaryTab({
  sessionId,
  status,
  canManageFinance = true,
  countedBy,
  currentUserId,
  varianceNote,
  setVarianceNote,
  sessionVarianceNote,
  r,
  unapprovedDeductions,
  isUnposted,
  submitCount,
  reopenCount,
  verify,
  post,
  close,
  handleResetThisSession,
  handleDeleteThisSession,
  resetSessionPending,
  deleteSessionPending,
}: ReconciliationSummaryTabProps) {
  const isSelfVerifyBlocked =
    currentUserId !== undefined &&
    countedBy !== undefined &&
    countedBy !== null &&
    countedBy === currentUserId;
  const effectiveVarianceNote =
    varianceNote.trim() || sessionVarianceNote || "";

  const handlePost = async () => {
    const confirmed = await Swal.confirm(
      "ยืนยันการลงบัญชีเข้าระบบ?",
      `จะบันทึกรายการถวายและรายจ่ายของรอบนี้เข้าบัญชีการเงิน\n\nยอดถวายตามซอง: ${fmtBaht(r.offeringTotal)}\nรายการหักเบิก: ${fmtBaht(r.deductionTotal)}${effectiveVarianceNote ? `\nคำอธิบายผลต่าง: ${effectiveVarianceNote}` : ""}\n\nลงบัญชีแล้วรอบจะล็อกข้อมูลซองและผลนับ หากต้องแก้ไขต้องขอ "ส่งกลับไปนับใหม่" ก่อน`,
      {
        icon: "question",
        confirmButtonText: "ลงบัญชี",
        cancelButtonText: "ยกเลิก",
      }
    );
    if (confirmed) {
      post.mutate({
        id: sessionId,
        varianceNote: varianceNote.trim() || undefined,
      });
    }
  };

  const handleClose = async () => {
    const confirmed = await Swal.confirm(
      "ยืนยันการปิดรอบถาวร?",
      `เมื่อปิดรอบแล้วข้อมูลซองถวายและผลนับจะถูกล็อกเพื่อการตรวจสอบ ไม่สามารถแก้ไขได้อีก\n\n(ปิดรอบแล้วไม่มีปุ่มเปิดรอบใหม่ — รอบนี้จะปรากฏเป็นประวัติที่อ่านอย่างเดียว)`,
      {
        icon: "warning",
        confirmButtonText: "ปิดรอบถาวร",
        cancelButtonText: "ยกเลิก",
      }
    );
    if (confirmed) {
      close.mutate({ id: sessionId });
    }
  };

  return (
    <section className="space-y-4">
      <div className="bento-card-static overflow-hidden">
        <h2 className="border-b-2 border-[var(--ink)] bg-paper-2 p-4 font-extrabold text-ink">
          ตารางกระทบยอด
        </h2>
        <dl className="divide-y divide-line">
          {[
            {
              label: "ยอดถวายตามซอง (ทุกช่องทาง)",
              value: fmtBaht(r.offeringTotal),
            },
            {
              label: "— ซองเงินสด",
              value: fmtBaht(r.envelopeCashTotal),
            },
            {
              label: "— ซองเงินโอน",
              value: fmtBaht(r.envelopeTransferTotal),
            },
            {
              label: "— ซองเช็ค",
              value: fmtBaht(r.envelopeCheckTotal),
            },
          ].map(row => (
            <div
              key={row.label}
              className="flex items-center justify-between gap-4 p-4"
            >
              <dt className="text-sm font-medium text-ink-2">{row.label}</dt>
              <dd className="text-sm font-extrabold tabular-nums text-ink">
                {row.value}
              </dd>
            </div>
          ))}
          <div className="flex items-center justify-between gap-4 bg-paper-2 p-4">
            <dt className="text-sm font-extrabold text-ink">
              ผลต่างเงินสด (นับได้ − ซองเงินสด)
            </dt>
            <dd>
              <Variance amount={r.cashVariance} />
            </dd>
          </div>
          <div className="flex items-center justify-between gap-4 bg-paper-2 p-4">
            <dt className="text-sm font-extrabold text-ink">
              ผลต่างเงินโอน (เข้าบัญชี − ซองโอน)
            </dt>
            <dd>
              <Variance amount={r.transferVariance} />
            </dd>
          </div>
        </dl>
      </div>

      {!r.isBalanced && (
        <div className="bento-card-static p-5">
          <h3 className="font-extrabold text-brand">ยอดยังไม่ตรงกัน</h3>
          <p className="mt-1 text-sm font-medium text-ink-2">
            ปิดรอบได้เมื่อยอดตรง หรือบันทึกคำอธิบายผลต่างไว้เป็นหลักฐาน
          </p>
          <textarea
            rows={2}
            value={varianceNote}
            onChange={e => setVarianceNote(e.target.value)}
            placeholder="เช่น เงินสดขาด 20 บาท นับซ้ำสองครั้งแล้ว แจ้งที่ประชุมคณะกรรมการวันที่…"
            className="neo-input mt-3"
          />
          {sessionVarianceNote && (
            <p className="mt-2 text-sm font-medium text-ink-2">
              คำอธิบายที่บันทึกไว้: {sessionVarianceNote}
            </p>
          )}
        </div>
      )}

      {unapprovedDeductions.length > 0 && (
        <p className="rounded-xl border-2 border-[var(--ink)] bg-tile-peach p-4 text-sm font-extrabold text-tile-peach-ink">
          มีรายการหักเบิกที่ยังไม่ได้รับอนุมัติ {unapprovedDeductions.length}{" "}
          รายการ — ต้องอนุมัติก่อนลงบัญชี
        </p>
      )}

      <div className="bento-card-static p-5">
        <h3 className="font-extrabold text-ink">ดำเนินการกับรอบนี้</h3>
        <p className="mt-1 text-sm font-medium text-ink-2">
          ลำดับงาน: นับ → ส่งตรวจ → ตรวจสอบ → ลงบัญชี → ปิดรอบ
          (ผู้นับไม่สามารถตรวจสอบรอบของตัวเองได้)
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {status === "counting" && (
            <button
              type="button"
              onClick={() => submitCount.mutate({ id: sessionId })}
              disabled={submitCount.isPending}
              className="btn-primary min-h-11 px-5 py-2.5 text-sm disabled:opacity-50"
            >
              ส่งนับให้ตรวจสอบ
            </button>
          )}
          {canManageFinance &&
            (status === "counted" || status === "verified") && (
              <button
                type="button"
                onClick={() => reopenCount.mutate({ id: sessionId })}
                disabled={reopenCount.isPending}
                className="btn-secondary min-h-11 px-5 py-2.5 text-sm disabled:opacity-50"
              >
                ส่งกลับไปนับใหม่
              </button>
            )}
          {canManageFinance && status === "counted" && (
            <>
              <button
                type="button"
                onClick={() => verify.mutate({ id: sessionId })}
                disabled={verify.isPending || isSelfVerifyBlocked}
                className="btn-primary min-h-11 px-5 py-2.5 text-sm disabled:opacity-50"
              >
                ตรวจสอบและรับรองยอด
              </button>
              {isSelfVerifyBlocked && (
                <p className="w-full text-xs font-bold text-brand">
                  ผู้ส่งยอดนับไม่สามารถรับรองยอดของตัวเองได้
                  (ต้องให้ผู้ตรวจสอบท่านอื่นกดรับรอง)
                </p>
              )}
            </>
          )}
          {canManageFinance && status === "verified" && (
            <button
              type="button"
              onClick={handlePost}
              disabled={
                post.isPending ||
                unapprovedDeductions.length > 0 ||
                !r.hasCarryForward ||
                r.cashOnHandActual === null ||
                (!r.isBalanced && !varianceNote.trim() && !sessionVarianceNote)
              }
              className="btn-primary min-h-11 px-5 py-2.5 text-sm disabled:opacity-50"
            >
              ลงบัญชีเข้าระบบ
            </button>
          )}
          {canManageFinance && status === "posted" && (
            <button
              type="button"
              onClick={handleClose}
              disabled={close.isPending}
              className="min-h-11 rounded-xl border-2 border-[var(--ink)] bg-ink px-5 py-2.5 text-sm font-extrabold text-white shadow-[2px_2px_0_var(--ink)] disabled:opacity-50"
            >
              ปิดรอบถาวร
            </button>
          )}
          {!canManageFinance &&
            status !== "counting" &&
            status !== "closed" && (
              <p className="text-sm font-medium text-ink-2">
                รอเหรัญญิกตรวจสอบและดำเนินการในขั้นตอนถัดไป
              </p>
            )}
          {status === "closed" && (
            <p className="text-sm font-extrabold text-income">
              รอบนี้ปิดเรียบร้อยแล้ว ข้อมูลถูกล็อกเพื่อการตรวจสอบ
            </p>
          )}
        </div>
      </div>

      {isUnposted && (
        <div className="bento-card-static p-5">
          <div className="flex items-center gap-2 mb-1.5">
            <RotateCcw className="h-4 w-4 text-brand" />
            <h4 className="font-extrabold text-ink">
              การจัดการรอบนับเงิน (งานค้าง / เริ่มนับใหม่)
            </h4>
          </div>
          <p className="text-xs sm:text-sm font-medium text-ink-2 leading-relaxed mb-4">
            หากพบว่ากรอกข้อมูลผิดพลาด หรือเป็นรอบที่เปิดทิ้งไว้ไม่ได้ใช้งาน
            สามารถเลือกล้างเพื่อนับใหม่ หรือลบรอบนี้ออกจากระบบได้
          </p>
          <div className="flex flex-wrap gap-2.5">
            <button
              type="button"
              onClick={handleResetThisSession}
              disabled={resetSessionPending}
              className="btn-secondary min-h-11 px-4 py-2 text-xs disabled:opacity-50"
            >
              <RotateCcw className="h-4 w-4 text-brand" />
              <span>ล้างข้อมูลเพื่อนับใหม่ (Recount)</span>
            </button>
            <button
              type="button"
              onClick={handleDeleteThisSession}
              disabled={deleteSessionPending}
              className="min-h-11 inline-flex items-center gap-1.5 rounded-xl border-2 border-[var(--ink)] bg-tile-peach px-4 py-2 text-xs font-extrabold text-tile-peach-ink shadow-[2px_2px_0_var(--ink)] hover:bg-danger hover:text-white transition-colors disabled:opacity-50"
            >
              <Trash2 className="h-4 w-4" />
              <span>ลบรอบนี้ (Delete Session)</span>
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
