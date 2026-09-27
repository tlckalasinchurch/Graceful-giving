import React, { useState } from "react";
import { toast } from "sonner";
import { MoneyDisplay } from "@/components/common/CommonUI";
import { fmtBaht, Variance } from "./countingUtils";
import { NativeSelect } from "@/components/ui/native-select";

interface BankRecordsTabProps {
  sessionId: number;
  bankRecords: Array<{
    id: number;
    sessionId: number;
    type: "transfer_in" | "cash_deposit" | string;
    amount: number;
    transferredByName?: string | null;
    bankRef?: string | null;
    passbookMatched: boolean;
  }>;
  actualTransferIn: number;
  envelopeTransferTotal: number;
  transferVariance: number;
  actualCashDeposit: number;
  expectedDeposit: number;
  depositVariance: number;
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
  expectedDeposit,
  depositVariance,
  addBankRecord,
  matchPassbook,
}: BankRecordsTabProps) {
  const [bType, setBType] = useState<"transfer_in" | "cash_deposit">(
    "cash_deposit"
  );
  const [bAmount, setBAmount] = useState("");
  const [bName, setBName] = useState("");
  const [bRef, setBRef] = useState("");

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
          addBankRecord.mutate(
            {
              sessionId,
              type: bType,
              amount: value,
              transferredByName: bName.trim() || undefined,
              bankRef: bRef.trim() || undefined,
            },
            {
              onSuccess: () => {
                setBAmount("");
                setBName("");
                setBRef("");
              },
            }
          );
        }}
        className="rounded-2xl border border-[#E7DCC8] bg-white p-5 shadow-sm md:p-6"
      >
        <h2 className="mb-4 font-bold text-foreground">บันทึกรายการธนาคาร</h2>
        <div className="grid gap-4 md:grid-cols-4">
          <label className="text-sm font-semibold text-[#51443A]">
            ประเภท
            <NativeSelect
              value={bType}
              onChange={e => setBType(e.target.value as typeof bType)}
              className="mt-1"
            >
              <option value="cash_deposit">นำเงินสดเข้าฝาก</option>
              <option value="transfer_in">สมาชิกโอนเข้าบัญชี</option>
            </NativeSelect>
          </label>
          <label className="text-sm font-semibold text-[#51443A]">
            จำนวนเงิน *
            <input
              type="number"
              inputMode="decimal"
              required
              min="0.25"
              step="0.25"
              value={bAmount}
              onChange={e => setBAmount(e.target.value)}
              className="mt-1 w-full rounded-xl border border-[#E7DCC8] p-3 text-base font-bold tabular-nums text-foreground"
            />
          </label>
          <label className="text-sm font-semibold text-[#51443A]">
            ผู้โอน
            <input
              value={bName}
              onChange={e => setBName(e.target.value)}
              placeholder="เว้นว่างได้ถ้าเป็นการนำฝาก"
              className="mt-1 w-full rounded-xl border border-[#E7DCC8] p-3 text-sm font-normal text-foreground"
            />
          </label>
          <label className="text-sm font-semibold text-[#51443A]">
            เลขอ้างอิง
            <input
              value={bRef}
              onChange={e => setBRef(e.target.value)}
              className="mt-1 w-full rounded-xl border border-[#E7DCC8] p-3 font-mono text-sm font-normal text-foreground"
            />
          </label>
        </div>
        <button
          type="submit"
          disabled={addBankRecord.isPending}
          className="mt-4 min-h-11 rounded-xl bg-[#2F7A45] px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50"
        >
          {addBankRecord.isPending ? "กำลังบันทึก…" : "เพิ่มรายการ"}
        </button>
      </form>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-2xl border border-[#E7DCC8] bg-white p-4">
          <p className="text-sm text-[#51443A]">เงินโอนเข้าบัญชีจริง</p>
          <MoneyDisplay amount={actualTransferIn} type="income" size="lg" />
          <p className="mt-1 text-sm text-[#51443A]">
            เทียบซองโอน {fmtBaht(envelopeTransferTotal)}
          </p>
          <div className="mt-1">
            <Variance amount={transferVariance} />
          </div>
        </div>
        <div className="rounded-2xl border border-[#E7DCC8] bg-white p-4">
          <p className="text-sm text-[#51443A]">นำเงินสดเข้าฝากจริง</p>
          <MoneyDisplay amount={actualCashDeposit} size="lg" />
          <p className="mt-1 text-sm text-[#51443A]">
            ต้องนำฝาก {fmtBaht(expectedDeposit)}
          </p>
          <div className="mt-1">
            <Variance amount={depositVariance} />
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-[#E7DCC8] bg-white shadow-sm">
        <h2 className="border-b border-[#E7DCC8] p-4 font-bold text-foreground">
          รายการธนาคาร ({bankRecords.length})
        </h2>
        {bankRecords.length === 0 ? (
          <p className="p-8 text-center text-sm text-[#51443A]">
            ยังไม่มีรายการธนาคารในรอบนี้
          </p>
        ) : (
          <ul className="divide-y divide-[#EDE8E3]">
            {bankRecords.map(record => (
              <li
                key={record.id}
                className="flex items-center justify-between gap-4 p-4"
              >
                <div className="min-w-0">
                  <p className="font-bold text-foreground">
                    {record.type === "cash_deposit"
                      ? "นำเงินสดเข้าฝาก"
                      : "สมาชิกโอนเข้าบัญชี"}
                  </p>
                  <p className="text-sm text-[#51443A]">
                    {record.transferredByName || "ไม่ระบุผู้โอน"}
                    {record.bankRef ? ` · ${record.bankRef}` : ""}
                  </p>
                  <p className="mt-1 text-sm">
                    {record.passbookMatched ? (
                      <span className="font-bold text-[#2F7A45]">
                        กระทบสมุดบัญชีแล้ว
                      </span>
                    ) : (
                      <span className="text-[#9F3B0F]">
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
                      onClick={() =>
                        matchPassbook.mutate({
                          id: record.id,
                          passbookDate: new Date(),
                        })
                      }
                      disabled={matchPassbook.isPending}
                      className="min-h-11 rounded-xl border border-[#9BCBA5] bg-[#E4F3E7] px-3 py-2 text-xs font-bold text-[#2F7A45] disabled:opacity-50"
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
