import { useState } from "react";
import { startLogin } from "@/const";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Bell, Settings2, Sparkles, UsersRound } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { MemberFeed } from "./Updates/components/MemberFeed";
import { AdminManager } from "./Updates/components/AdminManager";

export default function Updates() {
  const { user, isAuthenticated, loading } = useAuth();
  const [activeTab, setActiveTab] = useState<"feed" | "manage">("feed");
  const canManage = user?.role === "admin";
  // Mirrors the fallback chain AppLayout uses for the same value, so the
  // church's actual name shows here too instead of a fixed placeholder.
  const { data: churchProfile } = trpc.church.getProfile.useQuery(undefined, {
    retry: false,
    staleTime: 60_000,
    enabled: isAuthenticated,
  });
  const churchName =
    churchProfile?.name || user?.name || "คริสตจักรพระคุณสมบูรณ์";

  if (loading) {
    return (
      <AppLayout title="ข่าวสาร & กิจกรรม">
        <p className="text-sm text-[#8F8477]">กำลังตรวจสอบบัญชีผู้ใช้...</p>
      </AppLayout>
    );
  }

  if (!isAuthenticated) {
    return (
      <AppLayout title="ข่าวสาร & กิจกรรม">
        <div className="mx-auto max-w-lg rounded-2xl border border-[#3D3D3D] bg-[#262626] p-8 text-center shadow-xs">
          <div className="mx-auto grid size-16 place-items-center rounded-2xl bg-[#3D2A1A] text-[#D9591A]">
            <Bell className="size-8" aria-hidden="true" />
          </div>
          <h2 className="mt-5 text-2xl font-semibold tracking-tight text-[#FFE7D0]">
            ติดตามข่าวสารคริสตจักร
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-[#C9B8A8]">
            เข้าสู่ระบบเพื่อดูประกาศ กิจกรรม และข้อมูลอัปเดตสำหรับสมาชิก
          </p>
          <button
            onClick={startLogin}
            className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-full bg-[#FC6E20] hover:bg-[#D9591A] px-6 py-3 text-sm font-bold text-[#1B1B1B] shadow-sm transition-colors active:scale-95"
          >
            <UsersRound className="size-4" aria-hidden="true" />
            เข้าสู่ระบบ
          </button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      title="ข่าวสาร & กิจกรรม"
      subtitle={`ติดตามสิ่งที่เกิดขึ้นใน${churchName}`}
    >
      <div className="flex w-fit items-center gap-2 rounded-full border border-[#3D3D3D] bg-[#262626] px-3.5 py-2 text-xs text-[#C9B8A8]">
        <Sparkles className="size-4 text-[#FC6E20]" aria-hidden="true" />
        <span>อัปเดตเพื่อการมีส่วนร่วมในชุมชน</span>
      </div>

      <div
        role="group"
        aria-label="มุมมองข่าวสาร"
        className="flex w-fit gap-2 rounded-2xl border border-[#3D3D3D] bg-[#262626] p-1.5"
      >
        <button
          type="button"
          onClick={() => setActiveTab("feed")}
          aria-pressed={activeTab === "feed"}
          className={`min-h-11 rounded-xl border px-5 py-2 text-sm font-bold transition-colors ${
            activeTab === "feed"
              ? "border-[#6B4426] bg-[#3D2A1A] text-[#D9591A]"
              : "border-transparent text-[#8F8477] hover:text-[#C9B8A8]"
          }`}
        >
          สำหรับสมาชิก
        </button>
        {canManage && (
          <button
            type="button"
            onClick={() => setActiveTab("manage")}
            aria-pressed={activeTab === "manage"}
            className={`min-h-11 rounded-xl border px-5 py-2 text-sm font-bold transition-colors ${
              activeTab === "manage"
                ? "border-[#6B4426] bg-[#3D2A1A] text-[#D9591A]"
                : "border-transparent text-[#8F8477] hover:text-[#C9B8A8]"
            }`}
          >
            <Settings2 className="mr-1.5 inline size-4" aria-hidden="true" />
            จัดการเนื้อหา
          </button>
        )}
      </div>

      {activeTab === "feed" ? <MemberFeed /> : <AdminManager />}
    </AppLayout>
  );
}
