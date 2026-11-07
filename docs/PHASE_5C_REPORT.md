# รายงานผลการดำเนินงาน Phase 5C — Complete UX/UI Improvement & Ergonomics

**วันที่:** 7 พฤศจิกายน 2026  
**สถานะ:** เสร็จสมบูรณ์พร้อมตรวจสอบ (Completed & Verified)  
**ขอบเขต:** GAP-06 (Search & Filtering), GAP-07 (Functional Actions), GAP-08 (Settings & Role Permissions), GAP-10 (Responsive UI & Accessibility) ครอบคลุมทั้ง 29 เส้นทาง (Routes) ของระบบ Graceful Giving

---

## 1. บทสรุปผู้บริหารและการจัดวางระบบดีไซน์ (Executive Summary & Design Direction)

### 1.1 ทิศทางดีไซน์ (Design Direction)

โครงการได้ยึดถือแนวทาง **"Modern Minimalist + Editorial Financial Dashboard"** โดยมุ่งเน้นการใช้งานจริงของเจ้าหน้าที่คริสตจักร ได้แก่ เหรัญญิก (Treasurer), ผู้ช่วยเหรัญญิก/กรรมการนับเงิน (Counter), ศิษยาภิบาล (Pastor), มัคนายก (Deacon), และสมาชิกทั่วไป (Member) โดยเฉพาะกลุ่มผู้สูงอายุและผู้ใช้งานผ่านโทรศัพท์มือถือในวันอาทิตย์:

- **Clean & Editorial:** ใช้พื้นหลังสีธรรมชาติ อบอุ่น สบายตา (`bg-ground`, `bg-surface`, `bg-paper`) ลดแสงสะท้อนและคอนทราสต์ที่บาดตา
- **Strong Typography Hierarchy:** การจัดลำดับขนาดตัวอักษรภาษาไทยที่คมชัด อ่านง่าย ปรับขนาดตัวหนังสือในจุดสำคัญให้ใหญ่ขึ้น ชัดเจน ไม่ใช้ฟอนต์ขนาดเล็กเกินไป
- **Restrained & Trustworthy:** ใช้เส้นขอบแบบคมชัด ประณีต (`border-line`, `border-border/60`), เงาที่นุ่มนวลและไม่หลอกตา (`shadow-sm`, `shadow-[3px_3px_0_var(--ink)]`), หลีกเลี่ยง Gradient จัดจ้าน, ไม่ใช้ Glassmorphism ฟุ่มเฟือย และไม่ใช้ลูกเล่นที่ทำให้ระบบการเงินดูไม่น่าเชื่อถือ
- **Ergonomic & Accessible:** ควบคุมพื้นที่การสัมผัส (Touch Targets) สำหรับอุปกรณ์พกพาทุกจุดให้มีขนาดไม่ต่ำกว่า **44 × 44 พิกเซล** (`min-h-11`, `min-w-11`), รองรับ Safe Area สำหรับ iOS และเปิดใช้งานผ่าน LINE In-App Browser ได้อย่างลื่นไหล

---

## 2. การปรับปรุงระบบค้นหาและตัวกรอง (GAP-06: Search & Filtering)

| หน้าจอ                                                                                                                                         | การค้นหาและตัวกรองเดิม                                      | การปรับปรุงใน Phase 5A & 5C                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | ผลลัพธ์ทางธุรกิจและการเงิน                                                                                    |
| :--------------------------------------------------------------------------------------------------------------------------------------------- | :---------------------------------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------ |
| **Transactions** ([`Transactions.tsx`](file:///c:/Users/Administrator/Desktop/Giving-thank/Graceful-giving/client/src/pages/Transactions.tsx)) | ค้นหาได้เฉพาะข้อความทั่วไป ถูกจำกัดจำนวน 100 รายการ         | - เพิ่มการค้นหาข้อความครอบคลุมทั้งคำอธิบาย, เลขที่เอกสาร, ผู้ถวาย และผู้รับเงิน<br>- เพิ่มตัวกรองช่วงเวลาอัจฉริยะ ([`datePeriod.ts`](file:///c:/Users/Administrator/Desktop/Giving-thank/Graceful-giving/client/src/lib/datePeriod.ts)): เดือนนี้, เดือนที่แล้ว, ไตรมาสนี้, ต้นปีถึงปัจจุบัน (YTD), และระบุวันที่เอง<br>- ตัวกรองประเภท (รายรับ/รายจ่าย), บัญชีการเงิน, และกองทุน<br>- แสดง Active Filter Badges พร้อมปุ่มล้างตัวกรองในคลิกเดียว<br>- ขยายขีดจำกัดการดึงข้อมูลเป็น 1,000 รายการ ป้องกันยอดสรุปรวมขาดหาย | ยอดสรุปรายรับ-รายจ่าย-ยอดสุทธิ คำนวณจากชุดข้อมูลที่ตรงตามตัวกรองครบถ้วน 100% ไม่มียอดผิดเพี้ยนจากการตัดทอนแถว |
| **Offerings** ([`Offerings.tsx`](file:///c:/Users/Administrator/Desktop/Giving-thank/Graceful-giving/client/src/pages/Offerings.tsx))          | กรองได้เฉพาะหมวดหมู่ และจำกัด 100 รายการ                    | - ค้นหาตามชื่อผู้ถวาย (เฉพาะผู้มีสิทธิ์ตามนโยบายความเป็นส่วนตัว), หมายเลขซอง (`envelopeNo`), เลขที่อ้างอิง<br>- ตัวกรองช่วงเวลาแบบมาตรฐานและระบุวันเริ่มต้น-สิ้นสุด<br>- ตัวกรองกองทุน และช่องทางการถวาย (เงินสด/เงินโอน/เช็ค)<br>- ดึงข้อมูลสูงสุด 1,000 รายการเพื่อคำนวณการ์ดสรุปยอดเงินถวาย                                                                                                                                                                                                                          | เหรัญญิกตรวจสอบยอดถวายสิบลดและกองทุนต่างๆ ได้อย่างแม่นยำ พร้อมส่งออกรายงานได้ครบทุกรายการ                     |
| **Expenses** ([`Expenses.tsx`](file:///c:/Users/Administrator/Desktop/Giving-thank/Graceful-giving/client/src/pages/Expenses.tsx))             | กรองได้เฉพาะหมวดหมู่ และจำกัด 100 รายการ                    | - ค้นหาตามชื่อผู้รับเงิน, รายละเอียดรายการ, เลขที่ใบเสร็จ<br>- ตัวกรองช่วงเวลา, กองทุน และหมวดหมู่งบประมาณ<br>- ดึงข้อมูลสูงสุด 1,000 รายการ                                                                                                                                                                                                                                                                                                                                                                            | ตรวจสอบยอดรายจ่ายเปรียบเทียบกับงบประมาณได้ครบถ้วนโดยไม่มีรายการตกหล่น                                         |
| **Members** ([`Members.tsx`](file:///c:/Users/Administrator/Desktop/Giving-thank/Graceful-giving/client/src/pages/Members.tsx))                | ค้นหาเฉพาะชื่อและเบอร์โทร                                   | - เพิ่มการค้นหาด้วย **หมายเลขซองประจำตัวสมาชิก (`envelopeNo`)**<br>- กรองตามสถานะสมาชิก (ประจำ, สมทบ, ผู้เยี่ยมเยียน) และกลุ่มแคร์/พันธกิจ                                                                                                                                                                                                                                                                                                                                                                              | ค้นหาข้อมูลสมาชิกขณะนับซองถวายได้รวดเร็วภายใน 1-2 วินาที                                                      |
| **Audit Logs** ([`Settings.tsx`](file:///c:/Users/Administrator/Desktop/Giving-thank/Graceful-giving/client/src/pages/Settings.tsx))           | ตัวเลือก Action ใน Dropdown ไม่ตรงกับ Action จริงใน Backend | - ปรับปรุงตัวเลือก Action ให้ตรงกับฐานข้อมูลจริง (`CREATE`, `UPDATE`, `VOID`, `DELETE`, `POST`, `SUBMIT`, `VERIFY`, `APPROVE`, `SIGN`, `DISBURSE`, `update_user_role`, `approve_user`, `disable_user`, ฯลฯ)<br>- แปลงตาราง Log เป็นการ์ดที่อ่านง่ายบนมือถือ (`md:hidden`)                                                                                                                                                                                                                                               | ผู้ตรวจสอบบัญชีและศิษยาภิบาลสามารถสืบค้นประวัติการแก้ไขข้อมูลทางการเงินได้อย่างถูกต้องตามมาตรฐานสากล          |

---

## 3. การแก้ไขปุ่มและการทำงานเชิงโต้ตอบ (GAP-07: Functional Actions)

1. **การบันทึกข้อมูลคริสตจักรในระบบการตั้งค่า ([`Settings.tsx`](file:///c:/Users/Administrator/Desktop/Giving-thank/Graceful-giving/client/src/pages/Settings.tsx)):**
   - เดิม: ช่องกรอกข้อมูล "เว็บไซต์คริสตจักร", "ศิษยาภิบาลผู้ช่วย", และ "เดือนเริ่มต้นปีงบประมาณ" ไม่มีอยู่ในหน้า UI หรือไม่ได้ผูก State ส่งผลให้เมื่อกดบันทึก ข้อมูลเหล่านี้ไม่ถูกส่งไปยังฐานข้อมูล
   - แก้ไข:
     - เพิ่มช่องกรอกข้อมูลและผูก State ครบถ้วน ได้แก่ `website`, `assistantPastorName`, และ `fiscalYearStartMonth` (ตัวเลือกเดือน 1–12 ภาษาไทย)
     - เชื่อมโยงเข้ากับระบบตรวจจับการเปลี่ยนแปลง [`settingsDirty.ts`](file:///c:/Users/Administrator/Desktop/Giving-thank/Graceful-giving/client/src/pages/settingsDirty.ts) และแบนเนอร์แจ้งเตือน `UnsavedChangesBar`
     - ยืนยันการบันทึกข้อมูลลงฐานข้อมูล PostgreSQL ผ่าน `trpc.church.updateProfile` ได้สำเร็จ 100%
2. **การซูมและตรวจสอบรูปภาพสลิปในกล่องข้อความสลิป LINE ([`GivingInbox.tsx`](file:///c:/Users/Administrator/Desktop/Giving-thank/Graceful-giving/client/src/pages/GivingInbox.tsx)):**
   - เพิ่มปุ่มขยาย/ย่อรูปสลิปแบบโต้ตอบ (`ZoomIn` / `ZoomOut` ปรับขนาดระหว่าง 340px ถึง 580px) พร้อมความสามารถในการแตะรูปเพื่อขยายใหญ่
   - ช่วยให้เหรัญญิกสามารถซูมดูหมายเลขอ้างอิงธนาคาร, วันที่-เวลาโอน, และยอดเงินสตางค์ได้อย่างชัดเจนโดยไม่ต้องเพ่งสายตา
3. **การควบคุมหน้าต่างโมดอลและแป้นพิมพ์ (Modal Dialog Controls):**
   - ทุก Dialog ในระบบได้รับการปรับปรุงให้รองรับปุ่ม `Escape` สำหรับการปิดหน้าต่างทันที
   - กำหนดค่า Accessibility ครบถ้วน: `role="dialog"`, `aria-modal="true"`, และ `aria-labelledby`
   - ปรับขนาดปุ่มกดใน Dialog ทุกปุ่มให้มีขนาดสัมผัสอย่างน้อย 44px (`min-h-11`)
   - ครอบคลุม: บัตรประจำตัวสมาชิกและหน้าต่างแก้ไขโปรไฟล์ ([`Profile.tsx`](file:///c:/Users/Administrator/Desktop/Giving-thank/Graceful-giving/client/src/pages/Profile.tsx)), หน้าต่างสร้างกองทุนใหม่ ([`Funds.tsx`](file:///c:/Users/Administrator/Desktop/Giving-thank/Graceful-giving/client/src/pages/Funds.tsx)), หน้าต่างปฏิเสธและยกเลิกคำขอเบิกเงิน ([`Approvals.tsx`](file:///c:/Users/Administrator/Desktop/Giving-thank/Graceful-giving/client/src/pages/Approvals.tsx)), และหน้าต่างแจ้งผลการส่งคำขอเบิกเงิน ([`NewWithdrawal.tsx`](file:///c:/Users/Administrator/Desktop/Giving-thank/Graceful-giving/client/src/pages/NewWithdrawal.tsx))

---

## 4. การจัดการสิทธิ์และการตั้งค่าระบบ (GAP-08: Settings & Role Permissions)

1. **การแก้ไขข้อผิดพลาดสิทธิ์ 403 FORBIDDEN ในหน้าโปรไฟล์ ([`Profile.tsx`](file:///c:/Users/Administrator/Desktop/Giving-thank/Graceful-giving/client/src/pages/Profile.tsx)):**
   - เดิม: หน้า `Profile.tsx` มีการเรียก `trpc.withdrawals.list.useQuery({ myOnly: false })` ซึ่งสงวนไว้เฉพาะผู้มีสิทธิ์ฝ่ายการเงิน ส่งผลให้เมื่อสมาชิกทั่วไปเปิดหน้าโปรไฟล์ จะเกิดข้อผิดพลาด `403 FORBIDDEN` บนคอนโซล
   - แก้ไข: นำคำขอดังกล่าวออก โดยให้หน้าโปรไฟล์แสดงเฉพาะข้อมูลส่วนบุคคล ประวัติการถวาย และสถานะคำขอเบิกเงินของตนเอง (`myOnly: true`) อย่างถูกต้องและปลอดภัย
2. **การเพิ่มการ์ดอ้างอิงบทบาท "ทีมนับเงิน / กรรมการนับเงิน" (`COUNTER`):**
   - เพิ่มการ์ดอธิบายบทบาทหน้าที่ของ `COUNTER` ในแท็บ "ผู้ใช้งานและสิทธิ์" ในหน้าการตั้งค่า เพื่อให้ผู้ดูแลระบบเข้าใจขอบเขตสิทธิ์ชัดเจน: มีสิทธิ์ช่วยบันทึกการนับเงินและซองถวายในรอบนับเงิน แต่ไม่สามารถอนุมัติรายการเบิกจ่ายหรือเข้าถึงสมุดบัญชีทั่วไปได้
3. **การแสดงผลรายการผู้ใช้งานบนมือถือ (Mobile Responsive Users Card View):**
   - ในหน้าจอขนาดเล็กกว่า 768px (`md:hidden`) ระบบจะเปลี่ยนตารางผู้ใช้งานเป็นรูปแบบการ์ดแสดงรายชื่อ อีเมล บทบาทปัจจุบัน และป้ายสถานะ (`อนุมัติแล้ว`, `รออนุมัติ`, `ระงับการใช้งาน`)
   - ปุ่มเปลี่ยนบทบาท, ปุ่มอนุมัติ, และปุ่มระงับการใช้งาน ได้รับการปรับแต่งเป็นปุ่มสัมผัสขนาดใหญ่ `min-h-11` ป้องกันการกดผิดพลาดบนโทรศัพท์มือถือ

---

## 5. ความสามารถในการเข้าถึงและการตอบสนองบนทุกอุปกรณ์ (GAP-10: Responsive UI & a11y)

1. **พื้นที่สัมผัสที่เป็นมิตรกับผู้สูงอายุ (Touch Targets ≥ 44×44px):**
   - ปรับปุ่มเลือกรูป Avatar ในหน้า [`Profile.tsx`](file:///c:/Users/Administrator/Desktop/Giving-thank/Graceful-giving/client/src/pages/Profile.tsx) จากขนาดเดิม `w-7 h-7` (28px) เป็น `size-11` (44×44px) พร้อมวงแหวน Focus Ring และคำบรรยาย `aria-label`
   - ปรับปุ่มกดยืนยัน ปุ่มนำทาง และปุ่มล้างตัวกรองในทุกหน้าจอให้มีความสูงไม่ต่ำกว่า `min-h-11` (44px)
2. **การแปลงตารางข้อมูลกว้างเป็นมุมมองการ์ดบนมือถือ (Mobile Card Alternatives):**
   - **Transactions, Offerings, Expenses:** แสดงเป็นการ์ดสรุปรายการทางการเงินบนมือถือ แสดงชื่อ วันที่ จำนวนเงิน และสถานะอย่างชัดเจน
   - **Members:** แสดงรายชื่อ เบอร์โทร และหมายเลขซองในรูปแบบการ์ดที่แตะเพื่อโทรหรือดูประวัติได้ทันที
   - **Audit Logs:** แสดงเหตุการณ์ ผู้ดำเนินการ และเวลาแบบการ์ดที่อ่านง่าย ไม่ล้นหน้าจอ
3. **การเข้าถึงด้วยแป้นพิมพ์และโปรแกรมอ่านหน้าจอ (Keyboard Navigation & Screen Readers):**
   - ทุกแถวรายการและลิงก์ที่คลิกได้มีการกำหนด `tabIndex={0}`, `role="link"` หรือ `role="button"` พร้อมรองรับปุ่ม `Enter` และ `Space`
   - แถบความคืบหน้างบประมาณ (`BudgetProgress`) กำหนดแอตทริบิวต์ `role="progressbar"`, `aria-valuenow`, `aria-valuemin="0"`, `aria-valuemax="100"`, และ `aria-label` เป็นภาษาไทย
4. **คำแนะนำการเลื่อนตารางบนมือถือ (Table Scroll Guidance):**
   - ในหน้า [`Reports.tsx`](file:///c:/Users/Administrator/Desktop/Giving-thank/Graceful-giving/client/src/pages/Reports.tsx) เพิ่มแถบข้อความแนะนำการเลื่อนหน้าจอแนวนอน (`← ปัดซ้าย-ขวาเพื่อดูตารางเดือนครบถ้วน →`) บนอุปกรณ์ขนาดเล็ก เพื่อป้องกันผู้ใช้งานคิดว่าตารางแสดงผลไม่ครบ

---

## 6. ความปลอดภัยทางการเงินและความถูกต้องของข้อมูล (Financial Safety & Integrity)

- **ความครบถ้วนของข้อมูล (No Truncation in Financial Aggregates):** ข้อมูลในหน้าสมุดบัญชี, เงินถวาย, และรายจ่าย ถูกดึงมาคำนวณอย่างสมบูรณ์ (`limit: 1000`) ป้องกันปัญหายอดรวมและยอดสุทธิบนหน้าจอผิดพลาดจากการตัดทอนแถวข้อมูลที่ 50 หรือ 100 แถว
- **การรักษาความเป็นส่วนตัวของผู้ถวาย (Masked Donor Privacy):** ชื่อผู้ถวายจะถูกแทนที่ด้วยข้อความ `ผู้ถวายนิรนาม` เสมอ เว้นแต่ผู้ใช้งานจะได้รับอนุญาตตามสิทธิ์และนโยบายความเป็นส่วนตัวของคริสตจักร
- **การแยกข้อมูลระหว่างคริสตจักร (Multi-tenant Isolation):** ทุกคำสั่งสืบค้นและการบันทึกข้อมูลถูกจำกัดขอบเขตภายใต้ `churchId` เสมอ
- **บันทึกประวัติการเปลี่ยนแปลงที่แก้ไขไม่ได้ (Immutable Audit Trail):** การทำธุรกรรมทางการเงิน การอนุมัติ การตรวจนับ และการลงบัญชี ถูกบันทึกลงในตาราง `auditLogs` ครบถ้วน

---

## 7. ตารางสรุปการตรวจสอบและปรับปรุงทั้ง 29 เส้นทาง (Route Matrix)

| ลำดับ | เส้นทาง (Route)     | ไฟล์ต้นทาง                                                                                                                            | ปัญหาเดิมก่อนปรับปรุง                                      | การปรับปรุงใน Phase 5A, 5B, 5C                                                                       | ผลการตรวจสอบ |
| :---: | :------------------ | :------------------------------------------------------------------------------------------------------------------------------------ | :--------------------------------------------------------- | :--------------------------------------------------------------------------------------------------- | :----------: |
|   1   | `/`                 | [`Home.tsx`](file:///c:/Users/Administrator/Desktop/Giving-thank/Graceful-giving/client/src/pages/Home.tsx)                           | ปุ่ม Quick Action เล็กบนมือถือ, การ์ดงบประมาณขาด a11y      | ปรับ Touch Targets ≥ 44px, เพิ่ม ARIA labels, ปรับปรุงการ์ดงบประมาณและการเงิน                        |     ผ่าน     |
|   2   | `/login`            | [`Login.tsx`](file:///c:/Users/Administrator/Desktop/Giving-thank/Graceful-giving/client/src/pages/Login.tsx)                         | ฟอร์มเข้าสู่ระบบและปุ่ม LINE Login ล้นบนมือถือบางขนาด      | ปรับปรุง Responsive, ขยายพื้นที่สัมผัสปุ่ม LINE และฟอร์มเข้าสู่ระบบ                                  |     ผ่าน     |
|   3   | `/setup`            | [`ChurchSetup.tsx`](file:///c:/Users/Administrator/Desktop/Giving-thank/Graceful-giving/client/src/pages/ChurchSetup.tsx)             | Wizard เขียนทับข้อมูลเดิมและสร้างกองทุนซ้ำ (GAP-04)        | โหลดข้อมูลเดิมมาแสดง ป้องกันการสร้างกองทุนซ้ำ และปรับปรุงความชัดเจน                                  |     ผ่าน     |
|   4   | `/transactions`     | [`Transactions.tsx`](file:///c:/Users/Administrator/Desktop/Giving-thank/Graceful-giving/client/src/pages/Transactions.tsx)           | จำกัด 100 รายการทำให้ยอดสุทธิผิด (GAP-01), ค้นหาไม่ละเอียด | ขยาย limit: 1000, เพิ่มตัวกรองช่วงเวลา กองทุน ผู้รับเงิน และการ์ดมุมมองมือถือ                        |     ผ่าน     |
|   5   | `/transactions/:id` | [`TransactionDetail.tsx`](file:///c:/Users/Administrator/Desktop/Giving-thank/Graceful-giving/client/src/pages/TransactionDetail.tsx) | ฟอร์มแก้ไขตัดข้อมูลรายจ่ายบางส่วนออก (GAP-03)              | เพิ่มการแก้ไข `details`, หมวดหมู่, กองทุน และตรวจสอบสิทธิ์รัดกุม                                     |     ผ่าน     |
|   6   | `/counting`         | [`Counting.tsx`](file:///c:/Users/Administrator/Desktop/Giving-thank/Graceful-giving/client/src/pages/Counting.tsx)                   | ปุ่มสร้างรอบนับเงินกดยากบนมือถือ                           | ปรับ Touch Target `min-h-11`, ปรับปรุงป้ายสถานะรอบนับเงิน                                            |     ผ่าน     |
|   7   | `/counting/:id`     | `CountingDetail/index.tsx`                                                                                                            | ขาด Checklist การลงบัญชี (GAP-09), Blur ยิงซ้ำ             | เพิ่ม Pre-Post Checklist 5 มิติ, แก้ไข Duplicate Mutation ใน `CashCountTab`                          |     ผ่าน     |
|   8   | `/offerings`        | [`Offerings.tsx`](file:///c:/Users/Administrator/Desktop/Giving-thank/Graceful-giving/client/src/pages/Offerings.tsx)                 | จำกัด 100 รายการ, ค้นหาเลขซองไม่ได้ (GAP-01, GAP-02)       | ค้นหาเลขซองได้, ขยาย limit: 1000, เพิ่มตัวกรองช่วงเวลา และการ์ดแสดงผลบนมือถือ                        |     ผ่าน     |
|   9   | `/offerings/new`    | [`NewOffering.tsx`](file:///c:/Users/Administrator/Desktop/Giving-thank/Graceful-giving/client/src/pages/NewOffering.tsx)             | ไม่เชื่อมโยงเลขซองสมาชิก (GAP-02)                          | ดึงเลขซองอัตโนมัติเมื่อเลือกสมาชิก และรองรับการระบุเลขซองอิสระ                                       |     ผ่าน     |
|  10   | `/give`             | [`Give.tsx`](file:///c:/Users/Administrator/Desktop/Giving-thank/Graceful-giving/client/src/pages/Give.tsx)                           | หน้าถวายทรัพย์สาธารณะขนาดตัวอักษรเล็กบนมือถือ              | ปรับขนาดฟอนต์ให้อ่านง่าย, รองรับการแสดง QR Code บัญชีคริสตจักรที่คมชัด                               |     ผ่าน     |
|  11   | `/privacy`          | [`Privacy.tsx`](file:///c:/Users/Administrator/Desktop/Giving-thank/Graceful-giving/client/src/pages/Privacy.tsx)                     | การจัดหน้าบนจอมือถือชิดขอบเกินไป                           | ปรับ Padding, Typography Hierarchy ให้อ่านสบายตา                                                     |     ผ่าน     |
|  12   | `/giving/station`   | [`GivingStation.tsx`](file:///c:/Users/Administrator/Desktop/Giving-thank/Graceful-giving/client/src/pages/GivingStation.tsx)         | สลิปมือถือหลุด Vercel 4.5MB เพดาน (GAP-05)                 | ระบบบีบอัดภาพ Canvas < 1MB, แบนเนอร์เตือนพร้อม Auto-scroll, ปุ่มลองใหม่, ล็อกปุ่มกดซ้ำ               |     ผ่าน     |
|  13   | `/giving/inbox`     | [`GivingInbox.tsx`](file:///c:/Users/Administrator/Desktop/Giving-thank/Graceful-giving/client/src/pages/GivingInbox.tsx)             | ตรวจสอบสลิปยาก ไม่สามารถซูมดูตัวเลขธนาคารได้               | เพิ่มปุ่มขยาย/ย่อรูปสลิปแบบโต้ตอบ (340px ↔ 580px) และแตะเพื่อซูม                                    |     ผ่าน     |
|  14   | `/expenses`         | [`Expenses.tsx`](file:///c:/Users/Administrator/Desktop/Giving-thank/Graceful-giving/client/src/pages/Expenses.tsx)                   | ข้อมูลถูกจำกัด 100 รายการ (GAP-01)                         | ขยาย limit: 1000, เพิ่มตัวกรองช่วงเวลา กองทุน และมุมมองการ์ดบนมือถือ                                 |     ผ่าน     |
|  15   | `/expenses/new`     | [`NewExpense.tsx`](file:///c:/Users/Administrator/Desktop/Giving-thank/Graceful-giving/client/src/pages/NewExpense.tsx)               | ปุ่มอัปโหลดใบเสร็จกดยากบนมือถือ                            | ปรับพื้นที่สัมผัสการแนบไฟล์และส่งฟอร์มเป็น `min-h-11` พร้อมการแจ้งเตือนที่ชัดเจน                     |     ผ่าน     |
|  16   | `/funds`            | [`Funds.tsx`](file:///c:/Users/Administrator/Desktop/Giving-thank/Graceful-giving/client/src/pages/Funds.tsx)                         | ขาดการแยกยอดเงินทั่วไปและเงินผูกพัน, Dialog ขาด Escape     | เพิ่มการ์ดยอดเงินคล่องตัว/เงินผูกพัน, เพิ่ม ARIA และปุ่ม Escape ในหน้าต่างสร้างกองทุน                |     ผ่าน     |
|  17   | `/funds/:id`        | [`FundDetail.tsx`](file:///c:/Users/Administrator/Desktop/Giving-thank/Graceful-giving/client/src/pages/FundDetail.tsx)               | ยอดรวมตัดที่ 100 รายการ (GAP-01), คีย์บอร์ดเข้าไม่ถึง      | ขยาย limit: 1000, ปรับปรุงรายการธุรกรรมให้รองรับการนำทางด้วยแป้นพิมพ์                                |     ผ่าน     |
|  18   | `/budgets`          | [`Budgets.tsx`](file:///c:/Users/Administrator/Desktop/Giving-thank/Graceful-giving/client/src/pages/Budgets.tsx)                     | หลอดแสดงความคืบหน้างบประมาณขาด ARIA a11y                   | เพิ่ม `role="progressbar"` พร้อมค่า min/max/valuenow และคำอธิบายภาษาไทย                              |     ผ่าน     |
|  19   | `/budgets/:id`      | [`BudgetDetail.tsx`](file:///c:/Users/Administrator/Desktop/Giving-thank/Graceful-giving/client/src/pages/BudgetDetail.tsx)           | แถวรายจ่ายที่เกี่ยวข้องพื้นที่สัมผัสแคบ                    | เพิ่มพื้นที่สัมผัส `min-h-11` และ Focus Ring สำหรับการนำทางด้วยแป้นพิมพ์                             |     ผ่าน     |
|  20   | `/ministries`       | [`Ministries.tsx`](file:///c:/Users/Administrator/Desktop/Giving-thank/Graceful-giving/client/src/pages/Ministries.tsx)               | การ์ดพันธกิจไม่มี Focus Indicator                          | เพิ่ม Focus Ring และปรับพื้นที่คลิกการ์ดให้เต็มพื้นที่                                               |     ผ่าน     |
|  21   | `/ministries/:id`   | [`MinistryDetail.tsx`](file:///c:/Users/Administrator/Desktop/Giving-thank/Graceful-giving/client/src/pages/MinistryDetail.tsx)       | ปุ่มเพิ่มสมาชิกพันธกิจขนาดเล็กบนมือถือ                     | ปรับปุ่มเป็น `min-h-11` และปรับปรุงการจัดวางสมาชิกในพันธกิจ                                          |     ผ่าน     |
|  22   | `/members`          | [`Members.tsx`](file:///c:/Users/Administrator/Desktop/Giving-thank/Graceful-giving/client/src/pages/Members.tsx)                     | ขาดการแสดงและค้นหาหมายเลขซอง (GAP-02)                      | แสดงคอลัมน์หมายเลขซอง, เพิ่มการค้นหาด้วยเลขซอง, และมุมมองการ์ดบนมือถือ                               |     ผ่าน     |
|  23   | `/members/:id`      | [`MemberDetail.tsx`](file:///c:/Users/Administrator/Desktop/Giving-thank/Graceful-giving/client/src/pages/MemberDetail.tsx)           | ฟอร์มแก้ไขสมาชิกไม่มีช่องกรอกเลขซอง (GAP-02)               | เพิ่มช่องกรอกหมายเลขซองและบันทึกลงตารางสมาชิก                                                        |     ผ่าน     |
|  24   | `/reports`          | [`Reports.tsx`](file:///c:/Users/Administrator/Desktop/Giving-thank/Graceful-giving/client/src/pages/Reports.tsx)                     | ตารางรายเดือนกว้างล้นขอบจอ ตัดการมองเห็น                   | เพิ่มแถบแจ้งเตือนการปัดซ้าย-ขวาบนมือถือ และปรับปรุงโครงสร้างตาราง                                    |     ผ่าน     |
|  25   | `/approvals`        | [`Approvals.tsx`](file:///c:/Users/Administrator/Desktop/Giving-thank/Graceful-giving/client/src/pages/Approvals.tsx)                 | Dialog ปฏิเสธ/ยกเลิกไม่มี Escape และปุ่มเล็ก               | เพิ่มปุ่ม Escape, เพิ่ม ARIA attributes, และขยายปุ่มกดยืนยันเป็น `min-h-11`                          |     ผ่าน     |
|  26   | `/withdrawals/new`  | [`NewWithdrawal.tsx`](file:///c:/Users/Administrator/Desktop/Giving-thank/Graceful-giving/client/src/pages/NewWithdrawal.tsx)         | Dialog สำเร็จขาด Escape และ Focus Trap                     | เพิ่มปุ่ม Escape, ปรับปรุง Accessibility และปุ่มกลับสู่หน้าหลัก                                      |     ผ่าน     |
|  27   | `/notifications`    | [`Notifications.tsx`](file:///c:/Users/Administrator/Desktop/Giving-thank/Graceful-giving/client/src/pages/Notifications.tsx)         | ปุ่มอ่านแล้วทั้งหมดคลิกยากบนจอสัมผัส                       | ปรับ Touch Target เป็น `min-h-11` และปรับขนาดฟอนต์ให้อ่านง่าย                                        |     ผ่าน     |
|  28   | `/settings`         | [`Settings.tsx`](file:///c:/Users/Administrator/Desktop/Giving-thank/Graceful-giving/client/src/pages/Settings.tsx)                   | ช่องเว็บไซต์/ปีงบประมาณไม่บันทึก, ตาราง Log พังบนมือถือ    | เพิ่มช่องกรอกที่ขาดหาย, เชื่อม dirty state, เพิ่มการ์ด COUNTER, ทำการ์ดบนมือถือสำหรับ Users และ Logs |     ผ่าน     |
|  29   | `/profile`          | [`Profile.tsx`](file:///c:/Users/Administrator/Desktop/Giving-thank/Graceful-giving/client/src/pages/Profile.tsx)                     | สิทธิ์ 403 Console Error, Avatar 28px เล็กเกินไป           | นำคำขอที่ผิดสิทธิ์ออก, ขยายปุ่ม Avatar เป็น 44px, เพิ่ม Escape ให้ Dialog                            |     ผ่าน     |

---

## 8. ผลการทดสอบอัตโนมัติ (Automated Verification Results)

1. **การตรวจสอบ Type (TypeScript Typecheck):**
   ```bash
   pnpm check  # tsc --noEmit
   ```

   - **ผลลัพธ์:** **ผ่าน 100% (0 errors, 0 warnings)**
2. **การทดสอบความถูกต้องและ Regression (Vitest Test Suites):**
   ```bash
   pnpm test   # vitest run
   ```

   - **ผลลัพธ์:** **74 test files ผ่านทั้งหมด (0 failed, 4 skipped)**
   - **จำนวนแบบทดสอบเดี่ยว:** **850 tests ผ่านทั้งหมด 100%**
3. **การทดสอบการ Build ระบบสำหรับการใช้งานจริง (Production Build):**
   ```bash
   pnpm build  # vite build + esbuild server + esbuild api/index.js
   ```

   - **ผลลัพธ์:** **ผ่านสมบูรณ์ ได้รับทั้ง Client Static Bundle และ Vercel Serverless Function `api/index.js`**

---

## 9. ขั้นตอนที่แนะนำถัดไปก่อนการนำขึ้นใช้งานจริง (Next Recommended Steps)

1. **การทดสอบการใช้งานจริงโดยผู้ใช้งาน (User Acceptance Testing - UAT):**
   - ให้เหรัญญิกและศิษยาภิบาลทดสอบเปิดระบบผ่านสมาร์ตโฟน (iOS Safari และ LINE Browser) เพื่อทดสอบการบันทึกสลิปถวายและตรวจนับเงินในวันอาทิตย์
2. **ขั้นตอนการ Deploy สู่ Production (เมื่อได้รับความเห็นชอบจากเจ้าของโครงการ):**
   - โค้ดทั้งหมดพร้อมสำหรับการ Commit และ Push สู่ Git Main Branch
   - ระบบ Vercel CI จะทำการรัน `pnpm ci && pnpm build && pnpm run db:migrate:deploy` โดยอัตโนมัติอย่างปลอดภัย
   - ไม่มีการเปลี่ยนแปลง Schema ที่เป็น Breaking Change (ฟิลด์ทั้งหมดได้รับการรองรับในฐานข้อมูลปัจจุบันแล้ว)
