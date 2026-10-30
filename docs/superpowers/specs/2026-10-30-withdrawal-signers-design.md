# ส่วนที่ 2: อนุมัติเบิกตามผู้มีอำนาจลงนามในบัญชีธนาคาร

วันที่: 2026-10-30 · สถานะ: อนุมัติแล้ว (2026-10-30 ผู้ใช้สั่งเขียนแผนต่อ)
ต่อจาก: ส่วนที่ 1 (`2026-10-30-counting-carry-forward-design.md`, PR #57) — ใช้ประเภทรายการธนาคาร `withdrawal` ของส่วนนั้น ทำเป็น stacked PR บน `feat/counting-carry-forward`

## เจตนาและเหตุผล

บัญชีธนาคารของโบสถ์เปิดโดยมีผู้มีอำนาจลงนาม 3 คน (ศิษยาภิบาล, ผู้ช่วยศิษยาภิบาล, ฝ่ายการเงิน) ธนาคารให้ถอนได้เมื่อ **ศิษยาภิบาลลงนามทุกครั้ง + อีกอย่างน้อย 1 คน**

ระบบปัจจุบัน (`withdrawals.approve`) ไม่ตรงกับเงื่อนไขธนาคาร:
- คนเดียวอนุมัติก็ผ่าน
- ผู้อนุมัติคือ SUPER_ADMIN/TREASURER ตามบทบาท (`canApproveWithdrawals`) — ศิษยาภิบาลอนุมัติไม่ได้
- "จ่ายแล้ว" (`disburse`) แค่เปลี่ยนสถานะ ไม่ไปถึงรอบนับเงิน เหรัญญิกต้องพิมพ์ยอดถอนซ้ำ

ถ้าแอปบอก "อนุมัติแล้ว" แต่ธนาคารไม่ยอมให้ถอน การอนุมัติในแอปก็ไม่มีความหมาย

## เป้าหมาย

- การอนุมัติผูกกับ **ตัวบุคคล** ที่มีชื่อในบัญชีธนาคาร ไม่ใช่บทบาท
- กติกาเดียวกับธนาคาร: ผู้ลงนามที่ "ต้องลงนามทุกครั้ง" อนุมัติ **และ** ผู้ลงนามอนุมัติรวมอย่างน้อย 2 คน
- ทุกลายเซ็นเป็นรายการแยกที่ตรวจย้อนหลังได้และไม่หายเมื่อกดพร้อมกัน
- กด "จ่ายแล้ว" → รายการ "ถอนเงินสดจากธนาคาร" เข้ารอบนับเงินเอง

## ไม่ทำ

- แจ้งเตือนผ่าน LINE (ทำทีหลัง)
- วงเงินหลายระดับ (เช่น เกิน X บาทต้องครบ 3 คน)
- เปลี่ยนวิธีสร้างคำขอเบิก (`withdrawals.create` คงเดิม)
- เชื่อมสลิป LINE (ส่วนที่ 3)

## ต่อต้าน

- แอปอนุมัติได้ในกรณีที่ธนาคารไม่ยอมให้ถอน
- ลายเซ็นหายหรือถูกเขียนทับเมื่อสองคนกดพร้อมกัน
- ยอดถอนเข้ารอบนับเงินซ้ำ 2 ครั้ง หรือไม่เข้าเลยโดยไม่มีใครรู้

## การตัดสินใจของผู้ใช้

1. ผูกกับ 3 คนที่มีชื่อในบัญชีธนาคาร (ไม่ใช่บทบาท)
2. ศิษยาภิบาลต้องลงนามทุกครั้ง + อย่างน้อยอีก 1 คน มากกว่านั้นได้
3. ผู้ขอเป็นผู้ลงนามเอง: ลายเซ็นของตัวเองนับ แต่ต้องมีผู้ลงนามอีกคน (กติกาข้อ 2 ครอบอยู่แล้ว)
4. ปฏิเสธคนเดียว = ยกเลิกคำขอทันที
5. กด "จ่ายแล้ว" → เพิ่ม "ถอนเงินสดจากธนาคาร" เข้ารอบนับเงินอัตโนมัติ ถ้ายังไม่มีรอบ ให้รอเข้ารอบวันอาทิตย์ถัดไป
6. แนวทาง A (ตารางแยก) และทำเป็น stacked PR

## แนวทางที่พิจารณา

| แนวทาง | ได้ | เสีย |
|---|---|---|
| **A. ตาราง `bank_signers` + `withdrawal_approvals` หนึ่งแถวต่อลายเซ็น** (เลือก) | ตรวจย้อนหลังได้ทีละลายเซ็น, unique index กันเซ็นซ้ำ, กดพร้อมกันไม่ทับ | 2 ตารางใหม่ |
| B. คอลัมน์บน `users` + ลายเซ็นเป็น JSON ใน `withdrawal_requests` | งานน้อยกว่า | กดพร้อมกันแล้วลายเซ็นหายได้เงียบๆ, ตรวจย้อนหลังยาก |
| C. เพิ่มบทบาทผู้ช่วยศิษยาภิบาล อนุมัติตามบทบาท | ใช้ระบบบทบาทเดิม | ตัดทิ้ง: ผู้ใช้เลือกผูกกับตัวบุคคล |

## การออกแบบ

### ข้อมูล (`drizzle/schema.ts` + `server/schema_init.ts` + `drizzle/0007_withdrawal_signers.sql`)

**`bank_signers`** — ผู้มีอำนาจลงนามปัจจุบัน
- `id` serial, `churchId` varchar(64), `userId` integer not null, `isRequired` boolean default false, `addedBy` integer, `createdAt`
- unique (`churchId`, `userId`); partial unique index: `isRequired = true` ได้ไม่เกิน 1 แถวต่อ `churchId`

**`withdrawal_approvals`** — หนึ่งแถวต่อผู้ลงนามต่อคำขอ
- `id`, `churchId`, `requestId` integer not null, `userId` integer not null, `decision` varchar(10) (`approved` | `rejected`), `note` text, `wasRequiredSigner` boolean not null, `createdAt`
- unique (`requestId`, `userId`)

**`withdrawal_requests`** เพิ่ม: `disbursedAt` timestamp, `disbursedBy` integer, `cancelledAt` timestamp, `cancelledBy` integer, `cancelReason` text
**`withdrawal_status`** enum เพิ่ม `cancelled` (`ALTER TYPE ... ADD VALUE IF NOT EXISTS`)
**`bank_records`** เพิ่ม `withdrawalRequestId` integer; partial unique index ที่ไม่ null (คำขอหนึ่งเข้ารอบได้ครั้งเดียว)

### กติกาอนุมัติ (ฟังก์ชันบริสุทธิ์ใน `shared/withdrawals.ts`)

```
approvalState(signatures) →
  "rejected"  ถ้ามีลายเซ็น rejected ใดๆ
  "approved"  ถ้ามี approved ที่ wasRequiredSigner และ approved รวม ≥ 2 คน
  "pending"   นอกนั้น
```
ส่งคืนพร้อม `missingRequired: boolean`, `approvedCount: number` ให้หน้าจอแสดงความคืบหน้า

### ขั้นตอน (`withdrawals` router)

- `withdrawals.sign` (แทน `approve`) — `protectedProcedure` + ต้องอยู่ใน `bank_signers` ไม่งั้น `FORBIDDEN`; input `{ id, decision, note }`; `rejected` ต้องมี `note`
  - ใน transaction: คำขอต้อง `pending` (ไม่งั้น `CONFLICT`) → insert ลายเซ็น (`wasRequiredSigner` จาก `bank_signers` ขณะนั้น; ซ้ำ → `CONFLICT` "คุณลงนามคำขอนี้แล้ว") → อ่านลายเซ็นทั้งหมด → `approvalState` → ถ้า `approved`/`rejected` เปลี่ยนสถานะแบบ compare-and-set จาก `pending` และตั้ง `approvedBy`/`approvalDate` (หรือ `rejectionReason`)
  - ลบ `approve` เดิม และ `canApproveWithdrawals`
- `withdrawals.cancel` — ผู้ขอ หรือผู้ลงนาม; สถานะ `pending`/`approved` เท่านั้น; ต้องมีเหตุผล
- `withdrawals.disburse` — คงสิทธิ์ `financeProcedure`; `approved` → `disbursed` + `disbursedAt`/`disbursedBy`; แล้วผูกเข้ารอบนับเงิน (ด้านล่าง) ใน transaction เดียวกัน
- `withdrawals.list` — ผู้ลงนามเห็นทุกคำขอเหมือนฝ่ายการเงิน; แต่ละคำขอแนบลายเซ็น (ชื่อ, การตัดสินใจ, เวลา) และ `approvalState`

### ผูกเข้ารอบนับเงิน (`server/db.ts`)

- `attachWithdrawalToCounting(requestId)`: หารอบที่ `serviceDate` (วันที่, เวลาไทย) ≥ วันที่ `disbursedAt` และสถานะยังไม่ `posted`/`closed` เรียงตาม `(serviceDate, serviceRound, id)` เอารอบแรก → insert `bank_records` (`type: "withdrawal"`, `amount`, `withdrawalRequestId`, `occurredAt: disbursedAt`, `notes: purpose`) ถ้าไม่มีรอบ ไม่ทำอะไร
- `counting.create`: หลังสร้างรอบ เรียก `attachPendingWithdrawals(session)` ผูกคำขอ `disbursed` ที่ยังไม่มี `bank_records` และวันที่ `disbursedAt` ≤ วันที่ของรอบ
- รายการธนาคารที่มี `withdrawalRequestId` ลบหรือแก้จากหน้านับเงินไม่ได้; `resetCountingSession` **ไม่ลบ** แถวเหล่านี้

### ผู้มีอำนาจลงนาม (`bankSigners` router, หน้า Settings)

- `list` (ผู้ลงนามและฝ่ายการเงินอ่านได้), `add({ userId })`, `remove({ userId })`, `setRequired({ userId })` — แก้ไขได้เฉพาะ SUPER_ADMIN, audit ทุกครั้ง
- `setRequired` ย้ายธง "ต้องลงนามทุกครั้ง" ให้คนใหม่ใน transaction เดียว
- เตือนบนหน้าจอเมื่อรายชื่อยังไม่มีคน "ต้องลงนามทุกครั้ง" หรือมีน้อยกว่า 2 คน (อนุมัติอะไรไม่ได้)

### หน้าจอ

- **Settings**: ส่วน "ผู้มีอำนาจลงนามบัญชีธนาคาร" — รายชื่อ, เพิ่มจากผู้ใช้ในระบบ, ลบ, เลือกคนที่ต้องลงนามทุกครั้ง
- **Approvals**: แต่ละคำขอแสดงลายเซ็นทีละคน และสิ่งที่ยังขาด ("รอศิษยาภิบาล", "รออีก 1 คน"); ปุ่ม อนุมัติ/ปฏิเสธ (เฉพาะผู้ลงนามที่ยังไม่เซ็น), จ่ายแล้ว (ฝ่ายการเงิน, เมื่อ approved), ยกเลิก
- **Home task queue**: คำขอที่รอลายเซ็น *ของฉัน* แสดงให้ผู้ลงนาม
- `auth.me` ส่ง `isBankSigner` ให้ `canAccessRoute("/approvals")` เปิดให้ผู้ลงนามด้วย

## เรื่องที่ผมตัดสินเอง

1. **SUPER_ADMIN จัดการรายชื่อผู้ลงนาม** ในหน้า Settings
2. **ครบ "ศบ. + 1" แล้วอนุมัติทันที** ผู้ลงนามคนที่ 3 ปฏิเสธภายหลังไม่ได้ ถ้ามีปัญหาใช้ "ยกเลิกคำขอ" ก่อนจ่าย
3. **ยกเลิกได้โดยผู้ขอหรือผู้ลงนาม** ก่อนกด "จ่ายแล้ว" ต้องมีเหตุผล
4. **บันทึก `wasRequiredSigner` ไว้ในลายเซ็น** — เปลี่ยนตัวผู้ลงนามภายหลังไม่ทำให้คำขอที่เซ็นไปแล้วเปลี่ยนผล
5. **ผู้ลงนามที่ถูกถอดออกจากรายชื่อ** ลายเซ็นที่ให้ไปแล้วยังนับ แต่เซ็นใหม่ไม่ได้
6. **กด "จ่ายแล้ว" ยังเป็นสิทธิ์ฝ่ายการเงิน** เหมือนเดิม
7. **ไม่ย้อนแก้คำขอเก่า**: คำขอ `pending` ที่มีอยู่ตอน deploy ใช้กติกาใหม่; `approved` เดิมยังกดจ่ายได้
8. **รีเซ็ตรอบนับเงินไม่ลบยอดถอนที่มาจากคำขอ** เพื่อไม่ให้ยอดหายไปจากระบบ

## เหลือให้ผู้สร้างตัดสิน

- ข้อความภาษาไทยบนหน้าจอ
- การจัดวางในหน้า Approvals/Settings ภายใต้ design token เดิม
