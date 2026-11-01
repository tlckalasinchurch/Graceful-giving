/**
 * What the app shows after the AI reads a slip the moment it is attached.
 * Only the fields the AI was sure about are filled. The rest are null, so the
 * form never fills in a guess. Nothing here credits money. The donor can edit
 * every value, and a treasurer still checks the slip after it is sent.
 */
export interface SlipReading {
  /** "read" when at least one field is usable, else "unreadable". */
  status: "read" | "unreadable";
  /** THB, or null when the AI was not sure. */
  amount: number | null;
  /** The name printed on the slip. Banks often hide part of it. */
  senderName: string | null;
  /** `YYYY-MM-DD`, or null. */
  transferDate: string | null;
  bank: string | null;
}

export const UNREADABLE_SLIP: SlipReading = {
  status: "unreadable",
  amount: null,
  senderName: null,
  transferDate: null,
  bank: null,
};
