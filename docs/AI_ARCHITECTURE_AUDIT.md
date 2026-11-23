# AI Architecture Audit — Graceful Giving

> **สถานะเอกสาร:** Phase 0 — Repository Discovery (ยังไม่มีการแก้ไขโค้ด)
> **วันที่:** 2026-11-23
> **ขอบเขต:** เฉพาะ AI Integration และจุดที่ AI แตะ Financial Workflow
> **หลักการ:** Preserve the existing system. Improve the architecture. Protect financial integrity.

---

## 0. วิธีที่ใช้ตรวจสอบ

ตรวจจาก Source Code จริง ไม่ได้อนุมานจากชื่อไฟล์:

- อ่าน `package.json`, `pnpm-lock.yaml`
- อ่าน `server/line/*` ทั้งหมด (webhook → worker → OCR → verification → duplicate)
- อ่าน `server/routers.ts` (giving procedures), `server/db.ts` (`approveLineSlip`, `getLineSlipById`, `listLineSlips`)
- อ่าน `server/storage.ts`, `server/_core/llm.ts`, `server/_core/config.ts`, `server/_core/env.ts`
- อ่าน `drizzle/schema.ts` (`lineSlips`, `lineProcessingJobs`)
- รัน Baseline: `pnpm check` และ `pnpm test`

**Baseline ที่วัดได้จริง (ก่อนแก้ไขใด ๆ):**

| คำสั่ง | ผล |
|---|---|
| `pnpm install --frozen-lockfile` | exit 0 |
| `pnpm check` (tsc --noEmit) | **exit 0** |
| `pnpm test` (DATABASE_URL ว่าง) | **exit 0 — 118 passed / 5 skipped (123 ไฟล์), 1169 passed / 106 skipped (1275 tests)** |

ไฟล์ที่ skip คือ integration suite ที่ต้องมี DB จริง (`budgets.integration`, `counting.workflow`, `reports.integration`, `withdrawals.workflow`) ตามที่ AGENTS.md ระบุ

---

## 1. Dependency Map — AI เชื่อมกับระบบส่วนใด

```
LINE Messaging API
      │  (image message, HMAC SHA-256)
      ▼
server/line/webhook.ts ──────────────► Supabase Storage (bucket "slips", private)
      │  insert line_slips(status=pending)          │ 1-hour signed URL
      │  insert line_processing_jobs(queued)        │
      ▼                                             │
server/line/processWorker.ts  ◄─────────────────────┘
      │  resolveSlipImageUrl()
      ├──► server/line/slipOcr.ts  ──►  Google Gemini REST (external)
      │        └─ fallback ─────────►  server/_core/llm.ts → Forge (external)
      │
      ├──► server/line/duplicateDetector.ts ──► DB (line_slips, offerings)
      ├──► server/line/memberMatcher.ts    ──► DB (members)
      ├──► server/line/slipVerification.ts ──► declaredCheck + receiverAccount + givingLimits
      └──► UPDATE line_slips (aiRawText, aiData, extracted*, status)
                    │
                    ▼
        server/routers.ts  givingInbox.*  (financeProcedure / protectedProcedure)
                    │
                    ▼
        server/db.ts  approveLineSlip()  ──► offerings (แหล่งความจริงทางการเงิน)
```

**จุดที่ AI แตะระบบ มีเพียง 3 จุด:**

1. `server/line/slipOcr.ts` → `extractSlipData()` — อ่านข้อมูลจากภาพ (extraction only)
2. `server/line/processWorker.ts` → เขียนผลลง `line_slips` และตัดสิน `status` เริ่มต้น
3. `server/routers.ts` → `givingInbox.readSlip` (พรีวิวให้ผู้ถวาย) และ `rescan`

**จุดที่ AI ไม่แตะ (ยืนยันจากโค้ด):** `approveLineSlip()` ไม่ได้อ่าน `aiData` หรือ confidence เพื่อตัดสินใจใด ๆ — ใช้เฉพาะ `extractedRef` (re-check ซ้ำกับ offerings), `declaredItems`, และข้อมูลที่เจ้าหน้าที่กรอกเอง

---

## 2. Current Architecture (สรุป)

### 2.1 AI Provider

| ประเด็น | ข้อเท็จจริงจากโค้ด |
|---|---|
| Vercel AI SDK | **ติดตั้งอยู่ (`"ai": "^7.0.107"`) แต่ไม่มีการ import ใน source เลย** (ตรวจด้วย `rg 'from "ai"'` = 0 match) |
| Provider หลัก | Google Gemini ผ่าน **REST ตรง** `generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key=` (`server/line/slipOcr.ts:265`) |
| Provider สำรอง | `invokeLLM()` → Forge (OpenAI-compatible) (`server/_core/llm.ts:resolveApiUrl`) |
| Model IDs | hardcode 4 รายชื่อในอาร์เรย์: `gemini-3.5-flash`, `gemini-3.1-flash-lite`, `gemini-2.5-flash-lite`, `gemini-flash-latest` (`slipOcr.ts:255-260`) |
| API Key | `process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY` อ่านตรงใน `slipOcr.ts:335` (ไม่ผ่าน `ENV`/`config.ts`) |
| Timeout | **ไม่มี** ใน worker path; มีเฉพาะ `readSlip` ที่ห่อ `Promise.race` 20s (`routers.ts:609`) |
| Retry | `invokeLLM` มี backoff 4 ครั้ง (`llm.ts`); Gemini path ไม่มี retry ภายใน แต่ worker queue retry 3 ครั้งพร้อม backoff (`processWorker.ts:MAX_ATTEMPTS=3`) |

### 2.2 Structured Output

- กำหนด JSON Schema แบบมือ (`OUTPUT_SCHEMA` ใน `slipOcr.ts`) ส่งเป็น `response_mime_type: application/json` + ฝัง schema ใน prompt
- **ไม่มีการ validate ด้วย Zod** — ใช้ `JSON.parse(rawText) as Omit<SlipExtraction, "rawText">` (`slipOcr.ts:283`, `slipOcr.ts:375`) แล้ว cast type ทิ้ง
- ⚠️ `zod@4.1.12` มีอยู่ในโปรเจกต์แล้วแต่ไม่ได้ใช้ในเส้นทางนี้
- Fallback parsing: ถ้า parse ไม่ได้ จะ regex หา `{...}` (ไม่ตรวจ schema)

### 2.3 ฟิลด์ที่ Extract ได้

`amount`, `amountConfidence`, `transferDate`, `transferTime`, `dateConfidence`, `senderName`, `senderConfidence`, `referenceNumber`, `referenceConfidence`, `bankName`, `receiverName`, `receiverAccount`, `receiverAccountConfidence`, `receiverAccountType`, `receiverBank`, `notes`

**ยังไม่มี:** ฟิลด์ `senderAccount`, และไม่มีการแยกสถานะ `missing` / `unreadable` / `uncertain` อย่างชัดเจน — ใช้ `null` + confidence เป็นตัวแทน

### 2.4 Financial Boundary (จุดแข็งของระบบเดิม)

- `lineSlips` ถูกกำหนดชัดว่าเป็น **evidence/audit trail only** — แหล่งความจริงคือ `offerings` (`drizzle/schema.ts:811`)
- `approveLineSlip()` (`server/db.ts:4052`) ทำใน transaction + `FOR UPDATE` row lock, ตรวจ:
  - slip มีอยู่จริง / ยังไม่อนุมัติ / ไม่ถูกปฏิเสธ / ไม่ใช่ duplicate
  - re-check `extractedRef` ซ้ำกับ `offerings` ที่ active
  - fund มีอยู่จริงและ `isActive`
  - `no_slip` ต้องมี `confirmedBankCheck`
- Role gate: `givingInbox.approve` = `financeProcedure` (TREASURER / SUPER_ADMIN)
- ✅ **AI ไม่สามารถ post transaction, แก้ยอด, อนุมัติ, หรือ reconcile ได้** — ไม่มี tool calling ที่เข้าถึง DB และไม่มีโค้ดเส้นทางใดให้ AI เขียน `offerings`

### 2.5 Duplicate Detection

3 ระดับ ทำงานบน DB จริง ไม่พึ่ง AI:

| ระดับ | กลไก | ไฟล์ |
|---|---|---|
| L1 | bank reference + unique index `line_slips_ref_uniq` | `webhook.ts`, `duplicateDetector.ts` |
| L2 | SHA-256 ของภาพ + `line_slips_hash_idx` | `webhook.ts` |
| L3 | amount + date ±1 วัน + สมาชิกเดียวกัน | `duplicateDetector.ts` |

### 2.6 Human-in-the-Loop (ของเดิม)

- ผู้ถวายส่ง → `submitSlip` (protectedProcedure) → queue → worker อ่าน → `status` เป็น `extracted`/`matched`/`needs_review`/`duplicate`/`rejected`/`failed`
- **ทุกกรณีที่เกิดรายได้จริง ต้องผ่าน `givingInbox.approve` โดย TREASURER/SUPER_ADMIN**
- มี auto-reject เฉพาะกรณี "ส่งจาก giving station ที่มียอดประกาศ" และยอด/บัญชีผู้รับไม่ตรง (เป็น domain rule ไม่ใช่ AI decision) + มี escalation เมื่อโดนปฏิเสธอัตโนมัติหลายครั้ง (`MAX_AUTO_REJECTS`)

---

## 3. Gap Analysis — Current vs Target

| # | Target Requirement | สถานะปัจจุบัน | หลักฐาน |
|---|---|---|---|
| G1 | Vercel AI SDK เป็น framework หลัก | ❌ ติดตั้งแต่ไม่ใช้; เรียก REST ตรง | `package.json`, `slipOcr.ts:265` |
| G2 | Provider Adapter / เปลี่ยน provider ได้โดยไม่แตะ business logic | ❌ model IDs + URL + payload ฝังใน `slipOcr.ts` | `slipOcr.ts:234-330` |
| G3 | Structured Output ผ่าน Zod validation | ❌ cast type หลัง `JSON.parse` | `slipOcr.ts:283,375` |
| G4 | Output มี validated data + confidence + warnings + processing status + metadata | ⚠️ มี confidence และ `notes`; ไม่มี `warnings[]`, `processingStatus`, `provider/model` metadata ที่เป็นโครงสร้าง | `SlipExtraction` interface |
| G5 | Error taxonomy (timeout/rate limit/invalid output/model failure/network/unsupported image/duplicate/partial) | ⚠️ แยกได้แค่ transient vs permanent ผ่าน regex บนข้อความ error | `slipOcr.ts:isTransientError` |
| G6 | ไม่ให้ AI เปลี่ยนสถานะทางการเงิน | ✅ ทำได้แล้ว | `approveLineSlip` |
| G7 | Human approval ยังเป็นผู้ตัดสิน | ✅ ทำได้แล้ว | `givingInbox.approve` |
| G8 | Timeout ครบทุก AI call | ❌ worker path ไม่มี timeout | `processWorker.processJob` |
| G9 | Logging/observability ของ AI | ❌ ไม่มี audit log ของการ extract/rescan; มีแค่ `console.warn` | `routers.ts`, `processWorker.ts` |
| G10 | Data retention / PII redaction | ❌ เก็บ `aiRawText` + `aiData` (รวม base64 ภาพ) ไม่มีนโยบายลบ และส่งออกไป client | `db.ts:3984-4017`, `db.ts:3932-3977` |
| G11 | Rate limiting ครบทุก AI endpoint | ⚠️ `readSlip` มี (12/5นาที), `submitSlip` มี (per day); `uploadSlip`/`rescan` ไม่มี | `routers.ts:595`, `routers.ts:3232` |
| G12 | Secure key management (ไม่รั่วใน log/URL) | ⚠️ ส่ง key ทาง query string `?key=` | `slipOcr.ts:265` |
| G13 | Test coverage ของ AI layer | ⚠️ มี unit test ของ error classification/date/verification แต่ไม่มี test ของ schema validation, provider adapter, prompt injection, malformed output | `server/line.slipOcr.test.ts` |
| G14 | Evaluation harness | ❌ ไม่มี | — |
| G15 | แยก AI Processing จาก Financial Logic | ⚠️ แยกไฟล์ได้ดี แต่ `processWorker` ผูก AI + duplicate + member + verification + DB update ไว้ในฟังก์ชันเดียว | `processWorker.ts:processJob` |

---

## 4. Implemented Plan (ข้อเสนอ — ยังไม่ดำเนินการ)

จัดลำดับตาม Critical / High / Medium / Low โดย **ไม่แตะ schema, API contract, หรือ financial workflow** ในเฟสแรก

### Critical

| ID | งาน | ไฟล์เป้าหมาย | ความเสี่ยงถ้าไม่ทำ |
|---|---|---|---|
| C1 | เพิ่ม Zod schema validation ของ AI output ก่อนใช้ค่าใด ๆ (reject/clamp ค่าผิดรูป) | `server/line/slipOcr.ts` (+ ไฟล์ schema ใหม่) | ค่าผิดชนิด/ช่วงหลุดเข้า DB และการคำนวณ verification |
| C2 | เพิ่ม timeout ที่ AI call ใน worker + จัดประเภท error เป็น typed error | `server/line/slipOcr.ts`, `server/line/processWorker.ts` | ฟังก์ชันค้างจน 300s (มีหลักฐานใน `docs/PR_138_RELEASE_READINESS_AUDIT.md`) |
| C3 | หยุดส่ง `aiRawText` / `aiData` ทั้งก้อนออก client; ส่งเฉพาะฟิลด์ที่ UI ต้องใช้ | `server/db.ts` (`getLineSlipById`, `listLineSlips`) | ข้อมูลภาพ/ข้อความดิบและ PII รั่วเกินจำเป็น |

### High

| ID | งาน | ไฟล์เป้าหมาย |
|---|---|---|
| H1 | สร้าง AI Provider Adapter ภายในโดยใช้ Vercel AI SDK (`generateObject`) แทน REST ตรง + คง fallback เดิม | `server/ai/*` (ใหม่), `slipOcr.ts` |
| H2 | ย้าย model config + key resolution ไปที่ศูนย์กลาง (env/config) ไม่ hardcode | `server/ai/config.ts` (ใหม่), `server/_core/config.ts` |
| H3 | เพิ่ม `warnings[]`, `processingStatus`, `provider`/`model` metadata ในผลลัพธ์ (แบบ optional, backward-compatible) | `server/line/slipOcr.ts` |
| H4 | เพิ่ม audit log สำหรับ AI extraction / rescan / readSlip (โดยไม่ log ภาพหรือ secrets) | `server/routers.ts` |
| H5 | ลบ `api/index.js` ออกจาก tracked files (เป็น build artifact ที่ซ้ำกับ source) | `api/index.js`, `.gitignore`, build script |

### Medium

| ID | งาน |
|---|---|
| M1 | แยกสถานะ `missing` / `unreadable` / `uncertain` อย่างชัดเจนในสัญญาผลลัพธ์ |
| M2 | เพิ่ม rate limit ให้ `uploadSlip` และ `rescan` |
| M3 | ย้าย Gemini key จาก query string ไป header (`x-goog-api-key`) |
| M4 | เพิ่ม test: malformed AI output, schema rejection, prompt injection, provider failure/timeout, PII ไม่หลุด |
| M5 | แยก `processJob` เป็นขั้นตอนย่อยที่ทดสอบได้ (extract → detect → verify → persist) |

### Low

| ID | งาน |
|---|---|
| L1 | Evaluation harness ด้วยชุดสลิปตัวอย่าง (golden set) + วัด precision ของ amount/reference |
| L2 | ปรับ prompt ให้ระบุ `uncertain` แทนการเดา และห้ามอ่านตัวเลขที่ถูก mask |
| L3 | นโยบาย data retention ของ `aiRawText` / ภาพใน DB |

---

## 5. สิ่งที่ "ไม่" จะทำในแผนนี้

- ไม่เปลี่ยน Database Schema
- ไม่เปลี่ยน tRPC API contract ที่ client ใช้อยู่
- ไม่เปลี่ยน `approveLineSlip` หรือ approval rules
- ไม่เปลี่ยนผู้ให้บริการ AI ใน production โดยไม่มีการยืนยันคีย์และต้นทุน
- ไม่ลบ Gemini fallback เดิมจนกว่าจะมี adapter ที่ผ่าน test เทียบเท่า
- ไม่สร้าง mock data เพื่อให้ดูเหมือนทำงานได้

---

## 6. ข้อจำกัดของการตรวจสอบรอบนี้

- ไม่มี `GEMINI_API_KEY` / `DATABASE_URL` จริงในสภาพแวดล้อมนี้ → **ไม่ได้ทดสอบการเรียก provider จริง และไม่ได้รัน integration suite ที่ต้องใช้ DB**
- ตัวเลข 1169 tests ที่ผ่าน เป็น unit/access tests ที่ไม่ต้องต่อ DB
- ยังไม่ได้ตรวจ production environment ใด ๆ
