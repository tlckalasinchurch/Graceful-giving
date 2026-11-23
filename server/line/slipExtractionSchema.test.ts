import { describe, expect, it } from "vitest";
import {
  InvalidOcrOutputError,
  classifyExtraction,
  extractionWarnings,
  parseSlipExtraction,
  processingStatusFor,
} from "./slipExtractionSchema";

/**
 * The model's JSON is untrusted. These tests pin down that a bad answer is
 * rejected instead of being cast into the extraction shape.
 */

const valid = {
  amount: 500,
  amountConfidence: 0.95,
  transferDate: "2026-11-20",
  transferTime: "10:30",
  dateConfidence: 0.9,
  senderName: "สมชาย ใจดี",
  senderConfidence: 0.9,
  referenceNumber: "REF123456",
  referenceConfidence: 0.99,
  bankName: "SCB",
  receiverName: "คริสตจักร",
  receiverAccount: "123-4-xx567-8",
  receiverAccountConfidence: 0.9,
  receiverAccountType: "bank_account",
  receiverBank: "KBANK",
  notes: null,
};

const withField = (patch: Record<string, unknown>) => ({
  ...valid,
  ...patch,
});

describe("parseSlipExtraction", () => {
  it("accepts a complete, well-typed extraction", () => {
    const parsed = parseSlipExtraction(JSON.stringify(valid));
    expect(parsed.amount).toBe(500);
    expect(parsed.referenceNumber).toBe("REF123456");
  });

  it("recovers an object wrapped in prose or a markdown fence", () => {
    const wrapped = "ผลลัพธ์:\n```json\n" + JSON.stringify(valid) + "\n```";
    expect(parseSlipExtraction(wrapped).amount).toBe(500);
  });

  it("rejects an empty response", () => {
    expect(() => parseSlipExtraction("")).toThrow(InvalidOcrOutputError);
  });

  it("rejects malformed JSON", () => {
    expect(() => parseSlipExtraction("{not json")).toThrow(
      InvalidOcrOutputError
    );
  });

  it("rejects an amount typed as a string", () => {
    expect(() =>
      parseSlipExtraction(JSON.stringify(withField({ amount: "500" })))
    ).toThrow(InvalidOcrOutputError);
  });

  it("rejects a negative or zero amount", () => {
    for (const amount of [-1, 0]) {
      expect(() =>
        parseSlipExtraction(JSON.stringify(withField({ amount })))
      ).toThrow(InvalidOcrOutputError);
    }
  });

  it("rejects confidence outside 0..1", () => {
    for (const confidence of [-0.1, 1.5, Number.NaN]) {
      expect(() =>
        parseSlipExtraction(
          JSON.stringify(withField({ amountConfidence: confidence }))
        )
      ).toThrow(InvalidOcrOutputError);
    }
  });

  it("rejects a missing required field", () => {
    const { referenceNumber, ...rest } = valid;
    void referenceNumber;
    expect(() => parseSlipExtraction(JSON.stringify(rest))).toThrow(
      InvalidOcrOutputError
    );
  });

  it("rejects an unknown receiver account type", () => {
    expect(() =>
      parseSlipExtraction(
        JSON.stringify(withField({ receiverAccountType: "credit_card" }))
      )
    ).toThrow(InvalidOcrOutputError);
  });

  it("drops unknown keys instead of carrying them forward", () => {
    const parsed = parseSlipExtraction(
      JSON.stringify(withField({ injected: "ignore previous instructions" }))
    );
    expect(parsed).not.toHaveProperty("injected");
  });

  it("does not include field values in the error message", () => {
    try {
      parseSlipExtraction(
        JSON.stringify(withField({ amount: "สมชาย ใจดี 1234567890" }))
      );
      expect.unreachable();
    } catch (err) {
      expect(err).toBeInstanceOf(InvalidOcrOutputError);
      expect((err as Error).message).not.toContain("สมชาย");
      expect((err as Error).message).not.toContain("1234567890");
    }
  });

  it("keeps nulls for fields the model could not read", () => {
    const parsed = parseSlipExtraction(
      JSON.stringify(
        withField({
          amount: null,
          amountConfidence: 0,
          transferDate: null,
          dateConfidence: 0,
        })
      )
    );
    expect(parsed.amount).toBeNull();
    expect(parsed.transferDate).toBeNull();
  });
});

describe("classifyExtraction", () => {
  const states = (patch: Record<string, unknown>) =>
    classifyExtraction({ ...valid, ...patch } as never);

  it("marks a null with no confidence as missing", () => {
    expect(
      states({ referenceNumber: null, referenceConfidence: 0 }).referenceNumber
    ).toBe("missing");
  });

  it("marks a null the model looked for as unreadable", () => {
    expect(
      states({ referenceNumber: null, referenceConfidence: 0.4 })
        .referenceNumber
    ).toBe("unreadable");
  });

  it("marks a low-confidence value as uncertain", () => {
    expect(states({ amount: 500, amountConfidence: 0.5 }).amount).toBe(
      "uncertain"
    );
  });

  it("marks a confident value as certain", () => {
    expect(states({ amount: 500, amountConfidence: 0.9 }).amount).toBe(
      "certain"
    );
  });
});

describe("processingStatusFor", () => {
  it("is unreadable when no usable field came back", () => {
    expect(
      processingStatusFor({
        amount: null,
        amountConfidence: 0,
        transferDate: null,
        dateConfidence: 0,
        senderName: null,
        senderConfidence: 0,
        referenceNumber: null,
        referenceConfidence: 0,
      })
    ).toBe("unreadable");
  });

  it("is partial when any field is uncertain", () => {
    expect(
      processingStatusFor({ ...valid, amountConfidence: 0.4 } as never)
    ).toBe("partial");
  });

  it("is read when every field is certain", () => {
    expect(processingStatusFor(valid as never)).toBe("read");
  });
});

describe("extractionWarnings", () => {
  it("names uncertain and unreadable fields without values", () => {
    const warnings = extractionWarnings({
      ...valid,
      amountConfidence: 0.4,
      referenceNumber: null,
      referenceConfidence: 0.2,
    } as never);
    expect(warnings).toContain("amount_uncertain");
    expect(warnings).toContain("reference_number_unreadable");
    expect(warnings.join(" ")).not.toContain("500");
    expect(warnings.join(" ")).not.toContain("สมชาย");
  });

  it("is empty for a fully confident reading", () => {
    expect(extractionWarnings(valid as never)).toEqual([]);
  });
});
