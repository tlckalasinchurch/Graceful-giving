# Graceful Giving — UX Findings Catalog

> **เอกสารรวมรายการข้อบกพร่องและผลการตรวจสอบ UX เชิงลึก (Findings Catalog)**  
> **ระบบ:** Graceful Giving  
> **การจัดระดับความสำคัญ (Severity Levels):**  
> - **P0 (Critical):** ปัญหาที่เป็นอุปสรรคขัดขวางการทำงานโดยสิ้นเชิง มีความเสี่ยงต่อข้อมูล/การเงิน หรือละเมิดมาตรฐาน WCAG ระดับรุนแรง  
> - **P1 (Major):** ปัญหาที่ทำให้ผู้ใช้หลงทาง สับสน มีโอกาสกดผิดสูง หรือทำภารกิจสำคัญไม่สำเร็จ  
> - **P2 (Moderate):** ปัญหาที่เพิ่มภาระการคิด (Cognitive Load) หรือมีความฝืดในการใช้งาน (Friction)  
> - **P3 (Minor / Polish):** รายละเอียดด้านความสม่ำเสมอ ความประณีต และความสมบูรณ์ของโค้ด  

---

## สรุปภาพรวมจำนวนปัญหาที่ตรวจพบ (Findings Summary)

| ระดับความรุนแรง (Severity) | จำนวนปัญหา (Count) | ผลกระทบหลัก (Primary Impact) |
| :--- | :---: | :--- |
| **P0 (Critical)** | **3 รายการ** | Contrast สอบตกอย่างรุนแรงบนปุ่มหลัก, การอัปโหลดไฟล์เข้าถึงด้วยคีย์บอร์ดไม่ได้, โมดอลไม่มี Focus Trap |
| **P1 (Major)** | **6 รายการ** | ตัวนับเวลากดดันผู้ถวาย, ขาดปุ่มบันทึกซองต่อเนื่อง, ศัพท์เทคนิค Vercel/Env, รายการสลิปใช้ Div ไม่มีคีย์บอร์ด, ขาด Stepper นำทาง 5 ขั้นตอนนับเงิน, Layout มือถือซ้อนทับยาว |
| **P2 (Moderate)** | **6 รายการ** | กองทุนเริ่มต้นเป็นค่าว่าง, ฟอร์มขาด Label For/ID, ปุ่มขั้นตอนเล็กกว่า 24px, ขาด Pre-submit ยอดเงินสูง, กราฟรายงานแตะดูไม่ได้บนมือถือ, ขาดปุ่มรีเฟรชสถานะ |
| **P3 (Minor / Polish)** | **4 รายการ** | ตารางรายงานขาด Table Scope, Dialog ขาด DialogTitle, แดชบอร์ดของผู้นับเงินว่างเปล่า, แถบปุ่มล่างบังอินพุตบนมือถือ |
| **รวมทั้งสิ้น** | **19 รายการ** | ครอบคลุมทั้ง 3 เสาหลัก: Cognitive Load, Visual Hierarchy, WCAG 2.2 AA |

---

## หมวดที่ 1: รายการปัญหาเร่งด่วนระดับ P0 (Critical Blockers)

### FINDING-P0-01: Contrast ต่ำกว่าเกณฑ์มาตรฐานอย่างรุนแรงบนปุ่มเข้าสู่ระบบ LINE (LINE Login Button Contrast Failure)
- **Priority:** `P0`
- **โมดูล / หน้าจอ:** หน้าเข้าสู่ระบบหลัก (`client/src/pages/Login.tsx`) และหน้าถวายทรัพย์สาธารณะ (`client/src/pages/Give.tsx`)
- **หลักฐานในโค้ด (Evidence):**
  - [Login.tsx:151-155](file:///c:/Users/Administrator/Desktop/Giving-thank/Graceful-giving/client/src/pages/Login.tsx#L151-L155):
    ```tsx
    <a
      href="/api/auth/line/login"
      className="alpha-press flex min-h-14 w-full items-center justify-center rounded-[14px] border-2 border-[var(--ink)] bg-[var(--line-brand)] px-5 text-base font-extrabold text-[var(--ink)] shadow-[4px_4px_0_var(--ink)]"
    >
      เข้าสู่ระบบด้วย LINE
    </a>
    ```
  - [Give.tsx:163-167](file:///c:/Users/Administrator/Desktop/Giving-thank/Graceful-giving/client/src/pages/Give.tsx#L163-L167):
    ```tsx
    <a
      href={GIVE_LOGIN_URL}
      className="alpha-press flex min-h-14 w-full items-center justify-center rounded-2xl border-2 border-[var(--ink)] bg-line-brand px-6 text-base font-extrabold text-[var(--ink)] shadow-[4px_4px_0_var(--ink)]"
    >
      เข้าสู่ระบบด้วย LINE
    </a>
    ```
- **คำอธิบายปัญหา:** ตัวแปร `--line-brand` มีค่าสีเขียว LINE `#06C755` ในขณะที่ตัวแปร `--ink` ใน Dark Mode มีค่าสีขาวครีม `#FFF7ED` การแสดงตัวอักษรสีขาวครีมบนพื้นหลังสีเขียวสว่างให้ค่าอัตราส่วนคอนทราสต์เพียง **2.15:1** ซึ่งต่ำกว่าเกณฑ์ขั้นต่ำ **4.5:1** ของ WCAG 1.4.3 อย่างมาก (แม้เกณฑ์ตัวอักษรขนาดใหญ่ขั้นต่ำคือ 3:1 ก็ยังสอบตก)
- **ผลกระทบต่อผู้ใช้:** สมาชิกคริสตจักรสูงอายุและผู้มีสายตาเลือนรางที่สแกนป้ายเพื่อถวายทรัพย์ในวันอาทิตย์จะไม่สามารถอ่านข้อความบนปุ่มได้ชัดเจน ข้อความกลืนไปกับพื้นหลังสีเขียว
- **เกณฑ์ที่เกี่ยวข้อง:** **WCAG 2.2 SC 1.4.3 Contrast (Minimum)**, DESIGN.md (บรรทัดที่ 76 ระบุว่า `linemark-button: textColor: "#0A0A0A"`)
- **แนวทางแก้ไขที่แนะนำ:**
  เปลี่ยนคลาสสีตัวอักษรบนปุ่ม LINE จาก `text-[var(--ink)]` ให้เป็นตัวอักษรสีดำเข้ม `text-[#0A0A0A]` หรือ `text-black` ตามที่ระบุไว้ใน Design System สเปก ซึ่งจะให้คอนทราสต์สูงถึง **9.8:1** (ผ่านเกณฑ์ระดับ AAA)

---

### FINDING-P0-02: ส่วนอัปโหลดไฟล์ใบเสร็จและสลิปถูกซ่อนจนควบคุมด้วยแป้นพิมพ์ไม่ได้ (Inoperable Hidden File Uploads)
- **Priority:** `P0`
- **โมดูล / หน้าจอ:** หน้าบันทึกรายจ่ายใหม่ (`client/src/pages/NewExpense.tsx`) และหน้าจุดถวาย (`client/src/pages/GivingStation.tsx`)
- **หลักฐานในโค้ด (Evidence):**
  - [NewExpense.tsx:587-604](file:///c:/Users/Administrator/Desktop/Giving-thank/Graceful-giving/client/src/pages/NewExpense.tsx#L587-L604):
    ```tsx
    <label className="border-2 border-dashed border-[var(--ink)] ... cursor-pointer">
      ...
      <p className="text-sm font-extrabold text-ink">คลิกเพื่ออัปโหลด หรือลากไฟล์มาวางที่นี่</p>
      <input
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
        onChange={handleUpload}
        className="hidden"
      />
    </label>
    ```
  - [GivingStation.tsx:1257-1265](file:///c:/Users/Administrator/Desktop/Giving-thank/Graceful-giving/client/src/pages/GivingStation.tsx#L1257-L1265):
    ```tsx
    <input
      ref={slipCameraRef}
      type="file"
      accept="image/*"
      capture="environment"
      aria-label="ถ่ายรูปสลิปด้วยกล้อง"
      onChange={e => void handleSlipFileChange(e)}
      className="hidden"
    />
    ```
- **คำอธิบายปัญหา:** การใช้คลาส `className="hidden"` (ซึ่งแปลงเป็น `display: none`) ทำให้ Element ถูกนำออกจาก Accessibility Tree และ Focus Order ของเบราว์เซอร์อย่างสมบูรณ์ ผู้ใช้ที่ควบคุมด้วยคีย์บอร์ด (Tab Key) จะกดข้ามส่วนอัปโหลดนี้ไปทันที และ `<label>` ภายนอกไม่มี `tabIndex={0}` หรือปุ่มที่สามารถกด Space/Enter เพื่อเปิด File Picker ได้
- **ผลกระทบต่อผู้ใช้:** ผู้ใช้ที่ไม่สามารถใช้เมาส์หรือผู้ใช้งาน Screen Reader ไม่สามารถแนบใบเสร็จหรือสลิปการโอนได้ ทำให้ไม่สามารถบันทึกรายจ่ายที่จำเป็นต้องแนบหลักฐานได้
- **เกณฑ์ที่เกี่ยวข้อง:** **WCAG 2.2 SC 2.1.1 Keyboard**, **WCAG 2.2 SC 4.1.2 Name, Role, Value**
- **แนวทางแก้ไขที่แนะนำ:**
  ใช้เทคนิค Visually Hidden (เช่น คลาส `sr-only`) แทน `display: none` เพื่อให้อินพุตยังคงอยู่ใน Tab Order และสามารถรับโฟกัสได้เมื่อผู้ใช้กด Tab พร้อมทั้งแสดง Focus Ring ล้อมรอบกรอบ `<label>` เมื่ออินพุตได้รับโฟกัส (`has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand`)

---

### FINDING-P0-03: หน้าต่างยืนยันและโมดอลแบบกำหนดเองขาดระบบกักโฟกัส (Custom Modals Missing Focus Trapping)
- **Priority:** `P0`
- **โมดูล / หน้าจอ:** หน้าการอนุมัติเบิกจ่าย (`client/src/pages/Approvals.tsx`) และหน้าจัดการกองทุน (`client/src/pages/Funds.tsx`)
- **หลักฐานในโค้ด (Evidence):**
  - [Approvals.tsx:443-450](file:///c:/Users/Administrator/Desktop/Giving-thank/Graceful-giving/client/src/pages/Approvals.tsx#L443-L450):
    ```tsx
    {showRejectModal && selectedReq && (
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="reject-modal-title"
        className="fixed inset-0 z-50 bg-ink/40 backdrop-blur-sm flex items-center justify-center p-4"
      >
        <div className="neo-modal max-w-md w-full ...">
          ...
        </div>
      </div>
    )}
    ```
  - [Funds.tsx:267-274](file:///c:/Users/Administrator/Desktop/Giving-thank/Graceful-giving/client/src/pages/Funds.tsx#L267-L274):
    ```tsx
    {showNewFundModal && (
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-fund-title"
        className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
      >
    ```
- **คำอธิบายปัญหา:** แม้จะมีการประกาศ `role="dialog"` และ `aria-modal="true"` แต่เนื่องจากเขียนด้วย `<div>` ธรรมดาโดยไม่ได้ใช้ Primitives ของ Radix UI (`Dialog`) ทำให้ไม่มีการควบคุม Focus Trap เมื่อผู้ใช้กดแป้น Tab ไปเรื่อยๆ โฟกัสจะหลุดออกจากโมดอลและไปทำงานกับลิงก์และปุ่มบนหน้าเว็บด้านหลัง (Inert background) ซึ่งผู้ใช้มองไม่เห็น
- **ผลกระทบต่อผู้ใช้:** ผู้ใช้คีย์บอร์ดและ Screen Reader หลงทาง กดปุ่มบนหน้าหลักเบื้องหลังโดยไม่ตั้งใจ (เช่น อาจเผลอไปกดอนุมัติรายการอื่นหรือออกจากหน้า)
- **เกณฑ์ที่เกี่ยวข้อง:** **WCAG 2.2 SC 2.1.2 No Keyboard Trap**, **WCAG 2.2 SC 2.4.3 Focus Order**
- **แนวทางแก้ไขที่แนะนำ:**
  แทนที่ Custom Modal ด้วยคอมโพเนนต์ `<Dialog>` และ `<DialogContent>` จาก `@/components/ui/dialog` (Radix UI) ซึ่งจัดการ Focus Trapping, Focus Restoration, Scroll Locking, และ ARIA Attributes ให้อัตโนมัติ

---

## หมวดที่ 2: รายการปัญหาระดับ P1 (Major Usability & Cognitive Issues)

### FINDING-P1-01: ตัวนับเวลาถอยหลัง 5 นาทีสร้างความเครียดและล้างข้อมูลผู้ถวาย (Artificial 5-Minute Giving Timeout)
- **Priority:** `P1`
- **โมดูล / หน้าจอ:** จุดถวายอัตโนมัติ / หน้าถวายทรัพย์มือถือ (`client/src/pages/GivingStation.tsx`)
- **หลักฐานในโค้ด (Evidence):**
  - [GivingStation.tsx:780-786](file:///c:/Users/Administrator/Desktop/Giving-thank/Graceful-giving/client/src/pages/GivingStation.tsx#L780-L786):
    ```tsx
    {shownStep === 2 && (
      <StationCountdownCard
        initialSeconds={300}
        label="เวลาทำรายการคงเหลือ"
        onExpire={handleCountdownExpire}
      />
    )}
    ```
  - [GivingStation.tsx:650-662](file:///c:/Users/Administrator/Desktop/Giving-thank/Graceful-giving/client/src/pages/GivingStation.tsx#L650-L662):
    ```tsx
    const handleCountdownExpire = () => {
      if (isSubmitting) return;
      toast.info("หมดเวลาทำรายการ กรุณาเริ่มใหม่อีกครั้ง");
      resetFlow();
    };
    ```
- **คำอธิบายปัญหา:** ในหน้าถวายทรัพย์บนมือถือของสมาชิก มีการใส่การ์ดนับถอยหลัง 300 วินาที (5 นาที) หากสมาชิกทำรายการไม่เสร็จภายใน 5 นาที ระบบจะตัดการทำงานและสั่ง `resetFlow()` ทันที ซึ่งล้างยอดเงินและประเภทที่สมาชิกอุตส่าห์เลือกไว้ทั้งหมด
- **ผลกระทบต่อผู้ใช้:**
  - สร้างความวิตกกังวลสูง (High Cognitive Stress): การถวายทรัพย์ในคริสตจักรควรเป็นไปด้วยใจยินดีและสงบ ไม่ใช่การแข่งกับเวลา
  - สมาชิกผู้สูงอายุที่ต้องสลับแอปไปเปิด Mobile Banking เพื่อโอนเงิน หรือตรวจสอบยอดเงินในบัญชีมักใช้เวลาเกิน 5 นาที เมื่อสลับกลับมาระบบแจ้งหมดเวลาและลบข้อมูลทิ้ง ทำให้ผู้ใช้รู้สึกท้อแท้และยกเลิกการถวาย
- **เกณฑ์ที่เกี่ยวข้อง:** **Cognitive Load Guidelines**, **WCAG 2.2 SC 2.2.1 Timing Adjustable** (ต้องอนุญาตให้ผู้ใช้ปิด ปรับ หรือขยายเวลาได้อย่างน้อย 10 เท่า)
- **แนวทางแก้ไขที่แนะนำ:**
  - สำหรับโหมดมือถือส่วนตัว (`stationOnly` หรือบน `/give`): **นำตัวนับเวลาถอยหลังออกโดยสิ้นเชิง** ให้ผู้ใช้ทำรายการตามความสะดวกของตนเอง
  - หากเป็นโหมดตู้ Kiosk สาธารณะจริง: ให้ตั้งเวลาเป็น Inactivity Timeout (นับเวลาเฉพาะเมื่อไม่มีการแตะหน้าจอ) และมีปุ่มเตือนขยายเวลา 20 วินาทีก่อนหมดเวลา พร้อมบันทึกแบบร่าง (Draft) ไว้เสมอ

---

### FINDING-P1-02: ขาดปุ่ม "บันทึกซองถัดไป" ในหน้าต่างสำเร็จ ทำให้การนับเงินวันอาทิตย์สะดุด (Missing Next Entry in Offering Success)
- **Priority:** `P1`
- **โมดูล / หน้าจอ:** บันทึกการถวาย (`client/src/pages/NewOffering.tsx`)
- **หลักฐานในโค้ด (Evidence):**
  - [NewOffering.tsx:541-550](file:///c:/Users/Administrator/Desktop/Giving-thank/Graceful-giving/client/src/pages/NewOffering.tsx#L541-L550):
    ```tsx
    <button
      onClick={() => {
        setIsSuccessOpen(false);
        setLocation("/offerings");
      }}
      className="btn-primary w-full min-h-12 text-base"
    >
      ดูรายการถวายทั้งหมด
    </button>
    ```
- **คำอธิบายปัญหา:** เมื่อเหรัญญิกบันทึกซองถวายสำเร็จ โมดอลยืนยันมีเพียงปุ่มเดียวคือ "ดูรายการถวายทั้งหมด" ซึ่งจะนำผู้ใช้ออกจากหน้าฟอร์มไปยังหน้ารายการรวม (`/offerings`) ในขณะที่หน้าบันทึกรายจ่าย (`NewExpense.tsx:677-703`) มีปุ่มคู่คือ "บันทึกรายจ่ายรายการถัดไป" และ "กลับสู่หน้ารายการ"
- **ผลกระทบต่อผู้ใช้:** ในวันอาทิตย์ เหรัญญิกหรือผู้นับเงินต้องบันทึกซองถวาย 30–100 ซอง การที่ระบบไม่มีปุ่ม "บันทึกซองถัดไป" ทำให้ต้องกดกลับไปหน้ารวม แล้วกดปุ่ม "บันทึกการถวาย" ใหม่ทุกครั้ง เพิ่มขั้นตอนที่ไม่จำเป็น (Unnecessary Clicks) ถึง 2 เท่า และทำลาย Flow การทำงาน
- **เกณฑ์ที่เกี่ยวข้อง:** **Cognitive Load (Task Continuity)**, **WCAG 2.2 SC 3.2.4 Consistent Identification**
- **แนวทางแก้ไขที่แนะนำ:**
  ปรับปรุงโมดอลสำเร็จใน `NewOffering.tsx` ให้มี 2 ปุ่ม:
  1. ปุ่มหลัก (`btn-primary`): "บันทึกซองถัดไป" (เมื่อกดแล้วจะปิดโมดอล คงค่ากองทุนและวันที่ไว้ ล้างเฉพาะยอดเงินและชื่อผู้ถวาย พร้อมย้ายโฟกัสไปที่ช่องจำนวนเงินทันที)
  2. ปุ่มรอง (`btn-secondary`): "ดูรายการถวายทั้งหมด"

---

### FINDING-P1-03: แสดงศัพท์เทคนิคระบบคลาวด์แก่ศิษยาภิบาลในหน้าเข้าสู่ระบบ (Developer Jargon on Pending Screen)
- **Priority:** `P1`
- **โมดูล / หน้าจอ:** หน้าเข้าสู่ระบบ (`client/src/pages/Login.tsx`)
- **หลักฐานในโค้ด (Evidence):**
  - [Login.tsx:106-118](file:///c:/Users/Administrator/Desktop/Giving-thank/Graceful-giving/client/src/pages/Login.tsx#L106-L118):
    ```tsx
    <p className="font-bold text-ink">สำหรับผู้ดูแลระบบหรือศิษยาภิบาล:</p>
    <p className="leading-relaxed text-ink-2">
      หากท่านเป็นผู้ดูแลระบบ ให้คัดลอกรหัส LINE OpenID นี้ไปใส่ใน Vercel Environment Variables ที่ช่อง OWNER_OPEN_ID แล้วเข้าสู่ระบบใหม่อีกครั้งเพื่อรับสิทธิ์ Super Admin ทันที
    </p>
    ```
- **คำอธิบายปัญหา:** เมื่อผู้ใช้ล็อกอินผ่าน LINE แล้ว แต่สถานะเป็น `pending` ระบบแสดงกล่องข้อความสีส้มแจ้งศิษยาภิบาลหรือผู้ดูแลระบบให้นำรหัสไปใส่ใน "Vercel Environment Variables" ซึ่งเป็นศัพท์ทางเทคนิคด้าน DevOps / Web Hosting
- **ผลกระทบต่อผู้ใช้:** ศิษยาภิบาลและผู้นำคริสตจักรส่วนใหญ่ไม่ใช่โปรแกรมเมอร์ เมื่อเห็นข้อความนี้จะเกิดความสับสน ไม่เข้าใจว่าต้องไปเปิด Vercel ที่ไหน และเข้าใจผิดว่าระบบเสีย
- **เกณฑ์ที่เกี่ยวข้อง:** **Cognitive Load (Plain Language)**, **WCAG 2.2 SC 3.3.2 Labels or Instructions**
- **แนวทางแก้ไขที่แนะนำ:**
  - เปลี่ยนข้อความหลักให้เป็นภาษาทั่วไป: *"บัญชีของท่านได้รับการลงทะเบียนแล้ว กรุณาแจ้งผู้ดูแลระบบของคริสตจักรเพื่อเปิดสิทธิ์การใช้งาน"*
  - ข้อความทางเทคนิคสำหรับ Developer ให้ซ่อนไว้ในแท็บ `<details><summary className="text-xs text-ink-3">สำหรับผู้ติดตั้งระบบ (Technical Setup)</summary>...</details>`

---

### FINDING-P1-04: รายการสลิปใน Giving Inbox ใช้ `<div>` รับคลิกโดยไม่มีการสนับสนุนคีย์บอร์ด (Non-Semantic Clickable Divs in Slip Inbox)
- **Priority:** `P1`
- **โมดูล / หน้าจอ:** กล่องสลิป LINE (`client/src/pages/GivingInbox.tsx`)
- **หลักฐานในโค้ด (Evidence):**
  - [GivingInbox.tsx:770-778](file:///c:/Users/Administrator/Desktop/Giving-thank/Graceful-giving/client/src/pages/GivingInbox.tsx#L770-L778):
    ```tsx
    <div
      key={slip.id}
      onClick={() => handleSelectSlip(slip)}
      className={`p-4 rounded-2xl cursor-pointer transition-all ${
        isSelected
          ? "border-2 border-[var(--ink)] bg-paper-2 shadow-[4px_4px_0_var(--ink)]"
          : "border-[1.5px] border-[var(--ink)] bg-surface ..."
      }`}
    >
    ```
- **คำอธิบายปัญหา:** การ์ดสลิปแต่ละใบในรายการฝั่งซ้ายถูกสร้างด้วยแท็ก `<div>` ธรรมดาที่ผูกเหตุการณ์ `onClick` โดยไม่มี `role="button"`, ไม่มี `tabIndex={0}`, และไม่มีคีย์บอร์ดอีเวนต์ (`onKeyDown` รองรับ Space/Enter)
- **ผลกระทบต่อผู้ใช้:** ผู้ใช้ที่ใช้คีย์บอร์ดหรืออุปกรณ์ช่วยเหลือไม่สามารถเลือกดูรายละเอียดสลิปเพื่อทำการอนุมัติได้เลย
- **เกณฑ์ที่เกี่ยวข้อง:** **WCAG 2.2 SC 2.1.1 Keyboard**, **WCAG 2.2 SC 4.1.2 Name, Role, Value**
- **แนวทางแก้ไขที่แนะนำ:**
  เปลี่ยนแท็กจาก `<div>` เป็น `<button type="button">` หรือเพิ่ม `role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleSelectSlip(slip); }}`

---

### FINDING-P1-05: ขาดตัวชี้วัดขั้นตอน (Stepper) และปุ่มนำทางในกระบวนการนับเงิน 5 แท็บ (Missing Workflow Stepper in Counting Detail)
- **Priority:** `P1`
- **โมดูล / หน้าจอ:** หน้ารายละเอียดการนับเงินถวาย (`client/src/pages/CountingDetail.tsx`)
- **หลักฐานในโค้ด (Evidence):**
  - [CountingDetail.tsx:406-422](file:///c:/Users/Administrator/Desktop/Giving-thank/Graceful-giving/client/src/pages/CountingDetail.tsx#L406-L422):
    ```tsx
    <div className="flex gap-2 overflow-x-auto pb-1">
      {TABS.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          type="button"
          onClick={() => setTab(id)}
          className={`inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl ...`}
        >
          <Icon className="h-4 w-4" />
          {label}
        </button>
      ))}
    </div>
    ```
- **คำอธิบายปัญหา:** หน้าจอนับเงินมี 5 แท็บที่ต้องทำตามลำดับกระบวนการบัญชี: 1. บันทึกซอง -> 2. นับเงินสดจริง -> 3. กระทบยอดเงินโอน -> 4. ตรวจสอบหักเบิก -> 5. สรุปและปิดรอบ แต่ระบบแสดงเป็นเพียงแถบแท็บแนวนอนธรรมดา ไม่มีตัวเลขบอกลำดับขั้นตอน (Step 1-5) และเมื่อบันทึกข้อมูลในแท็บใดแท็บหนึ่งเสร็จ ด้านล่างไม่มีปุ่ม "ไปขั้นตอนถัดไป"
- **ผลกระทบต่อผู้ใช้:** กรรมการนับเงินมือใหม่ไม่ทราบว่าต้องทำอะไรก่อน-หลัง และไม่รู้ว่าเมื่องานในแท็บแรกเสร็จแล้วจะต้องไปที่ไหนต่อ
- **เกณฑ์ที่เกี่ยวข้อง:** **Visual Hierarchy (Progressive Sequence)**, **Cognitive Load (Step Visibility)**
- **แนวทางแก้ไขที่แนะนำ:**
  - เพิ่มแถบ Stepper เหนือแท็บ แสดงตัวเลขลำดับ `1. ซองถวาย → 2. นับเงินสด → 3. เงินโอน → 4. หักเบิก → 5. สรุปปิดรอบ` พร้อมแสดงไอคอนเช็กถูกเมื่อแท็บนั้นทำรายการเรียบร้อย
  - ด้านล่างสุดของแต่ละแท็บ ให้มีปุ่มนำทาง: `บันทึกเสร็จแล้ว ไปขั้นตอนถัดไป →`

---

### FINDING-P1-06: การจัดวาง Layout มือถือใน Giving Inbox ซ้อนทับกันเป็นทางยาว (Mobile Split-View Layout Stacking)
- **Priority:** `P1`
- **โมดูล / หน้าจอ:** กล่องสลิป LINE (`client/src/pages/GivingInbox.tsx`)
- **หลักฐานในโค้ด (Evidence):**
  - [GivingInbox.tsx:722-725](file:///c:/Users/Administrator/Desktop/Giving-thank/Graceful-giving/client/src/pages/GivingInbox.tsx#L722-L725):
    ```tsx
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Left Column: List (5 cols on lg) */}
      <div className="lg:col-span-5 space-y-4">
    ```
- **คำอธิบายปัญหา:** ในจอ Desktop ระบบแบ่ง 2 คอลัมน์ (ซ้ายเป็นรายการสลิป ขวาเป็นภาพสลิปและฟอร์มอนุมัติ) ซึ่งทำงานได้ดีมาก แต่บนจอมือถือ (`grid-cols-1`) รายการสลิปทั้งหมด 20-30 รายการจะถูกนำมาวางเรียงซ้อนกันก่อน แล้วฟอร์มตรวจสลิปจะตกไปอยู่ล่างสุด เมื่อผู้ใช้แตะเลือกสลิปใดๆ การ์ดด้านบนจะเปลี่ยนสไตล์ แต่ผู้ใช้ไม่เห็นฟอร์มด้านล่างเพราะอยู่นอกจอ (Below the fold)
- **ผลกระทบต่อผู้ใช้:** เหรัญญิกที่ใช้มือถือตรวจสลิปคิดว่าระบบไม่ตอบสนองเมื่อกดเลือกสลิป เพราะไม่มีการเปิดหน้าต่างหรือเลื่อนหน้าจออัตโนมัติ
- **เกณฑ์ที่เกี่ยวข้อง:** **Visual Hierarchy (Mobile Layout)**, **WCAG 2.2 SC 1.4.10 Reflow**
- **แนวทางแก้ไขที่แนะนำ:**
  บนหน้าจอมือถือ (`lg:hidden`) เมื่อผู้ใช้แตะเลือกสลิป ให้เปิดเป็น **Bottom Sheet Drawer** หรือทำการ `scrollIntoView({ behavior: 'smooth' })` ไปยังส่วนตรวจสลิปทันที

---

## หมวดที่ 3: รายการปัญหาระดับ P2 (Moderate Friction & Cognitive Load)

### FINDING-P2-01: กองทุนเริ่มต้นถูกตั้งเป็นค่าว่าง บังคับให้เลือกซ้ำทุกครั้ง (Redundant Empty Fund Selection)
- **Priority:** `P2`
- **โมดูล / หน้าจอ:** บันทึกการถวาย (`NewOffering.tsx:306-320`) และใบนับซอง (`EnvelopesTab.tsx:244-260`)
- **หลักฐานในโค้ด (Evidence):**
  ```tsx
  <NativeSelect
    id="offering-fund"
    required
    value={fundId}
    onChange={e => setFundId(e.target.value)}
  >
    <option value="" disabled>— เลือกกองทุน —</option>
    {funds.map(f => (
      <option key={f.id} value={f.id}>{f.name}</option>
    ))}
  </NativeSelect>
  ```
- **คำอธิบายปัญหา:** ค่าเริ่มต้นของ `fundId` ถูกตั้งเป็นสตริงว่าง `""` ทำให้ Dropdown แสดงว่า `— เลือกกองทุน —` ทั้งที่คริสตจักรเกือบทุกแห่งมี "กองทุนทั่วไป" (General Fund) ที่รองรับการถวายกว่า 90%
- **ผลกระทบต่อผู้ใช้:** ผู้นับเงินต้องคลิกเลือกกองทุนซ้ำๆ ทุกครั้งที่บันทึกซอง หากลืมเลือกและกดบันทึก ระบบจะฟ้อง Error ขัดจังหวะการทำงาน
- **เกณฑ์ที่เกี่ยวข้อง:** **Cognitive Load (Smart Defaults)**, **WCAG 2.2 SC 3.3.7 Redundant Entry**
- **แนวทางแก้ไขที่แนะนำ:**
  ตั้งค่าเริ่มต้นของ `fundId` ให้เป็น ID ของกองทุนประเภท `general` (หรือกองทุนแรกในระบบ) โดยอัตโนมัติ หากผู้ใช้ต้องการเปลี่ยนเป็นกองทุนเฉพาะ (เช่น กองทุนอาคาร) จึงค่อยคลิกเปลี่ยน

---

### FINDING-P2-02: ฟอร์มหลายหน้าขาดการเชื่อมโยง `<label>` กับ `<input>` อย่างเป็นทางการ (Missing Programmatic Form Label Associations)
- **Priority:** `P2`
- **โมดูล / หน้าจอ:** วิซาร์ดตั้งค่า (`ChurchSetup/SetupSteps.tsx:50-62`), บันทึกรายจ่าย (`NewExpense.tsx:407-510`), กล่องโมดอลเหตุผล (`Approvals.tsx:474`)
- **หลักฐานในโค้ด (Evidence):**
  - [SetupSteps.tsx:50-62](file:///c:/Users/Administrator/Desktop/Giving-thank/Graceful-giving/client/src/pages/ChurchSetup/components/SetupSteps.tsx#L50-L62):
    ```tsx
    export function TextField({ label, value, onChange, placeholder, required }: ...) {
      return (
        <div>
          <FieldLabel required={required}>{label}</FieldLabel>
          <input
            type={type}
            value={value}
            onChange={e => onChange(e.target.value)}
            className="neo-input ..."
          />
        </div>
      );
    }
    ```
  - [NewExpense.tsx:407-416](file:///c:/Users/Administrator/Desktop/Giving-thank/Graceful-giving/client/src/pages/NewExpense.tsx#L407-L416):
    ```tsx
    <label className="text-sm font-extrabold text-ink">ผู้รับเงิน / ร้านค้า / องค์กร</label>
    <input type="text" placeholder="..." value={payee} onChange={...} />
    ```
- **คำอธิบายปัญหา:** แท็ก `<label>` ไม่มีแอตทริบิวต์ `htmlFor` และแท็ก `<input>` ไม่มี `id` ที่ตรงกัน แม้ตาเปล่าจะเห็นข้อความอยู่ติดกัน แต่เบราว์เซอร์และ Screen Reader ไม่สามารถผูกความสัมพันธ์ของฟิลด์ได้
- **ผลกระทบต่อผู้ใช้:** ผู้ใช้ Screen Reader จะได้ยินเพียงคำว่า "Edit text, blank" โดยไม่รู้ว่าช่องนั้นคือช่องชื่อผู้รับเงิน หรือหมายเหตุ
- **เกณฑ์ที่เกี่ยวข้อง:** **WCAG 2.2 SC 1.3.1 Info and Relationships**, **WCAG 2.2 SC 4.1.2 Name, Role, Value**
- **แนวทางแก้ไขที่แนะนำ:**
  กำหนด `id` เฉพาะให้แก่อินพุตทุกตัว และใส่ `htmlFor` ให้ตรงกันบน `<label>`

---

### FINDING-P2-03: จุดขั้นตอนในวิซาร์ดตั้งค่ามีขนาดพื้นที่สัมผัสเล็กกว่าเกณฑ์ 24px (Sub-Minimum Touch Target in Setup Wizard)
- **Priority:** `P2`
- **โมดูล / หน้าจอ:** วิซาร์ดตั้งค่าเริ่มต้นคริสตจักร (`client/src/pages/ChurchSetup.tsx`)
- **หลักฐานในโค้ด (Evidence):**
  - [ChurchSetup.tsx:236-250](file:///c:/Users/Administrator/Desktop/Giving-thank/Graceful-giving/client/src/pages/ChurchSetup.tsx#L236-L250):
    ```tsx
    {STEPS.map(s => (
      <button
        key={s.id}
        onClick={() => step > s.id && setStep(s.id)}
        aria-label={`ขั้นตอน ${s.id}`}
        className={`h-2 rounded-full transition-all duration-300 ${
          s.id === step ? "w-6 bg-brand" : "w-3 bg-line"
        }`}
      />
    ))}
    ```
- **คำอธิบายปัญหา:** จุด Indicator แต่ละขั้นตอนเป็นแท็ก `<button>` ที่สามารถคลิกย้อนกลับได้ แต่มีขนาดความสูงเพียง `h-2` (8 พิกเซล) และกว้าง `w-3` (12 พิกเซล)
- **ผลกระทบต่อผู้ใช้:** บนหน้าจอมือถือ ปุ่มขนาด 8 พิกเซลยากมากที่จะใช้นิ้วสัมผัสให้โดน และมักเกิดการกดพลาด
- **เกณฑ์ที่เกี่ยวข้อง:** **WCAG 2.2 SC 2.5.8 Target Size (Minimum)** (กำหนดให้มีขนาดสัมผัสไม่น้อยกว่า 24x24 พิกเซล)
- **แนวทางแก้ไขที่แนะนำ:**
  ใส่ Wrapper หรือเพิ่ม `p-2` / พื้นที่สัมผัสโปร่งใสให้ตัวปุ่มมีขนาดอย่างน้อย `min-h-[24px] min-w-[24px]` หรือ 44x44px ตาม Design System

---

### FINDING-P2-04: ขาดการแจ้งเตือนยืนยันก่อนบันทึกยอดเงินสูงผิดปกติ (Lack of Pre-Submit Warning for High Amounts)
- **Priority:** `P2`
- **โมดูล / หน้าจอ:** บันทึกการถวาย (`client/src/pages/NewOffering.tsx`)
- **หลักฐานในโค้ด (Evidence):**
  - [NewOffering.tsx:149-178](file:///c:/Users/Administrator/Desktop/Giving-thank/Graceful-giving/client/src/pages/NewOffering.tsx#L149-L178): เมื่อกดปุ่ม "ยืนยันบันทึกการถวาย" ฟังก์ชันจะเรียก `createMutation.mutate(...)` เข้าสู่ฐานข้อมูลทันทีโดยไม่มี Dialog ยืนยันยอด
- **คำอธิบายปัญหา:** การบันทึกรายการถวายสร้างสมุดบัญชีการเงินถาวร หากเหรัญญิกพิมพ์เลขศูนย์เกิน เช่น พิมพ์ `100000` แทนที่จะเป็น `10000` ระบบจะบันทึกทันทีโดยไม่มีขั้นตอนทบทวน
- **ผลกระทบต่อผู้ใช้:** สร้างความเสี่ยงต่อความถูกต้องของงบการเงิน และเหรัญญิกต้องตามไปแก้ไขในภายหลัง
- **เกณฑ์ที่เกี่ยวข้อง:** **WCAG 2.2 SC 3.3.4 Error Prevention (Financial)**
- **แนวทางแก้ไขที่แนะนำ:**
  หากยอดเงินเกินเกณฑ์ที่กำหนด (เช่น เกิน 20,000 บาท) ให้แสดง SweetAlert Confirm เพื่อให้เหรัญญิกกวาดสายตาทบทวนยอดเงินและชื่อผู้ถวายอีกครั้งก่อนส่ง

---

### FINDING-P2-05: กราฟแท่งเปรียบเทียบในหน้ารายงานไม่รองรับการเข้าถึงด้วยคีย์บอร์ดและสัมผัส (Inoperable Bar Chart on Mobile/Keyboard)
- **Priority:** `P2`
- **โมดูล / หน้าจอ:** รายงานการเงิน (`client/src/pages/Reports.tsx`)
- **หลักฐานในโค้ด (Evidence):**
  - [Reports.tsx:412-425](file:///c:/Users/Administrator/Desktop/Giving-thank/Graceful-giving/client/src/pages/Reports.tsx#L412-L425):
    ```tsx
    <div
      style={{ height: `${(month.income / chartMax) * 100}%` }}
      className="w-4 rounded-t-md ... bg-income sm:w-8"
      title={`รายรับ ${fmtBaht(month.income)}`}
    />
    ```
- **คำอธิบายปัญหา:** แท่งกราฟแต่ละเดือนใช้แอตทริบิวต์ `title` ซึ่งทำงานเฉพาะเมื่อนำเมาส์ไปชี้ (Hover) บนมือถือไม่มีระบบ Hover และตัวแท่งไม่มี `tabIndex={0}` หรือตัวเลขแสดงยอดเงินโดยตรง
- **ผลกระทบต่อผู้ใช้:** ผู้ใช้สมาร์ทโฟนและผู้ใช้คีย์บอร์ดไม่สามารถดูยอดเงินรายรับ-รายจ่ายที่แท้จริงในแต่ละเดือนได้ เห็นเพียงแท่งสีสูงต่ำเท่านั้น
- **เกณฑ์ที่เกี่ยวข้อง:** **WCAG 2.2 SC 2.1.1 Keyboard**, **WCAG 2.2 SC 1.4.13 Content on Hover or Focus**
- **แนวทางแก้ไขที่แนะนำ:**
  ใส่ `tabIndex={0}` และ `aria-label` ให้แก่แท่งกราฟ หรือแสดงตัวเลขยอดเงินย่อเหนือกราฟ หรือเพิ่มตารางข้อมูลทางเลือก (Data Table Fallback)

---

### FINDING-P2-06: ขาดปุ่มตรวจสอบสถานะในหน้าผู้ใช้รออนุมัติ (Missing Re-check Status in Pending Screen)
- **Priority:** `P2`
- **โมดูล / หน้าจอ:** หน้าเข้าสู่ระบบ (`client/src/pages/Login.tsx`)
- **หลักฐานในโค้ด (Evidence):**
  - [Login.tsx:141-148](file:///c:/Users/Administrator/Desktop/Giving-thank/Graceful-giving/client/src/pages/Login.tsx#L141-L148): ในการ์ดแสดงสถานะ `pending` มีเพียงปุ่ม "ออกจากระบบ" (Logout)
- **คำอธิบายปัญหา:** เมื่อสมาชิกหรือผู้นำคริสตจักรแจ้งให้แอดมินอนุมัติบัญชีแล้ว ผู้ใช้ไม่รู้ว่าจะตรวจสอบผลอย่างไร หลายคนเข้าใจว่าต้องกดปุ่ม "ออกจากระบบ" แล้วเข้าสู่ระบบใหม่
- **ผลกระทบต่อผู้ใช้:** เสียเวลาล็อกอินผ่าน LINE ซ้ำหลายรอบ
- **เกณฑ์ที่เกี่ยวข้อง:** **Cognitive Load (Clear Next Action)**
- **แนวทางแก้ไขที่แนะนำ:**
  เพิ่มปุ่ม "ตรวจสอบสถานะอีกครั้ง" (`btn-primary`) ที่เรียก `statusQuery.refetch()` เพื่อตรวจว่าแอดมินอนุมัติแล้วหรือยัง หากอนุมัติแล้วให้เปลี่ยนหน้าเข้าสู่ระบบอัตโนมัติ

---

## หมวดที่ 4: รายการปัญหาระดับ P3 (Minor Polish & Consistency)

### FINDING-P3-01: ตารางสรุปงบการเงินในหน้ารายงานขาด Table Scopes (Missing Table Header Scopes)
- **Priority:** `P3`
- **โมดูล / หน้าจอ:** รายงานการเงิน (`client/src/pages/Reports.tsx:303-311`)
- **คำอธิบายปัญหา:** แท็ก `<th>` ในตารางสรุปหมวดหมู่ไม่มีแอตทริบิวต์ `scope="col"` ในขณะที่หน้า `Transactions.tsx` มีการใส่ไว้อย่างสมบูรณ์ ทำให้ความสม่ำเสมอของโค้ดขาดหายไป
- **แนวทางแก้ไข:** เติม `scope="col"` บนหัวตาราง และ `scope="row"` บนชื่อหมวดหมู่

---

### FINDING-P3-02: โมดอล Radix UI ขาดการใช้คอมโพเนนต์ DialogTitle (Missing Accessible DialogTitle)
- **Priority:** `P3`
- **โมดูล / หน้าจอ:** `NewOffering.tsx:501` และ `NewExpense.tsx:637`
- **คำอธิบายปัญหา:** ภายใน `<DialogContent>` มีการใช้ `<h3>` ธรรมดาแทนคอมโพเนนต์ `<DialogTitle>` ของ Radix UI ส่งผลให้เกิดคำเตือน Accessibility ใน Console ของเบราว์เซอร์
- **แนวทางแก้ไข:** เปลี่ยน `<h3>` ให้เป็น `<DialogTitle>` เพื่อให้ Radix UI ผูก `aria-labelledby` กับกล่องไดอะล็อกได้อย่างสมบูรณ์

---

### FINDING-P3-03: หน้าแดชบอร์ดว่างเปล่าสำหรับผู้ใช้บทบาทผู้นับเงิน (Empty Dashboard for Counter Role)
- **Priority:** `P3`
- **โมดูล / หน้าจอ:** แดชบอร์ดหลัก (`client/src/pages/Home.tsx:243-346`)
- **คำอธิบายปัญหา:** เมื่อผู้ใช้มีบทบาท `COUNTER` (ผู้นับเงิน) ซึ่งไม่มีสิทธิ์ดูยอดเงินรวมในคริสตจักร หน้าจอหลักจะซ่อน BalanceCard และซ่อนปุ่มทำรายการ ทำให้แดชบอร์ดว่างเปล่าและไม่มีทางลัดไปยังหน้านับเงิน
- **แนวทางแก้ไข:** เพิ่มการ์ด Action เฉพาะบทบาทผู้นับเงิน: "เริ่มนับเงินถวายประจำสัปดาห์" พาไปยัง `/counting`

---

### FINDING-P3-04: แถบปุ่มด้านล่างบังฟิลด์อินพุตบนจอมือถือ (Fixed Bottom Bar Obscuring Focused Input)
- **Priority:** `P3`
- **โมดูล / หน้าจอ:** วิซาร์ดตั้งค่าคริสตจักร (`client/src/pages/ChurchSetup.tsx:343-378`)
- **คำอธิบายปัญหา:** แถบนำทางด้านล่าง `fixed inset-x-0 bottom-0` มีความสูงรวม Padding กว่า 80px เมื่อผู้ใช้มือถือจอเล็กเปิดคีย์บอร์ดเสมือน แถบนี้อาจบดบังฟิลด์อินพุตที่กำลังพิมพ์อยู่
- **เกณฑ์ที่เกี่ยวข้อง:** **WCAG 2.2 SC 2.4.11 Focus Not Obscured (Minimum)**
- **แนวทางแก้ไข:** เพิ่ม Padding ด้านล่างของ Container หลักให้มีระยะปลอดภัย (`pb-36`)
