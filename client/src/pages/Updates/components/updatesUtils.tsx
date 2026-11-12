import React from "react";
import { toast } from "sonner";
import { CalendarDays, Clock3, Megaphone, Send } from "lucide-react";
import { THAI_LOCALE } from "@/lib/format";

export const categoryLabels = {
  announcement: "ประกาศ",
  ministry: "พันธกิจ",
  finance: "การเงิน",
  pastoral: "การอภิบาล",
} as const;

export type NewsCategory = keyof typeof categoryLabels;

export const formatThaiDate = (value: Date | string) =>
  new Intl.DateTimeFormat(THAI_LOCALE, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));

export const formatEventDate = (value: Date | string) =>
  new Intl.DateTimeFormat(THAI_LOCALE, {
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
    <div className="rounded-2xl border border-dashed border-line bg-paper-2 px-6 py-12 text-center">
      <div className="mx-auto grid size-14 place-items-center rounded-2xl border border-[var(--ink)] bg-surface text-brand">
        {type === "news" ? (
          <Megaphone className="size-7" strokeWidth={1.75} />
        ) : (
          <CalendarDays className="size-7" strokeWidth={1.75} />
        )}
      </div>
      <p className="mt-4 text-base font-extrabold text-ink">
        {type === "news"
          ? "ยังไม่มีข่าวสารเผยแพร่"
          : "ยังไม่มีกิจกรรมที่กำลังจะมาถึง"}
      </p>
      <p className="mx-auto mt-1 max-w-sm text-sm font-medium leading-6 text-ink-2">
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
      ? "border border-line bg-tile-mint text-tile-mint-ink"
      : status === "cancelled" || status === "archived"
        ? "border border-line bg-paper-2 text-ink-3"
        : "border border-line bg-tile-sand text-tile-sand-ink";
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
      className={`rounded-full px-2.5 py-1 text-xs font-extrabold ${styles}`}
    >
      {" "}
      {label}{" "}
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
    <label className="block text-xs font-extrabold text-ink-2">
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
        className="btn-secondary min-h-11 py-3 text-sm"
      >
        ยกเลิก
      </button>
      <button
        type="submit"
        disabled={pending}
        className="btn-primary inline-flex min-h-11 items-center justify-center gap-2 py-3 text-sm disabled:opacity-60"
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
