import React from "react";
import { MoneyDisplay } from "@/components/common/CommonUI";
import { THB_DENOMINATIONS } from "@shared/counting";
import { fmtBaht, Variance } from "./countingUtils";

interface CashCountTabProps {
  sessionId: number;
  editable: boolean;
  cashCounts: Array<{
    denomination: number;
    kind: "note" | "coin" | string;
    quantity: number;
  }>;
  draftCounts: Record<string, string>;
  setDraftCounts: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  envelopeCashTotal: number;
  countedCashTotal: number;
  cashVariance: number;
  setCashCount: {
    mutate: (vars: {
      sessionId: number;
      denomination: number;
      kind: "note" | "coin";
      quantity: number;
    }) => void;
  };
}

export function CashCountTab({
  sessionId,
  editable,
  cashCounts,
  draftCounts,
  setDraftCounts,
  envelopeCashTotal,
  countedCashTotal,
  cashVariance,
  setCashCount,
}: CashCountTabProps) {
  return (
    <section className="space-y-4">
      <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
        <div className="border-b border-border p-4">
          <h2 className="font-bold text-foreground">ใบนับธนบัตรและเหรียญ</h2>
          <p className="mt-1 text-sm text-foreground-soft">
            กรอกจำนวนใบหรือเหรียญ ระบบคูณและรวมยอดให้ทันที
          </p>
        </div>
        <ul className="divide-y divide-divider">
          {THB_DENOMINATIONS.map(denomination => {
            const key = `${denomination.value}-${denomination.kind}`;
            const saved = cashCounts.find(
              row =>
                row.denomination === denomination.value &&
                row.kind === denomination.kind
            );
            const draft = draftCounts[key];
            const quantity =
              draft !== undefined ? draft : String(saved?.quantity ?? "");
            const subtotal = denomination.value * (Number(quantity) || 0);
            return (
              <li key={key} className="flex items-center gap-3 p-3 md:p-4">
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
                  className="w-24 rounded-xl border border-border p-2.5 text-right text-base font-bold tabular-nums text-foreground disabled:opacity-60"
                />
                <span className="ml-auto text-right text-sm font-bold tabular-nums text-foreground-soft">
                  {fmtBaht(subtotal)}
                </span>
              </li>
            );
          })}
        </ul>
        <div className="flex items-center justify-between border-t-2 border-border bg-background p-4">
          <div>
            <p className="font-bold text-foreground">รวมนับได้</p>
            <p className="text-sm text-foreground-soft">
              เทียบซองเงินสด {fmtBaht(envelopeCashTotal)}
            </p>
          </div>
          <div className="text-right">
            <MoneyDisplay amount={countedCashTotal} size="xl" />
            <div className="mt-1">
              <Variance amount={cashVariance} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
