// Supabase Storage helpers for CFOS (Graceful Giving)
// Uploads receipt images/PDFs to Supabase Storage bucket "receipts".

const SUPABASE_URL = process.env.SUPABASE_URL ?? "";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const SUPABASE_STORAGE_BUCKET =
  process.env.SUPABASE_STORAGE_BUCKET ?? "receipts";
/** Private bucket for LINE slip images — financial data, never public */
const SUPABASE_SLIP_BUCKET = process.env.SUPABASE_SLIP_BUCKET ?? "slips";

function getSupabaseConfig() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      "Storage config missing: set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY"
    );
  }
  return {
    url: SUPABASE_URL.replace(/\/+$/, ""),
    key: SUPABASE_SERVICE_ROLE_KEY,
  };
}

/**
 * Auth headers for Supabase Storage. Every key goes in both `apikey` and
 * `Authorization: Bearer`, with the same value, as supabase-js does. A new
 * `sb_secret_...` key is not a JWT. The Supabase gateway reads it from `apikey`
 * and passes a JWT on, but Storage still needs the `Authorization` header to be
 * present: without it Storage answers "headers must have required property
 * 'authorization'". With only `Authorization`, it answers "Invalid Compact JWS".
 */
export function storageAuthHeaders(apiKey: string): Record<string, string> {
  return { apikey: apiKey, Authorization: `Bearer ${apiKey}` };
}

function appendHashSuffix(relKey: string): string {
  const hash = crypto.randomUUID().replace(/-/g, "").slice(0, 8);
  const lastDot = relKey.lastIndexOf(".");
  if (lastDot === -1) return `${relKey}_${hash}`;
  return `${relKey.slice(0, lastDot)}_${hash}${relKey.slice(lastDot)}`;
}

/**
 * Upload a file to Supabase Storage and return its public URL.
 * @param relKey      relative path e.g. "receipts/expense-123.jpg"
 * @param data        Buffer, Uint8Array, or base64 string (raw, without data-URI prefix)
 * @param contentType MIME type
 */
export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream"
): Promise<{ key: string; url: string }> {
  const { url, key: apiKey } = getSupabaseConfig();
  const key = appendHashSuffix(relKey.replace(/^\/+/, ""));

  // Convert base64 string → Buffer if needed
  const body: Buffer | Uint8Array =
    typeof data === "string" ? Buffer.from(data, "base64") : data;

  const uploadUrl = `${url}/storage/v1/object/${SUPABASE_STORAGE_BUCKET}/${key}`;
  const resp = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      ...storageAuthHeaders(apiKey),
      "Content-Type": contentType,
      "x-upsert": "true",
    },
    body: body as BodyInit,
  });

  if (!resp.ok) {
    const msg = await resp.text().catch(() => resp.statusText);
    throw new Error(`Supabase Storage upload failed (${resp.status}): ${msg}`);
  }

  // Public URL (bucket is set to public)
  const publicUrl = `${url}/storage/v1/object/public/${SUPABASE_STORAGE_BUCKET}/${key}`;
  return { key, url: publicUrl };
}

/**
 * Get a signed URL for a private file (valid for 1 hour).
 */
export async function storageGetSignedUrl(relKey: string): Promise<string> {
  const { url, key: apiKey } = getSupabaseConfig();
  const key = relKey.replace(/^\/+/, "");

  const signUrl = `${url}/storage/v1/object/sign/${SUPABASE_STORAGE_BUCKET}/${key}`;
  const resp = await fetch(signUrl, {
    method: "POST",
    headers: {
      ...storageAuthHeaders(apiKey),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ expiresIn: 3600 }),
  });

  if (!resp.ok) {
    const msg = await resp.text().catch(() => resp.statusText);
    throw new Error(`Supabase signed URL failed (${resp.status}): ${msg}`);
  }

  const result = (await resp.json()) as { signedURL?: string };
  const signedPath = result.signedURL?.startsWith("/storage/v1")
    ? result.signedURL
    : `/storage/v1${result.signedURL ?? ""}`;
  return `${url}${signedPath}`;
}

/**
 * Get the public URL for a stored file.
 */
export async function storageGet(
  relKey: string
): Promise<{ key: string; url: string }> {
  const { url } = getSupabaseConfig();
  const key = relKey.replace(/^\/+/, "");
  return {
    key,
    url: `${url}/storage/v1/object/public/${SUPABASE_STORAGE_BUCKET}/${key}`,
  };
}

/**
 * Delete a file from Supabase Storage.
 */
export async function storageDelete(relKey: string): Promise<void> {
  const { url, key: apiKey } = getSupabaseConfig();
  const key = relKey.replace(/^\/+/, "");

  const deleteUrl = `${url}/storage/v1/object/${SUPABASE_STORAGE_BUCKET}/${key}`;
  const resp = await fetch(deleteUrl, {
    method: "DELETE",
    headers: {
      ...storageAuthHeaders(apiKey),
    },
  });

  if (!resp.ok) {
    const msg = await resp.text().catch(() => resp.statusText);
    throw new Error(`Supabase Storage delete failed (${resp.status}): ${msg}`);
  }
}

/**
 * Upload a slip image to the PRIVATE Supabase Storage bucket.
 * Never generates or returns a public URL — use getSlipSignedUrl() to display.
 *
 * @returns { key } — the storage key to persist in line_slips.slipImageKey
 */
export async function storagePutPrivate(
  relKey: string,
  data: Buffer | Uint8Array,
  contentType = "image/jpeg"
): Promise<{ key: string }> {
  const { url, key: apiKey } = getSupabaseConfig();
  const key = appendHashSuffix(relKey.replace(/^\/+/, ""));

  const uploadUrl = `${url}/storage/v1/object/${SUPABASE_SLIP_BUCKET}/${key}`;
  const resp = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      ...storageAuthHeaders(apiKey),
      "Content-Type": contentType,
      "x-upsert": "true",
    },
    body: data as BodyInit,
  });

  if (!resp.ok) {
    const msg = await resp.text().catch(() => resp.statusText);
    throw new Error(
      `Supabase private storage upload failed (${resp.status}): ${msg}`
    );
  }

  return { key };
}

/**
 * Generate a signed URL for a slip image in the PRIVATE bucket.
 * Valid for 1 hour. Regenerate on each view request.
 */
export async function getSlipSignedUrl(slipImageKey: string): Promise<string> {
  const { url, key: apiKey } = getSupabaseConfig();
  const key = slipImageKey.replace(/^\/+/, "");

  const signUrl = `${url}/storage/v1/object/sign/${SUPABASE_SLIP_BUCKET}/${key}`;
  const resp = await fetch(signUrl, {
    method: "POST",
    headers: {
      ...storageAuthHeaders(apiKey),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ expiresIn: 3600 }),
  });

  if (!resp.ok) {
    const msg = await resp.text().catch(() => resp.statusText);
    throw new Error(`Supabase slip signed URL failed (${resp.status}): ${msg}`);
  }

  const result = (await resp.json()) as { signedURL?: string };
  const signedPath = result.signedURL?.startsWith("/storage/v1")
    ? result.signedURL
    : `/storage/v1${result.signedURL ?? ""}`;
  return `${url}${signedPath}`;
}

/**
 * Extracts an inline base64 data URL stored in `line_slips.aiData` when
 * Supabase Storage was unavailable at upload time.
 */
export function extractInlineSlipDataUrl(aiData: unknown): string | null {
  if (!aiData || typeof aiData !== "object") return null;
  const inline = (aiData as Record<string, unknown>).inlineDataUrl;
  return typeof inline === "string" && inline.startsWith("data:image/")
    ? inline
    : null;
}

/**
 * Resolves a slip image URL for OCR or staff review:
 * - Returns the inline `data:image/...` URL immediately for `"inline:..."` keys
 * - Otherwise requests a 1-hour signed URL from Supabase Storage, falling back
 *   to `inlineDataUrl` if signing fails.
 */
export async function resolveSlipImageUrl(
  slipImageKey: string,
  aiData?: unknown
): Promise<string> {
  const inlineUrl = extractInlineSlipDataUrl(aiData);
  if (!slipImageKey || slipImageKey.startsWith("inline:")) {
    if (inlineUrl) return inlineUrl;
    throw new Error("Slip inline image data is not available");
  }
  if (slipImageKey.startsWith("data:image/")) {
    return slipImageKey;
  }
  try {
    return await getSlipSignedUrl(slipImageKey);
  } catch (err) {
    if (inlineUrl) return inlineUrl;
    throw err;
  }
}
