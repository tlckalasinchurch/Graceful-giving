# Database Constraints Proposal

**Date:** 2026-09-26  
**Status:** PROPOSAL ONLY — NO IMPLEMENTATION AUTHORIZED  
**Purpose:** Add database-level constraints to prevent data corruption

---

## Background

ตาม CODE_CORRECTNESS_REVIEW พบว่าปัจจุบันไม่มี database constraints ที่จำเป็น:

1. **ไม่มี Foreign Key constraints** ระหว่าง fund tables
2. **ไม่มี Check constraints** สำหรับ balance >= 0
3. **ไม่มี validation ที่ database level**

ส่งผลให้สามารถ:
- Insert offerings/expenses ด้วย fundId ที่ไม่มีอยู่จริง
- ลบ fund ที่ยังมี offerings/expenses อ้างอิง
- ยอดเงินติดลบโดยไม่มีการป้องกัน

---

## Proposed Constraints

### 1. Foreign Key Constraints

#### offerings.fundId → finance_accounts.id

```sql
ALTER TABLE offerings 
ADD CONSTRAINT offerings_fund_id_fkey 
FOREIGN KEY (fundId) REFERENCES finance_accounts(id) 
ON DELETE RESTRICT ON UPDATE CASCADE;
```

**หมายเหตุ:**
- `ON DELETE RESTRICT`: ป้องกันการลบ fund ที่ยังมี offerings อ้างอิง
- `ON UPDATE CASCADE`: ถ้า id เปลี่ยน ให้ update อัตโนมัติ

#### expenses.fundId → finance_accounts.id

```sql
ALTER TABLE expenses 
ADD CONSTRAINT expenses_fund_id_fkey 
FOREIGN KEY (fundId) REFERENCES finance_accounts(id) 
ON DELETE RESTRICT ON UPDATE CASCADE;
```

#### withdrawal_requests.fundId → finance_accounts.id

```sql
ALTER TABLE withdrawal_requests 
ADD CONSTRAINT withdrawal_requests_fund_id_fkey 
FOREIGN KEY (fundId) REFERENCES finance_accounts(id) 
ON DELETE RESTRICT ON UPDATE CASCADE;
```

#### budget_plans.fundId → finance_accounts.id

```sql
ALTER TABLE budget_plans 
ADD CONSTRAINT budget_plans_fund_id_fkey 
FOREIGN KEY (fundId) REFERENCES finance_accounts(id) 
ON DELETE RESTRICT ON UPDATE CASCADE;
```

#### offering_envelopes.fundId → finance_accounts.id

```sql
ALTER TABLE offering_envelopes 
ADD CONSTRAINT offering_envelopes_fund_id_fkey 
FOREIGN KEY (fundId) REFERENCES finance_accounts(id) 
ON DELETE RESTRICT ON UPDATE CASCADE;
```

#### session_deductions.fundId → finance_accounts.id

```sql
ALTER TABLE session_deductions 
ADD CONSTRAINT session_deductions_fund_id_fkey 
FOREIGN KEY (fundId) REFERENCES finance_accounts(id) 
ON DELETE RESTRICT ON UPDATE CASCADE;
```

---

### 2. Check Constraints

#### finance_accounts.balance >= 0

```sql
ALTER TABLE finance_accounts 
ADD CONSTRAINT finance_accounts_balance_check 
CHECK (balance >= 0);
```

**หมายเหตุ:**
- ป้องกันยอดเงินติดลบ
- ต้อง validate ก่อน insert/update
- อาจต้องใช้ DEFERRABLE ถ้ามี logic พิเศษ

#### offerings.amount > 0

```sql
ALTER TABLE offerings 
ADD CONSTRAINT offerings_amount_check 
CHECK (amount > 0);
```

#### expenses.amount > 0

```sql
ALTER TABLE expenses 
ADD CONSTRAINT expenses_amount_check 
CHECK (amount > 0);
```

#### withdrawal_requests.amount > 0

```sql
ALTER TABLE withdrawal_requests 
ADD CONSTRAINT withdrawal_requests_amount_check 
CHECK (amount > 0);
```

---

### 3. Unique Constraints

#### Unique Church + Offering (สำหรับป้องกัน duplicate)

```sql
ALTER TABLE offerings 
ADD CONSTRAINT offerings_church_receipt_ref_unique 
UNIQUE (churchId, receiptDate, reference);
```

**หมายเหตุ:**
- ป้องกัน duplicate offerings ในวันเดียวกันด้วย reference เดียวกัน
- อาจต้องปรับ logic ถ้า reference ไม่ unique

---

## Migration Strategy

### Option 1: Immediate Enforcement

```sql
-- Step 1: Clean up orphaned records
DELETE FROM offerings WHERE fundId IS NOT NULL AND fundId NOT IN (SELECT id FROM finance_accounts);
DELETE FROM expenses WHERE fundId IS NOT NULL AND fundId NOT IN (SELECT id FROM finance_accounts);
DELETE FROM withdrawal_requests WHERE fundId IS NOT NULL AND fundId NOT IN (SELECT id FROM finance_accounts);

-- Step 2: Add constraints
ALTER TABLE offerings ADD CONSTRAINT offerings_fund_id_fkey FOREIGN KEY (fundId) REFERENCES finance_accounts(id) ON DELETE RESTRICT ON UPDATE CASCADE;
-- ... (repeat for other tables)

-- Step 3: Add check constraints
ALTER TABLE finance_accounts ADD CONSTRAINT finance_accounts_balance_check CHECK (balance >= 0);
-- ... (repeat for other check constraints)
```

**ข้อดี:**
- Immediate protection
- Clean database

**ข้อเสีย:**
- อาจลบ data ที่ user ไม่ต้องการลบ
- ต้อง backup ก่อน
- อาจ break ถ้ามี data ที่ไม่ถูกต้อง

### Option 2: Soft Enforcement (Recommended)

```sql
-- Step 1: Add constraints with NOT VALID
ALTER TABLE offerings ADD CONSTRAINT offerings_fund_id_fkey FOREIGN KEY (fundId) REFERENCES finance_accounts(id) ON DELETE RESTRICT ON UPDATE CASCADE NOT VALID;

-- Step 2: Validate existing data
ALTER TABLE offerings VALIDATE CONSTRAINT offerings_fund_id_fkey;

-- Step 3: Clean up or fix issues
-- (manual intervention)

-- Step 4: Repeat for other constraints
```

**ข้อดี:**
- ไม่ break existing data
- สามารถ fix issues ก่อน
- Lower risk

**ข้อเสีย:**
- ต้อง manual intervention
- ใช้เวลานานกว่า

---

## Impact Analysis

### Positive Impact

1. **Data Integrity:** ป้องกัน orphaned records
2. **Balance Protection:** ป้องกันยอดเงินติดลบ
3. **Error Detection:** Database จะ catch errors ก่อน application
4. **Documentation:** Constraints เป็น documentation ของ business rules

### Potential Issues

1. **Existing Data:** อาจมี orphaned records ที่ต้อง clean up
2. **Application Logic:** บาง application logic อาจ break ถ้าไม่ handle constraints
3. **Performance:** FK constraints อาจมีผลต่อ performance เล็กน้อย
4. **Migration Complexity:** ต้อง careful planning สำหรับ large datasets

---

## Recommendations

### Before Implementation

1. **Database Backup:** Backup ก่อนเสมอ
2. **Data Audit:** Audit existing data สำหรับ orphaned records
3. **Application Testing:** Test application กับ constraints
4. **Performance Testing:** Test performance impact

### Implementation Steps

1. **Create Backup:** Backup production database
2. **Dry Run:** Run migration บน staging/database test
3. **Data Cleanup:** Clean up orphaned records
4. **Add Constraints:** Add constraints ทีละอัน
5. **Validate:** Validate แต่ละ constraint
6. **Monitor:** Monitor หลัง deployment

### Rollback Plan

```sql
-- Rollback constraints
ALTER TABLE offerings DROP CONSTRAINT offerings_fund_id_fkey;
ALTER TABLE finance_accounts DROP CONSTRAINT finance_accounts_balance_check;
-- ... (repeat for other constraints)
```

---

## Owner Decision Required

| Decision | Options | Status |
|----------|---------|--------|
| FK constraints | A. Add all FK constraints<br>B. Add only critical FK<br>C. Defer to Phase 1 | OPEN |
| Check constraints | A. Add all check constraints<br>B. Add only balance check<br>C. Defer to Phase 1 | OPEN |
| Migration strategy | A. Immediate enforcement<br>B. Soft enforcement<br>C. Manual review first | OPEN |
| Balance check | A. balance >= 0<br>B. balance >= 0 with warning<br>C. No database check | OPEN |
| Delete behavior | A. RESTRICT (prevent delete)<br>B. CASCADE (delete related)<br>C. SET NULL | OPEN |

---

## Next Steps

1. **Audit existing data** สำหรับ orphaned records
2. **Test on staging database** ก่อน production
3. **Get owner approval** สำหรับ constraint policy
4. **Plan migration window** สำหรับ production deployment
5. **Prepare rollback plan** ถ้ามีปัญหา

---

## Status

**IMPLEMENTATION BLOCKED** — ต้องการ owner approval ก่อนดำเนินการ
