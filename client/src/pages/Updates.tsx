import { useState } from "react";
import { startLogin } from "@/const";
import { useAuth } from "@/_core/hooks/useAuth";
import { AppLayout } from "@/components/layout/AppLayout";
import { canManageChurchSettings } from "@shared/roles";
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
  const canManage = canManageChurchSettings(user);

  if (loading) {
    return (
      <div className="min-h-dvh bg-paper p-6 text-center text-sm text-ink-3">
        กำลังตรวจสอบบัญชีผู้ใช้...
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-dvh bg-paper px-5 py-8">
        <div className="mx-auto max-w-lg">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-bold text-brand-ink hover:underline"
          >
            <ArrowLeft className="size-4" />
            กลับหน้าหลัก
          </Link>
          <div className="mt-16 rounded-2xl border border-line bg-surface p-8 text-center shadow-[0_12px_30px_rgba(94,70,42,0.07)]">
            <div className="mx-auto grid size-16 place-items-center rounded-2xl bg-paper-2 text-brand-ink">
              <Bell className="size-8" />
            </div>
            <h1 className="mt-5 font-display text-2xl font-bold text-ink-2">
              ติดตามข่าวสารคริสตจักร
            </h1>
            <p className="mt-2 text-sm leading-6 text-ink-2">
              เข้าสู่ระบบเพื่อดูประกาศ กิจกรรม และข้อมูลอัปเดตสำหรับสมาชิก
            </p>
            <button
              onClick={startLogin}
              className="mt-6 inline-flex min-h-[44px] items-center gap-2 rounded-full bg-brand-ink px-6 py-3 text-sm font-bold text-black shadow-sm hover:bg-brand active:scale-95 transition"
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
    <AppLayout
      activeRoute="/updates"
      eyebrow="Updates"
      title="ข่าวสาร & กิจกรรม"
      subtitle="ติดตามสิ่งที่เกิดขึ้นในคริสตจักรและข้อมูลอัปเดตสำหรับสมาชิก"
    >
      <div className="space-y-6">
        <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <div className="grid size-12 place-items-center rounded-2xl bg-[hsl(210_45%_13%)] text-[hsl(209_45%_72%)]">
              <Megaphone className="size-6" />
            </div>
            <div>
              <h2 className="font-display text-xl font-bold tracking-tight text-ink">
                ประกาศและตารางกิจกรรม
              </h2>
              <p className="mt-0.5 text-xs text-ink-3">
                ข่าวสารการรับใช้ กิจกรรมพิเศษ และประกาศของคริสตจักร
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-line bg-surface px-3.5 py-2 text-xs text-ink-2">
            <Sparkles className="size-4 text-brand-ink" />
            <span>อัปเดตเพื่อการมีส่วนร่วมในชุมชน</span>
          </div>
        </header>

        <div className="flex gap-2 rounded-2xl bg-surface border border-line p-1.5 sm:w-fit">
          <button
            onClick={() => setActiveTab("feed")}
            className={`min-h-11 rounded-xl px-5 py-2 text-sm font-bold transition-all ${
              activeTab === "feed"
                ? "bg-tile-lilac text-brand-ink shadow-xs"
                : "text-ink-3 hover:text-ink-2"
            }`}
          >
            สำหรับสมาชิก
          </button>
          {canManage && (
            <button
              onClick={() => setActiveTab("manage")}
              className={`min-h-11 rounded-xl px-5 py-2 text-sm font-bold transition-all ${
                activeTab === "manage"
                  ? "bg-tile-lilac text-brand-ink shadow-xs"
                  : "text-ink-3 hover:text-ink-2"
              }`}
            >
              <Settings2 className="mr-1.5 inline size-4" />
              จัดการเนื้อหา
            </button>
          )}
        </div>

        {activeTab === "feed" ? (
          <div>
            <MemberFeed />
          </div>
        ) : (
          <AdminManager />
        )}
      </div>
    </AppLayout>
  );
}
