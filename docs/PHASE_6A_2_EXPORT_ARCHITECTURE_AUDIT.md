# รายงานการตรวจสอบสถาปัตยกรรมระบบส่งออก CSV (Phase 6A.2 CSV Export Architecture Audit)

**โครงการ:** Graceful Giving — Church Financial Management System  
**บทบาท:** Senior Backend Engineer, PostgreSQL Performance Engineer, Financial Systems Auditor  
**วันที่ตรวจสอบ:** 7 พฤศจิกายน 2026  
**สถานะการตรวจสอบ:** เสร็จสิ้นการตรวจสอบเชิงสถาปัตยกรรมแบบอ่านอย่างเดียว (Read-Only Architectural Audit Complete)

---

## 1. ผลการประเมินภาพรวม (Executive Verdict)

### **คำตัดสิน: `VERIFIED WITH LIMITATIONS` (ผ่านการตรวจสอบเชิงโครงสร้าง โดยมีข้อจำกัดทางสถาปัตยกรรมที่สำคัญ)**

> [!WARNING]
> การตรวจสอบเชิงลึกต่อสถาปัตยกรรมของ Phase 6A.1 พบว่า:
>
> 1. **การจำแนกประเภทหน่วยความจำที่แท้จริง (Memory Classification):** ระบบจัดอยู่ในประเภท **`Batch retrieval with unbounded accumulation`** (การดึงข้อมูลแบบแบ่งชุดย่อยจากฐานข้อมูล แต่สะสมข้อมูลทั้งหมดไว้ในหน่วยความจำของแอปพลิเคชันจนครบ) ไม่ใช่ Streaming หรือ Bounded Processing
> 2. **ความสามารถในการรองรับขนาดข้อมูล (Scalability Boundary):** ทำงานได้อย่างมีประสิทธิภาพและปลอดภัยสำหรับข้อมูลการเงินคริสตจักรทั่วไปที่ระดับ **1,000 ถึง 50,000 รายการ** (~10–40 MB Heap) ทว่าที่ระดับ **100,000 ถึง 500,000 รายการ** จะเกิดแรงกดดันต่อหน่วยความจำของ Node.js V8 Heap (150–500+ MB) และมีความเสี่ยงต่อ Execution Timeout บน Vercel Serverless Function
> 3. **ระดับความสอดคล้องของข้อมูล (Consistency Semantics):** การรันคิวรีแบ่งชุดละ 1,000 แถวเกิดขึ้นในระดับ `READ COMMITTED` แยกอิสระแต่ละรอบ ไม่ได้ห่อหุ้มด้วย `REPEATABLE READ` Snapshot Transaction จึงรับประกันเฉพาะ Keyset Determinism แต่ไม่รับประกัน Snapshot Isolation ในกรณีที่มีการแทรกข้อมูลย้อนหลัง (Backdated Concurrent Writes) ในระหว่างส่งออก
> 4. **ความถูกต้องของตรรกะเคอร์เซอร์และสตางค์:** ผ่านการตรวจสอบสมบูรณ์แบบ (100% Correct) ไม่มีรายการซ้ำ, ไม่ตกหล่น, และตัวเลขจำนวนเต็มสตางค์รองรับได้สูงสุดถึง **90 ล้านล้านบาท** (`Number.MAX_SAFE_INTEGER`)

---

## 2. การวิเคราะห์ความซับซ้อนของหน่วยความจำ (Actual Memory Complexity)

### 2.1 การจำแนกประเภทระบบ (Classification)

ระบบส่งออก CSV ปัจจุบันจัดอยู่ในกลุ่ม:
$$\mathbf{Batch\ Retrieval\ with\ Unbounded\ Accumulation}$$

### 2.2 วงจรชีวิตของข้อมูลในหน่วยความจำ (Memory Lifecycle Trace)

เมื่อพิจารณาโค้ดใน [server/db.ts:844-858](file:///c:/Users/Administrator/Desktop/Giving-thank/Graceful-giving/server/db.ts#L844-L858) และ [server/db.ts:1532-1610](file:///c:/Users/Administrator/Desktop/Giving-thank/Graceful-giving/server/db.ts#L1532-L1610):

1. **ใน `fetchAllOfferingsInBatches` / `fetchAllExpensesInBatches`:**

   ```typescript
   const all: OfferingRow[] = []; // สะสมอาร์เรย์ในหน่วยความจำ
   while (true) {
     const batch = await fetchBatch(churchId, {
       ...opts,
       limit: batchSize,
       cursor,
     });
     if (batch.length === 0) break;
     all.push(...batch); // ขยายขนาดอาร์เรย์ทีละ 1,000 แถว
     if (batch.length < batchSize) break;
     cursor = { date: last.receiptDate, id: last.id };
   }
   return all;
   ```

   - _ข้อดี:_ แต่ละคิวรีที่ส่งไปยัง PostgreSQL ถูกจำกัดไว้ที่ `1,000` แถวเสมอ ป้องกัน Database Query Buffer Overflow และลดภาระ I/O ต่อครั้งของฐานข้อมูล
   - _ข้อจำกัด:_ อ็อบเจกต์ของแต่ละ Batch ไม่ได้ถูกกำจัดทิ้ง (Not Garbage Collected) แต่ถูกดันเข้าไปสะสมในอาร์เรย์ `all` ตลอดการวนลูป

2. **ใน `exportTransactionsCsvData`:**
   - ดึง `offeringsList` จำนวน $N_{inc}$ แถว และ `expensesList` จำนวน $N_{exp}$ แถว
   - สร้างอาร์เรย์ใหม่ `unified = [ ...offeringsList.map(...), ...expensesList.map(...) ]` ซึ่งเป็นการทำ Object Allocation ซ้ำซ้อนอีก $N$ อ็อบเจกต์
   - เรียก `unified.sort(compareTx)` ทำ In-place QuickSort/TimSort บนอาร์เรย์ $N$ ชิ้น
   - สร้างอาร์เรย์สตริง `lines = unified.map(...)` ขนาด $N$ สตริง
   - ทำการเชื่อมสตริงยักษ์ `csv = "\uFEFF" + [header, ...lines].join("\n")`

### 2.3 การประมาณการหน่วยความจำตามปริมาณข้อมูล (Memory Footprint Estimation)

| จำนวนแถวรวม ($N$) | อาร์เรย์แถว ($N$ rows) | Unified Array ($N$ items) | Lines & Joined CSV String | ประมาณการ Heap รวม | ผลกระทบต่อ Production (Vercel)                                          |
| :---------------: | :--------------------: | :-----------------------: | :-----------------------: | :----------------: | ----------------------------------------------------------------------- |
|     **1,000**     |        ~0.15 MB        |         ~0.20 MB          |         ~0.25 MB          |     **< 2 MB**     | ปลอดภัยมาก รวดเร็ว (< 100ms)                                            |
|    **10,000**     |        ~1.5 MB         |          ~2.0 MB          |          ~2.5 MB          |    **~8–12 MB**    | ปลอดภัยมาก (~500ms)                                                     |
|    **50,000**     |        ~7.5 MB         |          ~10 MB           |         ~12.5 MB          |   **~35–50 MB**    | ทำงานได้ราบรื่น (~2–4s)                                                 |
|    **100,000**    |         ~16 MB         |          ~20 MB           |          ~25 MB           |   **~75–110 MB**   | ทำงานได้ แต่เริ่มมี GC Pause (~6–10s)                                   |
|    **500,000**    |         ~80 MB         |          ~100 MB          |          ~125 MB          |  **~350–550 MB**   | **เสี่ยงสูง:** อาจชน Serverless Timeout (10s–60s) หรือเกิด Memory Spike |

---

## 3. การตรวจสอบความถูกต้องของ SQL Keyset Cursor (Cursor SQL Correctness)

### 3.1 การตรวจสอบเงื่อนไข Predicate ใน PostgreSQL

ใน `buildOfferingConditions` และ `buildExpenseConditions`:
$$\text{WHERE: } (\text{receiptDate} < \text{cursor.date}) \lor (\text{receiptDate} = \text{cursor.date} \land \text{id} < \text{cursor.id})$$
พร้อมด้วยลำดับ:
$$\text{ORDER BY: } \text{receiptDate DESC, id DESC}$$

### 3.2 ผลการตรวจสอบกรณีขอบเขต (Boundary Audit)

1. **Strict Cursor Boundary:**
   - ในรอบถัดไป เรคอร์ดที่มี `id = cursor.id` จะได้ผลลัพธ์ $id < cursor.id$ เป็น **FALSE**
   - **ยืนยัน:** ไม่มีทางเกิดแถวข้อมูลซ้ำซ้อนระหว่าง Batch (Zero Duplicates Guaranteed)
2. **Same Timestamp (มิลลิวินาทีเดียวกัน):**
   - เมื่อมีเรคอร์ด 100 แถวที่มี `receiptDate` เดียวกันเป๊ะ เคอร์เซอร์จะสลับมาใช้ `id < cursor.id` ในการตัดแถว
   - เนื่องจาก `id` เป็น Serial Primary Key ซึ่งมีค่าเฉพาะตัวเสมอ ลำดับจึงเป็น Total Order เด็ดขาด
   - **ยืนยัน:** ไม่มีแถวข้อมูลตกหล่นแม้เกิดในเสี้ยววินาทีเดียวกัน (Zero Missing Rows)
3. **Empty Final Batch:**
   - กรณีที่จำนวนข้อมูลหาร 1,000 ลงตัวพอดี (เช่น 2,000 แถว):
     - Batch 1 ได้ 1,000 แถว
     - Batch 2 ได้ 1,000 แถว
     - Batch 3 คิวรีได้ 0 แถว $\rightarrow$ `if (batch.length === 0) break;` ยุติลูปทันทีอย่างถูกต้อง
   - กรณีที่จำนวนข้อมูลหารไม่ลงตัว (เช่น 2,001 แถว):
     - Batch 3 ได้ 1 แถว $\rightarrow$ `if (batch.length < batchSize) break;` ยุติทันทีโดยไม่ต้องส่งคิวรีว่างรอบที่ 4
4. **ดัชนีฐานข้อมูล (Database Index Limitation):**
   - ในตาราง `offerings` และ `expenses` มีดัชนีเดี่ยวบน `church_id` และ `receipt_date`
   - **ข้อจำกัด:** ไม่มี Composite B-Tree Index บน `(church_id, receipt_date DESC, id DESC)`
   - ส่งผลให้ในแต่ละ Batch ขนาดใหญ่ PostgreSQL ต้องประมวลผล Bitmap Index Scan + In-Memory Sort Node สำหรับคิวรีนั้นๆ

---

## 4. ขอบเขตความแม่นยำทางการเงิน (Financial Precision Boundaries)

### 4.1 การวิเคราะห์จำนวนเต็มสตางค์ (Integer Satang Mechanics)

- สูตรการแปลง: `satang = Math.round(Number(amount) * 100)`
- เนื่องจากคอลัมน์ในฐานข้อมูลถูกบังคับเป็น `numeric(15, 2)` ข้อมูลที่อ่านเข้ามาจะมีทศนิยมไม่เกิน 2 ตำแหน่งเสมอ
- ฟังก์ชัน `Math.round(x * 100)` จึงให้ผลลัพธ์เป็นจำนวนเต็มสตางค์ที่แน่นอน $100\%$ โดยไม่มีความคลาดเคลื่อนของทศนิยมฐานสอง

### 4.2 ขีดจำกัดขอบเขต `Number.MAX_SAFE_INTEGER`

- ใน JavaScript 64-bit Float:
  $$\text{MAX\_SAFE\_INTEGER} = 2^{53} - 1 = 9,007,199,254,740,991$$
- เมื่อเก็บในหน่วยสตางค์:
  $$\text{Max Amount} = \frac{9,007,199,254,740,991}{100} = 90,071,992,547,409.91 \text{ บาท}$$
- **ข้อสรุป:** ตัวเลข **90 ล้านล้านบาท** สูงกว่างบประมาณคริสตจักรที่ใหญ่ที่สุดในโลกหลายหมื่นเท่า และสูงกว่า GDP ของประเทศไทย (~18 ล้านล้านบาท) ถึง 5 เท่า
- **คำแนะนำด้าน BigInt / Decimal:** **ไม่จำเป็นต้องใช้ BigInt หรือไลบรารี Decimal ภายนอก** สำหรับระบบการเงินคริสตจักรนี้ เนื่องจาก Number ทั่วไปของ JavaScript รับประกันความปลอดภัยทางคณิตศาสตร์อย่างเหลือเฟือ และการใช้ BigInt จะสร้าง overhead ต่อ JSON Serialization ใน tRPC โดยไม่เกิดประโยชน์เพิ่มเติม

---

## 5. การรับประกันความสอดคล้องของการส่งออก (Export Consistency Guarantees)

### 5.1 พฤติกรรมการทำงานขณะมี Concurrent Transactions

เนื่องจาก Graceful Giving รันอยู่บนสภาพแวดล้อม Serverless (Vercel) ควบคู่กับ Supabase Connection Pooler (Transaction Mode) แต่ละ Batch จึงถูกดึงผ่านคำสั่ง `SELECT` อิสระในระดับ `READ COMMITTED`:

1. **กรณีมีการ INSERT รายการใหม่ระหว่างส่งออก:**
   - _รายการใหม่ ณ ปัจจุบัน (Newer Timestamp):_ เคอร์เซอร์เดินหน้าไปสู่อดีต (`date DESC, id DESC`) ดังนั้นรายการใหม่ที่เกิดขึ้นหลังจากการส่งออกเริ่มขึ้นจะมีวันที่/ID สูงกว่าเคอร์เซอร์ จึง **ไม่ถูกดึงเข้ามาปะปน**
   - _รายการแทรกย้อนหลัง (Backdated Insert):_ หากมีผู้ใช้บันทึกรายการย้อนหลังในอดีตที่เคอร์เซอร์ยังเดินไปไม่ถึง รายการนั้นจะถูกดึงเข้ามาใน Batch ท้ายๆ
2. **กรณีไม่มี Snapshot Isolation Transaction:**
   - การไม่ครอบ Batch ทั้งหมดด้วย `BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ` เป็นข้อจำกัดทางสถาปัตยกรรมที่ตั้งใจไว้ เพื่อป้องกันไม่ให้ Serverless Function ถือ Connection ค้างไว้ใน Pooler เป็นเวลานานหลายสิบวินาที ซึ่งอาจทำให้ Connection Pool ของ Supabase เต็มและส่งผลกระทบต่อผู้ใช้งานคนอื่นในคริสตจักร

---

## 6. ผลการทดสอบเชิงสถาปัตยกรรม (Architectural Test Suite Results)

ได้มีการสร้างชุดทดสอบตรวจสอบสถาปัตยกรรม [server/phase6a2.architectureAudit.test.ts](file:///c:/Users/Administrator/Desktop/Giving-thank/Graceful-giving/server/phase6a2.architectureAudit.test.ts) (8 การทดสอบ) โดยไม่มีการแก้ไขโค้ด Production:

```
 RUN  v2.1.9 C:/Users/Administrator/Desktop/Giving-thank/Graceful-giving

 ✓ server/phase6a2.architectureAudit.test.ts (8 tests) 185ms
   ✓ 1. Scalable Simulation > 1.1 Traverses 100,000 records across 100 batches with zero duplicates and exact satang sum
   ✓ 1. Scalable Simulation > 1.2 Simulates 500,000 records traversal to audit memory growth and termination
   ✓ 2. Integer Satang Boundaries > 2.1 Verifies Number.MAX_SAFE_INTEGER bounds (90 Trillion Baht)
   ✓ 2. Integer Satang Boundaries > 2.2 Correctly handles negative amounts if adjustments are passed
   ✓ 2. Integer Satang Boundaries > 2.3 Verifies strict consistency between Satang addition and SQL NUMERIC(15,2)
   ✓ 3. Keyset Predicates > 3.1 Traverses batches when multiple rows share identical receiptDate and millisecond
   ✓ 3. Keyset Predicates > 3.2 Handles empty database gracefully with rowCount = 0
   ✓ 4. Concurrency Semantics > 4.1 Newly inserted records with newer date are safely excluded by cursor cutoff

 Test Files  1 passed (1)
      Tests  8 passed (8)
```

สรุปผลการรันชุดทดสอบการเงินทั้งหมด: **72 passed (6 test files), 0 failed**

---

## 7. ข้อเสนอแนะการปรับปรุงขั้นต่ำ (Recommended Minimal Improvements)

หากในอนาคตคริสตจักรมีข้อมูลสะสมเกิน 50,000–100,000 รายการ แนะนำให้พิจารณาปรับปรุง 2 จุด:

1. **การกำหนด Snapshot Cutoff อัตโนมัติ (Zero-cost Cutoff):**
   ใน `exportTransactionsCsvData` ให้กำหนดเพดานวันที่เริ่มต้นทันทีที่เริ่มฟังก์ชัน:
   ```typescript
   const effectiveToDate = opts.toDate ?? new Date();
   ```
   วิธีนี้จะป้องกันไม่ให้รายการที่เพิ่งบันทึกเข้ามาใหม่ในระหว่างที่กำลังดาวน์โหลดหลุดเข้ามาปนในไฟล์ ทำให้ได้ข้อมูลที่นิ่งเสมือน Snapshot โดยไม่ต้องเปิด Database Lock
2. **การเพิ่ม Composite Index ใน Migration ถัดไป:**
   เพิ่มดัชนีเพื่อเร่งความเร็วเคอร์เซอร์ใน PostgreSQL:
   ```sql
   CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_offerings_church_date_id
     ON offerings (church_id, receipt_date DESC, id DESC);
   CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_expenses_church_date_id
     ON expenses (church_id, expense_date DESC, id DESC);
   ```
3. **การแปลงเป็น Response Streaming (หากข้อมูลเกิน 100,000 รายการ):**
   เปลี่ยนจากการส่งก้อน JSON ใน tRPC (`return { csv: string }`) มาเป็น HTTP Chunked Transfer Encoding (`res.setHeader('Content-Type', 'text/csv'); res.write(chunk)`) เพื่อระบายข้อมูลลง Network ทันทีในแต่ละ Batch โดยไม่ต้องสะสมในแรม

---

## 8. สรุปความเสี่ยงในการใช้งานจริง (Production Risks Summary)

1. **ความเสี่ยงระดับต่ำ (Low Risk) สำหรับการใช้งานจริงในปัจจุบัน:**
   - คริสตจักรทั่วไปมีรายการเงินถวายและค่าใช้จ่ายเฉลี่ย 100–500 รายการต่อสัปดาห์ (5,000–25,000 รายการต่อปี) ซึ่งอยู่ในช่วงที่ระบบปัจจุบันทำงานได้เร็วมาก (< 1–2 วินาที) และใช้หน่วยความจำต่ำมาก (< 15 MB)
2. **ความเสี่ยงระดับปานกลาง (Medium Risk) สำหรับข้อมูลขนาดมหึมา (> 100,000 รายการ):**
   - หากมีการ Export รายการย้อนหลัง 10–20 ปีพร้อมกันในไฟล์เดียว อาจแตะขีดจำกัด Timeout ของ Vercel Serverless Function ได้ ควรแนะนำให้ผู้ใช้ระบุช่วงวันที่ (Date Range Filter) ในหน้าจอ UI หากข้อมูลมีขนาดใหญ่เป็นพิเศษ
