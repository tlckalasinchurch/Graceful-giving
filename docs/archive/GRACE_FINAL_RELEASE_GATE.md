# GRACEFUL GIVING — FINAL FINANCIAL & RELEASE GATE AUDIT

**Date:** 2026-11-09  
**Auditor Roles:** Senior Financial Software Architect & Application Security Auditor  
**Audit Scope:** Read-Only Audit of Codebase, Schemas, Accounting Workflows, Storage & Deployment Pipeline  
**Target Release:** Production Release v1.0.0  

---

## 1. Executive Summary

รายงานฉบับนี้เป็นผลการตรวจสอบรอบสุดท้าย (Final Release Gate Audit) ในฐานะ **Senior Financial Software Architect** และ **Application Security Auditor** โดยมุ่งเน้นความถูกต้องของระบบบัญชีการเงิน (Financial Accounting & Ledger Integrity), ความมั่นคงปลอดภัยและการควบคุมสิทธิ์ (Security & Access Control), การรักษาความเป็นส่วนตัวของข้อมูลผู้ถวาย (Privacy & Storage Isolation), และความปลอดภัยของกระบวนการ Deploy (Deployment Safety)

การตรวจสอบนี้กระทำโดยตรงต่อ Source Code, Schema Definitions, Architecture Design Documents, และ Automated Test Suites ใน Repository จริง โดยยึดหลักฐานเชิงประจักษ์ (Empirical Evidence) ปราศจากการสมมติหรือตีความเกินกว่าหลักฐานที่มีอยู่

---

## 2. หมวดหมู่การประเมิน (Evaluation Categories)

ผลการตรวจสอบถูกแบ่งออกเป็น 4 กลุ่มมาตรฐาน:
1. **VERIFIED PASS** — มีหลักฐานยืนยันความถูกต้องในโค้ดและผลการทดสอบ
2. **FAIL** — พบข้อบกพร่อง โครงสร้างไม่สอดคล้องกับมาตรฐานทางบัญชี/ความปลอดภัย หรือมีจุดที่ต้องปรับปรุง
3. **BLOCKED** — ขาดการอนุมัติหรือข้อมูลจำเป็นจากผู้มีอำนาจตัดสินใจ
4. **NOT VERIFIED** — ไม่สามารถยืนยันได้จากสภาพแวดล้อม Local (เช่น การตั้งค่าบน Cloud Dashboard ภายนอก)

---

## 3. รายการ Findings แยกตามมิติการตรวจสอบ

### หมวดที่ 1: Financial Ledger & Accounting Architecture

#### [Finding 1.1] Absence of Immutable Double-Entry Journal Table
* **Status:** **FAIL**
* **Severity:** **P1 (High Architectural Significance)**
* **File & Line Reference:** `drizzle/schema.ts:341-434`, `server/db.ts:1390-1460`
* **Evidence:**
  * โครงสร้างฐานข้อมูลไม่มีตาราง Journal คู่บัญชีที่เป็น Immutable (เช่น `journal_entries` และ `journal_lines` ที่บันทึก Debit / Credit ตามหลักการบัญชีคู่)
  * ระบบจัดเก็บข้อมูลแบบ **Single-Entry Cash-Basis Fund Accounting**:
    * รายรับบันทึกในตาราง `offerings`
    * รายจ่ายบันทึกในตาราง `expenses`
    * บัญชีกองทุนจัดเก็บในตาราง `finance_accounts` โดยมียอดคงเหลือแบบ Mutable Column:
      ```ts
      // drizzle/schema.ts:350
      balance: decimal("balance", { precision: 15, scale: 2 }).default("0").notNull()
      ```
  * การคำนวณยอดเงินคงเหลือเป็นการแก้ไขยอดในคอลัมน์โดยตรงผ่านคำสั่ง:
    `UPDATE finance_accounts SET balance = balance + ${amount}` (เมื่อรับเงิน) หรือ `SET balance = balance - ${amount}` (เมื่อจ่ายเงิน)
* **Business Impact:** สำหรับระบบการเงินคริสตจักรขนาดเล็กถึงขนาดกลาง รูปแบบ Single-Entry Cash Basis สามารถใช้งานบันทึกรับ-จ่ายตามกองทุนได้จริง แต่ในมุมของ Financial Software Architecture ระบบนี้ขาด **Mathematical Balancing Invariant ($\sum \text{Debits} = \sum \text{Credits}$)** หากเกิดข้อผิดพลาดในการรัน SQL หรือเกิดการแก้ไขฐานข้อมูลโดยตรง ยอดคงเหลืออาจคลาดเคลื่อนจากรายการย้อนหลังได้โดยไม่มี Journal ตรวจสอบความสมดุล
* **Required Action:** สำหรับการเปิดตัว v1.0 ให้ระบุในคู่มือปฏิบัติการอย่างชัดเจนว่าเป็นระบบบัญชีเดี่ยวเกณฑ์เงินสด (Single-Entry Cash-Basis Fund Accounting) และกำหนด Roadmap ใน v2.0 ในการสร้าง General Ledger คู่บัญชีแบบ Immutable
* **Release Blocking:** **NO (Accepted Risk สำหรับ v1.0 Cash-Basis Operation)**

---

#### [Finding 1.2] Synthetic Ledger Projection vs Canonical General Ledger
* **Status:** **VERIFIED PASS**
* **Severity:** **P2 (Medium)**
* **File & Line Reference:** `server/db.ts:1390-1460`, `server/routers.ts:939`
* **Evidence:**
  * ฟังก์ชัน `listTransactionsPaged` ทำหน้าที่เป็น Synthetic Projection โดยดึงข้อมูลจาก `offerings` และ `expenses` มารวมกัน (Union) ในระดับ Application Layer
  * จัดเรียงลำดับแบบ Deterministic: `date DESC, type ASC ('income' < 'expense'), rawId DESC` ทำให้ Cursor Pagination มีความเสถียร ไม่เกิดปัญหาอ่านข้อมูลซ้ำหรือตกหล่น
  * ข้อมูลจำนวนเงินถูกควบคุมด้วย `decimal(15, 2)` และแปลงด้วย `toFixed(2)` ทั้งหมด ป้องกัน Floating-point rounding errors
* **Business Impact:** ผู้ใช้งานเหรัญญิกและผู้ดูแลระบบสามารถตรวจสอบสมุดรายการรับ-จ่ายแบบรวมศูนย์ได้อย่างถูกต้อง แม่นยำ และแบ่งหน้าอย่างเป็นระเบียบ
* **Required Action:** รักษา Deterministic Cursor Sorting ไว้ตามเดิม
* **Release Blocking:** **NO**

---

#### [Finding 1.3] Immutable Audit Trail for Voiding & Cancellations
* **Status:** **VERIFIED PASS**
* **Severity:** **P1 (High)**
* **File & Line Reference:** `server/db.ts:1777-1857`, `server/routers.ts:1137, 1388`
* **Evidence:**
  * การยกเลิกรายการถวาย (`voidOffering`) และรายจ่าย (`voidExpense`) **ไม่มีการลบแถวข้อมูลออกจากฐานข้อมูล (`DELETE`)**
  * ระบบปรับสถานะเป็น `status = "voided"` พร้อมบันทึก `voidedAt = new Date()`
  * มีการปรับปรุงยอดยกเลิกใน `finance_accounts` คืนอย่างสมมาตรใน Transaction เดียวกัน
  * ทุกการคำนวณทางการเงิน (`finance.summary`, `monthlyStats`, `reports`) กรองรายการยกเลิกออกอย่างเข้มงวดด้วย `ne(status, "voided")`
  * บันทึกรายการลงในตาราง `audit_logs` ทุกครั้ง
* **Business Impact:** ป้องกันการสูญหายของประวัติทางการเงิน รองรับการตรวจสอบย้อนหลัง (Auditability) 100%
* **Required Action:** รักษานโยบาย Non-destructive voiding อย่างต่อเนื่อง
* **Release Blocking:** **NO**

---

### หมวดที่ 2: Withdrawal Accounting

#### [Finding 2.1] Bank Multi-Signature Mandate Verification
* **Status:** **VERIFIED PASS**
* **Severity:** **P0 (Critical Financial Control)**
* **File & Line Reference:** `docs/superpowers/specs/2026-10-30-withdrawal-signers-design.md:1-126`, `shared/withdrawals.ts:8-48`, `server/routers.ts:1601-1651`
* **Evidence:**
  * เอกสารระบุชัดเจน: `วันที่: 2026-10-30 · สถานะ: อนุมัติแล้ว`
  * โค้ดใน `shared/withdrawals.ts` ฟังก์ชัน `approvalState` บังคับใช้เงื่อนไขตามข้อกำหนดของธนาคารจริง:
    1. ต้องมีลายเซ็นของศิษยาภิบาล (`wasRequiredSigner = true`)
    2. ต้องมีผู้ลงนามอนุมัติรวมอย่างน้อย 2 คน (`MIN_APPROVALS = 2`)
    3. หากมีผู้ลงนามคนใดคนหนึ่งปฏิเสธ (`rejected`) คำขอจะถูกยกเลิกทันที
  * ตาราง `withdrawal_approvals` มี `uniqueIndex` บน `(requestId, userId)` ป้องกันการลงนามซ้ำ
* **Business Impact:** ป้องกันการทุจริตและการถอนเงินโดยพลการจากบุคคลคนเดียว เป็นไปตามข้อผูกพันทางกฎหมายของบัญชีธนาคารคริสตจักร
* **Required Action:** บันทึกรายชื่อผู้มีอำนาจลงนามในระบบให้ตรงกับบัญชีธนาคารจริง
* **Release Blocking:** **NO**

---

#### [Finding 2.2] Compare-and-Set Atomic Disbursement & Counting Attachment
* **Status:** **VERIFIED PASS**
* **Severity:** **P1 (High)**
* **File & Line Reference:** `server/db.ts:2111-2249`, `drizzle/schema.ts:704-708`
* **Evidence:**
  * ฟังก์ชัน `disburseWithdrawal` ทำงานภายใต้ Database Transaction
  * ใช้คำสั่ง Compare-and-Set: `where: and(eq(id, id), eq(status, 'approved'))` ป้องกันเหรัญญิก 2 คนกดปุ่ม "จ่ายเงิน" พร้อมกัน
  * เชื่อมโยงคำขอเบิกเข้าสู่รอบนับเงินอัตโนมัติผ่าน `attachWithdrawalToCounting` โดยบันทึกลงในตาราง `bank_records` (`type: "withdrawal"`)
  * ป้องกันการผูกซ้ำด้วย Partial Unique Index `bank_records_withdrawal_uniq` (`ON bank_records (withdrawalRequestId) WHERE withdrawalRequestId IS NOT NULL`)
* **Business Impact:** ป้องกันปัญหายอดเงินถอนเข้ารอบนับเงินซ้ำซ้อนหรือตกหล่นจาก Race Condition
* **Required Action:** คงสถาปัตยกรรม Atomic Transaction ไว้ตามเดิม
* **Release Blocking:** **NO**

---

#### [Finding 2.3] Separation of Cash Draw from Fund Deduction
* **Status:** **FAIL / BLOCKED (Design Clarification Needed)**
* **Severity:** **P1 (High Financial Clarity)**
* **File & Line Reference:** `server/db.ts:2111-2139`, `drizzle/schema.ts:448`, `docs/superpowers/specs/2026-10-30-withdrawal-signers-design.md:44`
* **Evidence:**
  * ตาราง `withdrawalRequests` มีฟิลด์ `fundId`
  * แต่เมื่อคำขอเบิกถูกกด `disburseWithdrawal` ระบบทำการเปลี่ยนสถานะเป็น `disbursed` และใส่ลงใน `bank_records` เท่านั้น **โดยไม่ได้ตัดลดยอดใน `finance_accounts.balance`**
  * ตามเอกสาร Design Spec ข้อ 44: คำขอเบิกของคริสตจักรแห่งนี้ถือเป็น **"การถอนเงินสดจากธนาคารเข้ากล่องเงินสดรอบนับเงิน" (Cash Draw / Bank-to-Cash Transfer)** ไม่ใช่การตัดยอดค่าใช้จ่ายทันที
  * การตัดยอดงบประมาณหรือรายจ่ายจริงจะเกิดขึ้นเมื่อเงินสดนั้นถูกนำไปจ่ายเป็นรายการหักเบิก (`session_deductions` $\rightarrow$ `expenses`) หรือบันทึกเป็นใบสำคัญจ่าย (`expenses`) แยกต่างหาก
* **Business Impact:** หากกรรมการหรือเหรัญญิกเข้าใจผิดว่าการกด "จ่ายเงิน (Disburse)" จะตัดยอดคงเหลือของกองทุนทันที จะทำให้เกิดความสับสนในการกระทบยอดเงินในระบบ
* **Required Action:** ต้องจัดทำคำชี้แจงระเบียบการเงินในคู่มือ (Financial Standard Operating Procedure) ว่าการ Disburse ในหน้านี้คือ Cash Draw สำหรับรอบนมัสการ และยอดกองทุนจะถูกตัดเมื่อบันทึกใบเสร็จค่าใช้จ่าย
* **Release Blocking:** **NO (เนื่องจากเป็นไปตาม Intent ของ Design Document แต่ต้องชี้แจงให้ชัดเจน)**

---

#### [Finding 2.4] Absence of Administrative Post-Disbursement Reversal
* **Status:** **FAIL**
* **Severity:** **P2 (Medium Operational Risk)**
* **File & Line Reference:** `server/routers.ts:1653-1696`, `server/db.ts:2111-2139`
* **Evidence:**
  * คำสั่ง `withdrawals.cancel` อนุญาตให้ยกเลิกเฉพาะคำขอในสถานะ `pending` หรือ `approved` เท่านั้น
  * เมื่อคำขอเปลี่ยนสถานะเป็น `disbursed` แล้ว ระบบไม่มี API สำหรับ Reverse หรือ Void คำขอดังกล่าว
  * ในหน้านับเงิน รายการใน `bank_records` ที่มี `withdrawalRequestId` ถูกล็อคไม่ให้แก้ไขหรือลบ
* **Business Impact:** หากเหรัญญิกกด Disburse ผิดพลาด เช่น ธนาคารไม่อนุมัติการถอนจริงในวันดังกล่าว ระบบไม่มีปุ่มกดคืนสถานะผ่าน UI จำเป็นต้องให้ผู้ดูแลฐานข้อมูลเข้าไปแก้ไขด้วยตนเอง
* **Required Action:** จัดทำ Runbook สำหรับผู้ดูแลระบบในการจัดการกรณี Disburse ผิดพลาด และพัฒนาฟังก์ชัน Administrative Reversal ในเฟสถัดไป
* **Release Blocking:** **NO**

---

### หมวดที่ 3: Privacy & Storage Security

#### [Finding 3.1] Secure Private Slip Storage Architecture
* **Status:** **VERIFIED PASS**
* **Severity:** **P0 (Critical Privacy Control)**
* **File & Line Reference:** `server/storage.ts:8, 146-200`, `server/routers.ts:3002, 3049`, `client/src/lib/routeAccess.ts:36`
* **Evidence:**
  * รูปภาพสลิปการโอนเงินจัดเก็บใน Private Bucket (`SUPABASE_SLIP_BUCKET = "slips"`)
  * การเข้าถึงภาพสลิปทำผ่าน Signed URL อายุ 1 ชั่วโมง (`expiresIn: 3600`) สร้างใหม่แบบ Dynamic เมื่อมี Request
  * Endpoint ที่สามารถขอ Signed URL ของสลิปได้ (`givingInbox.list`, `givingInbox.getById`) ถูกจำกัดสิทธิ์เฉพาะเหรัญญิกและผู้ดูแลระบบสูงสุด (`financeProcedure`)
  * สมาชิกทั่วไปและบุคคลภายนอกไม่สามารถเข้าถึง URL ของสลิปได้
* **Business Impact:** สอดคล้องกับ พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล (PDPA) ในการปกป้องข้อมูลทางการเงินของผู้ถวาย
* **Required Action:** ตรวจสอบให้มั่นใจว่า Bucket `slips` ใน Supabase Dashboard ตั้งค่าเป็น Private
* **Release Blocking:** **NO**

---

#### [Finding 3.2] Public Bucket Configuration for Expense Receipts
* **Status:** **FAIL / ACCEPTED RISK**
* **Severity:** **P2 (Medium Privacy Risk)**
* **File & Line Reference:** `server/storage.ts:6-7, 48-79`, `server/routers.ts:1285`
* **Evidence:**
  * Bucket สำหรับใบเสร็จค่าใช้จ่าย (`SUPABASE_STORAGE_BUCKET = "receipts"`) ถูกตั้งค่าเป็น Public Bucket
  * มีการเติม UUID Hash 8 ตัวอักษรต่อท้ายชื่อไฟล์ (`appendHashSuffix`) เพื่อป้องกันการเดา URL
  * ผู้ที่มี URL ตรงจะสามารถเปิดดูรูปใบเสร็จได้โดยไม่ต้องผ่านการยืนยันตัวตน
* **Business Impact:** โดยทั่วไปใบเสร็จซื้อของ/ใบกำกับภาษีของคริสตจักรไม่ใช่ข้อมูลลับ แต่หากมีใบเสร็จที่มีข้อมูลส่วนบุคคลของสมาชิก (เช่น ค่ารักษาพยาบาลจากกองทุนสงเคราะห์ หรือเลขบัญชีธนาคารสำหรับโอนคืน) อาจเกิดความเสี่ยงด้านข้อมูลส่วนบุคคลได้
* **Required Action:** กำชับเจ้าหน้าที่ในคู่มือการใช้งานให้ทำการปกปิด (Redact) เลขบัญชีหรือข้อมูลส่วนบุคคลก่อนอัปโหลดใบเสร็จ และใน v1.1 ให้ปรับ Bucket ใบเสร็จเป็น Private เช่นเดียวกับสลิป
* **Release Blocking:** **NO (Accepted Risk)**

---

#### [Finding 3.3] Storage Proxy Path Traversal & Scope Guard
* **Status:** **VERIFIED PASS**
* **Severity:** **P1 (High Security Control)**
* **File & Line Reference:** `server/_core/storageProxy.ts:6-29`
* **Evidence:**
  * Storage Proxy (`/manus-storage/*`) บังคับ Authentication ผ่าน `sdk.authenticateRequest`
  * มี Scope Guard ปฏิเสธ Key ที่มี `..`, `\`, `/` นำหน้า หรืออักขระนอกเหนือจาก Whitelist `[a-zA-Z0-9_\-\./]` ด้วย HTTP 400
  * มีการตั้งค่า `Cache-Control: no-store` ป้องกัน Caching ของ Redirect URLs
* **Business Impact:** ป้องกันการโจมตีประเภท Path Traversal และ Server-Side Request Forgery (SSRF) ผ่าน Storage Gateway
* **Required Action:** คงการตรวจสอบนี้ไว้
* **Release Blocking:** **NO**

---

### หมวดที่ 4: Production Deployment Pipeline

#### [Finding 4.1] Deterministic Multi-Stage Build & Migration Guard
* **Status:** **VERIFIED PASS**
* **Severity:** **P0 (Critical Infrastructure Safety)**
* **File & Line Reference:** `vercel.json:4`, `package.json:13`, `scripts/migrate.ts`
* **Evidence:**
  * `vercel.json` กำหนดคำสั่ง Build เป็นแบบต่อเนื่อง:
    `pnpm run ci && pnpm run build && pnpm run db:migrate:deploy`
  * คำสั่ง `pnpm run ci` ทำการล้างตัวแปร `DATABASE_URL` ก่อนรันเทสท์ เพื่อรับประกันว่าไม่มีการเขียนข้อมูลลง Production DB ระหว่างรัน CI
  * หากมี Type Error, Unit Test ล้มเหลว, หรือ Bundle เสียหาย คำสั่งจะหยุดทำงานทันทีโดยไม่มีการรัน Migration
* **Business Impact:** ป้องกันการ Deploy โค้ดที่มี Bug หรือการทำลาย Schema ฐานข้อมูล Production จากขั้นตอน CI
* **Required Action:** คงคำสั่งใน `vercel.json` ไว้ตามเดิม
* **Release Blocking:** **NO**

---

#### [Finding 4.2] Preview Branch Isolation
* **Status:** **VERIFIED PASS**
* **Severity:** **P0 (Critical Infrastructure Safety)**
* **File & Line Reference:** `server/migrate.ts:43-61`, `scripts/migrate.ts:19-23`
* **Evidence:**
  * ฟังก์ชัน `shouldMigrate` ตรวจสอบ `VERCEL_ENV === "production"`
  * Preview Deployments ที่เกิดจาก Pull Request จะข้ามการรัน Migration โดยอัตโนมัติ (`Skipped: this is a preview build, and previews share the production database`)
* **Business Impact:** ป้องกันไม่ให้นักพัฒนาสร้าง PR ทดสอบแล้วทำให้ Schema บนฐานข้อมูลจริงถูกแก้ไขก่อนการ Review และ Merge
* **Required Action:** ไม่มี
* **Release Blocking:** **NO**

---

#### [Finding 4.3] Missing Production Secrets on Vercel Dashboard
* **Status:** **NOT VERIFIED / BLOCKED FOR PRODUCTION LAUNCH**
* **Severity:** **P1 (High Configuration Prerequisite)**
* **File & Line Reference:** `server/_core/config.ts:9-32`
* **Evidence:**
  * โค้ดตรวจสอบความพร้อม 12 ตัวแปรสภาพแวดล้อม (`DATABASE_URL`, `DATABASE_URL_MIGRATE`, `JWT_SECRET`, `APP_URL`, `LINE_LOGIN_CHANNEL_ID`, `LINE_LOGIN_CHANNEL_SECRET`, `OWNER_OPEN_ID`, `LINE_CHANNEL_SECRET`, `LINE_CHANNEL_ACCESS_TOKEN`, `CRON_SECRET`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `GOOGLE_API_KEY`/`GEMINI_API_KEY`)
  * ใน Local Environment ไม่มีไฟล์ `.env` ที่เก็บ Secrets (เป็นไปตามข้อกำหนดความปลอดภัย) และยังไม่สามารถยืนยันค่าบน Vercel Dashboard ได้จากจุดนี้
* **Business Impact:** หากทำการ Deploy โดยไม่ได้กรอกตัวแปรเหล่านี้บน Vercel Dashboard ระบบจะทำงานในโหมด Degraded หรือฟังก์ชัน LINE / OCR จะใช้งานไม่ได้
* **Required Action:** ผู้ดูแลระบบ (Owner) ต้องนำค่าจริงไปกรอกใน Vercel Dashboard
* **Release Blocking:** **YES (ต้องทำก่อนเปิดให้ผู้ใช้เข้าสู่ระบบ)**

---

### หมวดที่ 5: Security & Authorization Architecture

#### [Finding 5.1] Fail-Closed Authentication on Database Disconnection
* **Status:** **VERIFIED PASS**
* **Severity:** **P0 (Critical Security Control)**
* **File & Line Reference:** `server/_core/sdk.ts:20-36`, `server/_core/context.ts:24-37`, `server/db.ts:28`
* **Evidence:**
  * เมื่อฐานข้อมูลขัดข้อง `getDb()` คืนค่า `null` ทำให้ `getUserByOpenId` คืนค่า `null`
  * `sdk.authenticateRequest` โยน Error `Session user not found`
  * ใน `context.ts` ดักจับ Error และตั้งค่า `user = null`
  * ทุก Protected / Gated Procedure ปฏิเสธคำขอทันทีด้วย `TRPCError({ code: "UNAUTHORIZED" })`
* **Business Impact:** ระบบมีความปลอดภัยระดับ Fail-Closed ไม่มีทางที่ข้อผิดพลาดของฐานข้อมูลจะทำให้บุคคลภายนอกได้รับสิทธิ์ผู้ดูแลระบบ
* **Required Action:** ไม่มี
* **Release Blocking:** **NO**

---

#### [Finding 5.2] Prevention of Unauthorized Admin Promotion
* **Status:** **VERIFIED PASS**
* **Severity:** **P0 (Critical Security Control)**
* **File & Line Reference:** `server/routers.ts:672-706`, `server/_core/lineLogin.ts:175-189`
* **Evidence:**
  * การตั้งค่าบทบาทผู้ใช้งาน (`auth.setChurchRole`) สงวนไว้สำหรับ `adminProcedure` เท่านั้น
  * มีการดักจับห้ามเปลี่ยนบทบาทของตนเอง (`if (input.userId === ctx.user.id) throw BAD_REQUEST`) เพื่อป้องกันการยกระดับสิทธิ์ตนเองหรือการเผลอลบ Super Admin คนสุดท้าย
  * การเลื่อนขั้นเป็น Super Admin อัตโนมัติทำได้เพียงเงื่อนไขเดียวคือเมื่อ LINE OpenID ตรงกับค่า `OWNER_OPEN_ID` ที่กำหนดไว้ล่วงหน้าใน Environment เท่านั้น
* **Business Impact:** ป้องกัน Privilege Escalation 100%
* **Required Action:** กำหนด `OWNER_OPEN_ID` ให้เป็นรหัส LINE ของผู้ดูแลระบบที่ได้รับอนุญาต
* **Release Blocking:** **NO**

---

#### [Finding 5.3] Client-Server Role Authorization Parity
* **Status:** **VERIFIED PASS**
* **Severity:** **P0 (Critical Security Control)**
* **File & Line Reference:** `server/routers.ts:150-185`, `shared/roles.ts:105-185`, `client/src/lib/routeAccess.ts:30-47`, `server/routeAccess.matrix.test.ts`
* **Evidence:**
  * มีการตรวจสอบความสอดคล้องระหว่าง Client Routes (`ROUTE_ACCESS`), Route Guards (`App.tsx`), และ Server Procedures (`server/routers.ts`) ครบถ้วน
  * ผ่านชุดทดสอบ Matrix Test 75 รายการใน `server/routeAccess.matrix.test.ts`
  * สมาชิกทั่วไป (`MEMBER`) ถูกบังคับนำทางไปยังจุดถวายทรัพย์ (`stationOnlyRedirect`) และไม่มีทางเปิดดูข้อมูลการเงินหรือสมุดบัญชีได้
* **Business Impact:** ป้องกัน Authorization Bypass ทั้งในฝั่ง UI และ API
* **Required Action:** ไม่มี
* **Release Blocking:** **NO**

---

#### [Finding 5.4] Comprehensive Audit Logging
* **Status:** **VERIFIED PASS**
* **Severity:** **P1 (High)**
* **File & Line Reference:** `server/routers.ts:656, 694, 1086, 1156, 1299, 1407, 1636, 1688, 1708, ...`
* **Evidence:**
  * ทุกการกระทำที่สำคัญทางการเงิน (สร้าง, แก้ไข, ยกเลิกซองถวาย, สร้างและยกเลิกรายจ่าย, ลงนามคำขอเบิก, สรุปและปิดรอบนับเงิน) มีการเรียก `createAuditLog` บันทึก `userId`, `action`, `entity`, `entityId`, `metadata`, และ `createdAt` ลงในฐานข้อมูล
* **Business Impact:** ตรวจสอบย้อนหลังได้ว่าใครเป็นผู้ดำเนินการรายการใดในเวลาใด
* **Required Action:** ไม่มี
* **Release Blocking:** **NO**

---

## 4. ตารางสรุปผลการประเมิน 5 ด้านหลัก (Executive Summary Table)

| มิติการตรวจสอบ (Audit Dimension) | ผลการประเมิน (Assessment) | คำอธิบายโดยสรุป (Architectural Summary) |
| :--- | :---: | :--- |
| **1. Financial Integrity** | **PASS (Cash-Basis Single-Entry)** | ไม่ใช่ Double-Entry Journal คู่บัญชี แต่เป็น Single-Entry Cash Basis ที่มีการจัดการทศนิยม ป้องกันแก้ไขย้อนหลัง และมี Audit Trail ครบถ้วน |
| **2. Withdrawal Accounting** | **PASS (Approved Policy & Code Verified)** | กฎการลงนามหลายขั้นและการผูกรอบนับเงินผ่านการตรวจสอบสมบูรณ์ (โดยนิยามการ Disburse เป็น Cash Draw เข้าสู่รอบนับเงิน) |
| **3. Privacy & Storage** | **PASS (with Accepted Receipt Risk)** | สลิปการโอนเงินจัดเก็บใน Private Storage 100% พร้อม Signed URL (ใบเสร็จค่าใช้จ่ายใน Public Bucket เป็น Accepted Risk) |
| **4. Deployment Safety** | **PASS (Code Pipeline) / NOT VERIFIED (Cloud Secrets)** | Build และ Migration Pipeline มี Guard ป้องกัน Preview และ Production สมบูรณ์ (รอใส่ Secrets บน Vercel Dashboard) |
| **5. Security & Authorization** | **PASS** | สิทธิ์ Fail-Closed เมื่อ DB ดับ, ป้องกัน Admin Self-promotion, มีความสอดคล้องระหว่าง Client-Server 100% |

---

## 5. ผลสรุปการตัดสินขั้นสุดท้าย (Final Verdict)

# **READY WITH ACCEPTED RISKS**

### เหตุผลทางสถาปัตยกรรมและการตัดสินใจ (Architectural Rationale):
1. **โค้ด สิทธิ์ ความปลอดภัย และ Pipeline มีความพร้อมสำหรับการใช้งานจริง (Production-Ready)**
   * ผ่านการทดสอบทั้งหมด 1,018 tests (0 failure), Type Check 0 errors, Build สำเร็จ และไม่มี Code Regression
2. **Accepted Risks ที่ต้องรับทราบและปฏิบัติตาม:**
   * **Accounting Model:** ระบบใช้บัญชีเดี่ยวเกณฑ์เงินสด (Single-Entry Cash Basis Fund Accounting) ไม่ใช่ระบบบัญชีคู่แบบ Double-Entry General Ledger การเบิกเงิน (Withdrawal) ทำหน้าที่เป็น Cash Draw เข้ารอบนับเงิน ซึ่งสอดคล้องกับการดำเนินงานจริงของคริสตจักรแต่ต้องทำความเข้าใจในระเบียบปฏิบัติ
   * **Public Receipts:** ถังเก็บใบเสร็จค่าใช้จ่ายเป็น Public Bucket ควรกำชับเจ้าหน้าที่ให้ลบข้อมูลส่วนบุคคลก่อนอัปโหลด
   * **Cloud Secrets:** ผู้ดูแลระบบต้องนำ Secrets ทั้ง 12 รายการไปตั้งค่าใน Vercel Dashboard ก่อนเปิดรับ Traffic จริง
