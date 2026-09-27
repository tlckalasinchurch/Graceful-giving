import React from "react";
import {
  BadgeCheck,
  BookCheck,
  CheckCircle2,
  Lock,
  RotateCcw,
  Scale,
  Send,
  Trash2,
} from "lucide-react";
import { ActionButton, fieldClass } from "@/components/common/CommonUI";
import { ComparisonCard, fmtBaht } from "./countingUtils";

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
    actualCashDeposit: number;
    actualTransferIn: number;
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
      {/* Overall result */}
      {r.isBalanced ? (
        <div
          role="status"
          className="flex items-center gap-3 rounded-2xl border border-[#C8E6C9] bg-[#E8F5E9] p-4 text-[#1B5E20]"
        >
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#2E7D32] text-white">
            <CheckCircle2 className="size-5" aria-hidden="true" />
          </span>
          <div>
            <p className="font-bold">ยอดตรงกันทุกช่องทาง</p>
            <p className="text-sm">เงินสด เงินโอน และยอดนำฝาก ตรงกับซองถวาย</p>
          </div>
        </div>
      ) : (
        <div
          role="alert"
          className="flex items-center gap-3 rounded-2xl border border-[#FDE68A] bg-[#FEF3C7] p-4 text-[#92400E]"
        >
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#F59E0B] text-white">
            <Scale className="size-5" aria-hidden="true" />
          </span>
          <div>
            <p className="font-bold">
              พบผลต่าง{" "}
              {
                [r.cashVariance, r.transferVariance, r.depositVariance].filter(
                  v => v !== 0
                ).length
              }{" "}
              รายการ
            </p>
            <p className="text-sm">
              ตรวจรายการที่ไฮไลต์ด้านล่าง แล้วแก้ไขหรือบันทึกคำอธิบายก่อนลงบัญชี
            </p>
          </div>
        </div>
      )}

      {/* Actual vs expected, one card per check */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <ComparisonCard
          title="เงินสด"
          actualLabel="ยอดที่นับได้จริง"
          actual={r.countedCashTotal}
          expectedLabel="ยอดตามซองเงินสด"
          expected={r.envelopeCashTotal}
          hint="นับธนบัตรและเหรียญซ้ำอีกครั้ง และตรวจว่ากรอกซองเงินสดครบทุกซอง"
        />
        <ComparisonCard
          title="เงินโอน"
          actualLabel="ยอดเข้าบัญชีจริง"
          actual={r.actualTransferIn}
          expectedLabel="ยอดตามซอง/สลิปโอน"
          expected={r.envelopeTransferTotal}
          hint="เทียบรายการเงินเข้าในสมุดบัญชีกับสลิปโอนของแต่ละซอง"
        />
        <ComparisonCard
          title="ยอดนำฝาก"
          actualLabel="ฝากเข้าธนาคารจริง"
          actual={r.actualCashDeposit}
          expectedLabel="ยอดที่ต้องนำฝาก"
          expected={r.expectedDeposit}
          hint="ยอดที่ต้องนำฝาก = เงินสดที่นับได้ − รายการหักเบิก ตรวจใบนำฝากและรายการหักเบิก"
        />
      </div>

      {/* Breakdown */}
      <div className="overflow-hidden rounded-2xl border border-[#E7DCC8] bg-card shadow-xs">
        <h2 className="border-b border-[#E7DCC8] px-5 py-4 font-bold text-[#171311]">
          รายละเอียดยอดตามซอง
        </h2>
        <dl className="divide-y divide-[#EFE5D3]">
          {[
            { label: "ซองเงินสด", value: r.envelopeCashTotal },
            { label: "ซองเงินโอน", value: r.envelopeTransferTotal },
            { label: "ซองเช็ค", value: r.envelopeCheckTotal },
          ].map(row => (
            <div
              key={row.label}
              className="flex items-center justify-between gap-4 px-5 py-3"
            >
              <dt className="text-sm text-[#51443A]">{row.label}</dt>
              <dd className="text-sm font-semibold tabular-nums text-[#171311]">
                {fmtBaht(row.value)}
              </dd>
            </div>
          ))}
          <div className="flex items-center justify-between gap-4 bg-[#FFF4D6]/60 px-5 py-3">
            <dt className="text-sm font-bold text-[#171311]">
              ยอดถวายรวมทุกช่องทาง
            </dt>
            <dd className="font-bold tabular-nums text-[#171311]">
              {fmtBaht(r.offeringTotal)}
            </dd>
          </div>
          <div className="flex flex-col gap-1 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
            <dt className="text-sm text-[#51443A]">
              นับได้ − หักเบิก = ยอดที่ต้องนำฝาก
            </dt>
            <dd className="text-sm font-semibold tabular-nums text-[#171311]">
              {fmtBaht(r.countedCashTotal)} − {fmtBaht(r.deductionTotal)} ={" "}
              {fmtBaht(r.expectedDeposit)}
            </dd>
          </div>
        </dl>
      </div>

      {!r.isBalanced && (
        <div className="rounded-2xl border border-[#FDE68A] bg-[#FFFBEB] p-5">
          <label
            htmlFor="variance-note"
            className="block font-bold text-[#92400E]"
          >
            คำอธิบายผลต่าง
          </label>
          <p className="mt-1 text-sm text-[#92400E]">
            ลงบัญชีได้เมื่อยอดตรง หรือบันทึกคำอธิบายผลต่างไว้เป็นหลักฐาน
          </p>
          <textarea
            id="variance-note"
            rows={3}
            value={varianceNote}
            onChange={e => setVarianceNote(e.target.value)}
            placeholder="เช่น เงินสดขาด 20 บาท นับซ้ำสองครั้งแล้ว แจ้งที่ประชุมมัคนายกวันที่…"
            className={`mt-3 ${fieldClass}`}
          />
          {sessionVarianceNote && (
            <p className="mt-2 text-sm text-[#51443A]">
              คำอธิบายที่บันทึกไว้: {sessionVarianceNote}
            </p>
          )}
        </div>
      )}

      {unapprovedDeductions.length > 0 && (
        <p className="rounded-2xl border border-[#F8C8C5] bg-[#FEECEB] p-4 text-sm font-bold text-[#C8372D]">
          มีรายการหักเบิกที่ยังไม่ได้รับอนุมัติ {unapprovedDeductions.length}{" "}
          รายการ — ต้องอนุมัติก่อนลงบัญชี
        </p>
      )}

      <div className="rounded-2xl border border-[#E7DCC8] bg-card p-5 shadow-xs">
        <h3 className="font-bold text-[#171311]">ดำเนินการกับรอบนี้</h3>
        <p className="mt-1 text-sm text-[#51443A]">
          ลำดับงาน: นับ → ส่งตรวจ → ตรวจสอบ → ลงบัญชี → ปิดรอบ
          (ผู้นับไม่สามารถตรวจสอบรอบของตัวเองได้)
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {status === "counting" && (
            <ActionButton
              variant="primary"
              icon={Send}
              onClick={() => submitCount.mutate({ id: sessionId })}
              disabled={false}
              loading={submitCount.isPending}
              loadingText="กำลังดำเนินการ..."
            >
              ส่งนับให้ตรวจสอบ
            </ActionButton>
          )}
          {(status === "counted" || status === "verified") && (
            <ActionButton
              variant="secondary"
              icon={RotateCcw}
              onClick={() => reopenCount.mutate({ id: sessionId })}
              disabled={false}
              loading={reopenCount.isPending}
              loadingText="กำลังดำเนินการ..."
            >
              ส่งกลับไปนับใหม่
            </ActionButton>
          )}
          {status === "counted" && (
            <ActionButton
              variant="success"
              icon={BadgeCheck}
              onClick={() => verify.mutate({ id: sessionId })}
              disabled={false}
              loading={verify.isPending}
              loadingText="กำลังดำเนินการ..."
            >
              ตรวจสอบและรับรองยอด
            </ActionButton>
          )}
          {status === "verified" && (
            <ActionButton
              variant="success"
              icon={BookCheck}
              onClick={() =>
                post.mutate({
                  id: sessionId,
                  varianceNote: varianceNote.trim() || undefined,
                })
              }
              disabled={
                unapprovedDeductions.length > 0 ||
                (!r.isBalanced && !varianceNote.trim() && !sessionVarianceNote)
              }
              loading={post.isPending}
              loadingText="กำลังดำเนินการ..."
            >
              ลงบัญชีเข้าระบบ
            </ActionButton>
          )}
          {status === "posted" && (
            <ActionButton
              variant="secondary"
              icon={Lock}
              onClick={() => close.mutate({ id: sessionId })}
              disabled={false}
              loading={close.isPending}
              loadingText="กำลังดำเนินการ..."
            >
              ปิดรอบถาวร
            </ActionButton>
          )}
          {status === "closed" && (
            <p className="text-sm font-bold text-[#2D6A2E]">
              รอบนี้ปิดเรียบร้อยแล้ว ข้อมูลถูกล็อกเพื่อการตรวจสอบ
            </p>
          )}
        </div>
      </div>

      {isUnposted && (
        <div className="rounded-2xl border border-[#E7DCC8] bg-card p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-1.5">
            <RotateCcw className="h-4 w-4 text-[#9F3B0F]" />
            <h4 className="font-bold text-foreground">
              การจัดการรอบนับเงิน (งานค้าง / เริ่มนับใหม่)
            </h4>
          </div>
          <p className="text-xs sm:text-sm text-[#51443A] leading-relaxed mb-4">
            หากพบว่ากรอกข้อมูลผิดพลาด หรือเป็นรอบที่เปิดทิ้งไว้ไม่ได้ใช้งาน
            สามารถเลือกล้างเพื่อนับใหม่ หรือลบรอบนี้ออกจากระบบได้
          </p>
          <div className="flex flex-wrap gap-2.5">
            <button
              type="button"
              onClick={handleResetThisSession}
              disabled={resetSessionPending}
              className="min-h-11 inline-flex items-center gap-1.5 rounded-xl border border-[#E7DCC8] bg-[#FFF4D6] px-4 py-2 text-sm font-semibold text-[#9F3B0F] shadow-2xs hover:bg-[#FFF4D6] transition-all duration-200 ease-in-out disabled:opacity-50"
            >
              <RotateCcw className="h-4 w-4 text-[#9F3B0F]" />
              <span>ล้างข้อมูลเพื่อนับใหม่ (Recount)</span>
            </button>
            <button
              type="button"
              onClick={handleDeleteThisSession}
              disabled={deleteSessionPending}
              className="min-h-11 inline-flex items-center gap-1.5 rounded-xl border border-[#F8C8C5] bg-[#FEECEB] px-4 py-2 text-sm font-semibold text-[#C8372D] shadow-2xs hover:bg-[#FEECEB] transition-all duration-200 ease-in-out disabled:opacity-50"
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
