# AI Risk Assessment — Graceful Giving

> **สถานะ:** Phase 0 — Risk Register จาก Source Code จริง
> **เกณฑ์ความรุนแรง:** Critical = กระทบความถูกต้องทางการเงินหรือทำให้ข้อมูลส่วนบุคคลรั่วโดยตรง / High = ทำให้เกิดการตัดสินใจผิดหรือระบบล่มเป็นวงกว้าง / Medium = เพิ่มโอกาสเกิดข้อผิดพลาดหรือตรวจสอบย้อนหลังไม่ได้ / Low = ปรับปรุงคุณภาพ

---

## 1. Risk Register

### R-01 — AI output ไม่ถูก validate ด้วย Schema · **Critical**

**หลักฐาน:** `server/line/slipOcr.ts:283` และ `:375`
```ts
const parsed = JSON.parse(rawText) as Omit<SlipExtraction, "rawText">;
```
TypeScript `as` เป็นการบอก compiler เท่านั้น ไม่มีการตรวจ runtime เลย

**ผลกระทบ:**
- `amount` อาจมาเป็น string / ค่าติดลบ / `NaN` → ไหลเข้า `checkDeclaredAmount()` และถูกเขียนลง `extractedAmount` (decimal)
- `amountConfidence` อาจเป็น 2.0 หรือ string → ทำให้ `requiresReview()` และ `>= CONFIDENCE_THRESHOLD` ตัดสินผิด
- `transferDate` ผิดรูป → `new Date(...)` ได้ `Invalid Date` → `checkTransferDate` ทำงานกับค่าเสีย
- ฟิลด์ที่หายไปเลย (schema drift ของ provider) → `undefined` ถูกเขียนทับเป็น `undefined` ลง DB

**ทำไมCritical:** ค่าที่ผิดรูปสามารถเปลี่ยนผลการตัดสิน `status` และทำให้สลิปถูก auto-reject หรือ auto-match ผิด — แม้เงินยังไม่ถูก post แต่ผู้ถวายอาจถูกปฏิเสธโดยไม่เป็นธรรม และเจ้าหน้าที่เห็นข้อมูลผิด

**การบรรเทาที่มีอยู่:** `normalizeAndValidateDate()` ตรวจวันที่ซ้ำอีกชั้น, `requiresReview()` ตรวจ amount/reference confidence — แต่ไม่ได้ครอบคลุมชนิดข้อมูลหรือช่วงค่า

---

### R-02 — ไม่มี Timeout ใน Worker AI Call · **Critical**

**หลักฐาน:** `server/line/processWorker.ts:processJob()` เรียก `await extractSlipData(signedUrl)` ตรง ๆ โดยไม่มี timeout
ตรงข้ามกับ `readSlip` ที่มี `Promise.race(..., 20_000 ms)` (`server/routers.ts:609`)

**ผลกระทบ:** ถ้า Gemini/Forge ค้าง ฟังก์ชัน serverless จะค้างจนครบ limit (มีหลักฐาน 300s timeout ใน `docs/PR_138_RELEASE_READINESS_AUDIT.md:240`) ทำให้:
- job ถูก mark failed ทั้งที่อาจสำเร็จถ้ารอ
- cron รอบถัดไปทำงานซ้อน
- ช่องทาง `/api` อื่น ๆ ที่แชร์ runtime ได้รับผล

**การบรรเทาที่มีอยู่:** `MAX_ATTEMPTS=3` + backoff และ atomic claim กันการประมวลผลซ้ำ

---

### R-03 — ข้อมูลดิบของ AI และภาพสลิปถูกส่งออกไป client · **Critical**

**หลักฐาน:** `server/db.ts:3984` (`getLineSlipById`) และ `:3932` (`listLineSlips`) ใช้ `db.select()` ทั้งแถว แล้ว `return { ...slip, signedImageUrl }`
ผลคือ response มี `aiRawText` และ `aiData` — ซึ่งอาจมี `inlineDataUrl` = **ภาพสลิป base64 ทั้งภาพ** (fallback path ใน `webhook.ts`)

**ผลกระทบ:**
- PII (ชื่อผู้โอน, เลขบัญชีที่ถูก mask, ภาพสลิป) ถูกส่งเกินความจำเป็นไปยังเบราว์เซอร์
- response body บวม (ภาพ base64 หลาย MB ต่อรายการ) → กระทบ performance และเวลาประมวลผลบน client
- ข้อมูลดิบถูก cache ฝั่ง client โดยไม่มีนโยบายลบ

**การบรรเทาที่มีอยู่:** `getById`/`list` ต้องผ่าน `financeProcedure` (TREASURER/SUPER_ADMIN) — จึงไม่ใช่ช่องโหว่สิทธิ์ แต่เป็น **data minimization violation**

---

### R-04 — AI Provider ผูกกับชื่อ Model และ Endpoint ตรง · **High**

**หลักฐาน:** `server/line/slipOcr.ts:234-330` — URL, payload format, model list (`gemini-3.5-flash`, …), และ `inline_data` shape ฝังอยู่ในไฟล์เดียวกับ business flow
`"ai": "^7.0.107"` ติดตั้งแล้วแต่ **ไม่ถูก import ที่ไหนเลย**

**ผลกระทบ:**
- เปลี่ยน provider/model ต้องแก้ไฟล์ที่แตะ financial flow โดยตรง (เสี่ยง regression)
- Vercel AI SDK ที่เป็นเป้าหมายหลักยังไม่ได้ใช้ → ไม่มี abstraction, ไม่มี typed error จาก SDK, ไม่มี telemetry
- ถ้า Gemini เลิกให้บริการ model ใด ต้อง deploy โค้ดใหม่

---

### R-05 — Confidence ถูกใช้เป็นหลักฐานยืนยัน · **High**

**หลักฐาน:** `CONFIDENCE_THRESHOLD = 0.85` ใช้ใน `requiresReview`, `checkDeclaredAmount`, `compareReceiverAccount` guard, `toSlipReading`

**ผลกระทบ:** ค่า confidence มาจาก model โดยตรง (self-reported) ไม่ได้ calibrate และไม่มีหลักฐานว่าสอดคล้องกับความแม่นยำจริง
- `requiresReview()` **ไม่ได้ตรวจ** `dateConfidence` หรือ `senderConfidence` — สลิปที่วันที่/ชื่อไม่ชัดอาจได้สถานะ `matched`
- มีความเสี่ยงที่ model ตอบ `0.99` กับค่าที่อ่านผิด

**การบรรเทาที่มีอยู่ (ดี):** `verifySlip` ไม่ auto-reject จาก receiver ที่ confidence ต่ำ (`→ suspect`) และ fuzzy name match ไม่ auto-approve

---

### R-06 — API Key ส่งทาง Query String · **High**

**หลักฐาน:** `server/line/slipOcr.ts:265`
```ts
const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
```

**ผลกระทบ:** URL (พร้อม key) อาจถูกบันทึกใน access log, proxy, APM, หรือ error report ถ้ามีการ log URL
**การบรรเทาที่มีอยู่:** โค้ดปัจจุบัน log เฉพาะ `status` ไม่ log URL — แต่ยังเสี่ยงจาก infra ภายนอก

---

### R-07 — `api/index.js` เป็น Build Artifact ที่ถูก commit · **High**

**หลักฐาน:** `git ls-files api` → `api/index.js`; `.gitignore` มี `dist/` แต่ไม่มี `api/`
ไฟล์นี้มีสำเนา Gemini logic ที่ `api/index.js:4815` (`extractWithGemini`) ซึ่งเป็นโค้ดรุ่นเก่า/ต่างจาก source

**ผลกระทบ:**
- แหล่งความจริงซ้ำซ้อน — reviewer อาจอ่านโค้ดผิดเวอร์ชัน
- diff ขนาดใหญ่ทุกครั้งที่ build ทับ ทำให้ review จริงถูกกลบ
- เสี่ยง commit ข้อมูลที่ build ฝังไว้โดยไม่ตั้งใจ

---

### R-08 — ไม่มี Audit Log ของ AI Extraction / Rescan / ReadSlip · **Medium**

**หลักฐาน:** `createAuditLog` ถูกเรียกใน `submitSlip` และ `approveLineSlip` แต่ไม่พบใน `readSlip`, `rescan`, หรือ `processJob`
`processJob` เขียน `aiData` ลง DB โดยไม่มีบันทึกว่าใคร/เมื่อไร/ด้วย model ใด

**ผลกระทบ:** ตรวจสอบย้อนหลังไม่ได้ว่า AI เปลี่ยนผลลัพธ์ของสลิปเมื่อไร และใช้ model ใด — ขัดกับข้อกำหนด observability

---

### R-09 — `uploadSlip` และ `rescan` ไม่มี Rate Limit · **Medium**

**หลักฐาน:** `readSlip` มี `allowSlipRead()` (12/5 นาที) และ `submitSlip` มี `MAX_SLIPS_PER_DAY` แต่ `uploadSlip` (`routers.ts:3232`) และ `rescan` (`routers.ts:3576`) เป็น `financeProcedure` ที่เรียก worker ได้ไม่จำกัด

**ผลกระทบ:** ผู้ใช้ finance ที่บัญชีถูก compromise หรือกดซ้ำ สามารถเผา quota/ค่าใช้จ่าย AI และทำให้ worker คิวแน่น

---

### R-10 — Error Taxonomy พึ่งการ match ข้อความ · **Medium**

**หลักฐาน:** `isTransientError()` ใช้ regex `/LLM invoke failed:\s*(\d{3})\b/i` และ pattern เครือข่ายบน `err.message`

**ผลกระทบ:** ถ้า provider เปลี่ยนรูปข้อความ error การจัดประเภทจะผิด → dead-letter สลิปที่กู้คืนได้ หรือ retry สลิปที่พังถาวร
(มี test ครอบคลุมอยู่แล้วใน `server/line.slipOcr.test.ts` — เป็นจุดแข็ง)

---

### R-11 — Prompt Injection ผ่านภาพสลิป · **Medium (residual: Low)**

**สถานะ:** ภาพเป็น input ที่ผู้ใช้ควบคุม และถูกส่งในช่องเดียวกับ instruction

**การบรรเทาที่มีอยู่และได้ผล:**
- prompt กำหนดชัด "ดึงข้อมูลเท่านั้น ห้ามอนุมัติ"
- **ไม่มี tool calling** และไม่มีโค้ดให้ AI เข้าถึง DB
- ผลลัพธ์ถูกใช้เป็น "ข้อเสนอ" เท่านั้น; `approveLineSlip` ไม่ใช้ `aiData` ตัดสินใจ
- มี date plausibility check และ receiver account comparison ฝั่ง server

**ความเสี่ยงคงเหลือ:** ข้อความในภาพอาจทำให้ model เติมค่าที่อ่านไม่ได้ (hallucinate) — บรรเทาด้วยการบังคับ null ใน prompt และ confidence threshold แต่ยังไม่มีการ validate schema (ดู R-01)

---

### R-12 — ไม่มีการแยก `missing` / `unreadable` / `uncertain` · **Medium**

**หลักฐาน:** `SlipExtraction` ใช้ `null` ร่วมกับ confidence เป็นตัวแทนทั้งสามสถานะ

**ผลกระทบ:** UI และเจ้าหน้าที่แยกไม่ออกระหว่าง "ไม่มีฟิลด์นี้บนสลิป" กับ "มีแต่ AI อ่านไม่ออก" กับ "อ่านได้แต่ไม่มั่นใจ" → การตัดสินใจของมนุษย์ด้อยคุณภาพลง

---

### R-13 — ไม่มี AI Evaluation Harness · **Medium**

**หลักฐาน:** ไม่พบชุดทดสอบภาพสลิปจริงหรือ metric ความแม่นยำ; test ที่มีเป็น unit test ของ logic ล้วน

**ผลกระทบ:** เปลี่ยน model/prompt แล้ววัดผลกระทบไม่ได้

---

### R-14 — เก็บ `aiRawText` และภาพใน DB โดยไม่มีนโยบาย Retention · **Medium**

**หลักฐาน:** `aiRawText` (text) และ `aiData` (jsonb) ไม่มี TTL หรือ purge job
(สลิปจริงอยู่ใน private bucket แต่ fallback path เก็บ base64 ใน DB)

**ผลกระทบ:** ข้อมูลส่วนบุคคลคงอยู่ในฐานข้อมูล indefinite — ต้องมีนโยบาย retention ตาม PDPA

---

### R-15 — `processJob` รวมหลายความรับผิดชอบ · **Low**

**หลักฐาน:** `server/line/processWorker.ts:processJob()` ทำ extract + duplicate + member + verify + persist ในฟังก์ชันเดียว (~150 บรรทัด)

**ผลกระทบ:** ทดสอบแยกส่วนยาก และเพิ่มโอกาส regression เมื่อแก้ส่วนใดส่วนหนึ่ง

---

## 2. สรุปตามระดับ

| ระดับ | จำนวน | ID |
|---|---|---|
| Critical | 3 | R-01, R-02, R-03 |
| High | 4 | R-04, R-05, R-06, R-07 |
| Medium | 7 | R-08, R-09, R-10, R-11, R-12, R-13, R-14 |
| Low | 1 | R-15 |

---

## 3. สิ่งที่ระบบทำได้ดีอยู่แล้ว (ต้องรักษาไว้)

| จุดแข็ง | หลักฐาน |
|---|---|
| AI ไม่มีอำนาจทางการเงิน | `approveLineSlip` เป็นทางเดียวที่เขียน `offerings`; ไม่ใช้ `aiData` ตัดสิน |
| Transaction + row lock + re-check ตอนอนุมัติ | `server/db.ts:4061-4130` |
| Duplicate detection 3 ระดับบน DB จริง | `duplicateDetector.ts`, unique index `line_slips_ref_uniq` |
| Idempotency ของ LINE event | unique index `line_slips_event_uniq` |
| ภาพสลิปอยู่ใน private bucket + signed URL 1 ชม. | `storagePutPrivate`, `getSlipSignedUrl` |
| HMAC + timingSafeEqual + body size limit | `webhook.ts:validateSignature` |
| Fuzzy member match ไม่ auto-approve | `memberMatcher.ts` rule 4 |
| Receiver ที่ confidence ต่ำไม่ auto-reject | `slipVerification.ts` (`→ suspect`) |
| Escalation เมื่อผู้ถวายโดนปฏิเสธอัตโนมัติหลายครั้ง | `MAX_AUTO_REJECTS` + `escalated` |
| ไฟล์ภาพถูก sniff ด้วย magic bytes | `slipImage.ts` |
| Baseline tests เขียว | 1169 passed / 106 skipped |

---

## 4. Financial Integrity Statement

> **ยืนยันจาก Source Code:** ไม่พบเส้นทางใดที่ AI เขียนหรือแก้ไข `offerings`, `finance_accounts`, ยอดคงเหลือ, หรืออนุมัติ/ปฏิเสธการเบิกจ่าย
>
> ความเสี่ยงทางการเงินที่แท้จริงจาก AI ในระบบนี้คือ **ความผิดพลาดในการอ่านค่า** (R-01, R-05) และ **การเปิดเผยข้อมูลเกินจำเป็น** (R-03) ไม่ใช่การที่ AI ลงบัญชีเอง
>
> ทั้งสองความเสี่ยงสามารถบรรเทาได้โดยไม่ต้องเปลี่ยน schema หรือ workflow ทางการเงิน
