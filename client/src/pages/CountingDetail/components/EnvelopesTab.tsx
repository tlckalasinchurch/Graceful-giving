import React, { useEffect, useRef, useState } from "react";
import { Trash2 } from "lucide-react";
import { FieldError, useFieldErrors } from "@/lib/formFeedback";
import { MoneyDisplay } from "@/components/common/CommonUI";
import {
  OFFERING_CATEGORIES,
  offeringCategoryLabel,
  type OfferingCategory,
} from "@shared/categories";
import { fmtBaht, getNextEnvelopeNo } from "./countingUtils";
import { NativeSelect } from "@/components/ui/native-select";
import { Swal } from "@/lib/sweetalert";

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
  const [envelopeNo, setEnvelopeNo] = useState(() =>
    getNextEnvelopeNo(envelopes)
  );
  const [memberId, setMemberId] = useState("");
  const [donorName, setDonorName] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [category, setCategory] = useState<string>("cash");
  const [fundId, setFundId] = useState("");
  const [method, setMethod] = useState<"cash" | "transfer" | "check">("cash");
  const [amount, setAmount] = useState("");
  const amountRef = useRef<HTMLInputElement>(null);

  // If the session changes while mounted, re-initialize envelope number
  const lastSessionIdRef = useRef(sessionId);
  useEffect(() => {
    if (lastSessionIdRef.current !== sessionId) {
      lastSessionIdRef.current = sessionId;
      setEnvelopeNo(getNextEnvelopeNo(envelopes));
      setMemberId("");
      setDonorName("");
      setIsAnonymous(false);
      setAmount("");
    }
  }, [sessionId, envelopes]);

  const handleEnvelopeNoChange = (value: string) => {
    setEnvelopeNo(value);
    const trimmed = value.trim().toLowerCase();
    if (!trimmed || isAnonymous) {
      setMemberId("");
      setDonorName("");
      return;
    }
    const matched = members.find(
      m => (m.envelopeNo ?? "").trim().toLowerCase() === trimmed
    );
    if (matched) {
      setMemberId(String(matched.id));
      setDonorName(matched.name);
    } else {
      setMemberId("");
      setDonorName("");
    }
  };

  const handleMemberChange = (value: string) => {
    setMemberId(value);
    if (!value) {
      setDonorName("");
      return;
    }
    const matched = members.find(m => String(m.id) === value);
    if (matched) {
      if (matched.envelopeNo) {
        setEnvelopeNo(matched.envelopeNo);
      }
      setDonorName(matched.name);
    }
  };

  const { errors, report, clearField, invalidProps } = useFieldErrors(
    "counting-envelope",
    { fundId: "envelope-fund", amount: "envelope-amount" }
  );

  const submitEnvelope = (event: React.FormEvent) => {
    event.preventDefault();
    const value = Number(amount);
    const valid = report({
      amount:
        !Number.isFinite(value) || value <= 0
          ? "กรุณาระบุจำนวนเงินที่ถูกต้อง"
          : undefined,
      fundId: fundId ? undefined : "กรุณาเลือกกองทุน",
    });
    if (!valid) return;
    const submittedNo = envelopeNo.trim();
    addEnvelope.mutate(
      {
        sessionId,
        envelopeNo: submittedNo || undefined,
        memberId: memberId ? Number(memberId) : undefined,
        donorName: donorName.trim() || undefined,
        isAnonymous,
        category: category as OfferingCategory,
        fundId: Number(fundId),
        method,
        amount: value,
      },
      {
        onSuccess: () => {
          const nextNo = getNextEnvelopeNo(envelopes, submittedNo || undefined);
          setEnvelopeNo(nextNo);
          setMemberId("");
          setDonorName("");
          setIsAnonymous(false);
          setAmount("");
          amountRef.current?.focus();
        },
      }
    );
  };

  const handleRemoveEnvelope = async (envelope: {
    id: number;
    envelopeNo?: string | null;
    amount: number;
  }) => {
    const confirmed = await Swal.confirm(
      "ยืนยันการลบซองถวาย?",
      `ต้องการลบ ${envelope.envelopeNo ? `ซอง ${envelope.envelopeNo}` : "รายการซองถวาย"} จำนวน ${fmtBaht(envelope.amount)} ออกจากรอบนี้หรือไม่?\n\nยอดรวมซองและการกระทบยอดจะถูกคำนวณใหม่ทันที`,
      {
        icon: "warning",
        confirmButtonText: "ลบซองนี้",
        confirmButtonColor: "var(--destructive)",
        cancelButtonText: "ยกเลิก",
      }
    );
    if (confirmed) {
      removeEnvelope.mutate({ id: envelope.id, sessionId });
    }
  };

  return (
    <section className="space-y-4">
      {editable && (
        <form
          onSubmit={submitEnvelope}
          noValidate
          className="bento-card-static p-5 md:p-6"
        >
          <h2 className="mb-4 display text-base text-ink">บันทึกซองถวาย</h2>
          <div className="grid gap-4 md:grid-cols-3">
            <label className="text-sm font-extrabold text-ink">
              <span className="flex items-center justify-between">
                <span>เลขซอง</span>
                <button
                  type="button"
                  onClick={() => {
                    const next = getNextEnvelopeNo(envelopes);
                    setEnvelopeNo(next);
                    setMemberId("");
                    setDonorName("");
                  }}
                  className="text-xs font-semibold text-brand hover:underline"
                  title="คลิกเพื่อใช้เลขซองถัดไปอัตโนมัติ"
                >
                  รันอัตโนมัติ ({getNextEnvelopeNo(envelopes)})
                </button>
              </span>
              <input
                value={envelopeNo}
                onChange={e => handleEnvelopeNoChange(e.target.value)}
                placeholder="เช่น 1, 012 (พิมพ์เพื่อจับคู่สมาชิก)"
                className="neo-input mt-1 font-normal"
              />
            </label>
            <label className="text-sm font-extrabold text-ink">
              สมาชิก
              <NativeSelect
                value={memberId}
                onChange={e => handleMemberChange(e.target.value)}
                disabled={isAnonymous}
                className="mt-1"
              >
                <option value="">ไม่ระบุสมาชิก</option>
                {members.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.envelopeNo ? `[${m.envelopeNo}] ` : ""}
                    {m.name}
                  </option>
                ))}
              </NativeSelect>
            </label>
            <label className="text-sm font-extrabold text-ink">
              ชื่อผู้ถวาย (ถ้าไม่ใช่สมาชิก)
              <input
                value={donorName}
                onChange={e => setDonorName(e.target.value)}
                disabled={isAnonymous}
                placeholder={isAnonymous ? "ไม่เปิดเผยนาม" : "ชื่อ-นามสกุล"}
                className="neo-input mt-1 font-normal disabled:opacity-50"
              />
            </label>
            <label className="text-sm font-extrabold text-ink">
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
            <label className="text-sm font-extrabold text-ink">
              เข้ากองทุน *
              <NativeSelect
                required
                id="envelope-fund"
                value={fundId}
                onChange={e => {
                  setFundId(e.target.value);
                  clearField("fundId");
                }}
                invalid={Boolean(errors.fundId)}
                {...invalidProps("fundId")}
                className="mt-1"
              >
                <option value="" disabled>
                  เลือกกองทุน
                </option>
                {funds.map(f => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </NativeSelect>
              <FieldError fieldId="envelope-fund" message={errors.fundId} />
            </label>
            <label className="text-sm font-extrabold text-ink">
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
            <label className="text-sm font-extrabold text-ink">
              จำนวนเงิน (บาท) *
              <input
                ref={amountRef}
                type="number"
                required
                min="0.25"
                step="0.25"
                id="envelope-amount"
                value={amount}
                onChange={e => {
                  setAmount(e.target.value);
                  clearField("amount");
                }}
                {...invalidProps("amount")}
                placeholder="0.00"
                className="neo-input mt-1 font-bold tabular-nums"
              />
              <FieldError fieldId="envelope-amount" message={errors.amount} />
            </label>
            <div className="flex items-end gap-2">
              <label className="flex items-center gap-2 text-sm font-bold text-ink-2">
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
                  className="size-4 rounded border border-line"
                />
                ไม่ระบุนาม
              </label>
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                disabled={addEnvelope.isPending || !fundId}
                className="btn-primary min-h-11 w-full px-5 py-2.5 text-sm disabled:opacity-50"
              >
                {addEnvelope.isPending ? "กำลังบันทึก…" : "เพิ่มซอง"}
              </button>
            </div>
          </div>
          {funds.length === 0 && (
            <p className="mt-3 text-sm font-bold text-danger">
              ยังไม่มีกองทุนในระบบ ต้องสร้างกองทุนก่อนบันทึกซองถวาย
            </p>
          )}
        </form>
      )}

      <div className="bento-card-static overflow-hidden">
        <div className="flex items-center justify-between border-b border-line bg-paper-2 p-4">
          <h2 className="font-extrabold text-ink">
            ซองในรอบนี้ ({envelopes.length})
          </h2>
          <span className="text-sm font-extrabold text-income tabular-nums">
            รวม {fmtBaht(offeringTotal)}
          </span>
        </div>
        {envelopes.length === 0 ? (
          <p className="p-8 text-center text-sm font-medium text-ink-2">
            ยังไม่มีซองในรอบนี้
          </p>
        ) : (
          <ul className="divide-y divide-line">
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
                  className="flex items-center justify-between gap-4 p-4 hover:bg-paper-2/40"
                >
                  <div className="min-w-0">
                    <p className="font-extrabold text-ink">
                      {envelope.envelopeNo
                        ? `ซอง ${envelope.envelopeNo} · `
                        : ""}
                      {who}
                    </p>
                    <p className="text-sm font-medium text-ink-2">
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
                        onClick={() => void handleRemoveEnvelope(envelope)}
                        disabled={removeEnvelope.isPending}
                        className="flex size-11 items-center justify-center rounded-xl border border-danger/30 bg-tile-peach text-tile-peach-ink hover:bg-danger hover:text-white disabled:opacity-50"
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
