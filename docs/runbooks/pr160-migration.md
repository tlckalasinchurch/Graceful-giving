# Runbook: migration ของ PR #160 (`0005_giving_submissions`) บน production

สถานะ: **เตรียมไว้ ยังไม่ได้รัน** · ทุกขั้นที่แตะ production ต้องได้รับอนุมัติจาก PO แยกเป็นรายขั้น
รวมถึงคำสั่งอ่านอย่างเดียว

## สิ่งที่เปลี่ยน

สร้างตารางใหม่ `giving_submissions` (ว่าง) กับ unique index `giving_submissions_key_uniq`
บน `("churchId","submissionKey")` แล้วบันทึกลง `drizzle.__drizzle_migrations`

- ไม่แก้ตารางเดิม ไม่แก้แถวเดิม ไม่ลบอะไร
- ใช้ทำให้การบันทึกถวายจากจุดถวายโดยเจ้าหน้าที่ไม่ถูกบันทึกซ้ำเมื่อกดส่งใหม่
- โค้ด PR #160 ต้องการตารางนี้: ถ้า deploy ก่อนสร้างตาราง การบันทึกเข้าบัญชีจากจุดถวายจะล้มเหลวทุกครั้ง

| ค่า | |
|---|---|
| ไฟล์ | `drizzle/0005_giving_submissions.sql` |
| SHA-256 | `4fcfc9760736a455b0cadb9a9b2497faf2853c5113f72229a809b0329692d7a3` |
| journal `when` (= `created_at`) | `1795531702900` |
| migration ล่าสุดบน production ตอนนี้ | `0004_slip_split_items` (`1793516228188`) ตาม `drizzle/README.md` (2026-11-13) |

## ไฟล์

| ไฟล์ | เขียนข้อมูล? | ใช้เมื่อ |
|---|---|---|
| `docs/sql/pr160_giving_submissions_precheck.sql` | ไม่ | ก่อนรัน |
| `docs/sql/pr160_giving_submissions_apply.sql` | ใช่ (สร้างตาราง + บันทึก migration ในทรานแซกชันเดียว) | รัน migration |
| `docs/sql/pr160_giving_submissions_grant.sql` | ใช่ (สิทธิ์) | เฉพาะเมื่อ precheck ข้อ 5b บอกว่าต้องให้สิทธิ์เอง |
| `docs/sql/pr160_giving_submissions_postcheck.sql` | ไม่ | หลังรัน |
| `docs/sql/pr160_giving_submissions_rollback.sql` | ใช่ (ลบตาราง + ลบแถวบันทึก) | ย้อนกลับ |

## การซ้อมที่ทำแล้ว (2026-11-24)

ซ้อมทั้งชุดบน PGlite ในหน่วยความจำ ใช้ migration จริง `0000`–`0004` เป็นสถานะตั้งต้น
สองกรณี (มี / ไม่มี default privileges ให้ `app_user`) ผ่าน 25/25:

- precheck รันได้และไม่เขียนอะไร
- apply สร้างตารางที่โครงสร้างเท่ากับตารางที่ drizzle สร้างจากไฟล์จริงทุกคอลัมน์และ index
- หลัง apply การรัน migrate ของ deploy ไม่รัน 0005 ซ้ำ
- รัน apply ซ้ำครั้งที่สองถูกปฏิเสธและไม่บันทึกอะไรเพิ่ม
- grant ให้ `app_user` อ่าน เพิ่ม แก้ และใช้ sequence ได้
- rollback ลบตารางและแถวบันทึก ตารางเดิมยังอยู่ และหลัง rollback migrate สร้างใหม่ได้

**ซ้อมไม่ได้:** role, owner, default privileges และ Postgres version จริงของ Supabase
จึงต้องดูผล precheck ก่อนทุกครั้ง

## ขั้นตอน (ทำตามลำดับ หยุดทันทีถ้าผลไม่ตรง)

**0. อนุมัติ** PO อนุมัติแต่ละขั้นที่มีเครื่องหมาย 🔒 แยกกัน

**1. 🔒 ตรวจว่า deploy จะไม่รัน migration เอง** (Vercel → project `graceful-giving` →
Settings → Environment Variables, Production): ต้องยังมี `SKIP_DB_MIGRATE` และไม่มี
`DATABASE_URL_MIGRATE` ดูแค่ชื่อ ไม่ต้องเปิดค่า
ถ้าไม่ตรง หยุดและปรึกษาก่อน เพราะลำดับขั้นข้างล่างจะเปลี่ยน

**2. 🔒 ทำ backup เอง** — ตรวจแล้ว 2026-11-24: project อยู่ในแผน **free** ของ Supabase
ซึ่งไม่มี backup อัตโนมัติรายวันและไม่มี Point-in-Time Recovery จึงต้อง dump เองก่อนทุกครั้ง

1. ติดตั้ง PostgreSQL 17 command line tools (ต้องเป็นเวอร์ชัน 17 ขึ้นไป ตรงกับ server)
2. PO รันเองในหน้าต่าง PowerShell ของตัวเอง ไม่รันผ่านเซสชันของ AI:
   `powershell -ExecutionPolicy Bypass -File scripts\backup-db.ps1`
3. วาง connection string แบบ **Session pooler (port 5432)** ของ role `postgres` ตอนที่สคริปต์ถาม
   (ไม่แสดงบนจอ ไม่บันทึกลงไฟล์ ห้ามส่งในแชต)
4. สคริปต์ dump schema, data และ roles ไปที่ `%USERPROFILE%\GraceGivingBackups\<วันเวลา>`
   (ไม่ยอมเขียนในโฟลเดอร์ของ repo) แล้วตรวจว่าทุกไฟล์มีอยู่และไม่ว่าง มีตารางเงินหลักครบ
   และพิมพ์เฉพาะขนาด จำนวน และ SHA-256
5. ต้องได้ `RESULT: PASS` และต้องคัดลอกโฟลเดอร์ไปเก็บอีกที่หนึ่งนอกเครื่องนี้
   ไฟล์มีชื่อผู้ถวายและข้อมูลการเงิน
6. ส่งให้ผู้ช่วยเฉพาะบรรทัดผลลัพธ์ (PASS/FAIL, ขนาด, จำนวน, hash) ไม่ส่งเนื้อหาไฟล์

backup นี้ไม่รวมไฟล์รูปใน Supabase Storage (สลิปและใบเสร็จ) ฐานข้อมูลเก็บแค่ path
การเปลี่ยนนี้เพิ่มตารางใหม่อย่างเดียว rollback ใช้ไฟล์ rollback ได้โดยไม่ต้องกู้ backup
backup มีไว้กันกรณีรันผิดไฟล์และกันข้อมูลการเงินทั้งหมด

**3. 🔒 รัน precheck** (SQL editor ของ Supabase, role `postgres`):
`pr160_giving_submissions_precheck.sql` แล้วเทียบผลกับบรรทัด "Expect" ทุกข้อ
เก็บผลข้อ 5b ไว้ใช้ในขั้นที่ 5

**4. 🔒 รัน apply:** `pr160_giving_submissions_apply.sql` ทั้งไฟล์ในครั้งเดียว
ถ้าเกิด error ทั้งหมดจะถูกย้อนกลับเอง ไม่มีอะไรค้าง

**5. 🔒 ให้สิทธิ์ (ถ้าจำเป็น):** ถ้าข้อ 5b ไม่มีแถวที่ให้สิทธิ์ตารางและ sequence แก่ `app_user`
(หรือ role ที่ `app_user` เป็นสมาชิก) ให้รัน `pr160_giving_submissions_grant.sql`

**6. 🔒 รัน postcheck:** `pr160_giving_submissions_postcheck.sql` ทุกข้อต้องตรง
โดยเฉพาะข้อ 5 ต้องเป็น `true` ทั้งสี่ช่อง ถ้าไม่ใช่ ห้าม merge

**7. 🔒 merge PR #160** หลังขั้นที่ 6 ผ่าน และ Vercel check ของ PR ยังเป็นสีเขียว
แล้วรอ production deploy เสร็จ (build log ต้องมี `[migrate] Skipped`)

**8. ตรวจหลัง deploy (ไม่เขียนข้อมูล):** เปิดหน้าเว็บได้ ไม่มี error ใน Vercel runtime logs
ห้ามทดสอบโดยบันทึกถวายจริงบน production การทดสอบการบันทึกทำบนฐานข้อมูลทดสอบ
ตามแผน usability

## เมื่อเกิดปัญหา

- **apply error:** ไม่มีอะไรเปลี่ยน แก้สาเหตุแล้วรัน precheck ใหม่
- **postcheck ข้อ 5 ไม่ผ่าน:** ยังไม่ merge รัน grant แล้ว postcheck ใหม่
- **หลัง merge แล้วจุดถวายบันทึกไม่ได้:**
  1. 🔒 Vercel → Deployments → Instant Rollback ไป deploy ก่อน PR #160
  2. หาสาเหตุจาก runtime logs
  3. ถ้าจะลบตาราง ให้รัน `pr160_giving_submissions_rollback.sql` หลังขั้น 1 เท่านั้น
     (ดูเงื่อนไขในหัวไฟล์) ข้อมูลที่หายมีแค่ submission key รายการถวายยังอยู่ครบ

## ผลต่อ PR #158

PR #158 ใช้เลข `0005` เหมือนกัน (`0005_finance_balance_nonneg.sql`) และ `when` ของมันน้อยกว่า
`1795531702900` drizzle รันเฉพาะ migration ที่ `when` ใหม่กว่า `created_at` ล่าสุดในตารางบันทึก
ดังนั้นหลัง PR #160 ถูกบันทึกแล้ว **ถ้า merge PR #158 ตามที่เป็นอยู่ deploy จะข้าม migration
ของ PR #158 ไปเงียบ ๆ** ก่อน merge PR #158 ต้อง:

1. rebase บน `main` ใหม่
2. เปลี่ยนเป็น `0006` และสร้างไฟล์ใหม่ด้วย `drizzle-kit generate` ให้ได้ `when` ใหม่กว่า
3. คำนวณ hash และ `created_at` ใหม่ ก่อนรัน SQL ของ PR #158 ด้วยมือ
