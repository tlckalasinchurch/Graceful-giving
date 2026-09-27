# การตัดสินใจทางบัญชีสำหรับการเบิกเงิน

**วันที่:** 2026-09-26  
**สถานะ:** การวิเคราะห์การตัดสินใจเท่านั้น — ไม่อนุญาตให้ทำการ implement  
**ขอบเขต:** เฉพาะความหมายทางบัญชีของการเบิกเงินเท่านั้น ไม่มีการเปลี่ยน code, schema, หรือ migration

## พฤติกรรมปัจจุบัน

### วงจรชีวิตของคำขอเบิกเงิน

```text
request (pending/รอดำเนินการ)
  ↓
approve (approved/อนุมัติ หรือ rejected/ปฏิเสธ)
  ↓
disburse (disbursed/จ่ายเงินแล้ว)
```

### การ Implement ปัจจุบัน

**สถานะ: PENDING → APPROVED**
- Input: `amount` (จำนวนเงิน), `purpose` (วัตถุประสงค์), `details` (รายละเอียด), optional `fundId` (รหัสกองทุน)
- Database change: อัปเดต `withdrawal_requests.status` เป็น `"approved"` หรือ `"rejected"`
- Sets: `approvedBy` (ผู้อนุมัติ), `approvalDate` (วันที่อนุมัติ), `approvalNote` (บันทึกอนุมัติ) หรือ `rejectionReason` (เหตุผลปฏิเสธ)
- **Financial effect:** ไม่มี
- Evidence: `server/routers.ts:762-790`, `server/db.ts:950-979`

**สถานะ: APPROVED → DISBURSED**
- Input: withdrawal `id` (รหัสการเบิกเงิน)
- Database change: อัปเดต `withdrawal_requests.status` เป็น `"disbursed"`
- **Financial effect:** ไม่มี — เปลี่ยนเฉพาะสถานะ
- Evidence: `server/routers.ts:791-799`, `server/db.ts:981-999`

### บันทึกทางการเงินที่สร้างขึ้น

**ไม่มี** — การ implement ปัจจุบันไม่สร้างบันทึกทางการเงินใดๆ ระหว่างการอนุมัติหรือการจ่ายเงิน ไม่มีการเปลี่ยน `finance_accounts.balance`, ไม่มี journal entries, ไม่มี expense records

### การเปรียบเทียบกับ Flow ทางการเงินที่มีอยู่

| Flow | บันทึกทางการเงินที่สร้าง | ผลกระทบต่อยอดเงิน | Journal |
|------|------------------------|----------------|---------|
| การสร้าง offering | แถว `offerings` | เพิ่ม `finance_accounts.balance` | ไม่มี |
| การสร้าง expense | แถว `expenses` | ลด `finance_accounts.balance` | ไม่มี |
| การจ่ายเงินเบิก | **ไม่มี** | **ไม่มี** | **ไม่มี** |

**Evidence:** `server/db.ts:486-505` (การเพิ่มยอดเงิน offering), `server/db.ts:640-658` (การลดยอดเงิน expense), `server/db.ts:981-999` (การเปลี่ยนสถานะเบิกเงินเท่านั้น)

## ความหมายทางการเงิน

### การตีความ Domain ที่เป็นไปได้

จากโมเดล codebase ปัจจุบันและการตัดสินใจสถาปัตยกรรมที่อนุมัติแล้ว การเบิกเงินอาจหมายถึง:

**A. Expense (รายจ่าย)**
- คล้ายกับ manual expenses: การใช้จ่ายของคริสตจักรเพื่อวัตถุประสงค์
- Evidence: ตาราง `expenses` มี `amount`, `category`, `fundId`, `payee`, `status`
- การเบิกเงินปัจจุบันมี `purpose`, `fundId`, `amount` — รูปร่างคล้ายกัน
- วงจรชีวิต expense: `draft → approved → paid → voided`
- วงจรชีวิต withdrawal: `pending → approved → disbursed` (ขนานกัน)

**B. Transfer between funds (โอนย้ายระหว่างกองทุน)**
- การย้ายจากกองทุนหนึ่งไปอีกกองทุนหนึ่ง
- Evidence: Architecture Decision 2 กำหนดโมเดล allocation แต่ไม่ได้กล่าวถึง inter-fund transfers
- ไม่มีตาราง transfer หรือ transaction type ใน schema ปัจจุบัน
- การเบิกเงินมี `fundId` เพียงอันเดียว ไม่ใช่ source + destination

**C. Liability settlement (การชำระหนี้สิน)**
- การจ่ายหนี้สิน (เงินที่ค้างจ่ายให้ใคร)
- Evidence: ไม่มีตาราง liability หรือ payable tracking
- การเบิกเงินมีฟิลด์ `purpose` แต่ไม่มีการระบุ payee (ต่างจาก expenses)

**D. Domain-specific withdrawal type (ประเภทการเบิกเงินเฉพาะ domain)**
- ประเภท transaction ทางการเงินที่แยกต่างหากจาก expenses
- Evidence: ตาราง `withdrawal_requests` มีอยู่เป็น entity แยกจาก `expenses`
- มี status enum และ workflow การอนุมัติของตัวเอง
- Architecture Decision 1 ไม่ได้จัดประเภทความหมายของการเบิกเงินอย่างชัดเจน

### โมเดลปัจจุบันรองรับ

**Schema ปัจจุบันรองรับ:**
- A (Expense): ตาราง `expenses` พร้อมการเชื่อมโยงกองทุนและ workflow สถานะ
- D (Domain-specific): ตาราง `withdrawal_requests` เป็น workflow การอนุมัติแยกต่างหาก

**Schema ปัจจุบันไม่รองรับ:**
- B (Transfer): ไม่มีกลไก inter-fund transfer
- C (Liability): ไม่มี liability/payable tracking

### ความสอดคล้องกับ Architecture Decision

Decision 1 (Hybrid Financial Source of Truth) ระบุว่า:
- "Canonical financial fact is an immutable journal entry set associated with an approved financial transaction"
- "The transaction record is the operational/business document"
- "Posted journal sets are immutable; reversal appends compensating entries"

Decision 2 (Fund Allocation) ระบุว่า:
- "Fund is required at posting/approval"
- "Unresolved fund is allowed only before approval/posting"

**สถานะ:** ความหมายทางการเงินของการเบิกเงิน **ต้องการการตัดสินใจจาก Owner** ระหว่าง (A) Expense subtype หรือ (D) Separate withdrawal transaction type

## บัญชี Debit

### บัญชี Debit ที่เป็นไปได้

จากโมเดล `finance_accounts` ปัจจุบัน (บรรทัด 287-304 ใน schema):

**1. Expense/Payment Account (บัญชีรายจ่าย/การจ่ายเงิน)**
- Debit เมื่อคริสตจักรจ่ายเงินออก
- Evidence: Expenses ปัจจุบันลด `finance_accounts.balance` (credit effect ในคำศัพท์บัญชี)
- ไม่มี expense account type ที่ชัดเจนใน schema

**2. Specific Fund Account (บัญชีกองทุนเฉพาะ)**
- Debit กองทุนเฉพาะที่เบิกเงินจาก
- Evidence: การเบิกเงินมีฟิลด์ `fundId` แบบ optional
- Expenses ปัจจุบันก็ใช้ `fundId`
- `finance_accounts.type` enum: `general`, `tithe`, `mission`, `building`, `welfare`, `special`

**3. Cash/Bank Account (บัญชีเงินสด/ธนาคาร)**
- Debit เงินสด/ธนาคารที่มีเมื่อเกิดการจ่ายเงิน
- Evidence: ตาราง `bank_records` ติดตาม deposits/transfers
- ไม่มี cash/bank account type ที่ชัดเจนใน `finance_accounts`

### ข้อจำกัดของโมเดลปัจจุบัน

- `finance_accounts` มี `type` enum แต่ไม่มี "cash" หรือ "bank" account type ที่ชัดเจน
- ไม่มี chart of accounts แยกจาก fund types
- Expense flow ปัจจุบัน: ลด `finance_accounts.balance` โดยตรงโดยไม่มีการจัดประเภทบัญชี

**สถานะ:** บัญชี Debit **ต้องการการตัดสินใจจาก Owner** — ต้องการคำนิยาม chart of accounts

## บัญชี Credit

### บัญชี Credit ที่เป็นไปได้

**1. Cash/Bank Account (บัญชีเงินสด/ธนาคาร)**
- Credit เงินสด/ธนาคารเมื่อเงินออก
- Evidence: `bank_records` ติดตาม bank deposits และ transfers
- Architecture Decision 1 กล่าวถึง "bank reconciliation" แต่ไม่มี bank account ที่ชัดเจน

**2. Payable/Liability Account (บัญชีหนี้สิน)**
- Credit liability เมื่อชำระ
- Evidence: ไม่มีตาราง liability

**3. Suspense/Disbursement Account (บัญชีชั่วคราว/การจ่ายเงิน)**
- Credit บัญชีชั่วคราวระหว่างการจ่ายเงิน
- Evidence: ไม่มี suspense account

### ข้อจำกัดของโมเดลปัจจุบัน

- ไม่มี cash/bank account ที่ชัดเจนใน `finance_accounts`
- ไม่มี liability tracking
- ไม่มี suspense หรือ clearing accounts

**สถานะ:** บัญชี Credit **ต้องการการตัดสินใจจาก Owner** — ต้องการคำนิยาม chart of accounts

## ผลกระทบต่อกองทุน

### ความสัมพันธ์กองทุนของการเบิกเงินปัจจุบัน

- การเบิกเงินมีฟิลด์ `fundId` แบบ optional (บรรทัด 378 ใน schema)
- ไม่มีผลกระทบทางการเงินต่อยอดเงินกองทุนระหว่างการจ่ายเงิน
- คล้ายกับ expenses ที่มี `fundId` และลดยอดเงิน

### ผลกระทบต่อกองทุนที่เป็นไปได้

**A. Decrease fund balance (ลดยอดเงินกองทุน)**
- คล้ายกับพฤติกรรม expense ปัจจุบัน
- Debit กองทุน, credit เงินสด/ธนาคาร
- Evidence: Expenses ปัจจุบันลด `finance_accounts.balance`

**B. No fund impact (ไม่มีผลต่อกองทุน - pure cash movement)**
- โอนย้ายระหว่างบัญชีเงินสด/ธนาคารเท่านั้น
- ยอดเงินกองทุนไม่เปลี่ยน
- Evidence: ไม่รองรับโดย expense model ปัจจุบัน

**C. Require fund at approval (ต้องระบุกองทุนเมื่ออนุมัติ)**
- ต้องระบุกองทุนก่อนอนุมัติ (ตาม Decision 2)
- ไม่มีการ posting กองทุนที่ยังไม่ได้ระบุ
- Evidence: Decision 2 ระบุ "Fund is required at posting/approval"

### โมเดลปัจจุบันรองรับ

- A (Decrease fund balance): รองรับโดย expense pattern
- C (Require fund at approval): จำเป็นโดย Decision 2

**สถานะ:** ผลกระทบต่อกองทุน **ต้องการการตัดสินใจจาก Owner** — ยืนยันว่าการเบิกเงินลดยอดเงินกองทุนเหมือน expenses หรือไม่

## ผลกระทบต่อเงินสด/ธนาคาร

### การติดตามเงินสด/ธนาคารปัจจุบัน

- ตาราง `bank_records` ติดตาม `transfer_in` และ `cash_deposit` (บรรทัด 588-612 ใน schema)
- ไม่มีการติดตามยอดเงินบัญชีเงินสด/ธนาคารอย่างชัดเจน
- ไม่มี workflow bank account reconciliation

### ผลกระทบต่อเงินสด/ธนาคารที่เป็นไปได้

**A. Decrease bank account balance (ลดยอดเงินบัญชีธนาคาร)**
- Credit บัญชีธนาคารเมื่อจ่ายเงินเบิก
- ต้องการ entity และการติดตามยอดเงิน bank account
- Evidence: `bank_records` มีอยู่แต่ไม่มีตาราง bank account

**B. No bank account tracking (ไม่มีการติดตามบัญชีธนาคาร)**
- จ่ายเงินสดเท่านั้น
- ไม่มี bank balance reconciliation
- Evidence: การ implement ปัจจุบันไม่มี bank account model

**C. Record disbursement evidence only (บันทึกหลักฐานการจ่ายเงินเท่านั้น)**
- ติดตามว่าเกิดการจ่ายเงิน
- ไม่มี balance reconciliation
- Evidence: สามารถขยาย `bank_records` หรือสร้างบันทึก evidence

### โมเดลปัจจุบันรองรับ

- C (Evidence only): สามารถเพิ่มบันทึก disbursement ไปที่ `bank_records` หรือตารางใหม่
- A (Bank balance): ต้องการ entity bank account ใหม่

**สถานะ:** ผลกระทบต่อเงินสด/ธนาคาร **ต้องการการตัดสินใจจาก Owner** — ต้องการการตัดสินใจเรื่อง bank account tracking

## จุด Posting

### จุด Posting ปัจจุบัน

วงจรชีวิตการเบิกเงินปัจจุบันมีการเปลี่ยนสถานะ 3 จุด:

**1. Request (PENDING)**
- Action: สร้างคำขอเบิกเงิน
- Financial posting: ไม่มี
- Evidence: `withdrawals.create` ใน routers, ไม่มีการเปลี่ยนแปลงทางการเงิน

**2. Approve (APPROVED/REJECTED)**
- Action: เปลี่ยนสถานะและบันทึกการอนุมัติ/ปฏิเสธ
- Financial posting: ไม่มี
- Evidence: `withdrawals.approve` ใน routers, เปลี่ยนเฉพาะสถานะ

**3. Disburse (DISBURSED)**
- Action: เปลี่ยนสถานะเป็น disbursed
- Financial posting: ไม่มี
- Evidence: `withdrawals.disburse` ใน routers, เปลี่ยนเฉพาะสถานะ

### จุด Posting ที่เป็นไปได้

**A. Post at approval (Post เมื่ออนุมัติ)**
- สร้างบันทึกทางการเงินเมื่ออนุมัติ
- Debit กองทุน, credit เงินสด/ธนาคาร (ตาม chart of accounts)
- Evidence: Expenses เริ่ม `approved` และมีผลทางการเงินทันที
- Domain semantics: Approval = คำมั่นสัญญาที่จะจ่าย

**B. Post at disbursement (Post เมื่อจ่ายเงินจริง)**
- สร้างบันทึกทางการเงินเมื่อจ่ายจริง
- Debit กองทุน, credit เงินสด/ธนาคาร
- Evidence: การเบิกเงินมีขั้นตอนการจ่ายเงินแยกต่างหาก
- Domain semantics: Disbursement = การเคลื่อนไหวของเงินสดจริง

**C. Post at request (Post เมื่อขอ)**
- สร้างบันทึกทางการเงินทันทีเมื่อขอ
- Evidence: Offerings ปัจจุบันสร้างบันทึกทางการเงินทันที
- Domain semantics: Request = ภาระผูกพันทันที

### การวิเคราะห์ Domain Semantics

**ความแตกต่างระหว่าง Approval กับ Disbursement:**
- โมเดลปัจจุบันแยก approval และ disbursement
- บ่งชี้ถึงเหตุการณ์ทางการเงินที่แตกต่างกัน
- Approval = การอนุญาตให้จ่าย
- Disbursement = การจ่ายจริง

**ความสอดคล้องกับ Architecture Decision 1:**
- "Posting creates the approved transaction and journal effects exactly once"
- "Posted transactions cannot be silently edited"
- บ่งชี้ว่าควรเกิด posting ที่ขอบเขตที่ชัดเจน

### การเปรียบเทียบกับ Flow ที่มีอยู่

| Flow | จุด Posting | ผลทางการเงิน |
|------|--------------|------------------|
| Offering | การสร้าง | เพิ่มยอดเงินทันที |
| Expense | การสร้าง | ลดยอดเงินทันที |
| Withdrawal | **ไม่มี** | **ไม่มีผลทางการเงิน** |

**สถานะ:** จุด Posting **ต้องการการตัดสินใจจาก Owner** — เลือกระหว่าง approval (คำมั่นสัญญา) หรือ disbursement (การจ่ายจริง)

## Invariants ทางการเงิน

### Invariants ที่จำเป็นโดย Architecture Decision 1

**A. Debit = Credit**
- ทุก journal entry set ต้องสมดุล
- Evidence: Decision 1 ระบุ "Every posted journal set must balance by debit and credit"

**B. Posted amount = withdrawal amount (ยอดที่ Post = ยอดเบิกเงิน)**
- ยอด journal ต้องเท่ากับยอดเบิกเงินที่อนุมัติ
- Evidence: Decision 1 ระบุ "Posted journal sets are immutable"

**C. Fund allocation = valid (การจัดสรรกองทุน = ถูกต้อง)**
- กองทุนต้องมีอยู่, เป็น active, tenant เดียวกัน
- Evidence: Decision 2 ระบุ "Same-tenant fund validation" และ "active fund"

**D. No negative balance (ไม่มียอดเงินติดลบ)**
- ยอดเงินกองทุนต้องไม่ติดลบ
- Evidence: ไม่ได้ระบุอย่างชัดเจนใน decisions แต่เป็นไปโดยปริยายจากความถูกต้องทางการเงิน

**E. No duplicate posting (ไม่มีการ Post ซ้ำ)**
- ไม่สามารถ post การเบิกเงินเดียวกันสองครั้ง
- Evidence: Decision 1 ระบุ "Posting is idempotent; retries cannot create duplicate journal effects"

### การรองรับของโมเดลปัจจุบัน

| Invariant | รองรับ | การ implement ปัจจุบัน |
|-----------|-----------|------------------------|
| Debit = Credit | **ไม่** | ไม่มี journal |
| Posted amount = withdrawal amount | **ไม่** | ไม่มี posting |
| Fund allocation = valid | **บางส่วน** | `fundId` มีอยู่แต่ไม่มีการตรวจสอบ active/same-tenant |
| No negative balance | **ไม่** | ไม่มี constraint ยอดเงิน |
| No duplicate posting | **ไม่** | ไม่มีกลไก posting |

**สถานะ:** Invariants ทั้งหมด **ต้องการการตัดสินใจจาก Owner** สำหรับคำนิยามและการบังคับใช้

## วงจรชีวิตการอนุมัติ/การจ่ายเงิน

### State Machine ปัจจุบัน

```text
PENDING → APPROVED → DISBURSED
          ↓
        REJECTED
```

### จุด Posting ทางการเงินที่เป็นไปได้ในวงจรชีวิต

**ตัวเลือก 1: Post ที่ APPROVED**
```text
PENDING → APPROVED (post journal) → DISBURSED (ไม่มีผลทางการเงิน)
          ↓
        REJECTED (ไม่มีผลทางการเงิน)
```

**ตัวเลือก 2: Post ที่ DISBURSED**
```text
PENDING → APPROVED (ไม่มีผลทางการเงิน) → DISBURSED (post journal)
          ↓
        REJECTED (ไม่มีผลทางการเงิน)
```

**ตัวเลือก 3: Post ที่ REQUEST**
```text
PENDING (post journal) → APPROVED (ไม่มีผลทางการเงิน) → DISBURSED (ไม่มีผลทางการเงิน)
```

### Domain Semantics ตามตัวเลือก

| ตัวเลือก | ความหมายทางการเงิน | ความเสี่ยงทางธุรกิจ |
|--------|------------------|---------------|
| Post ที่ request | ภาระผูกพันทันทีเมื่อขอ | ความเสี่ยงสูงจากภาระที่ไม่ได้อนุมัติ |
| Post ที่ approval | คำมั่นสัญญาที่จะจ่ายเมื่ออนุมัติ | บัญชี accrual มาตรฐาน |
| Post ที่ disbursement | การเคลื่อนไหวของเงินสดจริงเท่านั้น | บัญชี cash-basis |

### Evidence จาก Architecture Decisions

Decision 1 ระบุ:
- "Posting creates the approved transaction and journal effects exactly once"
- บ่งชี้ว่าควรเกิด posting ที่ approval ไม่ใช่ request

Decision 5 (LINE/OCR) ระบุ:
- "Only an approved, validated transaction may create canonical allocations and journal entries"
- เสริมสร้างให้ approval เป็นขอบเขต posting

**สถานะ:** วงจรชีวิตการอนุมัติ/การจ่ายเงินพร้อมจุด posting **ต้องการการตัดสินใจจาก Owner**

## กรณีความล้มเหลว

### เงินในกองทุนไม่เพียงพอ (Insufficient Fund)

**พฤติกรรมปัจจุบัน:** ไม่มีการบังคับ — ไม่มีผลทางการเงิน ดังนั้นไม่มีการตรวจสอบยอดเงิน

**นโยบายที่เป็นไปได้:**
1. **Block withdrawal** ถ้ายอดเงินกองทุน < ยอดเบิกเงิน
2. **Allow negative balance** พร้อมคำเตือน
3. **Allow cross-fund transfer** เพื่อครอบคลุมการขาดแคลน
4. **Require fund balance verification** ที่ approval หรือ disbursement

**Evidence:** Decision 2 ต้องการกองทุนเมื่อ posting แต่ไม่ได้ระบุนโยบายเงินไม่เพียงพอ

**สถานะ:** นโยบายเงินไม่เพียงพอ **ต้องการการตัดสินใจจาก Owner**

### การจ่ายเงินซ้ำ (Double Disbursement)

**พฤติกรรมปัจจุบัน:** เป็นไปได้ — `disburseWithdrawal` ตรวจสอบเฉพาะสถานะเป็น "approved" ไม่ใช่ว่าจ่ายแล้วหรือยัง

**Evidence:** `server/db.ts:994` ตรวจสอบ `eq(withdrawalRequests.status, "approved")` แต่ไม่ป้องกัน race condition

**นโยบายที่เป็นไปได้:**
1. **Compare-and-set** update บนสถานะ (คล้ายกับ counting post)
2. **Unique constraint** บนเหตุการณ์การจ่ายเงิน
3. **Idempotency key** บน operation การจ่ายเงิน

**สถานะ:** การป้องกันการจ่ายเงินซ้ำ **ต้องการการตัดสินใจจาก Owner**

### การจ่ายเงินบางส่วน (Partial Disbursement)

**พฤติกรรมปัจจุบัน:** ไม่รองรับ — การเบิกเงินมีจำนวนเงินเดียว

**นโยบายที่เป็นไปได้:**
1. **Forbid partial** — จำนวนเต็มหรือไม่จ่ายเลย
2. **Allow partial** พร้อมบันทึกการจ่ายเงินหลายรายการ
3. **Require new withdrawal request** สำหรับยอดเงินที่เหลือ

**Evidence:** ไม่มีกลไก partial disbursement ใน schema

**สถานะ:** นโยบาย partial disbursement **ต้องการการตัดสินใจจาก Owner**

### การยกเลิกการเบิกเงิน (Cancelled Withdrawal)

**พฤติกรรมปัจจุบัน:** มีเฉพาะการปฏิเสธ — ไม่มีสถานะการยกเลิก

**นโยบายที่เป็นไปได้:**
1. **Rejection only** — ไม่มีการยกเลิก เฉพาะการปฏิเสธ
2. **Cancellation before approval** — แยกจากการปฏิเสธ
3. **Cancellation after approval** — ต้องการ reversal

**Evidence:** Status enum มี `rejected` แต่ไม่มี `cancelled`

**สถานะ:** Semantics การยกเลิก **ต้องการการตัดสินใจจาก Owner**

### การเบิกเงินที่ถูกปฏิเสธ (Rejected Withdrawal)

**พฤติกรรมปัจจุบัน:** เปลี่ยนสถานะเป็น "rejected" พร้อม `rejectionReason`

**ผลทางการเงิน:** ไม่มี (ไม่มี journal, ไม่มีการเปลี่ยนยอดเงิน)

**Evidence:** `server/db.ts:950-979` อัปเดตสถานะและเหตุผลการปฏิเสธ

**สถานะ:** นโยบายการเบิกเงินที่ถูกปฏิเสธ **ต้องการการตัดสินใจจาก Owner** สำหรับว่าจะสร้างบันทึกทางการเงินหรือไม่

### การแก้ไขหลังจ่ายเงิน (Post-Disbursement Correction)

**พฤติกรรมปัจจุบัน:** ไม่รองรับ — ไม่มีกลไกการแก้ไข

**นโยบายที่เป็นไปได้:**
1. **Linked reversal transaction** (ตาม Decision 1)
2. **Void and reissue** การเบิกเงินใหม่
3. **Adjustment transaction** พร้อมเหตุผล

**Evidence:** Decision 1 ระบุ "Create a linked reversal journal entry set and a reversal business record."

**สถานะ:** การแก้ไขหลังจ่ายเงิน **ต้องการการตัดสินใจจาก Owner**

### การย้อนกลับ (Reversal)

**พฤติกรรมปัจจุบัน:** ไม่รองรับ — ไม่มีกลไก reversal

**Evidence:** Decision 1 ระบุ semantics การย้อนกลับสำหรับการแก้ไขแต่ไม่มีการ implement

**นโยบายที่เป็นไปได้:**
1. **Reversal journal entry** + บันทึกธุรกิจการย้อนกลับ
2. **Reversal must be approved** พร้อมเหตุผล
3. **Original preserved** (immutable ตาม Decision 1)

**สถานะ:** นโยบายการย้อนกลับ **ต้องการการตัดสินใจจาก Owner**

## ข้อกำหนดการตรวจสอบ (Audit Requirements)

### ความครอบคลุมการตรวจสอบปัจจุบัน

**การสร้างคำขอเบิกเงิน:**
- สร้าง audit log? **ไม่** — router ไม่ได้เรียก `createAuditLog`
- Evidence: `server/routers.ts:742-761` — ไม่มีการเรียก audit

**การอนุมัติการเบิกเงิน:**
- สร้าง audit log? **ไม่** — router ไม่ได้เรียก `createAuditLog`
- Evidence: `server/routers.ts:762-790` — ไม่มีการเรียก audit

**การจ่ายเงินเบิก:**
- สร้าง audit log? **ไม่** — router ไม่ได้เรียก `createAuditLog`
- Evidence: `server/routers.ts:791-799` — ไม่มีการเรียก audit

### เหตุการณ์การตรวจสอบที่จำเป็น (ตาม Decision 1)

Decision 1 ระบุ:
- "Audit is both transaction-level and journal-level"
- "Journal records actor, timestamp, reason, source transaction, and before/after posting state"
- "Financial mutation and AuditEvent share one transaction boundary"

**เหตุการณ์ที่จำเป็น:**
1. การสร้างคำขอเบิกเงิน
2. การตัดสินใจอนุมัติ/ปฏิเสธ
3. การดำเนินการจ่ายเงิน
4. การ posting journal (ถ้า implement)
5. การแก้ไข/ย้อนกลับ (ถ้า implement)

**สถานะ:** ข้อกำหนดการตรวจสอบ **ต้องการการตัดสินใจจาก Owner** สำหรับขอบเขตและข้อมูล before/after

## การตัดสินใจที่ต้องการจาก Owner

| การตัดสินใจ | ตัวเลือก | การตัดสินใจจาก Owner | สถานะ |
|----------|---------|----------------|--------|
| ความหมายทางการเงินของการเบิกเงิน | A. Expense subtype<br>B. Transfer between funds<br>C. Liability settlement<br>D. Separate withdrawal transaction type | | เปิด |
| บัญชี Debit | 1. Expense/Payment account<br>2. Specific fund account<br>3. Cash/Bank account | | เปิด |
| บัญชี Credit | 1. Cash/Bank account<br>2. Payable/Liability account<br>3. Suspense/Disbursement account | | เปิด |
| จุด Posting | A. Post at request<br>B. Post at approval<br>C. Post at disbursement | | เปิด |
| ผลกระทบต่อกองทุน | A. Decrease fund balance<br>B. No fund impact<br>C. Require fund at approval | | เปิด |
| ผลกระทบต่อเงินสด/ธนาคาร | A. Decrease bank account balance<br>B. No bank account tracking<br>C. Record disbursement evidence only | | เปิด |
| เงินไม่เพียงพอ | 1. Block withdrawal<br>2. Allow negative with warning<br>3. Allow cross-fund transfer<br>4. Require balance verification | | เปิด |
| การจ่ายเงินบางส่วน | 1. Forbid partial<br>2. Allow partial with multiple records<br>3. Require new request | | เปิด |
| การยกเลิก | 1. Rejection only<br>2. Cancellation before approval<br>3. Cancellation after approval | | เปิด |
| ผลทางการเงินของการปฏิเสธ | 1. No financial record<br>2. Create audit record only<br>3. Create pending liability record | | เปิด |
| การแก้ไขหลังจ่ายเงิน | 1. Linked reversal transaction<br>2. Void and reissue<br>3. Adjustment transaction | | เปิด |
| การย้อนกลับ | 1. Reversal journal + business record<br>2. Must be approved with reason<br>3. Original preserved | | เปิด |
| ขอบเขตการตรวจสอบ | 1. Transaction-level only<br>2. Journal-level only<br>3. Both with before/after | | เปิด |
| Chart of accounts | 1. Use existing fund types as accounts<br>2. Define full chart of accounts<br>3. Minimal account set | | เปิด |

## นโยบายที่อนุมัติแล้ว

**ไม่มี** — ไม่มีนโยบายบัญชีการเบิกเงินที่ได้รับการอนุมัติ การ implement ถูก BLOCK จนกว่าจะมีการตัดสินใจจาก owner

---

## อ้างอิงหลักฐาน

- Schema: `drizzle/schema.ts:372-394` (ตาราง withdrawal_requests)
- ฟังก์ชันการจ่ายเงิน: `server/db.ts:981-999`
- Withdrawal router: `server/routers.ts:732-799`
- การลดยอดเงิน expense: `server/db.ts:640-658`
- การเพิ่มยอดเงิน offering: `server/db.ts:486-505`
- Architecture Decision 1: `GRACE_ARCHITECTURE_DECISIONS.md:25-56`
- Architecture Decision 2: `GRACE_ARCHITECTURE_DECISIONS.md:58-89`
- Forensics: `GRACE_GIVING_FORENSICS.md:86-94` (ตารางทางการเงิน)
