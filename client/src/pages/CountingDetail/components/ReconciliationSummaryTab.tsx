import React from "react";
import { RotateCcw, Trash2 } from "lucide-react";
import { fmtBaht, Variance } from "./countingUtils";

interface ReconciliationSummaryTabProps {
  sessionId: number;
  status: string | undefined;
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
    depositVariance: number;
    countedCashTotal: number;
    deductionTotal: number;
    expectedDeposit: number;
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
  return (
    <section className="space-y-4">
      <div className="overflow-hidden rounded-2xl border border-hairline bg-white">
        <h2 className="border-b border-hairline p-4 font-bold text-foreground">
          ตารางกระทบยอด
        </h2>
        <dl className="divide-y divide-[#e0e0e0]">
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
              <dt className="text-sm text-secondary-foreground">{row.label}</dt>
              <dd className="text-sm font-bold tabular-nums text-foreground">
                {row.value}
              </dd>
            </div>
          ))}
          <div className="flex items-center justify-between gap-4 bg-background p-4">
            <dt className="text-sm font-bold text-foreground">
              ผลต่างเงินสด (นับได้ − ซองเงินสด)
            </dt>
            <dd>
              <Variance amount={r.cashVariance} />
            </dd>
          </div>
          <div className="flex items-center justify-between gap-4 bg-background p-4">
            <dt className="text-sm font-bold text-foreground">
              ผลต่างเงินโอน (เข้าบัญชี − ซองโอน)
            </dt>
            <dd>
              <Variance amount={r.transferVariance} />
            </dd>
          </div>
          <div className="flex items-center justify-between gap-4 bg-background p-4">
            <dt className="text-sm font-bold text-foreground">
              ผลต่างการฝาก (ฝากจริง − ที่ต้องนำฝาก)
            </dt>
            <dd>
              <Variance amount={r.depositVariance} />
            </dd>
          </div>
          <div className="flex items-center justify-between gap-4 border-t-2 border-hairline p-4">
            <dt className="font-bold text-foreground">
              นับเงินสดได้ − หักเบิก = ยอดนำฝาก
            </dt>
            <dd className="text-sm font-bold tabular-nums text-foreground">
              {fmtBaht(r.countedCashTotal)} − {fmtBaht(r.deductionTotal)} ={" "}
              {fmtBaht(r.expectedDeposit)}
            </dd>
          </div>
        </dl>
      </div>

      {!r.isBalanced && (
        <div className="rounded-2xl border border-warning-border bg-surface-subtle p-5">
          <h3 className="font-bold text-warning">ยอดยังไม่ตรงกัน</h3>
          <p className="mt-1 text-sm text-warning">
            ปิดรอบได้เมื่อยอดตรง หรือบันทึกคำอธิบายผลต่างไว้เป็นหลักฐาน
          </p>
          <textarea
            rows={2}
            value={varianceNote}
            onChange={e => setVarianceNote(e.target.value)}
            placeholder="เช่น เงินสดขาด 20 บาท นับซ้ำสองครั้งแล้ว แจ้งที่ประชุมมัคนายกวันที่…"
            className="mt-3 w-full rounded-xl border border-hairline bg-white p-3 text-sm text-foreground"
          />
          {sessionVarianceNote && (
            <p className="mt-2 text-sm text-secondary-foreground">
              คำอธิบายที่บันทึกไว้: {sessionVarianceNote}
            </p>
          )}
        </div>
      )}

      {unapprovedDeductions.length > 0 && (
        <p className="rounded-2xl border border-error-border bg-error-bg p-4 text-sm font-bold text-[#A33B2A]">
          มีรายการหักเบิกที่ยังไม่ได้รับอนุมัติ {unapprovedDeductions.length}{" "}
          รายการ — ต้องอนุมัติก่อนลงบัญชี
        </p>
      )}

      <div className="rounded-2xl border border-hairline bg-white p-5">
        <h3 className="font-bold text-foreground">ดำเนินการกับรอบนี้</h3>
        <p className="mt-1 text-sm text-secondary-foreground">
          ลำดับงาน: นับ → ส่งตรวจ → ตรวจสอบ → ลงบัญชี → ปิดรอบ
          (ผู้นับไม่สามารถตรวจสอบรอบของตัวเองได้)
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {status === "counting" && (
            <button
              type="button"
              onClick={() => submitCount.mutate({ id: sessionId })}
              disabled={submitCount.isPending}
              className="min-h-11 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50"
            >
              ส่งนับให้ตรวจสอบ
            </button>
          )}
          {(status === "counted" || status === "verified") && (
            <button
              type="button"
              onClick={() => reopenCount.mutate({ id: sessionId })}
              disabled={reopenCount.isPending}
              className="min-h-11 rounded-2xl border border-hairline bg-surface-subtle px-5 py-2.5 text-sm font-bold text-secondary-foreground disabled:opacity-50"
            >
              ส่งกลับไปนับใหม่
            </button>
          )}
          {status === "counted" && (
            <button
              type="button"
              onClick={() => verify.mutate({ id: sessionId })}
              disabled={verify.isPending}
              className="min-h-11 rounded-xl bg-[#2F7A45] px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50"
            >
              ตรวจสอบและรับรองยอด
            </button>
          )}
          {status === "verified" && (
            <button
              type="button"
              onClick={() =>
                post.mutate({
                  id: sessionId,
                  varianceNote: varianceNote.trim() || undefined,
                })
              }
              disabled={
                post.isPending ||
                unapprovedDeductions.length > 0 ||
                (!r.isBalanced && !varianceNote.trim() && !sessionVarianceNote)
              }
              className="min-h-11 rounded-2xl bg-[#1F5C33] px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50"
            >
              ลงบัญชีเข้าระบบ
            </button>
          )}
          {status === "posted" && (
            <button
              type="button"
              onClick={() => close.mutate({ id: sessionId })}
              disabled={close.isPending}
              className="min-h-11 rounded-2xl bg-[#51443A] px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50"
            >
              ปิดรอบถาวร
            </button>
          )}
          {status === "closed" && (
            <p className="text-sm font-bold text-success">
              รอบนี้ปิดเรียบร้อยแล้ว ข้อมูลถูกล็อกเพื่อการตรวจสอบ
            </p>
          )}
        </div>
      </div>

      {isUnposted && (
        <div className="rounded-2xl border border-hairline bg-white p-5">
          <div className="flex items-center gap-2 mb-1.5">
            <RotateCcw className="h-4 w-4 text-warning" />
            <h4 className="font-bold text-foreground">
              การจัดการรอบนับเงิน (งานค้าง / เริ่มนับใหม่)
            </h4>
          </div>
          <p className="text-xs sm:text-sm text-secondary-foreground leading-relaxed mb-4">
            หากพบว่ากรอกข้อมูลผิดพลาด หรือเป็นรอบที่เปิดทิ้งไว้ไม่ได้ใช้งาน
            สามารถเลือกล้างเพื่อนับใหม่ หรือลบรอบนี้ออกจากระบบได้
          </p>
          <div className="flex flex-wrap gap-2.5">
            <button
              type="button"
              onClick={handleResetThisSession}
              disabled={resetSessionPending}
              className="min-h-11 inline-flex items-center gap-1.5 rounded-2xl border border-hairline bg-surface-subtle px-4 py-2 text-xs font-bold text-warning hover:bg-accent transition-colors disabled:opacity-50"
            >
              <RotateCcw className="h-4 w-4 text-warning" />
              <span>ล้างข้อมูลเพื่อนับใหม่ (Recount)</span>
            </button>
            <button
              type="button"
              onClick={handleDeleteThisSession}
              disabled={deleteSessionPending}
              className="min-h-11 inline-flex items-center gap-1.5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-bold text-error hover:bg-rose-100 transition-colors disabled:opacity-50"
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
