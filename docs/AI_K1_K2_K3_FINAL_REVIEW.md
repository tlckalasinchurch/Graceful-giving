# GRACEFUL GIVING — K1 / K2 / K3 FINAL VERIFICATION GATE

| | |
|---|---|
| รอบ | Final verification gate ก่อนอนุมัติ H1 (Vercel AI SDK Adapter) |
| โหมด | **REVIEW ONLY — NO CODE CHANGES** (ไม่มีไฟล์ source/test/config ถูกแก้ในรอบนี้) |
| วันที่ | 2026-11-23 |
| คำตัดสิน | **PASS WITH CONDITIONS** (เงื่อนไข C1–C4 ต้องปิดก่อน deploy K1–K3 ขึ้น production) |

## สถานะ (แยกให้ชัด)

| สถานะ | ผล |
|---|---|
| **AUDITED** | ✅ ตรวจ code path + SQL ของ reaper/claim/writes ทั้งหมดในรอบนี้ (ดู §1) |
| **IMPLEMENTED** | ✅ K1/K2/K3 อยู่ใน working tree (ยัง uncommitted, 5 ไฟล์แก้ + 4 ไฟล์ test) |
| **TESTED** | ⚠️ Unit + Fake-DB integration เท่านั้น (39 tests เฉพาะกลุ่มนี้) — **ไม่มี Real PostgreSQL Integration Test** และไม่ได้ทดสอบ provider จริง |
| **PRODUCTION VERIFIED** | ❌ **ไม่ใช่** — ไม่ได้รันบน production, ไม่มี `DATABASE_URL` จริง, ไม่ได้สังเกตพฤติกรรมจริงของ Postgres/Neon |

---

## 1. Stale Job Recovery Audit

### 1.1 โค้ดที่ตรวจ (ตามจริงในไฟล์)

`server/line/processWorker.ts`

```ts
// :59  lease
export const STALE_JOB_LEASE_MS = 10 * 60 * 1000;

// :109
export function staleJobCutoff(now: number = Date.now()): Date {
  return new Date(now - STALE_JOB_LEASE_MS);           // ← เวลาจาก app ไม่ใช่ DB
}

// :123 reaper
const stale = () =>
  and(
    eq(lineProcessingJobs.status, "processing"),
    lt(lineProcessingJobs.lastAttemptAt, staleJobCutoff())
  );

// :133-142  ยังมี retry → คืนคิว
await db.update(lineProcessingJobs)
  .set({ status: "queued", errorMessage: "requeued after worker lease expired", updatedAt: new Date() })
  .where(and(stale(), lte(lineProcessingJobs.attempts, MAX_ATTEMPTS - 1)))
  .returning({ id: lineProcessingJobs.id });

// :154-174  attempts หมด → failed (+ mark slip failed)
const [claimed] = await db.update(lineProcessingJobs)
  .set({ status: "failed", errorMessage: "worker lease expired", updatedAt: new Date() })
  .where(and(eq(lineProcessingJobs.id, job.id), stale()))
  .returning({ id: lineProcessingJobs.id });
if (!claimed) continue;
await db.update(lineSlips)
  .set({ status: "failed", lastErrorMessage: "worker lease expired", updatedAt: new Date() })
  .where(eq(lineSlips.id, job.slipId));                 // ← ไม่มี guard สถานะ slip
```

จุดเขียนผลของ worker (ไม่เปลี่ยนจากเดิม):

```ts
// :228 ต้น processJob
if (slip.status !== "pending") { /* mark job done */ return; }

// :348-390  เขียนผลลง slip
await db.update(lineSlips).set({ … }).where(eq(lineSlips.id, slipId));   // ← ไม่มี guard

// :394-396  ปิดงาน
await db.update(lineProcessingJobs).set({ status: "done", … })
  .where(eq(lineProcessingJobs.id, jobId));                              // ← ไม่มี guard
```

### 1.2 Atomicity ของ Reaper

- แต่ละ `UPDATE` เป็น single statement → atomic ในระดับ row ภายใต้ READ COMMITTED และ predicate ถูกประเมินซ้ำในสแนปช็อตของ statement นั้น
- branch 2 (`failed`) ทำ select แล้ว update แยกกัน แต่ update ซ้ำ predicate (`id` + `stale()`) และตรวจ `returning` → ถ้าแถวถูกเปลี่ยนไปแล้วจะ `continue` ไม่เขียน slip ต่อ → **ถูกต้อง**
- branch 1 ไม่มี read-modify-write จึงไม่มีช่องว่างระหว่างอ่านกับเขียน
- **สรุป:** reaper เอง atomic เพียงพอ

### 1.3 Race ระหว่าง Reaper กับ Worker (และ Worker เก่า)

**ข้อเท็จจริงที่ยืนยันแล้ว: ไม่มี Lease Owner, Claim Token, Fencing Token หรือ version/`updatedAt` guard ใด ๆ**

```
$ grep -nE "claimedBy|lease|token|version" drizzle/schema.ts
(ไม่มีผลลัพธ์)
line_processing_jobs: id, slipId, churchId, status, attempts, lastAttemptAt, errorMessage, createdAt, updatedAt
```

ไทม์ไลน์ที่ทำให้เกิดปัญหา (window แคบแต่มีจริง):

```
t=0      Worker A claim  (status=processing, attempts=1, lastAttemptAt=t0, ยังถืองานในหน่วยความจำ)
t=0..    A ค้างผิดปกติ (DB lock wait / platform pause / event-loop stall / host clock เพี้ยน)
t=+10m   Reaper: status='processing' AND lastAttemptAt < now-10m  → ตั้ง status='queued'
t=+10m   Worker B claim สำเร็จ (status=processing, attempts=2)
t=+10m+  B เขียนผลลง slip แล้วปิด job = done
t=+11m   A ตื่นขึ้นมา เขียนผลของตัวเองทับ slip (last-writer-wins)
         แล้วปิด job = done อีกครั้ง  ← ทับสถานะที่ B เพิ่งปิด (หรือกลับด้าน: B failed แล้ว A ทับเป็น done)
```

**ผลลัพธ์ที่เป็นไปได้**
1. หลักฐานสลิป (aiRawText / aiData / extracted*) ถูกเขียนทับด้วยผลของ worker เก่า → ข้อมูลไม่ตรงกับที่ staff เห็นตอนตัดสินใจ (แต่ยังไม่ใช่การเงิน)
2. `line_processing_jobs.status` ถูกเขียนทับข้าม owner → job อาจจบเป็น `done` ทั้งที่ slip ถูก mark `failed` (หรือกลับกัน)
3. งานเดียวกันถูกประมวลผลซ้ำ (provider ถูกเรียกซ้ำ) → เสียค่าใช้จ่าย/โควตา แต่ **ไม่สร้าง offering**

**ทำไม `lastAttemptAt < cutoff` ไม่ใช่หลักฐานว่า worker เดิมหยุดแล้ว** — ตรงตามที่โจทย์ระบุ:
- `lastAttemptAt` ถูกเขียนด้วย `new Date()` จาก **นาฬิกาของ app** (:447) และเปรียบเทียบกับ `staleJobCutoff()` ที่ก็ใช้ **นาฬิกาของ app** (:109) แต่เป็นคนละ process/host ได้ (Vercel หลาย instance) → host ที่นาฬิกาเร็วกว่า 10 นาทีจะทำให้ job ที่เพิ่งเริ่มดู "หมดอายุ" ทันที และถูก requeue ขณะที่ A ยังทำงานอยู่จริง
- ยังมี pattern ที่ขัดกันเองในไฟล์เดียวกัน: backoff gate ใช้ **`now()` ของ DB** (`:430`) แต่ lease ใช้เวลาของ app → สองแหล่งเวลาปนกัน
- ไม่มีอะไรผูก "สิทธิ์ในการเขียนผล" กับ claim รอบนั้น ๆ เลย

### 1.4 Worker เก่าเขียนทับ Worker ใหม่ได้หรือไม่

**ได้** (ดู 1.3) เพราะทั้งสองจุดเขียนไม่มีเงื่อนไข ownership:
- `:390` `WHERE id = slipId` เท่านั้น
- `:396` `WHERE id = jobId` เท่านั้น

### 1.5 Job State Transition

```
queued ──claim──▶ processing ──สำเร็จ──▶ done
                        │
                        ├── transient/ครบ attempts ──▶ failed (terminal)
                        └── reaper (attempts ≤ 2) ──▶ queued ──claim──▶ processing
```
- state ที่ถูกต้องตามดีไซน์: ครบถ้วน
- state ที่ **ไม่ถูกป้องกัน**: `failed → done` (worker เก่ากลับมาปิดงานหลัง reaper fail ไปแล้ว) และ `done` ที่ถูกเขียนทับซ้ำ
- ไม่มี transition ใดที่แตะ ledger/offering

### 1.6 Retry Attempts และ Terminal Failure

- claim เพิ่ม `attempts` (+1) และตั้ง `lastAttemptAt`
- reaper **ไม่** แตะ `attempts` (ถูกต้อง: การกู้คืนไม่ควรกินโควตา retry)
- branch 1 จำกัด `attempts ≤ MAX_ATTEMPTS-1` → job ที่ถูก requeue ยัง claim ได้จริง (queue query กรอง `attempts ≤ MAX-1`)
- branch 2 จัดการ job ที่ `attempts ≥ MAX` → `failed` + slip `failed` = terminal
- ไม่พบเส้นทางที่ job ค้าง `queued` โดย attempts หมด (เพราะ requeue ไม่เพิ่ม attempts)

### 1.7 Duplicate Financial Side Effects

**ไม่มี** — ยืนยันจาก call graph:
- `processJob` เขียนเฉพาะ `line_slips` + `line_processing_jobs`
- `approveLineSlip()` (offering posting) ไม่ถูกเรียกจาก worker/reaper เลย
- reaper ไม่แตะ `offerings`, `funds`, `bank_records`, `withdrawal_*`, `audit_logs`
- ดังนั้นผลกระทบสูงสุดคือ **หลักฐานสลิป/สถานะงานเพี้ยน** ไม่ใช่ยอดเงิน

### 1.8 Findings (ยังไม่แก้โค้ด)

| ID | ระดับ | Finding | หลักฐาน |
|---|---|---|---|
| **R-K3-1** | **High** | ไม่มี ownership/fencing: worker เก่าสามารถเขียนทับ slip และสถานะ job ของ worker ใหม่หลัง reaper requeue | `:390`, `:396`, ไม่มี token ใน schema |
| **R-K3-2** | **High** | reaper เขียน `line_slips.status='failed'` โดยไม่มี guard — ถ้าเหรัญญิกอนุมัติสลิปไปแล้ว (มี offering ใน ledger) slip จะถูกพลิกเป็น `failed` ทั้งที่ Ledger มีรายการอยู่ | `:167-174` |
| **R-K3-3** | Medium | lease ตัดสินด้วยนาฬิกา app ขณะที่ backoff ใช้ `now()` ของ DB → clock skew ระหว่าง instance ทำให้ job ที่ยังทำงานถูกมองว่า stale | `:109`, `:447` vs `:430` |
| **R-K3-4** | Low | worker เก่าที่กลับมาอาจทำให้ `failed → done` (หรือ slip `failed` แต่ job `done`) — staff เห็นสถานะขัดกัน | `:394-396` |
| **R-K3-5** | Low | reaper เพิ่ม 2 query ต่อการ drain; index ที่มีคือ `(status, createdAt)` ไม่ครอบ `lastAttemptAt` | `:409-411`, schema index |

### 1.9 แนวทางแก้ที่เสนอ (ยังไม่ทำ)

**ทางเลือก A — ไม่เปลี่ยน schema (แนะนำให้ทำก่อน deploy)**
1. ปิดช่องเขียนทับระดับ slip: `UPDATE line_slips … WHERE id = ? AND status = 'pending'` แล้วใช้ `returning`/rowCount ตรวจว่าแถวนี้ยังเป็นของเรา; ถ้าไม่ได้เขียน → **ไม่** mark job done (ปล่อยให้เป็นของผู้ชนะจริง)
2. ปิดช่องเขียนทับระดับ job: เก็บ `claimedAttempt = job.attempts + 1` ตอน claim แล้ว `UPDATE line_processing_jobs SET status='done' WHERE id=? AND status='processing' AND attempts = claimedAttempt` — worker เก่าจะ match 0 row และรู้ว่าตนแพ้
3. reaper branch 2: `WHERE id=? AND status NOT IN ('approved','rejected') AND approvedOfferingId IS NULL`
4. เปลี่ยน cutoff เป็นเวลาของ DB: `sql\`${lineProcessingJobs.lastAttemptAt} < now() - interval '10 minutes'\`` (เหมือน backoff gate) — ตัดปัญหา clock skew ทั้งหมด

**ทางเลือก B — fencing token (ต้องขออนุมัติเปลี่ยน schema)**
เพิ่มคอลัมน์ `claimToken uuid` (หรือ `leaseExpiresAt timestamptz`) ตั้งค่าใหม่ทุกครั้งที่ claim แล้วให้ทุก write ของ worker เงื่อนไข `claimToken = <ของตัวเอง>` — เป็นวิธีที่ตรงที่สุดและตรวจสอบได้ด้วย lease expiry จริง

> ทั้งสองทางไม่กระทบ financial logic; ทางเลือก A ทำได้โดยไม่ต้อง migration

---

## 2. Worker Tests Audit

### 2.1 การแบ่งชั้น (ตามจริงใน `server/line/processWorker.test.ts`)

| กลุ่ม | จำนวน | ธรรมชาติ |
|---|---|---|
| `unit — extractWithinJobBudget` | 6 | ไม่แตะ DB เลย: ส่ง signal, budget timeout, `cause`, ไม่ relabel provider error/cancel, lease > 5×budget |
| `integration (fake DB) — runWorkerBatch` | 11 | **Fake DB integration** — drizzle call จริง, storage เป็น in-memory store |
| `unit — reclaimStaleJobs` | 2 | DB double เฉพาะกิจ |
| รวม | **19** | + `server/_core/llm.test.ts` 3 + `giving.updateReview.test.ts` 4 + `slipView.test.ts` 4 = **30 tests ในรอบ remediation** |

**ไม่มี Real PostgreSQL Integration Test ในโปรเจกต์สำหรับ worker** — และเอกสาร/ชื่อ describe ไม่ได้เรียก fake DB ว่า PostgreSQL integration (ชื่อคือ `integration (fake DB)`)

### 2.2 Concurrent Worker Test ตรวจอะไรจริง

`processes a slip once when two workers run at the same time` (test :454)

- สิ่งที่พิสูจน์: เมื่อ `claim` คืน 0 แถว โค้ดจะ `continue` ไม่เรียก `processJob` → งานไม่ถูกประมวลผลซ้ำ **ในระดับ logic ของ worker**
- สิ่งที่ **ไม่ได้** พิสูจน์: atomicity ของ `UPDATE … WHERE status='queued'` ใน PostgreSQL (row lock, READ COMMITTED, การชนกันของสอง connection จริง) เพราะ fake DB รันบน single-threaded JS และตัดสินผู้ชนะด้วยการเช็ก `status` ในหน่วยความจำ
- สรุป: เป็น **single-process claim-race test** ไม่ใช่ concurrency test ระดับฐานข้อมูล — ต้องไม่นำไปอ้างว่า PostgreSQL concurrency ถูกทดสอบแล้ว

### 2.3 Abort / Timeout

- unit: abort จริง (signal.aborted === true), timeout เร็ว (20ms), `WorkerOcrTimeoutError` + `cause`, provider error ไม่ถูกแปลง
- integration (fake timers): budget 45s → provider ถูก abort → job กลับ queue, slip ไม่ถูกเขียน
- `llm.test.ts`: ยกเลิกระหว่าง backoff → ปฏิเสธทันทีและยิง request เพียงครั้งเดียว; ยกเลิกก่อนเริ่ม → ไม่ยิงเลย; retry ปกติยังทำงาน (503,503,200 = 3 calls)

### 2.4 Stale Recovery

- reaper คืน queue + นับ failed ถูกต้อง, claim แพ้ → ไม่แตะ slip
- **ไม่มี test** สำหรับ: reaper กับ job ที่ยังมี worker จริงถืออยู่, worker เก่ากลับมาเขียนหลัง reaper, clock skew, การป้องกันสลิปที่ approved แล้ว

### 2.5 Duplicate Processing

- ครอบเฉพาะกรณี claim แพ้ภายใน process เดียว (2.2)
- ไม่ครอบกรณีที่ r-K3-1 เกิดขึ้นจริง (สอง worker ถืองานเดียวกันคนละรอบ claim)

**สรุป §2:** test suite ดีในระดับ unit/behavioral และไม่ overclaim — แต่ช่องว่างที่ตรงกับ R-K3-1/2/3 ยังไม่มี test และทดสอบไม่ได้จริงหากไม่มี PostgreSQL

---

## 3. K2 Security Audit (ทุก endpoint ของ slip)

| Endpoint | Gate | สิ่งที่ส่งกลับ | sensitive fields | หลักฐาน |
|---|---|---|---|---|
| `givingInbox.list` | `financeProcedure` (TREASURER/SUPER_ADMIN/admin) | `toSlipView` — ตัด `aiRawText`, `slipImageKey`, `slipHash`, `aiData` เหลือ allowlist, + `signedImageUrl` | ✅ ไม่หลุด | `db.ts:3975`, `slipView.test.ts`, `line.inbox.test.ts:64-103` |
| `givingInbox.getById` | `financeProcedure` | เหมือน `list` | ✅ ไม่หลุด | `db.ts:4010`, `line.inbox.test.ts:70` |
| `givingInbox.updateReview` | `financeProcedure` | `toSlipReviewView` — ตัด 4 field เดิม, `aiData` เหลือ allowlist, ไม่มี signed URL | ✅ ไม่หลุด (test ยืนยัน payload ไม่มี base64/storage key/hash/raw text) | `routers.ts:3179-3192`, `giving.updateReview.test.ts` (4 tests) |
| `givingInbox.readSlip` | `protectedProcedure` + `allowSlipRead` rate limit | `toSlipReading()` → `{status, amount, senderName, transferDate, bank}` เท่านั้น (ไม่มี reference number, receiver account, raw text) | ✅ ไม่หลุด | `shared/slipReading.ts`, `slipReading.ts`, `giving.noSlip.test.ts:345-414` |
| `givingInbox.rescan` | `financeProcedure` | `{ success: true }` | ✅ ไม่มีข้อมูลสลิปเลย | `routers.ts:3579-3595` |

**Authorization ทำงานครบ:** MEMBER → FORBIDDEN (list/getById/updateReview), signed-out → UNAUTHORIZED, readSlip มี rate limit ต่อผู้ใช้ (test ยิง 12 ครั้งแล้วได้ TOO_MANY_REQUESTS)

**หมายเหตุที่ยอมรับไว้ (ไม่ใช่ regression):** `list`/`getById`/`updateReview` ยังคืน `lineUserId`, `lineDisplayName`, `submittedByName` (PII ของผู้ส่ง) ให้บทบาทการเงิน — เป็นพฤติกรรมเดิมของฟีเจอร์ Giving Inbox และอยู่นอกขอบเขต K2 (K2 = ตัด evidence/internal fields)

---

## 4. Financial Safety

`git diff` ทั้งชุด (`+325/-53`, 5 ไฟล์) ตรวจด้วยคำค้น:

```
$ git diff | grep -cE "approveLineSlip|FOR UPDATE|withdrawal|reconcil|auditLogs"
0
```

| รายการ | ผล |
|---|---|
| `approveLineSlip()` | ไม่เปลี่ยน |
| Offering posting / ledger creation | ไม่เปลี่ยน |
| Withdrawal approval | ไม่เปลี่ยน (ไฟล์ไม่อยู่ใน diff) |
| Reconciliation / date integrity | ไม่เปลี่ยน |
| Role authorization | ไม่เปลี่ยน (`financeProcedure` เดิม; test ยืนยัน) |
| Transaction / `FOR UPDATE` row lock | ไม่เปลี่ยน |
| Financial audit trail | ไม่เปลี่ยน |
| Schema / migration | ไม่มีไฟล์ `drizzle/**` ใน diff |

⚠️ ข้อควรระวังที่ยังเปิดอยู่: **R-K3-2** (reaper ตั้ง slip เป็น `failed` ได้แม้อนุมัติแล้ว) เป็นการเขียนสถานะสลิป ไม่ใช่การเงิน แต่ทำให้ข้อมูลขัดกับ ledger ที่ถูกต้องแล้ว → ต้องปิดก่อน deploy

---

## 5. Verification

รันจริงใน environment นี้ (Node v26.13.1, pnpm 10.4.1):

| คำสั่ง | ผล | Exit |
|---|---|---|
| `pnpm check` | ผ่าน ไม่มี error | **0** |
| `pnpm test` | `Test Files 124 passed | 5 skipped (129)` · `Tests 1236 passed | 106 skipped (1342)` | **0** |
| `pnpm build` | `dist/index.js 378.5kb`, `api/index.js 375.2kb` | **0** |
| `git checkout -- api/index.js` | คืน tracked artifact (diff ไม่รวม build output) | 0 |

**DB-gated tests ที่ Skip (5 ไฟล์ / 106 tests):**

| ไฟล์ | tests |
|---|---|
| `server/finance.dateIntegrity.integration.test.ts` | 50 |
| `server/counting.workflow.test.ts` | 28 |
| `server/reports.integration.test.ts` | 17 |
| `server/withdrawals.workflow.test.ts` | 9 |
| `server/budgets.integration.test.ts` | 2 |

**ข้อจำกัดของ Fake DB (ต้องระบุเมื่ออ้างผล):**
- ไม่ประเมิน SQL จริง: predicate (`WHERE`) ถูกจำลองด้วย logic ใน JS ไม่ได้ผ่าน query planner/row lock
- single-threaded: ไม่มีทางเกิด concurrent transaction จริง
- ไม่มี transaction/rollback: worker ไม่ได้ใช้ `db.transaction()` แต่ reaper + claim ในโลกจริงแยก statement
- ไม่จำลอง clock skew ระหว่าง host, deadlock, serialization failure

---

## 6. คำตัดสิน

# PASS WITH CONDITIONS

K1 และ K2 ปิดครบตามที่กำหนด (มี test จริงและไม่ overclaim) ส่วน K3 ทำงานถูกต้องในเส้นทางปกติ แต่ **ownership model ของ job ยังไม่มีการพิสูจน์ว่า worker เก่าเขียนทับไม่ได้** — ตามที่โจทย์ตั้งข้อสังเกตไว้

### เงื่อนไขบังคับก่อน deploy K1–K3 ขึ้น production

| # | เงื่อนไข | เหตุผล |
|---|---|---|
| **C1** | ปิด R-K3-1: ใส่ ownership guard ที่ write ทั้งสองจุด (`line_slips` = `status='pending'`, `line_processing_jobs` = `status='processing' AND attempts=claimed`) หรือเพิ่ม `claimToken` (ต้องอนุมัติ schema) | worker เก่าเขียนทับผลของ worker ใหม่ได้ |
| **C2** | ปิด R-K3-2: reaper ต้องไม่แตะ slip ที่ `approved`/`rejected` หรือมี `approvedOfferingId` | กันสถานะขัดกับ ledger |
| **C3** | ปิด R-K3-3: คำนวณ lease cutoff ด้วย `now()` ของ DB ไม่ใช่นาฬิกา app | clock skew ทำให้ requeue งานที่ยังทำงาน |
| **C4** | เพิ่ม Real PostgreSQL Integration Test สำหรับ claim + reaper (ต้องมี `DATABASE_URL`) และระบุชัดว่า fake-DB test ไม่ใช่ PG concurrency test | ปิดช่องว่างหลักฐานของ §2 |

### เกี่ยวกับการอนุมัติ H1

- K1–K3 **ไม่มีผลต่อ** Adapter (H1 แตะ `server/ai/*` + provider abstraction ไม่แตะ job state) → **เริ่ม H1 ได้** ตามลำดับ แต่ต้องไม่ merge/deploy K1–K3 สู่ production ก่อนปิด C1–C2 (และควรมี C3)
- หรือเจ้าของระบบสามารถ **ยอมรับความเสี่ยงอย่างชัดแจ้ง** ว่า window ต้องมี "งานค้างเกิน 10 นาที" หรือ "นาฬิกา host เพี้ยน" จึงจะเกิด — และผลกระทบจำกัดอยู่ที่หลักฐานสลิป/สถานะงาน ไม่ใช่ยอดเงิน

### สิ่งที่ยังไม่ได้ยืนยัน (ห้ามอ้างว่า verified)

- ไม่ได้ทดสอบกับ PostgreSQL/Neon จริง → พฤติกรรม lock/concurrency ของ reaper ยังเป็น **DESIGNED + FAKE-DB TESTED**
- ไม่ได้ทดสอบกับ provider จริง (ไม่มี `GEMINI_API_KEY`) → timeout จริงยังไม่ถูกสังเกต
- ไม่ได้ตรวจ production

**Review Only — ไม่มีการแก้โค้ดในรอบนี้ และยังไม่เริ่ม H1–H5**
