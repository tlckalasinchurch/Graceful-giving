# Puntakit Design System V2

> **Puntakit = Ministry Editorial Operating System** — ระบบปฏิบัติการเชิงบรรณาธิการสำหรับการดูแลผู้คน กลุ่ม พื้นที่ และกิจกรรมพันธกิจ ไม่ใช่ generic SaaS dashboard, church admin template หรือ Apple clone

เอกสารนี้เป็น source of truth สำหรับการย้าย visual system ระยะต่อไป โดยรักษา backend และ domain model เดิม (`members`, `groups`, `groupMembers`, `attendance`, `events`, `ministries`, `prayerRequests`, `auditLogs` และ Ministry Activity) ไว้ทั้งหมด

## 1. Design direction

อินเทอร์เฟซต้องรู้สึก **calm, premium, human, editorial, trustworthy, modern, quiet และ spacious**

หลักการสำคัญ:

- UI chrome ถอยหลัง ให้เนื้อหาและบริบทพันธกิจเป็น visual hero
- ใช้ typography ที่ชัดเจนและมี editorial rhythm
- ใช้ whitespace มากขึ้นและแบ่งชั้นด้วย surface contrast
- ลด border และ shadow ให้เหลือเท่าที่จำเป็น
- ห้ามใช้ decorative gradients เพื่อสร้าง depth
- ใช้ radius grammar ชุดเล็กที่คาดเดาได้
- ภาพถ่ายหรือ ministry content มีพื้นที่ขยายได้จริง
- การกระทำใช้ action language เดียวกันทั้งระบบ
- responsive ต้องออกแบบตามบริบท mobile ไม่ใช่เพียงย่อ desktop

## 2. Brand color tokens

| Token | ค่า | บทบาท |
|---|---|---|
| `--color-primary` | `#315C2B` | action หลัก, link สำคัญ, active state |
| `--color-primary-focus` | `#3F7337` | hover/focus ของ action หลัก |
| `--color-primary-on-dark` | `#7FAF72` | action บน dark surface |
| `--color-ink` | `#1D1D1F` | heading และ body text |
| `--color-body` | `#1D1D1F` | เนื้อหาหลัก |
| `--color-body-muted` | `#6F6F73` | คำอธิบายและ metadata |
| `--color-canvas` | `#FFFFFF` | canvas หลัก |
| `--color-canvas-soft` | `#F5F5F7` | canvas รอง / band |
| `--color-surface` | `#FAFAFC` | card และ control ที่ยกชั้น |
| `--color-dark-surface` | `#272729` | navigation / editorial dark |
| `--color-dark-surface-2` | `#2A2A2C` | dark secondary surface |
| `--color-dark-surface-3` | `#252527` | dark tertiary surface |
| `--color-black` | `#000000` | media / full-bleed surface |
| `--color-divider` | `#F0F0F0` | divider เบา |
| `--color-hairline` | `#E0E0E0` | border ที่จำเป็น |
| `--color-on-dark` | `#FFFFFF` | text บน dark surface |

Semantic colors (`--color-success`, `--color-warning`, `--color-error`, `--color-info`) ใช้เฉพาะความหมายของสถานะและต้องไม่แข่งขันกับ primary green

## 3. Typography

- ฟอนต์หลัก: `Prompt, system-ui, sans-serif`
- `Hero`: `56px / 600 / 1.07`
- `Display LG`: `40px / 600 / 1.10`
- `Display MD`: `34px / 600 / 1.15`
- `Lead`: `28px / 400 / 1.35`
- `Body`: `17px / 400 / 1.47`
- `Body Strong`: `17px / 600 / 1.47`
- `Caption`: `14px / 400 / 1.45`
- `Caption Strong`: `14px / 600 / 1.45`
- `Fine`: `12px / 400 / 1.4`

กติกา:

- body copy ใหม่ใช้ 17px เป็น baseline; caption/fine ใช้เมื่อเป็น metadata จริงเท่านั้น
- headings ใช้ weight 600; ห้ามใช้ 500 เป็นน้ำหนัก default
- รักษา line-height สำหรับภาษาไทย ห้ามบีบจนอ่านยาก
- display typography กระชับได้ แต่ body ต้องอ่านสบาย

## 4. Spacing

ใช้ structural rhythm: `4 · 8 · 12 · 16 · 24 · 32 · 48 · 80px`

- interactive control ภายใน: 12–20px
- card content: 24px เมื่อเป็น editorial surface, 16px เมื่อเป็น compact utility
- ระหว่าง section ใหญ่: 48–80px
- mobile ใช้ 16–24px เป็น page gutter และเพิ่มพื้นที่ว่างระหว่าง section แทนการอัดข้อมูล

## 5. Radius grammar

| Token | ค่า | ใช้กับ |
|---|---:|---|
| `--radius-none` | `0px` | full-bleed editorial surface |
| `--radius-xs` | `5px` | status / compact metadata |
| `--radius-sm` | `8px` | utility controls, input, menu item |
| `--radius-md` | `11px` | compact panel |
| `--radius-lg` | `18px` | purpose-driven card |
| `--radius-pill` | `9999px` | primary action, chip, search |
| `--radius-circle` | `50%` | icon button, avatar |

ไม่ใช้ `rounded-xl/rounded-2xl` แบบสุ่มทั้งแอป และไม่ใช้ radius เดียวกับทุกชนิดของ surface

## 6. Surface and elevation

Surface modes:

- `surface-light`: `#FFFFFF`
- `surface-soft`: `#F5F5F7`
- `surface-dark`: `#272729`
- `surface-dark-2`: `#2A2A2C`
- `surface-dark-3`: `#252527`
- `surface-black`: `#000000`

Default elevation: **ไม่มี shadow** สำหรับ card, button, input, navigation และ section ใช้ border/hairline หรือ surface contrast แทน

อนุญาต shadow ที่นุ่มมากเฉพาะ imagery สำคัญหรือ overlay ที่ต้องแยกจากเนื้อหา และไม่ใช้เป็นกลไก hierarchy หลัก

## 7. Buttons

- **Primary**: green pill (`--color-primary`) พร้อม white text
- **Secondary**: transparent/outlined pill พร้อม hairline
- **Utility**: compact rectangular control, radius 8px
- **Icon**: วงกลม 44×44px
- ทุก target ขั้นต่ำ 44×44px
- pressed state ใช้ `scale(.95)`
- focus state ต้องเห็น 2px focus ring
- ไม่ใส่ shadow ให้ button เป็นค่าเริ่มต้น

## 8. Inputs and search

- input ทั่วไป: สูงอย่างน้อย 44px, radius 8px, border hairline, ไม่มี shadow
- global search: สูงอย่างน้อย 44px, padding แนวนอน 20px, radius pill, ใช้เป็น first-class interaction
- placeholder ใช้ body muted
- focus ใช้ primary focus และ focus ring ที่เห็นได้ชัด
- รักษา IME composition behavior ของ `Input` component สำหรับภาษาไทย/เอเชีย
- global search รองรับต่อไป: คน, กลุ่ม, สถานที่, กิจกรรม และ events

## 9. Purpose-driven cards

ลด generic dashboard cards และเลือกใช้ตาม intent:

- **Ministry Activity Card**: ใคร / ที่ไหน / เกิดอะไรขึ้น / เมื่อไร / ทำอะไรต่อ
- **Group Card**: กลุ่ม / ผู้นำ / พื้นที่ / จำนวนสมาชิก / กิจกรรมล่าสุด
- **Person Card**: ชื่อ / ความสัมพันธ์ / กลุ่ม / สถานะ / follow-up ถัดไป
- **Place Card**: สถานที่ / พื้นที่ / กิจกรรมที่เกี่ยวข้อง
- **Follow-up Card**: คนที่ต้องดูแล / เหตุผล / due date / next action
- **Story Card**: ภาพ / เรื่องราว / ผู้เกี่ยวข้อง / เวลา

ไม่ทำให้ข้อมูลทุกชิ้นกลายเป็น bordered card; ใช้ list, divider และ surface band เมื่อเหมาะกว่า

## 10. Navigation

Desktop navigation ใช้ dark editorial rail ที่สงบและไม่แย่งความสนใจจาก content; active state ใช้ primary-on-dark และ hairline/contrast ไม่ใช้ gradient

Mobile:

- sidebar เป็น bottom sheet/drawer ที่ปิดได้
- menu button และ close button อย่างน้อย 44×44px
- topbar search ยังเข้าถึงง่ายและไม่ถูกซ่อนโดยไม่จำเป็น
- contextual action อยู่ใกล้ content ที่เกี่ยวข้อง

## 11. Editorial home

ลำดับหน้า Home ที่แนะนำ:

1. Header / identity
2. Global search
3. Context filters: `พื้นที่`, `กิจกรรม`, `ช่วงเวลา`, `สถานะ`
4. Map หรือ map/list switch เมื่อ map data พร้อม
5. Active ministry
6. Recent activities
7. Ministry areas
8. People / groups needing attention
9. Stories
10. Footer / next action

ห้ามเปิดหน้าด้วยกำแพง KPI cards; KPI แสดงเมื่อช่วยตัดสินใจจริง เช่น follow-up ที่เลยกำหนดหรือ submission ที่รอตรวจสอบ

## 12. Map UI

Map เป็น first-class surface ที่เชื่อม people, groups, activities และ places เข้าด้วยกัน

- filter chips ใช้ pill และลำดับชัดเจน
- marker selection ต้องเปิด contextual detail
- map/list switching ต้องเป็น action ที่เข้าถึงได้
- หาก provider/API ยังไม่พร้อม ให้แสดง state ที่อธิบายได้ ไม่สร้างข้อมูลปลอม และไม่ทำให้หน้าเสียรูป

## 13. Responsive behavior

- mobile เป็น layout ที่ตั้งใจออกแบบใหม่ ไม่ใช่ desktop ที่ถูกบีบ
- touch target อย่างน้อย 44px
- body text ที่สำคัญยังอ่านได้ด้วยขนาดที่เหมาะกับภาษาไทย
- ใช้ horizontal chip row ที่เลื่อนได้เมื่อ filter เยอะ
- ใช้ bottom sheet/contextual action สำหรับรายละเอียดที่ไม่ควรยึดพื้นที่จอ
- photo-first content ต้องลด/ย้ายอย่างมีเหตุผล ไม่ใช่ซ่อนแบบสุ่ม

## 14. Loading, empty และ error states

- **Skeleton** สำหรับ page content ที่กำลังโหลด
- **Spinner** สำหรับ action สั้น ๆ เช่น submit/refresh
- empty และ error ต้องเป็นคนละ state กับ loading
- ห้ามใช้ `...` เป็น loading substitute
- skeleton ใช้ surface soft และไม่มี shadow หนัก

## 15. Migration rules

1. แก้ shared tokens ก่อน page-specific polish
2. ใช้ CSS variables จาก `index.css` เป็น source of truth; ห้ามเพิ่มสีหรือ radius ใหม่แบบ ad hoc
3. ย้าย shared primitives ตามลำดับ: tokens → typography → buttons → inputs → cards → navigation → surfaces → loading → responsive
4. ย้าย representative screens ก่อน แล้วค่อยขยายไปหน้าอื่น
5. ไม่เปลี่ยน backend, framework หรือ domain entities ที่ใช้งานอยู่
6. ไม่สร้างระบบ People/Group/Activity ซ้ำกับ model เดิม
7. ไม่ย้าย logic/data fetching เพียงเพื่อการเปลี่ยน visual system
8. ก่อน merge ตรวจสีที่หลุด, shadow, radius, body text, gradient, contrast และ target size

## 16. Current implementation scope

ในรอบนี้ foundation และ representative surfaces ที่ย้ายแล้ว/กำลังย้าย ได้แก่:

- CSS token bridge และ typography baseline
- shadcn Button, Card และ Input
- App layout, sidebar, logo และ topbar/global search
- loading skeleton surfaces
- Home discovery hero และ editorial shortcuts

หน้า domain อื่นยังคงใช้ logic และ route เดิมเพื่อให้ migration เป็น incremental; การย้าย visual classes ทั้งหมดจะทำต่อเป็นราย screen โดยไม่กระทบ backend

## 17. Verification checklist

```bash
pnpm check
pnpm test
pnpm build
```

ตรวจเพิ่มด้วย `git diff` และ `git status`:

- [ ] ไม่มีสีแบรนด์เก่าหลุดใน shared primitives
- [ ] ไม่มี decorative gradient ใน shared/editorial foundation
- [ ] card/button/input/navigation ไม่มี shadow โดยไม่จำเป็น
- [ ] radius อยู่ใน grammar
- [ ] global search สูงอย่างน้อย 44px
- [ ] icon/control สำคัญสูง/กว้างอย่างน้อย 44px
- [ ] focus ring เห็นชัด
- [ ] responsive mobile ไม่พัง
- [ ] contrast ของ ink/body muted บน canvas ผ่านการอ่านจริง
- [ ] backend และ domain model เดิมยังถูกใช้งาน
