import React, { useEffect, useRef } from "react";
import { Banknote, Coins, Minus, Plus } from "lucide-react";
import { THB_DENOMINATIONS, type Denomination } from "@shared/counting";
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

/** Saves a stepper change after the counter stops tapping for this long. */
const STEP_SAVE_DELAY_MS = 700;

/** Swatch colours roughly matching each Thai note, for quick recognition. */
const NOTE_SWATCH: Record<number, string> = {
  1000: "bg-[#9C8C7A]",
  500: "bg-[#8E6BA8]",
  100: "bg-[#D2574B]",
  50: "bg-[#4E7FB8]",
  20: "bg-[#5E9E5C]",
};

const keyOf = (d: Denomination) => `${d.value}-${d.kind}`;

/** "฿1,000" or "50 สต." — the group heading already says note or coin. */
const shortLabel = (d: Denomination) =>
  d.value >= 1
    ? `฿${d.value.toLocaleString("th-TH")}`
    : `${Math.round(d.value * 100)} สต.`;

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
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  useEffect(() => {
    const pending = timers.current;
    return () => Object.values(pending).forEach(clearTimeout);
  }, []);

  const savedQuantity = (d: Denomination) =>
    cashCounts.find(row => row.denomination === d.value && row.kind === d.kind)
      ?.quantity ?? 0;

  const currentText = (d: Denomination) => {
    const draft = draftCounts[keyOf(d)];
    if (draft !== undefined) return draft;
    const saved = savedQuantity(d);
    return saved ? String(saved) : "";
  };

  const save = (d: Denomination, quantity: number) => {
    if (!editable || !Number.isInteger(quantity) || quantity < 0) return;
    if (quantity === savedQuantity(d)) return;
    setCashCount.mutate({
      sessionId,
      denomination: d.value,
      kind: d.kind,
      quantity,
    });
  };

  const setText = (d: Denomination, text: string) =>
    setDraftCounts(prev => ({ ...prev, [keyOf(d)]: text }));

  const step = (d: Denomination, delta: number) => {
    const next = Math.max(0, (Number(currentText(d)) || 0) + delta);
    setText(d, String(next));
    const key = keyOf(d);
    clearTimeout(timers.current[key]);
    timers.current[key] = setTimeout(() => save(d, next), STEP_SAVE_DELAY_MS);
  };

  const focusNext = (d: Denomination) => {
    const index = THB_DENOMINATIONS.findIndex(x => keyOf(x) === keyOf(d));
    const next = THB_DENOMINATIONS[index + 1];
    if (next) inputRefs.current[keyOf(next)]?.focus();
    else inputRefs.current[keyOf(d)]?.blur();
  };

  const groups: Array<{
    kind: "note" | "coin";
    title: string;
    icon: typeof Banknote;
  }> = [
    { kind: "note", title: "ธนบัตร", icon: Banknote },
    { kind: "coin", title: "เหรียญ", icon: Coins },
  ];

  const groupTotal = (kind: "note" | "coin") =>
    THB_DENOMINATIONS.filter(d => d.kind === kind).reduce(
      (sum, d) =>
        sum + Math.round(d.value * 100) * (Number(currentText(d)) || 0),
      0
    ) / 100;

  const pieceCount = THB_DENOMINATIONS.reduce(
    (sum, d) => sum + (Number(currentText(d)) || 0),
    0
  );

  return (
    <section className="space-y-4">
      <div>
        <h2 className="font-bold text-[#171311]">ใบนับธนบัตรและเหรียญ</h2>
        <p className="mt-1 text-sm text-[#51443A]">
          กรอกจำนวนใบหรือเหรียญ หรือกด − / + ระบบคูณและรวมยอดให้ทันที กด Enter
          เพื่อไปยังช่องถัดไป
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {groups.map(group => {
          const GroupIcon = group.icon;
          return (
            <div
              key={group.kind}
              className="overflow-hidden rounded-2xl border border-[#E7DCC8] bg-card shadow-xs"
            >
              <div className="flex items-center justify-between gap-3 border-b border-[#E7DCC8] px-4 py-3">
                <h3 className="flex items-center gap-2 text-sm font-bold text-[#171311]">
                  <GroupIcon className="size-4 text-[#C94F16]" />
                  {group.title}
                </h3>
                <span className="text-sm font-bold tabular-nums text-[#51443A]">
                  {fmtBaht(groupTotal(group.kind))}
                </span>
              </div>
              <ul className="divide-y divide-[#EFE5D3]">
                {THB_DENOMINATIONS.filter(d => d.kind === group.kind).map(d => {
                  const key = keyOf(d);
                  const text = currentText(d);
                  const quantity = Number(text) || 0;
                  const subtotal = (Math.round(d.value * 100) * quantity) / 100;
                  return (
                    <li
                      key={key}
                      className={`flex items-center gap-2 px-3 py-2.5 transition-colors duration-200 sm:gap-3 sm:px-4 ${quantity > 0 ? "bg-[#FFF4D6]/50" : ""}`}
                    >
                      <span className="flex min-w-0 flex-1 items-center gap-2.5">
                        {d.kind === "note" ? (
                          <span
                            aria-hidden="true"
                            className={`hidden h-5 w-8 shrink-0 rounded-[4px] sm:block ${NOTE_SWATCH[d.value] ?? "bg-[#A39A91]"} opacity-80 ring-1 ring-inset ring-black/10`}
                          />
                        ) : (
                          <span
                            aria-hidden="true"
                            className="hidden size-6 shrink-0 rounded-full sm:block bg-gradient-to-br from-[#E8D9B5] to-[#B89B62] ring-1 ring-inset ring-black/10"
                          />
                        )}
                        <span className="whitespace-nowrap text-sm font-bold tabular-nums text-[#171311]">
                          <span aria-hidden="true">{shortLabel(d)}</span>
                          <span className="sr-only">{d.label}</span>
                        </span>
                      </span>

                      <div className="flex shrink-0 items-center rounded-xl border border-[#E7DCC8] bg-white shadow-xs focus-within:border-[#C94F16] focus-within:ring-[3px] focus-within:ring-[#C94F16]/20">
                        <button
                          type="button"
                          disabled={!editable || quantity === 0}
                          onClick={() => step(d, -1)}
                          aria-label={`ลด ${d.label} 1`}
                          className="flex size-11 items-center justify-center rounded-l-xl text-[#51443A] hover:bg-[#FFF4D6] disabled:opacity-35"
                        >
                          <Minus className="size-4" />
                        </button>
                        <input
                          ref={el => {
                            inputRefs.current[key] = el;
                          }}
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          enterKeyHint="next"
                          autoComplete="off"
                          disabled={!editable}
                          value={text}
                          onFocus={e => e.currentTarget.select()}
                          onChange={e =>
                            setText(d, e.target.value.replace(/\D/g, ""))
                          }
                          onKeyDown={e => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              focusNext(d);
                            }
                          }}
                          onBlur={e => save(d, Number(e.target.value || 0))}
                          placeholder="0"
                          aria-label={`จำนวน ${d.label}`}
                          className="h-11 w-12 bg-transparent text-center text-base font-bold tabular-nums text-[#171311] outline-none placeholder:text-[#D9C6A6] disabled:opacity-60 sm:w-16"
                        />
                        <button
                          type="button"
                          disabled={!editable}
                          onClick={() => step(d, 1)}
                          aria-label={`เพิ่ม ${d.label} 1`}
                          className="flex size-11 items-center justify-center rounded-r-xl text-[#C94F16] hover:bg-[#FFF4D6] disabled:opacity-35"
                        >
                          <Plus className="size-4" />
                        </button>
                      </div>

                      <span
                        className={`w-[5.5rem] shrink-0 text-right text-[13px] font-bold tabular-nums sm:w-28 sm:text-sm ${quantity > 0 ? "text-[#171311]" : "text-[#B9A78B]"}`}
                      >
                        {fmtBaht(subtotal)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>

      {/* Live total. Sticks above the mobile tab bar while counting. */}
      <div className="sticky bottom-[calc(var(--mobile-nav-clearance)+env(safe-area-inset-bottom)-0.5rem)] z-20 lg:bottom-4">
        <div
          aria-live="polite"
          className="flex flex-col gap-3 rounded-2xl bg-gradient-to-br from-[#9F3B0F] via-[#C94F16] to-[#D9581B] p-4 text-white shadow-lg sm:flex-row sm:items-center sm:justify-between sm:p-5"
        >
          <div>
            <p className="text-sm font-semibold text-[#FFF4D6]">
              รวมเงินสดที่นับได้ · {pieceCount.toLocaleString("th-TH")} ชิ้น
            </p>
            <p className="text-3xl font-bold leading-tight tabular-nums sm:text-4xl">
              {fmtBaht(countedCashTotal)}
            </p>
          </div>
          <div className="flex items-center justify-between gap-3 rounded-xl bg-white/95 px-3 py-2 sm:flex-col sm:items-end sm:bg-transparent sm:p-0">
            <span className="text-xs text-[#51443A] sm:text-[#FFF4D6]">
              เทียบซองเงินสด {fmtBaht(envelopeCashTotal)}
            </span>
            <Variance amount={cashVariance} />
          </div>
        </div>
      </div>
    </section>
  );
}
