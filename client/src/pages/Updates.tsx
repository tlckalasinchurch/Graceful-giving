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
        <p className="text-sm text-[#807266]">กำลังตรวจสอบบัญชีผู้ใช้...</p>
      </AppLayout>
    );
  }

  if (!isAuthenticated) {
    return (
      <AppLayout title="ข่าวสาร & กิจกรรม">
        <div className="mx-auto max-w-lg rounded-2xl border border-[#E7DCC8] bg-white p-8 text-center shadow-xs">
          <div className="mx-auto grid size-16 place-items-center rounded-2xl bg-[#CFE4FA] text-[#0052A3]">
            <Bell className="size-8" aria-hidden="true" />
          </div>
          <h2 className="mt-5 text-2xl font-semibold tracking-tight text-[#171311]">
            ติดตามข่าวสารคริสตจักร
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-[#51443A]">
            เข้าสู่ระบบเพื่อดูประกาศ กิจกรรม และข้อมูลอัปเดตสำหรับสมาชิก
          </p>
          <button
            onClick={startLogin}
            className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-full bg-[#0066CC] hover:bg-[#0052A3] px-6 py-3 text-sm font-bold text-white shadow-sm transition-colors active:scale-95"
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
      <div className="flex w-fit items-center gap-2 rounded-full border border-[#E7DCC8] bg-white px-3.5 py-2 text-xs text-[#51443A]">
        <Sparkles className="size-4 text-[#0066CC]" aria-hidden="true" />
        <span>อัปเดตเพื่อการมีส่วนร่วมในชุมชน</span>
      </div>

      <div
        role="group"
        aria-label="มุมมองข่าวสาร"
        className="flex w-fit gap-2 rounded-2xl border border-[#E7DCC8] bg-[#FFF8EA] p-1.5"
      >
        <button
          type="button"
          onClick={() => setActiveTab("feed")}
          aria-pressed={activeTab === "feed"}
          className={`min-h-11 rounded-xl border px-5 py-2 text-sm font-bold transition-colors ${
            activeTab === "feed"
              ? "border-[#9CC7EC] bg-[#CFE4FA] text-[#0052A3]"
              : "border-transparent text-[#807266] hover:text-[#3F3833]"
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
                ? "border-[#9CC7EC] bg-[#CFE4FA] text-[#0052A3]"
                : "border-transparent text-[#807266] hover:text-[#3F3833]"
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
