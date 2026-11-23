# AI Current Flow — Graceful Giving (As-Is)

> **สถานะ:** Phase 0 — บันทึก Execution Flow จริงจาก Source Code
> ทุกขั้นมีไฟล์และบรรทัดอ้างอิง เพื่อให้ตรวจซ้ำได้

---

## Flow A — ผู้ถวายส่งสลิปจากแอป (Giving Station)

```
1. Client อัปโหลดภาพ base64
   └─ tRPC givingInbox.submitSlip          server/routers.ts:3282  (protectedProcedure)
      ├─ decodeSlipImage()                  server/line/slipImage.ts  (sniff magic bytes, ≤ MAX_SLIP_IMAGE_BYTES)
      ├─ ตรวจ fund มีจริง                    listFinanceAccounts()
      ├─ rate limit ต่อวัน                   countRecentManualSlips() → MAX_SLIPS_PER_DAY
      ├─ createManualSlip()                  server/db.ts
      │    ├─ hash ภาพ (SHA-256)             → L2 duplicate
      │    ├─ storagePutPrivate()            → bucket "slips" (private)
      │    └─ insert line_slips (status=pending, declaredAmount…)
      ├─ createAuditLog(CREATE line_slip)    server/db.ts
      ├─ notifyFinanceOfNewEntry()
      ├─ drainWorkerWithin(8_000 ms)         server/routers.ts:515
      └─ getMyManualSlip() → toDonorSlipStatus()
         └─ คืน { success, slipId, check, failedAttempts }
```

**หมายเหตุ:** ถ้า worker ยังไม่ทันภายใน 8 วินาที ผู้ถวายจะเห็นสถานะ `checking` — ไม่ error และไม่มีเงินถูกบันทึก

---

## Flow B — ผู้ถวายแนบภาพเพื่อให้ฟอร์มเติมข้อมูล (Preview only)

```
givingInbox.readSlip                        server/routers.ts:3520 (protectedProcedure)
├─ decodeSlipImage()
├─ allowSlipRead()  → 12 ครั้ง / 5 นาที     server/routers.ts:595
├─ Promise.race([ extractSlipData(dataUrl), timeout 20_000 ms ])
└─ toSlipReading(extraction)                server/line/slipReading.ts
   └─ เก็บเฉพาะฟิลด์ที่ confidence ≥ 0.85
   └─ คืน SlipReading { status, amount, senderName, transferDate, bank }
```

**สำคัญ:** flow นี้ **ไม่เขียน DB และไม่ให้เครดิตเงิน** ค่าใด ๆ ผู้ถวายแก้ไขได้ และเหรัญญิกยังตรวจซ้ำ

---

## Flow C — สลิปส่งผ่าน LINE Official Account

```
1. POST /api/line/webhook                   server/line/webhook.ts  (raw body, ก่อน express.json)
├─ validateSignature()  HMAC-SHA256 + timingSafeEqual
├─ จำกัด body ≤ 256 KB
├─ idempotency: (churchId, lineEventId) unique
├─ downloadLineImage()  จาก api-data.line.me
├─ sha256Hex() → L2 duplicate (ยกเว้น rejected/failed)
├─ storagePutPrivate()  → bucket "slips"
│    └─ ถ้า storage ล่ม → fallback เก็บ base64 ใน line_slips.aiData.inlineDataUrl
├─ getLineProfile()  (LINE display name)
├─ insert line_slips (status=pending)
├─ insert line_processing_jobs (status=queued)
├─ runWorkerBatch() (fire-and-forget)
├─ replyToLine("ได้รับสลิปแล้ว…")
└─ 200 OK
```

---

## Flow D — Worker ประมวลผล (หัวใจของ AI)

```
GET /api/line/process-worker                server/line/processWorker.ts
├─ isAuthorizedCron()  Bearer CRON_SECRET (dev เท่านั้นที่ยอมให้ว่าง)
└─ runWorkerBatch()
   ├─ เลือก queued jobs ที่ attempts < 3 และพ้น backoff (1 นาที, 5 นาที)
   ├─ atomic claim: queued → processing
   └─ processJob(jobId, slipId)
      ├─ 1. select line_slips (ต้อง status=pending)
      ├─ 2. resolveSlipImageUrl() → signed URL 1 ชม. หรือ inline data URL
      ├─ 3. extractSlipData(signedUrl)        ◄── AI อยู่ตรงนี้เท่านั้น
      │     ├─ ถ้ามี GEMINI_API_KEY/GOOGLE_API_KEY
      │     │   └─ extractWithGemini(): ลอง 4 model ตามลำดับ
      │     │        POST generativelanguage.googleapis.com/…:generateContent?key=…
      │     │        response_mime_type=application/json, temperature=0.1
      │     │        JSON.parse(rawText) แล้ว cast type
      │     │        normalizeAndValidateDate() (พ.ศ.→ค.ศ., ช่วง +2 วัน / -1 ปี)
      │     └─ fallback: invokeLLM() → Forge (OpenAI-compatible, outputSchema)
      │          แล้ว JSON.parse + regex `{...}` ถ้าจำเป็น
      ├─ 4. duplicate detection
      │     ├─ L1 reference → checkDuplicateByReference()
      │     └─ L3 amount+date+member → checkDuplicateByTransaction()
      ├─ 5. memberMatcher.matchMember()
      │     ├─ rule 1 LINE userId → 1.00 auto
      │     ├─ rule 2/3 ชื่อตรง/normalize → 0.95/0.90 auto
      │     └─ rule 4 fuzzy ≥0.85 → needs_review เสมอ
      ├─ 5b. verifySlip()
      │     ├─ checkDeclaredAmount()  (ต่างกัน + confidence ≥0.85 = mismatch)
      │     ├─ compareReceiverAccount()  (mask-aware, 1 หลักต่าง = suspect)
      │     ├─ checkTransferDate()  (อนาคต / เก่าเกิน)
      │     └─ escalate ถ้าโดน auto-reject ≥ MAX_AUTO_REJECTS ใน 24 ชม.
      ├─ 6. UPDATE line_slips
      │     status ∈ extracted | needs_review | matched | duplicate | rejected | failed
      │     aiRawText, aiData (extraction + verification + inlineDataUrl)
      │     extractedAmount/Date/Ref/Sender + confidence ทุกตัว
      └─ 7. UPDATE line_processing_jobs → done
         (ถ้า error: queued อีกครั้งจนถึง 3 ครั้ง แล้ว failed + slip.status=failed)
```

---

## Flow E — เจ้าหน้าที่อนุมัติ (จุดเดียวที่เงินเข้าสมุดบัญชี)

```
givingInbox.approve                         server/routers.ts:3077  (financeProcedure)
└─ approveLineSlip()                        server/db.ts:4052
   └─ db.transaction()
      ├─ SELECT … FOR UPDATE (row lock)
      ├─ กันซ้ำ: approved / rejected / duplicate
      ├─ re-check extractedRef ซ้ำกับ offerings(active)
      ├─ ตรวจ fund (มีจริง + isActive)
      ├─ no_slip → ต้อง confirmedBankCheck
      ├─ resolveLedgerName() (reviewer > member > slip > typed > line name)
      ├─ สร้าง offerings (+ split lines ถ้ามี)
      ├─ UPDATE line_slips → approved, approvedOfferingId, reviewedBy/At
      └─ createAuditLog
   └─ notifyDonorOfDecision("approved")
```

**AI ไม่มีส่วนในขั้นนี้** — ค่า `amount`, `fundId`, `memberId`, `receiptDate` มาจาก input ของเจ้าหน้าที่ (client) ไม่ได้มาจาก `aiData`

---

## Trust Boundaries

| Boundary | ข้อมูลที่ข้าม | การควบคุมปัจจุบัน |
|---|---|---|
| LINE → Webhook | ภาพสลิป, LINE userId | HMAC SHA-256, body ≤256KB, idempotency |
| Webhook → Storage | ภาพสลิป (PII) | bucket private, signed URL 1 ชม. |
| Storage → AI Provider | ภาพสลิปทั้งภาพ (มีชื่อผู้โอน/เลขบัญชี) | ส่งเฉพาะภาพ, prompt extraction-only |
| AI Provider → Server | JSON ที่ยังไม่ validate | ⚠️ cast type, ไม่มี Zod |
| Server → DB | ผล extract + confidence | column types, unique indexes |
| DB → Client (finance) | ⚠️ slip ทั้งแถว รวม `aiRawText`/`aiData` | role gate (TREASURER/SUPER_ADMIN) แต่ไม่มี field-level minimization |
| Staff → Financial Ledger | ยอด/กองทุน/member | transaction + lock + re-check + audit log |

---

## State Machine ของ `line_slips.status`

```
pending ──► processing ──► extracted ──► approved
   │            │           │  ▲
   │            │           ▼  │
   │            └──────► needs_review
   │                        │
   ├────────────────────► matched ──► approved
   ├────────────────────► duplicate   (terminal, อนุมัติไม่ได้)
   ├────────────────────► rejected    (terminal)
   └────────────────────► failed      (terminal, worker ครบ 3 ครั้ง)
```

`approved` / `rejected` / `duplicate` ถูกกันไว้ใน `approveLineSlip` ไม่ให้กลับมาเปลี่ยนสถานะทางการเงิน

---

## จุดที่ความล้มเหลวของ AI ส่งผลถึงอะไร (และไม่ส่งผลถึงอะไร)

| สถานการณ์ | ผลต่อ `line_slips` | ผลต่อ `offerings` (เงินจริง) |
|---|---|---|
| AI timeout / 429 / 503 | job → queued (retry) หรือ failed | **ไม่มี** |
| AI ตอบ JSON ผิดรูป | ⚠️ อาจ parse ผ่าน cast แล้วเขียนค่าผิด | **ไม่มี** จนกว่าเจ้าหน้าที่อนุมัติ |
| AI อ่านยอดผิด | ผู้ถวายเห็น mismatch / needs_review | **ไม่มี** จนกว่าเจ้าหน้าที่อนุมัติยอดจริง |
| Provider ล่มทั้งหมด | fallback Forge → ถ้าล่มด้วย = failed | **ไม่มี** |
| มีคนปลอมสลิป | AI extract ได้ แต่ไม่ยืนยันการโอนจริง | **ไม่มี** — ต้องมีเจ้าหน้าที่ตรวจกับธนาคาร |

ข้อสรุปสำคัญ: **AI ล้มเหลวไม่เคยทำให้ยอดเงินเปลี่ยนเอง** เพราะจุดเขียน `offerings` เดียวคือ `approveLineSlip` ที่ต้องมีมนุษย์ + role + transaction
