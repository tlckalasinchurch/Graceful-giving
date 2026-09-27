import { ArrowLeft, BookOpen, Compass, Home } from "lucide-react";
import { Link, useLocation } from "wouter";

export default function NotFound() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#FAF8F5] p-4 text-[#2C2622]">
      <div className="w-full max-w-md rounded-2xl border border-[#E7DCC8] bg-white p-8 sm:p-10 text-center shadow-[0_12px_36px_rgba(94,70,42,0.08)]">
        <div className="mx-auto mb-6 grid size-20 place-items-center rounded-2xl bg-[#FFF8EA] text-[#0052A3]">
          <Compass className="size-10 animate-pulse" strokeWidth={1.75} />
        </div>

        <p className="font-display text-4xl font-bold tracking-tight text-[#0052A3]">
          404
        </p>
        <h1 className="mt-2 font-display text-2xl font-bold text-[#3F3833]">
          ไม่พบหน้าที่คุณต้องการ
        </h1>

        <p className="mt-3 text-sm leading-6 text-[#51443A]">
          หน้าที่คุณกำลังค้นหาอาจถูกย้าย ลบออก หรือพิมพ์ที่อยู่ URL ไม่ถูกต้อง
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button
            onClick={() => setLocation("/")}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0052A3] px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#0066CC]"
          >
            <Home className="size-4" />
            กลับหน้าหลัก
          </button>
          <Link
            href="/updates"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#E7DCC8] bg-[#FFFFFF] px-6 py-3 text-sm font-bold text-[#51443A] transition hover:bg-[#FFF8EA]"
          >
            <BookOpen className="size-4 text-[#0052A3]" />
            ข่าวสาร & กิจกรรม
          </Link>
        </div>
      </div>
    </div>
  );
}
