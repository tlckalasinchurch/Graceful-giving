import React, { useState } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { MoneyDisplay, StatusBadge } from "@/components/common/CommonUI";
import { EXPENSE_CATEGORIES } from "@shared/categories";
import { fmtBaht } from "./countingUtils";
import { NativeSelect } from "@/components/ui/native-select";

interface DeductionsTabProps {
  sessionId: number;
  editable: boolean;
  deductions: Array<{
    id: number;
    sessionId: number;
    purpose: string;
    reason: string;
    amount: number;
    paidTo: string;
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

  return (
    <section className="space-y-4">
      <p className="rounded-2xl border border-border bg-background p-4 text-sm text-foreground-soft">
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
          className="rounded-2xl border border-border bg-white p-5 shadow-sm md:p-6"
        >
          <h2 className="mb-4 font-bold text-foreground">
            บันทึกรายการหักเบิก
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm font-semibold text-foreground-soft">
              รายการที่เบิก *
              <input
                required
                minLength={2}
                value={dPurpose}
                onChange={e => setDPurpose(e.target.value)}
                placeholder="เช่น ค่าน้ำดื่มวันอาทิตย์"
                className="mt-1 w-full rounded-xl border border-border p-3 text-sm font-normal text-foreground"
              />
            </label>
            <label className="text-sm font-semibold text-foreground-soft">
              เบิกให้ใคร *
              <input
                required
                minLength={2}
                value={dPaidTo}
                onChange={e => setDPaidTo(e.target.value)}
                placeholder="ชื่อผู้รับเงิน"
                className="mt-1 w-full rounded-xl border border-border p-3 text-sm font-normal text-foreground"
              />
            </label>
            <label className="text-sm font-semibold text-foreground-soft">
              จำนวนเงิน *
              <input
                type="number"
                inputMode="decimal"
                required
                min="0.25"
                step="0.25"
                value={dAmount}
                onChange={e => setDAmount(e.target.value)}
                className="mt-1 w-full rounded-xl border border-border p-3 text-base font-bold tabular-nums text-destructive"
              />
            </label>
            <label className="text-sm font-semibold text-foreground-soft">
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
            <label className="text-sm font-semibold text-foreground-soft">
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
            <label className="text-sm font-semibold text-foreground-soft md:col-span-2">
              เหตุผล *
              <textarea
                required
                minLength={2}
                rows={2}
                value={dReason}
                onChange={e => setDReason(e.target.value)}
                placeholder="อธิบายเหตุผลที่ต้องเบิกจากถุงถวายทันที"
                className="mt-1 w-full rounded-xl border border-border p-3 text-sm font-normal text-foreground"
              />
            </label>
          </div>
          <button
            type="submit"
            disabled={addDeduction.isPending || !dFundId}
            className="mt-4 min-h-11 rounded-xl bg-success px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50"
          >
            {addDeduction.isPending ? "กำลังบันทึก…" : "เพิ่มรายการเบิก"}
          </button>
        </form>
      )}

      <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-border p-4">
          <h2 className="font-bold text-foreground">
            รายการหักเบิก ({deductions.length})
          </h2>
          <span className="text-sm font-bold text-destructive">
            รวม {fmtBaht(deductionTotal)}
          </span>
        </div>
        {deductions.length === 0 ? (
          <p className="p-8 text-center text-sm text-foreground-soft">
            ไม่มีการหักเบิกในรอบนี้ เงินถวายทั้งหมดจะถูกนำฝาก
          </p>
        ) : (
          <ul className="divide-y divide-divider">
            {deductions.map(deduction => (
              <li key={deduction.id} className="space-y-2 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-bold text-foreground">
                      {deduction.purpose}
                    </p>
                    <p className="text-sm text-foreground-soft">
                      เบิกให้ {deduction.paidTo}
                    </p>
                    <p className="mt-1 text-sm text-foreground-soft">
                      {deduction.reason}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <MoneyDisplay amount={deduction.amount} type="expense" />
                    {editable && (
                      <button
                        type="button"
                        aria-label="ลบรายการเบิกนี้"
                        onClick={() =>
                          removeDeduction.mutate({
                            id: deduction.id,
                            sessionId,
                          })
                        }
                        disabled={removeDeduction.isPending}
                        className="flex size-11 items-center justify-center rounded-xl text-destructive hover:bg-destructive-soft disabled:opacity-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {deduction.approvedBy ? (
                    <StatusBadge status="approved" label="อนุมัติแล้ว" />
                  ) : (
                    <>
                      <StatusBadge status="pending" label="รออนุมัติ" />
                      <button
                        type="button"
                        onClick={() =>
                          approveDeduction.mutate({ id: deduction.id })
                        }
                        disabled={approveDeduction.isPending}
                        className="min-h-11 rounded-xl border border-success-border bg-success-soft px-3 py-2 text-xs font-bold text-success disabled:opacity-50"
                      >
                        อนุมัติรายการนี้
                      </button>
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
