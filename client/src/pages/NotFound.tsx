import { ArrowLeft, BookOpen, Compass, Home } from "lucide-react";
import { Link, useLocation } from "wouter";

export default function NotFound() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#FAF8F5] p-4 text-[#171311]">
      <div className="w-full max-w-md rounded-2xl border border-[#E7DCC8] bg-card p-8 sm:p-10 text-center shadow-sm">
        <div className="mx-auto mb-6 grid size-20 place-items-center rounded-2xl bg-[#FFF4D6] text-[#9F3B0F]">
          <Compass className="size-10 animate-pulse" strokeWidth={1.75} />
        </div>

        <p className="font-display text-4xl font-bold tracking-tight text-[#9F3B0F]">
          404
        </p>
        <h1 className="mt-2 font-display text-2xl font-bold text-[#171311]">
          ไม่พบหน้าที่คุณต้องการ
        </h1>

        <p className="mt-3 text-sm leading-6 text-[#51443A]">
          หน้าที่คุณกำลังค้นหาอาจถูกย้าย ลบออก หรือพิมพ์ที่อยู่ URL ไม่ถูกต้อง
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button
            onClick={() => setLocation("/")}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#9F3B0F] px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#C94F16] enabled:hover:-translate-y-0.5 enabled:hover:shadow-md active:translate-y-0 active:scale-[0.98] disabled:opacity-55 disabled:cursor-not-allowed"
          >
            <Home className="size-4" />
            กลับหน้าหลัก
          </button>
          <Link
            href="/updates"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#E7DCC8] bg-card px-6 py-3 text-sm font-bold text-[#51443A] transition hover:bg-[#FFF4D6]"
          >
            <BookOpen className="size-4 text-[#9F3B0F]" />
            ข่าวสาร & กิจกรรม
          </Link>
        </div>
      </div>
    </div>
  );
}
