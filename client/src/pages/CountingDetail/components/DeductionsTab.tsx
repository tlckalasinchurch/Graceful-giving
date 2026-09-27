import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { MoneyDisplay, StatusBadge } from "@/components/common/CommonUI";
import { EXPENSE_CATEGORIES } from "@shared/categories";
import type { AppRouter } from "../../../../../server/routers";
import type { inferRouterOutputs } from "@trpc/server";
import type { reconcile } from "@shared/counting";

type RouterOutputs = inferRouterOutputs<AppRouter>;
type CountingDetail = NonNullable<RouterOutputs["counting"]["get"]>;
type Recon = ReturnType<typeof reconcile>;
import { fmtBaht } from "../utils";

export interface DeductionsTabProps {
  detail: CountingDetail;
  sessionId: number;
  editable: boolean;
  r: Recon;
  funds: RouterOutputs["finance"]["accounts"];
  dPurpose: string;
  setDPurpose: (v: string) => void;
  dReason: string;
  setDReason: (v: string) => void;
  dPaidTo: string;
  setDPaidTo: (v: string) => void;
  dAmount: string;
  setDAmount: (v: string) => void;
  dCategory: string;
  setDCategory: (v: string) => void;
  dFundId: string;
  setDFundId: (v: string) => void;
  addDeduction: {
    mutate: (
      input: {
        sessionId: number;
        purpose: string;
        reason: string;
        amount: number;
        paidTo: string;
        category: "other";
        fundId: number;
      },
      opts?: { onSuccess?: () => void }
    ) => void;
    isPending: boolean;
  };
  approveDeduction: {
    mutate: (input: { id: number }) => void;
    isPending: boolean;
  };
  removeDeduction: {
    mutate: (input: { id: number; sessionId: number }) => void;
    isPending: boolean;
  };
}

export function DeductionsTab(props: DeductionsTabProps) {
  const {
    detail,
    sessionId,
    editable,
    r,
    funds,
    dPurpose,
    setDPurpose,
    dReason,
    setDReason,
    dPaidTo,
    setDPaidTo,
    dAmount,
    setDAmount,
    dCategory,
    setDCategory,
    dFundId,
    setDFundId,
    addDeduction,
    approveDeduction,
    removeDeduction,
  } = props;
  return (
          <section className="space-y-4">
            <p className="rounded-2xl border border-hairline bg-surface-subtle p-4 text-sm text-secondary-foreground">
              เงินที่เบิกจากถุงถวายก่อนนำฝาก ยอดถวายจะไม่หายจากระบบ —
              ระบบตรวจว่า นับเงินสดได้ − หักเบิก = ยอดนำฝาก
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
                className="rounded-3xl border border-hairline bg-white p-5 md:p-6"
              >
                <h2 className="mb-4 font-bold text-foreground">
                  บันทึกรายการหักเบิก
                </h2>
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="text-sm font-semibold text-secondary-foreground">
                    รายการที่เบิก *
                    <input
                      required
                      minLength={2}
                      value={dPurpose}
                      onChange={e => setDPurpose(e.target.value)}
                      placeholder="เช่น ค่าน้ำดื่มวันอาทิตย์"
                      className="mt-1 w-full rounded-xl border border-hairline p-3 text-sm font-normal text-foreground"
                    />
                  </label>
                  <label className="text-sm font-semibold text-secondary-foreground">
                    เบิกให้ใคร *
                    <input
                      required
                      minLength={2}
                      value={dPaidTo}
                      onChange={e => setDPaidTo(e.target.value)}
                      placeholder="ชื่อผู้รับเงิน"
                      className="mt-1 w-full rounded-xl border border-hairline p-3 text-sm font-normal text-foreground"
                    />
                  </label>
                  <label className="text-sm font-semibold text-secondary-foreground">
                    จำนวนเงิน *
                    <input
                      type="number"
                      required
                      min="0.25"
                      step="0.25"
                      value={dAmount}
                      onChange={e => setDAmount(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-hairline p-3 text-base font-bold tabular-nums text-[#D45945]"
                    />
                  </label>
                  <label className="text-sm font-semibold text-secondary-foreground">
                    หมวดหมู่รายจ่าย
                    <select
                      value={dCategory}
                      onChange={e => setDCategory(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-hairline p-3 text-sm font-normal text-foreground"
                    >
                      {EXPENSE_CATEGORIES.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="text-sm font-semibold text-secondary-foreground">
                    ตัดจากกองทุน *
                    <select
                      required
                      value={dFundId}
                      onChange={e => setDFundId(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-hairline p-3 text-sm font-normal text-foreground"
                    >
                      <option value="" disabled>
                        — เลือกกองทุน —
                      </option>
                      {funds.map(f => (
                        <option key={f.id} value={f.id}>
                          {f.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="text-sm font-semibold text-secondary-foreground md:col-span-2">
                    เหตุผล *
                    <textarea
                      required
                      minLength={2}
                      rows={2}
                      value={dReason}
                      onChange={e => setDReason(e.target.value)}
                      placeholder="อธิบายเหตุผลที่ต้องเบิกจากถุงถวายทันที"
                      className="mt-1 w-full rounded-xl border border-hairline p-3 text-sm font-normal text-foreground"
                    />
                  </label>
                </div>
                <button
                  type="submit"
                  disabled={addDeduction.isPending || !dFundId}
                  className="mt-4 min-h-11 rounded-2xl bg-[#4F8B33] px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50"
                >
                  {addDeduction.isPending ? "กำลังบันทึก…" : "เพิ่มรายการเบิก"}
                </button>
              </form>
            )}

            <div className="overflow-hidden rounded-3xl border border-hairline bg-white">
              <div className="flex items-center justify-between border-b border-hairline p-4">
                <h2 className="font-bold text-foreground">
                  รายการหักเบิก ({detail.deductions.length})
                </h2>
                <span className="text-sm font-bold text-[#D45945]">
                  รวม {fmtBaht(r.deductionTotal)}
                </span>
              </div>
              {detail.deductions.length === 0 ? (
                <p className="p-8 text-center text-sm text-secondary-foreground">
                  ไม่มีการหักเบิกในรอบนี้ เงินถวายทั้งหมดจะถูกนำฝาก
                </p>
              ) : (
                <ul className="divide-y divide-[#F0E6D8]">
                  {detail.deductions.map(deduction => (
                    <li key={deduction.id} className="space-y-2 p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <p className="font-bold text-foreground">
                            {deduction.purpose}
                          </p>
                          <p className="text-sm text-secondary-foreground">
                            เบิกให้ {deduction.paidTo}
                          </p>
                          <p className="mt-1 text-sm text-secondary-foreground">
                            {deduction.reason}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-3">
                          <MoneyDisplay
                            amount={deduction.amount}
                            type="expense"
                          />
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
                              className="flex size-11 items-center justify-center rounded-xl text-[#D45945] hover:bg-[#FFEBE5] disabled:opacity-50"
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
                              className="min-h-11 rounded-xl border border-success-border bg-success-bg px-3 py-2 text-xs font-bold text-success disabled:opacity-50"
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
