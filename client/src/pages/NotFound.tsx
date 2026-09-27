import { ArrowLeft, BookOpen, Compass, Home } from "lucide-react";
import { Link, useLocation } from "wouter";

export default function NotFound() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#262626] p-4 text-[#FFE7D0]">
      <div className="w-full max-w-md rounded-2xl border border-[#3D3D3D] bg-[#262626] p-8 sm:p-10 text-center shadow-[0_12px_36px_rgba(94,70,42,0.08)]">
        <div className="mx-auto mb-6 grid size-20 place-items-center rounded-2xl bg-[#262626] text-[#D9591A]">
          <Compass className="size-10 animate-pulse" strokeWidth={1.75} />
        </div>

        <p className="font-display text-4xl font-bold tracking-tight text-[#D9591A]">
          404
        </p>
        <h1 className="mt-2 font-display text-2xl font-semibold tracking-tight text-[#C9B8A8]">
          ไม่พบหน้าที่คุณต้องการ
        </h1>

        <p className="mt-3 text-sm leading-6 text-[#C9B8A8]">
          หน้าที่คุณกำลังค้นหาอาจถูกย้าย ลบออก หรือพิมพ์ที่อยู่ URL ไม่ถูกต้อง
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button
            onClick={() => setLocation("/")}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#D9591A] px-6 py-3 text-sm font-bold text-[#1B1B1B] shadow-sm transition hover:bg-[#FC6E20]"
          >
            <Home className="size-4" />
            กลับหน้าหลัก
          </button>
          <Link
            href="/updates"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#3D3D3D] bg-[#262626] px-6 py-3 text-sm font-bold text-[#C9B8A8] transition hover:bg-[#262626]"
          >
            <BookOpen className="size-4 text-[#D9591A]" />
            ข่าวสาร & กิจกรรม
          </Link>
        </div>
      </div>
    </div>
  );
}
