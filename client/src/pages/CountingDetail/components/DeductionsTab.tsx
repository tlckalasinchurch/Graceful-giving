import React, { useState } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { MoneyDisplay, StatusBadge } from "@/components/common/CommonUI";
import { EXPENSE_CATEGORIES } from "@shared/categories";
import { fmtBaht } from "./countingUtils";
import { NativeSelect } from "@/components/ui/native-select";
import { Swal } from "@/lib/sweetalert";

interface DeductionsTabProps {
  sessionId: number;
  editable: boolean;
  canApprove?: boolean;
  currentUserId?: number;
  deductions: Array<{
    id: number;
    sessionId: number;
    purpose: string;
    reason: string;
    amount: number;
    paidTo: string;
    requestedBy?: number | null;
    approvedBy?: number | null;
  }>;
  funds: Array<{ id: number; name: string }>;
  deductionTotal: number;
  addDeduction: {
    mutate: (vars: any, options?: any) => void;
    isPending: boolean;
  };
  removeDeduction: {
    mutate: (vars: { id: number; sessionId: number }) => void;
    isPending: boolean;
  };
  approveDeduction: {
    mutate: (vars: { id: number }) => void;
    isPending: boolean;
  };
}

export function DeductionsTab({
  sessionId,
  editable,
  canApprove = true,
  currentUserId,
  deductions,
  funds,
  deductionTotal,
  addDeduction,
  removeDeduction,
  approveDeduction,
}: DeductionsTabProps) {
  const [dPurpose, setDPurpose] = useState("");
  const [dReason, setDReason] = useState("");
  const [dPaidTo, setDPaidTo] = useState("");
  const [dAmount, setDAmount] = useState("");
  const [dCategory, setDCategory] = useState<string>("other");
  const [dFundId, setDFundId] = useState("");

  const handleRemoveDeduction = async (deduction: {
    id: number;
    purpose: string;
    amount: number;
  }) => {
    const confirmed = await Swal.confirm(
      "ยืนยันการลบรายการเบิก?",
      `ต้องการลบ "${deduction.purpose}" จำนวน ${fmtBaht(deduction.amount)} ออกจากรอบนับนี้หรือไม่?`,
      {
        icon: "warning",
        confirmButtonText: "ลบรายการนี้",
        confirmButtonColor: "var(--destructive)",
        cancelButtonText: "ยกเลิก",
      }
    );
    if (confirmed) {
      removeDeduction.mutate({ id: deduction.id, sessionId });
    }
  };

  return (
    <section className="space-y-4">
      <p className="rounded-xl border-2 border-[var(--ink)] bg-paper-2 p-4 text-sm font-medium text-ink-2">
        เงินที่เบิกจากถุงถวายก่อนนำฝาก ยอดถวายจะไม่หายจากระบบ — ระบบตรวจว่า
        นับเงินสดได้ − หักเบิก = ยอดนำฝาก
      </p>

      {editable && (
        <form
          onSubmit={event => {
            event.preventDefault();
            const value = Number(dAmount);
            if (!Number.isFinite(value) || value <= 0) {
              toast.error("กรุณาระบุจำนวนเงินที่ถูกต้อง");
              return;
            }
            if (!dFundId) {
              toast.error("กรุณาเลือกกองทุนที่ตัดรายการนี้");
              return;
            }
            addDeduction.mutate(
              {
                sessionId,
                purpose: dPurpose.trim(),
                reason: dReason.trim(),
                amount: value,
                paidTo: dPaidTo.trim(),
                category: dCategory as "other",
                fundId: Number(dFundId),
              },
              {
                onSuccess: () => {
                  setDPurpose("");
                  setDReason("");
                  setDPaidTo("");
                  setDAmount("");
                },
              }
            );
          }}
          className="bento-card-static p-5 md:p-6"
        >
          <h2 className="mb-4 display text-base text-ink">
            บันทึกรายการหักเบิก
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm font-extrabold text-ink">
              รายการที่เบิก *
              <input
                required
                minLength={2}
                value={dPurpose}
                onChange={e => setDPurpose(e.target.value)}
                placeholder="เช่น ค่าน้ำดื่มวันอาทิตย์"
                className="neo-input mt-1 font-normal"
              />
            </label>
            <label className="text-sm font-extrabold text-ink">
              เบิกให้ใคร *
              <input
                required
                minLength={2}
                value={dPaidTo}
                onChange={e => setDPaidTo(e.target.value)}
                placeholder="ชื่อผู้รับเงิน"
                className="neo-input mt-1 font-normal"
              />
            </label>
            <label className="text-sm font-extrabold text-ink">
              จำนวนเงิน *
              <input
                type="number"
                required
                min="0.25"
                step="0.25"
                value={dAmount}
                onChange={e => setDAmount(e.target.value)}
                className="neo-input mt-1 font-bold tabular-nums text-danger"
              />
            </label>
            <label className="text-sm font-extrabold text-ink">
              หมวดหมู่รายจ่าย
              <NativeSelect
                value={dCategory}
                onChange={e => setDCategory(e.target.value)}
                className="mt-1"
              >
                {EXPENSE_CATEGORIES.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </NativeSelect>
            </label>
            <label className="text-sm font-extrabold text-ink">
              ตัดจากกองทุน *
              <NativeSelect
                required
                value={dFundId}
                onChange={e => setDFundId(e.target.value)}
                className="mt-1"
              >
                <option value="" disabled>
                  — เลือกกองทุน —
                </option>
                {funds.map(f => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </NativeSelect>
            </label>
            <label className="text-sm font-extrabold text-ink md:col-span-2">
              เหตุผล *
              <textarea
                required
                minLength={2}
                rows={2}
                value={dReason}
                onChange={e => setDReason(e.target.value)}
                placeholder="อธิบายเหตุผลที่ต้องเบิกจากถุงถวายทันที"
                className="neo-input mt-1 font-normal"
              />
            </label>
          </div>
          <button
            type="submit"
            disabled={addDeduction.isPending || !dFundId}
            className="btn-primary mt-4 min-h-11 px-5 py-2.5 text-sm disabled:opacity-50"
          >
            {addDeduction.isPending ? "กำลังบันทึก…" : "เพิ่มรายการเบิก"}
          </button>
        </form>
      )}

      <div className="bento-card-static overflow-hidden">
        <div className="flex items-center justify-between border-b-2 border-[var(--ink)] bg-paper-2 p-4">
          <h2 className="font-extrabold text-ink">
            รายการหักเบิก ({deductions.length})
          </h2>
          <span className="text-sm font-extrabold text-danger tabular-nums">
            รวม {fmtBaht(deductionTotal)}
          </span>
        </div>
        {deductions.length === 0 ? (
          <p className="p-8 text-center text-sm font-medium text-ink-2">
            ไม่มีการหักเบิกในรอบนี้ เงินถวายทั้งหมดจะถูกนำฝาก
          </p>
        ) : (
          <ul className="divide-y divide-line">
            {deductions.map(deduction => (
              <li key={deduction.id} className="space-y-2 p-4 hover:bg-paper-2/40">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-extrabold text-ink">
                      {deduction.purpose}
                    </p>
                    <p className="text-sm font-medium text-ink-2">
                      เบิกให้ {deduction.paidTo}
                    </p>
                    <p className="mt-1 text-sm font-medium text-ink-2">
                      {deduction.reason}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <MoneyDisplay amount={deduction.amount} type="expense" />
                    {editable && (
                      <button
                        type="button"
                        aria-label="ลบรายการเบิกนี้"
                        onClick={() => void handleRemoveDeduction(deduction)}
                        disabled={removeDeduction.isPending}
                        className="flex size-10 items-center justify-center rounded-xl border border-[var(--ink)] bg-tile-peach text-tile-peach-ink hover:bg-danger hover:text-white disabled:opacity-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  {deduction.approvedBy ? (
                    <StatusBadge status="approved" label="อนุมัติแล้ว" />
                  ) : (
                    <>
                      <StatusBadge status="pending" label="รออนุมัติ" />
                      {canApprove &&
                      (currentUserId === undefined ||
                        deduction.requestedBy !== currentUserId) ? (
                        <button
                          type="button"
                          onClick={() =>
                            approveDeduction.mutate({ id: deduction.id })
                          }
                          disabled={approveDeduction.isPending}
                          className="btn-secondary min-h-10 px-3 py-2 text-xs text-brand disabled:opacity-50"
                        >
                          อนุมัติรายการนี้
                        </button>
                      ) : canApprove &&
                        currentUserId !== undefined &&
                        deduction.requestedBy === currentUserId ? (
                        <span className="text-xs font-medium text-ink-2">
                          ผู้ขอเบิกไม่สามารถอนุมัติรายการของตัวเองได้
                        </span>
                      ) : null}
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
