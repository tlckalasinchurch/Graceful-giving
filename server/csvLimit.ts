import { TRPCError } from "@trpc/server";

/**
 * Largest CSV string the export routes return, measured as the bytes of its
 * JSON encoding (the form it takes inside the tRPC response).
 *
 * Vercel rejects a function response above 4.5 MB. The gateway then returns a
 * non-JSON error and the user sees no useful message. This limit sits below
 * that ceiling and leaves room for the tRPC envelope. An export above the
 * limit fails with a clear Thai message. It is never cut short.
 */
export const MAX_CSV_RESPONSE_BYTES = 4_000_000;

export const CSV_TOO_LARGE_MESSAGE =
  "ข้อมูลที่ส่งออกมีขนาดใหญ่เกินที่ระบบรองรับ กรุณาเลือกช่วงวันที่ให้แคบลง แล้วส่งออกใหม่ทีละช่วง";

export function assertCsvWithinLimit(
  csv: string,
  limit: number = MAX_CSV_RESPONSE_BYTES
): string {
  if (Buffer.byteLength(JSON.stringify(csv), "utf8") > limit) {
    throw new TRPCError({
      code: "PAYLOAD_TOO_LARGE",
      message: CSV_TOO_LARGE_MESSAGE,
    });
  }
  return csv;
}
