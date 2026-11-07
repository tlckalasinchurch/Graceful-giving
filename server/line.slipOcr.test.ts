import { describe, expect, it } from "vitest";
import {
  isTransientError,
  normalizeAndValidateDate,
  TransientOcrError,
} from "./line/slipOcr";

/**
 * Guards the audit fixes for OCR error classification and date normalization.
 * A misclassified error either dead-letters a recoverable slip or burns retries
 * on a permanent failure. A misread year silently defeats duplicate detection.
 */

describe("isTransientError", () => {
  it("treats TransientOcrError as transient", () => {
    expect(isTransientError(new TransientOcrError("Gemini 429", 429))).toBe(
      true
    );
  });

  it("treats retryable LLM statuses as transient", () => {
    for (const status of [408, 429, 500, 502, 503, 504]) {
      const err = new Error(
        `LLM invoke failed: ${status} Server Error – upstream`
      );
      expect(isTransientError(err), `status ${status}`).toBe(true);
    }
  });

  it("treats client errors as permanent", () => {
    for (const status of [400, 401, 403, 404, 422]) {
      const err = new Error(
        `LLM invoke failed: ${status} Bad Request – invalid image`
      );
      expect(isTransientError(err), `status ${status}`).toBe(false);
    }
  });

  it("does not match status digits quoted inside an error body", () => {
    // A permanent 400 whose body mentions 500/429 must not be retried.
    const err = new Error(
      'LLM invoke failed: 400 Bad Request – {"error":"maxOutputTokens: 500 exceeds limit 1429"}'
    );
    expect(isTransientError(err)).toBe(false);
  });

  it("treats network-level failures as transient", () => {
    expect(isTransientError(new Error("fetch failed"))).toBe(true);
    expect(isTransientError(new Error("read ECONNRESET"))).toBe(true);
    expect(isTransientError(new Error("socket hang up"))).toBe(true);
  });

  it("treats an unreadable image as permanent", () => {
    expect(isTransientError(new Error("AI returned non-JSON response"))).toBe(
      false
    );
  });
});

describe("normalizeAndValidateDate", () => {
  function isoDaysFromNow(days: number): string {
    const d = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    return d.toISOString().slice(0, 10);
  }

  it("converts a Buddhist Era year to Gregorian", () => {
    const beYear = new Date().getUTCFullYear() + 543;
    const result = normalizeAndValidateDate(`${beYear}-03-15`, "10:30", 0.95);
    expect(result.transferDate).toBe(`${beYear - 543}-03-15`);
  });

  it("keeps a Gregorian year unchanged and preserves confidence", () => {
    const recent = isoDaysFromNow(-3);
    const result = normalizeAndValidateDate(recent, "09:00", 0.92);
    expect(result.transferDate).toBe(recent);
    expect(result.dateConfidence).toBe(0.92);
  });

  it("downgrades confidence for an implausible future date", () => {
    const result = normalizeAndValidateDate(isoDaysFromNow(30), "09:00", 0.99);
    expect(result.dateConfidence).toBeLessThan(0.5);
  });

  it("downgrades confidence for a date older than one year", () => {
    const result = normalizeAndValidateDate(
      isoDaysFromNow(-400),
      "09:00",
      0.99
    );
    expect(result.dateConfidence).toBeLessThan(0.5);
  });

  it("returns null for a missing or unparseable date", () => {
    expect(normalizeAndValidateDate(null, null, 0.9).transferDate).toBeNull();
    expect(
      normalizeAndValidateDate("ไม่ระบุ", null, 0.9).transferDate
    ).toBeNull();
    expect(
      normalizeAndValidateDate("15/03/2024", null, 0.9).transferDate
    ).toBeNull();
  });

  it("pads single-digit month and day", () => {
    const year = new Date().getUTCFullYear();
    const result = normalizeAndValidateDate(`${year}-3-5`, null, 0.9);
    expect(result.transferDate).toBe(`${year}-03-05`);
  });
});
