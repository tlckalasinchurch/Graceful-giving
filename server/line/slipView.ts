/**
 * What the Giving Inbox is allowed to send to a browser.
 *
 * The `line_slips` row is evidence for staff, not a client payload. The raw
 * AI text, the storage key, the image hash and the inline base64 image are
 * internal. This projection keeps what the review UI needs and drops the rest:
 *
 * - `aiRawText`      - verbatim model output, may echo slip contents
 * - `slipImageKey`   - storage locator; images are served by signed URL only
 * - `slipHash`       - duplicate-detection fingerprint
 * - `aiData`         - narrowed to the receiver fields and the verification
 *                      result the UI renders; never the raw extraction or
 *                      `inlineDataUrl` (a full base64 slip image)
 *
 * This is a projection, not a permission check. Callers still gate on role.
 */

import type { LineSlip } from "../../drizzle/schema";

export type SlipAiView = {
  receiverAccount?: string | null;
  receiverName?: string | null;
  receiverBank?: string | null;
  verification?: {
    amount?: string | null;
    receiver?: string | null;
    autoReject?: "amount" | "receiver" | null;
    escalated?: boolean;
  } | null;
};

/** A slip row with the internal columns replaced by their client-safe form. */
export type SlipContract = Omit<
  LineSlip,
  "aiRawText" | "aiData" | "slipImageKey" | "slipHash"
> & {
  /** Narrowed AI context the review UI renders. Null when nothing is known. */
  aiData: SlipAiView | null;
};

export type SlipView = SlipContract & {
  /** 1-hour signed URL for the private slip image. */
  signedImageUrl: string;
};

const RECEIVER_TEXT_FIELDS = [
  "receiverAccount",
  "receiverName",
  "receiverBank",
] as const;

/**
 * Keeps only the AI fields the review UI reads. Everything else in the stored
 * blob (raw extraction, confidence, inline image data) stays on the server.
 */
export function pickSafeAiData(aiData: unknown): SlipAiView | null {
  if (!aiData || typeof aiData !== "object") return null;
  const source = aiData as Record<string, unknown>;
  const view: SlipAiView = {};

  for (const field of RECEIVER_TEXT_FIELDS) {
    const value = source[field];
    if (typeof value === "string" && value.length > 0) {
      view[field] = value;
    }
  }

  const verification = source.verification;
  if (verification && typeof verification === "object") {
    const raw = verification as Record<string, unknown>;
    const autoReject =
      raw.autoReject === "amount" || raw.autoReject === "receiver"
        ? raw.autoReject
        : null;
    view.verification = {
      amount: typeof raw.amount === "string" ? raw.amount : null,
      receiver: typeof raw.receiver === "string" ? raw.receiver : null,
      autoReject,
      escalated: raw.escalated === true,
    };
  }

  return Object.keys(view).length > 0 ? view : null;
}

/**
 * Drops the internal columns from a slip row. Fields the caller added on top
 * of the row (for example `submitterLineId`) are preserved, so this only ever
 * removes what is listed in the module doc above.
 */
function stripInternalColumns<T extends LineSlip>(
  slip: T
): SlipContract & Omit<T, keyof LineSlip> {
  const {
    aiRawText: _rawText,
    aiData,
    slipImageKey: _storageKey,
    slipHash: _hash,
    ...safe
  } = slip;
  return {
    ...safe,
    aiData: pickSafeAiData(aiData),
  } as SlipContract & Omit<T, keyof LineSlip>;
}

/**
 * Projects a slip row into a client-safe payload.
 */
export function toSlipView<T extends LineSlip>(
  slip: T,
  signedImageUrl: string
): SlipView & Omit<T, keyof LineSlip> {
  return {
    ...stripInternalColumns(slip),
    signedImageUrl,
  } as SlipView & Omit<T, keyof LineSlip>;
}

/**
 * The result of a write on a slip (a staff edit). Same internal columns are
 * dropped, but no signed URL is added: this is not a fresh read of the image.
 */
export function toSlipReviewView<T extends LineSlip>(
  slip: T
): SlipContract & Omit<T, keyof LineSlip> {
  return stripInternalColumns(slip);
}
