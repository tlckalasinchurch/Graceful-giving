import { ArrowLeft, BookOpen, Compass, Home } from "lucide-react";
import { Link, useLocation } from "wouter";

export default function NotFound() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-canvas p-4 text-foreground">
      <div className="w-full max-w-md rounded-2xl border border-hairline bg-white p-8 sm:p-10 text-center shadow-[0_12px_36px_rgba(94,70,42,0.08)]">
        <div className="mx-auto mb-6 grid size-20 place-items-center rounded-2xl bg-surface-subtle text-warning">
          <Compass className="size-10 animate-pulse" strokeWidth={1.75} />
        </div>

        <p className="font-display text-4xl font-bold tracking-tight text-warning">
          404
        </p>
        <h1 className="mt-2 font-display text-2xl font-bold text-foreground">
          ไม่พบหน้าที่คุณต้องการ
        </h1>

        <p className="mt-3 text-sm leading-6 text-secondary-foreground">
          หน้าที่คุณกำลังค้นหาอาจถูกย้าย ลบออก หรือพิมพ์ที่อยู่ URL ไม่ถูกต้อง
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button
            onClick={() => setLocation("/")}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-bold text-white transition hover:bg-[#0071e3]"
          >
            <Home className="size-4" />
            กลับหน้าหลัก
          </button>
          <Link
            href="/updates"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-hairline bg-[#FFFFFF] px-6 py-3 text-sm font-bold text-secondary-foreground transition hover:bg-accent"
          >
            <BookOpen className="size-4 text-warning" />
            ข่าวสาร & กิจกรรม
          </Link>
        </div>
      </div>
    </div>
  );
}
