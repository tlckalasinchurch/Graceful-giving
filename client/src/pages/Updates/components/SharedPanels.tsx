import { CalendarDays, Megaphone } from "lucide-react";

export function EmptyPanel({ type }: { type: "news" | "events" }) {
  return (
    <div className="rounded-2xl border border-dashed border-hairline bg-white/65 px-6 py-12 text-center">
      <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-accent text-muted-foreground">
        {type === "news" ? (
          <Megaphone className="size-7" strokeWidth={1.5} />
        ) : (
          <CalendarDays className="size-7" strokeWidth={1.5} />
        )}
      </div>
      <p className="mt-4 text-base font-bold text-[#4c392e]">
        {type === "news" ? "ยังไม่มีข่าวสารเผยแพร่" : "ยังไม่มีกิจกรรมที่กำลังจะมาถึง"}
      </p>
      <p className="mx-auto mt-1 max-w-sm text-sm leading-6 text-[#6a5649]">
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
      : "bg-[#fff0d2] text-[#916524]";
  const label =
    status === "published"
      ? "เผยแพร่แล้ว"
      : status === "cancelled"
      ? "ยกเลิก"
      : status === "archived"
      ? "เก็บถาวร"
      : "ฉบับร่าง";
  return (
    <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${styles}`}>
      {label}
    </span>
  );
}