import { useState } from "react";
import { startLogin } from "@/const";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  ArrowLeft,
  Bell,
  Megaphone,
  Settings2,
  Sparkles,
  UsersRound,
} from "lucide-react";
import { Link } from "wouter";
import { MemberFeed } from "./Updates/components/MemberFeed";
import { AdminManager } from "./Updates/components/AdminManager";

export default function Updates() {
  const { user, isAuthenticated, loading } = useAuth();
  const [activeTab, setActiveTab] = useState<"feed" | "manage">("feed");
  const canManage = user?.role === "admin";

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] p-6 text-center text-sm text-[#6E6155]">
        กำลังตรวจสอบบัญชีผู้ใช้...
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] px-5 py-8">
        <div className="mx-auto max-w-lg">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-bold text-[#9F3B0F] hover:underline"
          >
            <ArrowLeft className="size-4" />
            กลับหน้าหลัก
          </Link>
          <div className="mt-16 rounded-2xl border border-[#E7DCC8] bg-card p-8 text-center shadow-sm">
            <div className="mx-auto grid size-16 place-items-center rounded-2xl bg-[#FFF4D6] text-[#9F3B0F]">
              <Bell className="size-8" />
            </div>
            <h1 className="mt-5 font-display text-2xl font-bold text-[#51443A]">
              ติดตามข่าวสารคริสตจักร
            </h1>
            <p className="mt-2 text-sm leading-6 text-[#51443A]">
              เข้าสู่ระบบเพื่อดูประกาศ กิจกรรม และข้อมูลอัปเดตสำหรับสมาชิก
            </p>
            <button
              onClick={startLogin}
              className="mt-6 inline-flex min-h-[44px] items-center gap-2 rounded-full bg-[#9F3B0F] px-6 py-3 text-sm font-bold text-white shadow-sm hover:bg-[#C94F16] active:scale-95 transition"
            >
              <UsersRound className="size-4" />
              เข้าสู่ระบบ
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF8F5] pb-16 text-[#171311]">
      <div className="mx-auto max-w-[var(--content-max)] px-5 py-6 sm:px-8 lg:py-10">
        <header className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
          <div>
            <Link
              href="/"
              className="inline-flex min-h-11 items-center gap-2 text-xs font-bold text-[#9F3B0F] hover:underline"
            >
              <ArrowLeft className="size-4" />
              กลับหน้าหลัก
            </Link>
            <div className="mt-4 flex items-center gap-3">
              <div className="grid size-12 place-items-center rounded-2xl bg-[#e7f1fb] text-[#3c6f9e]">
                <Megaphone className="size-6" />
              </div>
              <div>
                <h1 className="font-display text-3xl font-bold tracking-tight text-[#51443A]">
                  ข่าวสาร & กิจกรรม
                </h1>
                <p className="mt-1 text-sm text-[#51443A]">
                  ติดตามสิ่งที่เกิดขึ้นในคริสตจักรบ้านแห่งพระคุณ
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-[#EFE5D3] bg-white/75 px-3.5 py-2 text-xs text-[#51443A]">
            <Sparkles className="size-4 text-[#9F3B0F]" />
            <span>อัปเดตเพื่อการมีส่วนร่วมในชุมชน</span>
          </div>
        </header>

        <div className="mt-8 flex gap-2 rounded-2xl bg-[#F1E6D2] p-1.5 sm:w-fit">
          <button
            onClick={() => setActiveTab("feed")}
            className={`min-h-11 rounded-xl px-5 py-2 text-sm font-bold transition-all ${
              activeTab === "feed"
                ? "bg-card text-[#9F3B0F] shadow-sm"
                : "text-[#6E6155] hover:text-[#51443A]"
            }`}
          >
            สำหรับสมาชิก
          </button>
          {canManage && (
            <button
              onClick={() => setActiveTab("manage")}
              className={`min-h-11 rounded-xl px-5 py-2 text-sm font-bold transition-all ${
                activeTab === "manage"
                  ? "bg-card text-[#9F3B0F] shadow-sm"
                  : "text-[#6E6155] hover:text-[#51443A]"
              }`}
            >
              <Settings2 className="mr-1.5 inline size-4" />
              จัดการเนื้อหา
            </button>
          )}
        </div>

        {activeTab === "feed" ? (
          <div className="mt-8">
            <MemberFeed />
          </div>
        ) : (
          <AdminManager />
        )}
      </div>
    </div>
  );
}
