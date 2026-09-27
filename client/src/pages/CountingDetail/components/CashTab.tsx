import type React from "react";
import { MoneyDisplay } from "@/components/common/CommonUI";
import { THB_DENOMINATIONS } from "@shared/counting";
import type { AppRouter } from "../../../../../server/routers";
import type { inferRouterOutputs } from "@trpc/server";
import type { reconcile } from "@shared/counting";

type RouterOutputs = inferRouterOutputs<AppRouter>;
type CountingDetail = NonNullable<RouterOutputs["counting"]["get"]>;
type Recon = ReturnType<typeof reconcile>;
import { fmtBaht } from "../utils";
import { Variance } from "./Variance";

export interface CashTabProps {
  detail: CountingDetail;
  sessionId: number;
  editable: boolean;
  r: Recon;
  draftCounts: Record<string, string>;
  setDraftCounts: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  setCashCount: {
    mutate: (input: {
      sessionId: number;
      denomination: number;
      kind: "note" | "coin";
      quantity: number;
    }) => void;
  };
}

export function CashTab(props: CashTabProps) {
  const {
    detail,
    sessionId,
    editable,
    r,
    draftCounts,
    setDraftCounts,
    setCashCount,
  } = props;
  return (
          <section className="space-y-4">
            <div className="overflow-hidden rounded-3xl border border-hairline bg-white">
              <div className="border-b border-hairline p-4">
                <h2 className="font-bold text-foreground">
                  ใบนับธนบัตรและเหรียญ
                </h2>
                <p className="mt-1 text-sm text-secondary-foreground">
                  กรอกจำนวนใบหรือเหรียญ ระบบคูณและรวมยอดให้ทันที
                </p>
              </div>
              <ul className="divide-y divide-[#F0E6D8]">
                {THB_DENOMINATIONS.map(denomination => {
                  const key = `${denomination.value}-${denomination.kind}`;
                  const saved = detail.cashCounts.find(
                    row =>
                      row.denomination === denomination.value &&
                      row.kind === denomination.kind
                  );
                  const draft = draftCounts[key];
                  const quantity =
                    draft !== undefined ? draft : String(saved?.quantity ?? "");
                  const subtotal = denomination.value * (Number(quantity) || 0);
                  return (
                    <li
                      key={key}
                      className="flex items-center gap-3 p-3 md:p-4"
                    >
                      <span className="w-28 shrink-0 text-sm font-bold text-foreground md:w-40">
                        {denomination.label}
                      </span>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        inputMode="numeric"
                        disabled={!editable}
                        value={quantity}
                        onChange={e =>
                          setDraftCounts(prev => ({
                            ...prev,
                            [key]: e.target.value,
                          }))
                        }
                        onBlur={e => {
                          if (!editable) return;
                          const next = Number(e.target.value || 0);
                          if (!Number.isFinite(next) || next < 0) return;
                          if (next === (saved?.quantity ?? 0)) return;
                          setCashCount.mutate({
                            sessionId,
                            denomination: denomination.value,
                            kind: denomination.kind,
                            quantity: next,
                          });
                        }}
                        placeholder="0"
                        aria-label={`จำนวน ${denomination.label}`}
                        className="w-24 rounded-xl border border-hairline p-2.5 text-right text-base font-bold tabular-nums text-foreground disabled:opacity-60"
                      />
                      <span className="ml-auto text-right text-sm font-bold tabular-nums text-secondary-foreground">
                        {fmtBaht(subtotal)}
                      </span>
                    </li>
                  );
                })}
              </ul>
              <div className="flex items-center justify-between border-t-2 border-hairline bg-surface-subtle p-4">
                <div>
                  <p className="font-bold text-foreground">รวมนับได้</p>
                  <p className="text-sm text-secondary-foreground">
                    เทียบซองเงินสด {fmtBaht(r.envelopeCashTotal)}
                  </p>
                </div>
                <div className="text-right">
                  <MoneyDisplay amount={r.countedCashTotal} size="xl" />
                  <div className="mt-1">
                    <Variance amount={r.cashVariance} />
                  </div>
                </div>
              </div>
            </div>
          </section>
  );
}
