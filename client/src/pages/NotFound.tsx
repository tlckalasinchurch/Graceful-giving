import { ArrowLeft, BookOpen, Compass, Home } from "lucide-react";
import { Link, useLocation } from "wouter";

export default function NotFound() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-paper p-4 text-ink">
      <div className="w-full max-w-md rounded-2xl border border-line bg-white p-8 sm:p-10 text-center shadow-[0_12px_36px_rgba(94,70,42,0.08)]">
        <div className="mx-auto mb-6 grid size-20 place-items-center rounded-2xl bg-paper-2 text-brand-ink">
          <Compass className="size-10 animate-pulse" strokeWidth={1.75} />
        </div>

        <p className="font-display text-4xl font-bold tracking-tight text-brand-ink">
          404
        </p>
        <h1 className="mt-2 font-display text-2xl font-bold text-ink-2">
          ไม่พบหน้าที่คุณต้องการ
        </h1>

        <p className="mt-3 text-sm leading-6 text-ink-2">
          หน้าที่คุณกำลังค้นหาอาจถูกย้าย ลบออก หรือพิมพ์ที่อยู่ URL ไม่ถูกต้อง
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button
            onClick={() => setLocation("/")}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-ink px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-brand"
          >
            <Home className="size-4" />
            กลับหน้าหลัก
          </button>
          <Link
            href="/updates"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-line bg-white px-6 py-3 text-sm font-bold text-ink-2 transition hover:bg-paper-2"
          >
            <BookOpen className="size-4 text-brand-ink" />
            ข่าวสาร & กิจกรรม
          </Link>
        </div>
      </div>
    </div>
  );
}
