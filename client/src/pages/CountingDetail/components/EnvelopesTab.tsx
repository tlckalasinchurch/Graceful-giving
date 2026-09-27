import React, { useRef, useState } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { MoneyDisplay } from "@/components/common/CommonUI";
import { OFFERING_CATEGORIES, offeringCategoryLabel } from "@shared/categories";
import { fmtBaht } from "./countingUtils";
import { NativeSelect } from "@/components/ui/native-select";

interface EnvelopesTabProps {
  sessionId: number;
  editable: boolean;
  envelopes: Array<{
    id: number;
    sessionId: number;
    envelopeNo?: string | null;
    memberId?: number | null;
    donorName?: string | null;
    isAnonymous?: boolean | null;
    category: string;
    fundId?: number | null;
    method: "cash" | "transfer" | "check" | string;
    amount: number;
  }>;
  funds: Array<{ id: number; name: string }>;
  members: Array<{ id: number; name: string; envelopeNo?: string | null }>;
  offeringTotal: number;
  addEnvelope: {
    mutate: (vars: any, options?: any) => void;
    isPending: boolean;
  };
  removeEnvelope: {
    mutate: (vars: { id: number; sessionId: number }) => void;
    isPending: boolean;
  };
}

export function EnvelopesTab({
  sessionId,
  editable,
  envelopes,
  funds,
  members,
  offeringTotal,
  addEnvelope,
  removeEnvelope,
}: EnvelopesTabProps) {
  const [envelopeNo, setEnvelopeNo] = useState("");
  const [memberId, setMemberId] = useState("");
  const [donorName, setDonorName] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [category, setCategory] = useState<string>("general");
  const [fundId, setFundId] = useState("");
  const [method, setMethod] = useState<"cash" | "transfer" | "check">("cash");
  const [amount, setAmount] = useState("");
  const amountRef = useRef<HTMLInputElement>(null);

  const submitEnvelope = (event: React.FormEvent) => {
    event.preventDefault();
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) {
      toast.error("กรุณาระบุจำนวนเงินที่ถูกต้อง");
      return;
    }
    if (!fundId) {
      toast.error("กรุณาเลือกกองทุน");
      return;
    }
    addEnvelope.mutate(
      {
        sessionId,
        envelopeNo: envelopeNo.trim() || undefined,
        memberId: memberId ? Number(memberId) : undefined,
        donorName: donorName.trim() || undefined,
        isAnonymous,
        category: category as "general",
        fundId: Number(fundId),
        method,
        amount: value,
      },
      {
        onSuccess: () => {
          setEnvelopeNo("");
          setMemberId("");
          setDonorName("");
          setIsAnonymous(false);
          setAmount("");
          amountRef.current?.focus();
        },
      }
    );
  };

  return (
    <section className="space-y-4">
      {editable && (
        <form
          onSubmit={submitEnvelope}
          className="rounded-2xl border border-[#E7DCC8] bg-card p-5 shadow-sm md:p-6"
        >
          <h2 className="mb-4 font-bold text-foreground">บันทึกซองถวาย</h2>
          <div className="grid gap-4 md:grid-cols-3">
            <label className="text-sm font-semibold text-[#51443A]">
              เลขซอง
              <input
                value={envelopeNo}
                onChange={e => setEnvelopeNo(e.target.value)}
                placeholder="เช่น 012 (เว้นว่างได้)"
                className="mt-1 w-full rounded-xl border border-[#E7DCC8] p-3 text-sm font-normal text-foreground"
              />
            </label>
            <label className="text-sm font-semibold text-[#51443A]">
              สมาชิก
              <NativeSelect
                value={memberId}
                onChange={e => setMemberId(e.target.value)}
                disabled={isAnonymous}
                className="mt-1"
              >
                <option value="">— ไม่ระบุสมาชิก —</option>
                {members.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.envelopeNo ? `[${m.envelopeNo}] ` : ""}
                    {m.name}
                  </option>
                ))}
              </NativeSelect>
            </label>
            <label className="text-sm font-semibold text-[#51443A]">
              ชื่อผู้ถวาย (ถ้าไม่ใช่สมาชิก)
              <input
                value={donorName}
                onChange={e => setDonorName(e.target.value)}
                disabled={isAnonymous}
                placeholder={isAnonymous ? "ไม่เปิดเผยนาม" : "ชื่อ-นามสกุล"}
                className="mt-1 w-full rounded-xl border border-[#E7DCC8] p-3 text-sm font-normal text-foreground disabled:opacity-50"
              />
            </label>
            <label className="text-sm font-semibold text-[#51443A]">
              ประเภทถวาย
              <NativeSelect
                value={category}
                onChange={e => setCategory(e.target.value)}
                className="mt-1"
              >
                {OFFERING_CATEGORIES.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </NativeSelect>
            </label>
            <label className="text-sm font-semibold text-[#51443A]">
              เข้ากองทุน *
              <NativeSelect
                required
                value={fundId}
                onChange={e => setFundId(e.target.value)}
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
            <label className="text-sm font-semibold text-[#51443A]">
              ช่องทาง
              <NativeSelect
                value={method}
                onChange={e => setMethod(e.target.value as typeof method)}
                className="mt-1"
              >
                <option value="cash">เงินสด</option>
                <option value="transfer">เงินโอน</option>
                <option value="check">เช็ค</option>
              </NativeSelect>
            </label>
            <label className="text-sm font-semibold text-[#51443A]">
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
                className="mt-1 w-full rounded-xl border border-[#E7DCC8] p-3 text-base font-bold tabular-nums text-[#2D6A2E]"
              />
            </label>
            <div className="flex items-end gap-2">
              <label className="flex items-center gap-2 text-sm text-[#51443A]">
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
                  className="size-4 rounded border-[#E7DCC8]"
                />
                ไม่ระบุนาม
              </label>
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                disabled={addEnvelope.isPending || !fundId}
                className="min-h-11 w-full rounded-xl bg-[#2D6A2E] px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50 enabled:hover:-translate-y-0.5 enabled:hover:shadow-md active:translate-y-0 active:scale-[0.98] transition-all duration-200 ease-in-out"
              >
                {addEnvelope.isPending ? "กำลังบันทึก…" : "เพิ่มซอง"}
              </button>
            </div>
          </div>
          {funds.length === 0 && (
            <p className="mt-3 text-sm text-[#C8372D]">
              ยังไม่มีกองทุนในระบบ ต้องสร้างกองทุนก่อนบันทึกซองถวาย
            </p>
          )}
        </form>
      )}

      <div className="overflow-hidden rounded-2xl border border-[#E7DCC8] bg-card shadow-sm">
        <div className="flex items-center justify-between border-b border-[#E7DCC8] p-4">
          <h2 className="font-bold text-foreground">
            ซองในรอบนี้ ({envelopes.length})
          </h2>
          <span className="text-sm font-bold text-[#51443A]">
            รวม {fmtBaht(offeringTotal)}
          </span>
        </div>
        {envelopes.length === 0 ? (
          <p className="p-8 text-center text-sm text-[#51443A]">
            ยังไม่มีซองในรอบนี้
          </p>
        ) : (
          <ul className="divide-y divide-[#EFE5D3]">
            {envelopes.map(envelope => {
              const member = members.find(m => m.id === envelope.memberId);
              const who = envelope.isAnonymous
                ? "ไม่ระบุนาม"
                : (member?.name ?? envelope.donorName ?? "ไม่ระบุชื่อ");
              const categoryLabel = offeringCategoryLabel(envelope.category);
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
                    <p className="text-sm text-[#51443A]">
                      {categoryLabel} · {fundName} ·{" "}
                      {envelope.method === "cash"
                        ? "เงินสด"
                        : envelope.method === "transfer"
                          ? "เงินโอน"
                          : "เช็ค"}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <MoneyDisplay amount={envelope.amount} type="income" />
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
                        className="flex size-11 items-center justify-center rounded-xl text-[#C8372D] hover:bg-[#FEECEB] disabled:opacity-50 transition-all duration-200 ease-in-out"
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
