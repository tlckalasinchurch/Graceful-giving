/**
 * LINE Webhook Handler — Graceful Giving
 *
 * Responsibilities (ONLY):
 *   1. Validate HMAC-SHA256 signature
 *   2. Download image from LINE
 *   3. Hash image — Level 2 duplicate check
 *   4. Upload to PRIVATE Supabase Storage
 *   5. INSERT line_slips (idempotent via lineEventId unique constraint)
 *   6. INSERT line_processing_jobs (queued)
 *   7. Return 200 OK
 *
 * This handler does NOT perform OCR or member matching.
 * All heavy processing is done by the Vercel Cron worker.
 */

import type { Request, Response, Express } from "express";
import { createHmac, createHash, timingSafeEqual } from "crypto";
import { ENV } from "../_core/env";
import { storagePutPrivate } from "../storage";
import { getDb, DEFAULT_CHURCH_ID } from "../db";
import { lineSlips, lineProcessingJobs } from "../../drizzle/schema";
import { runWorkerBatch } from "./processWorker";
import { eq, and } from "drizzle-orm";
import { sql } from "drizzle-orm";

const LINE_API_BASE = "https://api.line.me/v2/bot";
const LINE_CONTENT_BASE = "https://api-data.line.me/v2/bot";
const MAX_RETRIES = 3;
/** LINE webhook bodies are a few KB. Anything near this size is not from LINE. */
const MAX_WEBHOOK_BODY_BYTES = 256 * 1024;

// ─── Types ────────────────────────────────────────────────────────────────────

interface LineMessage {
  type: string;
  id: string;
}

interface LineSource {
  type: string;
  userId?: string;
}

interface LineEvent {
  type: string;
  webhookEventId: string; // LINE event unique ID — used for idempotency
  message?: LineMessage;
  source?: LineSource;
  replyToken?: string;
}

interface LineWebhookBody {
  destination: string;
  events: LineEvent[];
}

// ─── Signature Validation ─────────────────────────────────────────────────────

function validateSignature(rawBody: Buffer, signature: string): boolean {
  if (!ENV.lineChannelSecret) {
    // Allow in dev when not configured — block in production
    if (ENV.isProduction) return false;
    console.warn("[LINE Webhook] LINE_CHANNEL_SECRET not set — skipping validation (dev only)");
    return true;
  }
  const expected = createHmac("sha256", ENV.lineChannelSecret)
    .update(rawBody)
    .digest("base64");

  const expectedBuf = Buffer.from(expected, "utf-8");
  const signatureBuf = Buffer.from(signature, "utf-8");
  if (expectedBuf.length !== signatureBuf.length) return false;
  return timingSafeEqual(expectedBuf, signatureBuf);
}

// ─── LINE API Helpers ─────────────────────────────────────────────────────────

async function getLineProfile(userId: string): Promise<string> {
  try {
    const resp = await fetch(`${LINE_API_BASE}/profile/${userId}`, {
      headers: { Authorization: `Bearer ${ENV.lineChannelAccessToken}` },
    });
    if (!resp.ok) return userId;
    const data = (await resp.json()) as { displayName?: string };
    return data.displayName ?? userId;
  } catch {
    return userId;
  }
}

async function downloadLineImage(messageId: string): Promise<Buffer> {
  const resp = await fetch(
    `${LINE_CONTENT_BASE}/message/${messageId}/content`,
    { headers: { Authorization: `Bearer ${ENV.lineChannelAccessToken}` } }
  );
  if (!resp.ok) {
    throw new Error(`LINE image download failed: ${resp.status} ${resp.statusText}`);
  }
  return Buffer.from(await resp.arrayBuffer());
}

async function replyToLine(replyToken: string, text: string): Promise<void> {
  if (!ENV.lineChannelAccessToken || !replyToken) return;
  await fetch(`${LINE_API_BASE}/message/reply`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${ENV.lineChannelAccessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      replyToken,
      messages: [{ type: "text", text }],
    }),
  }).catch((e: unknown) =>
    console.error("[LINE Webhook] reply failed:", e)
  );
}

// ─── Image Helpers ────────────────────────────────────────────────────────────

function sha256Hex(data: Buffer): string {
  return createHash("sha256").update(data).digest("hex");
}

// ─── Event Processor ─────────────────────────────────────────────────────────

async function processImageEvent(
  event: LineEvent,
  churchId: string
): Promise<void> {
  const lineUserId = event.source?.userId;
  const messageId = event.message?.id;
  const lineEventId = event.webhookEventId;

  if (!lineUserId || !messageId || !lineEventId) return;

  const db = await getDb();
  if (!db) {
    console.error("[LINE Webhook] DB not available");
    return;
  }

  // ── Idempotency check: has this event been processed before? ──────────────
  const existing = await db
    .select({ id: lineSlips.id })
    .from(lineSlips)
    .where(
      and(
        eq(lineSlips.churchId, churchId),
        eq(lineSlips.lineEventId, lineEventId)
      )
    )
    .limit(1);

  if (existing.length > 0) {
    console.log(`[LINE Webhook] Duplicate event ${lineEventId} — skipping`);
    return;
  }

  // ── Download image ────────────────────────────────────────────────────────
  let imageBuffer: Buffer;
  try {
    imageBuffer = await downloadLineImage(messageId);
  } catch (err) {
    console.error("[LINE Webhook] Image download failed:", err);
    if (event.replyToken) {
      await replyToLine(
        event.replyToken,
        "ขออภัย ไม่สามารถรับรูปภาพได้ในขณะนี้ กรุณาลองใหม่อีกครั้งค่ะ 🙏"
      );
    }
    return;
  }

  // ── Level 2 duplicate: check image hash ───────────────────────────────────
  const slipHash = sha256Hex(imageBuffer);

  const hashDuplicate = await db
    .select({ id: lineSlips.id, status: lineSlips.status })
    .from(lineSlips)
    .where(eq(lineSlips.slipHash, slipHash))
    .limit(1);

  if (hashDuplicate.length > 0) {
    console.log(`[LINE Webhook] Duplicate image hash ${slipHash} from ${lineUserId}`);
    if (event.replyToken) {
      await replyToLine(
        event.replyToken,
        "ระบบตรวจพบว่าสลิปนี้เคยส่งมาแล้วค่ะ หากมีข้อสงสัยกรุณาติดต่อเจ้าหน้าที่ 🙏"
      );
    }
    return;
  }

  // ── Upload to PRIVATE storage ──────────────────────────────────────────────
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10);
  const storageKey = `line/${churchId}/${lineUserId}/${dateStr}/${slipHash.slice(0, 16)}.jpg`;

  let uploadResult: { key: string };
  try {
    uploadResult = await storagePutPrivate(storageKey, imageBuffer, "image/jpeg");
  } catch (err) {
    console.error("[LINE Webhook] Storage upload failed:", err);
    if (event.replyToken) {
      await replyToLine(
        event.replyToken,
        "ขออภัย เกิดข้อผิดพลาดในการบันทึกสลิป กรุณาลองใหม่อีกครั้งค่ะ 🙏"
      );
    }
    return;
  }

  // ── Get LINE display name ──────────────────────────────────────────────────
  const lineDisplayName = await getLineProfile(lineUserId);

  // ── Insert line_slips row (idempotent — unique constraint on eventId) ──────
  let newSlipId: number;
  try {
    const [inserted] = await db
      .insert(lineSlips)
      .values({
        churchId,
        lineUserId,
        lineDisplayName,
        lineEventId,
        slipImageKey: uploadResult.key,
        slipHash,
        status: "pending",
        processingAttempts: 0,
      })
      .onConflictDoNothing()
      .returning({ id: lineSlips.id });

    if (!inserted) {
      // Conflict: another worker already processed this event
      console.log(`[LINE Webhook] Conflict on lineEventId ${lineEventId} — already inserted`);
      return;
    }
    newSlipId = inserted.id;
  } catch (err) {
    console.error("[LINE Webhook] DB insert failed:", err);
    return;
  }

  // ── Enqueue processing job ─────────────────────────────────────────────────
  try {
    await db.insert(lineProcessingJobs).values({
      slipId: newSlipId,
      churchId,
      status: "queued",
      attempts: 0,
    });
    // Immediately attempt to process in background without blocking webhook response
    runWorkerBatch().catch(err =>
      console.warn("[LINE Webhook] Trigger worker error:", err)
    );
  } catch (err) {
    console.error("[LINE Webhook] Job enqueue failed:", err);
    // Non-fatal: worker can still pick up slips with no job row by polling line_slips
  }

  // ── Reply to user immediately ──────────────────────────────────────────────
  if (event.replyToken) {
    await replyToLine(
      event.replyToken,
      "✅ ได้รับสลิปของคุณแล้วค่ะ\n\nระบบกำลังตรวจสอบ และจะแจ้งผลเมื่อเจ้าหน้าที่อนุมัติแล้ว\n\nขอบคุณสำหรับการถวายทรัพย์ 🙏"
    );
  }
}

// ─── Express Route Registration ───────────────────────────────────────────────

export function registerLineWebhook(app: Express): void {
  /**
   * LINE requires raw body for HMAC-SHA256 signature validation.
   * This route must be registered BEFORE express.json() middleware.
   * We use a custom raw body parser here.
   */
  app.post("/api/line/webhook", (req: Request, res: Response): void => {
    const chunks: Buffer[] = [];
    let received = 0;
    let tooLarge = false;

    req.on("data", (chunk: Buffer) => {
      if (tooLarge) return;
      received += chunk.length;
      if (received > MAX_WEBHOOK_BODY_BYTES) {
        // Stop buffering before the signature is checked.
        tooLarge = true;
        chunks.length = 0;
        res.status(413).json({ error: "Payload too large" });
        return;
      }
      chunks.push(chunk);
    });

    req.on("end", async () => {
      if (tooLarge) return;
      const rawBody = Buffer.concat(chunks);
      const signature = req.headers["x-line-signature"] as string | undefined;

      // Validate signature
      if (!signature || !validateSignature(rawBody, signature)) {
        console.warn("[LINE Webhook] Invalid or missing signature");
        res.status(401).json({ error: "Invalid signature" });
        return;
      }

      // Parse body
      let body: LineWebhookBody;
      try {
        body = JSON.parse(rawBody.toString("utf8")) as LineWebhookBody;
      } catch {
        res.status(400).json({ error: "Invalid JSON body" });
        return;
      }

      // Process events before returning 200 so serverless execution environment does not freeze
      const churchId = DEFAULT_CHURCH_ID;
      const tasks: Promise<void>[] = [];
      for (const event of body.events ?? []) {
        if (event.type === "message" && event.message?.type === "image") {
          tasks.push(
            processImageEvent(event, churchId).catch((err: unknown) =>
              console.error("[LINE Webhook] processImageEvent error:", err)
            )
          );
        }
      }

      if (tasks.length > 0) {
        await Promise.all(tasks);
      }

      // Return 200 to LINE
      res.status(200).json({ ok: true });
    });

    req.on("error", (err: Error) => {
      console.error("[LINE Webhook] Request error:", err);
      if (!res.headersSent) {
        res.status(400).json({ error: "Request error" });
      }
    });
  });
}
