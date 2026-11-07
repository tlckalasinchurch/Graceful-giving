/**
 * Calendar date in Asia/Bangkok for a stored financial instant.
 *
 * Storage facts (verified, drizzle-orm 0.44):
 * - Financial date columns are `timestamp` (without time zone).
 * - Drizzle writes `value.toISOString()` (UTC) and reads `value + "+0000"`.
 *   A column therefore holds the UTC wall clock of the instant.
 * - The app shows dates in the browser time zone, which is Asia/Bangkok for
 *   the church. `toISOString().split("T")[0]` gives the UTC date, so an
 *   instant from 00:00 to 06:59 Bangkok time shows the previous day.
 *
 * This helper formats the same instant in Asia/Bangkok, so the CSV date
 * equals the date the person sees in the app. Output is `YYYY-MM-DD`.
 */
const BANGKOK_DATE_PARTS = new Intl.DateTimeFormat("en-US", {
  timeZone: "Asia/Bangkok",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function bangkokDateString(value: Date): string {
  const parts = BANGKOK_DATE_PARTS.formatToParts(value);
  const pick = (type: "year" | "month" | "day") =>
    parts.find(p => p.type === type)?.value ?? "";
  return `${pick("year")}-${pick("month")}-${pick("day")}`;
}
