import { describe, expect, it } from "vitest";
import {
  buildPromptPayPayload,
  crc16,
  hasValidCrc,
  parsePromptPayId,
} from "@shared/promptpay";

/** Splits a payload into its top-level tag-length-value fields. */
function parseTlv(payload: string): Record<string, string> {
  const out: Record<string, string> = {};
  let i = 0;
  while (i < payload.length) {
    const tag = payload.slice(i, i + 2);
    const len = Number(payload.slice(i + 2, i + 4));
    out[tag] = payload.slice(i + 4, i + 4 + len);
    i += 4 + len;
  }
  return out;
}

describe("crc16", () => {
  it("matches the CRC-16/CCITT-FALSE check value", () => {
    // The standard check string for this algorithm.
    expect(crc16("123456789")).toBe("29B1");
  });

  it("pads to four digits", () => {
    expect(crc16("")).toBe("FFFF");
    expect(crc16("A")).toHaveLength(4);
  });
});

describe("parsePromptPayId", () => {
  it("reads a mobile number, a national or tax ID and an e-wallet ID", () => {
    expect(parsePromptPayId("081-234-5678")).toEqual({
      type: "phone",
      digits: "0812345678",
    });
    expect(parsePromptPayId("0 9999 99999 99 9")).toEqual({
      type: "national_id",
      digits: "0999999999999",
    });
    expect(parsePromptPayId("004999999999999")).toEqual({
      type: "ewallet",
      digits: "004999999999999",
    });
  });

  it("refuses anything else", () => {
    for (const bad of [
      "",
      "12345",
      "1234567890",
      "08123456789",
      "abc",
      "081-xxx-5678",
    ]) {
      expect(parsePromptPayId(bad)).toBeNull();
    }
  });
});

describe("buildPromptPayPayload", () => {
  const phone = parsePromptPayId("0812345678")!;

  it("builds a one-time payload with the amount, in the order banks print it", () => {
    const payload = buildPromptPayPayload(phone, 500);
    expect(payload).toBe(
      "00020101021229370016A0000006770101110113006681234567853037645406500.005802TH6304" +
        payload.slice(-4)
    );
    expect(hasValidCrc(payload)).toBe(true);
  });

  it("puts a phone number after 0066 without its leading 0", () => {
    const fields = parseTlv(buildPromptPayPayload(phone, 100));
    expect(parseTlv(fields["29"])).toEqual({
      "00": "A000000677010111",
      "01": "0066812345678",
    });
    expect(fields["01"]).toBe("12");
    expect(fields["53"]).toBe("764");
    expect(fields["54"]).toBe("100.00");
    expect(fields["58"]).toBe("TH");
  });

  it("uses tag 02 for a national or tax ID and tag 03 for an e-wallet", () => {
    const nid = parseTlv(
      parseTlv(buildPromptPayPayload(parsePromptPayId("0105555123456")!, 1))[
        "29"
      ]
    );
    expect(nid["02"]).toBe("0105555123456");
    const ew = parseTlv(
      parseTlv(buildPromptPayPayload(parsePromptPayId("004999999999999")!, 1))[
        "29"
      ]
    );
    expect(ew["03"]).toBe("004999999999999");
  });

  it("keeps two decimals and rounds to satang", () => {
    expect(parseTlv(buildPromptPayPayload(phone, 1250.5))["54"]).toBe(
      "1250.50"
    );
    expect(parseTlv(buildPromptPayPayload(phone, 10.005))["54"]).toBe("10.01");
  });

  it("refuses a bad amount", () => {
    for (const bad of [0, -1, NaN, Infinity, 10_000_001]) {
      expect(() => buildPromptPayPayload(phone, bad)).toThrow(RangeError);
    }
  });

  it("detects a payload whose amount was changed", () => {
    const payload = buildPromptPayPayload(phone, 500);
    expect(hasValidCrc(payload.replace("500.00", "900.00"))).toBe(false);
  });
});
