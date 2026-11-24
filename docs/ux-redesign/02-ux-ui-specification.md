# Grace Giving — UX/UI Specification (Blueprint, Revision 2)

สถานะ: Draft เพื่อรอ Product Owner ตรวจรอบสุดท้าย · ยังไม่มีการ Implement · แก้ไขล่าสุด 2026-11-24 (Blueprint Revision Only)
อ้างอิง: `01-decision-register.md`, `03-feature-matrix-and-constraints.md`, `04-roadmap-risks-readiness.md`, `05-page-acceptance-criteria.md`, `06-thai-glossary-draft.md`

**ป้ายหลักฐาน:** [V-src] อ่านจากซอร์สโค้ดปัจจุบัน (ไม่ใช่การดูหน้าจอจริง) · [V-live] ตรวจบนเว็บจริง (ทำได้เฉพาะหน้า `/login`) · [A] ข้อสันนิษฐาน · [P] ข้อเสนอ · [NV] ยังไม่ได้ตรวจ

## 0. หลักการระดับ Product (ใช้กับทุกหน้า)

**P0-A Improve Existing Product, Not Replace Its Proven Workflows** (ยืนยันโดย PO)
- ระบบเดิมเป็นฐาน ห้ามตัดหรือแทนที่ฟังก์ชันเดิมเพียงเพื่อให้หน้าตาเรียบง่ายขึ้น
- ทุกข้อเสนอที่เอาของเดิมออกต้องมีเหตุผลและได้รับอนุมัติเป็นรายข้อ
- ไม่ออกแบบ UI ที่ Backend ไม่รองรับ และไม่แสดงสถานะ/Workflow ที่ระบบไม่มี

**P0-B Intuitive by Design** (ยืนยันโดย PO)
> "เราไม่ต้องการแอปที่ต้องมีคนสอนวิธีใช้ทุกหน้า เราต้องการแอปที่ออกแบบมาดีจนผู้ใช้เข้าใจและใช้งานได้เอง"

1. Self-Explanatory — เปิดหน้าแล้วรู้ว่าทำอะไร เห็นสถานะ และรู้ว่าเริ่มตรงไหน
2. Obvious Interaction — ปุ่มหลักชัด ชื่อเข้าใจง่าย ไม่ต้องเดาไอคอน แยก Primary/Secondary ตำแหน่งสม่ำเสมอ
3. Natural Workflow — ลำดับตามงานจริง ไม่บังคับให้จำข้อมูลข้ามหน้า
4. Error Prevention — ป้องกันก่อนผิด; ผิดแล้วบอกสาเหตุและวิธีแก้; การกระทำสำคัญแสดงผลกระทบก่อนยืนยัน
5. Low Cognitive Load — แสดงเท่าที่จำเป็น ภาษาไทยเรียบง่าย ไม่มีศัพท์เทคนิค (ดู `06`)
6. Consistency — Form/Table/Button/Dialog/Notification/Status มาตรฐานเดียวกัน

Acceptance: ทุกหน้าต้องตอบ YES ทั้ง 7 ข้อใน `05` และต้องผ่านการทดสอบกับผู้ใช้จริง (TBD-18) ก่อนอ้างว่าผ่าน ตอนนี้ทุกหน้า **Usability: NOT RUN**

**P0-C หลักการรอง:** Financial/Business Logic, Permissions, Security, Audit Trail ไม่เปลี่ยน · สถานะการเงินยึดตาม Server · UI Visibility ไม่ใช่ Security Boundary · ผู้ใช้ทั่วไปและผู้สูงอายุเป็นเกณฑ์ ไม่ใช่เฉพาะ Admin

## 1. ความสามารถเดิมที่ต้องรักษา (Preserve List)

| # | ความสามารถ | หลักฐาน |
|---|---|---|
| 1 | Dashboard: `HeroSection`, `TaskQueue` (งานที่ต้องดำเนินการ รวม N รายการ), `BalanceCard` (ซ่อน/แสดงยอด, เงินหมุนเวียนทั่วไป vs กองทุนเฉพาะกิจ), `PrimaryActions` (บันทึกการถวาย / บันทึกรายจ่าย / ไปที่รอบนับเงินถวาย / ถวายทรัพย์), `SecondaryMenu` (สมาชิก, กิจกรรม, ขอเบิกเงิน, ขั้นตอนการถวาย, เพิ่มเติม), `FinancialSummaryRow` (รายรับ/รายจ่าย/คงเหลือสุทธิเดือนนี้), `RecentTransactions`, `BudgetSection` (แผนการใช้จ่าย), `ChurchNewsSheet` | [V-src] `Home.tsx:244–353`, `Home/components/*` |
| 2 | การกรอง Dashboard ตาม Role (`canSeeFinance`, `canViewBudgets`, `canAccessRoute`) | [V-src] `Home.tsx:52–68` |
| 3 | Sidebar (`bg-ground`, ไอคอน+Label, กลุ่มเมนู), กระดิ่ง + จำนวนยังไม่อ่าน (Sidebar และหัวมือถือ), Settings, Profile, การแจ้งเตือน | [V-src] `AppLayout.tsx`, `AppNavigation.tsx` |
| 4 | Bottom Nav มือถือ 4 แท็บ (หน้าแรก, รายการ, รายงาน, ฉัน) และ Drawer เมนูมือถือ | [V-src] `AppLayout.tsx:35–62` |
| 5 | รายการธุรกรรม: ค้นหา (debounce 300ms), ตัวกรองช่วงเวลา/กองทุน/ประเภท, การ์ดสรุปรายรับ-รายจ่ายของช่วงที่เลือก, ปุ่ม ส่งออก CSV / บันทึกรายจ่าย / บันทึกการถวาย, cursor pagination | [V-src] `Transactions.tsx:51–230` |
| 6 | ตาราง 6 คอลัมน์ (วันที่, รายการ / ผู้ถวาย-ผู้รับเงิน, ประเภท, กองทุน, จำนวนเงิน, สถานะ) พร้อม `<caption class="sr-only">` และ `scope="col"` | [V-src] `Transactions.tsx:394–425` |
| 7 | ฟีดการ์ดมือถือจัดกลุ่มตามวัน (หัววัน sticky, `aria-label` ต่อแถว, พื้นที่แตะ ≥ 64px) | [V-src] `Transactions.tsx:469–` |
| 8 | หน้ารายละเอียด `/transactions/:id` | [V-src] route + `Link` |
| 9 | การกรองชื่อผู้ถวายตามสิทธิ์ (`canViewDonorNames`) | `CLAUDE.md`, `db.listOfferings` |
| 10 | `StatusBadge` พร้อม Label ไทย (กำลังนับ, รอตรวจสอบ, ตรวจสอบแล้ว, ลงบัญชีแล้ว, ปิดรอบแล้ว, รอดำเนินการ, ฉบับร่าง, ยกเลิกรายการ ฯลฯ) | [V-src] `CommonUI.tsx` |
| 11 | Workflow รอบนับ (counting → counted → verified → posted → closed) อยู่ที่ `/counting` และ `/counting/:id` ไม่ใช่หน้ารายการธุรกรรม | [V-src] `shared/counting.ts` |
| 12 | ซ่อนเมนูตามสิทธิ์, `focus-visible` 2px, สถานะ `:disabled`, `useSubmitLock`, `confirmDiscardChanges`, Toast (`sonner`) | [V-src] |
| 13 | หน้า Login: แยกสองฝั่ง, ปุ่ม LINE, คำอธิบายสิทธิ์, ลิงก์ PDPA | [V-live] |

## 2. Navigation Structure

**Desktop (≥1024px) [V-src]:** Sidebar ปัจจุบันกว้าง 256px พื้นเดียวกับหน้า มีกลุ่ม: ภาพรวม / ถวายและนับเงิน / การเงิน / วางแผนและควบคุม / คริสตจักร / วิเคราะห์ / บัญชีผู้ใช้ รายการเมนูจริง: หน้าหลัก, ขั้นตอนการถวาย, ตรวจสลิป LINE, นับซองหน้างาน, สมุดบัญชีถวาย, รายการ, รายจ่าย, กองทุน, งบประมาณ, พันธกิจ, สมาชิก, รายงาน, การอนุมัติ (+ เขียนเข้ากลุ่ม บัญชีผู้ใช้: โปรไฟล์, ตั้งค่า, การแจ้งเตือน)

การปรับปรุง [P]:
- ใช้ชื่อเมนู ลำดับ และกลุ่มเดิมทั้งหมด **ห้ามเปลี่ยนชื่อเมนูตามที่ร่างรอบแรกแต่งขึ้น** ชื่อที่ปรับต้องผ่าน Glossary (`06`)
- พื้นหลัง Sidebar เป็น Navy A `#0B1B33` (TBD-1 ยืนยัน); ตัวอักษรรอง `#A9B6CB`; ตัวชี้เมนูที่เลือก/ตัวเลขใช้ Emerald อ่อน `#5FE3A8`
- เพิ่มปุ่มย่อ/ขยาย Sidebar เป็นตัวเลือก จำใน localStorage [P] (ไม่แตะ Backend) ต้องผ่านการทดสอบก่อนตั้งเป็นค่าเริ่มต้น
- คง กระดิ่งการแจ้งเตือน + จำนวนยังไม่อ่าน, Settings, Profile
- **Badge ตัวเลขบนเมนู:** แสดงเฉพาะที่มี Server Endpoint และตรวจสิทธิ์แล้ว (TBD-25) ที่ตรวจพบ: `auth.pendingCount` (Admin), `notifications.unreadCount`, `TaskQueue` ใช้แหล่งข้อมูลของตัวเอง ตัวเลขสลิป/รอบนับ/ลงนาม [NV] ว่า Endpoint ใดคืนจำนวนตามสิทธิ์ ห้ามวาดจนกว่าตรวจ
- Command Palette / Ctrl K: **ไม่อยู่ใน Phase 1** (TBD-12 ยังไม่ปิด; ขอบเขตข้อมูลและสิทธิ์ต้องตรวจก่อน)

**Tablet (768–1023px):** ยังไม่เปลี่ยน (TBD-17/21) ปัจจุบันใช้เลย์เอาต์มือถือ (แถบล่าง + Drawer) [V-src] ต้องทดสอบกับ iPad จริงก่อนเสนอการเปลี่ยนแปลง ห้ามวาดเลย์เอาต์ Tablet ใหม่จนกว่าจะมีผลทดสอบ

**Mobile (<1024px):** คงแถบล่าง 4 แท็บ + หัวที่มีกระดิ่ง + Drawer เดิม การเพิ่มเป็น 5 แท็บ [P] ผูกกับ TBD-26 (ต้องยืนยันว่าเข้า Profile/Settings ได้ไม่ช้ากว่าเดิมและผ่านการทดสอบ)

## 3. Global Patterns

| รูปแบบ | ข้อกำหนด |
|---|---|
| ตัวอักษร | **ขนาดเดิมเป็นขั้นต่ำ** (TBD-22): `html` 16.5px / 15.75px บนจอเล็ก, เนื้อหาในระบบจริงที่วัดได้ 19.1px (หน้า Login) [V-live]; ห้ามลดขนาดของ Element ใดโดยไม่มีเหตุผลและผลทดสอบ; ร่าง Artifact รอบแรกใช้ 15px — ผิดข้อนี้ และแก้แล้วใน Revision 2 |
| ตาราง | คง `<caption>`, `scope`, ความหนาแน่นสบาย; มือถือเป็นการ์ดตามวัน (มีอยู่แล้ว); Pagination แบบ cursor เดิม |
| ตัวกรอง | คงช่วงเวลา/กองทุน/ประเภท/ค้นหา และ `FilterBar` เดิม; เพิ่ม Chip แสดงตัวกรองที่ใช้ได้ถ้าไม่ซ้ำกับของเดิม [P] |
| Side Panel | **ส่วนเสริม** ไม่แทนหน้า `/transactions/:id` (TBD-24); แสดงเฉพาะข้อมูลที่ Role นั้นเห็นอยู่แล้วในรายการ/รายละเอียด; ไม่แสดงประวัติ Audit (Endpoint จำกัด Admin) ไม่มี Workflow/สถานะใหม่ |
| Status | สี + ข้อความ + ไอคอน (ข้อ 77) ใช้ `StatusBadge` เดิม เพิ่มไอคอนตามสถานะ; ห้ามเพิ่มสถานะที่ DB ไม่มี |
| Confirm | Sensitive Actions ใช้ Dialog ที่ระบุผลกระทบ (ใช้ `Swal.confirm`/`AlertDialog` ที่มี) ปุ่มยืนยันตั้งชื่อตามการกระทำ |
| Feedback | Inline error พร้อมวิธีแก้; Toast หลัง Server ยืนยัน; Skeleton ขณะโหลด; ห้ามแสดงสำเร็จก่อน Server ตอบ |
| ภาษา | ไทยเรียบง่าย ตาม Glossary (`06`) |

### 3.1 States ที่ต้องออกแบบ (ใหม่ใน Revision 2) — ดูตัวอย่างในอาร์ตบอร์ด "0 · Tokens และ States"

| State | ข้อกำหนด |
|---|---|
| Focus | วง 2px offset 2px; บนพื้นสว่างใช้ Emerald `#087f5b` (5.00 บนขาว); **บนพื้น Navy ใช้ขาวหรือ `#5FE3A8`** ไม่ใช้ `#087f5b` (3.44 บน A ใกล้ขีดจำกัด 3:1 และไม่เหลือที่ว่าง) |
| Disabled | ลดความเข้มพร้อม `cursor: not-allowed` และบอกเหตุผลเป็นข้อความข้างปุ่ม (ไม่ใช้สีอย่างเดียว); ต้องวัด Contrast — ยังไม่ได้วัด [NV] เพราะ WCAG ไม่บังคับสำหรับ Disabled แต่ Intuitive ต้องบอกว่าทำไมกดไม่ได้ |
| Error | ข้อความแดง `#c41c29` (5.92) + ไอคอน + วิธีแก้ ที่ใต้ฟิลด์ และ `aria-live` |
| Loading | Skeleton ตรงโครงหน้า; ปุ่มที่กำลังส่ง: ข้อความ "กำลังบันทึก…" + ปิดใช้งาน |
| Empty / Zero | ข้อความอธิบายและปุ่มลงมือทำตามบริบท; ศูนย์แสดงเป็น 0 ไม่ใช่ช่องว่าง |
| Offline | **TBD-6 CLOSED (หลักการ):** เมื่อ Offline ต้องปิดการเขียนข้อมูลการเงินและบอกผู้ใช้ด้วยข้อความเข้าใจง่าย (เช่น "ไม่มีอินเทอร์เน็ต บันทึกไม่ได้ในขณะนี้ ข้อมูลที่กรอกยังอยู่ กรุณาลองใหม่เมื่อเชื่อมต่อ"); **ห้าม Queue แล้วส่งอัตโนมัติเมื่อกลับ Online**; กัน Duplicate Submission. **ข้อควรระวัง [V-src]:** ค่าเริ่มต้นของ TanStack Query 5.90.2 จะหยุดรอ Mutation แล้วส่งต่ออัตโนมัติเมื่อกลับ Online (ดู `01` TBD-6) — ต้องกำหนดที่ Implement; พฤติกรรมจริงบนเบราว์เซอร์ **NOT VERIFIED** (ห้ามเขียนว่าปลอดภัยจนกว่าทดสอบ) |

## 4. Page-by-Page Requirements

รายละเอียดเกณฑ์ผ่านต่อหน้าอยู่ใน `05-page-acceptance-criteria.md` ตารางนี้สรุปทิศทาง

| Route | ทิศทาง [P] | สิ่งที่ห้าม |
|---|---|---|
| `/` Dashboard | ปรับโครงเดิม (TBD-23): คง Preserve #1–2; เพิ่มหัวข้อชัดและประโยคบอกว่าควรเริ่มทำอะไร (สร้างจาก `TaskQueue` จริง); กราฟรายสัปดาห์ **ไม่อยู่ใน Phase 2** จนกว่ามี Endpoint รายสัปดาห์ (ปัจจุบันมีแค่ `finance.monthlyStats` [V-src]) ถ้าต้องการกราฟ ใช้รายเดือนจากข้อมูลจริง | ตัด `PrimaryActions`/`SecondaryMenu`/`BudgetSection`/ข่าว; แสดงข้อมูลเกินสิทธิ์ |
| `/transactions` | คง Preserve #5–7; ปรับ Token และ Status ไอคอน | ตัดคอลัมน์ ประเภท/ผู้ถวาย-ผู้รับเงิน; เพิ่มแถวหรือปุ่มเกี่ยวกับรอบนับ |
| `/transactions/:id` | คงหน้า; Side Panel เป็นตัวเลือก (TBD-24) | แทนที่หน้า; แสดง Audit ที่ Role ไม่มีสิทธิ์ |
| `/counting`, `/counting/:id` | คง State Machine และสิทธิ์; ปรับ Token | ย้าย Workflow ไปที่อื่น |
| `/offerings/new`, `/expenses/new` | ปรับ Token; Review ก่อนบันทึก: ตรวจ Workflow เดิมก่อน (ปัจจุบันปุ่ม "ยืนยันบันทึกการถวาย" + Success Dialog [V-src]) | เพิ่มขั้นตอนซ้ำ |
| `/giving/inbox` | คง Label สถานะสลิป (รอดึงข้อมูล … สลิปซ้ำ); Split View เป็นเฟส 4 หลังตรวจ UI เดิม | เพิ่ม OCR/Confidence |
| `/giving/station`, `/give` | Token เท่านั้น | เปลี่ยน flow 4 ขั้นเดิม |
| `/approvals`, `/withdrawals/new` | คง `SignatureProgress`; ซ่อนปุ่มลงนามของผู้ขอ (PR #156 ถ้า Merge) | เปลี่ยน Approval Logic |
| `/reports` | คง CSV; Preview [P] | PDF โดยไม่อนุมัติ library (TBD-3) |
| `/settings` (+ tab audit) | คงแท็บเดิม; แปลง metadata JSON ดิบเป็นคู่ชื่อ–ค่า สำหรับ Admin เท่านั้น | ขยายสิทธิ์ Audit |
| `/members`, `/ministries` ("พันธกิจ"), `/updates` | Token | – |
| `/notifications`, `/profile` | คงเดิม | – |
| `/login` | คงเดิม [V-live] | – |

## 5. Dashboard & Widget Specification (Revision 2)

**ไม่เปลี่ยนโครงสร้าง** เพิ่มสองสิ่ง [P]:
1. **หัวข้อที่ชัด:** ปัจจุบัน h1 เป็นชื่อแบรนด์ "Grace Giving" [V-src] เพิ่มบรรทัดบอกงาน เช่น "มี N งานที่ต้องดำเนินการ เริ่มจากรายการด้านล่าง" สร้างจากจำนวนใน `TaskQueue` (ไม่มีงาน → "ไม่มีงานค้าง")
2. **Token และไอคอนสถานะ**

Widget แสดง/ซ่อน (ข้อ 60) และ layout ต่อผู้ใช้ (ข้อ 61): ไม่ทำใน Phase 2 รอบแรก — ขัดกับ P0-A หากทำให้ของเดิมหาย; ถ้าทำ ต้องเริ่มด้วย "ซ่อนได้" ไม่ใช่ "เอาออก" และต้องไม่ซ่อน `TaskQueue` ค่าเริ่มต้นตาม Role มีอยู่แล้ว (TBD-4 ยังเปิด)

## 6. Transaction & Financial UX

- Quick Entry/Batch: ใช้ `/offerings/new`, `/counting` (EnvelopesTab) และ `/giving/station` ที่มี; ต้องอ่าน Flow เดิมครบก่อนเสนอ Review Step (ดู `05`, `NewOffering`, `EnvelopesTab`, `GivingStation`) ห้ามสร้างขั้นตอนซ้ำ [NV] ระดับรายละเอียด
- Optimistic UI: ห้ามใช้กับธุรกรรมการเงิน
- ตัวเลข: `.money` tabular; ชิดขวา
- สถานะ: ใช้ Label เดิม (TBD-11 แก้เป็น: "ไม่เพิ่มสถานะ; เพิ่มไอคอน")
- แก้ไข/เหตุผล (ข้อ 43), Correction Record (ข้อ 129), Exception Queue (ข้อ 132): TBD-7/8/9 ยังเปิด ห้ามวาดจนกว่า Backend รองรับ
- ปิดรอบ/กระทบยอด: ใช้ `ReconciliationSummaryTab` เดิม

## 7. System Activity & Audit (Topic 31)

Admin เท่านั้น (Q1) — แต่ในซอร์ส หน้า Settings ซึ่งมีแท็บ `audit` เปิดได้เฉพาะ SUPER_ADMIN (`routeAccess.ts:31`, `Settings.tsx:401`) ขณะที่ `audit.list` เป็น `adminProcedure` (role = admin) สองเงื่อนไขไม่เหมือนกัน (TBD-30). ใช้แท็บ `audit` เดิมใน `Settings.tsx` ป้าย action ภาษาไทยมีอยู่แล้ว [V-src] (บันทึกใหม่, แก้ไขข้อมูล, ยกเลิกรายการ, ลบข้อมูล, อนุมัติ …) action มีทั้งตัวพิมพ์ใหญ่และเล็ก (`approve_user`, `disable_user`, `delete_user`, `owner_auto_promote`) กฎ Suspicious ต้องสำรวจ action ทั้งหมดก่อน [NV] ปัญหาที่เหลือ: metadata แสดงเป็น JSON ดิบ ตัดข้อความ; Filter ฝั่ง Server ไม่มี (`audit.list` รับแค่ `limit` สูงสุด 200) → UI ต้องบอกขอบเขต "จาก 200 รายการล่าสุด" Before/After: เฉพาะที่มีข้อมูล (Q2) Side Panel ไม่แสดง Audit ให้ Role อื่น

## 8. User Management & Permission UX (Topic 32)

คงฟังก์ชันเดิมทั้งหมด [V-src]: `listUsers`, `setChurchRole`, `setUserStatus`, `deleteUser`, `pendingCount`; Flow สมัครด้วย LINE → pending → Admin อนุมัติ (Q4)
- ป้องกันตัวเอง: `deleteUser` และ `setUserStatus` ปฏิเสธการกระทำต่อตัวเอง [V-src]; `setChurchRole` [NV]
- ลบบัญชีต้องปิดบัญชีก่อน (`deleteInactiveUser`) [V-src] — UI ต้องอธิบายสองขั้นนี้ ผลต่อข้อมูลธุรกรรม (TBD-10) [NV]
- Label Role ใช้ชื่อไทยไม่มีรหัสในวงเล็บ (Glossary) — ปัจจุบัน `labelWithCode` แสดงรหัส [V-src]; ต้องตรวจว่าใช้ที่หน้าไหน [NV]

## 9. Import / Export UX
Import DEFERRED. Export: CSV เดิม (`reports/transactions/offerings.exportCsv`); Preview ก่อนดาวน์โหลด [P] (ใช้ข้อมูลที่ Server ส่ง); PDF/History/Approval: DEFERRED ห้ามวาดปุ่มที่ไม่ทำงาน

## 10. Notification & Help
ใช้ In-app เดิม (กระดิ่ง, `/notifications`) 3 ระดับ/LINE/Email/Real-time DEFERRED Help: `/giving-guide` และ Contextual help เป็นส่วนเสริม ห้ามพึ่งเพื่อให้หน้าหลักเข้าใจได้ (P0-B)

## 11. Mobile & Responsive
ดู §2. การ์ดตามวันมีแล้ว (Transactions); Expenses มีตาราง + การ์ดมือถือแล้ว, Settings รายชื่อผู้ใช้มีการ์ดมือถือ, Offerings เป็นแถวคั่นเส้น [V-src]; Reports มีตารางและข้อความช่วยบนมือถือบางส่วน [NV ทั้งตาราง] Touch target ≥ 44px (ฟีดเดิม `min-h-16`) ต้องทดสอบจริงก่อนอ้างว่ารองรับ

## 12. Loading / Empty / Error / Success
ใช้ `LoadingSkeleton`, `EmptyState`, `ErrorState`, `sonner` เดิม (ข้อความเดิมเช่น "ไม่มีงานค้างที่ต้องดำเนินการ", "ยังไม่มีรายการธุรกรรมล่าสุดจากระบบ" เก็บไว้) ปรับ Token

## 13. Accessibility (Topic 34)
เป้าหมาย WCAG 2.2 AA — ห้ามอ้าง Compliant จนกว่าตรวจจริง คง `aria-label`, `<caption>`, `scope` เดิม Keyboard ครบ Reduced Motion: ใช้กลไกเดิมใน `index.css` ขยาย Zoom 200%: ต้องทดสอบ (`html` 16.5px ยังไม่ทราบผล) [NV]

## 14. Design System (Topic 35) — Tokens

| Token | ค่า | หลักฐาน |
|---|---|---|
| `--navy` | `#0B1B33` (A) — **ยืนยันโดย PO** | – |
| หมึกหลัก (บนพื้นสว่าง) | Navy; ข้อความขาวบน Navy 17.23 | [V] คำนวณ |
| ตัวอักษรรองบน Navy | `#A9B6CB` 8.40 / `#8EA0BB` 6.48 | [V] คำนวณ |
| Emerald บนพื้นสว่าง | `#087f5b` (5.00 บนขาว, 4.65 บนพื้น `#f5f7f6`) | [V] คำนวณ |
| Emerald บน Navy | `#5FE3A8` 10.70 | [V] คำนวณ |
| ปุ่มหลัก | ขาวบน `#087f5b` 5.00 | [V] คำนวณ |
| Focus บน Navy | ขาว (17.23) หรือ `#5FE3A8` (10.70); `#087f5b` บน Navy ได้ 3.44 ไม่ใช้ | [V] คำนวณ / [P] |
| แถวเมนู Hover/Selected บน Navy (`#213045`) | ขาว 13.35 · `#A9B6CB` 6.51 · `#5FE3A8` 8.29 | [V] คำนวณ |
| Disabled (ข้อความ `#566478` บน `#e4e8e5`) | 4.86 (ข้อมูล ไม่บังคับตาม WCAG) ต้องมีข้อความบอกเหตุผลเสมอ | [V] คำนวณ |
| Error `#c41c29` บนขาว · ขอบช่องกรอก `#8a95a5` บนขาว | 5.92 · 3.03 (เฉียดฉิว) | [V] คำนวณ |
| โหมดมืด: ขาวบน `#0a1426` · `#5FE3A8` บน `#0a1426` · Focus `#5FE3A8` บน `#151918` | 18.41 · 11.43 · 11.01 | [V] คำนวณ |
| Dark mode | พื้นเทากลางเดิม `#0c0f0e`; Sidebar `#0a1426` [P]; ยังไม่เคยดูผลเรนเดอร์ | [NV] |

**ต้องตรวจ Contrast ทุกสถานะก่อนอนุมัติ (PO):** Default, Hover, Active, Focus, Disabled, Error, Selected ทั้ง Light/Dark บนพื้นสว่างและ Navy — ตัวเลขที่คำนวณแล้วมีเฉพาะที่ระบุข้างบน ที่เหลือ [NV] ต้องขยาย `theme.contrast.test.ts` ตอน Implement
**Radius (TBD-15 CLOSED):** Default 14px; Card ที่เหมาะสม 20px; กำหนดตามประเภท Component (ไม่ใช้ค่าเดียวทุกองค์ประกอบ) — รายชื่อ Component ต่อค่ายังต้องกำหนดตอนวางแผน Phase 1
**Typography (TBD-16 CLOSED):** Manrope (อังกฤษ) + IBM Plex Sans Thai (ไทย); **ไม่ใช้ Plus Jakarta Sans เป็น Display Font**; ตรวจ Google Fonts และโหลดเฉพาะน้ำหนักที่ใช้จริง (ปัจจุบัน `@import` โหลด Plus Jakarta Sans 5 น้ำหนัก และ `--font-display` ใช้ที่ 25 จุด [V-src]); ขนาดตัวอักษรยังไม่ต่ำกว่าเดิม (TBD-22)
Components: ขยายของเดิม (`ui/*`, `common/*`) ห้ามสร้างซ้ำ

## 15. Interaction & Motion
**TBD-2 CLOSED:** CSS First; ไม่ติดตั้ง Motion Library ใน Phase 1; ใช้ Animation เฉพาะที่ช่วยสื่อสารสถานะ (กดปุ่ม, โฟกัส, เปิด/ปิด Panel, กำลังโหลด); รองรับ `prefers-reduced-motion` (ใช้ `no-preference` guard ตามที่มี [V-src]); **ตัวเลขทางการเงินไม่ใช้ Animation** (ไม่นับขึ้น ไม่เลื่อน ไม่จาง) Motion Library (Q14) ยังไม่อนุมัติ

## 16. Deferred Features — UX และ Architecture
เหมือน Revision 1 (MFA/Trusted Device/Re-auth, Scheduled Reports, OCR, Import, Threshold Approval, Notification 3 ระดับ+LINE/Email, FAQ/Report Problem/Diagnostics, Export Approval/History/PDF, Before/After + เหตุผลบังคับ) ต้องมี ADR และอนุมัติแยกก่อนเริ่ม
