import type { OfferingCategory } from "@shared/categories";

/**
 * The donor's choices at the confirm step. A donor leaves the page to pay in a
 * bank app, and a phone may reload the page on return. The draft brings the
 * choices back. It holds no slip image and no money record.
 */
export interface GivingDraft {
  userId: number;
  category: OfferingCategory;
  amount: number;
  fundId: string;
  transferState: "not_yet" | "done";
  savedAt: number;
}

const KEY = "graceful-giving:draft:v1";
/** A draft older than this is dropped. */
export const DRAFT_MAX_AGE_MS = 3 * 60 * 60 * 1000;

export function saveDraft(draft: GivingDraft): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(draft));
  } catch {
    // Storage can be blocked. The flow works without a draft.
  }
}

export function clearDraft(): void {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    // Nothing to clear.
  }
}

/** The saved draft for this person, or null when none, old, or someone else's. */
export function loadDraft(
  userId: number | undefined,
  now: number = Date.now()
): GivingDraft | null {
  if (userId === undefined) return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const d = JSON.parse(raw) as Partial<GivingDraft>;
    if (
      d.userId !== userId ||
      typeof d.category !== "string" ||
      typeof d.amount !== "number" ||
      !Number.isFinite(d.amount) ||
      d.amount <= 0 ||
      typeof d.fundId !== "string" ||
      (d.transferState !== "not_yet" && d.transferState !== "done") ||
      typeof d.savedAt !== "number" ||
      now - d.savedAt > DRAFT_MAX_AGE_MS
    ) {
      return null;
    }
    return d as GivingDraft;
  } catch {
    return null;
  }
}
