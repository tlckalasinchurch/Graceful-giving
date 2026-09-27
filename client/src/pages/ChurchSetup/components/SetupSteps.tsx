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
    <label className="mb-1.5 block text-xs font-bold text-[#5F5B55]">
      {children} {required && <span className="text-[#E74646]">*</span>}
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
        className="w-full rounded-xl border border-[#E5E1D8] bg-white px-3.5 py-2.5 text-sm text-[#292929] placeholder:text-[#CFC7BF] focus:border-[#D95E0B] focus:outline-none focus:ring-2 focus:ring-[#D95E0B]/20 disabled:opacity-60"
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
          className="w-full rounded-xl border border-[#E5E1D8] bg-white px-3.5 py-2.5 text-sm text-[#292929] placeholder:text-[#CFC7BF] focus:border-[#D95E0B] focus:outline-none resize-none"
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
          className="w-full rounded-xl border border-[#E5E1D8] bg-white px-3.5 py-2.5 text-sm text-[#292929] placeholder:text-[#CFC7BF] focus:border-[#D95E0B] focus:outline-none resize-none"
        />
      </div>
      <div className="rounded-2xl border border-[#dceeff] bg-[#eef7ff] p-4">
        <p className="text-xs font-bold text-[#336a8c]">
          💡 เกี่ยวกับบทบาทผู้ใช้
        </p>
        <p className="mt-1 text-xs text-[#477caa]">
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
          className="border-[#E5E1D8] text-[#292929] focus:border-[#D95E0B]"
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
      <div className="rounded-2xl border border-[#e5f3da] bg-[#f1fae9] p-4">
        <p className="text-xs font-bold text-[#4a7c2e]">🔒 ความปลอดภัย</p>
        <p className="mt-1 text-xs text-[#3F9156]">
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
      <p className="text-sm text-[#5F5B55]">
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
                  ? "border-[#D95E0B] bg-[#F1EFE9] text-[#D95E0B]"
                  : "border-[#E5E1D8] bg-white text-[#5F5B55] hover:bg-[#F5F3EE]"
              }`}
            >
              <span
                className={`grid size-5 shrink-0 place-items-center rounded-md ${
                  selected ? "bg-[#D95E0B] text-white" : "bg-[#E5E1D8]"
                }`}
              >
                {selected ? (
                  <Check className="size-3" />
                ) : (
                  <HandCoins className="size-3 text-[#D95E0B]" />
                )}
              </span>
              {cat}
            </button>
          );
        })}
      </div>
      {data.offeringCategories.length === 0 && (
        <p className="text-xs text-[#E74646]">
          ⚠ กรุณาเลือกอย่างน้อย 1 หมวดหมู่
        </p>
      )}
    </div>
  );
}

export function Step5({ data }: { data: SetupData }) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-[#5F5B55]">
        กองทุนเริ่มต้นที่แนะนำสำหรับคริสตจักร:
      </p>
      {data.funds.map((fund, i) => (
        <div
          key={i}
          className="flex items-center gap-3 rounded-2xl border border-[#E5E1D8] bg-white p-3.5"
        >
          <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#FFF0DD] text-[#D95E0B]">
            <WalletCards className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-[#292929]">{fund.name}</p>
            <p className="text-xs text-[#5F5B55]">{fund.description}</p>
          </div>
          <Check className="size-4 shrink-0 text-[#3F9156]" />
        </div>
      ))}
      <div className="rounded-2xl border border-[#FFF0DD] bg-[#fffde9] p-4">
        <p className="text-xs font-bold text-[#F97316]">
          💡 สามารถเพิ่มกองทุนเพิ่มเติมได้ภายหลัง
        </p>
        <p className="mt-1 text-xs text-[#F97316]">
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
          className="border-[#E5E1D8] text-[#292929] focus:border-[#D95E0B]"
        >
          {THAI_MONTHS.map((m, i) => (
            <option key={i + 1} value={i + 1}>
              {m}
            </option>
          ))}
        </NativeSelect>
        <p className="mt-1.5 text-xs text-[#7A766F]">
          ปีงบประมาณจะเริ่มจาก{THAI_MONTHS[data.fiscalYearStartMonth - 1]}
          ของทุกปี
        </p>
      </div>
      <div>
        <FieldLabel required>ปีงบประมาณปัจจุบัน (พ.ศ.)</FieldLabel>
        <input
          type="number"
          value={data.budgetYear}
          onChange={e => set({ budgetYear: Number(e.target.value) })}
          min={2550}
          max={2600}
          className="w-full rounded-xl border border-[#E5E1D8] bg-white px-3.5 py-2.5 text-sm text-[#292929] focus:border-[#D95E0B] focus:outline-none"
        />
      </div>
      <div className="rounded-2xl border border-[#FFF0DD] bg-[#fffde9] p-4 space-y-2">
        <p className="text-xs font-bold text-[#F97316]">
          📅 ตัวอย่างรอบปีงบประมาณ
        </p>
        <p className="text-xs text-[#F97316]">
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
      color: "bg-[#ffe1dc] text-[#c15b4c]",
    },
    {
      role: "PASTOR",
      label: "ศิษยาภิบาล / ผู้นำ",
      desc: "ดูรายงานการเงิน อนุมัติคำขอ แต่ไม่เห็นชื่อผู้ถวาย",
      color: "bg-[#dceeff] text-[#4a83b7]",
    },
    {
      role: "TREASURER",
      label: "เหรัญญิก / ผู้ดูแลการเงิน",
      desc: "บันทึกและดูรายการทั้งหมด รวมถึงชื่อผู้ถวาย",
      color: "bg-[#e5f3da] text-[#3F9156]",
    },
    {
      role: "MEMBER",
      label: "สมาชิกทั่วไป",
      desc: "ดูยอดรวมและสร้างคำขอเบิก แต่ไม่เห็นรายละเอียดผู้ถวาย",
      color: "bg-[#F1EFE9] text-[#D95E0B]",
    },
  ];
  return (
    <div className="space-y-3">
      <p className="text-sm text-[#5F5B55]">
        ระบบมี 4 บทบาทหลัก ผู้ดูแลระบบสามารถกำหนดให้ผู้ใช้แต่ละคนได้:
      </p>
      {roles.map(({ role, label, desc, color }) => (
        <div
          key={role}
          className="flex items-start gap-3 rounded-2xl border border-[#E5E1D8] bg-white p-3.5"
        >
          <span
            className={`inline-flex shrink-0 items-center rounded-lg px-2.5 py-1 text-xs font-bold ${color}`}
          >
            {role}
          </span>
          <div>
            <p className="text-sm font-bold text-[#292929]">{label}</p>
            <p className="text-xs text-[#5F5B55]">{desc}</p>
          </div>
        </div>
      ))}
      <div className="rounded-2xl border border-[#ddf0e6] bg-[#eafaf1] p-4">
        <p className="text-xs font-bold text-[#2c7b4c]">🔐 การกำหนดสิทธิ์</p>
        <p className="mt-1 text-xs text-[#336a4f]">
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
      <div className="rounded-2xl border border-[#E5E1D8] bg-white overflow-hidden">
        {summaryItems.map(({ label, value }, i) => (
          <div
            key={label}
            className={`flex items-center justify-between px-4 py-3 text-sm ${
              i < summaryItems.length - 1 ? "border-b border-[#E5E1D8]" : ""
            }`}
          >
            <span className="text-[#5F5B55]">{label}</span>
            <span className="font-bold text-[#292929] text-right max-w-[55%] truncate">
              {value}
            </span>
          </div>
        ))}
      </div>
      <div className="rounded-2xl border border-[#d3eed8] bg-[#eefaf0] p-4 text-center">
        <Heart className="mx-auto mb-2 size-8 text-[#2c7b4c]" fill="#2c7b4c" />
        <p className="text-sm font-bold text-[#1f623a]">พร้อมเริ่มต้นใช้งาน!</p>
        <p className="mt-1 text-xs text-[#358253]">
          ระบบจะบันทึกข้อมูลและนำคุณไปยังหน้าแดชบอร์ด
        </p>
      </div>
    </div>
  );
}
