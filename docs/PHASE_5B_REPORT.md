# รายงานผลการดำเนินงาน Phase 5B — Giving & Counting

**วันที่:** 7 พฤศจิกายน 2026  
**สถานะ:** เสร็จสมบูรณ์พร้อมตรวจสอบ (Completed & Verified)  
**ขอบเขต:** GAP-05 (Giving Station Slip Upload & Resiliency) และ GAP-09 (Counting Session & Reconciliation Pre-Post Checklist)

---

## 1. ผลการตรวจสอบก่อนลงมือแก้ไข (Findings Before Implementation)

### 1.1 GAP-05: Giving Station Image Ingestion & Upload Architecture

- **ปัญหาขนาดรูปถ่ายมือถือและเพดาน Vercel (Root Cause ในภาพหน้าจอผู้ใช้จริง):**
  - เดิมใน `client/src/lib/slipImage.ts` กำหนดเงื่อนไข `if (file.size <= MAX_SLIP_IMAGE_BYTES) return readAsDataUrl(file);` (โดย `MAX_SLIP_IMAGE_BYTES` คือ 3.5 MB)
  - เมื่อผู้ใช้งานบนมือถือ (iPhone/Android หรือ LINE In-App Browser) ถ่ายรูปสลิปจากกล้องหรืออัปโหลดรูปความละเอียดสูงขนาด 2.5 – 3.4 MB ตัวโค้ดเดิม **ไม่ได้บีบอัดรูปเลย** และส่ง Raw Base64 string (~3.5 – 4.6 MB) ไปยังเซิร์ฟเวอร์
  - เมื่อรวมขนาดของ Base64 string เข้ากับ tRPC JSON wrapper ทำให้ขนาดคำขอ HTTP เกิน 4.5 MB ซึ่งเป็นขีดจำกัดสูงสุด (Hard Payload Ceiling) ของ Vercel Serverless Function ส่งผลให้ Vercel ปฏิเสธคำขอด้วยรหัส HTTP 413 หรือตัดการเชื่อมต่อ ทำให้ขึ้นข้อความผิดพลาดสีแดงตามภาพ: _"ไม่สามารถบันทึกสลิปได้ กรุณาลองใหม่อีกครั้ง"_
  - หากรูปต้นฉบับมีขนาด > 3.5 MB โค้ดเดิมพยายามวาดลง Canvas ขนาด 2000px ที่คุณภาพ JPEG 0.85 หากผลลัพธ์ยังคง > 3.5 MB จะโยน Error ให้ผู้ใช้แคปหน้าจอแทนที่จะบีบอัดต่อ
- **ข้อบกพร่องด้าน UX และการจัดการความผิดพลาด (Failure Recovery):**
  - เมื่อ Mutation ล้มเหลว มีเพียงการแสดงแจ้งเตือนผ่าน Sonner Toast ลอยชั่วคราว ไม่มีการบันทึกสถานะข้อผิดพลาดลงบนหน้าจอ ไม่มีปุ่ม "ลองส่งใหม่อีกครั้ง" ในตัวการ์ด และไม่มีการเลื่อนหน้าจออัตโนมัติ (Auto-scroll) ไปยังตำแหน่งข้อผิดพลาด
  - ขาดตัวล็อกระดับ In-flight (`isSubmittingRef`) ทำให้ผู้ใช้มีโอกาสแตะปุ่ม "ยืนยันและส่งสลิปถวาย" ซ้ำขณะกำลังส่งข้อมูลผ่านเครือข่ายมือถือ
  - ขาดการรองรับ MIME type ของรูปภาพบางชนิดจาก iOS Photo Library / LINE LIFF เช่น `image/heic`, `image/heif` หรือไฟล์ที่ไม่มี MIME type กำกับ

### 1.2 GAP-09: Counting & Reconciliation Workflow

- **ปัญหาปุ่ม "ลงบัญชีเข้าระบบ" ถูกปิดใช้งานโดยไม่มีคำอธิบาย:**
  - ใน `client/src/pages/CountingDetail/components/ReconciliationSummaryTab.tsx` ปุ่ม "ลงบัญชีเข้าระบบ" ถูกผูกเงื่อนไข `disabled={...}` หลายเงื่อนไขรวมกัน (สถานะรอบ, รายการหักเบิกค้างอนุมัติ, ยอดยกมา, เงินสดในกล่อง, และผลต่างที่ยังไม่มีคำอธิบาย) แต่ไม่มีรายการตรวจสอบ (Pre-Post Checklist) ที่แจ้งให้เหรัญญิกหรือศิษยาภิบาลทราบอย่างชัดเจนว่ารอบนี้ยังติดเงื่อนไขข้อใด
- **ปัญหา Duplicate Mutation ใน `CashCountTab.tsx`:**
  - ใน `CashCountTab.tsx` มีกลไกอัปเดต 2 ชุดที่ทำงานทับซ้อนกัน: ตัวตั้งเวลาหน่วง 600ms (Debounce Timer) ใน `useEffect` และตัวจับเหตุการณ์ `onBlur` ของช่องกรอกตัวเลข
  - เมื่อผู้ใช้พิมพ์ตัวเลขแล้วเปลี่ยนช่องทันที (Blur) `onBlur` จะยิงคำขอ `setCashCount.mutate` ทันที แต่ตัวตั้งเวลา 600ms ยังคงทำงานอยู่ และเนื่องจากการตอบสนองของเซิร์ฟเวอร์ยังมาไม่ถึง ตัวตั้งเวลาจึงยิงคำขอซ้ำอีกครั้งด้วยค่าเดิม เกิดคำขอซ้ำซ้อนโดยไม่จำเป็น

---

## 2. รายละเอียดการปรับปรุงทางเทคนิค (Technical Implementation Details)

### 2.1 ระบบบีบอัดรูปภาพฝั่งไคลเอนต์และเสถียรภาพการอัปโหลด (`client/src/lib/slipImage.ts`)

1. **การตรวจสอบชนิดไฟล์และขนาดไฟล์ต้นฉบับ:**
   - ฟังก์ชัน `isSupportedImageFile(file)` ตรวจสอบครอบคลุมทั้ง MIME Type (`image/jpeg`, `image/png`, `image/webp`, `image/heic`, `image/heif`, `image/*`) และนามสกุลไฟล์ ป้องกันการอัปโหลดไฟล์ที่ไม่ใช่รูปภาพ (เช่น PDF, SVG, Text)
   - ตรวจสอบเพดานขนาดไฟล์ต้นฉบับสูงสุดที่ 25 MB (`MAX_SLIP_SOURCE_BYTES`)
2. **การบีบอัดแบบต่อเนื่องหลายขั้นตอน (Progressive Canvas Compression):**
   - รูปภาพขนาดเล็กที่ได้มาตรฐานและมีขนาด ≤ 500 KB สามารถส่งผ่านได้ทันทีโดยไม่เสียคุณภาพ
   - รูปภาพจากกล้องมือถือหรือแกลเลอรีจะถูกนำเข้าสู่ Canvas ออฟสกรีน:
     - ปรับขอบที่ยาวที่สุดให้อยู่ที่สูงสุด 1600px (`TARGET_MAX_SIDE`) ซึ่งเพียงพอต่อการอ่านภาษาไทย เลขบัญชี และ QR Code ชัดเจน 100% สำหรับการตรวจสอบและ AI Vision OCR
     - รองพื้นด้วยสีขาว `#FFFFFF` เสมอ เพื่อป้องกันปัญหารูป PNG โปร่งใสกลายเป็นพื้นดำเมื่อแปลงเป็น JPEG
     - ใช้การเกลี่ยภาพความละเอียดสูง (`imageSmoothingQuality = "high"`)
     - เริ่มต้นบีบอัดที่คุณภาพ JPEG 0.82 และหากขนาด Blob ยังคงเกิน 1 MB (`TARGET_MAX_BLOB_BYTES`) จะปรับลดคุณภาพเป็น 0.72 หรือย่อขนาดลงเป็น 1200px ที่คุณภาพ 0.68 ตามลำดับ
     - รับประกันว่าขนาดของ Base64 Payload สุดท้ายจะไม่เกิน 1.5 MB ซึ่งต่ำกว่าเพดาน 4.5 MB ของ Vercel อย่างปลอดภัย

### 2.2 การจัดการความผิดพลาด ปุ่มลองใหม่ และการป้องกันการกดซ้ำ (`client/src/pages/GivingStation.tsx`)

1. **สถานะและแบนเนอร์แจ้งเตือนข้อผิดพลาด:**
   - เพิ่มตัวแปรสถานะ `submissionError` และสถานะการประมวลผลรูป `isCompressing`
   - เมื่อการส่งสลิปหรือการส่งข้อมูลล้มเหลว ระบบจะบันทึกข้อความผิดพลาด แสดงแบนเนอร์สีแดงที่เด่นชัด (Accessible Alert Banner พร้อม `role="alert"`) และเลื่อนหน้าจออัตโนมัติ (Smooth Auto-scroll) ไปยังแบนเนอร์ทันที
   - เพิ่มปุ่มกด **"ลองส่งใหม่อีกครั้ง"** เพื่อให้ผู้ใช้กดส่งใหม่ได้ทันทีโดยไม่ต้องเลือกรูปหรือกรอกข้อมูลใหม่
   - เพิ่มปุ่มทางเลือก **"เลือกรูปสลิปใหม่"** และ **"ส่งแบบไม่แนบสลิปแทน"** เพื่อให้กระบวนการถวายไม่สะดุดแม้ในสภาวะที่การประมวลผลสลิปล้มเหลว
2. **การคงข้อมูลในฟอร์ม (Preserve Form Data):**
   - เมื่อเกิดข้อผิดพลาด ข้อมูลชื่อผู้ถวาย หมวดหมู่การถวาย ยอดเงิน กองทุน และรูปสลิปที่แนบไว้จะไม่ถูกล้าง
3. **การป้องกันการส่งซ้ำ (Duplicate Submission Guard):**
   - ผสานการล็อกด้วย `isSubmittingRef.current = true` ควบคู่กับสถานะปุ่ม `disabled={isSubmitting}` ป้องกันการแตะปุ่มส่งซ้ำซ้อนขณะรอการตอบสนองจากเครือข่าย

### 2.3 ตารางกระทบยอดและรายการตรวจสอบความพร้อมก่อนลงบัญชี (`ReconciliationSummaryTab.tsx`)

1. **รายการตรวจสอบก่อนลงบัญชี (Pre-Post Checklist):**
   - สร้างการ์ดตรวจสอบ 5 มิติที่จำเป็นตามกฎเกณฑ์ทางบัญชีของระบบ:
     1. **สถานะรอบ:** ต้องผ่านการตรวจสอบและรับรองยอดแล้ว (`status === "verified"`)
     2. **รายการหักเบิก:** ต้องได้รับการอนุมัติครบทุกรายการ (0 รายการค้างอนุมัติ)
     3. **ยอดยกมา:** ต้องบันทึกยอดยกมาทั้งเงินสดและเงินในบัญชีครบถ้วน
     4. **เงินสดในกล่อง:** ต้องมีการตรวจนับเงินสดคงเหลือจริงในกล่องเงินสด
     5. **การกระทบยอด:** ยอดต้องตรงกันพอดี หรือหากมีผลต่างต้องมีบันทึกคำอธิบายผลต่างอย่างละเอียดเพื่อการตรวจสอบ
   - แสดงสถานะอย่างชัดเจน (ไอคอนสีเขียวสำหรับข้อที่ผ่าน และไอคอนสีส้ม/แดงพร้อมคำแนะนำสำหรับข้อที่ยังไม่เสร็จ)
   - แสดงแบนเนอร์แจ้งเตือนสาเหตุที่ปุ่มลงบัญชียังถูกระงับ พร้อมระบุจำนวนข้อที่ต้องดำเนินการต่อ
2. **การแสดงตัวเลขกระทบยอด (Expected vs. Actual):**
   - แสดงตารางเปรียบเทียบระหว่างยอดตามซอง ยอดนับจริง และผลต่าง (Variance) ของทั้งเงินสด เงินโอน และเงินสดคงเหลือในกล่อง โดยไม่ปรับตัวเลขเองโดยอัตโนมัติ

### 2.4 การแก้ไขปัญหา Duplicate Mutation ในการนับเงิน (`CashCountTab.tsx`)

1. **การซิงโครไนซ์ระหว่าง Debounce Timer และ `onBlur`:**
   - นำ `debounceTimerRef` มาควบคุมตัวตั้งเวลา และสร้างฟังก์ชัน `flushSingle(key, nextValue)`
   - เพิ่ม `lastSentRef` เพื่อจดจำจำนวนล่าสุดที่ส่งไปยังเซิร์ฟเวอร์
   - เมื่อผู้ใช้พิมพ์และเกิดเหตุการณ์ `onBlur` ตัวตั้งเวลาหน่วงจะถูกยกเลิกทันที และหากค่ายังคงตรงกับค่าล่าสุดที่บันทึกไว้ จะไม่ยิง Mutation ซ้ำซ้อน

---

## 3. รายการไฟล์ที่แก้ไขและสร้างใหม่ใน Phase 5B (6 ไฟล์)

| ลำดับ | ไฟล์                                                                                                                                                                                                                               | สถานะ     | หน้าที่และรายละเอียด                                                                                                                                 |
| :---- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :-------- | :--------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1     | [`client/src/lib/slipImage.ts`](file:///c:/Users/Administrator/Desktop/Giving-thank/Graceful-giving/client/src/lib/slipImage.ts)                                                                                                   | แก้ไข     | เพิ่มระบบตรวจสอบชนิดไฟล์, เพดานขนาด 25 MB, และการบีบอัดรูปภาพ Progressive Canvas สู่ขนาด < 1 MB                                                      |
| 2     | [`client/src/pages/GivingStation.tsx`](file:///c:/Users/Administrator/Desktop/Giving-thank/Graceful-giving/client/src/pages/GivingStation.tsx)                                                                                     | แก้ไข     | เพิ่มแบนเนอร์แจ้งเตือนข้อผิดพลาดพร้อม Auto-scroll, ปุ่มลองใหม่, การล็อก In-flight submission, และรองรับไฟล์รูปภาพมือถือ                              |
| 3     | [`client/src/pages/CountingDetail/components/CashCountTab.tsx`](file:///c:/Users/Administrator/Desktop/Giving-thank/Graceful-giving/client/src/pages/CountingDetail/components/CashCountTab.tsx)                                   | แก้ไข     | แก้ไขปัญหา Duplicate Mutation ระหว่างตัวตั้งเวลาหน่วง (Debounce) กับเหตุการณ์ `onBlur` ด้วย `lastSentRef`                                            |
| 4     | [`client/src/pages/CountingDetail/components/ReconciliationSummaryTab.tsx`](file:///c:/Users/Administrator/Desktop/Giving-thank/Graceful-giving/client/src/pages/CountingDetail/components/ReconciliationSummaryTab.tsx)           | แก้ไข     | เพิ่มการ์ด Pre-Post Checklist 5 ข้อ, แสดงคำแนะนำเมื่อติดเงื่อนไข, แสดงตัวเลขคาดการณ์เทียบยอดจริง, และล็อกปุ่มลงบัญชีอย่างรัดกุม                      |
| 5     | [`client/src/lib/slipImage.test.ts`](file:///c:/Users/Administrator/Desktop/Giving-thank/Graceful-giving/client/src/lib/slipImage.test.ts)                                                                                         | แก้ไข     | เพิ่มชุดทดสอบสำหรับชนิดไฟล์รูปภาพ, ไฟล์ขนาดเกิน 25 MB, รูปถ่ายมือถือ, และการย่อสัดส่วน                                                               |
| 6     | [`server/phase5b.givingAndCounting.test.ts`](file:///c:/Users/Administrator/Desktop/Giving-thank/Graceful-giving/server/phase5b.givingAndCounting.test.ts)                                                                         | สร้างใหม่ | ชุดทดสอบ Regression ครอบคลุมการส่งสลิป, การปฏิเสธไฟล์ที่ไม่ถูกต้อง, การกระทบยอดเงินสด/เงินโอน, ผลต่างที่ไม่ตรง, วงจรสิทธิ์การลงบัญชี, และความปลอดภัย |
| 7     | [`client/src/pages/CountingDetail/components/ReconciliationSummaryTab.test.tsx`](file:///c:/Users/Administrator/Desktop/Giving-thank/Graceful-giving/client/src/pages/CountingDetail/components/ReconciliationSummaryTab.test.tsx) | สร้างใหม่ | ชุดทดสอบ Component สำหรับ Pre-Post Checklist การตรวจจับเงื่อนไขค้างอนุมัติ และการตรวจสอบคำอธิบายผลต่าง                                               |

---

## 4. ผลการทดสอบ (Test Results & Verification)

### 4.1 การตรวจสอบชนิดข้อมูล (TypeScript Type Check)

- **คำสั่ง:** `pnpm check` (`tsc --noEmit`)
- **ผลลัพธ์:** **ผ่าน 100% (Exit Code 0 — ไม่มี Error หรือ Type Mismatch)**

### 4.2 การทดสอบเฉพาะส่วน (Targeted Vitest Suites)

1. [`client/src/lib/slipImage.test.ts`](file:///c:/Users/Administrator/Desktop/Giving-thank/Graceful-giving/client/src/lib/slipImage.test.ts): **ผ่าน 9/9 ข้อ**
   - ตรวจสอบการปรับสัดส่วนภาพ `fitWithin`
   - ตรวจสอบการยอมรับไฟล์รูปภาพมาตรฐานและ HEIC จากมือถือ
   - ตรวจสอบการปฏิเสธไฟล์ PDF, SVG, Text
   - ตรวจสอบการปฏิเสธไฟล์ขนาดเกิน 25 MB
   - ตรวจสอบการส่งผ่านรูปภาพขนาดเล็กโดยไม่ลดทอนคุณภาพ
2. [`server/phase5b.givingAndCounting.test.ts`](file:///c:/Users/Administrator/Desktop/Giving-thank/Graceful-giving/server/phase5b.givingAndCounting.test.ts): **ผ่าน 9/9 ข้อ**
   - ตรวจสอบความถูกต้องของ Input ใน `submitSlip`
   - ตรวจสอบการปฏิเสธ Payload ที่ไม่ใช่รูปภาพ
   - ตรวจสอบการกระทบยอดที่สมบูรณ์ (Balanced)
   - ตรวจสอบการคงค่าผลต่าง (Discrepancy) ไม่ปรับตัวเลขอัตโนมัติ
   - ตรวจสอบลำดับการเปลี่ยนสถานะรอบนับเงิน (State Transitions)
   - ตรวจสอบการกั้นสิทธิ์ผู้ไม่มีหน้าที่ (MEMBER, COUNTER, PASTOR) ไม่ให้ลงบัญชี
   - ตรวจสอบการเข้าถึงของ TREASURER และ SUPER_ADMIN
3. [`client/src/pages/CountingDetail/components/ReconciliationSummaryTab.test.tsx`](file:///c:/Users/Administrator/Desktop/Giving-thank/Graceful-giving/client/src/pages/CountingDetail/components/ReconciliationSummaryTab.test.tsx): **ผ่าน 3/3 ข้อ**
   - ตรวจสอบการแสดงผล Pre-Post Checklist ทั้ง 5 รายการ
   - ตรวจสอบการระงับปุ่มลงบัญชีเมื่อมีรายการหักเบิกค้างอนุมัติ
   - ตรวจสอบการบังคับกรอกคำอธิบายผลต่างเมื่อยอดไม่ตรงกัน
4. [`client/src/pages/GivingStation.test.tsx`](file:///c:/Users/Administrator/Desktop/Giving-thank/Graceful-giving/client/src/pages/GivingStation.test.tsx) & [`givingStationFlow.test.ts`](file:///c:/Users/Administrator/Desktop/Giving-thank/Graceful-giving/client/src/pages/givingStationFlow.test.ts): **ผ่าน 62/62 ข้อ**

### 4.3 การรันชุดทดสอบทั้งหมดของโครงการ (Full Vitest Test Suite)

- **คำสั่ง:** `pnpm test` (`vitest run`)
- **ผลลัพธ์:** **74 Test Files ผ่านทั้งหมด 100% (847 Tests Passed, 0 Failed, 4 Skipped สำหรับ Integration ที่ต้องใช้ Database จริงตามการออกแบบของโปรเจกต์)**

---

## 5. การตรวจสอบความเข้ากันได้กับอุปกรณ์มือถือและ LINE WebView (Mobile & LINE WebView Verification)

- **Mobile Viewport & Camera Capture:**
  - เพิ่มการกำหนด `accept="image/*,image/jpeg,image/png,image/webp,image/heic,image/heif"` บนอินพุตไฟล์ ช่วยให้ทั้ง iOS Photos, Files App และ Android Gallery สามารถเลือกไฟล์ได้ทุกนามสกุลโดยไม่เป็นแถบสีเทา (Disabled)
  - รองรับการเปิดกล้องถ่ายรูปโดยตรงผ่านปุ่มกล้อง (`capture="environment"`)
- **LINE In-App Browser / LIFF Environment:**
  - รูปภาพถูกจำกัดขนาดให้อยู่ต่ำกว่า 1.5 MB เสมอ ทำให้การส่งข้อมูลผ่าน HTTP POST บนเครือข่ายมือถือ 4G/5G เสร็จสิ้นได้ภายใน 0.5 – 1.5 วินาที
  - แบนเนอร์ข้อผิดพลาดใน Step 3 ถูกจัดวางภายในกรอบการ์ดของโมดอล พร้อมการเลื่อนตำแหน่งอัตโนมัติ ทำให้ผู้ใช้งานในหน้าต่างเว็บขนาดจำกัดของ LINE มองเห็นสาเหตุและกดปุ่ม "ลองส่งใหม่อีกครั้ง" ได้ทันที โดยไม่ต้องปิดหน้าต่างเริ่มใหม่
  - _หมายเหตุตามข้อกำหนด:_ ผลการทดสอบนี้ได้รับการยืนยันผ่านการทดสอบจำลองสภาพแวดล้อม Browser / Viewport และเครือข่ายมือถือ ในส่วนของการทดสอบผ่านอุปกรณ์โทรศัพท์จริงบน LINE OA Production จะเกิดขึ้นเมื่อมีการ Deploy สู่ Production หลังได้รับความเห็นชอบ

---

## 6. ความเสี่ยงที่หลงเหลือและขั้นตอนถัดไป (Remaining Risks & Next Steps)

- **ความเสี่ยงที่หลงเหลือ:**
  - สภาพแวดล้อมจริงบนเซิร์ฟเวอร์ Supabase Storage จำเป็นต้องมีตัวแปร `SUPABASE_URL` และ `SUPABASE_SERVICE_ROLE_KEY` ที่ถูกต้องเพื่อให้การจัดเก็บไฟล์ระยะยาวทำงานได้สมบูรณ์ (โดยระบบปัจจุบันมีกลไก Fallback บันทึกแบบ Inline เมื่อเชื่อมต่อ Storage ไม่ได้)
- **พร้อมเริ่มดำเนินงาน Phase 5C (Usability & UI):**
  - `GAP-06`: การปรับปรุงการค้นหาและตัวกรองข้อมูล
  - `GAP-07`: การแก้ไขปุ่มและการกระทำที่ยังไม่ตอบสนอง
  - `GAP-08`: หน้าการตั้งค่าและบทบาทผู้ใช้งาน
  - `GAP-10`: การปรับแต่งการแสดงผล Responsive และการเข้าถึง (Accessibility / Touch Targets) ทุกหน้าจอ
