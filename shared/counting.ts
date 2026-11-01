/**
 * Weekly offering count and reconciliation.
 *
 * Shared by the client (live variance while the counters type) and the server
 * (enforces the same rules before a session may be posted). Keep it pure so
 * both sides always agree.
 *
 * All arithmetic runs in satang (1 baht = 100 satang) integers. Thai coins
 * include 0.25 and 0.50 baht, so summing baht as floats drifts.
 */

export type CashKind = "note" | "coin";

export interface Denomination {
  /** Face value in baht. */
  value: number;
  kind: CashKind;
  label: string;
}

/**
 * Thai currency in circulation, highest first. The 20 baht note is the most
 * common note in an offering bag — never drop it from the count sheet.
 */
export const THB_DENOMINATIONS: readonly Denomination[] = [
  { value: 1000, kind: "note", label: "ธนบัตร 1000" },
  { value: 500, kind: "note", label: "ธนบัตร 500" },
  { value: 100, kind: "note", label: "ธนบัตร 100" },
  { value: 50, kind: "note", label: "ธนบัตร 50" },
  { value: 20, kind: "note", label: "ธนบัตร 20" },
  { value: 10, kind: "coin", label: "เหรียญ 10" },
  { value: 5, kind: "coin", label: "เหรียญ 5" },
  { value: 2, kind: "coin", label: "เหรียญ 2" },
  { value: 1, kind: "coin", label: "เหรียญ 1" },
  { value: 0.5, kind: "coin", label: "เหรียญ 50 สตางค์" },
  { value: 0.25, kind: "coin", label: "เหรียญ 25 สตางค์" },
];

export function toSatang(baht: number): number {
  return Math.round(baht * 100);
}

export function toBaht(satang: number): number {
  return satang / 100;
}

export interface EnvelopeInput {
  amount: number;
  method: "cash" | "transfer" | "check";
}

export interface CashCountInput {
  denomination: number;
  kind: CashKind;
  quantity: number;
}

export interface DeductionInput {
  amount: number;
}

export const BANK_RECORD_TYPES = [
  "transfer_in",
  "cash_deposit",
  "withdrawal",
  "other_in",
  "other_out",
] as const;

export type BankRecordType = (typeof BANK_RECORD_TYPES)[number];

export interface BankRecordInput {
  amount: number;
  type: BankRecordType;
}

/** Balances carried between rounds. null = not known for this round. */
export interface CarryForwardInput {
  openingCash: number | null;
  openingBank: number | null;
  /** เงินสดในกล่องที่นับได้จริงหลังจ่ายและฝากแล้ว */
  cashOnHandActual: number | null;
  /** ยอดล่าสุดในสมุดบัญชี */
  passbookBalance: number | null;
}

export interface ReconciliationInput {
  envelopes: readonly EnvelopeInput[];
  cashCounts: readonly CashCountInput[];
  deductions: readonly DeductionInput[];
  bankRecords: readonly BankRecordInput[];
  carry?: CarryForwardInput;
}

/** Every figure is baht; variances are signed (positive = เกิน, negative = ขาด). */
export interface Reconciliation {
  /** ยอดถวายทั้งหมดตามซอง (ทุกช่องทาง) */
  offeringTotal: number;
  envelopeCashTotal: number;
  envelopeTransferTotal: number;
  envelopeCheckTotal: number;
  /** ยอดนับเงินสดได้จริง */
  countedCashTotal: number;
  /** นับได้ − ซองเงินสด */
  cashVariance: number;
  /** ยอดหักเบิกค่าใช้จ่าย */
  deductionTotal: number;
  actualCashDeposit: number;
  actualTransferIn: number;
  /** เข้าบัญชีจริง − ซองโอน */
  transferVariance: number;
  withdrawalTotal: number;
  otherInTotal: number;
  otherOutTotal: number;
  /** true when both opening balances are known. */
  hasCarryForward: boolean;
  openingCash: number | null;
  openingBank: number | null;
  /** ยกมา + ถวายเงินสด + ถอน − หักเบิก − ฝาก */
  closingCashExpected: number | null;
  cashOnHandActual: number | null;
  /** นับในกล่องได้จริง − ที่ควรเหลือ */
  cashOnHandVariance: number | null;
  /** ยกมา + โอนเข้า + ฝาก + เข้าอื่นๆ − ถอน − ออกอื่นๆ */
  closingBankExpected: number | null;
  passbookBalance: number | null;
  /** สมุดบัญชี − ที่ควรเป็น; informational, never part of isBalanced */
  passbookVariance: number | null;
  /** Count, transfers and (when carried forward) the cash box all agree. */
  isBalanced: boolean;
}

function sumSatang(values: readonly number[]): number {
  return values.reduce((total, value) => total + toSatang(value), 0);
}

function sumBank(
  records: readonly BankRecordInput[],
  type: BankRecordType
): number {
  return sumSatang(records.filter(r => r.type === type).map(r => r.amount));
}

function toBahtOrNull(satang: number | null): number | null {
  return satang === null ? null : toBaht(satang);
}

function toSatangOrNull(baht: number | null | undefined): number | null {
  return baht === null || baht === undefined ? null : toSatang(baht);
}

export function reconcile(input: ReconciliationInput): Reconciliation {
  const envelopeCash = sumSatang(
    input.envelopes.filter(e => e.method === "cash").map(e => e.amount)
  );
  const envelopeTransfer = sumSatang(
    input.envelopes.filter(e => e.method === "transfer").map(e => e.amount)
  );
  const envelopeCheck = sumSatang(
    input.envelopes.filter(e => e.method === "check").map(e => e.amount)
  );
  const offeringTotal = envelopeCash + envelopeTransfer + envelopeCheck;

  const countedCash = input.cashCounts.reduce(
    (total, row) => total + toSatang(row.denomination) * row.quantity,
    0
  );

  const deductions = sumSatang(input.deductions.map(d => d.amount));

  const cashDeposit = sumBank(input.bankRecords, "cash_deposit");
  const transferIn = sumBank(input.bankRecords, "transfer_in");
  const withdrawal = sumBank(input.bankRecords, "withdrawal");
  const otherIn = sumBank(input.bankRecords, "other_in");
  const otherOut = sumBank(input.bankRecords, "other_out");

  const cashVariance = countedCash - envelopeCash;
  const transferVariance = transferIn - envelopeTransfer;

  const openingCash = toSatangOrNull(input.carry?.openingCash);
  const openingBank = toSatangOrNull(input.carry?.openingBank);
  const cashOnHand = toSatangOrNull(input.carry?.cashOnHandActual);
  const passbook = toSatangOrNull(input.carry?.passbookBalance);
  const hasCarryForward = openingCash !== null && openingBank !== null;

  const closingCash = hasCarryForward
    ? openingCash + countedCash + withdrawal - deductions - cashDeposit
    : null;
  const closingBank = hasCarryForward
    ? openingBank + transferIn + cashDeposit + otherIn - withdrawal - otherOut
    : null;
  const cashOnHandVariance =
    closingCash !== null && cashOnHand !== null
      ? cashOnHand - closingCash
      : null;
  const passbookVariance =
    closingBank !== null && passbook !== null ? passbook - closingBank : null;

  return {
    offeringTotal: toBaht(offeringTotal),
    envelopeCashTotal: toBaht(envelopeCash),
    envelopeTransferTotal: toBaht(envelopeTransfer),
    envelopeCheckTotal: toBaht(envelopeCheck),
    countedCashTotal: toBaht(countedCash),
    cashVariance: toBaht(cashVariance),
    deductionTotal: toBaht(deductions),
    actualCashDeposit: toBaht(cashDeposit),
    actualTransferIn: toBaht(transferIn),
    transferVariance: toBaht(transferVariance),
    withdrawalTotal: toBaht(withdrawal),
    otherInTotal: toBaht(otherIn),
    otherOutTotal: toBaht(otherOut),
    hasCarryForward,
    openingCash: toBahtOrNull(openingCash),
    openingBank: toBahtOrNull(openingBank),
    closingCashExpected: toBahtOrNull(closingCash),
    cashOnHandActual: toBahtOrNull(cashOnHand),
    cashOnHandVariance: toBahtOrNull(cashOnHandVariance),
    closingBankExpected: toBahtOrNull(closingBank),
    passbookBalance: toBahtOrNull(passbook),
    passbookVariance: toBahtOrNull(passbookVariance),
    // The cash box is the invariant the church audits against:
    // เงินสดยกมา + ถวายเงินสด + ถอนจากธนาคาร − หักเบิก − นำฝาก = เงินสดยกไป
    // and the cash actually in the box must equal it. The passbook can lag the
    // round by weeks, so its difference is shown but never blocks posting.
    isBalanced:
      cashVariance === 0 &&
      transferVariance === 0 &&
      (!hasCarryForward || cashOnHandVariance === 0),
  };
}

export const COUNTING_STATUSES = [
  "counting",
  "counted",
  "verified",
  "posted",
  "closed",
] as const;

export type CountingStatus = (typeof COUNTING_STATUSES)[number];

const ALLOWED_TRANSITIONS: Record<CountingStatus, readonly CountingStatus[]> = {
  counting: ["counted"],
  counted: ["counting", "verified"],
  verified: ["counted", "posted"],
  posted: ["closed"],
  closed: [],
};

export function canTransition(
  from: CountingStatus,
  to: CountingStatus
): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}

/** Counters may only edit envelopes and the count sheet while still counting. */
export function isEditable(status: CountingStatus): boolean {
  return status === "counting";
}
