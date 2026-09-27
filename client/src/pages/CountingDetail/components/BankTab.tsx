import { toast } from "sonner";
import { MoneyDisplay } from "@/components/common/CommonUI";
import type { AppRouter } from "../../../../../server/routers";
import type { inferRouterOutputs } from "@trpc/server";
import type { reconcile } from "@shared/counting";

type RouterOutputs = inferRouterOutputs<AppRouter>;
type CountingDetail = NonNullable<RouterOutputs["counting"]["get"]>;
type Recon = ReturnType<typeof reconcile>;
import { fmtBaht } from "../utils";
import { Variance } from "./Variance";

export interface BankTabProps {
  detail: CountingDetail;
  sessionId: number;
  r: Recon;
  bType: "transfer_in" | "cash_deposit";
  setBType: (v: "transfer_in" | "cash_deposit") => void;
  bAmount: string;
  setBAmount: (v: string) => void;
  bName: string;
  setBName: (v: string) => void;
  bRef: string;
  setBRef: (v: string) => void;
  addBankRecord: {
    mutate: (
      input: {
        sessionId: number;
        type: "transfer_in" | "cash_deposit";
        amount: number;
        transferredByName: string | undefined;
        bankRef: string | undefined;
      },
      opts?: { onSuccess?: () => void }
    ) => void;
    isPending: boolean;
  };
  matchPassbook: {
    mutate: (input: { id: number; passbookDate: Date }) => void;
    isPending: boolean;
  };
}

export function BankTab(props: BankTabProps) {
  const {
    detail,
    sessionId,
    r,
    bType,
    setBType,
    bAmount,
    setBAmount,
    bName,
    setBName,
    bRef,
    setBRef,
    addBankRecord,
    matchPassbook,
  } = props;
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
              className="rounded-3xl border border-hairline bg-white p-5 md:p-6"
            >
              <h2 className="mb-4 font-bold text-foreground">
                บันทึกรายการธนาคาร
              </h2>
              <div className="grid gap-4 md:grid-cols-4">
                <label className="text-sm font-semibold text-secondary-foreground">
                  ประเภท
                  <select
                    value={bType}
                    onChange={e => setBType(e.target.value as typeof bType)}
                    className="mt-1 w-full rounded-xl border border-hairline p-3 text-sm font-normal text-foreground"
                  >
                    <option value="cash_deposit">นำเงินสดเข้าฝาก</option>
                    <option value="transfer_in">สมาชิกโอนเข้าบัญชี</option>
                  </select>
                </label>
                <label className="text-sm font-semibold text-secondary-foreground">
                  จำนวนเงิน *
                  <input
                    type="number"
                    required
                    min="0.25"
                    step="0.25"
                    value={bAmount}
                    onChange={e => setBAmount(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-hairline p-3 text-base font-bold tabular-nums text-foreground"
                  />
                </label>
                <label className="text-sm font-semibold text-secondary-foreground">
                  ผู้โอน
                  <input
                    value={bName}
                    onChange={e => setBName(e.target.value)}
                    placeholder="เว้นว่างได้ถ้าเป็นการนำฝาก"
                    className="mt-1 w-full rounded-xl border border-hairline p-3 text-sm font-normal text-foreground"
                  />
                </label>
                <label className="text-sm font-semibold text-secondary-foreground">
                  เลขอ้างอิง
                  <input
                    value={bRef}
                    onChange={e => setBRef(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-hairline p-3 font-mono text-sm font-normal text-foreground"
                  />
                </label>
              </div>
              <button
                type="submit"
                disabled={addBankRecord.isPending}
                className="mt-4 min-h-11 rounded-2xl bg-[#4F8B33] px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50"
              >
                {addBankRecord.isPending ? "กำลังบันทึก…" : "เพิ่มรายการ"}
              </button>
            </form>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-2xl border border-hairline bg-white p-4">
                <p className="text-sm text-secondary-foreground">เงินโอนเข้าบัญชีจริง</p>
                <MoneyDisplay
                  amount={r.actualTransferIn}
                  type="income"
                  size="lg"
                />
                <p className="mt-1 text-sm text-secondary-foreground">
                  เทียบซองโอน {fmtBaht(r.envelopeTransferTotal)}
                </p>
                <div className="mt-1">
                  <Variance amount={r.transferVariance} />
                </div>
              </div>
              <div className="rounded-2xl border border-hairline bg-white p-4">
                <p className="text-sm text-secondary-foreground">นำเงินสดเข้าฝากจริง</p>
                <MoneyDisplay amount={r.actualCashDeposit} size="lg" />
                <p className="mt-1 text-sm text-secondary-foreground">
                  ต้องนำฝาก {fmtBaht(r.expectedDeposit)}
                </p>
                <div className="mt-1">
                  <Variance amount={r.depositVariance} />
                </div>
              </div>
            </div>

            <div className="overflow-hidden rounded-3xl border border-hairline bg-white">
              <h2 className="border-b border-hairline p-4 font-bold text-foreground">
                รายการธนาคาร ({detail.bankRecords.length})
              </h2>
              {detail.bankRecords.length === 0 ? (
                <p className="p-8 text-center text-sm text-secondary-foreground">
                  ยังไม่มีรายการธนาคารในรอบนี้
                </p>
              ) : (
                <ul className="divide-y divide-[#F0E6D8]">
                  {detail.bankRecords.map(record => (
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
                        <p className="text-sm text-secondary-foreground">
                          {record.transferredByName || "ไม่ระบุผู้โอน"}
                          {record.bankRef ? ` · ${record.bankRef}` : ""}
                        </p>
                        <p className="mt-1 text-sm">
                          {record.passbookMatched ? (
                            <span className="font-bold text-success">
                              กระทบสมุดบัญชีแล้ว
                            </span>
                          ) : (
                            <span className="text-[#C26B1E]">
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
                            className="min-h-11 rounded-xl border border-success-border bg-success-bg px-3 py-2 text-xs font-bold text-success disabled:opacity-50"
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
