/**
 * Slip OCR — AI extraction of Thai bank transfer slip data
 *
 * Uses the existing invokeLLM() (Forge API, OpenAI-compatible) which
 * already supports image_url content parts. No additional packages needed.
 *
 * Returns per-field confidence scores. Callers use these to determine
 * whether the slip needs manual review (needs_review) vs is ready to match.
 *
 * AI role: EXTRACT ONLY — never approve or reject financial transactions.
 */

import { invokeLLM } from "../_core/llm";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SlipExtraction {
  /** Raw text response from AI before JSON parsing */
  rawText: string;
  /** Transfer amount in THB (null if unreadable) */
  amount: number | null;
  /** 0.0–1.0 confidence for amount */
  amountConfidence: number;
  /** Transfer date as ISO string "YYYY-MM-DD" (null if unreadable) */
  transferDate: string | null;
  /** Transfer time as "HH:MM" (null if unreadable) */
  transferTime: string | null;
  /** 0.0–1.0 confidence for date/time */
  dateConfidence: number;
  /** Sender name as printed on slip (null if absent) */
  senderName: string | null;
  /** 0.0–1.0 confidence for sender name */
  senderConfidence: number;
  /** Bank transaction reference / ID (null if absent) */
  referenceNumber: string | null;
  /** 0.0–1.0 confidence for reference number */
  referenceConfidence: number;
  /** Source bank name e.g. "SCB", "กสิกรไทย" (null if unreadable) */
  bankName: string | null;
  /** Receiver account name (null if absent) */
  receiverName: string | null;
  /**
   * Receiver account number as printed. Masked digits stay as x, X or *.
   * Optional so slips read before this field existed still parse.
   */
  receiverAccount?: string | null;
  /** 0.0–1.0 confidence for the receiver account number */
  receiverAccountConfidence?: number;
  /** "promptpay" when the slip shows a phone or ID number, not a bank account */
  receiverAccountType?: "bank_account" | "promptpay" | null;
  /** Receiver bank name (null if unreadable) */
  receiverBank?: string | null;
  /** AI notes or caveats */
  notes: string | null;
}

/** Threshold below which a field is considered low-confidence → needs_review */
export const CONFIDENCE_THRESHOLD = 0.85;

/** Critical fields that must all exceed threshold for auto-processing */
const CRITICAL_FIELDS = ["amount", "referenceNumber"] as const;

/** Returns true if the slip should be flagged for manual review */
export function requiresReview(extraction: SlipExtraction): boolean {
  if (extraction.amountConfidence < CONFIDENCE_THRESHOLD) return true;
  if (extraction.referenceConfidence < CONFIDENCE_THRESHOLD) return true;
  if (extraction.amount === null) return true;
  return false;
}

// ─── Prompt ───────────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `คุณคือระบบอ่านและดึงข้อมูลจากสลิปการโอนเงินธนาคารไทย

**หน้าที่**: ดึงข้อมูลเท่านั้น — ห้ามอนุมัติ ห้ามตัดสินใจ ห้ามให้คำแนะนำด้านการเงิน

**ข้อมูลที่ต้องดึง**:
- amount: จำนวนเงิน (ตัวเลข THB เท่านั้น ไม่มีสัญลักษณ์)
- amountConfidence: ความมั่นใจ 0.0–1.0
- transferDate: วันที่โอน (YYYY-MM-DD) หรือ null
- transferTime: เวลาที่โอน (HH:MM 24h) หรือ null
- dateConfidence: ความมั่นใจวันที่/เวลา 0.0–1.0
- senderName: ชื่อผู้โอน หรือ null
- senderConfidence: ความมั่นใจชื่อผู้โอน 0.0–1.0
- referenceNumber: หมายเลขอ้างอิง/เลขที่รายการ หรือ null
- referenceConfidence: ความมั่นใจหมายเลขอ้างอิง 0.0–1.0
- bankName: ชื่อธนาคารต้นทาง หรือ null
- receiverName: ชื่อผู้รับ หรือ null
- receiverAccount: เลขบัญชีหรือเลขพร้อมเพย์ของผู้รับตามที่พิมพ์บนสลิป ให้คงอักขระที่ถูกปิดบังไว้เป็น x ห้ามเดาหรือเติมตัวเลขที่ถูกปิด หรือ null
- receiverAccountConfidence: ความมั่นใจเลขบัญชีผู้รับ 0.0–1.0
- receiverAccountType: "bank_account" ถ้าเป็นเลขบัญชีธนาคาร, "promptpay" ถ้าเป็นเบอร์โทรหรือเลขประจำตัวพร้อมเพย์, หรือ null ถ้าไม่แน่ใจ
- receiverBank: ชื่อธนาคารปลายทาง หรือ null
- notes: หมายเหตุถ้ารูปไม่ชัดหรือมีข้อสังเกต หรือ null

**กฎ**:
- ถ้าอ่านข้อมูลไม่ได้ ให้ตั้ง null — ห้ามเดา
- ถ้ารูปเบลอหรือถ่ายไม่ตรง ให้ amountConfidence ต่ำ
- ตอบเป็น JSON เท่านั้น ไม่มีข้อความอื่น`;

const OUTPUT_SCHEMA = {
  name: "slip_extraction",
  schema: {
    type: "object",
    properties: {
      amount: { type: ["number", "null"] },
      amountConfidence: { type: "number", minimum: 0, maximum: 1 },
      transferDate: { type: ["string", "null"] },
      transferTime: { type: ["string", "null"] },
      dateConfidence: { type: "number", minimum: 0, maximum: 1 },
      senderName: { type: ["string", "null"] },
      senderConfidence: { type: "number", minimum: 0, maximum: 1 },
      referenceNumber: { type: ["string", "null"] },
      referenceConfidence: { type: "number", minimum: 0, maximum: 1 },
      bankName: { type: ["string", "null"] },
      receiverName: { type: ["string", "null"] },
      receiverAccount: { type: ["string", "null"] },
      receiverAccountConfidence: { type: "number", minimum: 0, maximum: 1 },
      receiverAccountType: {
        type: ["string", "null"],
        enum: ["bank_account", "promptpay", null],
      },
      receiverBank: { type: ["string", "null"] },
      notes: { type: ["string", "null"] },
    },
    required: [
      "amount", "amountConfidence",
      "transferDate", "transferTime", "dateConfidence",
      "senderName", "senderConfidence",
      "referenceNumber", "referenceConfidence",
      "bankName", "receiverName",
      "receiverAccount", "receiverAccountConfidence",
      "receiverAccountType", "receiverBank",
      "notes",
    ],
    additionalProperties: false,
  },
  strict: true,
};

// ─── Error Handling & Types ──────────────────────────────────────────────────

export class TransientOcrError extends Error {
  constructor(message: string, public readonly status?: number) {
    super(message);
    this.name = "TransientOcrError";
  }
}

/** HTTP statuses worth retrying: rate limit plus server-side faults. */
const TRANSIENT_STATUSES = new Set([408, 429, 500, 502, 503, 504]);

/** Network-level failures, which carry no HTTP status. */
const TRANSIENT_NETWORK_PATTERNS =
  /(econnreset|etimedout|econnrefused|enotfound|socket hang up|network error|fetch failed|timeout)/i;

export function isTransientError(err: unknown): boolean {
  if (err instanceof TransientOcrError) return true;

  const msg = err instanceof Error ? err.message : String(err);

  // Read the status from the known thrown-message shapes only. Scanning the whole
  // message would match digits inside a provider's error body — e.g. a permanent
  // 400 quoting "maxOutputTokens: 500" would be retried as if it were transient.
  const statusMatch = msg.match(/LLM invoke failed:\s*(\d{3})\b/i);
  if (statusMatch) {
    return TRANSIENT_STATUSES.has(Number(statusMatch[1]));
  }

  return TRANSIENT_NETWORK_PATTERNS.test(msg);
}

// ─── Date Normalization & Plausibility ────────────────────────────────────────

export function normalizeAndValidateDate(
  dateStr: string | null,
  timeStr: string | null,
  confidence: number
): { transferDate: string | null; dateConfidence: number } {
  if (!dateStr) return { transferDate: null, dateConfidence: 0 };

  const trimmed = dateStr.trim();
  const match = trimmed.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (match) {
    let year = parseInt(match[1], 10);
    const month = match[2].padStart(2, "0");
    const day = match[3].padStart(2, "0");

    // Buddhist Era conversion (e.g. 2567 -> 2024, 2569 -> 2026)
    if (year > 2400 && year < 2700) {
      year -= 543;
    }

    const normalized = `${year}-${month}-${day}`;
    const parsedDate = new Date(`${normalized}T${timeStr || "12:00"}:00Z`);

    if (isNaN(parsedDate.getTime())) {
      return { transferDate: null, dateConfidence: 0 };
    }

    const now = new Date();
    const twoDaysInFuture = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);
    const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);

    // Sanity check: Plausible range
    if (parsedDate > twoDaysInFuture || parsedDate < oneYearAgo) {
      console.warn(`[SlipOCR] Extracted date ${normalized} failed plausibility check`);
      return { transferDate: normalized, dateConfidence: Math.min(confidence, 0.4) };
    }

    return { transferDate: normalized, dateConfidence: confidence };
  }

  return { transferDate: null, dateConfidence: 0 };
}

// ─── Gemini API direct integration (Free tier via Google AI Studio) ───────────

async function extractWithGemini(
  signedImageUrl: string,
  apiKey: string
): Promise<SlipExtraction> {
  const imgRes = await fetch(signedImageUrl);
  if (!imgRes.ok) {
    throw new Error(`Failed to download slip image: ${imgRes.status}`);
  }
  const arrayBuffer = await imgRes.arrayBuffer();
  const base64Data = Buffer.from(arrayBuffer).toString("base64");
  const contentType = imgRes.headers.get("content-type") || "image/jpeg";

  // Prioritize gemini-3.5-flash, fallback to flash-lite and latest
  const models = [
    "gemini-3.5-flash",
    "gemini-3.1-flash-lite",
    "gemini-2.5-flash-lite",
    "gemini-flash-latest",
  ];
  let lastError: any;

  for (const model of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const resp = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `${SYSTEM_PROMPT}\n\nกรุณาดึงข้อมูลและตอบกลับตาม JSON Schema นี้เท่านั้น:\n${JSON.stringify(
                    OUTPUT_SCHEMA.schema
                  )}`,
                },
                {
                  inline_data: {
                    mime_type: contentType,
                    data: base64Data,
                  },
                },
              ],
            },
          ],
          generationConfig: {
            response_mime_type: "application/json",
            temperature: 0.1,
          },
        }),
      });

      if (!resp.ok) {
        const errorText = await resp.text();
        if (resp.status === 429 || resp.status === 503 || resp.status >= 500) {
          throw new TransientOcrError(
            `Gemini ${model} temporary error (${resp.status}): ${errorText}`,
            resp.status
          );
        }
        throw new Error(`Gemini ${model} error (${resp.status}): ${errorText}`);
      }

      const data = await resp.json();
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
      const parsed = JSON.parse(rawText) as Omit<SlipExtraction, "rawText">;

      // Sanitize and validate date
      const dateCheck = normalizeAndValidateDate(
        parsed.transferDate,
        parsed.transferTime,
        parsed.dateConfidence
      );
      parsed.transferDate = dateCheck.transferDate;
      parsed.dateConfidence = dateCheck.dateConfidence;

      return { rawText, ...parsed };
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError;
}

// ─── Main extraction function ─────────────────────────────────────────────────

export async function extractSlipData(
  signedImageUrl: string
): Promise<SlipExtraction> {
  let rawText = "";

  // 1. Try Google Gemini API if GEMINI_API_KEY is available (100% Free via Google AI Studio)
  const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (geminiKey) {
    try {
      console.log("[SlipOCR] Extracting slip data via Google Gemini Vision API...");
      return await extractWithGemini(signedImageUrl, geminiKey);
    } catch (geminiErr) {
      // If it's a transient rate limit or service outage, throw so the worker retries
      if (isTransientError(geminiErr)) {
        console.warn("[SlipOCR] Gemini transient error — throwing for worker retry:", geminiErr);
        throw geminiErr;
      }
      console.warn("[SlipOCR] Gemini extraction error, trying fallback:", geminiErr);
    }
  }

  try {
    const result = await invokeLLM({
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: { url: signedImageUrl, detail: "high" },
            },
            {
              type: "text",
              text: "กรุณาอ่านสลิปนี้และดึงข้อมูลตามที่กำหนด ตอบเป็น JSON เท่านั้น",
            },
          ],
        },
      ],
      outputSchema: OUTPUT_SCHEMA,
      maxTokens: 600,
    });

    const content = result.choices[0]?.message?.content;
    rawText = typeof content === "string" ? content : JSON.stringify(content ?? "");

    // Parse JSON — handle cases where model wraps in markdown fence
    let parsed: Omit<SlipExtraction, "rawText">;
    try {
      parsed = JSON.parse(rawText) as Omit<SlipExtraction, "rawText">;
    } catch {
      const match = rawText.match(/\{[\s\S]*\}/);
      if (!match) throw new Error("AI returned non-JSON response");
      parsed = JSON.parse(match[0]) as Omit<SlipExtraction, "rawText">;
    }

    // Sanitize and validate date
    const dateCheck = normalizeAndValidateDate(
      parsed.transferDate,
      parsed.transferTime,
      parsed.dateConfidence
    );
    parsed.transferDate = dateCheck.transferDate;
    parsed.dateConfidence = dateCheck.dateConfidence;

    return { rawText, ...parsed };
  } catch (err) {
    // Re-throw transient errors (e.g. rate limit, 503, connection dropped) so queue retries
    if (isTransientError(err)) {
      console.warn("[SlipOCR] Transient error during invokeLLM — rethrowing for worker retry:", err);
      throw err;
    }

    console.error("[SlipOCR] Permanent extraction failure (unreadable image):", err);
    return {
      rawText,
      amount: null,
      amountConfidence: 0,
      transferDate: null,
      transferTime: null,
      dateConfidence: 0,
      senderName: null,
      senderConfidence: 0,
      referenceNumber: null,
      referenceConfidence: 0,
      bankName: null,
      receiverName: null,
      notes: `Extraction failed: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}
