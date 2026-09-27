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
      <div className="min-h-screen bg-background p-6 text-center text-sm text-muted-foreground">
        กำลังตรวจสอบบัญชีผู้ใช้...
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background px-5 py-8">
        <div className="mx-auto max-w-lg">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-bold text-primary-strong hover:underline"
          >
            <ArrowLeft className="size-4" />
            กลับหน้าหลัก
          </Link>
          <div className="mt-16 rounded-2xl border border-border bg-card p-8 text-center shadow-[0_12px_30px_rgba(94,70,42,0.07)]">
            <div className="mx-auto grid size-16 place-items-center rounded-2xl bg-muted text-primary-strong">
              <Bell className="size-8" />
            </div>
            <h1 className="mt-5 font-display text-2xl font-bold text-foreground-soft">
              ติดตามข่าวสารคริสตจักร
            </h1>
            <p className="mt-2 text-sm leading-6 text-foreground-soft">
              เข้าสู่ระบบเพื่อดูประกาศ กิจกรรม และข้อมูลอัปเดตสำหรับสมาชิก
            </p>
            <button
              onClick={startLogin}
              className="mt-6 inline-flex min-h-[44px] items-center gap-2 rounded-full bg-primary-strong px-6 py-3 text-sm font-bold text-white shadow-sm hover:bg-primary active:scale-95 transition"
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
    <div className="min-h-screen bg-background pb-16 text-foreground">
      <div className="mx-auto max-w-[var(--content-max)] px-5 py-6 sm:px-8 lg:py-10">
        <header className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
          <div>
            <Link
              href="/"
              className="inline-flex min-h-11 items-center gap-2 text-xs font-bold text-primary-strong hover:underline"
            >
              <ArrowLeft className="size-4" />
              กลับหน้าหลัก
            </Link>
            <div className="mt-4 flex items-center gap-3">
              <div className="grid size-12 place-items-center rounded-2xl bg-info-soft text-info">
                <Megaphone className="size-6" />
              </div>
              <div>
                <h1 className="font-display text-3xl font-bold tracking-tight text-foreground-soft">
                  ข่าวสาร & กิจกรรม
                </h1>
                <p className="mt-1 text-sm text-foreground-soft">
                  ติดตามสิ่งที่เกิดขึ้นในคริสตจักรบ้านแห่งพระคุณ
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-divider bg-white/75 px-3.5 py-2 text-xs text-foreground-soft">
            <Sparkles className="size-4 text-primary-strong" />
            <span>อัปเดตเพื่อการมีส่วนร่วมในชุมชน</span>
          </div>
        </header>

        <div className="mt-8 flex gap-2 rounded-2xl bg-divider p-1.5 sm:w-fit">
          <button
            onClick={() => setActiveTab("feed")}
            className={`min-h-11 rounded-xl px-5 py-2 text-sm font-bold transition-all ${
              activeTab === "feed"
                ? "bg-card text-primary-strong shadow-sm"
                : "text-muted-foreground hover:text-foreground-soft"
            }`}
          >
            สำหรับสมาชิก
          </button>
          {canManage && (
            <button
              onClick={() => setActiveTab("manage")}
              className={`min-h-11 rounded-xl px-5 py-2 text-sm font-bold transition-all ${
                activeTab === "manage"
                  ? "bg-card text-primary-strong shadow-sm"
                  : "text-muted-foreground hover:text-foreground-soft"
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
