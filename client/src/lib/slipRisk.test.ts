import { describe, expect, it } from "vitest";
import { describeSlipRisk } from "./slipRisk";

const NOW = new Date("2026-09-27T09:00:00+07:00");

const clean = {
  status: "matched",
  extractedAmount: "500.00",
  extractedAmountConfidence: "0.98",
  extractedDate: new Date("2026-09-26T10:00:00+07:00"),
  extractedDateConfidence: "0.95",
  extractedRef: "REF123",
  extractedRefConfidence: "0.97",
  matchedMemberId: 7,
  matchedMemberName: "สมชาย",
  matchedConfidence: "0.95",
};

describe("describeSlipRisk", () => {
  it("reports nothing for a clean, confident slip", () => {
    expect(describeSlipRisk(clean, NOW).level).toBe("ok");
  });

  it("explains a duplicate bank reference with the matching slip", () => {
    const risk = describeSlipRisk(
      {
        ...clean,
        status: "duplicate",
        duplicateOfSlipId: 12,
        lastErrorMessage: "Duplicate bank reference: REF123 (slip #12)",
      },
      NOW
    );
    expect(risk.level).toBe("duplicate");
    expect(risk.relatedSlipId).toBe(12);
    expect(risk.reasons[0].text).toContain("REF123");
    expect(risk.reasons[0].text).toContain("#12");
  });

  it("explains a same-amount, same-day, same-member offering match", () => {
    const risk = describeSlipRisk(
      {
        ...clean,
        status: "duplicate",
        duplicateOfOfferingId: 88,
        lastErrorMessage:
          "Similar offering already exists: #88 (500 THB, same member, same date)",
      },
      NOW
    );
    expect(risk.relatedOfferingId).toBe(88);
    expect(risk.reasons[0].text).toContain("#88");
  });

  it("flags low amount confidence and a missing member as suspicious", () => {
    const risk = describeSlipRisk(
      {
        ...clean,
        status: "needs_review",
        extractedAmountConfidence: "0.6",
        matchedMemberId: null,
      },
      NOW
    );
    expect(risk.level).toBe("suspicious");
    expect(risk.reasons.map(r => r.text).join(" ")).toContain("60%");
    expect(risk.reasons.some(r => r.text.includes("สมาชิก"))).toBe(true);
    expect(risk.headline).toContain("ต้องสงสัย");
  });

  it("flags a transfer dated in the future", () => {
    const risk = describeSlipRisk(
      { ...clean, extractedDate: new Date("2026-10-15T10:00:00+07:00") },
      NOW
    );
    expect(risk.reasons.some(r => r.text.includes("อนาคต"))).toBe(true);
  });

  it("stays quiet once a slip is approved", () => {
    expect(
      describeSlipRisk(
        { ...clean, status: "approved", matchedMemberId: null },
        NOW
      ).level
    ).toBe("ok");
  });
});
