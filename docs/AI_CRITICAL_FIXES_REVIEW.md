# GRACEFUL GIVING — AI CRITICAL FIXES REVIEW (R-01 / R-02 / R-03)

| | |
|---|---|
| ขอบเขต | Independent code review ของ Critical fixes C1–C3 (R-01, R-02, R-03) |
| โหมด | **REVIEW ONLY** — ไม่มีการแก้ Source Code, Test, Schema, Migration หรือ Config ในรอบนี้ |
| สถานะหลักฐาน | STATIC REVIEW + LOCAL VERIFICATION (typecheck / test / build ในเครื่องนี้) |
| Production | **ยังไม่ตรวจ Production — ห้ามอ้าง PRODUCTION VERIFIED** |
| Provider จริง | **ไม่ได้ทดสอบ** (ไม่มี `GEMINI_API_KEY` / `DATABASE_URL` จริงในรอบนี้) |
| วันที่รีวิว | 2026-11-23 |

---

## 1. Review Summary

**คำตัดสิน: PASS WITH CONDITIONS**

การแก้ไข R-01, R-02, R-03 ทำในทิศทางที่ถูกต้องและอยู่ในขอบเขตที่อนุมัติ:

- ไม่มี Schema / Migration / Financial Posting / Role Gate ถูกแก้แม้แต่บรรทัดเดียว (ยืนยันด้วย `git diff`)
- AI output ถูก validate ด้วย Zod ทั้งสอง path (Gemini + Forge) และไม่มีการ `as` cast หลงเหลือใน path การอ่านสลิปแล้ว
- Abort signal ไหลจาก Worker → `extractSlipData` → provider fetch จริง และ retry ของ `invokeLLM` หยุดเมื่อถูก abort
- การ projection ตัด `aiRawText`, `slipImageKey`, `slipHash`, `inlineDataUrl` ออกจาก payload ของ Giving Inbox จริง

แต่มี **3 เงื่อนไขที่ต้องปิดก่อนอนุมัติ H1–H5**:

| # | เงื่อนไข | ระดับ | หลักฐาน |
|---|---|---|---|
| K1 | Worker timeout/retry path **ยังไม่มี test เลย** — ไม่มีไฟล์ test ใด import `processWorker` (มีแต่ `vi.mock` ใน `server/giving.submitSlip.test.ts:17`) ดังนั้น `extractWithinJobBudget`, `WorkerOcrTimeoutError`, budget 45s และการเปลี่ยนสถานะ job ยังเป็น untested path | **High** | `server/line/processWorker.ts:64-84`, `:142` |
| K2 | R-03 ยังไม่ครอบทุก endpoint: `giving.updateReview` คืน **ทั้ง row** (`aiRawText` + `aiData` ที่มี `inlineDataUrl` base64 + `slipImageKey` + `slipHash`) กลับไป browser | **Medium-High** | `server/db.ts:4369-4377` → `server/routers.ts:3178` |
| K3 | Worker budget 45s **ไม่ใช่ hard bound**: backoff sleep ใน `invokeLLM` ไม่ผูกกับ abort (สูงสุด 30s) ทำให้ขั้นตอน OCR ยืดได้ถึง ~75s ต่อสลิป และ job ที่ถูก kill ระหว่าง `processing` ไม่มี reaper — ค้างถาวรจนกว่าจะมีคนกด rescan | **Medium** | `server/_core/llm.ts:278-289`, `:326-341`; `server/line/processWorker.ts:318-337` |

K1 คือข้อที่ผู้ใช้ตั้งคำถามไว้ตรง ๆ และคำตอบคือ **ยังไม่มี test ครอบ** — ต้องเพิ่มก่อนถือว่า R-02 ปิด

---

## 2. File-by-File Review

### 2.1 `server/line/slipExtractionSchema.ts` (ใหม่, 150 บรรทัด)

| หัวข้อ | ผล |
|---|---|
| Schema ตัวเดียวใช้ทั้งสอง provider | ✅ `parseSlipExtraction` ถูกเรียกที่ `slipOcr.ts:404` (Gemini) และ `:485` (Forge) |
| Numeric boundary | ✅ `amount`: `finite().positive().max(1_000_000_000)`; confidence: `finite().min(0).max(1)` |
| String length | ✅ สอดคล้องกับคอลัมน์จริง: `extractedSenderName` varchar(180), `extractedRef` varchar(120), `extractedBank` varchar(80) (`drizzle/schema.ts` line_slips), `receiverAccount` 64, `receiverBank` 80, `notes` 1000 |
| Unknown key | ✅ zod strip โดย default — test `drops unknown keys instead of carrying them forward` ยืนยัน |
| Enum | ✅ `receiverAccountType` = `bank_account | promptpay | null` |
| PII ใน error message | ✅ ใส่เฉพาะชื่อ field (`issue.path[0]`) ไม่ใส่ค่า — มี test บังคับ |
| Classification | ✅ `stateOf()` แยก missing (null + conf 0) / unreadable (null + conf > 0) / uncertain (< threshold) / certain |
| `processingStatusFor` | ✅ ใช้ `amount/transferDate/senderName` ตัดสิน "มีอะไรที่ใช้ได้ไหม" แล้วจึงดู state ทั้งหมด |
| `extractionWarnings` | ✅ คืนเฉพาะชื่อ field + suffix ไม่มีค่าและไม่มี PII |

ข้อสังเกต (ไม่บล็อก): `stateOf()` นับ **empty string เป็น "มีค่า"** ถ้า model คืน `senderName: ""` พร้อม confidence สูง จะถูกจัดเป็น `certain` (ดู F6)

### 2.2 `server/line/slipView.ts` (ใหม่, 100 บรรทัด)

| หัวข้อ | ผล |
|---|---|
| ตัด field อันตราย | ✅ `toSlipView` destructure ทิ้ง `aiRawText`, `aiData`, `slipImageKey`, `slipHash` แล้วประกอบกลับเฉพาะที่อนุญาต |
| `aiData` แคบลง | ✅ `pickSafeAiData` เก็บเฉพาะ `receiverAccount/receiverName/receiverBank` + `verification{amount,receiver,autoReject,escalated}` |
| `inlineDataUrl` | ✅ ถูกตัด เพราะไม่อยู่ใน allowlist และ `aiData` ไม่ได้ spread ต่อ |
| ค่าผิดรูป | ✅ `verification` ที่ shape ไม่รู้จักถูก normalize เป็น `null/false` (มี test) |
| ฟิลด์ที่ helper เพิ่ม | ✅ generic `<T extends LineSlip>` + `Omit<T, keyof LineSlip>` ทำให้ `submitterLineId` ไม่หาย |
| ข้อจำกัด | ⚠️ เป็น projection ไม่ใช่ authorization — caller ยังต้อง gate เอง (ทำแล้วที่ `financeProcedure`) |

### 2.3 `server/line/slipOcr.ts` (แก้, +155/-47)

| หัวข้อ | ผล |
|---|---|
| Validation | ✅ `JSON.parse(...) as SlipExtraction` เดิมถูกแทนด้วย `parseSlipExtraction` ทั้งสอง path ไม่มี cast เหลือ |
| Date normalization | ✅ ย้ายเข้า `annotateExtraction` และทำ **ก่อน** classify ทำให้วันที่ถูก downgrade เป็น uncertain อย่างถูกต้อง |
| Metadata ใหม่ | ✅ `fieldStates`, `warnings`, `processingStatus`, `provider`, `model` ถูกเติมจากที่เดียว |
| Timeout | ✅ `OCR_PROVIDER_TIMEOUT_MS = 25_000` (`:195`); `providerAbortSignal` (`:210`) รวม external + timeout ด้วย `AbortSignal.any` |
| Signal propagation | ✅ image download (`:339`), Gemini POST (`:364`), Forge `invokeLLM` (`:474-477`) |
| Timeout → typed error | ⚠️ abort ถูกแปลงเป็น `OcrTimeoutError` (`:409-412`) โดยข้อความระบุ 25s เสมอ แม้สาเหตุจริงจะเป็น budget ของ worker (45s) หรือของ `readSlip` (20s) — ดู F4 |
| Transient vs permanent | ✅ abort/timeout = transient (retry), `InvalidOcrOutputError` = permanent (ไม่ retry) — มี test |
| Fallback เดิม | ✅ ลำดับ Gemini → Forge, model list, prompt, `OUTPUT_SCHEMA` ไม่เปลี่ยน |
| Permanent failure | ⚠️ placeholder ที่คืนเมื่ออ่านไม่ได้ (`~:497-513`) ไม่มี `fieldStates/warnings/processingStatus/provider` และฝัง error message ลง `notes` — ดู F5 |

### 2.4 `server/line/processWorker.ts` (แก้, +43)

| หัวข้อ | ผล |
|---|---|
| Job budget | ✅ `WORKER_OCR_JOB_TIMEOUT_MS = 45_000` (`:50`) ครอบทุก attempt ของสลิปหนึ่ง |
| Abort ถึง provider | ✅ `extractWithinJobBudget` (`:64-83`) สร้าง `AbortController` แล้วส่ง `signal` ลงไปถึง fetch จริง |
| แยกชนิด error | ✅ `WorkerOcrTimeoutError` (`:53`) แยกจาก provider timeout — แต่ทิ้ง `cause` เดิม (`:76`) ดู F4 |
| Atomic claim | ✅ ไม่เปลี่ยน — `UPDATE ... WHERE id = ? AND status = 'queued'` + `returning` (`:337-352`) |
| Retry/backoff | ✅ ไม่เปลี่ยน — `MAX_ATTEMPTS = 3`, exponential 1min → 5min, gate ที่ `lastAttemptAt` |
| Timeout → side effect | ✅ timeout เกิดก่อน DB write ทุกจุด จึงไม่มี offering/ledger ถูกสร้าง และไม่มี duplicate processing (job ยังถูกถือโดย worker เดียว) |
| ช่องว่าง | ❌ **ไม่มี test ใดครอบ helper นี้** (K1); job ที่ค้าง `processing` (function ถูก kill) ไม่ถูกดึงกลับ (K3) |

### 2.5 `server/_core/llm.ts` (แก้, +15)

| หัวข้อ | ผล |
|---|---|
| `signal` ใน `InvokeParams` | ✅ optional, ไม่กระทบ caller เดิม |
| Abort-aware retry | ✅ `isAbortError` (`:309`) เช็ค `name` บน object (fetch abort เป็น `DOMException` ไม่ใช่ `instanceof Error`) และ `throw` ทันทีที่ `:343` |
| Propagation | ✅ ส่งต่อเข้า `fetch` ที่ `:428` |
| ช่องว่าง | ⚠️ `sleep()` (`:288-289`) ไม่ผูกกับ signal และ path non-2xx (`:326-341`) หน่วงได้ถึง `RETRY_MAX_DELAY_MS = 30_000` → budget ไม่ hard (K3) |

### 2.6 `server/db.ts` (แก้, +11/-?)

| หัวข้อ | ผล |
|---|---|
| `listLineSlips` | ✅ คืน `toSlipView(slip, signedUrl)` (`:3975`) — signed URL ยังสร้างจาก row ดิบก่อน projection |
| `getLineSlipById` | ✅ คืน `toSlipView(withId, signedImageUrl)` (`:4010`) |
| ผู้เรียกภายใน | ✅ ไม่มีผู้เรียกอื่นนอกจาก router (`routers.ts:3056`) จึงไม่กระทบ logic ภายใน |
| ช่องว่าง | ❌ `updateLineSlipReview` ยัง `.returning()` ทั้ง row (`:4369-4377`) → หลุดไป client ทาง `giving.updateReview` (K2) |
| ข้อมูลส่วนเกิน | ℹ️ `donorSlipColumns` (`:4509-4523`) เลือก `aiData` ทั้งก้อนสำหรับ query ของผู้ถวาย — ไม่ได้ส่งออก client (`toDonorSlipStatus` คืนเฉพาะ state/message/slipAmount) แต่ต้องดึง base64 ออกจาก DB ทุกครั้ง (F9) |

### 2.7 `server/routers.ts` (แก้, +4)

| หัวข้อ | ผล |
|---|---|
| `readSlip` timeout | ✅ ส่ง `{ timeoutMs: SLIP_READ_TIMEOUT_MS }` (`:3545`) ทำให้ fetch ถูก cancel แทนที่จะวิ่งต่อหลังผู้ถวายเลิกรอ |
| `Promise.race` เดิม | ✅ ยังอยู่เป็นชั้นป้องกันที่สอง ไม่ได้ลบ |
| Gate | ✅ `list`/`getById` = `financeProcedure`, `readSlip` = `protectedProcedure` + `allowSlipRead` rate limit — ไม่เปลี่ยน |
| ช่องว่าง | ❌ `updateReview` คืนผลจาก `updateLineSlipReview` ตรง ๆ (`:3178`) → ตาม K2 |

---

## 3. Confirmed Findings

### A. R-01 — Zod Validation

- **A1 ✅** ทั้ง Gemini และ Forge ผ่าน `parseSlipExtraction` ตัวเดียวกัน ไม่มี path ที่ parse เองแล้ว cast
- **A2 ✅** ขอบเขตตัวเลขและความยาวสอดคล้องกับคอลัมน์ DB จริง (ตรวจเทียบ `drizzle/schema.ts` แล้ว)
- **A3 ✅** missing / unreadable / uncertain / certain แยกได้จริงและมี test 4 เคส
- **A4 ✅** unknown key ถูก strip (zod default) และมี test
- **A5 ✅** output ที่ไม่ผ่าน schema ไม่สามารถไปถึง `verifySlip` หรือ DB write ได้: `extractSlipData` จะ throw หรือคืน placeholder ที่ทุก field เป็น null/confidence 0 → `requiresReview` = true → `needs_review`
- **A6 ✅** กฎ verification เดิมไม่เปลี่ยน: `verifySlip` (`server/line/slipVerification.ts`) ไม่อยู่ใน diff; `requiresReview` ยังใช้ `amountConfidence`/`referenceConfidence`/`amount === null` และ `CONFIDENCE_THRESHOLD` ยังเป็น 0.85 (ย้ายที่นิยาม + re-export ไม่เปลี่ยนค่า)

### B. R-02 — Timeout & Worker Reliability

- **B1 ✅** AbortSignal ไหลครบ: `processWorker.extractWithinJobBudget` → `extractSlipData(opts.signal)` → `providerAbortSignal` → `fetch` / `invokeLLM` → `fetchWithBackoff.signal`
- **B2 ✅** ชั้นเวลา: provider call 25s, worker job 45s, `readSlip` 20s — 45s > 25s ทำให้มีโอกาส fallback ภายใน budget เดียว
- **B3 ⚠️** Retry/backoff: worker retry ไม่เปลี่ยน (3 ครั้ง, 1min → 5min, gate ด้วย `lastAttemptAt`); `invokeLLM` retry 4 ครั้ง แต่ **sleep ไม่ผูก abort** → budget ไม่ hard (K3)
- **B4 ✅** Permanent (schema error, 4xx ที่ไม่ใช่ 408/429) ไม่ถูก retry; transient (429/5xx/network/abort) ถูก retry
- **B5 ✅** Race ระหว่าง worker หลายตัว: claim เป็น single-statement `UPDATE ... WHERE status='queued'` + `returning` และตรวจ `claimed.length` — ไม่มีทางสองตัวถือ job เดียวกัน
- **B6 ⚠️** Job state transition: `queued → processing → done|queued|failed` ถูกต้องเมื่อ process จบ แต่ **ไม่มี lease/reaper** สำหรับ `processing` ที่ค้างจากการถูก kill (K3) — กู้ได้ด้วยมือผ่าน `rescanLineSlip` (`db.ts:4824-4870` สร้าง job ใหม่ attempts 0)
- **B7 ✅** Timeout ไม่สร้าง duplicate processing หรือ financial side effect: ทุก write อยู่หลัง extraction; slip ยัง `pending`, ไม่มี offering ถูกสร้างใน path นี้
- **B8 ⚠️** `AbortSignal.any()` ต้องใช้ Node ≥ 20.3 — repo **ไม่มี `engines` และไม่มี `.nvmrc`** (ตรวจแล้ว) จึงไม่มีอะไร pin runtime ของ Vercel (F7)

### C. R-03 — Client Data Projection

- **C1 ⚠️** Consumer ของ `getLineSlipById`: มีที่เดียวคือ `routers.ts:3056` (`giving.getById`, `financeProcedure`) ✅; consumer ของ `listLineSlips`: `routers.ts:3031` (`giving.list`) ✅ — แต่ยังมี endpoint ที่สามที่ส่ง row ดิบ (`updateReview`, K2)
- **C2 ⚠️** Endpoint ที่ส่ง slip ไป client: `list`, `getById` (projated), `stats` (ตัวเลข), `approve`/`reject` (object แคบ), `submitSlip`/`readSlip`/`mySlips` (ผ่าน `toDonorSlipStatus`/`toSlipReading`), **`updateReview` (row ดิบ — หลุด)**
- **C3 ✅** `aiData.verification` และ `receiver*` ครบตามที่ UI ใช้ (`GivingInbox.tsx:1232-1233`, `ReceiverCheck` `:1977`, `EscalationNote` `:2001`)
- **C4 ✅** `submitterLineId` ยังอยู่ (`GivingInbox.tsx:1248-1251`) เพราะ generic ของ `toSlipView`
- **C5 ✅** `aiRawText`, `inlineDataUrl`, `slipImageKey`, `slipHash` ไม่หลุดผ่าน `list`/`getById` (มี test ยืนยันด้วยการ stringify payload ทั้งก้อน) — **แต่ยังหลุดผ่าน `updateReview`**
- **C6 ⚠️** Authorization: `list`/`getById`/`updateReview` = `financeProcedure` (TREASURER/SUPER_ADMIN, และ `role === "admin"` ผ่านทุก gate ตามดีไซน์เดิม) ✅; ระดับความรุนแรงของ K2 จึงจำกัดอยู่ที่ผู้ใช้ที่ได้รับอนุญาตแล้ว แต่ยังเกินความจำเป็นและขัดเจตนาของ R-03

### D. Financial Safety

ตรวจ `git diff` แบบเต็ม (5 ไฟล์, +181/−47):

- ✅ `approveLineSlip()` — ไม่ถูกแตะ
- ✅ Offering posting / ledger creation — ไม่ถูกแตะ
- ✅ Withdrawal approval / reconciliation — ไม่ถูกแตะ (ไฟล์ไม่ปรากฏใน diff)
- ✅ Role authorization (`financeProcedure`, `churchLeaderProcedure`, gate ต่าง ๆ) — ไม่ถูกแตะ
- ✅ Transaction / `FOR UPDATE` row lock semantics — ไม่ถูกแตะ (`rejectLineSlip`, `approveLineSlip` ไม่เปลี่ยน)
- ✅ Audit trail — ไม่ถูกแตะ
- ✅ ไม่มี schema/migration ใหม่ (`drizzle/**` ไม่ปรากฏใน `git status`)

---

## 4. Potential Regressions

| # | ความเสี่ยง | ระดับ | รายละเอียด |
|---|---|---|---|
| P1 | `giving.updateReview` payload ใหญ่ขึ้น/เดิมแต่ยังไม่ปลอดภัย | Medium-High | คืน row ดิบรวม base64 (`inlineDataUrl`) ทุกครั้งที่เหรัญญิกแก้ field — payload อาจใหญ่ระดับ MB และเป็นข้อมูลที่ R-03 ตั้งใจตัด |
| P2 | Schema เข้มขึ้นทำให้สลิปที่เคย "อ่านได้" กลายเป็น unreadable | Low | ถ้า provider ตกหล่น field ใด field หนึ่ง (รวม `notes`) ทั้งผลจะถูก reject แล้วตกไป fallback/placeholder — เป็นพฤติกรรมที่ต้องการ แต่เพิ่มอัตรา `needs_review`; ยังไม่มีข้อมูลจริงมายืนยันผลกระทบ (ไม่ได้ทดสอบ provider จริง) |
| P3 | `receiverAccountConfidence` เป็น `.optional().default(0)` ขณะที่ field อื่น required | Low | ไม่สมมาตร แต่ไม่ทำให้เกิดข้อมูลผิด (ค่าที่หายไป = 0 → classify เป็น missing/unreadable) |
| P4 | `notes` ที่เก็บ error message ของ permanent failure | Low | ข้อความ error ถูกเก็บลง `aiData.notes` (ถูกตัดจากการ projection แล้ว จึงไม่ถึง client) แต่ปนข้อมูลระบบลงใน blob หลักฐาน |
| P5 | Type change ของ `getLineSlipById`/`listLineSlips` | Low | `pnpm check` ผ่านทั้ง client และ server — client ไม่ได้อ้าง field ที่ถูกตัด |
| P6 | `AbortSignal.any` บน runtime เก่า | Low | ถ้า Vercel เลือก Node < 20.3 จะ throw ตอนอ่านสลิปทุกครั้ง; ปัจจุบัน repo ไม่ pin runtime |
| P7 | `api/index.js` (tracked build artifact) | Info | ไม่ถูกแก้ใน diff นี้ (build regenerate แล้ว restore กลับ `HEAD` ในการรีวิว) — Vercel build จาก source อยู่แล้ว |

---

## 5. Financial Safety Review

สรุปเชิง call graph: เส้นทางที่เปลี่ยนมีเพียง `extractSlipData` (อ่านภาพ → validate → คืน object) และจุดที่ส่ง object นั้นเข้า `processJob` ภายใต้ budget เวลา

```
webhook/upload/rescan
   └─ runWorkerBatch (ไม่เปลี่ยน)
        ├─ claim job (ไม่เปลี่ยน, atomic)
        └─ processJob
             ├─ extractWithinJobBudget  ← ใหม่ (เวลาอย่างเดียว)
             │     └─ extractSlipData   ← validate + timeout
             ├─ duplicate / matchMember / verifySlip (ไม่เปลี่ยน, รับ shape เดิม)
             ├─ UPDATE line_slips (ไม่เปลี่ยน)
             └─ approveLineSlip → offering posting (ไม่ถูกเรียกจาก path นี้เลย)
```

- ไม่มีจุดใดที่ AI timeout/validation failure ทำให้เกิด offering, ledger entry, หรือการเปลี่ยนยอดเงิน
- slip ที่อ่านไม่ได้ → `needs_review`/`failed` ตามเดิม ไม่ auto-approve
- `verifySlip` ยังเป็นผู้ตัดสิน auto-reject และใช้ extraction ชุดเดียวกับก่อนแก้ (field names/ค่า confidence เดิม)

---

## 6. Test Evidence

รันจริงในรีวิวนี้ (workspace นี้, Node v26.13.1, pnpm 10.4.1):

| คำสั่ง | ผล | Exit |
|---|---|---|
| `pnpm check` (`tsc --noEmit`) | ผ่าน ไม่มี error | **0** |
| `DATABASE_URL= POSTGRES_URL= POSTGRES_PRISMA_URL= pnpm test` | `Test Files 121 passed | 5 skipped (126)`, `Tests 1206 passed | 106 skipped (1312)` | **0** |
| `pnpm build` | `dist/index.js 376.0kb`, `api/index.js 372.7kb`, vite built in 26.01s | **0** |
| `git status --short` หลัง build (restore `api/index.js`) | มีเฉพาะ 5 ไฟล์ที่แก้ + 8 ไฟล์ใหม่ตามขอบเขต | – |

เทียบ baseline ก่อนแก้: 118 passed / 5 skipped (123 ไฟล์), 1169 passed / 106 skipped → เพิ่ม **3 ไฟล์ / 37 tests** ทั้งหมดเป็น unit test ใหม่:

| ไฟล์ใหม่ | จำนวน describe/it | ครอบอะไร |
|---|---|---|
| `server/line/slipExtractionSchema.test.ts` | 20 | schema, unknown key, PII ใน error, classification, status, warnings |
| `server/line/slipView.test.ts` | 9 | projection, allowlist ของ `aiData`, `submitterLineId` preservation, shape เพี้ยน |
| `server/line/slipTimeout.test.ts` | 8 | `providerAbortSignal` (timeout/caller abort/reason), transient vs permanent |

**Tests ที่ Skip (DB-gated, ไม่ได้รันในรีวิวนี้):** 5 ไฟล์ / 106 tests — `budgets.integration`, `counting.workflow`, `reports.integration`, `withdrawals.workflow` และชุดที่ต้องมี `DATABASE_URL` จริง (ไม่มีใน environment นี้)

**ช่องว่างของหลักฐาน (สำคัญ):** ไม่มี test ใดแตะ `processWorker` — worker timeout path, `WorkerOcrTimeoutError`, budget 45s, การเปลี่ยน `queued/processing/done/failed` และ backoff gate ของ job ล้วนไม่มี test (K1) หลักฐาน R-02 จึงหยุดอยู่ที่ระดับ primitive (`providerAbortSignal`, `isTransientError`) ไม่ใช่ระดับ worker

---

## 7. Remaining Risks

เรียงตามความสำคัญ (F = finding ใหม่จากรีวิวนี้, R = ความเสี่ยงเดิมจาก Phase 0)

| ID | ความเสี่ยง | ระดับ | จุดที่ต้องแก้ (ยังไม่แก้ในรอบนี้) |
|---|---|---|---|
| **K1 / F2** | Worker timeout & retry ไม่มี test | **High** | เพิ่ม `server/line/processWorker.test.ts` (ดูโครงใน §8) |
| **K2 / F1** | `updateReview` คืน row ดิบ (รวม base64) | **Medium-High** | `db.ts:4369-4377` / `routers.ts:3178` — ใช้ `toSlipView` หรือคืนเฉพาะ `{success, slipId}` |
| **K3 / F3** | Budget ไม่ hard + job ค้าง `processing` ไม่มี reaper | Medium | `llm.ts:288-289` (abortable sleep) และเพิ่ม lease/reclaim ใน `runWorkerBatch` |
| F4 | ข้อความ timeout ชี้ผิดสาเหตุ; `WorkerOcrTimeoutError` ทิ้ง cause | Low | `slipOcr.ts:409-412`, `processWorker.ts:76` (`{ cause }`) |
| F5 | Placeholder ของ permanent failure ไม่มี metadata + เก็บ error ลง `notes` | Low | `slipOcr.ts:497-513` |
| F6 | empty string ถูกนับเป็น "มีค่า" | Low | `slipExtractionSchema.ts:stateOf` — trim แล้วถือเป็น missing |
| F7 | Runtime ไม่ถูก pin (`AbortSignal.any` ต้อง Node ≥ 20.3) | Low | เพิ่ม `engines.node` หรือ `.nvmrc` |
| F8 | โค้ดซ้ำ/ส่วนเกิน | Low | `isAbortError` ซ้ำ 2 ที่ (`llm.ts:309`, `slipOcr.ts:199`); `SlipExtraction` เขียนมือคู่กับ schema type; `void aiRawText` 3 บรรทัดใน `slipView.ts:96-98` ไม่จำเป็น (tsconfig ไม่ได้เปิด `noUnusedLocals`); สร้าง timeout signal สองครั้งต่อหนึ่ง attempt ของ Gemini (`:339`, `:364`) |
| F9 | query ของผู้ถวายดึง `aiData` ทั้งก้อน | Info | `db.ts:4509-4523` |
| R-04 | Provider ยัง hardcode, AI SDK ยังไม่ถูกใช้ | คงอยู่ | เฟส H (Adapter) |
| R-05 | confidence เป็นค่าที่ model รายงานเอง | คงอยู่ | ต้องยืนยันกับข้อมูลจริง |
| R-06 | Gemini API key ส่งทาง query string | คงอยู่ | ควรย้ายเป็น header ในเฟส Adapter |
| R-07 | `api/index.js` เป็น tracked build artifact | คงอยู่ | พิจารณาเลิก track |
| R-08 | ไม่มี AI audit log (prompt/model/latency/outcome) | คงอยู่ | เฟส H |
| R-09 | `uploadSlip` / `rescan` ยังไม่มี rate limit | คงอยู่ | นอกขอบเขต C1–C3 |
| R-14 | เก็บ base64 ภาพสลิปใน DB (`aiData.inlineDataUrl`) | คงอยู่ | ควรย้ายไป storage |

---

## 8. Recommendation

**PASS WITH CONDITIONS** — อนุมัติ R-01/R-03 ตามสภาพ และให้ R-02 ถือว่า "ปิดบางส่วน" จนกว่าจะมี test ระดับ worker

**conditions ที่ต้องทำก่อนเริ่ม H1–H5:**

1. **(K1)** เพิ่ม `server/line/processWorker.test.ts` ที่ mock `../db`, `./slipOcr`, `../storage` และบังคับให้ `extractSlipData` ค้าง แล้ว assert ว่า:
   - `extractWithinJobBudget` โยน `WorkerOcrTimeoutError` (ใช้ fake timers + budget ที่ฉีดได้ เนื่องจากค่าปัจจุบันเป็น const 45s — ต้อง export เพื่อทดสอบ หรือใช้ `vi.useFakeTimers()` เลื่อนเวลา)
   - signal ที่ส่งเข้า `extractSlipData` ถูก abort จริง (`signal.aborted === true`)
   - error ที่ไม่ใช่ timeout ถูกส่งต่อตามเดิม (ไม่ถูกแปลงเป็น `WorkerOcrTimeoutError`)
   - `runWorkerBatch` claim job แบบ atomic (claim ไม่สำเร็จ → ไม่เรียก `processJob`) และจัดสถานะ `queued`/`failed` ตามจำนวน attempts
2. **(K2)** ปิด leak ของ `giving.updateReview` ด้วยการ projated ผลลัพธ์ (ไม่ต้องแตะ financial logic)
3. **(K3)** ตัดสินใจว่าจะทำ abortable backoff + job lease ในรอบนี้หรือบันทึกเป็นงานในเฟสถัดไป (ถ้ายังไม่ทำ ต้องยอมรับว่า budget 45s เป็น soft bound และ job ที่ถูก kill ต้องกู้ด้วยมือ)

**ข้อเสนอ simplification (ยังไม่แก้ตามข้อกำหนด Review Only):** F8 ทั้งชุดเป็นของที่ลบ/รวมได้โดยไม่เปลี่ยนพฤติกรรม — รวม `isAbortError` เป็นตัวเดียว, ให้ `SlipExtraction` derive จาก `ValidatedSlipExtraction` (กัน schema drift), ลบ `void ...` 3 บรรทัด, และใช้ signal เดียวต่อหนึ่ง Gemini attempt

**ยังไม่เริ่ม H1–H5** และ **ไม่มีการอ้าง Production Verified** — การรีวิวนี้ยืนยันเฉพาะพฤติกรรมระดับ unit/typecheck/build ในเครื่อง ไม่ได้ยืนยันกับ provider จริงหรือฐานข้อมูลจริง
