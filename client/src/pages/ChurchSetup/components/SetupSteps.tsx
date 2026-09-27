import React from "react";
import { Check, HandCoins, Heart, WalletCards } from "lucide-react";
import {
  DEFAULT_OFFERING_CATEGORIES,
  SetupData,
  THAI_MONTHS,
} from "./setupTypes";
import { NativeSelect } from "@/components/ui/native-select";

export function FieldLabel({
  children,
  required,
}: {
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <label className="mb-1.5 block text-xs font-bold text-foreground-soft">
      {children} {required && <span className="text-destructive-strong">*</span>}
    </label>
  );
}

export function TextField({
  label,
  value,
  onChange,
  placeholder,
  required,
  type = "text",
  disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
  type?: string;
  disabled?: boolean;
}) {
  return (
    <div>
      <FieldLabel required={required}>{label}</FieldLabel>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full rounded-xl border border-border bg-card px-3.5 py-2.5 text-sm text-foreground-soft placeholder:text-muted-foreground focus:border-primary-strong focus:outline-none focus:ring-2 focus:ring-primary-strong/20 disabled:opacity-60"
      />
    </div>
  );
}

export function Step1({
  data,
  set,
}: {
  data: SetupData;
  set: (p: Partial<SetupData>) => void;
}) {
  return (
    <div className="space-y-4">
      <TextField
        label="ชื่อคริสตจักร"
        required
        value={data.name}
        onChange={v => set({ name: v })}
        placeholder="เช่น คริสตจักรบ้านแห่งพระคุณ (Grace House Church)"
      />
      <div>
        <FieldLabel>ที่อยู่</FieldLabel>
        <textarea
          value={data.address}
          onChange={e => set({ address: e.target.value })}
          placeholder="บ้านเลขที่, ถนน, แขวง/ตำบล, เขต/อำเภอ, จังหวัด, รหัสไปรษณีย์"
          rows={3}
          className="w-full rounded-xl border border-border bg-card px-3.5 py-2.5 text-sm text-foreground-soft placeholder:text-muted-foreground focus:border-primary-strong focus:outline-none resize-none"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <TextField
          label="โทรศัพท์"
          value={data.phone}
          onChange={v => set({ phone: v })}
          placeholder="02-XXX-XXXX"
          type="tel"
        />
        <TextField
          label="อีเมล"
          value={data.email}
          onChange={v => set({ email: v })}
          placeholder="church@example.com"
          type="email"
        />
      </div>
      <TextField
        label="เว็บไซต์"
        value={data.website}
        onChange={v => set({ website: v })}
        placeholder="https://www.church.com"
      />
    </div>
  );
}

export function Step2({
  data,
  set,
}: {
  data: SetupData;
  set: (p: Partial<SetupData>) => void;
}) {
  return (
    <div className="space-y-4">
      <TextField
        label="ชื่อศิษยาภิบาล"
        required
        value={data.pastorName}
        onChange={v => set({ pastorName: v })}
        placeholder="ศจ. ชื่อ นามสกุล"
      />
      <TextField
        label="ชื่อผู้ช่วยศิษยาภิบาล"
        value={data.assistantPastorName}
        onChange={v => set({ assistantPastorName: v })}
        placeholder="ศจ. ชื่อ นามสกุล (ถ้ามี)"
      />
      <TextField
        label="ชื่อผู้ดูแลการเงิน (เหรัญญิก)"
        required
        value={data.treasurerName}
        onChange={v => set({ treasurerName: v })}
        placeholder="มัคนายก ชื่อ นามสกุล"
      />
      <div>
        <FieldLabel>ข้อพระคัมภีร์หรือคติพจน์ของคริสตจักร</FieldLabel>
        <textarea
          value={data.motto}
          onChange={e => set({ motto: e.target.value })}
          placeholder="เช่น 2 โครินธ์ 9:7 · ผู้ให้ด้วยใจยินดี พระเจ้าทรงรัก"
          rows={2}
          className="w-full rounded-xl border border-border bg-card px-3.5 py-2.5 text-sm text-foreground-soft placeholder:text-muted-foreground focus:border-primary-strong focus:outline-none resize-none"
        />
      </div>
      <div className="rounded-2xl border border-info-soft bg-info-soft p-4">
        <p className="text-xs font-bold text-info">
          💡 เกี่ยวกับบทบาทผู้ใช้
        </p>
        <p className="mt-1 text-xs text-info">
          ผู้ดูแลระบบสามารถกำหนดสิทธิ์ <strong>SUPER_ADMIN</strong>,{" "}
          <strong>PASTOR</strong>, <strong>TREASURER</strong>{" "}
          ให้ผู้ใช้แต่ละคนได้ในภายหลังจากหน้าโปรไฟล์
        </p>
      </div>
    </div>
  );
}

export function Step3({
  data,
  set,
}: {
  data: SetupData;
  set: (p: Partial<SetupData>) => void;
}) {
  const BANKS = [
    "ธนาคารกสิกรไทย",
    "ธนาคารกรุงไทย",
    "ธนาคารไทยพาณิชย์",
    "ธนาคารกรุงเทพ",
    "ธนาคารกรุงศรีอยุธยา",
    "ธนาคารออมสิน",
    "ธนาคารอื่นๆ",
  ];
  return (
    <div className="space-y-4">
      <div>
        <FieldLabel>ธนาคาร</FieldLabel>
        <NativeSelect
          value={data.bankName}
          onChange={e => set({ bankName: e.target.value })}
          className="border-border text-foreground-soft focus:border-primary-strong"
        >
          <option value="">— เลือกธนาคาร —</option>
          {BANKS.map(b => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </NativeSelect>
      </div>
      <TextField
        label="เลขที่บัญชี"
        required
        value={data.bankAccount}
        onChange={v => set({ bankAccount: v })}
        placeholder="000-0-00000-0"
      />
      <TextField
        label="ชื่อบัญชี"
        required
        value={data.bankAccountName}
        onChange={v => set({ bankAccountName: v })}
        placeholder="คริสตจักร..."
      />
      <div className="rounded-2xl border border-success-soft bg-success-soft p-4">
        <p className="text-xs font-bold text-success">🔒 ความปลอดภัย</p>
        <p className="mt-1 text-xs text-success">
          ข้อมูลบัญชีธนาคารจะถูกเก็บเป็นความลับ — เข้าถึงได้เฉพาะ TREASURER และ
          SUPER_ADMIN เท่านั้น
        </p>
      </div>
    </div>
  );
}

export function Step4({
  data,
  set,
}: {
  data: SetupData;
  set: (p: Partial<SetupData>) => void;
}) {
  const toggleCat = (cat: string) => {
    const next = data.offeringCategories.includes(cat)
      ? data.offeringCategories.filter(c => c !== cat)
      : [...data.offeringCategories, cat];
    set({ offeringCategories: next });
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-foreground-soft">
        เลือกหมวดหมู่การถวายที่คริสตจักรของคุณใช้งาน:
      </p>
      <div className="grid grid-cols-2 gap-2">
        {DEFAULT_OFFERING_CATEGORIES.map(cat => {
          const selected = data.offeringCategories.includes(cat);
          return (
            <button
              key={cat}
              type="button"
              onClick={() => toggleCat(cat)}
              className={`flex min-h-[48px] items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-sm font-semibold transition ${
                selected
                  ? "border-primary-strong bg-muted text-primary-strong"
                  : "border-border bg-card text-foreground-soft hover:bg-background"
              }`}
            >
              <span
                className={`grid size-5 shrink-0 place-items-center rounded-md ${
                  selected ? "bg-primary-strong text-white" : "bg-divider"
                }`}
              >
                {selected ? (
                  <Check className="size-3" />
                ) : (
                  <HandCoins className="size-3 text-primary-strong" />
                )}
              </span>
              {cat}
            </button>
          );
        })}
      </div>
      {data.offeringCategories.length === 0 && (
        <p className="text-xs text-destructive-strong">
          ⚠ กรุณาเลือกอย่างน้อย 1 หมวดหมู่
        </p>
      )}
    </div>
  );
}

export function Step5({ data }: { data: SetupData }) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-foreground-soft">
        กองทุนเริ่มต้นที่แนะนำสำหรับคริสตจักร:
      </p>
      {data.funds.map((fund, i) => (
        <div
          key={i}
          className="flex items-center gap-3 rounded-2xl border border-divider bg-card p-3.5"
        >
          <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent text-primary-strong">
            <WalletCards className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-foreground-soft">{fund.name}</p>
            <p className="text-xs text-foreground-soft">{fund.description}</p>
          </div>
          <Check className="size-4 shrink-0 text-success" />
        </div>
      ))}
      <div className="rounded-2xl border border-accent bg-accent p-4">
        <p className="text-xs font-bold text-primary">
          💡 สามารถเพิ่มกองทุนเพิ่มเติมได้ภายหลัง
        </p>
        <p className="mt-1 text-xs text-primary">
          จากหน้าการเงิน → จัดการกองทุน
        </p>
      </div>
    </div>
  );
}

export function Step6({
  data,
  set,
}: {
  data: SetupData;
  set: (p: Partial<SetupData>) => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <FieldLabel required>เดือนเริ่มต้นปีงบประมาณ</FieldLabel>
        <NativeSelect
          value={data.fiscalYearStartMonth}
          onChange={e => set({ fiscalYearStartMonth: Number(e.target.value) })}
          className="border-border text-foreground-soft focus:border-primary-strong"
        >
          {THAI_MONTHS.map((m, i) => (
            <option key={i + 1} value={i + 1}>
              {m}
            </option>
          ))}
        </NativeSelect>
        <p className="mt-1.5 text-xs text-muted-foreground">
          ปีงบประมาณจะเริ่มจาก{THAI_MONTHS[data.fiscalYearStartMonth - 1]}
          ของทุกปี
        </p>
      </div>
      <div>
        <FieldLabel required>ปีงบประมาณปัจจุบัน (พ.ศ.)</FieldLabel>
        <input
          type="number"
          inputMode="numeric"
          value={data.budgetYear}
          onChange={e => set({ budgetYear: Number(e.target.value) })}
          min={2550}
          max={2600}
          className="w-full rounded-xl border border-border bg-card px-3.5 py-2.5 text-sm text-foreground-soft focus:border-primary-strong focus:outline-none"
        />
      </div>
      <div className="rounded-2xl border border-accent bg-accent p-4 space-y-2">
        <p className="text-xs font-bold text-primary">
          📅 ตัวอย่างรอบปีงบประมาณ
        </p>
        <p className="text-xs text-primary">
          ปีที่ {data.budgetYear}: {THAI_MONTHS[data.fiscalYearStartMonth - 1]}{" "}
          {data.budgetYear} →{" "}
          {THAI_MONTHS[(data.fiscalYearStartMonth - 2 + 12) % 12]}{" "}
          {data.budgetYear + 1}
        </p>
      </div>
    </div>
  );
}

export function Step7() {
  const roles = [
    {
      role: "SUPER_ADMIN",
      label: "ผู้ดูแลระบบสูงสุด",
      desc: "เข้าถึงได้ทุกอย่าง รวมถึงข้อมูลผู้ถวายและการตั้งค่า",
      color: "bg-destructive-soft text-destructive",
    },
    {
      role: "PASTOR",
      label: "ศิษยาภิบาล / ผู้นำ",
      desc: "ดูรายงานการเงิน อนุมัติคำขอ แต่ไม่เห็นชื่อผู้ถวาย",
      color: "bg-info-soft text-info",
    },
    {
      role: "TREASURER",
      label: "เหรัญญิก / ผู้ดูแลการเงิน",
      desc: "บันทึกและดูรายการทั้งหมด รวมถึงชื่อผู้ถวาย",
      color: "bg-success-soft text-success",
    },
    {
      role: "MEMBER",
      label: "สมาชิกทั่วไป",
      desc: "ดูยอดรวมและสร้างคำขอเบิก แต่ไม่เห็นรายละเอียดผู้ถวาย",
      color: "bg-muted text-primary-strong",
    },
  ];
  return (
    <div className="space-y-3">
      <p className="text-sm text-foreground-soft">
        ระบบมี 4 บทบาทหลัก ผู้ดูแลระบบสามารถกำหนดให้ผู้ใช้แต่ละคนได้:
      </p>
      {roles.map(({ role, label, desc, color }) => (
        <div
          key={role}
          className="flex items-start gap-3 rounded-2xl border border-divider bg-card p-3.5"
        >
          <span
            className={`inline-flex shrink-0 items-center rounded-lg px-2.5 py-1 text-xs font-bold ${color}`}
          >
            {role}
          </span>
          <div>
            <p className="text-sm font-bold text-foreground-soft">{label}</p>
            <p className="text-xs text-foreground-soft">{desc}</p>
          </div>
        </div>
      ))}
      <div className="rounded-2xl border border-success-border bg-success-soft p-4">
        <p className="text-xs font-bold text-success">🔐 การกำหนดสิทธิ์</p>
        <p className="mt-1 text-xs text-success">
          ไปที่ เมนู → โปรไฟล์ผู้ใช้ → กำหนดบทบาท
          หลังจากตั้งค่าคริสตจักรเสร็จแล้ว
        </p>
      </div>
    </div>
  );
}

export function Step8({ data }: { data: SetupData }) {
  const summaryItems = [
    { label: "ชื่อคริสตจักร", value: data.name || "—" },
    { label: "ศิษยาภิบาล", value: data.pastorName || "—" },
    { label: "เหรัญญิก", value: data.treasurerName || "—" },
    {
      label: "ธนาคาร",
      value: data.bankName ? `${data.bankName} ${data.bankAccount}` : "—",
    },
    {
      label: "ปีงบประมาณ",
      value: `เริ่ม${THAI_MONTHS[data.fiscalYearStartMonth - 1]}`,
    },
    { label: "หมวดหมู่ถวาย", value: `${data.offeringCategories.length} หมวด` },
    { label: "กองทุน", value: `${data.funds.length} กองทุน` },
  ];
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-divider bg-card overflow-hidden">
        {summaryItems.map(({ label, value }, i) => (
          <div
            key={label}
            className={`flex items-center justify-between px-4 py-3 text-sm ${
              i < summaryItems.length - 1 ? "border-b border-divider" : ""
            }`}
          >
            <span className="text-foreground-soft">{label}</span>
            <span className="font-bold text-foreground-soft text-right max-w-[55%] truncate">
              {value}
            </span>
          </div>
        ))}
      </div>
      <div className="rounded-2xl border border-success-border bg-success-soft p-4 text-center">
        <Heart className="mx-auto mb-2 size-8 text-success" fill="#2c7b4c" />
        <p className="text-sm font-bold text-success-strong">พร้อมเริ่มต้นใช้งาน!</p>
        <p className="mt-1 text-xs text-success">
          ระบบจะบันทึกข้อมูลและนำคุณไปยังหน้าแดชบอร์ด
        </p>
      </div>
    </div>
  );
}
