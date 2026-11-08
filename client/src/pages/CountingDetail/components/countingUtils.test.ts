import { describe, expect, it } from "vitest";
import { advanceEnvelopeString, getNextEnvelopeNo } from "./countingUtils";

describe("advanceEnvelopeString", () => {
  it("increments simple integers", () => {
    expect(advanceEnvelopeString("1")).toBe("2");
    expect(advanceEnvelopeString("9")).toBe("10");
    expect(advanceEnvelopeString("99")).toBe("100");
  });

  it("preserves leading zero padding", () => {
    expect(advanceEnvelopeString("01")).toBe("02");
    expect(advanceEnvelopeString("09")).toBe("10");
    expect(advanceEnvelopeString("001")).toBe("002");
    expect(advanceEnvelopeString("009")).toBe("010");
    expect(advanceEnvelopeString("099")).toBe("100");
    expect(advanceEnvelopeString("0005")).toBe("0006");
  });

  it("preserves text prefixes before digits", () => {
    expect(advanceEnvelopeString("ENV-1")).toBe("ENV-2");
    expect(advanceEnvelopeString("ENV-01")).toBe("ENV-02");
    expect(advanceEnvelopeString("A-009")).toBe("A-010");
    expect(advanceEnvelopeString("ซอง-01")).toBe("ซอง-02");
  });

  it("returns null for non-numeric or empty strings", () => {
    expect(advanceEnvelopeString("")).toBeNull();
    expect(advanceEnvelopeString("   ")).toBeNull();
    expect(advanceEnvelopeString("special")).toBeNull();
    expect(advanceEnvelopeString("NO_NUM")).toBeNull();
  });
});

describe("getNextEnvelopeNo", () => {
  it("defaults to '1' when opening a brand new round with no envelopes", () => {
    expect(getNextEnvelopeNo([])).toBe("1");
    expect(getNextEnvelopeNo([], undefined)).toBe("1");
    expect(getNextEnvelopeNo([], "")).toBe("1");
  });

  it("advances from lastSubmitted when provided", () => {
    expect(getNextEnvelopeNo([], "1")).toBe("2");
    expect(getNextEnvelopeNo([], "001")).toBe("002");
    expect(getNextEnvelopeNo([{ envelopeNo: "1" }], "1")).toBe("2");
    expect(getNextEnvelopeNo([{ envelopeNo: "1" }], "2")).toBe("3");
    expect(getNextEnvelopeNo([{ envelopeNo: "010" }], "010")).toBe("011");
  });

  it("scans existing envelopes in session when lastSubmitted is omitted or invalid", () => {
    expect(
      getNextEnvelopeNo([
        { envelopeNo: "1" },
        { envelopeNo: "2" },
        { envelopeNo: "3" },
      ])
    ).toBe("4");

    expect(
      getNextEnvelopeNo([{ envelopeNo: "001" }, { envelopeNo: "002" }])
    ).toBe("003");

    expect(
      getNextEnvelopeNo([{ envelopeNo: "ENV-05" }, { envelopeNo: "ENV-06" }])
    ).toBe("ENV-07");
  });

  it("handles out-of-order or gaps in envelope numbers", () => {
    expect(
      getNextEnvelopeNo([
        { envelopeNo: "5" },
        { envelopeNo: "1" },
        { envelopeNo: "2" },
      ])
    ).toBe("6");
  });

  it("gracefully ignores null or loose envelopes", () => {
    expect(getNextEnvelopeNo([{ envelopeNo: null }, { envelopeNo: "" }])).toBe(
      "1"
    );

    expect(
      getNextEnvelopeNo([
        { envelopeNo: "1" },
        { envelopeNo: null },
        { envelopeNo: "2" },
      ])
    ).toBe("3");
  });

  it("falls back to session scan if lastSubmitted is loose cash or non-numeric", () => {
    expect(
      getNextEnvelopeNo([{ envelopeNo: "1" }, { envelopeNo: "2" }], "")
    ).toBe("3");

    expect(
      getNextEnvelopeNo([{ envelopeNo: "1" }, { envelopeNo: "2" }], "Anonymous")
    ).toBe("3");
  });
});
