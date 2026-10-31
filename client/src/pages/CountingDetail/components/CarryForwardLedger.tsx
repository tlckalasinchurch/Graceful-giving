import React, { useId, useState } from "react";
import type { Reconciliation } from "@shared/counting";
import { fmtBaht, Variance } from "./countingUtils";

interface CarryForwardLedgerProps {
  r: Reconciliation;
  /** Where the opening balances came from; null = none yet. */
  openingSource: "stored" | "previous" | null;
  /** Posted or closed: figures are part of the books. */
  locked: boolean;
  /** Treasurer, super admin or admin. */
  canEdit: boolean;
  unmatchedPassbookCount: number;
  pending: boolean;
  onSetOpening: (v: { openingCash: number; openingBank: number }) => void;
  onSetClosing: (v: {
    cashOnHandActual?: number;
    passbookBalance?: number;
    passbookBalanceDate?: Date;
  }) => void;
}

type Line = { sign: "+" | "−" | ""; label: string; amount: number };

/** One wallet written the way the paper sheet is: signed lines, a rule, the total. */
function WalletLedger({
  title,
  lines,
  totalLabel,
  total,
  totalTestId,
  children,
}: {
  title: string;
  lines: Line[];
  totalLabel: string;
  total: number;
  totalTestId: string;
  children?: React.ReactNode;
}) {
  const headingId = useId();
  return (
    <section aria-labelledby={headingId} className="p-5">
      <h3
        id={headingId}
        className="font-display text-lg font-semibold text-foreground"
      >
        {title}
      </h3>
      <dl className="mt-3 text-sm">
        {lines.map(line => (
          <div
            key={line.label}
            className="grid grid-cols-[1.25rem_1fr_auto] items-baseline gap-2 border-b border-line py-2"
          >
            <span aria-hidden className="font-mono text-ink-2">
              {line.sign}
            </span>
            <dt className="text-ink-2">{line.label}</dt>
            <dd className="tabular-nums text-foreground">
              {fmtBaht(line.amount)}
            </dd>
          </div>
        ))}
        <div className="grid grid-cols-[1.25rem_1fr_auto] items-baseline gap-2 border-b-[3px] border-double border-ink-2 py-2.5">
          <span aria-hidden className="font-mono text-ink-2">
            =
          </span>
          <dt className="font-bold text-foreground">{totalLabel}</dt>
          <dd
            data-testid={totalTestId}
            className="text-base font-bold tabular-nums text-foreground"
          >
            {fmtBaht(total)}
          </dd>
        </div>
      </dl>
      {children}
    </section>
  );
}

function parseAmount(raw: string): number | null {
  if (raw.trim() === "") return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

function AmountField({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  disabled: boolean;
}) {
  const id = useId();
  return (
    <div className="min-w-0 flex-1">
      <label htmlFor={id} className="text-xs font-semibold text-ink-2">
        {label}
      </label>
      <input
        id={id}
        type="number"
        inputMode="decimal"
        step="0.25"
        value={value}
        disabled={disabled}
        onChange={e => onChange(e.target.value)}
        className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 text-base font-bold tabular-nums text-foreground disabled:opacity-50"
      />
    </div>
  );
}

const saveButton =
  "min-h-11 shrink-0 rounded-lg border border-ink-2 px-4 text-sm font-bold text-foreground hover:bg-paper-2 disabled:opacity-40";

export function CarryForwardLedger({
  r,
  openingSource,
  locked,
  canEdit,
  unmatchedPassbookCount,
  pending,
  onSetOpening,
  onSetClosing,
}: CarryForwardLedgerProps) {
  const [openingCash, setOpeningCash] = useState("");
  const [openingBank, setOpeningBank] = useState("");
  const [cashInBox, setCashInBox] = useState("");
  const [passbook, setPassbook] = useState("");
  const [passbookDate, setPassbookDate] = useState("");
  const passbookDateId = useId();

  if (!r.hasCarryForward || r.closingCashExpected === null) {
    if (locked) {
      return (
        <p className="rounded-2xl border border-line bg-paper-2 p-4 text-sm text-ink-2">
          รอบนี้ลงบัญชีก่อนระบบมีการยกยอด จึงไม่มียอดยกมาและยกไป
        </p>
      );
    }
    if (!canEdit) {
      return (
        <p className="rounded-2xl border border-line bg-paper-2 p-4 text-sm text-ink-2">
          รอฝ่ายการเงินกรอกยอดยกมาของรอบแรก
        </p>
      );
    }
    const cash = parseAmount(openingCash);
    const bank = parseAmount(openingBank);
    return (
      <section className="rounded-2xl border border-line bg-surface p-5 shadow-sm">
        <h3 className="font-display text-lg font-semibold text-foreground">
          ยอดยกมา (รอบแรก)
        </h3>
        <p className="mt-1 text-sm text-ink-2">
          ยังไม่มีรอบก่อนหน้าให้ยกยอดมา กรอกเงินสดที่มีอยู่ในกล่องตอนนี้
          และยอดล่าสุดในสมุดบัญชี กรอกได้ครั้งเดียว รอบต่อไประบบจะยกยอดให้เอง
        </p>
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <AmountField
            label="เงินสดยกมา"
            value={openingCash}
            onChange={setOpeningCash}
            disabled={pending}
          />
          <AmountField
            label="ยอดธนาคารยกมา"
            value={openingBank}
            onChange={setOpeningBank}
            disabled={pending}
          />
          <button
            type="button"
            className={saveButton}
            disabled={pending || cash === null || cash < 0 || bank === null}
            onClick={() =>
              cash !== null &&
              bank !== null &&
              onSetOpening({ openingCash: cash, openingBank: bank })
            }
          >
            บันทึกยอดยกมา
          </button>
        </div>
      </section>
    );
  }

  const cashLines: Line[] = [
    { sign: "", label: "ยกมา", amount: r.openingCash ?? 0 },
    { sign: "+", label: "ถวายเงินสด (นับได้)", amount: r.countedCashTotal },
    { sign: "+", label: "ถอนจากธนาคาร", amount: r.withdrawalTotal },
    { sign: "−", label: "หักเบิกค่าใช้จ่าย", amount: r.deductionTotal },
    { sign: "−", label: "นำฝากธนาคาร", amount: r.actualCashDeposit },
  ];
  const bankLines: Line[] = [
    { sign: "", label: "ยกมา", amount: r.openingBank ?? 0 },
    { sign: "+", label: "โอนเข้า", amount: r.actualTransferIn },
    { sign: "+", label: "นำเงินสดฝาก", amount: r.actualCashDeposit },
    { sign: "+", label: "เงินเข้าอื่นๆ", amount: r.otherInTotal },
    { sign: "−", label: "ถอนเป็นเงินสด", amount: r.withdrawalTotal },
    { sign: "−", label: "เงินออกอื่นๆ", amount: r.otherOutTotal },
  ];
  const cashInBoxValue = parseAmount(cashInBox);
  const passbookValue = parseAmount(passbook);

  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-sm">
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line px-5 py-4">
        <h2 className="font-bold text-foreground">ยอดยกมาและยกไป</h2>
        <p className="text-xs text-ink-2">
          {openingSource === "previous"
            ? "ยกมาจากรอบที่ลงบัญชีก่อนหน้า"
            : "ยกมาตามที่บันทึกไว้"}
        </p>
      </div>
      <div className="grid divide-y divide-line md:grid-cols-2 md:divide-x md:divide-y-0">
        <WalletLedger
          title="เงินสดในมือ"
          lines={cashLines}
          totalLabel="ควรเหลือ"
          total={r.closingCashExpected}
          totalTestId="closing-cash"
        >
          <div className="mt-4 space-y-3">
            {r.cashOnHandActual !== null && r.cashOnHandVariance !== null && (
              <p className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
                <span className="text-ink-2">
                  นับในกล่องได้ {fmtBaht(r.cashOnHandActual)}
                </span>
                <Variance amount={r.cashOnHandVariance} />
              </p>
            )}
            {!locked && canEdit && (
              <div className="flex flex-wrap items-end gap-3">
                <AmountField
                  label="นับเงินในกล่องได้จริง"
                  value={cashInBox}
                  onChange={setCashInBox}
                  disabled={pending}
                />
                <button
                  type="button"
                  className={saveButton}
                  disabled={
                    pending || cashInBoxValue === null || cashInBoxValue < 0
                  }
                  onClick={() => {
                    if (cashInBoxValue === null) return;
                    onSetClosing({ cashOnHandActual: cashInBoxValue });
                    setCashInBox("");
                  }}
                >
                  บันทึกยอดในกล่อง
                </button>
              </div>
            )}
            {r.cashOnHandActual === null && (
              <p className="text-xs text-brand-ink">
                ต้องนับเงินในกล่องก่อนลงบัญชี
              </p>
            )}
          </div>
        </WalletLedger>

        <WalletLedger
          title="บัญชีธนาคาร"
          lines={bankLines}
          totalLabel="ควรเป็น"
          total={r.closingBankExpected ?? 0}
          totalTestId="closing-bank"
        >
          <div className="mt-4 space-y-3">
            {r.passbookBalance !== null && r.passbookVariance !== null && (
              <p className="flex flex-wrap items-baseline justify-between gap-2 text-sm text-ink-2">
                <span>สมุดบัญชี {fmtBaht(r.passbookBalance)}</span>
                <span className="tabular-nums">
                  {r.passbookVariance === 0
                    ? "ตรงกับที่ควรเป็น"
                    : `ต่าง ${fmtBaht(r.passbookVariance)}`}
                </span>
              </p>
            )}
            {unmatchedPassbookCount > 0 && (
              <p className="text-xs text-brand-ink">
                ยังไม่ได้ติ๊กกับสมุดบัญชี {unmatchedPassbookCount} รายการ
              </p>
            )}
            {!locked && canEdit && (
              <div className="flex flex-wrap items-end gap-3">
                <AmountField
                  label="ยอดล่าสุดในสมุดบัญชี"
                  value={passbook}
                  onChange={setPassbook}
                  disabled={pending}
                />
                <div className="min-w-0 flex-1">
                  <label
                    htmlFor={passbookDateId}
                    className="text-xs font-semibold text-ink-2"
                  >
                    วันที่ในสมุด
                  </label>
                  <input
                    id={passbookDateId}
                    type="date"
                    value={passbookDate}
                    disabled={pending}
                    onChange={e => setPassbookDate(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-foreground disabled:opacity-50"
                  />
                </div>
                <button
                  type="button"
                  className={saveButton}
                  disabled={pending || passbookValue === null}
                  onClick={() => {
                    if (passbookValue === null) return;
                    onSetClosing({
                      passbookBalance: passbookValue,
                      ...(passbookDate && {
                        passbookBalanceDate: new Date(passbookDate),
                      }),
                    });
                    setPassbook("");
                  }}
                >
                  บันทึกยอดสมุด
                </button>
              </div>
            )}
            <p className="text-xs text-ink-2">
              สมุดอาจอัปเดตไม่ตรงรอบ ส่วนต่างจึงแสดงไว้ดูเท่านั้น
              ไม่บล็อกการลงบัญชี
            </p>
          </div>
        </WalletLedger>
      </div>
    </div>
  );
}
