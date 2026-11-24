# Grace Giving — Roadmap, Regression Risk Register, Usability Gate, Readiness (Revision 2)

สถานะ: Draft เพื่อรอ Product Owner ตรวจรอบสุดท้าย · ยังไม่มีการ Implement · แก้ไข 2026-11-24
กติกาทุกเฟส: แยก PR · ไม่เปลี่ยน Financial/Auth Logic · ไม่ตัดความสามารถเดิม (P0-A) · เทสต์ผ่านใน CI ก่อน Merge · ไม่ Merge/Deploy โดยไม่ได้รับอนุมัติ · ไม่ทดสอบการเขียนบน Preview (ใช้ DB เดียวกับ Production)

## 1. Roadmap (ปรับตามการตัดสินใจของ PO)

| Phase | ขอบเขต | ไม่รวม (ตามการตัดสินใจ) | Decisions ที่ต้องปิดก่อน |
|---|---|---|---|
| 1 — Tokens + Shell | Token Navy A / Emerald อ่อน, Focus/Disabled/Error/Loading ตามหลัก, ไอคอนใน `StatusBadge`, Label ตาม Glossary | **ไม่เปลี่ยน Tablet breakpoint** (TBD-21); ไม่ลดขนาดตัวอักษร (TBD-22); ไม่เพิ่ม Ctrl K | TBD-2, 6, 15, 16 **CLOSED**; เหลือ: TBD-19/29 (Glossary), ตรวจ Contrast ทุกสถานะ, ทดสอบพฤติกรรม Offline จริง (กัน Mutation ส่งอัตโนมัติ), กำหนดรายชื่อ Component ต่อ Radius, ลดการโหลดฟอนต์ |
| 2 — Dashboard | คงทุกส่วนเดิม; เพิ่มหัวข้อ + ประโยคเริ่มต้นจาก `TaskQueue`; Badge เมนูเฉพาะที่มี Endpoint | กราฟรายสัปดาห์ (จนกว่ามีข้อมูล); ซ่อน/แสดง Widget (TBD-4) | TBD-4, 12, 25, 26, 28 |
| 3 — Transactions + Giving | คงคอลัมน์/ตัวกรอง/ฟีดมือถือ/caption; Side Panel เป็นส่วนเสริม; ตรวจ Flow บันทึกถวายเดิมก่อนเสนอ Review | แถวหรือปุ่มรอบนับใน Transactions; Audit ใน Panel; สถานะใหม่ | TBD-7, 8, 11, 24 และผลอ่าน `NewOffering`/`EnvelopesTab`/`GivingStation` |
| 4 — Slip Verification | ปรับ UI `/giving/inbox` เดิม; Split View หลังตรวจ UI เดิม | OCR/Confidence | TBD-8 |
| 5 — Reports + Export | Preview ก่อน CSV; Period ตามข้อมูลจริง | PDF จนกว่าอนุมัติ library | TBD-3 |
| 6 — User Mgmt + Audit + Settings | ปรับ UI จัดการผู้ใช้เดิม; Audit เป็นคู่ชื่อ–ค่า (Admin เท่านั้น); Settings แยกหมวดถ้าทดสอบแล้วดีขึ้น | ขยายสิทธิ์ Audit | TBD-5, 9, 10, 13 |
| 7 — Backend-dependent | MFA, Scheduled Reports, OCR, Import, Threshold Approval, Notification 3 ระดับ, FAQ/Report Problem, Export Approval/History, Before/After | – | ต้องมี ADR และอนุมัติแยก |

**Dependencies ระหว่างเฟส:**
- Phase 1 เป็นฐานของทุกเฟส (Token, States, Glossary)
- Phase 2 → 3: ถ้า Drill-down ของกราฟลิงก์ไป `/transactions` พร้อมตัวกรอง ต้องตรวจก่อนว่าหน้า Transactions อ่านตัวกรองจาก URL ได้ [NV] ปัจจุบันตัวกรองเป็น state ในหน้า [V-src]
- Phase 3 → 4: ใช้ `StatusBadge` และ Panel ร่วม
- Phase 3 ชนกับ PR #156/#157 (ไฟล์ `Approvals.tsx`, `Counting*.tsx`) ต้องรู้สถานะ Merge ก่อนเริ่ม
- Phase 6 ต้องแยก Route Settings (R7) หลังทดสอบ
- Phase 7 ปลดล็อกส่วนของ Phase 3 และ 6 (เหตุผลบังคับ, Before/After)

แต่ละเฟสต้องมี Scope, Acceptance Criteria (`05`), Regression Tests, Usability Gate (§4) และแยก PR ได้

## 2. Regression Risk Register

ระดับ: สูง = กระทบเงิน/สิทธิ์/ข้อมูลหาย · กลาง = กระทบการใช้งานหลัก · ต่ำ = ภาพลักษณ์ · ป้ายหลักฐานของข้อเท็จจริงที่อ้างอยู่ในคอลัมน์สุดท้าย

| ID | ความเสี่ยง | ระดับ | เฟส | การป้องกัน | หลักฐาน |
|---|---|---|---|---|---|
| R1 | บันทึกซ้ำ | สูง | 3 | ไม่แตะ Mutation/Zod; ใช้ `useSubmitLock` เดิม; เทสต์กันกดซ้ำ | [V-src] `useSubmitLock`, `NewOffering.tsx:162` |
| R2 | Optimistic UI กับเงิน | สูง | 2–3 | ห้ามใช้กับธุรกรรม | Brief ข้อ 81 |
| R3 | ข้อมูลเกินสิทธิ์ (ชื่อผู้ถวาย) ใน Widget/Panel/Search | สูง | 2,3,6 | ใช้ Endpoint ที่กรองฝั่ง Server; เทสต์ต่อ Role | [V-src] `canViewDonorNames` |
| R4 | เข้าใจว่าซ่อน UI = ปลอดภัย | สูง | ทุกเฟส | ไม่ลดการตรวจฝั่ง Server | หลักการ |
| R5 | ชน PR #156–#158 | สูง | 3 | ตรวจสถานะ PR ก่อนเริ่ม | PR เปิดอยู่ตามบันทึกก่อนหน้า [NV ล่าสุด] |
| R6 | แถบล่าง 4→5 แท็บทำให้เข้า Profile ช้าลง | กลาง | 2 | คง 4 แท็บจนมีผลทดสอบ (TBD-26) | [V-src] |
| R7 | แยก Settings เป็น Route กระทบ `ROUTE_ACCESS`, `wouter` patch | กลาง | 6 | Redirect; เทสต์สิทธิ์รายหน้า | [V-src] Settings 1,838 บรรทัด |
| R8 | Contrast ตกหลังใส่ Navy / Emerald บน Navy | กลาง | 1 | ใช้ `#5FE3A8` บน Navy; ขยาย `theme.contrast.test.ts` ทุกสถานะ | [V] คำนวณ: `#087f5b` บน A = 3.44 |
| R9 | Focus ring เดิม (`#087f5b`) บน Navy ใกล้ขีด 3:1 | สูง | 1 | Focus บน Navy ใช้ขาวหรือ Emerald อ่อน | [V-src] `index.css:437`; [V] 3.44 |
| R10 | Motion ขัด Reduced Motion | กลาง | 1–2 | ทุก Motion มีทางเลือก | [V-src] |
| R11 | Library ใหม่ไม่รองรับ React 19/Bundle | กลาง | 1–2 | ตรวจก่อนขออนุมัติ | [NV] |
| R12 | ตัดข้อมูลสำคัญเมื่อแปลงตารางเป็นการ์ด | กลาง | 3–6 | ออกแบบฟิลด์หลักต่อหน้า; ทดสอบ Viewport | Transactions, Expenses, Settings ผู้ใช้ มีการ์ดแล้ว [V-src]; Reports ตรวจเพิ่ม [NV]; Offerings เป็นแถวคั่นเส้น |
| R13 | Zoom 200% เลย์เอาต์แตก | กลาง | 1 | ทดสอบ Zoom | [NV] |
| R14 | PII ใน metadata ของ Audit | สูง | 6 | ตรวจเนื้อหาจริงก่อน Mask | [NV] |
| R15 | Filter Audit ไม่ครอบคลุมทั้งระบบ | กลาง | 6 | แจ้งขอบเขต หรือขอ Backend | [V-src] `limit` ≤ 200 |
| R16 | UI บังคับเหตุผลที่ Server ไม่เก็บ | สูง | 3,6 | ไม่แสดงช่องจน Server รับ | [V-src] เฉพาะ withdrawal cancel |
| R17 | ปุ่ม Export PDF/Import ที่ไม่มี Backend | สูง | 5 | ซ่อน/ระบุ "ยังไม่รองรับ" | [V-src] |
| R18 | Preview ใช้ DB จริง | สูง | ทุกเฟส | ทดสอบเขียนบน DB ที่ไม่ใช่ Production | [V-src] `CLAUDE.md` |
| R19 | ป้องกันตัวเอง | กลาง | 6 | `deleteUser`/`setUserStatus` มีแล้ว; ตรวจ `setChurchRole` | [V-src]; `setChurchRole` [NV] |
| R20 | เอกสารดีไซน์เก่าขัดกัน (neo-brutalist vs Pastel vs Navy) | กลาง | 1 | `DESIGN.md` เป็นแหล่งจริง; เอกสารเก่าเป็น Historical | [V-src] |
| R21 | อ้าง WCAG/Usability โดยไม่ตรวจ | กลาง | ทุกเฟส | บันทึกหลักฐาน; สถานะ NOT RUN จนกว่าทดสอบ | หลักการ |
| R22 | รันเทสต์ DB จริงกับ Production | สูง | ทุกเฟส | Tenant `test-*` และ DB แยก | [V-src] |
| **R23** | **ตัดความสามารถเดิมของ Dashboard/Transactions/Sidebar โดยไม่ตั้งใจ** (ร่างรอบแรกตัด PrimaryActions, SecondaryMenu, BudgetSection, คอลัมน์ ประเภท/ผู้ถวาย, กระดิ่ง ฯลฯ) | สูง | 1–3 | Preserve List (`02` §1) เป็น Checklist ใน PR ทุกใบ; Review เทียบ Baseline | [V-src] |
| **R24** | **ลดขนาดตัวอักษรเทียบเดิม** (ร่างรอบแรก 15px เทียบ 16.5–19px) | สูง | 1+ | ขนาดเดิมเป็นขั้นต่ำ (TBD-22); วัดก่อน/หลัง | [V] |
| **R25** | **เปลี่ยน Tablet breakpoint โดยไม่ทดสอบ** | กลาง | – | ไม่เปลี่ยน (TBD-21); ทดสอบ iPad ก่อน | [V-src] |
| **R26** | **ตัวเลข Badge ผิดหรือแสดงเกินสิทธิ์** | สูง | 2 | เฉพาะ Endpoint ที่ตรวจสิทธิ์ (TBD-25/28) | [NV] |
| **R27** | **ข้อมูลตัวอย่างใน Artifact ถูกเข้าใจเป็นข้อมูลจริง** | กลาง | – | ป้าย "ข้อมูลตัวอย่าง" ทุกหน้า; ไม่ใช้เป็นข้อมูลทดสอบ | [V] |
| **R28** | **ประเมินจากซอร์ส ไม่ใช่หน้าจอจริงหลังล็อกอิน** | กลาง | 1–3 | รับภาพหน้าจอจาก PO (TBD-27) ก่อนปิด Baseline | [V] ข้อจำกัด |

## 3. Implementation Readiness Checklist

| # | รายการ | สถานะ |
|---|---|---|
| 1 | PO อนุมัติ Blueprint อย่างชัดเจน | ❌ รอ (การยืนยัน TBD ไม่นับ) |
| 2 | TBD-1 Navy | ✅ ตัดสินแล้ว; ❌ ยังรอผลตรวจ Contrast ทุกสถานะ |
| 3 | TBD-2, 6, 15, 16 (Phase 1) | ✅ ตัดสินใจแล้ว; ❌ ยังรอ: ทดสอบ Offline จริง, รายชื่อ Component ต่อ Radius, แผนลดฟอนต์ |
| 4 | Glossary (TBD-19/29) อนุมัติ | ❌ รอ PO ตรวจ `06` |
| 5 | แผนทดสอบผู้ใช้จริงรายละเอียด (TBD-18) | ❌ ต้องจัดทำ (ใคร กี่คน ที่ไหน ข้อมูลอะไร ไม่ใช้ข้อมูลผู้ถวายจริง) |
| 6 | ภาพหน้าจอระบบจริงหลังล็อกอินเพื่อเทียบ Baseline (TBD-27) | ❌ รอ PO |
| 7 | ตรวจ Flow `NewOffering`/`EnvelopesTab`/`GivingStation` ก่อนเสนอ Review Step | ❌ ยังไม่ได้ตรวจเชิงลึก |
| 8 | สถานะ PR #156–#158 | ❓ ตรวจใหม่ก่อนเริ่มเฟส 3 |
| 9 | Baseline: `pnpm run ci` บนสาขาที่จะเริ่ม | ❌ ยังไม่ได้รัน (ตามข้อกำหนด) |
| 10 | Implementation Plan ของ Phase 1 | ❌ ยังไม่เริ่ม (รอ Blueprint อนุมัติ) |

**ผลประเมิน: NOT READY** เหตุผล: (1) Blueprint ยังไม่ได้รับอนุมัติ (2) TBD Phase 1 ที่ยังเปิด (3) ยังไม่มีแผนทดสอบผู้ใช้และภาพ Baseline หลังล็อกอิน (4) ยังไม่มี baseline CI

## 4. Usability Gate (TBD-20)

**เมื่อไรต้องใช้:** PR ที่เปลี่ยนสิ่งที่ผู้ใช้เห็นหรือวิธีใช้งานของหน้า (เลย์เอาต์, Label, ปุ่ม, สี, ขั้นตอน) PR ที่ไม่มีผลต่อสายตาหรือการใช้งาน (เทสต์, Token ที่ยังไม่ถูกเรียก) ใช้เกณฑ์ปกติ

**หลักฐานที่ต้องแนบทุก PR ที่เข้า Gate:**
1. ตาราง Preserve List (`02` §1) ติ๊กว่าของเดิมยังอยู่ พร้อมเหตุผลของสิ่งที่เปลี่ยน
2. ตาราง Acceptance Criteria ของหน้านั้น (`05`) พร้อมผล Verified/Assumption/Not Verified
3. ผล Contrast ของสถานะที่เกี่ยวข้อง (Default/Hover/Focus/Disabled/Error/Selected, Light/Dark) พร้อมวิธีวัด
4. ภาพก่อน/หลังที่ 1440/1024/768/390px และ Zoom 200%
5. ผล Keyboard (Tab ครบ, Focus เห็นชัด, Esc ปิด Dialog)
6. ผลทดสอบผู้ใช้จริง: งานที่มอบหมาย, จำนวนและ Role ผู้ทดสอบ, ไม่มีการสอน, จุดลังเล/กดผิด/ไม่เข้าใจ, ผล 7 ข้อ (YES/NO พร้อมหลักฐาน), การแก้ไขและทดสอบซ้ำ
7. สภาพแวดล้อมทดสอบ: DB ที่ไม่ใช่ Production, ไม่มีข้อมูลผู้ถวายจริง

**ผ่านเมื่อ:** 7 ข้อใน `05` เป็น YES ทุกข้อด้วยหลักฐาน; ไม่ผ่านเมื่อมี NO, NOT RUN หรือไม่มีหลักฐาน ห้ามเขียนว่า "ผ่าน" โดยไม่ได้ทดสอบจริง

**ที่ยังไม่กำหนด (ต้องทำใน TBD-18):** จำนวน/กลุ่มผู้ทดสอบ, ผู้รับผิดชอบนัดหมาย, เครื่องมือบันทึก, วิธีเตรียมข้อมูลโดยไม่ใช้ข้อมูลปลอมหรือข้อมูลจริง
