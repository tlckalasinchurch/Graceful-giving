/** What a donor may see about a slip they sent. No staff notes, no image. */
export type DonorSlipState =
  | "checking"
  | "verified"
  | "in_review"
  | "rejected"
  | "duplicate"
  | "approved";

export interface DonorSlipStatus {
  state: DonorSlipState;
  /** Thai text for the donor. */
  message: string;
  /** Set when a confident OCR reading disagrees with the chosen amount. */
  slipAmount: number | null;
}
