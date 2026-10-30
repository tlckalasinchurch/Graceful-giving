import React, { useState } from "react";
import { toast } from "sonner";
import { MoneyDisplay } from "@/components/common/CommonUI";
import { fmtBaht, Variance } from "./countingUtils";
import { NativeSelect } from "@/components/ui/native-select";
import { Swal } from "@/lib/sweetalert";
import type { BankRecordType } from "@shared/counting";

const BANK_RECORD_LABELS: Record<BankRecordType, string> = {
  cash_deposit: "นำเงินสดเข้าฝาก",
  transfer_in: "สมาชิกโอนเข้าบัญชี",
  withdrawal: "ถอนเงินสดจากธนาคาร",
  other_in: "เงินเข้าอื่นๆ (ดอกเบี้ย ฯลฯ)",
  other_out: "เงินออกอื่นๆ (ค่าธรรมเนียม โอนจ่ายบิล)",
};

/** Fees, interest and bills need a written reason; the amount alone says nothing. */
const needsNote = (type: BankRecordType) =>
  type === "other_in" || type === "other_out";

interface BankRecordsTabProps {
  sessionId: number;
  bankRecords: Array<{
    id: number;
    sessionId: number;
    type: string;
    amount: number;
    transferredByName?: string | null;
    bankRef?: string | null;
    notes?: string | null;
    passbookMatched: boolean;
  }>;
  actualTransferIn: number;
  envelopeTransferTotal: number;
  transferVariance: number;
  actualCashDeposit: number;
  addBankRecord: {
    mutate: (vars: any, options?: any) => void;
    isPending: boolean;
  };
  matchPassbook: {
    mutate: (vars: { id: number; passbookDate: Date }) => void;
    isPending: boolean;
  };
}

export function BankRecordsTab({
  sessionId,
  bankRecords,
  actualTransferIn,
  envelopeTransferTotal,
  transferVariance,
  actualCashDeposit,
  addBankRecord,
  matchPassbook,
}: BankRecordsTabProps) {
  const [bType, setBType] = useState<BankRecordType>("cash_deposit");
  const [bNotes, setBNotes] = useState("");
  const [bAmount, setBAmount] = useState("");
  const [bName, setBName] = useState("");
  const [bRef, setBRef] = useState("");

  const handleMatchPassbook = async (record: {
    id: number;
    amount: number;
  }) => {
    const confirmed = await Swal.confirm(
      "ยืนยันการกระทบสมุดบัญชี?",
      `จะบันทึกสถานะ "กระทบสมุดบัญชีแล้ว" ให้รายการจำนวน ${fmtBaht(record.amount)}\n\nทั้งนี้ระบบจะบันทึกวันกระทบสมุดเป็นวันนี้ และหลังกระทบสมุดแล้วจะไม่สามารถย้อนสถานะได้`,
      {
        icon: "question",
        confirmButtonText: "กระทบสมุด",
        confirmButtonColor: "#2F7A45",
        cancelButtonText: "ยกเลิก",
      }
    );
    if (confirmed) {
      matchPassbook.mutate({ id: record.id, passbookDate: new Date() });
    }
  };

  return (
    <section className="space-y-4">
      <form
        onSubmit={event => {
          event.preventDefault();
          const value = Number(bAmount);
          if (!Number.isFinite(value) || value <= 0) {
            toast.error("กรุณาระบุจำนวนเงินที่ถูกต้อง");
            return;
          }
          if (needsNote(bType) && !bNotes.trim()) {
            toast.error("กรุณาระบุรายละเอียดของรายการนี้");
            return;
          }
          addBankRecord.mutate(
            {
              sessionId,
              type: bType,
              amount: value,
              transferredByName: bName.trim() || undefined,
              bankRef: bRef.trim() || undefined,
              notes: bNotes.trim() || undefined,
            },
            {
              onSuccess: () => {
                setBAmount("");
                setBName("");
                setBRef("");
                setBNotes("");
              },
            }
          );
        }}
        className="rounded-2xl border border-line bg-white p-5 shadow-sm md:p-6"
      >
        <h2 className="mb-4 font-bold text-foreground">บันทึกรายการธนาคาร</h2>
        <div className="grid gap-4 md:grid-cols-4">
          <label className="text-sm font-semibold text-ink-2">
            ประเภท
            <NativeSelect
              value={bType}
              onChange={e => setBType(e.target.value as typeof bType)}
              className="mt-1"
            >
              {(
                Object.entries(BANK_RECORD_LABELS) as [BankRecordType, string][]
              ).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </NativeSelect>
          </label>
          <label className="text-sm font-semibold text-ink-2">
            จำนวนเงิน *
            <input
              type="number"
              required
              min="0.25"
              step="0.25"
              value={bAmount}
              onChange={e => setBAmount(e.target.value)}
              className="mt-1 w-full rounded-xl border border-line p-3 text-base font-bold tabular-nums text-foreground"
            />
          </label>
          <label className="text-sm font-semibold text-ink-2">
            ผู้โอน
            <input
              value={bName}
              onChange={e => setBName(e.target.value)}
              placeholder="เว้นว่างได้ถ้าเป็นการนำฝาก"
              className="mt-1 w-full rounded-xl border border-line p-3 text-sm font-normal text-foreground"
            />
          </label>
          <label className="text-sm font-semibold text-ink-2">
            เลขอ้างอิง
            <input
              value={bRef}
              onChange={e => setBRef(e.target.value)}
              className="mt-1 w-full rounded-xl border border-line p-3 font-mono text-sm font-normal text-foreground"
            />
          </label>
        </div>
        {needsNote(bType) && (
          <label className="mt-4 block text-sm font-semibold text-ink-2">
            รายละเอียด *
            <input
              value={bNotes}
              required
              maxLength={500}
              onChange={e => setBNotes(e.target.value)}
              placeholder="เช่น ค่าธรรมเนียมรายปี, ค่าไฟเดือนตุลาคม"
              className="mt-1 w-full rounded-xl border border-line p-3 text-sm font-normal text-foreground"
            />
          </label>
        )}
        <button
          type="submit"
          disabled={addBankRecord.isPending}
          className="mt-4 min-h-11 rounded-xl bg-income px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50"
        >
          {addBankRecord.isPending ? "กำลังบันทึก…" : "เพิ่มรายการ"}
        </button>
      </form>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-2xl border border-line bg-white p-4">
          <p className="text-sm text-ink-2">เงินโอนเข้าบัญชีจริง</p>
          <MoneyDisplay amount={actualTransferIn} type="income" size="lg" />
          <p className="mt-1 text-sm text-ink-2">
            เทียบซองโอน {fmtBaht(envelopeTransferTotal)}
          </p>
          <div className="mt-1">
            <Variance amount={transferVariance} />
          </div>
        </div>
        <div className="rounded-2xl border border-line bg-white p-4">
          <p className="text-sm text-ink-2">นำเงินสดเข้าฝากจริง</p>
          <MoneyDisplay amount={actualCashDeposit} size="lg" />
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-line bg-white shadow-sm">
        <h2 className="border-b border-line p-4 font-bold text-foreground">
          รายการธนาคาร ({bankRecords.length})
        </h2>
        {bankRecords.length === 0 ? (
          <p className="p-8 text-center text-sm text-ink-2">
            ยังไม่มีรายการธนาคารในรอบนี้
          </p>
        ) : (
          <ul className="divide-y divide-line">
            {bankRecords.map(record => (
              <li
                key={record.id}
                className="flex items-center justify-between gap-4 p-4"
              >
                <div className="min-w-0">
                  <p className="font-bold text-foreground">
                    {BANK_RECORD_LABELS[record.type as BankRecordType] ??
                      record.type}
                  </p>
                  <p className="text-sm text-ink-2">
                    {needsNote(record.type as BankRecordType)
                      ? record.notes
                      : record.transferredByName || "ไม่ระบุผู้โอน"}
                    {record.bankRef ? ` · ${record.bankRef}` : ""}
                  </p>
                  <p className="mt-1 text-sm">
                    {record.passbookMatched ? (
                      <span className="font-bold text-income">
                        กระทบสมุดบัญชีแล้ว
                      </span>
                    ) : (
                      <span className="text-brand-ink">
                        ยังไม่กระทบสมุดบัญชี
                      </span>
                    )}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <MoneyDisplay amount={record.amount} />
                  {!record.passbookMatched && (
                    <button
                      type="button"
                      onClick={() => void handleMatchPassbook(record)}
                      disabled={matchPassbook.isPending}
                      className="min-h-11 rounded-xl border border-[#9BCBA5] bg-[#E4F3E7] px-3 py-2 text-xs font-bold text-income disabled:opacity-50"
                    >
                      กระทบสมุด
                    </button>
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
