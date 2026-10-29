# Graceful-giving (Grace-giving)

ระบบบริหารจัดการการเงินคริสตจักรและสื่อสารข่าวสารกิจกรรมสำหรับสมาชิก (Church Financial Ledger & Community Updates) พัฒนาขึ้นด้วยสถาปัตยกรรม Fullstack TypeScript ที่ปลอดภัย รวดเร็ว และรองรับการแสดงผลทั้งบนสมาร์ทโฟน แท็บเล็ต และเดสก์ท็อป

---

## 1. ภาพรวมสถาปัตยกรรม (System Architecture)

ระบบประกอบด้วย 2 ส่วนหลักที่เชื่อมโยงกันด้วย Type-Safe RPC:

- **Frontend (Client)**:
  - **Framework**: React 19 + Vite
  - **Styling**: Tailwind CSS v4 + tw-animate-css
  - **UI & Icons**: Radix UI Primitives, Lucide Icons, Sonner Toaster
  - **Routing**: Wouter (Client-side routing พร้อม fallback 404)
  - **State & Data Fetching**: TanStack React Query + tRPC Client
- **Backend (Server)**:
  - **Runtime & Server**: Node.js, Express, esbuild
  - **API Layer**: tRPC v11 (End-to-End Type Safety)
  - **Database & ORM**: PostgreSQL (Supabase) via Drizzle ORM (`drizzle-orm/postgres-js`)
  - **Authentication**: Supabase Auth (Google sign-in, invite-only)
  - **Testing**: Vitest + TypeScript Compiler (`tsc`)

---

## 2. ฟีเจอร์หลักของระบบ (Core Features)

### 2.1 หน้าหลักการเงิน (Grace-giving Dashboard)
- **สรุปยอดเงินและแนวโน้ม**: แสดงยอดเงินคงเหลือรวม การคำนวณรายรับ รายจ่าย และคงเหลือ พร้อมตัวชี้วัดทิศทางลูกศรที่ถูกต้องตามผลประกอบการ
- **ปุ่มดำเนินการด่วน (Quick Actions)**:
  - บันทึกการถวาย (สิบลด, ถวายทั่วไป, พันธกิจ, ถวายพิเศษ)
  - บันทึกรายจ่าย (ค่าอุปกรณ์นมัสการ, ค่าสาธารณูปโภค, พันธกิจ, การดูแลสมาชิก)
  - การเข้าถึงรายงานการเงิน กิจกรรม และข้อมูลสมาชิก
- **การนำทาง 4 แท็บ (Interactive Navigation)**:
  - `หน้าหลัก`: สรุปภาพรวมและแผนการใช้จ่ายงบประมาณ
  - `รายการ`: บันทึกรายการบัญชีแยกประเภท พร้อมตัวกรอง (ทั้งหมด / รายรับ / รายจ่าย)
  - `รายงาน`: สรุปสัดส่วนงบประมาณรายรับ-รายจ่ายตามพันธกิจ และการดาวน์โหลดรายงาน PDF จำลอง
  - `ฉัน`: แสดงโปรไฟล์ผู้ใช้ สิทธิ์บทบาท (Admin/Member) ข้อมูลคริสตจักร และปุ่มเข้าสู่ระบบ/ออกจากระบบ

### 2.2 ข่าวสารและกิจกรรมสำหรับสมาชิก (Member Feed)
- **การอ่านข่าวสารฉบับเต็ม**: สมาชิกสามารถคลิกการ์ดข่าวสารเพื่อเปิดหน้าต่างอ่านเนื้อหาฉบับเต็ม (`body`) จัดรูปแบบย่อหน้าอย่างสวยงาม
- **รายละเอียดกิจกรรมและการลงทะเบียน**: แสดงวัน-เวลาเริ่มต้นและสิ้นสุด สถานที่จัดงาน พร้อมปุ่มเปิดลิงก์ลงทะเบียนภายนอกแบบปลอดภัย (`registrationUrl`)

### 2.3 ระบบจัดการเนื้อหาสำหรับผู้ดูแลระบบ (Admin Content Manager)
- **การสร้างและแก้ไข**: ฟอร์มเพิ่ม/แก้ไขข่าวสารและกิจกรรม พร้อมการตรวจสอบความถูกต้องของวันเวลา (`endsAt` ต้องไม่มาก่อน `startsAt`)
- **การจัดการสถานะ**: เปลี่ยนสถานะเนื้อหาแบบเรียลไทม์ (ฉบับร่าง `draft`, เผยแพร่ `published`, เก็บถาวร `archived`, ยกเลิก `cancelled`)
- **การลบเนื้อหา (Deletion)**: เพิ่มฟังก์ชันลบข่าวสารและกิจกรรม พร้อมหน้าต่าง Modal ยืนยันความปลอดภัย ป้องกันการลบข้อมูลโดยไม่ตั้งใจ
- **ระบบค้นหาและตัวกรอง**: ค้นหาข่าวสารและกิจกรรมตามคำค้นหาได้อย่างรวดเร็ว

---

## 3. รายละเอียด API Endpoints (tRPC Procedures)

### 3.1 กลุ่มระบบยืนยันตัวตน (`auth`)
| Procedure | Type | สิทธิ์การเข้าถึง | คำอธิบาย |
| :--- | :--- | :--- | :--- |
| `auth.me` | Query | สาธารณะ | ตรวจสอบข้อมูลผู้ใช้และสถานะการเข้าสู่ระบบปัจจุบัน |
| `auth.logout` | Mutation | สาธารณะ | เคลียร์ Session Cookie และออกจากระบบอย่างสมบูรณ์ |

### 3.2 กลุ่มข่าวสารและกิจกรรม (`updates`)
| Procedure | Type | สิทธิ์การเข้าถึง | คำอธิบาย |
| :--- | :--- | :--- | :--- |
| `updates.feed` | Query | ผู้ใช้ที่ล็อกอิน | ดึงรายการข่าวสารและกิจกรรมที่เผยแพร่แล้ว (`published`) |
| `updates.adminList` | Query | ผู้ดูแลระบบ (`admin`) | ดึงรายการข่าวสารและกิจกรรมทั้งหมดทุกสถานะ |
| `updates.createNews` | Mutation | ผู้ดูแลระบบ (`admin`) | สร้างข่าวสารใหม่ (ตรวจสอบ min/max length ของ title/summary/body) |
| `updates.updateNews` | Mutation | ผู้ดูแลระบบ (`admin`) | อัปเดตข้อมูลข่าวสารตาม ID |
| `updates.setNewsStatus` | Mutation | ผู้ดูแลระบบ (`admin`) | อัปเดตสถานะของข่าวสาร |
| `updates.deleteNews` | Mutation | ผู้ดูแลระบบ (`admin`) | ลบข่าวสารออกจากฐานข้อมูลอย่างถาวร |
| `updates.createEvent` | Mutation | ผู้ดูแลระบบ (`admin`) | สร้างกิจกรรมใหม่ พร้อมกำหนดเวลาและลิงก์ลงทะเบียน |
| `updates.updateEvent` | Mutation | ผู้ดูแลระบบ (`admin`) | อัปเดตข้อมูลกิจกรรมตาม ID |
| `updates.setEventStatus` | Mutation | ผู้ดูแลระบบ (`admin`) | อัปเดตสถานะของกิจกรรม |
| `updates.deleteEvent` | Mutation | ผู้ดูแลระบบ (`admin`) | ลบกิจกรรมออกจากฐานข้อมูลอย่างถาวร |

---

## 4. โครงสร้างฐานข้อมูล (Database Schema)

ตารางหลักใน `drizzle/schema.ts`:

1. **`users`**:
   - `id`, `openId` (Unique), `name`, `email`, `loginMethod`, `role` (`user` หรือ `admin`), `createdAt`, `updatedAt`, `lastSignedIn`
2. **`church_news`**:
   - `id`, `churchId`, `authorId`, `title`, `summary`, `body`, `category` (`announcement`, `ministry`, `finance`, `pastoral`), `status` (`draft`, `published`, `archived`), `publishedAt`, `createdAt`, `updatedAt`
3. **`church_events`**:
   - `id`, `churchId`, `authorId`, `title`, `summary`, `description`, `startsAt`, `endsAt`, `location`, `registrationUrl`, `status` (`draft`, `published`, `cancelled`), `createdAt`, `updatedAt`

---

## 5. คำสั่งสำหรับการพัฒนาและทดสอบ (Development Scripts)

### การติดตั้ง Dependencies
```bash
pnpm install
```

### การรันโปรเจกต์ในโหมดพัฒนา
```bash
pnpm dev
```

### การตรวจสอบความถูกต้องของ TypeScript Types
```bash
pnpm check
```

### การรันชุดการทดสอบอัตโนมัติ (Automated Tests)
```bash
pnpm test
```

### การสร้างแพ็กเกจสำหรับการปรับใช้จริง (Production Build)
```bash
pnpm build
```

### การเริ่มต้นรันในโหมด Production
```bash
pnpm start
```

---

## 6. สรุปประวัติการแก้ไขและปรับปรุง (Changelog)

- **Bug Fix**: แก้ไขข้อผิดพลาดการแสดงผลลูกศรทิศทางสถิติในหน้าหลัก (`Home.tsx`) โดยแสดงสัญลักษณ์ `↓` อย่างถูกต้องเมื่อข้อมูลลดลง
- **Feature Completed**: เพิ่มหน้าต่างดูรายละเอียดเนื้อหาฉบับเต็มของข่าวสารและกิจกรรมในฝั่งสมาชิก (`MemberFeed`)
- **Feature Completed**: เพิ่มฟังก์ชันลบข่าวสารและกิจกรรม (`deleteNews`, `deleteEvent`) ในฝั่ง Backend และ Admin UI พร้อม Modal ยืนยัน
- **UX Improved**: เพิ่มการแสดงผลแท็บนำทาง "รายการ", "รายงาน" และ "ฉัน" พร้อมฟอร์มจำลองการบันทึกถวายและรายจ่าย
- **Test Coverage**: เพิ่ม Unit Tests ครอบคลุมสิทธิ์การลบเนื้อหา (`server/updates.access.test.ts`) ผ่านการทดสอบทั้งหมด 8/8 การทดสอบ
