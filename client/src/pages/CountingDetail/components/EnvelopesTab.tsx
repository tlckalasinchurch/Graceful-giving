import type React from "react";
import { Trash2 } from "lucide-react";
import { MoneyDisplay } from "@/components/common/CommonUI";
import {
  OFFERING_CATEGORIES,
  offeringCategoryLabel,
} from "@shared/categories";
import type { AppRouter } from "../../../../../server/routers";
import type { inferRouterOutputs } from "@trpc/server";
import type { reconcile } from "@shared/counting";

type RouterOutputs = inferRouterOutputs<AppRouter>;
type CountingDetail = NonNullable<RouterOutputs["counting"]["get"]>;
type Recon = ReturnType<typeof reconcile>;
import { fmtBaht } from "../utils";

export interface EnvelopesTabProps {
  detail: CountingDetail;
  sessionId: number;
  editable: boolean;
  r: Recon;
  funds: RouterOutputs["finance"]["accounts"];
  members: RouterOutputs["members"]["list"];
  onSubmitEnvelope: (e: React.FormEvent) => void;
  amountRef: React.RefObject<HTMLInputElement | null>;
  envelopeNo: string;
  setEnvelopeNo: (v: string) => void;
  memberId: string;
  setMemberId: (v: string) => void;
  donorName: string;
  setDonorName: (v: string) => void;
  isAnonymous: boolean;
  setIsAnonymous: (v: boolean) => void;
  category: string;
  setCategory: (v: string) => void;
  fundId: string;
  setFundId: (v: string) => void;
  method: "cash" | "transfer" | "check";
  setMethod: (v: "cash" | "transfer" | "check") => void;
  amount: string;
  setAmount: (v: string) => void;
  addEnvelope: {
    mutate: (
      input: {
        sessionId: number;
        envelopeNo: string | undefined;
        memberId: number | undefined;
        donorName: string | undefined;
        isAnonymous: boolean;
        category: "general";
        fundId: number;
        method: "cash" | "transfer" | "check";
        amount: number;
      },
      opts?: { onSuccess?: () => void }
    ) => void;
    isPending: boolean;
  };
  removeEnvelope: {
    mutate: (input: { id: number; sessionId: number }) => void;
    isPending: boolean;
  };
}

export function EnvelopesTab(props: EnvelopesTabProps) {
  const {
    detail,
    sessionId,
    editable,
    r,
    funds,
    members,
    onSubmitEnvelope,
    amountRef,
    envelopeNo,
    setEnvelopeNo,
    memberId,
    setMemberId,
    donorName,
    setDonorName,
    isAnonymous,
    setIsAnonymous,
    category,
    setCategory,
    fundId,
    setFundId,
    method,
    setMethod,
    amount,
    setAmount,
    addEnvelope,
    removeEnvelope,
  } = props;
  return (
          <section className="space-y-4">
            {editable && (
              <form
                onSubmit={onSubmitEnvelope}
                className="rounded-3xl border border-hairline bg-white p-5 md:p-6"
              >
                <h2 className="mb-4 font-bold text-foreground">บันทึกซองถวาย</h2>
                <div className="grid gap-4 md:grid-cols-3">
                  <label className="text-sm font-semibold text-secondary-foreground">
                    เลขซอง
                    <input
                      value={envelopeNo}
                      onChange={e => setEnvelopeNo(e.target.value)}
                      placeholder="เช่น 012 (เว้นว่างได้)"
                      className="mt-1 w-full rounded-xl border border-hairline p-3 text-sm font-normal text-foreground"
                    />
                  </label>
                  <label className="text-sm font-semibold text-secondary-foreground">
                    สมาชิก
                    <select
                      value={memberId}
                      onChange={e => setMemberId(e.target.value)}
                      disabled={isAnonymous}
                      className="mt-1 w-full rounded-xl border border-hairline p-3 text-sm font-normal text-foreground disabled:opacity-50"
                    >
                      <option value="">— ไม่ระบุสมาชิก —</option>
                      {members.map(m => (
                        <option key={m.id} value={m.id}>
                          {m.envelopeNo ? `[${m.envelopeNo}] ` : ""}
                          {m.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="text-sm font-semibold text-secondary-foreground">
                    ชื่อผู้ถวาย (ถ้าไม่ใช่สมาชิก)
                    <input
                      value={donorName}
                      onChange={e => setDonorName(e.target.value)}
                      disabled={isAnonymous}
                      placeholder={
                        isAnonymous ? "ไม่เปิดเผยนาม" : "ชื่อ-นามสกุล"
                      }
                      className="mt-1 w-full rounded-xl border border-hairline p-3 text-sm font-normal text-foreground disabled:opacity-50"
                    />
                  </label>
                  <label className="text-sm font-semibold text-secondary-foreground">
                    ประเภทถวาย
                    <select
                      value={category}
                      onChange={e => setCategory(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-hairline p-3 text-sm font-normal text-foreground"
                    >
                      {OFFERING_CATEGORIES.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="text-sm font-semibold text-secondary-foreground">
                    เข้ากองทุน *
                    <select
                      required
                      value={fundId}
                      onChange={e => setFundId(e.target.value)}
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
                  <label className="text-sm font-semibold text-secondary-foreground">
                    ช่องทาง
                    <select
                      value={method}
                      onChange={e => setMethod(e.target.value as typeof method)}
                      className="mt-1 w-full rounded-xl border border-hairline p-3 text-sm font-normal text-foreground"
                    >
                      <option value="cash">เงินสด</option>
                      <option value="transfer">เงินโอน</option>
                      <option value="check">เช็ค</option>
                    </select>
                  </label>
                  <label className="text-sm font-semibold text-secondary-foreground">
                    จำนวนเงิน (บาท) *
                    <input
                      ref={amountRef}
                      type="number"
                      required
                      min="0.25"
                      step="0.25"
                      value={amount}
                      onChange={e => setAmount(e.target.value)}
                      placeholder="0.00"
                      className="mt-1 w-full rounded-xl border border-hairline p-3 text-base font-bold tabular-nums text-success"
                    />
                  </label>
                  <div className="flex items-end gap-2">
                    <label className="flex items-center gap-2 text-sm text-secondary-foreground">
                      <input
                        type="checkbox"
                        checked={isAnonymous}
                        onChange={e => {
                          setIsAnonymous(e.target.checked);
                          if (e.target.checked) {
                            setMemberId("");
                            setDonorName("");
                          }
                        }}
                        className="size-4 rounded border-hairline"
                      />
                      ไม่ระบุนาม
                    </label>
                  </div>
                  <div className="flex items-end">
                    <button
                      type="submit"
                      disabled={addEnvelope.isPending || !fundId}
                      className="min-h-11 w-full rounded-2xl bg-[#4F8B33] px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50"
                    >
                      {addEnvelope.isPending ? "กำลังบันทึก…" : "เพิ่มซอง"}
                    </button>
                  </div>
                </div>
                {funds.length === 0 && (
                  <p className="mt-3 text-sm text-[#D45945]">
                    ยังไม่มีกองทุนในระบบ ต้องสร้างกองทุนก่อนบันทึกซองถวาย
                  </p>
                )}
              </form>
            )}

            <div className="overflow-hidden rounded-3xl border border-hairline bg-white">
              <div className="flex items-center justify-between border-b border-hairline p-4">
                <h2 className="font-bold text-foreground">
                  ซองในรอบนี้ ({detail.envelopes.length})
                </h2>
                <span className="text-sm font-bold text-secondary-foreground">
                  รวม {fmtBaht(r.offeringTotal)}
                </span>
              </div>
              {detail.envelopes.length === 0 ? (
                <p className="p-8 text-center text-sm text-secondary-foreground">
                  ยังไม่มีซองในรอบนี้
                </p>
              ) : (
                <ul className="divide-y divide-[#F0E6D8]">
                  {detail.envelopes.map(envelope => {
                    const member = members.find(
                      m => m.id === envelope.memberId
                    );
                    const who = envelope.isAnonymous
                      ? "ไม่ระบุนาม"
                      : (member?.name ?? envelope.donorName ?? "ไม่ระบุชื่อ");
                    const categoryLabel = offeringCategoryLabel(
                      envelope.category
                    );
                    const fundName =
                      funds.find(f => f.id === envelope.fundId)?.name ??
                      "ไม่ระบุกองทุน";
                    return (
                      <li
                        key={envelope.id}
                        className="flex items-center justify-between gap-4 p-4"
                      >
                        <div className="min-w-0">
                          <p className="font-bold text-foreground">
                            {envelope.envelopeNo
                              ? `ซอง ${envelope.envelopeNo} · `
                              : ""}
                            {who}
                          </p>
                          <p className="text-sm text-secondary-foreground">
                            {categoryLabel} · {fundName} ·{" "}
                            {envelope.method === "cash"
                              ? "เงินสด"
                              : envelope.method === "transfer"
                                ? "เงินโอน"
                                : "เช็ค"}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-3">
                          <MoneyDisplay
                            amount={envelope.amount}
                            type="income"
                          />
                          {editable && (
                            <button
                              type="button"
                              aria-label="ลบซองนี้"
                              onClick={() =>
                                removeEnvelope.mutate({
                                  id: envelope.id,
                                  sessionId,
                                })
                              }
                              disabled={removeEnvelope.isPending}
                              className="flex size-11 items-center justify-center rounded-xl text-[#D45945] hover:bg-[#FFEBE5] disabled:opacity-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </section>
  );
}

