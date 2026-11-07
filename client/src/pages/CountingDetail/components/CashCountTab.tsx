import React, { useEffect, useRef } from "react";
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
  const flushRef = useRef<() => void>(() => {});
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastSentRef = useRef<Record<string, number>>({});

  const flushSingle = (key: string, nextValue: number) => {
    if (!editable) return;
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    const [valStr, kind] = key.split("-");
    const val = Number(valStr);
    const saved = cashCounts.find(
      r => r.denomination === val && r.kind === kind
    );
    const currentSaved = saved?.quantity ?? 0;
    const lastSent = lastSentRef.current[key];

    // Prevent duplicate mutations: if the quantity is already matching saved and hasn't changed,
    // or if we already sent this exact quantity, do not fire another mutation.
    if (nextValue === currentSaved && lastSent === undefined) return;
    if (lastSent !== undefined && nextValue === lastSent) return;

    lastSentRef.current[key] = nextValue;
    setCashCount.mutate({
      sessionId,
      denomination: val,
      kind: kind as "note" | "coin",
      quantity: nextValue,
    });
  };

  flushRef.current = () => {
    if (!editable) return;
    Object.entries(draftCounts).forEach(([key, draftVal]) => {
      if (draftVal === undefined) return;
      const next = Number(draftVal || 0);
      if (!Number.isFinite(next) || next < 0) return;
      flushSingle(key, next);
    });
  };

  useEffect(() => {
    if (!editable) return;
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      flushRef.current();
    }, 600);
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [draftCounts, editable, sessionId]);

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      flushRef.current();
    };
  }, [sessionId]);

  return (
    <section className="space-y-4">
      <div className="bento-card-static overflow-hidden">
        <div className="border-b-2 border-[var(--ink)] bg-paper-2 p-4">
          <h2 className="font-extrabold text-ink">ใบนับธนบัตรและเหรียญ</h2>
          <p className="mt-1 text-sm font-medium text-ink-2">
            กรอกจำนวนใบหรือเหรียญ ระบบคูณและรวมยอดให้ทันที
          </p>
        </div>
        <ul className="divide-y divide-line">
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
            const currentQty = Math.max(0, Math.floor(Number(quantity) || 0));
            const stepBy = (delta: number) => {
              if (!editable) return;
              const next = Math.max(0, currentQty + delta);
              setDraftCounts(prev => ({
                ...prev,
                [key]: String(next),
              }));
            };
            return (
              <li
                key={key}
                className="flex items-center gap-2 sm:gap-3 p-3 md:p-4 hover:bg-paper-2/40"
              >
                <span className="w-24 shrink-0 text-sm font-extrabold text-ink sm:w-32 md:w-40">
                  {denomination.label}
                </span>
                <div className="inline-flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={!editable || currentQty <= 0}
                    onClick={() => stepBy(-1)}
                    aria-label={`ลดจำนวน ${denomination.label}`}
                    className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl border-2 border-[var(--ink)] bg-paper-2 text-lg font-black text-ink shadow-[2px_2px_0_var(--ink)] active:translate-y-0.5 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                  >
                    −
                  </button>
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
                      flushSingle(key, next);
                    }}
                    placeholder="0"
                    aria-label={`จำนวน ${denomination.label}`}
                    className="w-20 sm:w-24 rounded-xl border-2 border-[var(--ink)] bg-surface p-2.5 text-right text-base font-extrabold tabular-nums text-ink shadow-[2px_2px_0_var(--ink)] focus:border-brand focus:outline-none disabled:opacity-60"
                  />
                  <button
                    type="button"
                    disabled={!editable}
                    onClick={() => stepBy(1)}
                    aria-label={`เพิ่มจำนวน ${denomination.label}`}
                    className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl border-2 border-[var(--ink)] bg-paper-2 text-lg font-black text-ink shadow-[2px_2px_0_var(--ink)] active:translate-y-0.5 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                  >
                    +
                  </button>
                </div>
                <span className="ml-auto text-right text-sm font-extrabold tabular-nums text-ink-2">
                  {fmtBaht(subtotal)}
                </span>
              </li>
            );
          })}
        </ul>
        <div className="flex items-center justify-between border-t-2 border-[var(--ink)] bg-paper-2 p-4">
          <div>
            <p className="font-extrabold text-ink">รวมนับได้</p>
            <p className="text-sm font-medium text-ink-2">
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
