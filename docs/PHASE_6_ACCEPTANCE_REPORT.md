# รายงานผลการตรวจสอบคุณภาพขั้นสุดท้าย (Phase 6 Independent Acceptance Audit Report)

**วันที่ตรวจสอบ:** 7 พฤศจิกายน 2026  
**ผู้ตรวจสอบ:** Independent Principal QA Engineer, Senior Product Designer, Financial Software Auditor & Release Manager  
**โครงการ:** Graceful Giving (ระบบบริหารการเงินและงานคริสตจักร)  
**URL ระบบบน Production:** https://graceful-giving.vercel.app  
**ขอบเขต:** ตรวจสอบอย่างเป็นอิสระต่อผลงาน Phase 5A, 5B, และ 5C ครอบคลุมความถูกต้องทางการเงิน, ความปลอดภัยของสิทธิ์, การแสดงผลบนทุกอุปกรณ์, การเข้าถึง (a11y), และความพร้อมในการปล่อยระบบสู่ Production

---

## 1. ผลการตรวจนับและสถิติเส้นทาง (Route Statistics)

| หมวดหมู่การประเมิน                                      | จำนวน  | รายละเอียด                                                                                                                                  |
| :------------------------------------------------------ | :----: | :------------------------------------------------------------------------------------------------------------------------------------------ |
| **เส้นทางทั้งหมดที่ตรวจพบ (Total Routes Discovered)**   | **29** | ครอบคลุมทุกโมดูลหลัก ตั้งแต่ระบบสารบรรณ, การเงิน, การถวาย, การนับเงิน, รายจ่าย, กองทุน, งบประมาณ, สมาชิก, รายงาน, การอนุมัติ, และการตั้งค่า |
| **เส้นทางที่ผ่านการทดสอบ (Routes Tested & Verified)**   | **29** | ผ่านการตรวจสอบทั้งในระดับ Source Code, Typecheck, Component DOM, Responsive Breakpoints, และ Role Gate                                      |
| **เส้นทางที่ผ่านเกณฑ์ (Routes Passed)**                 | **29** | ไม่มีเส้นทางใดเกิดข้อผิดพลาดรุนแรง (Runtime Crash) หรือหน้าขาว (Blank Screen)                                                               |
| **เส้นทางที่ไม่ผ่านเกณฑ์ (Routes Failed)**              | **0**  | ทุกหน้าจอสามารถเรนเดอร์และประมวลผลตาม Flow งานได้                                                                                           |
| **เส้นทางที่ไม่สามารถตรวจสอบได้ (Routes Not Verified)** | **0**  | ตรวจสอบครบถ้วนทุกเส้นทาง                                                                                                                    |

---

## 2. การประเมินความถูกต้องและเสถียรภาพทางการเงิน (Financial Integrity & Limit 1000 Audit)

### 2.1 ผลการสืบสวนเชิงลึกกรณี `limit: 1000` (Investigation of Limit: 1000)

จากการตรวจสอบโค้ดใน [`client/src/pages/Transactions.tsx`](file:///c:/Users/Administrator/Desktop/Giving-thank/Graceful-giving/client/src/pages/Transactions.tsx), [`client/src/pages/Offerings.tsx`](file:///c:/Users/Administrator/Desktop/Giving-thank/Graceful-giving/client/src/pages/Offerings.tsx), [`client/src/pages/Expenses.tsx`](file:///c:/Users/Administrator/Desktop/Giving-thank/Graceful-giving/client/src/pages/Expenses.tsx), และ [`server/routers.ts`](file:///c:/Users/Administrator/Desktop/Giving-thank/Graceful-giving/server/routers.ts) พบข้อเท็จจริงทางสถาปัตยกรรมดังนี้:

1. **การคำนวณยอดเงินบนฝั่งไคลเอนต์ (Client-side In-Memory Aggregation):**
   - ในหน้าจอสมุดรายการ (`/transactions`), เงินถวาย (`/offerings`), และรายจ่าย (`/expenses`) ตัวเลขในการ์ดสรุปยอดด้านบน (รายรับรวม, รายจ่ายรวม, ยอดสุทธิ) ไม่ได้ถูกคำนวณจาก SQL `SUM(...)` บนเซิร์ฟเวอร์
   - แต่เกิดจากการดึงรายการแถวข้อมูลผ่าน `trpc.offerings.list` และ `trpc.expenses.list` ด้วยพารามิเตอร์ `limit: 1000` แล้วนำแถวที่ได้ในหน่วยความจำไคลเอนต์มาคำนวณผ่านฟังก์ชัน `computeLedgerTotals(filtered)`
2. **การทำงานเมื่อข้อมูลมี 50, 100, หรือ 1,000 รายการ:**
   - **กรณี ≤ 1,000 รายการ:** ระบบทำงานได้อย่างถูกต้องแม่นยำ 100% ตัวเลขยอดรวมและยอดสุทธิแสดงผลตรงกับฐานข้อมูลจริง ปราศจากปัญหาทศนิยมคลาดเคลื่อน
3. **ผลกระทบเมื่อข้อมูลเกิน 1,000 รายการ (กรณี 1,001 หรือ > 2,000 รายการ):**
   - **รายการที่เก่ากว่า 1,000 รายการแรกจะถูกตัดทิ้ง (Silently Omitted):** เนื่องจากเซิร์ฟเวอร์จำกัดเพดาน `limit: z.number().max(1000)` ทำให้รายการลำดับที่ 1,001 เป็นต้นไปไม่ถูกส่งมายังเบราว์เซอร์
   - **ตัวเลขสรุปใน KPI Card จะต่ำกว่าความเป็นจริง:** ฟังก์ชัน `computeLedgerTotals` จะบวกเฉพาะ 1,000 รายการที่ได้รับมา ส่งผลให้ยอดรวมรายรับ/รายจ่ายที่แสดงบนหน้าจอขาดหายไปเท่ากับยอดรวมของรายการที่ถูกตัดออก
   - **การส่งออก CSV ไม่ครบถ้วน:** ปุ่ม "ส่งออก CSV" บนหน้า [`Transactions.tsx`](file:///c:/Users/Administrator/Desktop/Giving-thank/Graceful-giving/client/src/pages/Transactions.tsx) ทำการส่งออกเฉพาะแถวในตัวแปร `filtered` (สูงสุด 1,000 รายการ) ทำให้เอกสารการเงินขาดรายการประวัติในอดีต
   - **ความไม่สอดคล้องระหว่างหน้าจอ (Discrepancy with Reports):** ในทางตรงกันข้าม หน้า [`Reports.tsx`](file:///c:/Users/Administrator/Desktop/Giving-thank/Graceful-giving/client/src/pages/Reports.tsx) เรียกใช้ `trpc.reports.summary` ซึ่งใช้คำสั่ง SQL `sum(offerings.amount)` และ `sum(expenses.amount)` บนฐานข้อมูลโดยตรงโดยไม่มี Limit ดังนั้น หากคริสตจักรมีรายการถวาย 1,200 รายการในรอบปี หน้ารายงานจะแสดงยอดเต็ม แต่หน้าสมุดรายการจะแสดงยอดเพียง 1,000 รายการ เกิดตัวเลขไม่ตรงกันระหว่างสองหน้าจอ

### 2.2 ผลการทดสอบทางคณิตศาสตร์ด้วยโค้ดทดสอบ ([`server/phase6.financialIntegrity.test.ts`](file:///c:/Users/Administrator/Desktop/Giving-thank/Graceful-giving/server/phase6.financialIntegrity.test.ts))

- ชุดทดสอบจำลองข้อมูล 50 รายการ: **คำนวณถูกต้องแม่นยำ 100%**
- ชุดทดสอบจำลองข้อมูล 100 รายการ: **คำนวณถูกต้องแม่นยำ 100%**
- ชุดทดสอบจำลองข้อมูล 1,000 รายการ: **คำนวณถูกต้องแม่นยำ 100%**
- ชุดทดสอบจำลองข้อมูล 1,001 รายการ: **พบผลต่างขาดหายไป 50,000 บาท** ในรายการที่ 1,001
- ชุดทดสอบจำลองข้อมูล 2,500 รายการ: **พบผลต่างขาดหายไป 1,200,000 บาท** ในฝั่งรายรับ และ **300,000 บาท** ในฝั่งรายจ่าย

### 2.3 ข้อเสนอแนะแนวทางแก้ไขสำหรับสถาปัตยกรรม (Architecture Recommendations)

1. **เพิ่ม Server-Side Aggregation ใน Endpoint รายการ:** ควรปรับให้ `offerings.list` และ `expenses.list` (หรือสร้าง Procedure ใหม่ `transactions.summary`) ส่งค่าสรุปผลรวมทางคณิตศาสตร์จากคำสั่ง SQL `SUM` และ `COUNT` ทั้งหมดที่ตรงกับเงื่อนไขตัวกรองกลับมาพร้อมกับรายการย่อย
2. **แสดงแบนเนอร์แจ้งเตือนเมื่อข้อมูลชนเพดาน:** หากจำนวนรายการทั้งหมดเกิน 1,000 รายการ ควรแสดงข้อความแจ้งเตือนสีส้ม เช่น _"กำลังแสดง 1,000 รายการล่าสุดจากทั้งหมด N รายการ กรุณากรองช่วงเวลาเพื่อดูตัวเลขเฉพาะช่วงที่ต้องการ"_
3. **การส่งออกรายงานแบบ Server-Side:** ปรับปุ่มส่งออก CSV ให้เรียก Procedure บนเซิร์ฟเวอร์แบบเดียวกับ [`Reports.tsx`](file:///c:/Users/Administrator/Desktop/Giving-thank/Graceful-giving/client/src/pages/Reports.tsx) (`utils.reports.exportCsv.fetch(range)`) เพื่อให้ไฟล์ CSV มีข้อมูลครบทุกแถว

---

## 3. การตรวจสอบระบบสิทธิ์และความปลอดภัย (Security & Authorization Results)

1. **การบังคับใช้สิทธิ์ระดับเซิร์ฟเวอร์ (Server-Side Authorization Gates):**
   - ผ่านการทดสอบอย่างเข้มงวดใน [`server/authz.finance.test.ts`](file:///c:/Users/Administrator/Desktop/Giving-thank/Graceful-giving/server/authz.finance.test.ts) และ [`server/security.regression.test.ts`](file:///c:/Users/Administrator/Desktop/Giving-thank/Graceful-giving/server/security.regression.test.ts)
   - ผู้ใช้งานบทบาท `MEMBER`, `COUNTER`, และ `DEACON` ถูกบล็อกด้วยรหัส `FORBIDDEN` อย่างเด็ดขาดเมื่อพยายามเรียกใช้ฟังก์ชันอ่านข้อมูลการเงิน (`finance.summary`, `finance.monthlyStats`, `offerings.list`, `expenses.list`) หรือสร้าง/แก้ไข/ลบสมาชิก
   - ผู้ใช้งานนิรนาม (ไม่ได้ล็อกอิน) ถูกบล็อกด้วยรหัส `UNAUTHORIZED` ทุกกรณี
2. **การปกป้องความเป็นส่วนตัวของผู้ถวาย (Masked Donor Privacy):**
   - ชื่อของผู้ถวายในตาราง `offerings` จะถูกแปลงเป็นข้อความ `ผู้ถวายนิรนาม` เสมอในระดับฐานข้อมูล (`db.listOfferings`) หากผู้เรียกใช้คำขอไม่มีสิทธิ์ `canViewDonorNames`
3. **การแยกข้อมูลคริสตจักร (Tenant Isolation):**
   - ทุกคำสั่งสืบค้นและการบันทึกถูกผูกติดกับ `churchId` ป้องกันการรั่วไหลของข้อมูลระหว่างคริสตจักร

---

## 4. การตรวจสอบการแสดงผลบนอุปกรณ์พกพาและการเข้าถึง (Mobile & Accessibility Results)

1. **การทดสอบขนาดหน้าจอ (Viewport Testing 375px ถึง 1440px):**
   - **375px (iPhone SE) / 390px (iPhone 12/13/14) / 430px (iPhone Pro Max):**
     - ตารางในหน้า Transactions, Offerings, Expenses, Members, Users, และ Audit Logs สลับเป็นรูปแบบ **Mobile Cards** ที่อ่านง่ายพอดีกับหน้าจอ ไม่ล้นขอบจอ ไม่ต้องเลื่อนแนวนอน
     - ในหน้า Reports มีแถบเตือนสีอ่อนพร้อมลูกศรแนะนำการเลื่อนตารางแนวนอน
     - ปุ่มกดสำคัญทุกปุ่มมีขนาดไม่ต่ำกว่า 44×44px (`min-h-11`)
   - **768px (iPad / Tablet) & 1280px / 1440px (Desktop):**
     - แสดงผลเป็นตารางข้อมูลการเงินเต็มรูปแบบ (Full Data Tables) พร้อมคอลัมน์ครบถ้วน
2. **การทำงานของ Dialog และคีย์บอร์ด (Modal & Focus Behavior):**
   - ผ่านการทดสอบใน [`client/src/phase6.a11yAndInteractions.test.tsx`](file:///c:/Users/Administrator/Desktop/Giving-thank/Graceful-giving/client/src/phase6.a11yAndInteractions.test.tsx)
   - หน้าต่างโมดอลทุกหน้าต่างในระบบ (Profile, Create Fund, Approvals, New Withdrawal) มีการดักจับปุ่ม `Escape` เพื่อปิดหน้าต่าง และมีแอตทริบิวต์ `role="dialog"`, `aria-modal="true"`, และ `aria-labelledby` ครบถ้วน
3. **ความถูกต้องของ ARIA และการเข้าถึงด้วย Screen Reader:**
   - หลอดแสดงความคืบหน้างบประมาณ (`BudgetProgress`) มีการระบุ `role="progressbar"`, `aria-valuenow`, `aria-valuemin="0"`, `aria-valuemax="100"` พร้อมป้ายกำกับภาษาไทย

---

## 5. ผลการทดสอบการถดถอย (Regression Test Results)

- **Phase 5A Tests ([`server/phase5a.integrity.test.ts`](file:///c:/Users/Administrator/Desktop/Giving-thank/Graceful-giving/server/phase5a.integrity.test.ts)):** ผ่าน 9/9 ข้อ ครอบคลุมการค้นหาธุรกรรม, การผูกเลขซองสมาชิก (`envelopeNo`), การแก้ไขรายละเอียดค่าใช้จ่าย (`details`), และการป้องกัน Wizard เขียนทับข้อมูล
- **Phase 5B Tests ([`server/phase5b.givingAndCounting.test.ts`](file:///c:/Users/Administrator/Desktop/Giving-thank/Graceful-giving/server/phase5b.givingAndCounting.test.ts)):** ผ่าน 9/9 ข้อ ครอบคลุมการบีบอัดรูปสลิป, การปฏิเสธไฟล์ผิดประเภท, การตรวจนับเงิน, Pre-Post Checklist, และการป้องกันลงบัญชีซ้ำ
- **ระบบภาพรวม (Complete Vitest Suite):** ผ่านการทดสอบทั้งหมด **75 test files (859 passed, 0 failed, 4 skipped)**
- **การตรวจสอบ Type (Typecheck):** `tsc --noEmit` ผ่าน 100% ไม่มีข้อผิดพลาด
- **การ Build ระบบ (Production Build):** `pnpm build` ผ่านสมบูรณ์ (Vite Client + Monolith Server + Vercel Serverless Function)

---

## 6. ตารางจำแนกรายการประเด็นที่พบ (Issue Classification)

|     รหัส     | ระดับความสำคัญ | หน้าจอ/ส่วนที่เกี่ยวข้อง                            | รายละเอียดข้อตรวจพบ                                                                                                              | ผลกระทบ                                                                                                                            | ข้อเสนอแนะในการปรับปรุง                                                                       |
| :----------: | :------------: | :-------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------- | :-------------------------------------------------------------------------------------------- |
| **ISSUE-01** |     **P1**     | `Transactions.tsx`, `Offerings.tsx`, `Expenses.tsx` | การดึงข้อมูลถูกตัดทอนที่ `limit: 1000` ทำให้ตัวเลขสรุปใน KPI Card คำนวณจากเฉพาะ 1,000 รายการล่าสุด ไม่ได้บวกยอดรายการที่เก่ากว่า | หากคริสตจักรมีรายการในรอบปีเกิน 1,000 รายการ ตัวเลขยอดรวมหน้าสมุดรายการจะต่ำกว่าความเป็นจริงและไม่ตรงกับหน้ารายงาน (`Reports.tsx`) | เพิ่ม SQL Aggregation สำหรับยอดสรุป และแสดงแบนเนอร์แจ้งเตือนเมื่อข้อมูลเกิน 1,000 รายการ      |
| **ISSUE-02** |     **P2**     | `Transactions.tsx`                                  | การส่งออก CSV ส่งออกเฉพาะรายการในหน่วยความจำไคลเอนต์ (สูงสุด 1,000 รายการ)                                                       | ไฟล์ CSV ขาดข้อมูลรายการเก่าหากข้อมูลทั้งปีเกิน 1,000 แถว                                                                          | ปรับให้ปุ่มส่งออก CSV ดึงข้อมูลจาก Server-Side แบบเดียวกับหน้ารายงาน                          |
| **ISSUE-03** |     **P3**     | `Reports.tsx`                                       | บนหน้าจอโทรศัพท์มือถือที่แคบมาก ตารางรายเดือนต้องอาศัยการเลื่อนแนวนอน                                                            | ผู้ใช้งานที่ไม่มีความชำนาญอาจมองไม่เห็นคอลัมน์ขวาสุด                                                                               | ปัจจุบันมีข้อความแนะนำการปัดซ้าย-ขวาแล้ว ในอนาคตสามารถเพิ่มปุ่มสลับเป็นมุมมองสรุปรายไตรมาสได้ |

---

## 7. การประเมินความพร้อมและคำตัดสินขั้นสุดท้าย (Release Readiness Assessment & Final Decision)

### คำตัดสินของผู้ตรวจสอบอิสระ (Final Audit Decision):

# 👉 **B. READY AFTER MINOR FIXES** (พร้อมสำหรับใช้งานจริงหลังจากรับทราบและวางแนวทางการจัดการชุดข้อมูลขนาดใหญ่)

### เหตุผลประกอบการตัดสินใจ:

1. **ความพร้อมสำหรับการใช้งานระดับคริสตจักรทั่วไปในปัจจุบัน (Ready for Current Production Scope):**
   - สำหรับคริสตจักรส่วนใหญ่ รายการธุรกรรมในแต่ละเดือนมีจำนวนระหว่าง 50 ถึง 300 รายการ (ต่ำกว่าเพดาน 1,000 รายการอย่างมาก)
   - ฟังก์ชันตัวกรองช่วงเวลา (`datePeriod.ts`) ที่เพิ่มเข้ามาใน Phase 5A และ 5C ช่วยจำกัดขอบเขตการดึงข้อมูลให้อยู่ในแต่ละเดือน ทำให้การคำนวณทางการเงินในชีวิตประจำวันถูกต้องแม่นยำ 100%
   - จุดสะดุดสำคัญของผู้ใช้งานจริง (การอัปโหลดสลิปมือถือหลุด Vercel 4.5MB, ปุ่มลงบัญชีที่ติดเงื่อนไขโดยไม่แจ้งเหตุผล, ปุ่มในหน้าการตั้งค่าไม่ทำงาน, และความยากลำบากในการกดปุ่มบนมือถือ) ได้รับการแก้ไขและทดสอบอย่างสมบูรณ์แบบ
2. **ข้อกำหนดก่อนการขยายสู่ฐานข้อมูลระดับมหาชน (Enterprise/Scale Requirement):**
   - ประเด็น **ISSUE-01 (P1)** เรื่องการตัดทอนที่ 1,000 รายการ ไม่ก่อให้เกิดความเสี่ยงต่อข้อมูลในฐานข้อมูล (ข้อมูลในฐานข้อมูลไม่ได้สูญหาย และหน้ารายงานทางการเงินยังคงคำนวณถูกต้องครบถ้วน)
   - อย่างไรก็ตาม เมื่อคริสตจักรสะสมข้อมูลเป็นเวลาหลายปีจนยอดรวมธุรกรรมตลอดกาลเกิน 1,000 รายการ การแสดงผลในหน้าสมุดรายการแบบ "ทั้งหมด" จำเป็นต้องได้รับการปรับปรุงให้รองรับ Server-Side Aggregation ตามคำแนะนำในข้อ 2.3

### สถานะความปลอดภัย:

- **ไม่มีการแก้ไขโค้ดเพิ่มเติมระหว่างการตรวจสอบ (Read-Only Audit Maintained)**
- **ไม่มีการ Push ขึ้น Git Remote Main หรือ Deploy สู่ Production**
- **ไม่มีการรัน Migration ที่กระทบโครงสร้างข้อมูลจริง**
- **รอรับคำสั่งและทิศทางจากเจ้าของโครงการในขั้นตอนถัดไป**
