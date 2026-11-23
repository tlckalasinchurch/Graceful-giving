/**
 * Runtime validation for AI slip extraction output.
 *
 * The model's JSON is untrusted. This module is the only place that decides
 * whether a raw AI response is usable. Nothing downstream may assume the
 * shape of the response: it is parsed here or it is rejected here.
 *
 * It never treats the model's self-reported confidence as proof that a value
 * is correct. Confidence only classifies how sure the model said it was, and
 * the existing verification rules still decide what a slip may do.
 */

import { z } from "zod";

/** A field is only treated as usable at or above this confidence. */
export const CONFIDENCE_THRESHOLD = 0.85;

/** Largest amount a single slip may carry. Anything above is a misread. */
const MAX_SLIP_AMOUNT = 1_000_000_000;

const confidenceSchema = z.number().finite().min(0).max(1);

/**
 * Free text the model read from the image. Lengths match the database
 * columns so an over-long value can never reach the ledger.
 *
 * `transferDate` and `transferTime` stay permissive here on purpose: Thai
 * slips print dates in several layouts and the existing normalizer converts
 * them. The ISO shape is enforced after normalization below.
 */
const text = (max: number) => z.string().trim().max(max).nullable();

export const slipExtractionSchema = z.object({
  amount: z.number().finite().positive().max(MAX_SLIP_AMOUNT).nullable(),
  amountConfidence: confidenceSchema,
  transferDate: text(32),
  transferTime: text(16),
  dateConfidence: confidenceSchema,
  senderName: text(180),
  senderConfidence: confidenceSchema,
  referenceNumber: text(120),
  referenceConfidence: confidenceSchema,
  bankName: text(80),
  receiverName: text(180),
  receiverAccount: text(64),
  receiverAccountConfidence: confidenceSchema.optional().default(0),
  receiverAccountType: z.enum(["bank_account", "promptpay"]).nullable(),
  receiverBank: text(80),
  notes: text(1000),
});

export type ValidatedSlipExtraction = z.infer<typeof slipExtractionSchema>;

/** The AI answered, but the answer cannot be trusted. Never retried. */
export class InvalidOcrOutputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidOcrOutputError";
  }
}

/**
 * Parses a model response into a validated extraction, or throws
 * `InvalidOcrOutputError`. Field names (never values) are included in the
 * message so a failure is diagnosable without logging personal data.
 */
export function parseSlipExtraction(rawText: string): ValidatedSlipExtraction {
  const trimmed = (rawText ?? "").trim();
  if (trimmed.length === 0) {
    throw new InvalidOcrOutputError("AI returned an empty response");
  }

  let json: unknown;
  try {
    json = JSON.parse(trimmed);
  } catch {
    // Some models wrap the object in prose or a markdown fence.
    const match = trimmed.match(/\{[\s\S]*\}/);
    if (!match) {
      throw new InvalidOcrOutputError("AI returned non-JSON response");
    }
    try {
      json = JSON.parse(match[0]);
    } catch {
      throw new InvalidOcrOutputError("AI returned malformed JSON");
    }
  }

  const result = slipExtractionSchema.safeParse(json);
  if (!result.success) {
    const fields = Array.from(
      new Set(result.error.issues.map(issue => String(issue.path[0] ?? "root")))
    ).sort();
    throw new InvalidOcrOutputError(
      `AI output failed schema validation (${fields.join(", ")})`
    );
  }
  return result.data;
}

// ─── Field states ─────────────────────────────────────────────────────────────

/**
 * The three states the review UI must tell apart:
 * - `missing`:     nothing of this kind is on the slip (model reported no reading)
 * - `unreadable`:  the slip has it, the model looked, and no value came back
 * - `uncertain`:   a value came back, but the model was not sure of it
 * - `certain`:     a value came back at or above the threshold
 */
export type FieldState = "missing" | "unreadable" | "uncertain" | "certain";

export type ClassifiableExtraction = {
  amount: number | null;
  amountConfidence: number;
  transferDate: string | null;
  dateConfidence: number;
  senderName: string | null;
  senderConfidence: number;
  referenceNumber: string | null;
  referenceConfidence: number;
  receiverAccount?: string | null;
  receiverAccountConfidence?: number;
};

export type FieldStates = Record<
  | "amount"
  | "transferDate"
  | "senderName"
  | "referenceNumber"
  | "receiverAccount",
  FieldState
>;

function stateOf(
  value: string | number | null | undefined,
  confidence: number | undefined,
  threshold: number
): FieldState {
  const hasValue = value !== null && value !== undefined;
  const conf = confidence ?? 0;
  if (hasValue) return conf >= threshold ? "certain" : "uncertain";
  // A null with any confidence behind it means the model looked and could not
  // produce a value; a null with zero confidence means it found nothing.
  return conf > 0 ? "unreadable" : "missing";
}

export function classifyExtraction(
  extraction: ClassifiableExtraction,
  threshold = CONFIDENCE_THRESHOLD
): FieldStates {
  return {
    amount: stateOf(extraction.amount, extraction.amountConfidence, threshold),
    transferDate: stateOf(
      extraction.transferDate,
      extraction.dateConfidence,
      threshold
    ),
    senderName: stateOf(
      extraction.senderName,
      extraction.senderConfidence,
      threshold
    ),
    referenceNumber: stateOf(
      extraction.referenceNumber,
      extraction.referenceConfidence,
      threshold
    ),
    receiverAccount: stateOf(
      extraction.receiverAccount,
      extraction.receiverAccountConfidence,
      threshold
    ),
  };
}

export type ProcessingStatus = "read" | "partial" | "unreadable";

/**
 * Summarizes the reading for the UI. `unreadable` means nothing usable came
 * back at all, so staff must read the image by hand.
 */
export function processingStatusFor(
  extraction: ClassifiableExtraction
): ProcessingStatus {
  const anyValue =
    extraction.amount !== null ||
    extraction.transferDate !== null ||
    extraction.senderName !== null;
  if (!anyValue) return "unreadable";
  const states = Object.values(classifyExtraction(extraction));
  return states.every(state => state === "certain") ? "read" : "partial";
}

/** Human-readable caveats stored beside the extraction. Contains no PII. */
export function extractionWarnings(
  extraction: ClassifiableExtraction
): string[] {
  const states = classifyExtraction(extraction);
  const warnings: string[] = [];
  const label: Record<keyof FieldStates, string> = {
    amount: "amount",
    transferDate: "transfer_date",
    senderName: "sender_name",
    referenceNumber: "reference_number",
    receiverAccount: "receiver_account",
  };
  for (const key of Object.keys(states) as Array<keyof FieldStates>) {
    const state = states[key];
    if (state === "uncertain") warnings.push(`${label[key]}_uncertain`);
    if (state === "unreadable") warnings.push(`${label[key]}_unreadable`);
  }
  return warnings;
}
