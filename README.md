# Graceful Giving (CFOS — Church Financial Operating System)

ระบบบริหารจัดการการเงินและบัญชีคริสตจักรที่โปร่งใส ตรวจสอบได้ และปลอดภัยตามมาตรฐานการเงินคริสตจักร (Church Financial Operating System) พัฒนาขึ้นด้วยสถาปัตยกรรม Fullstack TypeScript รองรับการใช้งานของผู้นำ เหรัญญิก กรรมการนับเงิน และสมาชิก ผ่านเดสก์ท็อป แท็บเล็ต สมาร์ทโฟน และ LINE Official Account

---

## 1. ภาพรวมสถาปัตยกรรม (System Architecture)

ระบบทำงานเป็นแบบ Monolithic Process เดียวที่ให้บริการทั้ง API และเว็บแอปพลิเคชัน:

- **Frontend (Client)**:
  - **Framework**: React 19 + Vite SPA (Client-side routing ด้วย Wouter)
  - **Design System**: Editorial Fintech (สไตล์สมุดบัญชีเรียบหรู คมชัด เน้นความถูกต้องของการเงิน)
  - **Styling**: Tailwind CSS v4, Radix UI Primitives, Lucide Icons, Sonner Toaster
  - **State & Data Fetching**: TanStack React Query + tRPC Client (End-to-End Type Safety)
- **Backend (Server)**:
  - **Runtime**: Node.js, Express, tsx / esbuild
  - **API Layer**: tRPC v11 พร้อมการแบ่งสิทธิ์รัดกุม (`publicProcedure`, `protectedProcedure`, `adminProcedure`, `financeProcedure`, `churchLeaderProcedure`)
  - **Database**: PostgreSQL (Supabase Behind Transaction Pooler) ผ่าน Drizzle ORM
  - **Object Storage**: Supabase Storage (`receipts` bucket สำหรับใบเสร็จทั่วไป และ `slips` bucket แบบ Private สำหรับรูปสลิปการเงิน)
  - **Authentication**: LINE Login & LIFF Integration, Session Cookie (JWT-based พร้อมระบบ Revocation)
  - **AI Integration**: Google Gemini Vision สำหรับถอดรหัสและตรวจสอบสลิปโอนเงินอัตโนมัติ

---

## 2. ฟีเจอร์หลักของระบบ (Core Features)

### 2.1 บัญชีการเงินและกองทุนคริสตจักร (Financial Ledger & Funds)

- **ระบบหลายกองทุน (Multi-Fund Ledger)**: แยกบันทึกเงินถวายและรายจ่ายตามกองทุน (เช่น กองทุนทั่วไป, กองทุนอาคาร/ที่ดิน, กองทุนพันธกิจ)
- **บันทึกเงินถวาย (Offerings)**: รองรับทั้งเงินสดและโอนเงิน พร้อมแบ่งหมวดหมู่ (สิบลด, เงินถวายทั่วไป, พันธกิจ, ขอบพระคุณ ฯลฯ)
- **บันทึกรายจ่าย (Expenses)**: แนบใบเสร็จผ่าน Supabase Storage และตัดยอดเงินตามกองทุนที่เกี่ยวข้อง
- **ความปลอดภัยทางบัญชี (Immutable Ledger)**: ไม่อนุญาตให้ Hard Delete รายการที่บันทึกแล้ว แต่ใช้ระบบ Void (ยกเลิกรายการ) พร้อมบันทึก Audit Log ทุกขั้นตอน

### 2.2 วงจรการนับเงินวันอาทิตย์ (Sunday Service Counting Workflow)

- **รอบการนับเงิน (Counting Sessions)**: บันทึกยอดเงินสดแยกตามซองถวายและธนบัตร/เหรียญแต่ละมูลค่า
- **การกระทบยอด (Reconciliation)**: ตรวจสอบความถูกต้องระหว่างยอดนับจริงกับยอดเงินในสมุดบัญชีธนาคาร (Passbook Match)
- **การลงบัญชีถาวร (Post to Ledger)**: โอนยอดเงินที่ตรวจนับสมบูรณ์แล้วเข้าสู่สมุดบัญชีใหญ่โดยอัตโนมัติ

### 2.3 ระบบขออนุมัติเบิกจ่ายเงิน (Withdrawal & Multi-Signature Approvals)

- **ยื่นคำขอเบิกเงิน (Withdrawal Request)**: ผู้รับผิดชอบพันธกิจสามารถยื่นคำขอพร้อมระบุวัตถุประสงค์และกองทุน
- **การลงนามอนุมัติหลายฝ่าย (Multi-Signature Workflow)**: กำหนดเงื่อนไขผู้ลงนาม (เช่น ศิษยาภิบาล, เหรัญญิก, และผู้มีอำนาจลงนามธนาคาร)
- **การบันทึกจ่ายเงิน (Payout)**: เชื่อมโยงรายการเบิกจ่ายเข้ากับรอบการเงินจริง

### 2.4 กล่องรับสลิปถวายและ AI สแกนสลิป (Giving Inbox & Slip AI)

- **รับสลิปผ่าน LINE Official Account**: สมาชิกส่งรูปสลิปใน LINE ระบบดึงรูปผ่าน Webhook ตรวจสอบความซ้ำซ้อนด้วย SHA256 Hash
- **ระบบสแกนด้วย Gemini Vision**: อ่านยอดเงิน วันเวลา ธนาคารต้นทาง-ปลายทาง และชื่อผู้โอนโดยอัตโนมัติ
- **การตรวจสอบและการอนุมัติ (Giving Inbox)**: เหรัญญิกตรวจสอบยอดสลิป จับคู่กับสมาชิก และอนุมัติเข้ากองทุนด้วยการคลิกเพียงครั้งเดียว
- **จุดถวายทรัพย์ (Giving Station & `/give`)**: สมาชิกสามารถสแกน QR Code ถวายทรัพย์และแนบสลิปผ่านเบราว์เซอร์หรือ LINE LIFF ได้อย่างสะดวก

### 2.5 บทบาทและสิทธิ์การใช้งาน (Church Roles & RBAC)

- **👑 ผู้ดูแลระบบสูงสุด (SUPER_ADMIN)**: จัดการการตั้งค่าคริสตจักร บัญชีผู้ใช้ และสิทธิ์ทั้งหมด
- **✝️ ศิษยาภิบาล (PASTOR)**: ดูแลภาพรวมคริสตจักร รายงานการเงิน และร่วมอนุมัติการเบิกจ่าย
- **💰 เหรัญญิก (TREASURER)**: จัดการบัญชี การเงิน ตรวจสอบสลิป และอนุมัติรายการเบิกจ่าย
- **🤝 ผู้รับผิดชอบฝ่าย (DEACON)**: ดูแลสมาชิกและพันธกิจของฝ่าย และยื่นคำขอเบิกจ่ายเงินสำหรับกิจกรรม
- **📝 กรรมการนับเงิน (COUNTER)**: บันทึกและตรวจนับเงินถวายประจำสัปดาห์
- **👤 สมาชิกคริสตจักร (MEMBER)**: เข้าใช้งานจุดถวายทรัพย์ (Giving Station) ดูประวัติการถวายของตนเอง และข่าวสารคริสตจักร

---

## 3. โครงสร้างฐานข้อมูลหลัก (Core Database Tables)

- **`users`**: บัญชีผู้ใช้งาน ข้อมูล LINE Profile บทบาทสิทธิ์หลักและรอง (`role`, `churchRole`, `churchRoles`)
- **`finance_accounts`**: บัญชีกองทุนและการเงินของคริสตจักร พร้อมยอดคงเหลือปัจจุบัน
- **`offerings` / `offering_items`**: รายการเงินถวายและรายละเอียดการแยกหมวดหมู่
- **`expenses`**: รายการค่าใช้จ่าย พร้อมลิงก์ใบเสร็จและกองทุนที่ตัดจ่าย
- **`counting_sessions` / `cash_counts` / `envelopes`**: ข้อมูลรอบการนับเงิน ซองถวาย และจำนวนเหรียญ/ธนบัตร
- **`withdrawal_requests` / `withdrawal_signatures`**: คำขอเบิกเงินและประวัติการลงนามอนุมัติ
- **`line_slips` / `line_processing_jobs`**: ข้อมูลสลิปโอนเงิน ผลการสแกน OCR และคิวประมวลผล
- **`audit_logs`**: บันทึกประวัติการทำธุรกรรมและการเปลี่ยนแปลงข้อมูลสำคัญทั้งหมด

---

## 4. คำสั่งสำหรับการพัฒนาและทดสอบ (Commands)

ใช้ Package Manager เป็น **pnpm**:

```bash
# ติดตั้ง dependencies
pnpm install

# รันโหมด Development (Vite + tsx watch)
pnpm dev

# ตรวจสอบความถูกต้องของ Type ทั่วทั้งโปรเจกต์
pnpm check

# รัน Automated Test Suite ทั้งหมด
pnpm test

# จัดรูปแบบโค้ด
pnpm format

# รัน CI Check (Typecheck + Tests แบบไม่แตะ Database จริง)
pnpm ci

# อัปเดตและรัน Database Migration
pnpm db:migrate
```
