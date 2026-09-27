import React from "react";
import { toast } from "sonner";
import { CalendarDays, Clock3, Megaphone, Send } from "lucide-react";

export const categoryLabels = {
  announcement: "ประกาศ",
  ministry: "พันธกิจ",
  finance: "การเงิน",
  pastoral: "การอภิบาล",
} as const;

export type NewsCategory = keyof typeof categoryLabels;

export const formatThaiDate = (value: Date | string) =>
  new Intl.DateTimeFormat("th-TH", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));

export const formatEventDate = (value: Date | string) =>
  new Intl.DateTimeFormat("th-TH", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));

export const toDateTimeLocal = (value: Date | string) => {
  const date = new Date(value);
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

export function downloadICS(event: {
  title: string;
  summary: string;
  description?: string;
  startsAt: Date | string;
  endsAt?: Date | string | null;
  location?: string | null;
}) {
  const formatICSDate = (dateVal: Date | string) => {
    const d = new Date(dateVal);
    return d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  };

  const start = formatICSDate(event.startsAt);
  const end = event.endsAt
    ? formatICSDate(event.endsAt)
    : formatICSDate(
        new Date(new Date(event.startsAt).getTime() + 2 * 60 * 60 * 1000)
      );

  const escapeICS = (str: string) =>
    str
      .replace(/\\/g, "\\\\")
      .replace(/;/g, "\\;")
      .replace(/,/g, "\\,")
      .replace(/\n/g, "\\n");

  const icsLines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Grace-giving//Church Events//TH",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${Date.now()}@grace-giving.local`,
    `DTSTAMP:${formatICSDate(new Date())}`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:${escapeICS(event.title)}`,
    `DESCRIPTION:${escapeICS((event.summary || "") + (event.description ? "\n\n" + event.description : ""))}`,
    event.location ? `LOCATION:${escapeICS(event.location)}` : "",
    "STATUS:CONFIRMED",
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter(Boolean);

  const blob = new Blob([icsLines.join("\r\n")], {
    type: "text/calendar;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${event.title.replace(/[\s/\\?%*:|"<>]/g, "_")}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  toast.success(
    "ดาวน์โหลดไฟล์ปฏิทิน (.ics) เรียบร้อย สามารถนำเข้า Google Calendar หรือ Apple Calendar ได้ทันที"
  );
}

export function EmptyPanel({ type }: { type: "news" | "events" }) {
  return (
    <div className="rounded-2xl border border-dashed border-[#E5E1D8] bg-white/65 px-6 py-12 text-center">
      <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-[#F1EFE9] text-[#F97316]">
        {type === "news" ? (
          <Megaphone className="size-7" strokeWidth={1.5} />
        ) : (
          <CalendarDays className="size-7" strokeWidth={1.5} />
        )}
      </div>
      <p className="mt-4 text-base font-bold text-[#292929]">
        {type === "news"
          ? "ยังไม่มีข่าวสารเผยแพร่"
          : "ยังไม่มีกิจกรรมที่กำลังจะมาถึง"}
      </p>
      <p className="mx-auto mt-1 max-w-sm text-sm leading-6 text-[#5F5B55]">
        {type === "news"
          ? "เมื่อมีประกาศใหม่ สมาชิกจะเห็นได้ที่หน้านี้ทันที"
          : "กิจกรรมของคริสตจักรจะแสดงที่นี่เพื่อให้สมาชิกวางแผนได้ง่ายขึ้น"}
      </p>
    </div>
  );
}

export function StatusPill({ status }: { status: string }) {
  const styles =
    status === "published"
      ? "bg-[#e6f4e8] text-[#2c7244]"
      : status === "cancelled" || status === "archived"
        ? "bg-[#f9e5e2] text-[#aa4e46]"
        : "bg-[#FFF0DD] text-[#F97316]";
  const label =
    status === "published"
      ? "เผยแพร่แล้ว"
      : status === "cancelled"
        ? "ยกเลิก"
        : status === "archived"
          ? "เก็บถาวร"
          : "ฉบับร่าง";
  return (
    <span
      className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${styles}`}
    >
      {label}
    </span>
  );
}

export function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block text-xs font-bold text-[#5F5B55]">
      {label}
      <span className="mt-1.5 block">{children}</span>
    </label>
  );
}

export function SubmitButtons({
  pending,
  onCancel,
  label,
}: {
  pending: boolean;
  onCancel: () => void;
  label: string;
}) {
  return (
    <div className="mt-6 grid grid-cols-2 gap-3">
      <button
        type="button"
        onClick={onCancel}
        className="min-h-[44px] rounded-xl border border-[#E5E1D8] py-3 text-sm font-bold text-[#5F5B55] hover:bg-[#F1EFE9]"
      >
        ยกเลิก
      </button>
      <button
        type="submit"
        disabled={pending}
        className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-[#D95E0B] py-3 text-sm font-bold text-[#171717] hover:bg-[#F97316] disabled:opacity-60 shadow-sm"
      >
        {pending ? (
          <Clock3 className="size-4 animate-spin" />
        ) : (
          <Send className="size-4" />
        )}
        {pending ? "กำลังบันทึก..." : label}
      </button>
    </div>
  );
}
