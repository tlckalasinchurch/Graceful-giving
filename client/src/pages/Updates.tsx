import { useState } from "react";
import { startLogin } from "@/const";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  ArrowLeft,
  Bell,
  Megaphone,
  Settings2,
  UsersRound,
} from "lucide-react";
import { Link } from "wouter";
import { AppLayout } from "@/components/layout/AppLayout";
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
    <AppLayout
      title="ข่าวสารและกิจกรรม"
      subtitle="ประกาศ ข่าวสาร และกิจกรรมที่กำลังจะมาถึงของคริสตจักร"
    >
      {canManage && (
        <div
          role="tablist"
          aria-label="มุมมองข่าวสาร"
          className="grid grid-cols-2 gap-1 rounded-xl border border-border bg-muted p-1 sm:w-fit"
        >
          {(
            [
              ["feed", "สำหรับสมาชิก", Megaphone],
              ["manage", "จัดการเนื้อหา", Settings2],
            ] as const
          ).map(([id, label, Icon]) => {
            const active = activeTab === id;
            return (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setActiveTab(id)}
                className={`inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg px-4 text-sm transition-colors ${
                  active
                    ? "bg-card font-semibold text-foreground shadow-xs"
                    : "font-medium text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="size-4" aria-hidden="true" />
                {label}
              </button>
            );
          })}
        </div>
      )}

      {activeTab === "feed" || !canManage ? <MemberFeed /> : <AdminManager />}
    </AppLayout>
  );
}
