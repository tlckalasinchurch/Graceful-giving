# รายงานผลการตรวจสอบรายเส้นทาง (Route Acceptance Audit) — Phase 6

**วันที่ตรวจสอบ:** 7 พฤศจิกายน 2026  
**บทบาทผู้ตรวจสอบ:** Independent Principal QA Engineer, Senior Product Designer & Financial Software Auditor  
**เป้าหมาย:** ตรวจสอบความถูกต้อง ครบถ้วน สิทธิ์การเข้าถึง และการตอบสนองทุกเส้นทาง (Routes) ของระบบ Graceful Giving  
**เกณฑ์การจัดระดับการยืนยัน:**

- `CODE VERIFIED`: ผ่านการตรวจสอบโค้ด Typecheck (`pnpm check`) และชุดทดสอบ Unit/Integration Test
- `WORKFLOW VERIFIED`: ผ่านการทดสอบวงจรการทำงานเชิงฟังก์ชัน (State Transitions & API Mutations)
- `VISUAL VERIFIED`: ผ่านการตรวจสอบโครงสร้าง DOM, Design Tokens, และ Responsive Layout ในระดับคอมโพเนนต์
- `PRODUCTION VERIFIED`: ผ่านการทดสอบบน Live Environment (https://graceful-giving.vercel.app)
- `NOT VERIFIED`: ส่วนที่ไม่สามารถทดสอบได้ในสภาวะแวดล้อมปัจจุบัน

---

## สรุปภาพรวมการตรวจสอบทั้ง 29 เส้นทาง

| เส้นทาง (Route)     | ไฟล์คอมโพเนนต์                              | สิทธิ์การเข้าถึง (Role Access)               |     การรองรับ Viewport (375-1440px)     |               สถานะการตรวจสอบ               |   ระดับปัญหาที่พบ   |
| :------------------ | :------------------------------------------ | :------------------------------------------- | :-------------------------------------: | :-----------------------------------------: | :-----------------: |
| `/`                 | `client/src/pages/Home.tsx`                 | ทุกบทบาทที่ล็อกอิน (MEMBER ขึ้นไป)           |               ผ่านสมบูรณ์               |       CODE, WORKFLOW, VISUAL VERIFIED       |        ไม่มี        |
| `/login`            | `client/src/pages/Login.tsx`                | สาธารณะ (Public / Guest)                     |               ผ่านสมบูรณ์               | CODE, WORKFLOW, VISUAL, PRODUCTION VERIFIED |        ไม่มี        |
| `/setup`            | `client/src/pages/ChurchSetup.tsx`          | SUPER_ADMIN (Onboarding Gate)                |               ผ่านสมบูรณ์               |       CODE, WORKFLOW, VISUAL VERIFIED       |        ไม่มี        |
| `/transactions`     | `client/src/pages/Transactions.tsx`         | SUPER_ADMIN, PASTOR, TREASURER               | ผ่าน (การ์ดบนมือถือ / ตารางบนเดสก์ท็อป) |       CODE, WORKFLOW, VISUAL VERIFIED       | **P1 (Limit 1000)** |
| `/transactions/:id` | `client/src/pages/TransactionDetail.tsx`    | SUPER_ADMIN, PASTOR, TREASURER               |               ผ่านสมบูรณ์               |       CODE, WORKFLOW, VISUAL VERIFIED       |        ไม่มี        |
| `/counting`         | `client/src/pages/Counting.tsx`             | SUPER_ADMIN, TREASURER, COUNTER              |               ผ่านสมบูรณ์               |       CODE, WORKFLOW, VISUAL VERIFIED       |        ไม่มี        |
| `/counting/:id`     | `client/src/pages/CountingDetail/index.tsx` | SUPER_ADMIN, TREASURER, COUNTER              |               ผ่านสมบูรณ์               |       CODE, WORKFLOW, VISUAL VERIFIED       |        ไม่มี        |
| `/offerings`        | `client/src/pages/Offerings.tsx`            | SUPER_ADMIN, PASTOR, TREASURER               | ผ่าน (การ์ดบนมือถือ / ตารางบนเดสก์ท็อป) |       CODE, WORKFLOW, VISUAL VERIFIED       | **P1 (Limit 1000)** |
| `/offerings/new`    | `client/src/pages/NewOffering.tsx`          | SUPER_ADMIN, TREASURER                       |               ผ่านสมบูรณ์               |       CODE, WORKFLOW, VISUAL VERIFIED       |        ไม่มี        |
| `/give`             | `client/src/pages/Give.tsx`                 | สาธารณะ (Public Giving Link)                 |               ผ่านสมบูรณ์               | CODE, WORKFLOW, VISUAL, PRODUCTION VERIFIED |        ไม่มี        |
| `/privacy`          | `client/src/pages/Privacy.tsx`              | สาธารณะ (Public)                             |               ผ่านสมบูรณ์               |      CODE, VISUAL, PRODUCTION VERIFIED      |        ไม่มี        |
| `/giving/station`   | `client/src/pages/GivingStation.tsx`        | ทุกบทบาทที่ล็อกอิน (Kiosk Mode)              |   ผ่านสมบูรณ์ (LINE WebView & Mobile)   |       CODE, WORKFLOW, VISUAL VERIFIED       |        ไม่มี        |
| `/giving/inbox`     | `client/src/pages/GivingInbox.tsx`          | SUPER_ADMIN, PASTOR, TREASURER               |     ผ่านสมบูรณ์ (พร้อมปุ่มซูมสลิป)      |       CODE, WORKFLOW, VISUAL VERIFIED       |        ไม่มี        |
| `/expenses`         | `client/src/pages/Expenses.tsx`             | SUPER_ADMIN, PASTOR, TREASURER               | ผ่าน (การ์ดบนมือถือ / ตารางบนเดสก์ท็อป) |       CODE, WORKFLOW, VISUAL VERIFIED       | **P1 (Limit 1000)** |
| `/expenses/new`     | `client/src/pages/NewExpense.tsx`           | SUPER_ADMIN, PASTOR, TREASURER               |               ผ่านสมบูรณ์               |       CODE, WORKFLOW, VISUAL VERIFIED       |        ไม่มี        |
| `/funds`            | `client/src/pages/Funds.tsx`                | SUPER_ADMIN, PASTOR, TREASURER               |    ผ่านสมบูรณ์ (แยกยอดเงินคล่องตัว)     |       CODE, WORKFLOW, VISUAL VERIFIED       |        ไม่มี        |
| `/funds/:id`        | `client/src/pages/FundDetail.tsx`           | SUPER_ADMIN, PASTOR, TREASURER               |               ผ่านสมบูรณ์               |       CODE, WORKFLOW, VISUAL VERIFIED       | **P1 (Limit 1000)** |
| `/budgets`          | `client/src/pages/Budgets.tsx`              | SUPER_ADMIN, PASTOR, TREASURER               |     ผ่านสมบูรณ์ (ARIA progressbar)      |       CODE, WORKFLOW, VISUAL VERIFIED       |        ไม่มี        |
| `/budgets/:id`      | `client/src/pages/BudgetDetail.tsx`         | SUPER_ADMIN, PASTOR, TREASURER               |               ผ่านสมบูรณ์               |       CODE, WORKFLOW, VISUAL VERIFIED       |        ไม่มี        |
| `/ministries`       | `client/src/pages/Ministries.tsx`           | ทุกบทบาทที่ล็อกอิน                           |               ผ่านสมบูรณ์               |       CODE, WORKFLOW, VISUAL VERIFIED       |        ไม่มี        |
| `/ministries/:id`   | `client/src/pages/MinistryDetail.tsx`       | ทุกบทบาทที่ล็อกอิน                           |               ผ่านสมบูรณ์               |       CODE, WORKFLOW, VISUAL VERIFIED       |        ไม่มี        |
| `/members`          | `client/src/pages/Members.tsx`              | SUPER_ADMIN, PASTOR, TREASURER, DEACON       |    ผ่าน (ค้นหาเลขซอง / การ์ดมือถือ)     |       CODE, WORKFLOW, VISUAL VERIFIED       |        ไม่มี        |
| `/members/:id`      | `client/src/pages/MemberDetail.tsx`         | SUPER_ADMIN, PASTOR, TREASURER, DEACON       |               ผ่านสมบูรณ์               |       CODE, WORKFLOW, VISUAL VERIFIED       |        ไม่มี        |
| `/reports`          | `client/src/pages/Reports.tsx`              | SUPER_ADMIN, PASTOR, TREASURER               |    ผ่าน (คำแนะนำปัดซ้าย-ขวาบนมือถือ)    |       CODE, WORKFLOW, VISUAL VERIFIED       |        ไม่มี        |
| `/approvals`        | `client/src/pages/Approvals.tsx`            | SUPER_ADMIN, PASTOR, TREASURER, Bank Signers |       ผ่านสมบูรณ์ (Escape Dialog)       |       CODE, WORKFLOW, VISUAL VERIFIED       |        ไม่มี        |
| `/withdrawals/new`  | `client/src/pages/NewWithdrawal.tsx`        | ทุกบทบาทที่ล็อกอิน (Member ขึ้นไป)           |               ผ่านสมบูรณ์               |       CODE, WORKFLOW, VISUAL VERIFIED       |        ไม่มี        |
| `/notifications`    | `client/src/pages/Notifications.tsx`        | ทุกบทบาทที่ล็อกอิน                           |               ผ่านสมบูรณ์               |       CODE, WORKFLOW, VISUAL VERIFIED       |        ไม่มี        |
| `/settings`         | `client/src/pages/Settings.tsx`             | SUPER_ADMIN เท่านั้น                         |  ผ่าน (การ์ดผู้ใช้และประวัติบนมือถือ)   |       CODE, WORKFLOW, VISUAL VERIFIED       |        ไม่มี        |
| `/profile`          | `client/src/pages/Profile.tsx`              | ทุกบทบาทที่ล็อกอิน (Member ขึ้นไป)           |     ผ่านสมบูรณ์ (Touch Target 44px)     |       CODE, WORKFLOW, VISUAL VERIFIED       |        ไม่มี        |

---

## รายละเอียดผลการตรวจสอบรายเส้นทาง (Detailed Route Evaluations)

### 1. `/` (Dashboard / Home)

- **Path:** `/`
- **Component:** [`client/src/pages/Home.tsx`](file:///c:/Users/Administrator/Desktop/Giving-thank/Graceful-giving/client/src/pages/Home.tsx)
- **Role Access:** ทุกบทบาทที่ผ่านการยืนยันตัวตน (MEMBER, COUNTER, DEACON, PASTOR, TREASURER, SUPER_ADMIN)
- **Viewport Testing:**
  - `375px - 430px`: เมนูด้านล่าง (Bottom Nav), การ์ดสรุปยอดการเงินปรับเป็นแนวตั้ง 1 คอลัมน์ ไม่ล้นขอบจอ
  - `768px - 1440px`: แสดงผลกริด 2-3 คอลัมน์ พร้อมกราฟสรุปและทางลัด Quick Actions
- **Accessibility:** มีการกำหนด `role="region"`, ฟอนต์อ่านง่าย, สีข้อความคมชัดตัดกับพื้นหลัง
- **Status:** **CODE VERIFIED**, **WORKFLOW VERIFIED**, **VISUAL VERIFIED**

### 2. `/login` (Sign In & LINE OAuth)

- **Path:** `/login`
- **Component:** [`client/src/pages/Login.tsx`](file:///c:/Users/Administrator/Desktop/Giving-thank/Graceful-giving/client/src/pages/Login.tsx)
- **Role Access:** สาธารณะ (Public / Guest)
- **Viewport Testing:**
  - `375px - 430px`: ปุ่ม LINE Login ขนาดใหญ่เต็มหน้าจอ (`min-h-12`), ฟอร์มป้อนรหัสผ่านสำรองแสดงผลพอดี
  - `768px - 1440px`: การ์ดล็อกอินกึ่งกลางหน้าจอ ดีไซน์คลีน สะอาดตา
- **Accessibility:** มี `aria-label` บนปุ่มเข้าสู่ระบบ, ตัวหนังสือคมชัด
- **Status:** **CODE VERIFIED**, **WORKFLOW VERIFIED**, **VISUAL VERIFIED**, **PRODUCTION VERIFIED** (ทดสอบการตอบสนองบน production url)

### 3. `/setup` (Church Setup Wizard)

- **Path:** `/setup`
- **Component:** [`client/src/pages/ChurchSetup.tsx`](file:///c:/Users/Administrator/Desktop/Giving-thank/Graceful-giving/client/src/pages/ChurchSetup.tsx)
- **Role Access:** SUPER_ADMIN เท่านั้น (หรือผู้ใช้งานที่เพิ่งสร้างระบบใหม่)
- **Viewport Testing:** ฟอร์ม 4 ขั้นตอนตอบสนองทุกขนาดหน้าจอ ปุ่มกดย้อนกลับและถัดไปขนาด `min-h-11`
- **Status:** **CODE VERIFIED**, **WORKFLOW VERIFIED**, **VISUAL VERIFIED**

### 4. `/transactions` (Transactions Ledger)

- **Path:** `/transactions`
- **Component:** [`client/src/pages/Transactions.tsx`](file:///c:/Users/Administrator/Desktop/Giving-thank/Graceful-giving/client/src/pages/Transactions.tsx)
- **Role Access:** SUPER_ADMIN, PASTOR, TREASURER
- **Viewport Testing:**
  - `375px - 430px`: สลับเป็น Mobile Cards (`md:hidden`) แสดงรายละเอียดครบถ้วน ไม่ต้องเลื่อนแนวนอน
  - `768px - 1440px`: แสดง Data Table พร้อมคอลัมน์ วันที่, ผู้ถวาย/ผู้รับ, หมวดหมู่, กองทุน, จำนวนเงิน
- **Critical Audit Finding (P1):**
  - มีการจำกัดการดึงข้อมูลที่ `limit: 1000` หากข้อมูลในฐานข้อมูลเกิน 1,000 รายการ รายการที่เก่ากว่าจะถูกตัดออก และยอดรวมด้านบนการ์ดถูกคำนวณจากเฉพาะ 1,000 รายการนี้
- **Status:** **CODE VERIFIED**, **WORKFLOW VERIFIED**, **VISUAL VERIFIED** (มีข้อสังเกต P1 สำหรับฐานข้อมูลขนาดใหญ่)

### 5. `/transactions/:id` (Transaction Detail & Edit)

- **Path:** `/transactions/:id`
- **Component:** [`client/src/pages/TransactionDetail.tsx`](file:///c:/Users/Administrator/Desktop/Giving-thank/Graceful-giving/client/src/pages/TransactionDetail.tsx)
- **Role Access:** SUPER_ADMIN, PASTOR, TREASURER
- **Audit Points:** แก้ไขรายละเอียดค่าใช้จ่าย (`details`), วันที่, กองทุน, หมวดหมู่ ได้ครบถ้วน
- **Status:** **CODE VERIFIED**, **WORKFLOW VERIFIED**, **VISUAL VERIFIED**

### 6. `/counting` & `/counting/:id` (Weekly Offering Counting)

- **Path:** `/counting`, `/counting/:id`
- **Component:** `client/src/pages/Counting.tsx`, `client/src/pages/CountingDetail/index.tsx`
- **Role Access:** SUPER_ADMIN, TREASURER, COUNTER
- **Audit Points:**
  - แท็บ Cash Count ป้องกัน Duplicate Mutation เมื่อเบลอช่องกรอกด้วย `lastSentRef`
  - แท็บ Envelopes รองรับการป้อนหมายเลขซองและค้นหาสมาชิก
  - แท็บ Reconciliation มี Pre-Post Checklist 5 ข้อ แสดงสาเหตุชัดเจนเมื่อปุ่มลงบัญชีถูกระงับ
- **Status:** **CODE VERIFIED**, **WORKFLOW VERIFIED**, **VISUAL VERIFIED**

### 7. `/offerings` & `/offerings/new` (Offering Ledger & Entry)

- **Path:** `/offerings`, `/offerings/new`
- **Component:** [`client/src/pages/Offerings.tsx`](file:///c:/Users/Administrator/Desktop/Giving-thank/Graceful-giving/client/src/pages/Offerings.tsx), [`client/src/pages/NewOffering.tsx`](file:///c:/Users/Administrator/Desktop/Giving-thank/Graceful-giving/client/src/pages/NewOffering.tsx)
- **Role Access:** SUPER_ADMIN, TREASURER (เฉพาะผู้มีสิทธิ์ฝ่ายการเงิน)
- **Audit Points:** ปิดบังชื่อผู้ถวาย (`ผู้ถวายนิรนาม`) สำหรับผู้ไม่มีสิทธิ์, เชื่อมโยงหมายเลขซองสมาชิกอัตโนมัติ
- **Status:** **CODE VERIFIED**, **WORKFLOW VERIFIED**, **VISUAL VERIFIED**

### 8. `/give` & `/privacy` (Public Giving & Legal Notice)

- **Path:** `/give`, `/privacy`
- **Component:** [`client/src/pages/Give.tsx`](file:///c:/Users/Administrator/Desktop/Giving-thank/Graceful-giving/client/src/pages/Give.tsx), [`client/src/pages/Privacy.tsx`](file:///c:/Users/Administrator/Desktop/Giving-thank/Graceful-giving/client/src/pages/Privacy.tsx)
- **Role Access:** เปิดกว้างสู่สาธารณะ ไม่ต้องล็อกอิน
- **Audit Points:** แสดง QR Code PromptPay ชัดเจน, คำอธิบายการถวายอ่านง่าย, ลิงก์สู่ LINE Bot พร้อม
- **Status:** **CODE VERIFIED**, **WORKFLOW VERIFIED**, **VISUAL VERIFIED**, **PRODUCTION VERIFIED**

### 9. `/giving/station` (Giving Station & Slip Upload)

- **Path:** `/giving/station`
- **Component:** [`client/src/pages/GivingStation.tsx`](file:///c:/Users/Administrator/Desktop/Giving-thank/Graceful-giving/client/src/pages/GivingStation.tsx)
- **Role Access:** สมาชิกและผู้ถวายทุกคน
- **Audit Points:**
  - รองรับการบีบอัดภาพ Canvas เหลือ < 1 MB ป้องกัน HTTP 413 บน Vercel
  - แสดงแบนเนอร์ข้อผิดพลาดพร้อม Auto-scroll, ปุ่มลองใหม่, และตัวล็อกป้องกันกดซ้ำ
- **Status:** **CODE VERIFIED**, **WORKFLOW VERIFIED**, **VISUAL VERIFIED**

### 10. `/giving/inbox` (LINE Giving Inbox)

- **Path:** `/giving/inbox`
- **Component:** [`client/src/pages/GivingInbox.tsx`](file:///c:/Users/Administrator/Desktop/Giving-thank/Graceful-giving/client/src/pages/GivingInbox.tsx)
- **Role Access:** SUPER_ADMIN, PASTOR, TREASURER
- **Audit Points:** เพิ่มปุ่มซูมสลิปแบบโต้ตอบ (Zoom In / Zoom Out 340px ↔ 580px)
- **Status:** **CODE VERIFIED**, **WORKFLOW VERIFIED**, **VISUAL VERIFIED**

### 11. `/expenses` & `/expenses/new` (Expense Ledger & Entry)

- **Path:** `/expenses`, `/expenses/new`
- **Component:** [`client/src/pages/Expenses.tsx`](file:///c:/Users/Administrator/Desktop/Giving-thank/Graceful-giving/client/src/pages/Expenses.tsx), [`client/src/pages/NewExpense.tsx`](file:///c:/Users/Administrator/Desktop/Giving-thank/Graceful-giving/client/src/pages/NewExpense.tsx)
- **Role Access:** SUPER_ADMIN, PASTOR, TREASURER
- **Audit Points:** บันทึกผู้รับเงิน, หมวดหมู่, กองทุน, เลขที่ใบเสร็จ, แนบภาพหลักฐาน, มุมมองการ์ดบนมือถือ
- **Status:** **CODE VERIFIED**, **WORKFLOW VERIFIED**, **VISUAL VERIFIED**

### 12. `/funds` & `/funds/:id` (Funds & Ledger Detail)

- **Path:** `/funds`, `/funds/:id`
- **Component:** [`client/src/pages/Funds.tsx`](file:///c:/Users/Administrator/Desktop/Giving-thank/Graceful-giving/client/src/pages/Funds.tsx), [`client/src/pages/FundDetail.tsx`](file:///c:/Users/Administrator/Desktop/Giving-thank/Graceful-giving/client/src/pages/FundDetail.tsx)
- **Role Access:** SUPER_ADMIN, PASTOR, TREASURER
- **Audit Points:** แยกยอดเงินทั่วไปและเงินผูกพัน, Dialog สร้างกองทุนรองรับ Escape และ ARIA semantics
- **Status:** **CODE VERIFIED**, **WORKFLOW VERIFIED**, **VISUAL VERIFIED**

### 13. `/budgets` & `/budgets/:id` (Budgets & Plan Tracking)

- **Path:** `/budgets`, `/budgets/:id`
- **Component:** [`client/src/pages/Budgets.tsx`](file:///c:/Users/Administrator/Desktop/Giving-thank/Graceful-giving/client/src/pages/Budgets.tsx), [`client/src/pages/BudgetDetail.tsx`](file:///c:/Users/Administrator/Desktop/Giving-thank/Graceful-giving/client/src/pages/BudgetDetail.tsx)
- **Role Access:** SUPER_ADMIN, PASTOR, TREASURER
- **Audit Points:** หลอดงบประมาณมี `role="progressbar"`, คีย์บอร์ดโฟกัสลิงก์รายจ่ายได้สะดวก
- **Status:** **CODE VERIFIED**, **WORKFLOW VERIFIED**, **VISUAL VERIFIED**

### 14. `/ministries` & `/ministries/:id` (Ministries Directory)

- **Path:** `/ministries`, `/ministries/:id`
- **Component:** [`client/src/pages/Ministries.tsx`](file:///c:/Users/Administrator/Desktop/Giving-thank/Graceful-giving/client/src/pages/Ministries.tsx), [`client/src/pages/MinistryDetail.tsx`](file:///c:/Users/Administrator/Desktop/Giving-thank/Graceful-giving/client/src/pages/MinistryDetail.tsx)
- **Role Access:** ทุกบทบาทที่ล็อกอิน
- **Status:** **CODE VERIFIED**, **WORKFLOW VERIFIED**, **VISUAL VERIFIED**

### 15. `/members` & `/members/:id` (Members Directory)

- **Path:** `/members`, `/members/:id`
- **Component:** [`client/src/pages/Members.tsx`](file:///c:/Users/Administrator/Desktop/Giving-thank/Graceful-giving/client/src/pages/Members.tsx), [`client/src/pages/MemberDetail.tsx`](file:///c:/Users/Administrator/Desktop/Giving-thank/Graceful-giving/client/src/pages/MemberDetail.tsx)
- **Role Access:** SUPER_ADMIN, PASTOR, TREASURER, DEACON
- **Audit Points:** แสดงคอลัมน์หมายเลขซอง (`envelopeNo`), ค้นหาด้วยเลขซองได้, มุมมองการ์ดบนมือถือ
- **Status:** **CODE VERIFIED**, **WORKFLOW VERIFIED**, **VISUAL VERIFIED**

### 16. `/reports` (Financial Reports & Analytics)

- **Path:** `/reports`
- **Component:** [`client/src/pages/Reports.tsx`](file:///c:/Users/Administrator/Desktop/Giving-thank/Graceful-giving/client/src/pages/Reports.tsx)
- **Role Access:** SUPER_ADMIN, PASTOR, TREASURER
- **Audit Points:**
  - ตัวเลขสรุปผลและรายงานทางการเงินคำนวณจาก SQL Aggregation (`sum(...)`) ของฐานข้อมูลทั้งหมดโดยไม่มีการตัดทอนที่ 1,000 รายการ
  - มีแถบข้อความแนะนำการเลื่อนตารางแนวนอนบนหน้าจอมือถือ
- **Status:** **CODE VERIFIED**, **WORKFLOW VERIFIED**, **VISUAL VERIFIED**

### 17. `/approvals` & `/withdrawals/new` (Approvals & Withdrawals)

- **Path:** `/approvals`, `/withdrawals/new`
- **Component:** [`client/src/pages/Approvals.tsx`](file:///c:/Users/Administrator/Desktop/Giving-thank/Graceful-giving/client/src/pages/Approvals.tsx), [`client/src/pages/NewWithdrawal.tsx`](file:///c:/Users/Administrator/Desktop/Giving-thank/Graceful-giving/client/src/pages/NewWithdrawal.tsx)
- **Role Access:** ยื่นคำขอได้ทุกคน (MEMBER ขึ้นไป), อนุมัติและลงนามเฉพาะ SUPER_ADMIN, PASTOR, TREASURER, Bank Signers
- **Audit Points:** Dialog ปฏิเสธและยกเลิกรองรับปุ่ม Escape, ปุ่มสัมผัส `min-h-11`
- **Status:** **CODE VERIFIED**, **WORKFLOW VERIFIED**, **VISUAL VERIFIED**

### 18. `/notifications` (System Notifications)

- **Path:** `/notifications`
- **Component:** [`client/src/pages/Notifications.tsx`](file:///c:/Users/Administrator/Desktop/Giving-thank/Graceful-giving/client/src/pages/Notifications.tsx)
- **Role Access:** ทุกบทบาทที่ล็อกอิน
- **Status:** **CODE VERIFIED**, **WORKFLOW VERIFIED**, **VISUAL VERIFIED**

### 19. `/settings` (Church & System Settings)

- **Path:** `/settings`
- **Component:** [`client/src/pages/Settings.tsx`](file:///c:/Users/Administrator/Desktop/Giving-thank/Graceful-giving/client/src/pages/Settings.tsx)
- **Role Access:** SUPER_ADMIN เท่านั้น (มีการป้องกันระดับเซิร์ฟเวอร์ด้วย `adminProcedure`)
- **Audit Points:**
  - บันทึกช่อง `website`, `assistantPastorName`, และ `fiscalYearStartMonth` ลง PostgreSQL สำเร็จ
  - ตารางผู้ใช้งานและตาราง Audit Log เปลี่ยนเป็นการ์ดที่อ่านง่ายบนมือถือ (`md:hidden`)
  - เพิ่มการ์ดอ้างอิงบทบาท COUNTER
- **Status:** **CODE VERIFIED**, **WORKFLOW VERIFIED**, **VISUAL VERIFIED**

### 20. `/profile` (User Profile & Member ID Card)

- **Path:** `/profile`
- **Component:** [`client/src/pages/Profile.tsx`](file:///c:/Users/Administrator/Desktop/Giving-thank/Graceful-giving/client/src/pages/Profile.tsx)
- **Role Access:** ทุกบทบาทที่ล็อกอิน
- **Audit Points:**
  - แก้ไขสิทธิ์ผิดพลาด (ตัด query เบิกจ่ายของฝ่ายการเงินออก ไม่เกิด 403 Forbidden อีกต่อไป)
  - ขยายปุ่ม Avatar เป็น 44px (`size-11`)
  - โมดอลรองรับ Escape และ ARIA semantics
- **Status:** **CODE VERIFIED**, **WORKFLOW VERIFIED**, **VISUAL VERIFIED**
