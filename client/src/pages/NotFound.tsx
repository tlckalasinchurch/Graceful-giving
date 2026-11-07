import { BookOpen, Compass, Home } from "lucide-react";
import { Link, useLocation } from "wouter";

export default function NotFound() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-dvh w-full flex items-center justify-center bg-ground p-4 text-ink">
      <div className="bento-card w-full max-w-md p-8 sm:p-10 text-center">
        <div className="mx-auto mb-6 grid size-20 place-items-center rounded-2xl border-2 border-[var(--ink)] bg-accent text-accent-foreground shadow-[3px_3px_0_var(--ink)]">
          <Compass
            className="size-10 text-brand animate-pulse"
            strokeWidth={2}
          />
        </div>

        <p className="font-display text-4xl font-extrabold text-brand">404</p>
        <h1 className="mt-2 font-display text-2xl font-extrabold text-ink">
          ไม่พบหน้าที่คุณต้องการ
        </h1>

        <p className="mt-3 text-sm leading-6 text-ink-2">
          หน้าที่คุณกำลังค้นหาอาจถูกย้าย ลบออก หรือพิมพ์ที่อยู่ URL ไม่ถูกต้อง
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button
            onClick={() => setLocation("/")}
            className="btn-primary inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-extrabold"
          >
            <Home className="size-4" />
            กลับหน้าหลัก
          </button>
          <Link
            href="/updates"
            className="btn-secondary inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-bold"
          >
            <BookOpen className="size-4 text-brand" />
            ข่าวสาร & กิจกรรม
          </Link>
        </div>
      </div>
    </div>
  );
}
