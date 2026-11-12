import React from "react";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  RotateCcw,
  Trash2,
} from "lucide-react";
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
    openingCash?: number | null;
    openingBank?: number | null;
    cashOnHandExpected?: number | null;
    cashOnHandActual: number | null;
    cashOnHandVariance?: number | null;
    closingBankExpected?: number | null;
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

  // ── Pre-Post Checklist Evaluation (GAP-09) ──
  const isStatusVerified =
    status === "verified" || status === "posted" || status === "closed";
  const isDeductionsApproved = unapprovedDeductions.length === 0;
  const hasCarryForward =
    r.hasCarryForward &&
    r.openingCash !== null &&
    r.openingCash !== undefined &&
    r.openingBank !== null &&
    r.openingBank !== undefined;
  const hasCashCounted =
    r.cashOnHandActual !== null && r.cashOnHandActual !== undefined;
  const isReconciliationResolved =
    r.isBalanced || Boolean(effectiveVarianceNote);

  const checklistItems = [
    {
      id: "status",
      title: "สถานะรอบได้รับการตรวจสอบและรับรองยอดแล้ว",
      passed: isStatusVerified,
      detail: isStatusVerified
        ? "รับรองยอดเรียบร้อยแล้ว พร้อมสำหรับการลงบัญชี"
        : status === "counting"
          ? "รอบยังอยู่ในขั้นตอนการนับ ต้องกด 'ส่งนับให้ตรวจสอบ' ก่อน"
          : status === "counted"
            ? "รอบนับเสร็จแล้ว รอผู้ตรวจสอบรับรองยอด (ผู้นับไม่สามารถรับรองยอดของตนเองได้)"
            : "สถานะปัจจุบันยังไม่พร้อมลงบัญชี",
      actionHint:
        status === "counting"
          ? "กดปุ่ม 'ส่งนับให้ตรวจสอบ' ด้านล่าง"
          : status === "counted"
            ? isSelfVerifyBlocked
              ? "ต้องให้ผู้ตรวจสอบท่านอื่นเป็นผู้กดรับรองยอด"
              : "กดปุ่ม 'ตรวจสอบและรับรองยอด' ด้านล่าง"
            : undefined,
    },
    {
      id: "deductions",
      title: "รายการหักเบิกได้รับอนุมัติครบถ้วน",
      passed: isDeductionsApproved,
      detail: isDeductionsApproved
        ? "ไม่มีรายการหักเบิกค้างอนุมัติ"
        : `มีรายการหักเบิกค้างอนุมัติ ${unapprovedDeductions.length} รายการ ต้องอนุมัติก่อนลงบัญชี`,
      actionHint: !isDeductionsApproved
        ? "ไปที่แท็บ 'รายการหักเบิก' เพื่ออนุมัติรายการ"
        : undefined,
    },
    {
      id: "carry_forward",
      title: "บันทึกยอดยกมาครบถ้วน (เงินสดและเงินในบัญชี)",
      passed: hasCarryForward,
      detail: hasCarryForward
        ? `เงินสดยกมา ${fmtBaht(r.openingCash ?? 0)} / เงินในบัญชียกมา ${fmtBaht(r.openingBank ?? 0)}`
        : "ยังไม่ได้ระบุยอดยกมา กรุณากรอกยอดยกมาในส่วนยอดยกมา",
      actionHint: !hasCarryForward
        ? "กรอกยอดยกมาในส่วน 'สมุดยอดยกมาและยอดคงเหลือ'"
        : undefined,
    },
    {
      id: "cash_on_hand",
      title: "ตรวจนับเงินสดคงเหลือจริงในกล่องเงินสด",
      passed: hasCashCounted,
      detail: hasCashCounted
        ? `นับได้จริง ${fmtBaht(r.cashOnHandActual ?? 0)} (ยอดคาดการณ์ ${fmtBaht(r.cashOnHandExpected ?? 0)})`
        : "ยังไม่ได้ระบุยอดเงินสดคงเหลือจริงในกล่องหลังนับ",
      actionHint: !hasCashCounted
        ? "ระบุยอดเงินสดจริงในกล่องในส่วนยอดยกมา"
        : undefined,
    },
    {
      id: "reconciliation",
      title: "การกระทบยอดและการรับรองผลต่าง",
      passed: isReconciliationResolved,
      detail: r.isBalanced
        ? "ยอดเงินสดและเงินโอนตรงกันพอดี 100%"
        : effectiveVarianceNote
          ? `มีผลต่าง (บันทึกคำอธิบายแล้ว: "${effectiveVarianceNote}")`
          : "ยอดยังไม่ตรงกัน และยังไม่มีบันทึกคำอธิบายผลต่าง",
      actionHint: !isReconciliationResolved
        ? "กรอกคำอธิบายผลต่างในช่องด้านล่างเพื่อเป็นหลักฐาน"
        : undefined,
    },
  ];

  const pendingChecklist = checklistItems.filter(item => !item.passed);
  const canPost =
    canManageFinance &&
    status === "verified" &&
    isDeductionsApproved &&
    hasCarryForward &&
    hasCashCounted &&
    isReconciliationResolved;

  const handlePost = async () => {
    if (!canPost) return;
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
      {/* ── 1. Pre-Post Checklist Card (GAP-09) ── */}
      <div className="bento-card-static overflow-hidden">
        <div className="border-b-2 border-[var(--ink)] bg-paper-2 p-4 flex items-center justify-between">
          <div>
            <h2 className="font-extrabold text-ink text-base">
              รายการตรวจสอบความพร้อมก่อนลงบัญชี (Pre-Post Checklist)
            </h2>
            <p className="mt-0.5 text-xs font-medium text-ink-2">
              ตรวจสอบเงื่อนไขที่จำเป็นทุกข้อก่อนผ่านรายการเข้าสมุดบัญชีแยกประเภท
            </p>
          </div>
          <span
            className={`px-3 py-1 rounded-xl text-xs font-extrabold border border-[var(--ink)]  ${
              pendingChecklist.length === 0
                ? "bg-tile-mint text-tile-mint-ink"
                : "bg-tile-peach text-tile-peach-ink"
            }`}
          >
            {pendingChecklist.length === 0
              ? "พร้อมลงบัญชี"
              : `ค้างดำเนินการ ${pendingChecklist.length} ข้อ`}
          </span>
        </div>
        <ul className="divide-y divide-line">
          {checklistItems.map(item => (
            <li
              key={item.id}
              className={`p-3.5 sm:p-4 flex items-start gap-3 transition-colors ${
                item.passed ? "bg-surface" : "bg-paper-2/40"
              }`}
            >
              {item.passed ? (
                <CheckCircle2
                  className="size-5 shrink-0 text-income mt-0.5"
                  aria-label="ผ่านเกณฑ์"
                />
              ) : (
                <AlertCircle
                  className="size-5 shrink-0 text-brand mt-0.5"
                  aria-label="ยังไม่ผ่านเกณฑ์"
                />
              )}
              <div className="flex-1 space-y-0.5">
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`text-sm font-extrabold ${
                      item.passed ? "text-ink" : "text-brand"
                    }`}
                  >
                    {item.title}
                  </span>
                  <span
                    className={`text-xs font-bold px-2 py-0.5 rounded-md ${
                      item.passed
                        ? "bg-tile-mint/50 text-tile-mint-ink"
                        : "bg-tile-peach text-tile-peach-ink"
                    }`}
                  >
                    {item.passed ? "เรียบร้อย" : "ยังไม่เสร็จ"}
                  </span>
                </div>
                <p className="text-xs font-medium text-ink-2 leading-relaxed">
                  {item.detail}
                </p>
                {item.actionHint && (
                  <p className="text-xs font-bold text-brand mt-1 flex items-center gap-1">
                    <span>คำแนะนำ:</span>
                    <span>{item.actionHint}</span>
                  </p>
                )}
              </div>
            </li>
          ))}
        </ul>

        {/* Explain why posting is blocked if incomplete */}
        {pendingChecklist.length > 0 && status === "verified" && (
          <div className="border-t-2 border-[var(--ink)] bg-tile-peach/80 p-3.5 text-xs font-bold text-tile-peach-ink flex items-center gap-2">
            <AlertTriangle className="size-4 shrink-0" />
            <span>
              ปุ่มลงบัญชีถูกระงับชั่วคราวเนื่องจากยังมีขั้นตอนที่ต้องทำอีก{" "}
              {pendingChecklist.length} ข้อตามรายการด้านบน
            </span>
          </div>
        )}
      </div>

      {/* ── 2. Reconciliation Table (Expected vs. Counted) ── */}
      <div className="bento-card-static overflow-hidden">
        <h2 className="border-b-2 border-[var(--ink)] bg-paper-2 p-4 font-extrabold text-ink">
          ตารางกระทบยอดเงินถวายและผลต่าง (Reconciliation Table)
        </h2>
        <dl className="divide-y divide-line">
          {[
            {
              label: "ยอดถวายตามซองทั้งหมด (ทุกช่องทาง)",
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
            <div>
              <dt className="text-sm font-extrabold text-ink">
                ผลต่างเงินสด (นับได้จริง − ซองเงินสด)
              </dt>
              <p className="text-xs font-medium text-ink-2">
                นับได้ {fmtBaht(r.countedCashTotal)} เทียบซองเงินสด{" "}
                {fmtBaht(r.envelopeCashTotal)}
              </p>
            </div>
            <dd>
              <Variance amount={r.cashVariance} />
            </dd>
          </div>
          <div className="flex items-center justify-between gap-4 bg-paper-2 p-4">
            <div>
              <dt className="text-sm font-extrabold text-ink">
                ผลต่างเงินโอน (เข้าบัญชีจริง − ซองเงินโอน)
              </dt>
              <p className="text-xs font-medium text-ink-2">
                รายการโอนเข้าบัญชี เทียบซองเงินโอน{" "}
                {fmtBaht(r.envelopeTransferTotal)}
              </p>
            </div>
            <dd>
              <Variance amount={r.transferVariance} />
            </dd>
          </div>
          {r.cashOnHandActual !== null && r.cashOnHandActual !== undefined && (
            <div className="flex items-center justify-between gap-4 bg-paper-2 p-4">
              <div>
                <dt className="text-sm font-extrabold text-ink">
                  ผลต่างเงินสดในกล่อง (นับได้จริง − ยอดคาดการณ์)
                </dt>
                <p className="text-xs font-medium text-ink-2">
                  นับได้จริง {fmtBaht(r.cashOnHandActual)} เทียบยอดคาดการณ์{" "}
                  {fmtBaht(r.cashOnHandExpected ?? 0)}
                </p>
              </div>
              <dd>
                <Variance amount={r.cashOnHandVariance ?? 0} />
              </dd>
            </div>
          )}
        </dl>
      </div>

      {/* ── 3. Variance Explanation Box (If Not Balanced) ── */}
      {!r.isBalanced && (
        <div className="bento-card-static p-5">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="size-5 shrink-0 text-brand mt-0.5" />
            <div className="flex-1">
              <h3 className="font-extrabold text-brand">
                ยอดยังไม่ตรงกัน — จำเป็นต้องบันทึกคำอธิบายผลต่าง
              </h3>
              <p className="mt-1 text-xs sm:text-sm font-medium text-ink-2 leading-relaxed">
                ระบบไม่อนุญาตให้ปรับตัวเลขการเงินโดยอัตโนมัติ
                หากยอดนับจริงไม่ตรงกับซอง ให้แสดงผลต่างที่เกิดขึ้นจริง
                และบันทึกคำอธิบายสาเหตุไว้เป็นหลักฐานเพื่อการตรวจสอบ
              </p>
            </div>
          </div>
          <textarea
            rows={2}
            value={varianceNote}
            onChange={e => setVarianceNote(e.target.value)}
            placeholder="เช่น เงินสดขาด 20 บาท นับซ้ำสองครั้งแล้ว แจ้งที่ประชุมคณะกรรมการวันที่…"
            className="neo-input mt-3"
          />
          {sessionVarianceNote && (
            <p className="mt-2 text-xs sm:text-sm font-medium text-ink-2">
              คำอธิบายที่บันทึกไว้: {sessionVarianceNote}
            </p>
          )}
        </div>
      )}

      {unapprovedDeductions.length > 0 && (
        <p className="rounded-xl border border-[var(--ink)] bg-tile-peach p-4 text-sm font-extrabold text-tile-peach-ink">
          มีรายการหักเบิกที่ยังไม่ได้รับอนุมัติ {unapprovedDeductions.length}{" "}
          รายการ — ต้องอนุมัติก่อนลงบัญชี
        </p>
      )}

      {/* ── 4. Workflow Actions ── */}
      <div className="bento-card-static p-5">
        <h3 className="font-extrabold text-ink">ดำเนินการกับรอบนี้</h3>
        <p className="mt-1 text-sm font-medium text-ink-2">
          ลำดับงาน: นับ → ส่งตรวจ → ตรวจสอบและรับรอง → ลงบัญชี → ปิดรอบ
          (ผู้นับไม่สามารถตรวจสอบรอบของตัวเองได้)
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {status === "counting" && (
            <button
              type="button"
              onClick={() => submitCount.mutate({ id: sessionId })}
              disabled={submitCount.isPending}
              className="btn-primary min-h-11 px-5 py-2.5 text-sm disabled:opacity-50 cursor-pointer"
            >
              {submitCount.isPending ? "กำลังส่ง..." : "ส่งนับให้ตรวจสอบ"}
            </button>
          )}
          {canManageFinance &&
            (status === "counted" || status === "verified") && (
              <button
                type="button"
                onClick={() => reopenCount.mutate({ id: sessionId })}
                disabled={reopenCount.isPending}
                className="btn-secondary min-h-11 px-5 py-2.5 text-sm disabled:opacity-50 cursor-pointer"
              >
                {reopenCount.isPending
                  ? "กำลังดำเนินการ..."
                  : "ส่งกลับไปนับใหม่"}
              </button>
            )}
          {canManageFinance && status === "counted" && (
            <>
              <button
                type="button"
                onClick={() => verify.mutate({ id: sessionId })}
                disabled={verify.isPending || isSelfVerifyBlocked}
                className="btn-primary min-h-11 px-5 py-2.5 text-sm disabled:opacity-50 cursor-pointer"
              >
                {verify.isPending ? "กำลังรับรองยอด..." : "ตรวจสอบและรับรองยอด"}
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
              disabled={!canPost || post.isPending}
              className="btn-primary min-h-11 px-5 py-2.5 text-sm disabled:opacity-50 cursor-pointer"
            >
              {post.isPending ? "กำลังลงบัญชี..." : "ลงบัญชีเข้าระบบ"}
            </button>
          )}
          {canManageFinance && status === "posted" && (
            <button
              type="button"
              onClick={handleClose}
              disabled={close.isPending}
              className="min-h-11 rounded-xl border border-[var(--ink)] bg-ink px-5 py-2.5 text-sm font-extrabold text-white disabled:opacity-50 cursor-pointer"
            >
              {close.isPending ? "กำลังปิดรอบ..." : "ปิดรอบถาวร"}
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
              className="btn-secondary min-h-11 px-4 py-2 text-xs disabled:opacity-50 cursor-pointer"
            >
              <RotateCcw className="h-4 w-4 text-brand" />
              <span>ล้างข้อมูลเพื่อนับใหม่ (Recount)</span>
            </button>
            <button
              type="button"
              onClick={handleDeleteThisSession}
              disabled={deleteSessionPending}
              className="min-h-11 inline-flex items-center gap-1.5 rounded-xl border border-[var(--ink)] bg-tile-peach px-4 py-2 text-xs font-extrabold text-tile-peach-ink hover:bg-danger hover:text-white transition-colors disabled:opacity-50 cursor-pointer"
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
