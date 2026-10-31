/**
 * PromptPay "credit transfer" QR payloads (Thai QR Payment, EMVCo format).
 *
 * A bank app that scans the code opens a transfer to the payee with the amount
 * already filled in, so the donor does not type it. The payload is a string of
 * tag-length-value fields that ends with a CRC-16 check.
 */

export type PromptPayIdType = "phone" | "national_id" | "ewallet";

export interface PromptPayId {
  type: PromptPayIdType;
  /** Digits only, as the person typed them (a phone keeps its leading 0). */
  digits: string;
}

/**
 * Reads a PromptPay ID: a 10-digit mobile number, a 13-digit national or tax
 * ID, or a 15-digit e-wallet ID. Spaces and dashes are ignored. Returns null
 * for anything else.
 */
export function parsePromptPayId(input: string): PromptPayId | null {
  const digits = input.replace(/[\s-]/g, "");
  if (!/^\d+$/.test(digits)) return null;
  if (digits.length === 10 && digits.startsWith("0")) {
    return { type: "phone", digits };
  }
  if (digits.length === 13) return { type: "national_id", digits };
  if (digits.length === 15) return { type: "ewallet", digits };
  return null;
}

/** CRC-16/CCITT-FALSE: polynomial 0x1021, start 0xFFFF. */
export function crc16(text: string): string {
  let crc = 0xffff;
  for (let i = 0; i < text.length; i++) {
    crc ^= text.charCodeAt(i) << 8;
    for (let bit = 0; bit < 8; bit++) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

/** One tag-length-value field. The length is two digits. */
function tlv(tag: string, value: string): string {
  return `${tag}${String(value.length).padStart(2, "0")}${value}`;
}

/** The largest amount a QR may carry, in THB. Matches the giving limit. */
const MAX_AMOUNT = 10_000_000;

/**
 * Builds the payload for a one-time payment of `amount` THB to `id`. Throws on
 * an amount that is not a positive number of at most two decimals' worth.
 */
export function buildPromptPayPayload(id: PromptPayId, amount: number): string {
  if (!Number.isFinite(amount) || amount <= 0 || amount > MAX_AMOUNT) {
    throw new RangeError("amount must be between 0.01 and 10,000,000 THB");
  }
  const rounded = Math.round(amount * 100) / 100;

  // A phone number goes in as 0066 followed by the number without its 0.
  const account =
    id.type === "phone"
      ? tlv("01", `0066${id.digits.slice(1)}`)
      : id.type === "national_id"
        ? tlv("02", id.digits)
        : tlv("03", id.digits);

  const body =
    tlv("00", "01") +
    // 12 = used once, so the amount in the code is the amount to pay.
    tlv("01", "12") +
    tlv("29", tlv("00", "A000000677010111") + account) +
    tlv("53", "764") +
    tlv("54", rounded.toFixed(2)) +
    tlv("58", "TH");

  return `${body}6304${crc16(`${body}6304`)}`;
}

/** True when the payload's last four characters are the CRC of the rest. */
export function hasValidCrc(payload: string): boolean {
  if (payload.length < 8 || payload.slice(-8, -4) !== "6304") return false;
  return crc16(payload.slice(0, -4)) === payload.slice(-4);
}
