import React from "react";
import { AlertTriangle, Calendar, Check, HandCoins, Heart, Info, ShieldCheck, WalletCards } from "lucide-react";
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
    <label className="mb-1.5 block text-xs font-extrabold text-ink">
      {children} {required && <span className="text-danger">*</span>}
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
        className="neo-input w-full px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-3 disabled:opacity-60"
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
          className="neo-input w-full px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-3 resize-none"
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
          placeholder="contact@church.or.th"
          type="email"
        />
      </div>
      <TextField
        label="เว็บไซต์"
        value={data.website}
        onChange={v => set({ website: v })}
        placeholder="https://www.church.or.th"
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
        placeholder="ชื่อ นามสกุล"
      />
      <div>
        <FieldLabel>ข้อพระคัมภีร์หรือคติพจน์ของคริสตจักร</FieldLabel>
        <textarea
          value={data.motto}
          onChange={e => set({ motto: e.target.value })}
          placeholder="เช่น 2 โครินธ์ 9:7 · ผู้ให้ด้วยใจยินดี พระเจ้าทรงรัก"
          rows={2}
          className="neo-input w-full px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-3 resize-none"
        />
      </div>
      <div className="rounded-2xl border-[1.5px] border-[var(--ink)] bg-paper-2 p-4">
        <p className="flex items-center gap-1.5 text-xs font-extrabold text-ink">
          <Info className="size-3.5 text-brand" aria-hidden="true" />
          เกี่ยวกับบทบาทผู้ใช้
        </p>
        <p className="mt-1 text-xs text-ink-2">
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
          className="border-line text-ink focus:border-brand"
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
      <TextField
        label="หมายเลขพร้อมเพย์ (PromptPay ID — เบอร์โทร 10 หลัก หรือเลขนิติบุคคล 13 หลัก)"
        value={data.promptPayId ?? ""}
        onChange={v => set({ promptPayId: v })}
        placeholder="08X-XXX-XXXX หรือเลขประจำตัว 13 หลัก (ไม่บังคับ)"
      />
      <div className="rounded-2xl border-[1.5px] border-[var(--ink)] bg-paper-2 p-4">
        <p className="flex items-center gap-1.5 text-xs font-extrabold text-ink">
          <ShieldCheck className="size-3.5 text-income" aria-hidden="true" />
          ความปลอดภัย
        </p>
        <p className="mt-1 text-xs text-ink-2">
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
      <p className="text-sm text-ink-2">
        เลือกหมวดหมู่การถวายที่คริสตจักรของคุณใช้งาน:
      </p>
      <div className="grid grid-cols-2 gap-2.5">
        {DEFAULT_OFFERING_CATEGORIES.map(cat => {
          const selected = data.offeringCategories.includes(cat);
          return (
            <button
              key={cat}
              type="button"
              onClick={() => toggleCat(cat)}
              className={`flex min-h-[48px] items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-bold transition ${
                selected
                  ? "border-2 border-[var(--ink)] bg-accent text-accent-foreground shadow-[2px_2px_0_var(--ink)]"
                  : "border-[1.5px] border-[var(--ink)]/30 bg-surface text-ink-2 hover:bg-paper-2"
              }`}
            >
              <span
                className={`grid size-5 shrink-0 place-items-center rounded-md border border-[var(--ink)]/30 ${
                  selected ? "bg-brand text-white" : "bg-paper-2"
                }`}
              >
                {selected ? (
                  <Check className="size-3" />
                ) : (
                  <HandCoins className="size-3 text-brand" />
                )}
              </span>
              {cat}
            </button>
          );
        })}
      </div>
      {data.offeringCategories.length === 0 && (
        <p className="flex items-center gap-1.5 text-xs font-bold text-danger">
          <AlertTriangle className="size-3.5 shrink-0" aria-hidden="true" />
          กรุณาเลือกอย่างน้อย 1 หมวดหมู่
        </p>
      )}
    </div>
  );
}

export function Step5({ data }: { data: SetupData }) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-ink-2">
        กองทุนเริ่มต้นที่แนะนำสำหรับคริสตจักร:
      </p>
      {data.funds.map((fund, i) => (
        <div
          key={i}
          className="flex items-center gap-3 rounded-2xl border-[1.5px] border-[var(--ink)] bg-surface p-3.5 shadow-[2px_2px_0_var(--ink)]"
        >
          <div className="grid size-10 shrink-0 place-items-center rounded-xl border border-[var(--ink)] bg-paper-2 text-brand">
            <WalletCards className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-extrabold text-ink">{fund.name}</p>
            <p className="text-xs text-ink-2">{fund.description}</p>
          </div>
          <Check className="size-4 shrink-0 text-income" />
        </div>
      ))}
      <div className="rounded-2xl border-[1.5px] border-[var(--ink)] bg-paper-2 p-4">
        <p className="flex items-center gap-1.5 text-xs font-extrabold text-ink">
          <Info className="size-3.5 text-brand" aria-hidden="true" />
          สามารถเพิ่มกองทุนเพิ่มเติมได้ภายหลัง
        </p>
        <p className="mt-1 text-xs text-ink-2">จากหน้าการเงิน → จัดการกองทุน</p>
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
          className="border-line text-ink focus:border-brand"
        >
          {THAI_MONTHS.map((m, i) => (
            <option key={i + 1} value={i + 1}>
              {m}
            </option>
          ))}
        </NativeSelect>
        <p className="mt-1.5 text-xs text-ink-3">
          ปีงบประมาณจะเริ่มจาก{THAI_MONTHS[data.fiscalYearStartMonth - 1]}
          ของทุกปี
        </p>
      </div>
      <div>
        <FieldLabel required>ปีงบประมาณปัจจุบัน (ค.ศ.)</FieldLabel>
        <input
          type="number"
          value={data.budgetYear}
          onChange={e => set({ budgetYear: Number(e.target.value) })}
          min={2000}
          max={2100}
          className="neo-input w-full px-3.5 py-2.5 text-sm text-ink"
        />
      </div>
      <div className="rounded-2xl border-[1.5px] border-[var(--ink)] bg-paper-2 p-4 space-y-2">
        <p className="flex items-center gap-1.5 text-xs font-extrabold text-ink">
          <Calendar className="size-3.5 text-brand" aria-hidden="true" />
          ตัวอย่างรอบปีงบประมาณ
        </p>
        <p className="text-xs text-ink-2">
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
      color: "bg-danger/10 text-danger border border-danger/25",
    },
    {
      role: "PASTOR",
      label: "ศิษยาภิบาล / ผู้นำ",
      desc: "ดูรายงานการเงิน อนุมัติคำขอ แต่ไม่เห็นชื่อผู้ถวาย",
      color: "bg-tile-sky text-tile-sky-ink border border-tile-sky-ink/20",
    },
    {
      role: "TREASURER",
      label: "เหรัญญิก / ผู้ดูแลการเงิน",
      desc: "บันทึกและดูรายการทั้งหมด รวมถึงชื่อผู้ถวาย",
      color: "bg-brand/10 text-brand border border-brand/25",
    },
    {
      role: "MEMBER",
      label: "สมาชิกทั่วไป",
      desc: "ดูยอดรวมและสร้างคำขอเบิก แต่ไม่เห็นรายละเอียดผู้ถวาย",
      color: "bg-paper-2 text-brand border border-[var(--ink)]/20",
    },
  ];
  return (
    <div className="space-y-3">
      <p className="text-sm text-ink-2">
        ระบบมี 4 บทบาทหลัก ผู้ดูแลระบบสามารถกำหนดให้ผู้ใช้แต่ละคนได้:
      </p>
      {roles.map(({ role, label, desc, color }) => (
        <div
          key={role}
          className="flex items-start gap-3 rounded-2xl border-[1.5px] border-[var(--ink)] bg-surface p-3.5 shadow-[2px_2px_0_var(--ink)]"
        >
          <span
            className={`inline-flex shrink-0 items-center rounded-lg px-2.5 py-1 text-xs font-extrabold ${color}`}
          >
            {role}
          </span>
          <div>
            <p className="text-sm font-extrabold text-ink">{label}</p>
            <p className="text-xs text-ink-2">{desc}</p>
          </div>
        </div>
      ))}
      <div className="rounded-2xl border-[1.5px] border-[var(--ink)] bg-paper-2 p-4">
        <p className="flex items-center gap-1.5 text-xs font-extrabold text-ink">
          <ShieldCheck className="size-3.5 text-income" aria-hidden="true" />
          การกำหนดสิทธิ์
        </p>
        <p className="mt-1 text-xs text-ink-2">
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
      <div className="rounded-2xl border-[1.5px] border-[var(--ink)] bg-surface overflow-hidden">
        {summaryItems.map(({ label, value }, i) => (
          <div
            key={label}
            className={`flex items-center justify-between px-4 py-3 text-sm ${
              i < summaryItems.length - 1 ? "border-b border-line" : ""
            }`}
          >
            <span className="text-ink-2">{label}</span>
            <span className="font-extrabold text-ink text-right max-w-[55%] truncate">
              {value}
            </span>
          </div>
        ))}
      </div>
      <div className="rounded-2xl border-2 border-[var(--ink)] bg-accent p-4 text-center shadow-[3px_3px_0_var(--ink)]">
        <Heart
          className="mx-auto mb-2 size-8 text-brand"
          fill="currentColor"
        />
        <p className="text-sm font-extrabold text-accent-foreground">
          พร้อมเริ่มต้นใช้งาน!
        </p>
        <p className="mt-1 text-xs font-medium text-accent-foreground/80">
          ระบบจะบันทึกข้อมูลและนำคุณไปยังหน้าแดชบอร์ด
        </p>
      </div>
    </div>
  );
}
