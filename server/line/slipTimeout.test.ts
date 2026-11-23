import { describe, expect, it } from "vitest";
import { InvalidOcrOutputError } from "./slipExtractionSchema";
import {
  OcrTimeoutError,
  isTransientError,
  providerAbortSignal,
} from "./slipOcr";

/**
 * A hung provider must not hang the worker, and a cancelled request must be
 * retried differently from an invalid answer.
 */

describe("providerAbortSignal", () => {
  it("aborts after the timeout budget", async () => {
    const signal = providerAbortSignal(undefined, 10);
    expect(signal.aborted).toBe(false);
    await new Promise(resolve => setTimeout(resolve, 30));
    expect(signal.aborted).toBe(true);
  });

  it("aborts when the caller cancels, before the timeout", () => {
    const controller = new AbortController();
    const signal = providerAbortSignal(controller.signal, 60_000);
    controller.abort();
    expect(signal.aborted).toBe(true);
  });

  it("reports the caller's reason when it cancels", () => {
    const controller = new AbortController();
    const signal = providerAbortSignal(controller.signal, 60_000);
    controller.abort(new DOMException("job budget", "TimeoutError"));
    expect(signal.reason).toBeInstanceOf(DOMException);
  });
});

describe("error classification", () => {
  it("treats a provider timeout as retryable", () => {
    expect(isTransientError(new OcrTimeoutError("timed out", 25_000))).toBe(
      true
    );
  });

  it("treats a fetch abort as retryable", () => {
    // fetch() rejects with a DOMException, not an Error subclass.
    expect(isTransientError(new DOMException("aborted", "AbortError"))).toBe(
      true
    );
    expect(isTransientError(new DOMException("aborted", "TimeoutError"))).toBe(
      true
    );
  });

  it("treats an invalid AI answer as permanent", () => {
    expect(isTransientError(new InvalidOcrOutputError("schema mismatch"))).toBe(
      false
    );
  });

  it("does not mistake a timeout-shaped message for a status code", () => {
    expect(isTransientError(new Error("request timed out at 30000ms"))).toBe(
      false
    );
  });
});
