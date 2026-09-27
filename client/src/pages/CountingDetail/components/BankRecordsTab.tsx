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
        className="rounded-2xl border border-[#3D3D3D] bg-[#262626] p-5 md:p-6"
      >
        <h2 className="mb-4 font-bold text-foreground">บันทึกรายการธนาคาร</h2>
        <div className="grid gap-4 md:grid-cols-4">
          <label className="text-sm font-semibold text-[#C9B8A8]">
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
          <label className="text-sm font-semibold text-[#C9B8A8]">
            จำนวนเงิน *
            <input
              type="number"
              required
              min="0.25"
              step="0.25"
              value={bAmount}
              onChange={e => setBAmount(e.target.value)}
              className="mt-1 w-full rounded-xl border border-[#3D3D3D] p-3 text-base font-bold tabular-nums text-foreground"
            />
          </label>
          <label className="text-sm font-semibold text-[#C9B8A8]">
            ผู้โอน
            <input
              value={bName}
              onChange={e => setBName(e.target.value)}
              placeholder="เว้นว่างได้ถ้าเป็นการนำฝาก"
              className="mt-1 w-full rounded-xl border border-[#3D3D3D] p-3 text-sm font-normal text-foreground"
            />
          </label>
          <label className="text-sm font-semibold text-[#C9B8A8]">
            เลขอ้างอิง
            <input
              value={bRef}
              onChange={e => setBRef(e.target.value)}
              className="mt-1 w-full rounded-xl border border-[#3D3D3D] p-3 font-mono text-sm font-normal text-foreground"
            />
          </label>
        </div>
        <button
          type="submit"
          disabled={addBankRecord.isPending}
          className="mt-4 min-h-11 rounded-xl bg-[#34D399] px-5 py-2.5 text-sm font-bold text-[#1B1B1B] disabled:opacity-50"
        >
          {addBankRecord.isPending ? "กำลังบันทึก…" : "เพิ่มรายการ"}
        </button>
      </form>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-2xl border border-[#3D3D3D] bg-[#262626] p-4">
          <p className="text-sm text-[#C9B8A8]">เงินโอนเข้าบัญชีจริง</p>
          <MoneyDisplay amount={actualTransferIn} type="income" size="lg" />
          <p className="mt-1 text-sm text-[#C9B8A8]">
            เทียบซองโอน {fmtBaht(envelopeTransferTotal)}
          </p>
          <div className="mt-1">
            <Variance amount={transferVariance} />
          </div>
        </div>
        <div className="rounded-2xl border border-[#3D3D3D] bg-[#262626] p-4">
          <p className="text-sm text-[#C9B8A8]">นำเงินสดเข้าฝากจริง</p>
          <MoneyDisplay amount={actualCashDeposit} size="lg" />
          <p className="mt-1 text-sm text-[#C9B8A8]">
            ต้องนำฝาก {fmtBaht(expectedDeposit)}
          </p>
          <div className="mt-1">
            <Variance amount={depositVariance} />
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-[#3D3D3D] bg-[#262626]">
        <h2 className="border-b border-[#3D3D3D] p-4 font-bold text-foreground">
          รายการธนาคาร ({bankRecords.length})
        </h2>
        {bankRecords.length === 0 ? (
          <p className="p-8 text-center text-sm text-[#C9B8A8]">
            ยังไม่มีรายการธนาคารในรอบนี้
          </p>
        ) : (
          <ul className="divide-y divide-[#3D3D3D]">
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
                  <p className="text-sm text-[#C9B8A8]">
                    {record.transferredByName || "ไม่ระบุผู้โอน"}
                    {record.bankRef ? ` · ${record.bankRef}` : ""}
                  </p>
                  <p className="mt-1 text-sm">
                    {record.passbookMatched ? (
                      <span className="font-bold text-[#34D399]">
                        กระทบสมุดบัญชีแล้ว
                      </span>
                    ) : (
                      <span className="text-[#D9591A]">
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
                      className="min-h-11 rounded-xl border border-[#2E4A34] bg-[#1A2E20] px-3 py-2 text-xs font-bold text-[#34D399] disabled:opacity-50"
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
