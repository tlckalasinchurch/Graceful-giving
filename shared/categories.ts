/**
 * The single source of truth for transaction categories.
 *
 * These ids must stay identical to the Postgres enums `expense_category` and
 * `offering_category` in drizzle/schema.ts. The server builds its Zod
 * validators from these arrays and every screen renders its options from them,
 * so a category cannot drift between the database, the API and the UI.
 *
 * Adding a category means: add the value to the pgEnum, generate a migration,
 * then add it here. Never add one here alone.
 */

export interface CategoryOption<Id extends string> {
  id: Id;
  label: string;
}

export const EXPENSE_CATEGORY_IDS = [
  "utilities",
  "ministry",
  "pastoral",
  "admin",
  "building",
  "worship",
  "welfare",
  "other",
] as const satisfies readonly string[];

export type ExpenseCategory = (typeof EXPENSE_CATEGORY_IDS)[number];

export const EXPENSE_CATEGORIES: ReadonlyArray<
  CategoryOption<ExpenseCategory>
> = [
  { id: "utilities", label: "สาธารณูปโภค" },
  { id: "ministry", label: "พันธกิจ" },
  { id: "pastoral", label: "ศิษยาภิบาลและผู้ประกาศ" },
  { id: "admin", label: "บริหารและธุรการ" },
  { id: "building", label: "อาคารสถานที่" },
  { id: "worship", label: "นมัสการและดนตรี" },
  { id: "welfare", label: "สงเคราะห์และสวัสดิการ" },
  { id: "other", label: "อื่น ๆ" },
];

export const OFFERING_CATEGORY_IDS = [
  "tithe",
  "general",
  "mission",
  "building",
  "welfare",
  "special",
] as const satisfies readonly string[];

export type OfferingCategory = (typeof OFFERING_CATEGORY_IDS)[number];

export const OFFERING_CATEGORIES: ReadonlyArray<
  CategoryOption<OfferingCategory>
> = [
  { id: "tithe", label: "สิบลด" },
  { id: "general", label: "ถวายทั่วไป" },
  { id: "mission", label: "พันธกิจและการประกาศ" },
  { id: "building", label: "สร้างอาคาร" },
  { id: "welfare", label: "สงเคราะห์" },
  { id: "special", label: "ถวายพิเศษ" },
];

/**
 * Falls back to the raw id rather than to a catch-all label, so an unmapped
 * value shows up as itself instead of silently reading as "อื่น ๆ".
 */
export function expenseCategoryLabel(id: string): string {
  return EXPENSE_CATEGORIES.find(c => c.id === id)?.label ?? id;
}

export function offeringCategoryLabel(id: string): string {
  return OFFERING_CATEGORIES.find(c => c.id === id)?.label ?? id;
}

export function isExpenseCategory(id: string): id is ExpenseCategory {
  return (EXPENSE_CATEGORY_IDS as readonly string[]).includes(id);
}

export function isOfferingCategory(id: string): id is OfferingCategory {
  return (OFFERING_CATEGORY_IDS as readonly string[]).includes(id);
}

/**
 * Payment methods, mirroring the Postgres enum `offering_method`
 * (drizzle/schema.ts). Screens used to print the stored id straight into the
 * page, so a Thai ledger row read "· cash ·".
 */
export const PAYMENT_METHOD_IDS = [
  "cash",
  "transfer",
  "check",
] as const satisfies readonly string[];

export type PaymentMethod = (typeof PAYMENT_METHOD_IDS)[number];

export const PAYMENT_METHODS: ReadonlyArray<CategoryOption<PaymentMethod>> = [
  { id: "cash", label: "เงินสด" },
  { id: "transfer", label: "โอนเงิน" },
  { id: "check", label: "เช็ค" },
];

/**
 * Extra ids that reach the UI without being part of the column enum:
 * "promptpay" is a transfer the entry form distinguishes, and some rows hold
 * the Thai label itself (NewOffering submits the label, not the id). A value
 * that matches neither returns unchanged, same rule as the category helpers.
 */
export function paymentMethodLabel(value: string): string {
  if (value === "promptpay") return "QR พร้อมเพย์";
  return PAYMENT_METHODS.find(m => m.id === value)?.label ?? value;
}

/**
 * Fund (finance account) types, mirroring the `type` enum accepted by
 * finance.createAccount. The detail page used to print the raw id ("mission").
 */
export const FUND_TYPE_LABELS: Record<string, string> = {
  general: "ดำเนินงานทั่วไป",
  tithe: "สิบลด",
  mission: "พันธกิจและประกาศ",
  building: "อาคารและบูรณะ",
  welfare: "สงเคราะห์และสวัสดิการ",
  special: "กองทุนโครงการพิเศษ",
};

export function fundTypeLabel(type: string | null | undefined): string {
  return (type && FUND_TYPE_LABELS[type]) || type || "—";
}
