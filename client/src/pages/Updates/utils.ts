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

export interface UpdateNewsItem {
  id: number;
  title: string;
  summary: string;
  body: string;
  category: NewsCategory;
  status: string;
  publishedAt: Date | string | null;
  createdAt: Date | string;
}

export interface UpdateEventItem {
  id: number;
  title: string;
  summary: string;
  description: string | null;
  startsAt: Date | string;
  endsAt: Date | string | null;
  location: string | null;
  registrationUrl: string | null;
  status: string;
}

export interface ICSDownloadEvent {
  title: string;
  summary: string;
  description?: string | null;
  startsAt: Date | string;
  endsAt?: Date | string | null;
  location?: string | null;
}

export function downloadICS(event: ICSDownloadEvent, onDone: () => void) {
  const formatICSDate = (dateVal: Date | string) => {
    const d = new Date(dateVal);
    return d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  };

  const start = formatICSDate(event.startsAt);
  const end = event.endsAt
    ? formatICSDate(event.endsAt)
    : formatICSDate(new Date(new Date(event.startsAt).getTime() + 2 * 60 * 60 * 1000));

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
    `DESCRIPTION:${escapeICS((event.summary || "") + (event.description ? "\\n\\n" + event.description : ""))}`,
    event.location ? `LOCATION:${escapeICS(event.location)}` : "",
    "STATUS:CONFIRMED",
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter(Boolean);

  const blob = new Blob([icsLines.join("\\r\\n")], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${event.title.replace(/[\\s/\\\\?%*:|"<>]/g, "_")}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  onDone();
}
