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
      <div className="min-h-dvh bg-paper p-6 text-center text-sm font-bold text-ink-3">
        กำลังตรวจสอบบัญชีผู้ใช้…
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-dvh bg-paper px-5 py-8">
        <div className="mx-auto max-w-lg">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-extrabold text-brand hover:underline"
          >
            <ArrowLeft className="size-4" />
            กลับหน้าหลัก
          </Link>
          <div className="bento-card mt-16 p-8 text-center">
            <div className="mx-auto grid size-16 place-items-center rounded-2xl border border-brand/40 bg-accent text-accent-foreground">
              <Bell className="size-8" />
            </div>
            <h1 className="mt-5 font-display text-2xl font-extrabold text-ink">
              ติดตามข่าวสารคริสตจักร
            </h1>
            <p className="mt-2 text-sm font-medium leading-6 text-ink-2">
              เข้าสู่ระบบเพื่อดูประกาศ กิจกรรม และข้อมูลอัปเดตสำหรับสมาชิก
            </p>
            <button
              onClick={startLogin}
              className="btn-primary mt-6 inline-flex min-h-11 items-center gap-2 px-6 py-3 text-sm"
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
      title="ข่าวสาร & กิจกรรม"
      subtitle="ติดตามสิ่งที่เกิดขึ้นในคริสตจักรและข้อมูลอัปเดตสำหรับสมาชิก"
    >
      <div className="space-y-6">
        <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <div className="grid size-12 place-items-center rounded-2xl border border-brand/40 bg-accent text-accent-foreground">
              <Megaphone className="size-6" />
            </div>
            <div>
              <h2 className="font-display text-xl font-extrabold text-ink">
                ประกาศและตารางกิจกรรม
              </h2>
              <p className="mt-0.5 text-xs font-medium text-ink-3">
                ข่าวสารการรับใช้ กิจกรรมพิเศษ และประกาศของคริสตจักร
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-line bg-surface px-3.5 py-1.5 text-xs font-extrabold text-ink-2">
            <span>อัปเดตเพื่อการมีส่วนร่วมในชุมชน</span>
          </div>
        </header>

        <div className="bento-card-static flex gap-2 p-1.5 sm:w-fit">
          <button
            onClick={() => setActiveTab("feed")}
            className={`min-h-11 rounded-xl px-5 py-2 text-sm transition-colors ${
              activeTab === "feed"
                ? "border border-brand/40 bg-accent text-accent-foreground font-extrabold "
                : "font-bold text-ink-3 hover:bg-paper-2 hover:text-ink"
            }`}
          >
            สำหรับสมาชิก
          </button>
          {canManage && (
            <button
              onClick={() => setActiveTab("manage")}
              className={`min-h-11 rounded-xl px-5 py-2 text-sm transition-colors ${
                activeTab === "manage"
                  ? "border border-brand/40 bg-accent text-accent-foreground font-extrabold "
                  : "font-bold text-ink-3 hover:bg-paper-2 hover:text-ink"
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
