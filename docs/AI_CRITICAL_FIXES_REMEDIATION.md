# GRACEFUL GIVING — K1 / K2 / K3 REMEDIATION

| | |
|---|---|
| ขอบเขต | ปิด 3 เงื่อนไขจาก `docs/AI_CRITICAL_FIXES_REVIEW.md` (K1, K2, K3) |
| สถานะ | **IMPLEMENTED + TESTED (local)** — ยังไม่ตรวจ Production, ยังไม่ทดสอบ provider จริง |
| Schema | **ไม่เปลี่ยน** — ไม่มี migration ใหม่, reaper ใช้คอลัมน์เดิม (`status`, `attempts`, `lastAttemptAt`) |
| Financial logic | **ไม่แตะ** — `approveLineSlip()`, offering posting, withdrawal, reconciliation, role gates, row locks, audit trail ไม่ปรากฏใน diff |
| Provider | **ไม่เปลี่ยน** — Gemini หลัก + Forge fallback, prompt และ model list เดิม |
| Adapter | **ไม่เริ่ม H1–H5** ตามข้อกำหนด |

---

## 1. Root Cause

| # | อาการที่พบในรีวิว | สาเหตุจริง |
|---|---|---|
| K1 | Worker timeout/retry path ไม่มี test | `extractWithinJobBudget` เป็นฟังก์ชันภายในที่รับ budget แบบ hardcode 45s และไม่ถูก export ทำให้เขียน test ไม่ได้เลยตั้งแต่ต้น — ไม่ใช่แค่ "เขียน test ไม่ทัน" |
| K2 | `giving.updateReview` ส่ง row ดิบไป browser | endpoint คืนค่าจาก `updateLineSlipReview()` ตรง ๆ ซึ่งจบด้วย `.returning()` (ทั้ง row) การ projection ของ R-03 ถูกใส่ที่ชั้นอ่าน (`listLineSlips` / `getLineSlipById`) เท่านั้น ไม่ได้ครอบชั้นเขียน |
| K3 | Budget 45s เป็น soft bound + job ค้าง `processing` | `sleep()` ใน `invokeLLM` เป็น `setTimeout` เปล่า ๆ ไม่ผูกกับ `AbortSignal` ทำให้ backoff (สูงสุด 30s) วิ่งต่อหลัง budget หมด และ job ที่ถูก kill ระหว่างประมวลผลไม่มีใครย้ายออกจาก `processing` (ไม่มี lease/reaper) |

---

## 2. Files Changed

| ไฟล์ | ชนิด | สาระ |
|---|---|---|
| `server/line/processWorker.ts` | แก้ | export budget + `extractWithinJobBudget(url, timeoutMs)`; `WorkerOcrTimeoutError` พก `cause`; เพิ่ม `STALE_JOB_LEASE_MS`, `staleJobCutoff()`, `reclaimStaleJobs()`; เรียก reaper ก่อนหยิบงานใน `runWorkerBatch` |
| `server/_core/llm.ts` | แก้ | `sleep(ms, signal)` ยกเลิกได้; `abortError()` คง reason เดิม; ตรวจ `signal.aborted` ก่อนทุก attempt เพื่อไม่ retry หลังยกเลิก |
| `server/line/slipView.ts` | แก้ | แยก `stripInternalColumns()` ใช้ร่วม; เพิ่ม `toSlipReviewView()` และ type `SlipContract` (ไม่แตะ `toSlipView` semantics) |
| `server/routers.ts` | แก้ | `giving.updateReview` คืน `toSlipReviewView(updated)` แทน row ดิบ (ยังอยู่ใน `try/catch` เดิม) |
| `server/line/processWorker.test.ts` | **ใหม่** | 19 tests — worker unit + integration (fake DB) + reaper |
| `server/_core/llm.test.ts` | **ใหม่** | 3 tests — ยกเลิกระหว่าง backoff / ไม่เริ่ม request หลังยกเลิก / retry ปกติยังทำงาน |
| `server/giving.updateReview.test.ts` | **ใหม่** | 4 tests — DTO, ไม่มีข้อมูลลับหลุด, authorization |
| `server/line/slipView.test.ts` | แก้ | +4 tests สำหรับ `toSlipReviewView` |

ไม่มีการแก้ `server/db.ts` เพิ่มในรอบนี้ (diff ของ `db.ts` ยังเป็นของ C1–C3 เดิม: import + 2 จุด projection)

---

## 3. Fix Details

### K2 — `giving.updateReview` คืน DTO ที่ปลอดภัย

- `stripInternalColumns()` ตัด `aiRawText`, `slipImageKey`, `slipHash` และแทน `aiData` ด้วย `pickSafeAiData()` (allowlist: `receiverAccount`, `receiverName`, `receiverBank`, `verification{amount,receiver,autoReject,escalated}`)
- `toSlipReviewView()` ใช้ตัวเดียวกันแต่ **ไม่เติม `signedImageUrl`** เพราะการแก้ไขไม่ใช่การอ่านภาพใหม่ — endpoint นี้ไม่เคยคืน signed URL มาก่อน จึงไม่เปลี่ยนสัญญาเดิม
- ฟิลด์อื่นของ row ยังอยู่ครบ (id, status, extracted*, declared*, review*, matched*, approved*, timestamps) → UI contract เดิมไม่เปลี่ยน
- **Consumer check:** ค้นทั้ง `client/` แล้วไม่พบผู้เรียก `giving.updateReview` เลย (0 matches) จึงไม่มีความเสี่ยงจากการตัด field; ยังคงคืน row ที่ projection แล้วเพื่อไม่ให้สัญญาแคบลงโดยไม่จำเป็น
- Authorization: ยังเป็น `financeProcedure` (TREASURER/SUPER_ADMIN) — มี test ยืนยัน MEMBER → `FORBIDDEN`, ไม่ล็อกอิน → `UNAUTHORIZED`

### K1 — Worker test coverage + testability

- `WORKER_OCR_JOB_TIMEOUT_MS` และ `extractWithinJobBudget(signedUrl, timeoutMs = 45_000)` ถูก export เพื่อให้ทดสอบbudgetจริงได้โดยไม่ต้องรอ 45 วินาที (ค่า default ใน production ไม่เปลี่ยน)
- `WorkerOcrTimeoutError` เก็บ `cause` ของ error เดิมไว้ (เดิมทิ้งไป)
- แยกชั้น test ชัดเจนในไฟล์เดียว:
  - `describe("unit — extractWithinJobBudget")` — ไม่แตะ DB เลย
  - `describe("integration (fake DB) — runWorkerBatch")` — drizzle call จริง แต่ storage เป็น in-memory store ที่จำลอง gate ของ SQL (claim เฉพาะ `queued`, attempts เหลือ, backoff ผ่าน)
  - `describe("unit — reclaimStaleJobs")` — DB double เฉพาะกิจ
- ไม่ได้ mock จนทดสอบไม่ได้: `runWorkerBatch`, `processJob`, claim, retry, state transition เป็นโค้ดจริงทั้งหมด มีแค่ provider (`extractSlipData`), storage, duplicate detector และ member matcher ที่ถูกแทน

### K3 — Timeout + Recovery

**(a) Backoff ผูกกับ AbortSignal**

```ts
const sleep = (ms, signal) => new Promise((resolve, reject) => {
  if (signal?.aborted) return reject(abortError(signal));
  …
  signal?.addEventListener("abort", onAbort, { once: true });
});
```

และ `fetchWithBackoff` ตรวจ `signal.aborted` ที่หัว loop ก่อนทุก attempt → ไม่มีการยิง request ใหม่หลังผู้เรียกยกเลิกแล้ว

**(b) Budget ครอบ attempts + backoff**

signal เดียววิ่งตลอดสาย: `extractWithinJobBudget` → `extractSlipData(opts.signal)` → `providerAbortSignal(external, 25s)` = `AbortSignal.any([jobSignal, timeout])` → `fetch` / `invokeLLM` → `sleep(delay, signal)` ดังนั้นเมื่อ budget 45s หมด: fetch ที่ค้างถูก abort ทันที, backoff ที่กำลังนอนอยู่ก็ reject ทันที, และไม่มี attempt ถัดไป

**(c) ไม่ retry หลังยกเลิก**

- `fetchWithBackoff`: `if (signal?.aborted) throw abortError(signal)` ที่หัวทุก attempt
- `isAbortError` → throw ออกทันที (ไม่นับเป็น network error ที่ต้อง retry)
- worker: error ที่ไม่ใช่ budget timeout ถูกส่งต่อตามชนิดเดิม (ไม่ถูกแปลงเป็น `WorkerOcrTimeoutError`)

**(d) Recovery ของ job ที่ค้าง `processing`**

- `STALE_JOB_LEASE_MS = 10 นาที` — ยาวกว่าเวลาสูงสุดของงานจริงมาก (budget OCR 45s + provider timeout 25s + backoff สูงสุด 30s ≈ 100s) จึงไม่มีงานที่ยังมีชีวิตอยู่ถูกตีว่า stale
- `reclaimStaleJobs()` ก่อนหยิบงานใน `runWorkerBatch`:
  1. `UPDATE ... SET status='queued' ... WHERE status='processing' AND lastAttemptAt < now() - lease AND attempts <= MAX_ATTEMPTS-1` ( atomic, guarded )
  2. job ที่ attempts หมดแล้ว → `UPDATE ... SET status='failed'` แบบ guarded + mark slip `failed` เหมือน error path เดิม
- **ไม่ requeue งานที่ยังมี worker ถืออยู่:** predicate บังคับ `status='processing'` + lease ที่ยาวเกินอายุงานจริง; และไม่มีทางมี worker สองตัวถือ job เดียวกันเพราะ requeue ต้องผ่าน claim แบบ atomic เดิม
- **ไม่เกิด duplicate processing / financial side effect:** `processJob` ยังอ่าน slip และ return ทันทีถ้า `status !== "pending"`; งานที่ requeue ถูก claim ทีละตัว; และ path นี้ไม่เคยสร้าง offering/ledger entry
- **ไม่เปลี่ยน schema** — ใช้ `status`, `attempts`, `lastAttemptAt` ที่มีอยู่แล้ว

---

## 4. New Test Coverage

| ไฟล์ | จำนวน | รายการ |
|---|---|---|
| `server/line/processWorker.test.ts` | 19 | ส่ง signal ให้ provider · budget timeout → `WorkerOcrTimeoutError` + signal aborted · เก็บ `cause` · provider failure ไม่ถูก relabel · provider cancel ไม่ถูก relabel · lease > 5×budget · ประมวลผลสำเร็จ → job done · reading ว่างถาวร → job done + needs_review · transient → กลับ queue + ไม่แตะ slip · budget timeout → กลับ queue (ไม่ fail) · ครบ 3 attempts → job failed + slip failed · job ที่ถูก claim แล้วไม่ถูกหยิบซ้ำ · worker สองตัวพร้อมกัน → ประมวลผลครั้งเดียว · เคารพ backoff · หยิบซ้ำได้หลัง backoff ผ่าน · DB ไม่พร้อม → `{0,0}` · เขียนสถานะพังก็ไม่ throw · reaper: requeue 2 + fail 1 · reaper: claim แพ้ → ไม่แตะ slip |
| `server/_core/llm.test.ts` | 3 | ยกเลิกก่อนเริ่ม → ไม่ยิง request · ยกเลิกระหว่าง backoff → ปฏิเสธทันที (1 attempt เท่านั้น) · ยัง retry ปกติเมื่อไม่ได้ยกเลิก (503,503,200 → 3 calls) |
| `server/giving.updateReview.test.ts` | 4 | DTO ครบตาม UI · ไม่มี `aiRawText`/`slipImageKey`/`slipHash`/base64/raw text · MEMBER → FORBIDDEN · ไม่ล็อกอิน → UNAUTHORIZED |
| `server/line/slipView.test.ts` | +4 | `toSlipReviewView` ตัด field อันตราย · คงฟิลด์ที่ UI ใช้ · narrow `aiData` · ไม่เติม signed URL |

รวม **+30 tests** ใน 3 ไฟล์ใหม่ + 1 ไฟล์เดิม

---

## 5. Timeout and Recovery Behavior

```
cron / webhook / upload / rescan / drainWorker
  └─ runWorkerBatch
       ├─ reclaimStaleJobs()            ← ใหม่: lease 10 นาที, guarded update
       ├─ SELECT queued (attempts ≤ 2, backoff ผ่าน)
       └─ per job:
            ├─ claim (queued → processing, attempts+1)   [atomic]
            └─ processJob
                 └─ extractWithinJobBudget(45s)         ← AbortController
                      └─ extractSlipData(signal)
                           ├─ Gemini: fetch(img) / fetch(generateContent)  ← any(job, 25s)
                           └─ Forge: invokeLLM(signal)  ← any(job, 25s)
                                        └─ sleep(backoff, signal)  ← ยกเลิกได้
```

| กรณี | พฤติกรรม |
|---|---|
| provider ช้า (ไม่ตอบ) | fetch ถูก abort ที่ 25s → `OcrTimeoutError` (transient) → job กลับ queue |
| Gemini ใช้เวลาเกิน budget รวม | job signal ยิงที่ 45s → fetch/backoff ที่ค้างถูก abort → `WorkerOcrTimeoutError` → job กลับ queue, slip ไม่ถูกเขียน |
| Donor รออยู่ (readSlip) | provider ถูก abort ที่ 20s → คืน `UNREADABLE_SLIP` |
| worker ตายระหว่าง `processing` | หลัง 10 นาที reaper กลับ job เข้า queue (หรือ fail + mark slip ถ้า attempts หมด) |
| งานยังมีชีวิต | ไม่ถูกแตะ — lease ยาวกว่าอายุงานจริงหลายเท่า |

---

## 6. API Response Verification

`giving.updateReview` — response ก่อน/หลัง

**ก่อน (row ดิบจาก `.returning()`)**

```
{ id, churchId, lineUserId, …, aiRawText, aiData{…, inlineDataUrl:"data:image/jpeg;base64,…"}, slipImageKey, slipHash, … }
```

**หลัง**

```
{ id, churchId, lineUserId, …, aiData:{ receiverAccount, receiverName, receiverBank,
                                         verification:{ amount, receiver, autoReject, escalated } }, … }
```

ยืนยันด้วย test (`server/giving.updateReview.test.ts`): `JSON.stringify(result)` ต้องไม่มี `data:image/jpeg;base64`, storage key (`line/demo/U123/…`), hash (`deadbeefcafe`), และไม่มี field `aiRawText`/`slipImageKey`/`slipHash`; ขณะที่ `aiData.receiver*` และ `aiData.verification.*` ยังครบ

`giving.list` / `giving.getById` ไม่เปลี่ยนในรอบนี้ (projection เดิมจาก C1–C3)

---

## 7. Regression Results

รันจริงใน environment นี้ (Node v26.13.1, pnpm 10.4.1):

| คำสั่ง | ผล | Exit |
|---|---|---|
| `pnpm check` | ผ่าน ไม่มี error | **0** |
| `pnpm test` | `Test Files 124 passed | 5 skipped (129)` · `Tests 1236 passed | 106 skipped (1342)` | **0** |
| `pnpm build` | `dist/index.js 378.5kb`, `api/index.js 375.2kb`, vite 28.59s | **0** |
| `git checkout -- api/index.js` | คืน tracked artifact หลัง build (diff ไม่รวม build output) | 0 |

เทียบจำนวน test:

| ช่วง | ไฟล์ (passed/skipped) | Tests (passed/skipped) |
|---|---|---|
| Baseline ก่อน C1–C3 | 118 / 5 | 1169 / 106 |
| หลัง C1–C3 | 121 / 5 | 1206 / 106 |
| **หลัง remediation นี้** | **124 / 5** | **1236 / 106** |

**Tests ที่ Skip (5 ไฟล์ / 106 tests):** ชุดที่ต้องมี `DATABASE_URL` จริง — `budgets.integration`, `counting.workflow`, `reports.integration`, `withdrawals.workflow` และ suite ที่ผูกกับ DB อื่น ๆ จึง **ยังไม่ได้รัน** ในรอบนี้ (ไม่มี database ใน environment นี้) — integration ของ worker ในรอบนี้ใช้ in-memory store ไม่ใช่ PostgreSQL จริง

---

## 8. Financial Safety Review

`git diff` ทั้งชุด (5 ไฟล์ +181→325 insertions) ตรวจด้วยคำค้น `approveLineSlip|FOR UPDATE|.for(|withdrawal|reconcil|role.*admin|auditLog|INSERT INTO` → **ไม่พบการเปลี่ยนแปลง**

- `approveLineSlip()` — ไม่แตะ
- Offering posting / ledger / accounting — ไม่แตะ
- Withdrawal approval, reconciliation — ไม่แตะ (ไฟล์ไม่อยู่ใน diff)
- Role authorization — ไม่แตะ (`financeProcedure` ยังเหมือนเดิม, มี test ยืนยัน gate)
- Transaction / row lock — ไม่แตะ
- Audit trail — ไม่แตะ
- Schema / migration — ไม่มีไฟล์ `drizzle/**` ใน diff
- Reaper เขียนได้เฉพาะ `line_processing_jobs.status` และ `line_slips.status = failed` (กรณี attempts หมด) ซึ่งเป็นสถานะของงานประมวลผล ไม่ใช่การเงิน และไม่มี offering ถูกสร้างใน path นี้

---

## 9. Remaining Risks

| ID | ความเสี่ยง | ระดับ | หมายเหตุ |
|---|---|---|---|
| R-04 | Provider ยัง hardcode, AI SDK ยังไม่ถูกใช้ | คงอยู่ | เฟส H (Adapter) — ยังไม่เริ่มตามข้อกำหนด |
| R-05 | confidence เป็นค่าที่ model รายงานเอง | คงอยู่ | ต้องยืนยันกับข้อมูลจริง |
| R-06 | Gemini API key ส่งทาง query string | คงอยู่ | ควรย้ายเป็น header ในเฟส Adapter |
| R-07 | `api/index.js` เป็น tracked build artifact | คงอยู่ | นอกขอบเขต K1–K3 |
| R-08 | ไม่มี AI audit log (model/latency/outcome) | คงอยู่ | เฟส H |
| R-09 | `uploadSlip` / `rescan` ไม่มี rate limit | คงอยู่ | นอกขอบเขต |
| R-14 | เก็บ base64 ภาพสลิปใน `aiData.inlineDataUrl` | คงอยู่ | ตอนนี้ไม่หลุดไป client แล้ว แต่ยังอยู่ใน DB |
| F4 | ข้อความ timeout ของ provider ยังระบุ 25s แม้สาเหตุเป็น budget อื่น | Low | ไม่ได้แก้ (นอกขอบเขต K) — แต่ `WorkerOcrTimeoutError` มี `cause` แล้วทำให้ diagnose ได้ |
| F5 | placeholder ของ permanent failure ไม่มี `fieldStates/warnings` | Low | นอกขอบเขต |
| F6 | empty string ถูกนับเป็น "มีค่า" | Low | นอกขอบเขต |
| F7 | ไม่ pin Node runtime (`AbortSignal.any` ต้อง ≥ 20.3) | Low | นอกขอบเขต |
| ใหม่ | reaper เพิ่ม 2 query ต่อการ drain หนึ่งครั้ง | Info | `line_processing_jobs` มี index บน `status` อยู่แล้ว |
| ใหม่ | reaper ยังไม่ได้ทดสอบกับ PostgreSQL จริง (เฉพาะ in-memory double) | Medium | ต้องยืนยันใน environment ที่มี DB ก่อน deploy |
| ใหม่ | ไม่ได้ทดสอบกับ provider จริง/สลิปจริง | Medium | timeout จริงยังไม่ถูกสังเกต |

---

## 10. Stop

- K1, K2, K3 ถูกปิดในระดับโค้ด + local verification
- **H1–H5 (Vercel AI SDK Adapter) ไม่ได้เริ่ม** และไม่มีการเปลี่ยน provider
- ยังไม่อ้าง Production Verified — ทุกตัวเลขมาจาก environment นี้เท่านั้น
- รออนุมัติก่อนดำเนินการต่อ
