# Grace Giving — Product Design Decision Register

สถานะเอกสาร: Blueprint Revision 2 — รอ Product Owner ตรวจรอบสุดท้าย (ยังไม่มี Implementation; BLUEPRINT REVIEW PENDING — IMPLEMENTATION NOT AUTHORIZED)
วันที่: 2026-11-24
ที่มา: Master UX/UI Discovery Brief (ข้อ 1–132), คำตอบ Final Discovery (Q1–Q16), หลักการ Intuitive by Design, ผล Baseline Review และการตัดสินใจ TBD ของ PO

หมายเหตุสำคัญ: การยืนยัน TBD ในรอบนี้ **ไม่ถือเป็นการอนุมัติ Blueprint**

## 0. หลักการระดับ Product (CONFIRMED)

| ID | หลักการ | สถานะ |
|---|---|---|
| P0-A | Improve Existing Product, Not Replace Its Proven Workflows — ห้ามตัดหรือแทนที่ฟังก์ชันเดิมเพียงให้หน้าตาเรียบง่าย | CONFIRMED |
| P0-B | Intuitive by Design — ผู้ใช้เข้าใจและทำงานได้เองโดยไม่ต้องมีคนสอน; 7 ข้อ Usability Acceptance; ต้องทดสอบกับผู้ใช้จริงก่อนอ้างว่าผ่าน | CONFIRMED |
| P0-C | รักษา Business/Financial Logic, Permissions, Security, Data Integrity; ไม่สร้าง UI ที่ไม่มี Backend รองรับ; รองรับผู้สูงอายุ; ใช้ได้จริงบน Desktop/Tablet/Mobile | CONFIRMED |

เมื่อหลักการข้อนี้ขัดกับ Decision ในตารางข้อ 1–132 ให้ P0 มาก่อน และบันทึกความขัดแย้งในหัวข้อ 4–5

ป้ายสถานะที่ใช้ในเอกสารชุดนี้:

- **CONFIRMED** — Product Owner ยืนยันแล้ว
- **DEFERRED** — ยืนยันแล้วว่าไม่ทำในรอบแรก ต้องบันทึก UX และสถาปัตยกรรมไว้สำหรับอนาคต
- **TBD** — ยังต้องตัดสินใจหรือตรวจสอบ ห้าม Implement จนกว่าจะปิด
- **VERIFIED** — ตรวจจากไฟล์หรือคำสั่งในรอบ Discovery นี้
- **ASSUMPTION** — เชื่อว่าเป็นจริงแต่ยังไม่ได้ตรวจ

## 1. Decisions จาก Master Brief (ข้อ 1–132)

ทุกข้อ **CONFIRMED** ในระดับ "ทิศทาง" ตามตารางนี้ แต่การนำไปใช้ต้องผ่านเงื่อนไขในคอลัมน์ "ข้อเท็จจริงจากระบบจริง" ก่อน

| กลุ่ม | ข้อ | เนื้อหาสรุป | ข้อเท็จจริงจากระบบจริง |
|---|---|---|---|
| A. Direction | 1–11 | Admin เป็นผู้ใช้หลัก, Modern Premium Fintech, Light เป็นหลัก + Dark, Hybrid Dashboard, Sidebar ย่อ/ขยายได้, Desktop เป็นหลัก, Balanced density, KPI+Chart+Table, Instant Search + Advanced Filters | Dark mode และ ThemeProvider มีแล้ว (VERIFIED `App.tsx:443`). ไม่มี Chart library (VERIFIED `package.json`) |
| B. Giving | 12–14 | Quick Entry Workspace, Batch เป็นหลัก, Review ก่อนบันทึกทุกครั้ง | มี `/offerings/new`, `/counting`, `/giving/station`, `/giving/inbox` (VERIFIED `App.tsx`). การ Review ก่อนบันทึกของแต่ละหน้า NOT VERIFIED |
| C. Identity | 15–24 | Navy & Emerald, Editorial Minimal, Radius กลาง, Rich Motion, Modern Sans, IBM Plex Sans Thai + Manrope, Tabular numbers, Font scale สบายตา | ไม่มี token navy ใน `DESIGN.md`/`index.css` (VERIFIED); ตัดสินใจแล้ว: Navy A `#0B1B33` (TBD-1). `font-display` ใช้ Plus Jakarta Sans อยู่ (VERIFIED `index.css:12–13`) — TBD-16 ยังเปิด. `.money` ใช้ tabular-nums แล้ว. ขนาดตัวอักษรเดิมเป็นขั้นต่ำ (TBD-22) |
| D. Feedback/Search | 25–32 | Inline error พร้อมวิธีแก้, Toast, Skeleton, Hybrid Search, Ctrl+K, ค้นข้อมูลการเงิน, Thai-first | มี `sonner`, `skeleton.tsx`, `cmdk` (`command.tsx`). ไม่มีตัวผูกคีย์ลัดหรือ Global Search (VERIFIED) |
| E. Responsive/Analytics | 33–40 | Desktop + Mobile ทำงานครบ, ตาราง→การ์ดบนมือถือ, Touch comfortable, Progressive Analytics, Line/Bar/Donut, เปรียบเทียบรายสัปดาห์, Drill-down | **ตาราง→การ์ดมีแล้วที่ Transactions** (`hidden md:block` + ฟีดการ์ดจัดกลุ่มตามวัน, VERIFIED-src `Transactions.tsx:394,469`); Expenses/Reports/Settings NOT VERIFIED. มี `monthlyStats` รายเดือน; รายสัปดาห์ NOT VERIFIED → กราฟรายสัปดาห์ใช้ข้อมูลจริงเท่านั้น (TBD-23) |
| F. Transactions/Slip | 41–49 | Hybrid Workspace, Full Audit Trail, แก้ไขต้องมีเหตุผล, Side Panel, Verification Workspace, Assisted OCR, Split View, แสดง Confidence, Manual Review | บังคับเหตุผลเฉพาะ withdrawal cancel (VERIFIED `routers.ts:1694`). ไม่มี OCR (VERIFIED) — ข้อ 46, 48 ถูก DEFER ผ่าน Q16 |
| G. Access/Reporting | 50–58 | Hybrid Access Mgmt, ใช้ Role เดิม, ซ่อนเมนูที่ไม่มีสิทธิ์, ยืนยัน Sensitive Action, Hybrid Reporting, PDF เป็นหลัก, รายสัปดาห์, Preview ก่อนดาวน์โหลด, Scheduled Reports | มีการซ่อนเมนูตามสิทธิ์ (`getAuthorizedNavItems`, VERIFIED). Export ปัจจุบันเป็น CSV (`reports.exportCsv`). ไม่มี PDF library — ดู TBD-3. ข้อ 58 DEFER |
| H. Personalization | 59–62, 106–111 | เลือกแสดง/ซ่อน Widget, บันทึกแยกผู้ใช้, Dashboard ตาม Role, Reset ต้องยืนยัน | ไม่มีตารางเก็บ preference ต่อผู้ใช้ (ASSUMPTION จาก schema ที่อ่านบางส่วน) — ดู TBD-4 |
| I. Auth/Empty | 63–72 | Seamless Secure, MFA เดิม, Session Balanced, Re-auth เฉพาะ Sensitive, Trusted Device, Empty state เฉพาะบริบท, ไอคอนเรียบง่าย, Progressive Onboarding, ภาษาไทยเรียบง่าย | **ไม่มี MFA** ใน Codebase; Login เป็น LINE Login เท่านั้น, Session 30 วัน (VERIFIED `session.ts:7`). ข้อ 64, 66, 67 DEFER ผ่าน Q16 |
| J. Accessibility | 73–77 | A11y by design, Contrast สูง, Keyboard เต็ม, Font scale, สี+ข้อความ+ไอคอน | ดู Q10–Q12 |
| K. Performance | 78–82 | Balanced, Instant navigation, Pagination, Optimistic เฉพาะที่ย้อนกลับได้, ออฟไลน์ = Read-only | `transactions.paged`, `offerings.paged` มีแล้ว (VERIFIED). พฤติกรรมออฟไลน์ NOT VERIFIED — TBD-6 |
| L. Notifications | 83–88 | 3 ระดับ, In-app + LINE/Email, Real-time, Notification Center, Contextual action | มี In-app list/unread/markRead (VERIFIED). ที่เหลือ DEFER ผ่าน Q16 |
| M. Settings | 89–93 | Overview + Category, แยก System/Personal, Auto Save, Categories, ยืนยัน Sensitive | Settings เป็นไฟล์เดียว 1,838 บรรทัด, 5 แท็บ (church, roles, categories, payment, audit) ไม่มี URL แยก (VERIFIED). ข้อ 91 ขัดกับข้อ 93 — ดู TBD-5 |
| N. Help | 94–99 | Self-service + LINE, Contextual Help, Searchable FAQ, Report Problem, Diagnostics เมื่อยินยอม | มี `/giving-guide` (VERIFIED route). FAQ/Report Problem NOT VERIFIED |
| O. Privacy | 100–105 | Privacy by Design, Role-based Visibility, Retention ตามนโยบาย, Export ต้อง Approval, Restricted Deletion, Contextual Consent | `canViewDonorNames` กรองใน `db.listOfferings` (ตาม CLAUDE.md). ข้อ 103 ต้องมี Backend → DEFER (ดูข้อ Export ใน Q16 หมายเหตุ) |
| Q. Import | 112–118 | Guided Import, Template, Auto-mapping, Strict validation, Preview, Manual duplicate review, Approval | ไม่มีโค้ด Import (VERIFIED). DEFER ผ่าน Q16 |
| R. Export | 119–125 | Guided Export, PDF Only, Filtered, Preview, Direct download, Export History, Protection | ไม่มี PDF และไม่มี Export History (VERIFIED). TBD-3 |
| S. Workflow | 126–132 | Hybrid Workflow, Threshold Approval, 4 สถานะ, Correction Record แยก, Review ก่อนปิดรอบ, Reconciliation แบบ Hybrid, Exception Queue | Threshold DEFER. สถานะจริงของระบบมากกว่า 4 (ดู `03`). Counting มี reconciliation และ `closed` แล้ว (VERIFIED `shared/counting.ts`). Correction Record และ Exception Queue NOT VERIFIED — TBD-7, TBD-8 |

## 2. คำตอบ Final Discovery (Q1–Q16)

| Q | หมวด | คำตอบ | สถานะ | ผลต่อ Spec |
|---|---|---|---|---|
| Q1 | Audit Access | A — Admin เท่านั้น | CONFIRMED | ใช้ `adminProcedure` เดิมของ `audit.list` ไม่ขยายสิทธิ์ |
| Q2 | Before/After | A — เก็บเฉพาะเหตุการณ์ใหม่; ของเก่าแสดงเท่าที่มี | CONFIRMED (ส่วนเก็บข้อมูลใหม่ต้องแก้ Backend → Phase 7/TBD-9) | UI แสดงช่อง Before/After เมื่อมีข้อมูล และแสดง "ไม่มีข้อมูลก่อนแก้" เมื่อไม่มี ห้ามสร้างย้อนหลัง |
| Q3 | Suspicious | A — Filters + Warning Labels ตามกฎ | CONFIRMED | กฎต้องคำนวณจากข้อมูลที่ `audit_logs` มีอยู่จริงเท่านั้น (action: CREATE/UPDATE/VOID/APPROVE_LINE_SLIP/REJECT_LINE_SLIP/LINK_LINE_MEMBER) |
| Q4 | Invitation | A — LINE Registration เดิม, Pending, Admin อนุมัติ | CONFIRMED | ไม่มี Invite Link |
| Q5 | Team | A — Role ปัจจุบัน | CONFIRMED | ไม่มี Ministry-based authorization |
| Q6 | Suspension | A — ระงับ/เปิดกลับได้, ลบจำกัด+ยืนยัน, รักษาความสัมพันธ์ธุรกรรม | CONFIRMED | ใช้ `setUserStatus`/`deleteUser` เดิม. พฤติกรรมของ `deleteUser` ต่อข้อมูลธุรกรรม NOT VERIFIED → TBD-10 |
| Q7 | Mobile Nav | A — Bottom nav 4–5 + More | CONFIRMED (ปรับ: คงของเดิมก่อน) | ปัจจุบัน 4 แท็บ + หัวที่มีกระดิ่ง + Drawer (VERIFIED-src `AppLayout.tsx:35–62`). การเพิ่มแท็บที่ 5 ย้ายไป TBD-26 ต้องรักษาเส้นทางเข้า Profile/Settings และผ่านการทดสอบ |
| Q8 | Mobile Batch | A — ครบทุกฟังก์ชัน, Guided step-by-step, Review ก่อนบันทึก | CONFIRMED | |
| Q9 | Tablet | A — Layout แบบ Desktop, Sidebar ย่อเป็นค่าเริ่มต้น | **ถูกแทนที่ด้วย TBD-17/21: ยังไม่เปลี่ยน Breakpoint** | ปัจจุบันต่ำกว่า 1024px ใช้เลย์เอาต์มือถือ (VERIFIED-src `AppLayout.tsx:218,364`). คงเดิมจนกว่าทดสอบกับ iPad จริงและ PO อนุมัติ |
| Q10 | Font Scaling | A — เคารพ Browser/System, รองรับ 200% | CONFIRMED | ปัจจุบัน `html { font-size: 16.5px }` และ 15.75px บนจอเล็ก (VERIFIED `index.css:381–386`) — ต้องตรวจว่าไม่ขัดกับการขยาย |
| Q11 | Low-tech | A — UI เดียว | CONFIRMED | |
| Q12 | WCAG | A — เป้าหมาย 2.2 AA, ห้ามอ้าง Compliant ก่อนตรวจจริง | CONFIRMED | |
| Q13 | Navy & Emerald | A — Navy = หมึกหลัก + Sidebar; Emerald = Primary Action + ยอดรับ; เปลี่ยน Token น้อยที่สุด | CONFIRMED; TBD-1 ปิดแล้ว (Navy A `#0B1B33`) | ใช้ Emerald `#5FE3A8` บน Navy, `#087f5b` บนพื้นสว่าง, Focus บน Navy ขาวหรือ Emerald อ่อน; ต้องตรวจ Contrast ทุกสถานะก่อนอนุมัติ. หมายเหตุ: skill `design-taste-frontend` ระบุ Sidebar เข้มเป็นลักษณะของแดชบอร์ดที่สร้างอัตโนมัติ — PO ตัดสินตาม Product Requirement |
| Q14 | Dependencies | A — พิจารณา Recharts และ Motion library ตอน Implement | CONFIRMED เชิงหลักการ; ห้ามติดตั้งตอนนี้ | ต้องตรวจเวอร์ชัน, React 19, Bundle size, ทางเลือก, Reduced Motion ก่อน |
| Q15 | Delivery | A — 7 เฟส | CONFIRMED | ดู `04` |
| Q16 | Backend features | เลื่อนทั้ง 6 รายการ | CONFIRMED (DEFERRED) | ดูหัวข้อ 3 |

## 3. DEFERRED (ไม่อยู่ใน Initial Implementation)

บันทึก UX Requirement และข้อพิจารณาสถาปัตยกรรมไว้ใน `02-ux-ui-specification.md` หัวข้อ 14

| ฟีเจอร์ | ข้อ Brief ที่เกี่ยว | เหตุผล |
|---|---|---|
| MFA / Trusted Device / Re-authentication | 64, 66, 67 | ไม่มี MFA ในระบบ; ต้องเปลี่ยน Authentication |
| Scheduled Reports | 58 | ต้องมี Scheduler (บน Vercel = Cron) และช่องทางส่ง |
| OCR | 46, 48 | ไม่มี OCR engine; ต้องมี Backend |
| Data Import | 112–118 | ไม่มีโค้ด; กระทบ Financial Data |
| Threshold-based Approval | 127 | กระทบ Approval Logic (ปัจจุบันคงที่ `MIN_APPROVALS = 2` + ผู้ลงนามที่ต้องมี) |
| Notification 3 ระดับ + LINE/Email + Real-time | 83–87 | ต้องมี Backend และ Channel |

Initial Implementation ใช้เฉพาะ: LINE Login/Session เดิม, Approval Logic เดิม, Notification และ Report ที่มีอยู่จริง

## 4. TBD — สถานะหลัง Blueprint Revision 2

**CLOSED = PO ตัดสินใจแล้ว** (ไม่ใช่การอนุมัติ Blueprint) · **OPEN = ยังรอ** · **NEW = เปิดใหม่จากการตรวจ Baseline**

| ID | ประเด็น | สถานะ | การตัดสินใจ / ข้อเสนอ | บล็อก |
|---|---|---|---|---|
| TBD-1 | ค่า Navy | **CLOSED** | Navy A `#0B1B33`; Emerald `#5FE3A8` บน Navy; `#087f5b` บนพื้นสว่าง; Focus บน Navy ขาวหรือ Emerald อ่อน; ต้องตรวจ Contrast ทุกสถานะก่อนอนุมัติ (ผลที่คำนวณแล้ว: ดู `02` §14) | Phase 1 (เหลือการตรวจทุกสถานะ) |
| TBD-2 | Motion | **CLOSED** | CSS First; **ไม่ติดตั้ง Motion Library ใน Phase 1**; ใช้ Animation เฉพาะที่ช่วยสื่อสารสถานะ; รองรับ `prefers-reduced-motion`; **ตัวเลขทางการเงินไม่ใช้ Animation** (ไม่มีนับขึ้น/เลื่อน/จางเมื่อเปลี่ยนค่า) | – (ส่งผลต่อ Q14: Motion library ยังไม่อนุมัติ) |
| TBD-3 | PDF | OPEN | รอบแรกคง CSV + พิมพ์ | Phase 5 |
| TBD-4 | ที่เก็บ layout Dashboard | OPEN | ยังไม่ทำการซ่อน Widget ใน Phase 2 (ขัด P0-A ถ้าของเดิมหาย) | Phase 2 |
| TBD-5 | Auto Save vs Confirm | OPEN | Auto Save เฉพาะ Personal Preferences | Phase 6 |
| TBD-6 | Offline / Network | **CLOSED (หลักการ); ผลทดสอบ NOT VERIFIED** | เมื่อ Offline ต้องป้องกันการเขียนข้อมูลการเงิน; **ห้าม Queue ธุรกรรมเพื่อส่งอัตโนมัติเมื่อกลับ Online**; ต้องกัน Duplicate Submission; ข้อความเข้าใจง่าย. **หลักฐาน [V-src]:** `main.tsx:11` ใช้ `new QueryClient()` ค่าเริ่มต้น (ไม่มี `networkMode`/`onlineManager`); TanStack Query ที่ติดตั้ง 5.90.2 ตั้ง `networkMode` เริ่มต้นเป็น `'online'` ซึ่ง Mutation ที่เรียกตอน Offline จะถูก **หยุดรอ (paused)** และถูกส่งต่ออัตโนมัติเมื่อกลับ Online (`retryer.ts:52–54,108`, `queryClient.ts:86–92 resumePausedMutations`) — **ขัดกับการตัดสินใจนี้** ถ้าไม่แก้ที่ Implement. ยังไม่ได้ทดสอบบนเบราว์เซอร์จริง | Phase 1 |
| TBD-7 | Correction Record | OPEN | ตรวจ `db.ts` ก่อน | Phase 3 |
| TBD-8 | Exception Queue | OPEN | ตรวจ GivingInbox ก่อน | Phase 3–4 |
| TBD-9 | เหตุผลบังคับ + Before/After | OPEN | ไม่แสดงช่องเหตุผลจน Server รับ | Phase 6–7 |
| TBD-10 | ผลของ `deleteUser` ต่อข้อมูล | OPEN | ตรวจ `deleteInactiveUser`; ต้องปิดบัญชีก่อนลบอยู่แล้ว (VERIFIED-src) | Phase 6 |
| TBD-11 | Mapping 4 สถานะ | **REVISED** | ไม่เพิ่มสถานะ ใช้ Label เดิมจาก `StatusBadge` + เพิ่มไอคอน | Phase 3 |
| TBD-12 | Global Search / Ctrl K | OPEN | ไม่อยู่ใน Phase 1; ตรวจขอบเขตและสิทธิ์ก่อน | Phase 2 |
| TBD-13 | URL LINE สนับสนุน | OPEN | PO ให้ URL | Phase 6 |
| TBD-14 | ที่เก็บ FAQ/Report Problem/Diagnostics | OPEN | Backend แยก | Phase 7 |
| TBD-15 | Radius | **CLOSED** | Default 14px; Card ที่เหมาะสม 20px; กำหนดตามประเภท Component ไม่ใช้ค่าเดียวทุกองค์ประกอบ (ตรงกับ `--radius: 0.875rem` และการ์ด 20px ของ `DESIGN.md` [V-src]) | Phase 1 (รายชื่อ Component ต่อค่ายังต้องกำหนด) |
| TBD-16 | Typography | **CLOSED** | Manrope (อังกฤษ) + IBM Plex Sans Thai (ไทย); **ไม่ใช้ Plus Jakarta Sans เป็น Display Font**; ตรวจ Google Fonts และลดการโหลดฟอนต์ที่ไม่จำเป็น. หมายเหตุ [V-src]: ปัจจุบัน `--font-display` ใช้ Plus Jakarta Sans ที่ 25 จุด และ `@import` โหลด 5 น้ำหนัก — งานแก้อยู่ใน Phase 1 และต้องวัดผลก่อน/หลัง | Phase 1 |
| TBD-17 | Sidebar Tablet | **CLOSED** | ไม่เปลี่ยน; ทดสอบ iPad จริงก่อนเสนอ | – |
| TBD-18 | แผนทดสอบผู้ใช้จริง | **CLOSED (หลักการ)** | ต้องมีแผน ทดสอบงานจริง ไม่สอนระหว่างทดสอบ; **รายละเอียดแผน (ใคร กี่คน ที่ไหน ข้อมูลอะไร) ยังต้องจัดทำ** | ทุกเฟส |
| TBD-19 | Thai Glossary | **CLOSED (หลักการ)** | ต้องมี Glossary สม่ำเสมอทั้งระบบ; ร่างอยู่ใน `06` รอ PO ตรวจ | Phase 1 |
| TBD-20 | Usability Gate | **CLOSED (หลักการ)** | มี Gate สำหรับ PR ที่เปลี่ยน UI; ต้องมี Acceptance Criteria และหลักฐานชัดเจน (ดู `05` และ `04` §4) | ทุกเฟส |
| TBD-21 | Tablet breakpoint | **CLOSED** | ไม่เปลี่ยนพฤติกรรมเดิม | – |
| TBD-22 | ขนาดตัวอักษร | **CLOSED** | ขนาดเดิมเป็นขั้นต่ำ; ลดได้เมื่อมีเหตุผลและผลทดสอบเท่านั้น | Phase 1 |
| TBD-23 | Dashboard | **CLOSED** | ปรับโครงเดิม คง TaskQueue, Role Filtering, PrimaryActions, SecondaryMenu, BudgetSection, ข่าว; เพิ่มหัวข้อ+ประโยคเริ่มต้น; กราฟรายสัปดาห์ใช้ข้อมูลจริงเท่านั้น | Phase 2 |
| TBD-24 | Side Panel | **CLOSED** | ส่วนเสริม ไม่แทนหน้า Detail; ห้ามแสดง Audit ที่ Role ไม่มีสิทธิ์; ไม่สร้างสถานะ/Workflow ใหม่ | Phase 3 |
| TBD-25 | Badge ตัวเลข | **CLOSED** | เฉพาะที่มี Server Endpoint รองรับและตรวจสิทธิ์แล้ว | Phase 2 |
| TBD-26 | **NEW** — Bottom Nav 5 แท็บและตำแหน่งเข้า Profile/Settings | OPEN | คงเดิม 4 แท็บ จนกว่ามีผลทดสอบ | Phase 2 |
| TBD-27 | **NEW** — ภาพหน้าจอระบบจริงหลังล็อกอิน (ไม่มีข้อมูลผู้ถวายจริง) เพื่อเทียบ Baseline | OPEN | PO ส่ง; ผมไม่ข้ามระบบล็อกอิน | Phase 1–3 |
| TBD-28 | **NEW** — ป้ายตัวเลขบนเมนูใช้ Endpoint ใด (สลิป/รอบนับ/ลงนาม) | OPEN | ตรวจ router ตอนวางแผน Phase 2 | Phase 2 |
| TBD-29 | **NEW** — Thai Glossary และชื่อเมนู/Label | **OPEN (ยังไม่ปิด)** | PO: ต้อง Mapping กับชื่อสถานะและชื่อเมนูจริง; **ห้ามเปลี่ยนคำที่มีความหมายด้านการเงินหรือ Workflow โดยไม่มีหลักฐาน**; รอ PO ตรวจ `06` ฉบับเต็ม | Phase 1 |
| TBD-30 | **NEW** — สิทธิ์ Audit: หน้า Settings = SUPER_ADMIN เท่านั้น แต่ `audit.list` = `adminProcedure` (role = admin) | OPEN | ยืนยันเจตนา (Q1 "Admin เท่านั้น") ตรวจว่า role=admin กับ churchRole=SUPER_ADMIN เป็นกลุ่มเดียวกันจริงหรือไม่ | Phase 6 |
| TBD-31 | **NEW** — `/ui-showcase` เปิดได้ทุกผู้ล็อกอิน (ไม่ใช่ station-only) | OPEN | ตัดสินใจว่าจำกัดสิทธิ์/ซ่อน/คง (นอกขอบเขต UX Redesign ถ้าไม่ขอ) | – |
| TBD-32 | **NEW** — รหัสอังกฤษในข้อความที่ผู้ใช้เห็น (เช่น ตัวกรอง Audit "จ่ายเงินสำเร็จ (DISBURSE)", `labelWithCode`) | OPEN | ตัดรหัสออกตาม Glossary หลัง PO อนุมัติ `06` | Phase 1/6 |

## 5. การแก้ไขข้อมูลจากรอบก่อน (Corrections Log)

| # | ข้อผิดพลาดเดิม | ข้อเท็จจริงที่ถูก | หลักฐาน | แก้ที่ |
|---|---|---|---|---|
| 1 | "ไม่มีหน้า Audit" | มี Audit UI ในแท็บ `audit` ของ Settings (ไม่มี Route แยก ไม่มี Filter; metadata เป็น JSON ดิบ) | VERIFIED-src `Settings.tsx` | 01, 02 |
| 2 | ไม่ได้ตรวจการป้องกันตัวเอง | `deleteUser` และ `setUserStatus` ปฏิเสธการกระทำต่อตัวเอง; ต้องปิดบัญชีก่อนลบ; `setChurchRole` NV | VERIFIED-src `routers.ts:758–815` | 02, 04 |
| 3 | Action audit มี 6 ค่าตัวพิมพ์ใหญ่ | มีตัวพิมพ์เล็กด้วย (`approve_user`, `disable_user`, `delete_user`, `owner_auto_promote`) และป้ายไทยในแท็บ audit | VERIFIED-src `Settings.tsx:1593–` | 02 |
| 4 | "ต้องเพิ่ม StatusBadge" | มี `StatusBadge` ใน `CommonUI.tsx` แล้ว | VERIFIED-src | 02, 03 |
| 5 | ตาราง→การ์ดมือถือ "ไม่มี" | Transactions มีตาราง + ฟีดการ์ดจัดกลุ่มตามวัน | VERIFIED-src `Transactions.tsx:394,469` | 01, 03 |
| 6 | แถวรอบนับใน Transactions (ร่าง Artifact) | ประเภทแถวคือ `income|expense`; รอบนับอยู่ที่ `/counting` | VERIFIED-src `routers.ts:1464` | Artifact, 02 |
| 7 | ร่างใช้ฟอนต์ฐาน 15px | ระบบเดิมใช้ `html` 16.5px; เนื้อหา 19.1px (หน้า Login) | VERIFIED-live/src | Artifact, 02 |
| 8 | Tablet ใช้ Rail ใหม่ | ปัจจุบันใช้เลย์เอาต์มือถือต่ำกว่า 1024px; ยังไม่เปลี่ยน | VERIFIED-src | Artifact, 02 |
| 9 | ชื่อเมนูที่ผมแต่ง ("สลิปรอตรวจ", "อนุมัติเบิกเงิน", "ฝ่ายงาน") | ชื่อจริง: ตรวจสลิป LINE, การอนุมัติ, พันธกิจ ฯลฯ | VERIFIED-src `AppNavigation.tsx:41–99` | Artifact, 02 |
| 10 | `DESIGN.md:137` ว่า `.font-script` ใช้ Caveat | `index.css:15` ตั้งเป็น Manrope แล้ว — `DESIGN.md` ล้าสมัย (ไม่ได้แก้ `DESIGN.md` ตามคำสั่ง) | VERIFIED-src | – |
| 11 | ตัวเลขบนเมนู (สลิป/รอบนับ) | ไม่ทราบ Endpoint | NV | Artifact (ลบแล้ว) |
| 12 | กราฟรายสัปดาห์ | มีแค่ `finance.monthlyStats` รายเดือน | VERIFIED-src | Artifact (ลบแล้ว), 02 |
| 13 | Dashboard ปุ่ม Giving Station ไปที่ `/giving-station` | Route ที่ลงทะเบียนคือ `/giving/station` — อาจไป 404 (ยังไม่ยืนยัน ต้องล็อกอิน) | VERIFIED-src `Home.tsx:299`, `App.tsx:284` | 03 แถว 57 |
| 14 | Emerald `#087f5b` ใช้เป็นตัวอักษรบนพื้นมืดได้ | 3.54 (การ์ด) / 3.85 (พื้น) ไม่ผ่าน 4.5 สำหรับข้อความปกติ; ใช้ `#3dd68c`/`#5FE3A8` | คำนวณจาก hex | 05 A16, Artifact |
| 15 | `05` ไม่ครอบคลุมทุกหน้า/สถานะ/TBD-2,6,15,16 | เพิ่ม A12–A16, B13–B16, เมทริกซ์สถานะต่อหน้า (หัวข้อ C) | ตรวจกับ route ใน `App.tsx` | 05 |
| 16 | `06` เสนอเปลี่ยนคำการเงิน/Workflow โดยไม่มีหลักฐาน (ขัด TBD-29) | ถอนเป็น "ตัวเลือกทดสอบ" และคงคำเดิม | – | 06 |
| 17 | Artifact ไม่ตรง TBD-15 และมีข้อบกพร่องการแสดงผล 5 จุด | ปรับ Radius (Card 20/ปุ่ม-ช่องกรอก 14), ตารางรายการ, ความสูงบอร์ด, มือถือ, Emerald บนพื้นมืด; เรนเดอร์ซ้ำแล้ว | ภาพเรนเดอร์ในเครื่อง | Artifact |
| 18 | Expenses ไม่มีทางเลือกมือถือ (NV) | มีตาราง + การ์ดมือถือ; Settings ผู้ใช้มีการ์ดมือถือ | VERIFIED-src `Expenses.tsx:399,515`, `Settings.tsx:824` | 03 แถว 21 |
| 19 | Settings เปิดได้โดย "Admin" | เปิดได้เฉพาะ SUPER_ADMIN; `audit.list` เป็น `adminProcedure` (role = admin) ไม่ตรงกัน | VERIFIED-src `routeAccess.ts:31`, `Settings.tsx:401`, `routers.ts:3637` | 02 §7, 05 B11, TBD-30 |
| 20 | ระบบเดิมไม่มี OCR | มีการอ่านสลิปด้วย AI อยู่แล้ว (`readSlip`, `rescan`) ต้องตรวจ Backend ก่อนเสนอ Confidence | VERIFIED-src `GivingInbox.tsx`, `GivingStation.tsx` | 03 แถว 59 |
| 21 | การยกเลิก/แก้ไขรายการอาจมีเหตุผล (NV) | ไม่มีช่องเหตุผลเลย ยืนยัน TBD-9 | VERIFIED-src `TransactionDetail.tsx` | 05 B4 |
| 22 | `/ui-showcase` ไม่ทราบสิทธิ์ | เปิดได้ทุกผู้ล็อกอินที่ไม่ใช่ station-only (ไม่มีใน `ROUTE_ACCESS`); เนื้อหาเป็นข้อมูลตัวอย่างภาษาอังกฤษ | VERIFIED-src `routeAccess.ts`, `ComponentShowcase.tsx` | 03 แถว 58, TBD-31 |
