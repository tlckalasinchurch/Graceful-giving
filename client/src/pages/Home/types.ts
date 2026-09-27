import type { LucideIcon } from "lucide-react";

/** Unified transaction row used by both the home dashboard and the ledger tab. */
export interface TransactionItem {
  id: string;
  rawId: number;
  title: string;
  /** Receipt / expense date as returned by the API (always set — both columns are NOT NULL). */
  date: Date | string;
  type: "income" | "expense";
  category: string;
  subCategory: string;
  amount: number;
  tone: string;
  icon: LucideIcon;
}

/** Snapshot of the last submitted offering, shown in the success celebration dialog. */
export interface SubmittedOffering {
  type: string;
  amount: number;
  fund: string;
  method: string;
}
