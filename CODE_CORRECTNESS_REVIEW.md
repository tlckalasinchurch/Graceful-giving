# รายงานการตรวจสอบความถูกต้องของ Code

**วันที่:** 2026-09-26  
**ขอบเขต:** Financial mutations และ database operations  
**สถานะ:** CRITICAL ISSUES FOUND

## สรุปผลการตรวจสอบ

พบ **CRITICAL ISSUES** ที่ส่งผลต่อความถูกต้องทางการเงิน:

| ประเภท | จำนวน | ความรุนแรง |
|--------|--------|------------|
| Financial safety issues | 5 | CRITICAL |
| Data consistency issues | 3 | HIGH |
| Transaction safety issues | 2 | HIGH |
| Input validation issues | 2 | MEDIUM |

## ปัญหา CRITICAL

### 1. Balance Updates ไม่มีการตรวจสอบ Affected Rows

**ตำแหน่ง:** `server/db.ts:611-613`, `server/db.ts:658-664`

**ปัญหา:**
```typescript
// Line 611-613: createOffering
if (input.fundId) {
  await tx.execute(
    sql`UPDATE finance_accounts SET balance = balance + ${input.amount} WHERE id = ${input.fundId} AND "churchId" = ${churchId}`
  );
}
```

**ความเสี่ยง:**
- ไม่มีการตรวจสอบว่า UPDATE สำเร็จหรือไม่
- ถ้า `fundId` ไม่ถูกต้อง หรือไม่มีอยู่จริง การ UPDATE จะไม่มีผล
- ยอดเงินใน fund จะไม่ถูกอัปเดต แต่ offering จะถูกสร้าง
- ส่งผลให้รายงานและยอดเงินไม่ตรงกัน

**ผลกระทบ:**
- Fund balance อาจไม่ตรงกับ offerings จริง
- รายงานทางการเงินไม่ถูกต้อง
- ไม่สามารถ track ได้ว่ามีการ update สำเร็จหรือไม่

**การแก้ไขที่แนะนำ:**
```typescript
if (input.fundId) {
  const result = await tx.execute(
    sql`UPDATE finance_accounts SET balance = balance + ${input.amount} WHERE id = ${input.fundId} AND "churchId" = ${churchId}`
  );
  if (result.rowCount === 0) {
    throw new Error(`Fund ${input.fundId} not found or church mismatch`);
  }
}
```

---

### 2. UpdateOffering Balance Logic มีความเสี่ยง

**ตำแหน่ง:** `server/db.ts:651-667`

**ปัญหา:**
```typescript
// Line 651-667
if (input.amount !== undefined || input.fundId !== undefined) {
  const oldAmount = Number(existing[0].amount);
  const newAmount = input.amount === undefined ? oldAmount : Number(input.amount);
  const oldFundId = existing[0].fundId;
  const newFundId = input.fundId === undefined ? oldFundId : input.fundId;
  if (oldFundId)
    await tx.execute(
      sql`UPDATE finance_accounts SET balance = balance - ${oldAmount} WHERE id = ${oldFundId} AND "churchId" = ${churchId}`
    );
  if (newFundId)
    await tx.execute(
      sql`UPDATE finance_accounts SET balance = balance + ${newAmount} WHERE id = ${newFundId} AND "churchId" = ${churchId}`
    );
}
```

**ความเสี่ยง:**
- ถ้า `oldFundId` และ `newFundId` เหมือนกัน จะเกิดการลดและเพิ่มยอดเงินเดียวกัน → ยอดเงินผิด
- ไม่มีการตรวจสอบ affected rows ในทั้งสอง UPDATE
- ไม่มีการจัดการกรณี fundId เปลี่ยน
- ถ้า UPDATE แรกสำเร็จแต่ UPDATE ที่สองล้มเหลว → ยอดเงินผิด

**ผลกระทบ:**
- Fund balance อาจติดลบหรือเกินจริง
- ไม่มี rollback ถ้า UPDATE ครึ่งทางสำเร็จ
- การ audit ไม่สามารถตรวจสอบได้

**การแก้ไขที่แนะนำ:**
```typescript
if (input.amount !== undefined || input.fundId !== undefined) {
  const oldAmount = Number(existing[0].amount);
  const newAmount = input.amount === undefined ? oldAmount : Number(input.amount);
  const oldFundId = existing[0].fundId;
  const newFundId = input.fundId === undefined ? oldFundId : input.fundId;
  
  // Case 1: Same fund, amount changed
  if (oldFundId === newFundId && oldAmount !== newAmount) {
    const diff = newAmount - oldAmount;
    const result = await tx.execute(
      sql`UPDATE finance_accounts SET balance = balance + ${diff} WHERE id = ${newFundId} AND "churchId" = ${churchId}`
    );
    if (result.rowCount === 0) {
      throw new Error(`Fund ${newFundId} not found or church mismatch`);
    }
  }
  // Case 2: Different funds
  else if (oldFundId !== newFundId) {
    if (oldFundId) {
      const result = await tx.execute(
        sql`UPDATE finance_accounts SET balance = balance - ${oldAmount} WHERE id = ${oldFundId} AND "churchId" = ${churchId}`
      );
      if (result.rowCount === 0) {
        throw new Error(`Fund ${oldFundId} not found or church mismatch`);
      }
    }
    if (newFundId) {
      const result = await tx.execute(
        sql`UPDATE finance_accounts SET balance = balance + ${newAmount} WHERE id = ${newFundId} AND "churchId" = ${churchId}`
      );
      if (result.rowCount === 0) {
        throw new Error(`Fund ${newFundId} not found or church mismatch`);
      }
    }
  }
}
```

---

### 3. Withdrawal Disbursement ไม่มีผลทางการเงิน

**ตำแหน่ง:** `server/db.ts:981-999`

**ปัญหา:**
```typescript
export async function disburseWithdrawal(
  id: number,
  churchId = DEFAULT_CHURCH_ID
) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const rows = await db
    .update(withdrawalRequests)
    .set({ status: "disbursed" })
    .where(
      and(
        eq(withdrawalRequests.id, id),
        eq(withdrawalRequests.churchId, churchId),
        eq(withdrawalRequests.status, "approved")
      )
    )
    .returning({ id: withdrawalRequests.id });
  return rows.length > 0;
}
```

**ความเสี่ยง:**
- เปลี่ยนเฉพาะ status เท่านั้น
- ไม่มีการอัปเดต fund balance
- ไม่มี journal entries
- ไม่มี expense records
- ยอดเงินใน fund จะไม่ลดลงแม้จ่ายเงินจริง

**ผลกระทบ:**
- Fund balance จะสูงกว่าจริง
- รายงานทางการเงินไม่ถูกต้อง
- ไม่สามารถ audit การจ่ายเงินได้
- ไม่มี trace ทางบัญชี

**การแก้ไขที่แนะนำ:**
ต้องกำหนด accounting policy ก่อน (ดู `GRACE_WITHDRAWAL_ACCOUNTING_DECISION.md`)

---

### 4. Expense Balance Updates มีปัญหาเดียวกัน

**ตำแหน่ง:** คาดว่ามี pattern เดียวกันใน expense functions

**ปัญหาที่คาดว่ามี:**
- ไม่มีการตรวจสอบ affected rows
- Pattern เดียวกันกับ offering functions

**ต้องตรวจสอบ:**
- `createExpense` function
- `updateExpense` function
- `voidExpense` function

---

### 5. ไม่มี Foreign Key Constraints

**ตำแหน่ง:** Schema level (`drizzle/schema.ts`)

**ปัญหา:**
- ไม่มี FK constraints ระหว่าง `offerings.fundId` → `finance_accounts.id`
- ไม่มี FK constraints ระหว่าง `expenses.fundId` → `finance_accounts.id`
- ไม่มี FK constraints ระหว่าง `withdrawal_requests.fundId` → `finance_accounts.id`
- ไม่มี check constraints สำหรับ balance >= 0

**ความเสี่ยง:**
- สามารถ insert offerings/expenses ด้วย fundId ที่ไม่มีอยู่จริง
- สามารถลบ fund ที่ยังมี offerings/expenses อ้างอิง
- ไม่มีการบังคับใช้ integrity ที่ database level

**ผลกระทบ:**
- Data corruption
- Orphaned records
- Balance inconsistencies

---

## ปัญหา HIGH

### 6. parseFloat ใน Aggregation อาจเกิด Precision Loss

**ตำแหน่ง:** `server/db.ts:499-500`

**ปัญหา:**
```typescript
income: parseFloat((inc[0]?.total as unknown as string) ?? "0") || 0,
expense: parseFloat((exp[0]?.total as unknown as string) ?? "0") || 0,
```

**ความเสี่ยง:**
- JavaScript `parseFloat` มี precision limitations
- Decimal fields จาก PostgreSQL อาจมี precision loss
- การรวมยอดเงินหลายๆ ครั้งอาจสะสม error

**ผลกระทบ:**
- รายงานทางการเงินอาจมีความคลาดเคลื่อน
- การ reconcile ยอดเงินอาจไม่ตรง

**การแก้ไขที่แนะนำ:**
```typescript
// Use decimal library or work with strings
income: (inc[0]?.total as unknown as string) ?? "0",
expense: (exp[0]?.total as unknown as string) ?? "0",
```

---

### 7. Transaction Scope ไม่ครอบคลุม Audit

**ตำแหน่ง:** หลายตำแหน่งใน `server/routers.ts`

**ปัญหา:**
- Audit insert แยกจาก financial transaction
- ถ้า audit insert ล้มเหลว financial mutation จะ commit อยู่
- ไม่มี before/after snapshots

**ผลกระทบ:**
- Audit trail ไม่สมบูรณ์
- ไม่สามารถ reconstruct สถานะได้
- Compliance issues

---

### 8. getDb() Returns Null Silently

**ตำแหน่ง:** `server/db.ts:60-75`

**ปัญหา:**
```typescript
const db = await getDb();
if (!db) return []; // or throw new Error("Database is not available");
```

**ความเสี่ยง:**
- บาง paths return empty arrays/objects
- อาจมองผ่านว่าไม่มีข้อมูล แต่จริงๆ คือ database ไม่ available
- ไม่มี error visibility

**ผลกระทบ:**
- Silent failures
- การ debug ยาก
- อาจเกิด incorrect behavior ใน production

---

## ปัญหา MEDIUM

### 9. Type Casting กว้างเกินไป

**ตำแหน่ง:** `server/db.ts:641`, `server/db.ts:607`

**ปัญหา:**
```typescript
.set(input as any)
.values({ ...input, churchId })
```

**ความเสี่ยง:**
- ใช้ `as any` แทน type checking
- อาจมี fields ที่ไม่ควรถูก update
- ไม่มี runtime validation

---

### 10. ไม่มี Input Validation สำหรับ Amount

**ตำแหน่ง:** Router level

**ปัญหา:**
- ตรวจสอบเฉพาะ `z.number().positive()` ที่ router
- ไม่มีการตรวจสอบ precision (satang)
- ไม่มีการตรวจสอบ maximum amount

---

## ข้อเสนอแนะการแก้ไข

### ทันที (Immediate)

1. **เพิ่ม Affected Row Checks**
   - ตรวจสอบ `rowCount` หลังทุก UPDATE balance
   - Throw error ถ้า rowCount === 0

2. **แก้ updateOffering Balance Logic**
   - จัดการกรณี same fund/different funds แยกกัน
   - ป้องกันการลดและเพิ่มยอดเงินเดียวกัน

3. **เพิ่ม Database Constraints**
   - FK constraints ระหว่าง fund tables
   - Check constraint balance >= 0

### ระยะสั้น (Short-term)

4. **Implement Withdrawal Accounting**
   - กำหนด accounting policy
   - Implement journal entries
   - อัปเดต fund balance เมื่อจ่ายเงิน

5. **Fix Transaction Scope**
   - Audit insert อยู่ใน transaction เดียวกับ financial mutation
   - เพิ่ม before/after snapshots

6. **Remove Silent Failures**
   - ตรวจสอบ database availability อย่างชัดเจน
   - Return errors แทน empty data

### ระยะยาว (Long-term)

7. **Implement Immutable Journal**
   - ตาม Architecture Decision 1
   - Double-entry bookkeeping
   - Audit trail สมบูรณ์

8. **Add RLS**
   - Database-level security
   - Tenant isolation
   - Role-based access

---

## ความสำคัญของการแก้ไข

| ปัญหา | ความสำคัญ | เหตุผล |
|--------|------------|--------|
| Balance updates ไม่มี affected row checks | CRITICAL | ยอดเงินผิด → รายงามไม่ถูกต้อง |
| updateOffering balance logic | CRITICAL | ยอดเงินอาจติดลบ/เกินจริง |
| Withdrawal ไม่มีผลทางการเงิน | CRITICAL | ยอดเงิน fund สูงกว่าจริง |
| ไม่มี FK constraints | HIGH | Data corruption |
| parseFloat precision loss | HIGH | รายงามไม่ตรง |
| Transaction scope | HIGH | Audit trail ไม่สมบูรณ์ |
| getDb() silent failures | MEDIUM | Silent failures ใน production |
| Type casting | MEDIUM | Runtime errors ที่อาจเกิดขึ้น |

---

## สรุป

Codebase มี **CRITICAL ISSUES** ที่ส่งผลต่อความถูกต้องทางการเงิน:

1. **Financial mutations ไม่มี validation พอเพียง** — อาจเกิด data corruption
2. **Balance updates ไม่มี error handling** — ยอดเงินอาจไม่ตรง
3. **Withdrawal disbursement ไม่มีผลทางการเงิน** — ต้องกำหนด policy ก่อน
4. **ไม่มี database constraints** — ไม่มี integrity enforcement

**คำแนะนำ:** อย่า deploy ไป production จนกว่าจะแก้ไข CRITICAL issues และ implement accounting policy ตาม Architecture Decisions
