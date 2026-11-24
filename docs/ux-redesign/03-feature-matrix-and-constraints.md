# Grace Giving — Existing vs Proposed Feature Matrix และ Technical Constraints (Revision 2)

สถานะ: Draft เพื่อรอ Product Owner ตรวจรอบสุดท้าย · แก้ไข 2026-11-24
**ป้าย:** [V-src] อ่านจากซอร์ส (ไม่ใช่ดูหน้าจอจริง) · [V-live] ตรวจบนเว็บจริง (ได้เฉพาะ `/login`) · [A] สมมติฐาน · [P] ข้อเสนอ · [NV] ยังไม่ได้ตรวจ

**หลักตัดสิน:** Improve Existing, Not Replace · Intuitive by Design · ไม่มี UI ที่ Backend ไม่รองรับ

คอลัมน์ "มีจริง": ✅ มีและตรวจแล้ว · 🟡 มีบางส่วน · ❌ ไม่พบ · ❓ ยังไม่ได้ตรวจ
คอลัมน์ "ทำอะไร": **คง** = ต้องรักษา · **ปรับ** = ปรับ UX/Token โดยไม่ตัดของเดิม · **ใหม่** = แนวคิดใหม่ต้องอนุมัติ · **เลื่อน** = DEFERRED

| # | ความสามารถ | มีจริง | หลักฐาน | ทำอะไร | Backend |
|---|---|---|---|---|---|
| 1 | Light/Dark + สลับธีม | ✅ | `App.tsx:443`, ThemeToggle | ปรับ Token Navy A | ไม่ |
| 2 | Sidebar (ไอคอน+Label, กลุ่ม, พื้น `bg-ground`, กว้าง 256px) | ✅ | `AppLayout.tsx:218` | **คง** โครง/ชื่อ/ลำดับ; ปรับเป็น Navy A | ไม่ |
| 3 | ย่อ/ขยาย Sidebar | ❌ | ไม่พบ `collapse` | ใหม่ (localStorage) | ไม่ |
| 4 | กระดิ่ง + จำนวนยังไม่อ่าน (Sidebar และหัวมือถือ) | ✅ | `AppLayout.tsx:171,282,324` | **คง** | ไม่ |
| 5 | Settings, Profile, Notifications ในเมนู | ✅ | `AppNavigation.tsx` กลุ่ม "บัญชีผู้ใช้" | **คง** | ไม่ |
| 6 | Bottom Nav 4 แท็บ + Drawer | ✅ | `AppLayout.tsx:35–62,364` | **คง**; 5 แท็บ = TBD-26 | ไม่ |
| 7 | Tablet (<1024px = เลย์เอาต์มือถือ) | ✅ | `lg:flex`/`lg:hidden` | **คง** (TBD-17/21) | ไม่ |
| 8 | ซ่อนเมนูตามสิทธิ์ | ✅ | `getAuthorizedNavItems` | **คง** | ไม่ |
| 9 | Dashboard: Hero, TaskQueue, BalanceCard, PrimaryActions, SecondaryMenu, FinancialSummaryRow, RecentTransactions, BudgetSection, ข่าว | ✅ | `Home.tsx:244–353` | **คง ทั้งหมด**; เพิ่มหัวข้อ + ประโยคเริ่มต้น | ไม่ |
| 10 | กรอง Dashboard ตาม Role | ✅ | `Home.tsx:52–68` | **คง** | ไม่ |
| 11 | ซ่อน/แสดงยอดเงิน, แยกเงินหมุนเวียน vs กองทุนเฉพาะกิจ | ✅ | `BalanceCard.tsx` | **คง** | ไม่ |
| 12 | สรุปรายเดือน (`monthlyStats`) | ✅ | `FinancialSummaryRow`, `finance.monthlyStats` | **คง**; กราฟรายเดือนเป็นตัวเลือก [P] | ไม่ |
| 13 | กราฟรายสัปดาห์ | ❌ | ไม่พบ Endpoint รายสัปดาห์ | เลื่อนจนกว่ามีข้อมูลจริง | อาจใช่ |
| 14 | Chart library | ❌ | ไม่มีใน `package.json` | ตัดสินตอน Implement (Q14) | ไม่ |
| 15 | รายการธุรกรรม: ค้นหา, กรองช่วงเวลา/กองทุน/ประเภท, การ์ดสรุป, Export CSV, ปุ่มบันทึก, cursor pagination | ✅ | `Transactions.tsx:51–230` | **คง** | ไม่ |
| 16 | ตาราง 6 คอลัมน์ + `<caption>` + `scope` | ✅ | `Transactions.tsx:394–425` | **คง** (ห้ามตัดประเภท/ผู้ถวาย-ผู้รับเงิน) | ไม่ |
| 17 | ฟีดการ์ดมือถือจัดกลุ่มตามวัน | ✅ | `Transactions.tsx:469–` | **คง** | ไม่ |
| 18 | หน้ารายละเอียด `/transactions/:id` | ✅ | `Link href` | **คง** | ไม่ |
| 19 | Side Panel รายละเอียด | ❌ | ไม่พบ | ใหม่ เป็น**ส่วนเสริม** (TBD-24) | ไม่ (ต้องไม่แสดงเกินสิทธิ์) |
| 20 | StatusBadge (Label ไทย) | ✅ | `CommonUI.tsx` | **คง**; เพิ่มไอคอนตามข้อ 77 | ไม่ |
| 21 | ตารางอื่น → การ์ดมือถือ | 🟡 | Expenses มีตาราง + การ์ด (`hidden md:block`/`md:hidden`); Settings รายชื่อผู้ใช้มีการ์ดมือถือ; Reports มีตารางและข้อความช่วยบนมือถือบางส่วน [NV ทั้งตาราง]; Offerings เป็นแถวคั่นเส้น | **คง**; Reports ตรวจเพิ่ม | ไม่ |
| 22 | Counting State Machine + สิทธิ์ล้าง/ลบ | ✅ | `shared/counting.ts` | **คง** (PR #157 ยังไม่ Merge ตามบันทึกก่อนหน้า) | ไม่ |
| 23 | Workflow รอบนับอยู่ที่ `/counting` ไม่ใช่ Transactions | ✅ | `routers.ts:1464` (`income|expense`) | **คง**; ห้ามเพิ่มรอบนับในรายการธุรกรรม | ไม่ |
| 24 | บันทึกถวาย: ฟอร์มเดียว ปุ่ม "ยืนยันบันทึกการถวาย" + Success Dialog + `useSubmitLock` + `confirmDiscardChanges` | ✅ | `NewOffering.tsx:162,186,550` | **คง**; Review Step ต้องตรวจ Flow ก่อน | ไม่ |
| 25 | Batch นับซอง | ✅ | `CountingDetail/components/EnvelopesTab.tsx` | **คง**; อ่านรายละเอียดก่อนเสนอ | ไม่ |
| 26 | Giving Station 4 ขั้น (สมาชิก) | ✅ | `GivingStation.tsx:88 FlowStep` | **คง** | ไม่ |
| 27 | รับสลิป LINE | ✅ | `/giving/inbox`, `STATUS_LABELS` | **คง**; Split View เฟส 4 หลังตรวจ UI | ไม่ |
| 28 | OCR / Confidence | ❌ | ไม่พบ | เลื่อน | ใช่ |
| 29 | อนุมัติเบิกเงิน + SignatureProgress | ✅ | `Approvals`, `withdrawals.*` | **คง** | ไม่ |
| 30 | Audit: `audit_logs`, `audit.list` (Admin, limit ≤200), แท็บใน Settings, ป้ายไทย | ✅ | `Settings.tsx:1593–`, `routers.ts:3636` | **คง** Admin เท่านั้น; แปลง metadata เป็นคู่ชื่อ–ค่า [P] | Filter ฝั่ง Server = ใช่ |
| 31 | Before/After, เหตุผลบังคับทุกการแก้ไข | ❌/🟡 | เหตุผลบังคับเฉพาะ withdrawal cancel (`routers.ts:1694`) | เลื่อน | ใช่ |
| 32 | จัดการผู้ใช้ (`listUsers`, `setChurchRole`, `setUserStatus`, `deleteUser`, `pendingCount`) | ✅ | `routers.ts:661–` | **คง**; ปรับ UI | ไม่ |
| 33 | ป้องกันตัวเอง (ลบ/ปิดบัญชีตัวเอง), ต้องปิดก่อนลบ | ✅ (ส่วนหนึ่ง) | `routers.ts:758–815`; `setChurchRole` NV | **คง** | ไม่ |
| 34 | Label Role ไทย (+ `labelWithCode` มีรหัสอังกฤษ) | ✅ | `shared/roles.ts` | ปรับตาม Glossary [P] | ไม่ |
| 35 | สมัครผ่าน LINE + pending | ✅ | `CLAUDE.md` | **คง** (Q4) | ไม่ |
| 36 | MFA / Trusted Device / Re-auth | ❌ | ไม่พบ | เลื่อน | ใช่ |
| 37 | Session 30 วัน | ✅ | `session.ts:7` | **คง** | ไม่ |
| 38 | Notification In-app | ✅ | `notifications.*` | **คง**; 3 ระดับ/LINE/Email/Real-time เลื่อน | ใช่ (ส่วนเลื่อน) |
| 39 | Export CSV | ✅ | `exportCsv` ×3 | **คง**; Preview [P] | ไม่ |
| 40 | Export PDF / History / Approval | ❌ | ไม่มี library; มี `window.print` | เลื่อน / TBD-3 | ใช่ |
| 41 | Scheduled Reports, Data Import, Threshold Approval | ❌ | ไม่พบ | เลื่อน | ใช่ |
| 42 | Command Palette / Ctrl K | 🟡 | `ui/command.tsx` มี ไม่มีตัวเรียก | ไม่อยู่ Phase 1 (TBD-12) | อาจใช่ |
| 43 | Badge ตัวเลขบนเมนู | 🟡 | `unreadCount`, `pendingCount` มี; ที่เหลือ NV | เฉพาะที่มี Endpoint (TBD-25/28) | ตรวจ |
| 44 | Reduced Motion | ✅ | `index.css:364,708,769` | **คง**/ขยาย | ไม่ |
| 45 | Contrast test | ✅ | `theme.contrast.test.ts` | ขยายสี Navy/Emerald อ่อน/ทุกสถานะ | ไม่ |
| 46 | focus-visible, `:disabled` | ✅ | `index.css:437,761` | **คง**; Focus บน Navy ต้องเป็นขาว/Emerald อ่อน | ไม่ |
| 47 | ป้องกันการเขียนเมื่อ Offline (ห้าม Queue ส่งอัตโนมัติ) | ❌ | ไม่พบ `onLine`/`onlineManager`/`networkMode`; `new QueryClient()` ค่าเริ่มต้น; TanStack Query 5.90.2 จะ pause แล้วส่งต่ออัตโนมัติ (`retryer.ts:52,108`, `queryClient.ts:86–92`) | ใหม่ (TBD-6 CLOSED หลักการ; ผลทดสอบ NV) | ไม่ |
| 48 | หน้า Login | ✅ [V-live] | แยกสองฝั่ง ปุ่ม LINE ข้อความอธิบาย PDPA | **คง** | ไม่ |

| 49 | Members: รายการ + ฟอร์มเพิ่ม; Detail แก้ไข/ปิดใช้งาน + ประวัติถวายตามสิทธิ์ | ✅ | `Members.tsx`, `MemberDetail.tsx` (Access SUPER_ADMIN/PASTOR/TREASURER/DEACON; `canViewDonorNames`) | **คง**; Token | ไม่ |
| 50 | Ministries ("พันธกิจ" ในเมนู / "ฝ่ายงาน" ในหน้า): สร้าง/แก้/เก็บถาวร | ✅ | `Ministries.tsx`, `MinistryDetail.tsx` (`canManageMinistries`) | **คง**; ชื่อสองคำ ⚠ Glossary | ไม่ |
| 51 | Updates: `MemberFeed` + `AdminManager` (ข่าว/กิจกรรม สร้าง/แก้/เปลี่ยนสถานะ/ลบ) | ✅ | `Updates.tsx`, `Updates/components/*` | **คง** | ไม่ |
| 52 | Funds: สร้างกองทุน + Detail + ดาวน์โหลด Statement + แบ่งหน้า | ✅ | `Funds.tsx`, `FundDetail.tsx` | **คง**; Funds ไม่พบ Loading/Error | ไม่ |
| 53 | Budgets: สร้างแผน + Detail แก้/ลบ | ✅ | `Budgets.tsx`, `BudgetDetail.tsx` (`canManageBudgets`) | **คง** | ไม่ |
| 54 | ChurchSetup (`/setup`): ตั้งค่าหลายขั้น เฉพาะ `canManageChurchSettings` | ✅ | `ChurchSetup.tsx:36` | **คง** | ไม่ |
| 55 | สมุดบัญชีถวาย `/offerings` (แถวคั่นเส้น ไม่ใช่ตาราง) + Export CSV | ✅ | `Offerings.tsx:339` | **คง** | ไม่ |
| 56 | Privacy (สถิต), 404, Redirect `/giving-inbox` | ✅ | `Privacy.tsx`, `NotFound.tsx`, `App.tsx:304` | **คง** | ไม่ |
| 57 | ปุ่ม "ถวายทรัพย์ (Giving Station)" บนหน้าหลัก | 🟡 | `Home.tsx:299` ไป `/giving-station`; `App.tsx:284` มี `/giving/station` เท่านั้น — อาจไป 404 ยังไม่ยืนยันบนเว็บจริง | ข้อบกพร่องเดิมที่ต้องตรวจ ไม่ใช่งาน Redesign | ไม่ |
| 58 | `/ui-showcase` หน้าตัวอย่าง Component ภายใน (ภาษาอังกฤษ ข้อมูล Invoice) เปิดได้ทุกผู้ล็อกอินที่ไม่ใช่ station-only | ✅ | `ComponentShowcase.tsx`; ไม่มีใน `ROUTE_ACCESS` | ต้องตัดสินว่าควรจำกัดสิทธิ์/ซ่อนหรือไม่ (TBD-31) | ไม่ |
| 59 | อ่านสลิปด้วย AI อยู่แล้ว (`readSlip`, `rescan`, `drainWorker`) | ✅ | `GivingInbox.tsx`, `GivingStation.tsx` | **คง**; ปรับข้อเสนอ OCR/Confidence (แถว 28) ให้ตรวจ Backend ก่อน | ใช่ถ้าเพิ่ม Confidence |
| 60 | การยกเลิก/แก้ไขรายการไม่มีเหตุผล (เรียก `offerings.delete`/`expenses.delete`; UI ใช้คำว่า "ยกเลิก") | ✅ | `TransactionDetail.tsx:92–160,404–424` | ยืนยัน TBD-9 | ใช่ถ้าบังคับเหตุผล |
| 61 | Counting detail 5 แท็บ: ซองถวาย / นับเงินสด / เงินโอน-นำฝาก / หักเบิก / สรุป & ปิดรอบ | ✅ | `CountingDetail.tsx:49–53` | **คง** | ไม่ |

## 2. Technical Constraints

1. **CI อยู่ใน Vercel build** (`pnpm run ci && pnpm run build && pnpm run db:migrate:deploy`) Merge เข้า `main` = Deploy Production
2. **เทสต์ DB จริงถูกข้ามใน CI** (`DATABASE_URL` ถูกเคลียร์)
3. **Production ไม่ migrate อัตโนมัติ** (`SKIP_DB_MIGRATE=1`) งาน UX ต้องไม่แตะ Schema
4. **Preview และ Production ใช้ `DATABASE_URL` เดียวกัน** การทดสอบผู้ใช้ต้องไม่ใช้ Preview กับข้อมูลจริง
5. **ระบบต้องล็อกอินด้วย LINE** ผมตรวจหน้าหลังล็อกอินบนเว็บจริงไม่ได้ ต้องใช้ภาพจากเครื่อง PO (TBD-27)
6. `getDb()` คืน `null` เมื่อไม่มี DB → ต้องมี Empty/Error states
7. Client import `AppRouter` ตรง ๆ → การเปลี่ยน Procedure กระทบ Client
8. **Role:** SUPER_ADMIN, PASTOR, TREASURER, DEACON, COUNTER, MEMBER; `financeViewProcedure`/`financeProcedure`/`adminProcedure`/`churchLeaderProcedure` กำหนดสิทธิ์ฝั่ง Server
9. **PR #156–#158** ยังเปิดอยู่ตามบันทึกก่อนหน้า (สถานะล่าสุด NV ในรอบนี้) ไฟล์ที่ชนกับงาน UX: `Approvals.tsx`, `Counting.tsx`, `CountingDetail.tsx`
10. **Frontend:** Tailwind v4 (`@import "tailwindcss"`), `wouter` (patched), Router แบบแบน, Vitest + jsdom; `tsconfig` ไม่รวม `*.test.ts`; มี 127 ไฟล์เทสต์
11. **Dependencies:** ห้ามติดตั้งในรอบ Discovery; Chart/Motion/PDF library ต้องตรวจเวอร์ชัน React 19, Bundle, ทางเลือก ก่อนขออนุมัติ

## 3. Not Verified (ห้ามถือว่าไม่มีปัญหา)

ผลเรนเดอร์ของทุกหน้าหลังล็อกอิน · Zoom 200% · Keyboard/Screen reader · เนื้อหาเทสต์ UI ส่วนใหญ่ · `vercel.json`/Cron · ตัวกรองของ `transactions.paged`/`audit.list` · Endpoint ของตัวเลขบนเมนู · `setChurchRole` self-demotion · ผลของ `deleteInactiveUser` · `networkMode` จริงบนเบราว์เซอร์ (อ่านโค้ด TanStack Query 5.90.2 แล้ว แต่ยังไม่ทดสอบ) · Contrast ของ Hover/Selected บนพื้นสว่าง · ตาราง Reports บนมือถือทั้งตาราง · การใช้ `labelWithCode` · คอมโพเนนต์ของ `/register` · ข้อความ Empty ใน `MemberFeed`/`AdminManager` ของ `/updates` · Loading/Error ของ `/profile` · รายละเอียดเลย์เอาต์ของ `TransactionDetail` (อ่านเฉพาะการกระทำและสถานะ) · ภายใน `GivingInbox`/`GivingStation` ลึกกว่าข้อความสถานะ

**อ่านซอร์สครบทุกหน้าแล้วในรอบนี้ (ระดับสถานะ/สิทธิ์/ข้อความ):** Login, NotFound, Privacy, TransactionDetail, Counting, CountingDetail, Offerings, NewOffering, Expenses, NewExpense, GivingInbox, GivingStation, Give, GivingGuide, Approvals, NewWithdrawal, Reports, Settings, Members, MemberDetail, Ministries, MinistryDetail, Updates, Notifications, Profile, Funds, FundDetail, Budgets, BudgetDetail, ChurchSetup, ComponentShowcase และ `routeAccess.ts` — เป็นการสแกนสถานะ/ข้อความ/สิทธิ์ ไม่ใช่การอ่านทุกบรรทัด
