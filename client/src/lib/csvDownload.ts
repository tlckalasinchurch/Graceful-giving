const UTF8_BOM = "\uFEFF";

/**
 * UTF-8 bytes of a CSV file with exactly one byte-order mark (EF BB BF).
 *
 * Excel needs the mark to read Thai text as UTF-8. Some export routes already
 * add the mark on the server. This function removes any leading marks and
 * adds one, so the file never carries two.
 */
export function csvBytes(csv: string): Uint8Array {
  let body = csv;
  while (body.startsWith(UTF8_BOM)) body = body.slice(UTF8_BOM.length);
  return new TextEncoder().encode(UTF8_BOM + body);
}

export function toCsvBlob(csv: string): Blob {
  return new Blob([csvBytes(csv) as BlobPart], {
    type: "text/csv;charset=utf-8;",
  });
}

/**
 * Save CSV text as a file in the browser. One place for the link, the byte
 * order mark and the clean-up, so every export page behaves the same.
 */
export function saveCsvFile(csv: string, filename: string): void {
  const url = URL.createObjectURL(toCsvBlob(csv));
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
