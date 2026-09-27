import React, { useState } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Swal } from "@/lib/sweetalert";
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
      <p className="rounded-2xl border border-[#3D3D3D] bg-background p-4 text-sm text-[#C9B8A8]">
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
          className="rounded-2xl border border-[#3D3D3D] bg-[#262626] p-5 md:p-6"
        >
          <h2 className="mb-4 font-bold text-foreground">
            บันทึกรายการหักเบิก
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm font-semibold text-[#C9B8A8]">
              รายการที่เบิก *
              <input
                required
                minLength={2}
                value={dPurpose}
                onChange={e => setDPurpose(e.target.value)}
                placeholder="เช่น ค่าน้ำดื่มวันอาทิตย์"
                className="mt-1 w-full rounded-xl border border-[#3D3D3D] p-3 text-sm font-normal text-foreground"
              />
            </label>
            <label className="text-sm font-semibold text-[#C9B8A8]">
              เบิกให้ใคร *
              <input
                required
                minLength={2}
                value={dPaidTo}
                onChange={e => setDPaidTo(e.target.value)}
                placeholder="ชื่อผู้รับเงิน"
                className="mt-1 w-full rounded-xl border border-[#3D3D3D] p-3 text-sm font-normal text-foreground"
              />
            </label>
            <label className="text-sm font-semibold text-[#C9B8A8]">
              จำนวนเงิน *
              <input
                type="number"
                required
                min="0.25"
                step="0.25"
                value={dAmount}
                onChange={e => setDAmount(e.target.value)}
                className="mt-1 w-full rounded-xl border border-[#3D3D3D] p-3 text-base font-bold tabular-nums text-[#FF5C5C]"
              />
            </label>
            <label className="text-sm font-semibold text-[#C9B8A8]">
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
            <label className="text-sm font-semibold text-[#C9B8A8]">
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
            <label className="text-sm font-semibold text-[#C9B8A8] md:col-span-2">
              เหตุผล *
              <textarea
                required
                minLength={2}
                rows={2}
                value={dReason}
                onChange={e => setDReason(e.target.value)}
                placeholder="อธิบายเหตุผลที่ต้องเบิกจากถุงถวายทันที"
                className="mt-1 w-full rounded-xl border border-[#3D3D3D] p-3 text-sm font-normal text-foreground"
              />
            </label>
          </div>
          <button
            type="submit"
            disabled={addDeduction.isPending || !dFundId}
            className="mt-4 min-h-11 rounded-xl bg-[#34D399] px-5 py-2.5 text-sm font-bold text-[#1B1B1B] disabled:opacity-50"
          >
            {addDeduction.isPending ? "กำลังบันทึก…" : "เพิ่มรายการเบิก"}
          </button>
        </form>
      )}

      <div className="overflow-hidden rounded-2xl border border-[#3D3D3D] bg-[#262626]">
        <div className="flex items-center justify-between border-b border-[#3D3D3D] p-4">
          <h2 className="font-bold text-foreground">
            รายการหักเบิก ({deductions.length})
          </h2>
          <span className="text-sm font-bold text-[#FF5C5C]">
            รวม {fmtBaht(deductionTotal)}
          </span>
        </div>
        {deductions.length === 0 ? (
          <p className="p-8 text-center text-sm text-[#C9B8A8]">
            ไม่มีการหักเบิกในรอบนี้ เงินถวายทั้งหมดจะถูกนำฝาก
          </p>
        ) : (
          <ul className="divide-y divide-[#3D3D3D]">
            {deductions.map(deduction => (
              <li key={deduction.id} className="space-y-2 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-bold text-foreground">
                      {deduction.purpose}
                    </p>
                    <p className="text-sm text-[#C9B8A8]">
                      เบิกให้ {deduction.paidTo}
                    </p>
                    <p className="mt-1 text-sm text-[#C9B8A8]">
                      {deduction.reason}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <MoneyDisplay amount={deduction.amount} type="expense" />
                    {editable && (
                      <button
                        type="button"
                        aria-label={`ลบรายการเบิก ${deduction.purpose} ${fmtBaht(deduction.amount)}`}
                        onClick={async () => {
                          const ok = await Swal.confirm(
                            "ลบรายการหักเบิกนี้?",
                            `${deduction.purpose} · ${fmtBaht(deduction.amount)}`,
                            {
                              icon: "warning",
                              confirmButtonText: "ลบรายการ",
                              cancelButtonText: "ยกเลิก",
                            }
                          );
                          if (ok)
                            removeDeduction.mutate({
                              id: deduction.id,
                              sessionId,
                            });
                        }}
                        disabled={removeDeduction.isPending}
                        className="flex size-11 items-center justify-center rounded-xl text-[#FF5C5C] hover:bg-[#3D1F1D] disabled:opacity-50"
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
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
                        onClick={async () => {
                          const ok = await Swal.confirm(
                            "อนุมัติการหักเบิกนี้?",
                            `${deduction.purpose} · เบิกให้ ${deduction.paidTo} · ${fmtBaht(deduction.amount)}`,
                            {
                              icon: "question",
                              confirmButtonText: "อนุมัติ",
                              cancelButtonText: "ยกเลิก",
                            }
                          );
                          if (ok) approveDeduction.mutate({ id: deduction.id });
                        }}
                        disabled={approveDeduction.isPending}
                        className="min-h-11 rounded-xl bg-[#FC6E20] hover:bg-[#D9591A] px-4 py-2 text-sm font-bold text-[#1B1B1B] transition-colors disabled:opacity-50"
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
