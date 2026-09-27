export type CsvCell = string | number | null | undefined;

/**
 * Quotes every cell and doubles embedded quotes, so a comma or quote in a
 * description cannot shift the columns. A text cell that begins with = + - @
 * (or a tab/CR) is prefixed with an apostrophe: spreadsheet apps otherwise
 * run it as a formula, and descriptions and payee names are typed by users.
 * Numbers are written as-is so amounts stay numeric, negatives included.
 */
export function csvCell(value: CsvCell): string {
  if (value == null) return '""';
  if (typeof value === "number") {
    return Number.isFinite(value) ? String(value) : '""';
  }
  const text = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return `"${text.replace(/"/g, '""')}"`;
}

export function toCsv(headers: string[], rows: CsvCell[][]): string {
  return [headers, ...rows].map(r => r.map(csvCell).join(",")).join("\r\n");
}

/** The BOM makes Excel read the file as UTF-8, so Thai text is not garbled. */
export function downloadCsv(
  filename: string,
  headers: string[],
  rows: CsvCell[][]
): void {
  const blob = new Blob(["﻿" + toCsv(headers, rows)], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
