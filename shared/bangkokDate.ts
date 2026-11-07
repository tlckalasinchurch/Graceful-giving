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

/**
 * Asia/Bangkok is UTC+7 all year. It has had no daylight saving since 1920.
 * Month boundaries use this fixed offset so they need no time zone database.
 */
const BANGKOK_OFFSET_MS = 7 * 60 * 60 * 1000;

/** Year and month (1 to 12) of the Asia/Bangkok calendar at the given instant. */
export function bangkokCalendarMonth(now: Date): {
  year: number;
  month: number;
} {
  const shifted = new Date(now.getTime() + BANGKOK_OFFSET_MS);
  return { year: shifted.getUTCFullYear(), month: shifted.getUTCMonth() + 1 };
}

/**
 * The instant when the given Thai calendar month starts: 00:00 on the 1st in
 * Asia/Bangkok. `month` is 1 to 12 and may run over (13 is January of the next
 * year, 0 is December of the year before). A month is the half-open range
 * `[bangkokMonthStart(y, m), bangkokMonthStart(y, m + 1))`.
 */
export function bangkokMonthStart(year: number, month: number): Date {
  return new Date(Date.UTC(year, month - 1, 1) - BANGKOK_OFFSET_MS);
}
