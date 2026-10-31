/**
 * Limits for a giving submitted from the app. The client checks them to give
 * early feedback and the server enforces them, so both import this one file.
 */

/** Largest amount one submission may declare, in THB. */
export const MAX_GIVING_AMOUNT = 10_000_000;

/**
 * Largest slip image, in bytes after decoding. The tRPC JSON parser accepts
 * 5 MB and base64 adds a third, so 3.5 MB of image fits with room for fields.
 */
export const MAX_SLIP_IMAGE_BYTES = 3.5 * 1024 * 1024;

/** Slips one person may submit from the app in 24 hours. */
export const MAX_SLIPS_PER_DAY = 20;

/** Rounds to whole satang and rejects values that are not a usable amount. */
export function parseGivingAmount(value: unknown): number | null {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || n <= 0 || n > MAX_GIVING_AMOUNT) return null;
  const rounded = Math.round(n * 100) / 100;
  return rounded > 0 ? rounded : null;
}
