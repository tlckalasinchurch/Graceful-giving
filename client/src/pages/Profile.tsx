import React, { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import {
  getChurchRoleInfo,
  isSuperAdmin,
  canManageChurchSettings,
  canManageFinance,
  canCountOfferings,
} from "@shared/roles";
import { Swal } from "@/lib/sweetalert";
import {
  Shield,
  Briefcase,
  TrendingUp,
  Clock,
  CheckCircle2,
  Lock,
  Bell,
  LogOut,
  Edit3,
  QrCode,
  Calendar,
  Receipt,
  HeartHandshake,
  ArrowRight,
  UserCheck,
  Building,
  Check,
  Sparkles,
  X,
  FileText,
  DollarSign,
  Users,
  Coins,
  Phone,
  Mail,
  Printer,
  ChevronRight,
  ShieldCheck,
  Award,
} from "lucide-react";
import { toast } from "sonner";
import { useLocation } from "wouter";

// ── Official Church Governance Structure Model ────────────────────────────────
interface ChurchOfficialRoster {
  role: string;
  title: string;
  badgeStyle: { bg: string; text: string; border: string; icon: string };
  summary: string;
  responsibilities: string[];
}

const OFFICIAL_CHURCH_ROSTER: ChurchOfficialRoster[] = [
  {
    role: "SUPER_ADMIN",
    title: "ผู้ดูแลระบบสูงสุด (SUPER_ADMIN)",
    badgeStyle: {
      bg: "bg-[#3D3016]",
      text: "text-[#E8B84B]",
      border: "border-[#6B5426]",
      icon: "👑",
    },
    summary:
      "ดูแลระบบและโครงสร้างทั้งหมด จัดการผู้ใช้งานและสิทธิ์ ตั้งค่าคริสตจักร และตรวจสอบ Audit Log (สิทธิ์สูงสุดของระบบ)",
    responsibilities: [
      "ดูแลระบบและการตั้งค่าทั้งหมด",
      "จัดการผู้ใช้งานและกำหนดสิทธิ์การเข้าถึงระบบ (Role CRUD)",
      "ตั้งค่าข้อมูลพื้นฐาน บัญชีธนาคาร และปฏิทินงบประมาณคริสตจักร",
      "ตรวจสอบ Audit Log และประวัติการทำรายการทุกฝ่าย",
      "เข้าถึงข้อมูลทุกส่วนตามสิทธิ์สูงสุดของระบบ",
    ],
  },
  {
    role: "TREASURER",
    title: "เหรัญญิกคริสตจักร (TREASURER)",
    badgeStyle: {
      bg: "bg-[#1A2E20]",
      text: "text-[#34D399]",
      border: "border-[#2E4A34]",
      icon: "💰",
    },
    summary:
      "บันทึกรายรับ-รายจ่าย ตรวจสอบเงินถวายและบัญชี จัดการเบิกจ่าย ติดตามงบประมาณ ออกใบเสร็จ และจัดทำรายงานการเงิน",
    responsibilities: [
      "บันทึกรายรับและรายจ่ายทั้งหมดของคริสตจักร",
      "ตรวจสอบเงินถวายและรอบนับเงินในแต่ละสัปดาห์",
      "ตรวจสอบบัญชีธนาคารและยอดเงินคงเหลือ",
      "จัดการรายการเบิกจ่ายตามคำขอที่ได้รับอนุมัติ",
      "ตรวจสอบและติดตามการใช้งบประมาณรายกองทุน",
      "ออกใบเสร็จรับเงินถวายสำหรับสมาชิก",
      "จัดทำรายงานทางการเงินและงบดุลประจำเดือน/ปี",
    ],
  },
  {
    role: "PASTOR",
    title: "ศิษยาภิบาล / ผู้นำฝ่ายวิญญาณ (PASTOR)",
    badgeStyle: {
      bg: "bg-[#3D2A1A]",
      text: "text-[#D9591A]",
      border: "border-[#6B4426]",
      icon: "✝️",
    },
    summary:
      "กำกับทิศทางและงานของคริสตจักร พิจารณาและอนุมัติโครงการ ตรวจสอบภาพรวมการเงิน และดูแลด้านอภิบาลสมาชิก",
    responsibilities: [
      "กำกับทิศทางและงานพันธกิจของคริสตจักร",
      "พิจารณาและอนุมัติโครงการตามอำนาจที่กำหนด",
      "ตรวจสอบภาพรวมด้านการเงินและงบประมาณพันธกิจ",
      "ติดตามการดำเนินงานของฝ่ายต่าง ๆ",
      "ดูแลด้านอภิบาล การเยี่ยมเยียน และสมาชิก",
      "ติดตามผลการดำเนินพันธกิจและแผนยุทธศาสตร์",
    ],
  },
  {
    role: "DEACON",
    title: "มัคนายก / คณะกรรมการ (DEACON)",
    badgeStyle: {
      bg: "bg-[#2E2033]",
      text: "text-[#C77DC7]",
      border: "border-[#4A3548]",
      icon: "🤝",
    },
    summary:
      "ดูแลและติดตามงานตามฝ่ายที่รับผิดชอบ ตรวจรับงานและติดตามโครงการ เสนอคำของบประมาณและรายการเบิกจ่าย",
    responsibilities: [
      "ดูแลและติดตามงานตามฝ่ายที่รับผิดชอบ",
      "ตรวจรับงานและติดตามโครงการพันธกิจ",
      "เสนอคำของบประมาณและแผนการใช้จ่าย",
      "เสนอรายการเบิกจ่ายของฝ่าย",
      "ตรวจสอบการใช้ทรัพยากรของฝ่าย",
      "ดูรายงานเฉพาะส่วนที่ได้รับมอบหมาย",
    ],
  },
  {
    role: "COUNTER",
    title: "กรรมการนับเงิน / ทีมนับเงินถวาย (COUNTER)",
    badgeStyle: {
      bg: "bg-[#3D1F1D]",
      text: "text-[#FF5C5C]",
      border: "border-[#5C332F]",
      icon: "📝",
    },
    summary:
      "บันทึกและตรวจนับเงินถวายรอบนมัสการร่วมกับทีม ตรวจสอบยอดเงินสด สแกนจ่าย และธนบัตร",
    responsibilities: [
      "เข้าร่วมรอบตรวจนับเงินถวายประจำรอบนมัสการ",
      "บันทึกยอดเงินสดและเงินโอนสแกนคิวอาร์โค้ด",
      "นับธนบัตรและเหรียญแยกตามมูลค่าอย่างถูกต้อง",
      "ตรวจสอบความถูกต้องร่วมกับกรรมการนับเงินท่านอื่นอย่างน้อย 2 ท่าน",
      "ส่งมอบยอดให้เหรัญญิกตรวจสอบและนำฝากธนาคาร",
    ],
  },
  {
    role: "MEMBER",
    title: "สมาชิกคริสตจักร (MEMBER)",
    badgeStyle: {
      bg: "bg-[#262626]",
      text: "text-[#C9B8A8]",
      border: "border-[#3D3D3D]",
      icon: "👤",
    },
    summary:
      "ดูข่าวสาร ประกาศ ตารางกิจกรรม ตารางรับใช้ และดูประวัติการถวายส่วนบุคคลอย่างปลอดภัย",
    responsibilities: [
      "ดูข่าวสารและประกาศคริสตจักร",
      "ดูตารางกิจกรรมและตารางรับใช้",
      "ดูข้อมูลกิจกรรมที่ตนเองเกี่ยวข้อง",
      "ดูประวัติการถวายส่วนบุคคล",
      "ดูใบเสร็จหรือหลักฐานการถวายของตนเอง",
      "จัดการข้อมูลส่วนตัวตามที่ระบบอนุญาต",
    ],
  },
];

const PRESET_AVATARS = [
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&h=256&q=80",
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=256&h=256&q=80",
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=256&h=256&q=80",
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=256&h=256&q=80",
];

export default function Profile() {
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();

  // Queries for live financial data
  const financeSummaryQuery = trpc.finance.summary.useQuery(undefined, {
    staleTime: 60_000,
  });
  const pendingApprovalsQuery = trpc.withdrawals.list.useQuery(
    { myOnly: false },
    { staleTime: 60_000 }
  );
  const notificationsQuery = trpc.notifications.list.useQuery(undefined, {
    staleTime: 30_000,
  });
  const churchProfileQuery = trpc.church.getProfile.useQuery(undefined, {
    staleTime: 60_000,
  });
  // auth.listUsers is churchLeaderProcedure-gated (SUPER_ADMIN/PASTOR/admin);
  // every member can open this page, so the query — and the "who holds this
  // role" line it feeds — is skipped for anyone else rather than sent to
  // fail with FORBIDDEN.
  const canSeeRoleHolders = canManageChurchSettings(user);
  const usersQuery = trpc.auth.listUsers.useQuery(undefined, {
    enabled: canSeeRoleHolders,
    staleTime: 60_000,
  });

  // Modals state
  const [showIdCardModal, setShowIdCardModal] = useState<boolean>(false);
  const [showEditProfileModal, setShowEditProfileModal] =
    useState<boolean>(false);

  // Edit form state
  const [editName, setEditName] = useState<string>("");
  const [editAvatarUrl, setEditAvatarUrl] = useState<string>("");
  const [editPhone, setEditPhone] = useState<string>("");
  const [editDepartment, setEditDepartment] = useState<string>("");
  const [editBio, setEditBio] = useState<string>("");
  const [isSaving, setIsSaving] = useState<boolean>(false);

  useEffect(() => {
    if (user) {
      setEditName(user.name || "");
      setEditAvatarUrl((user as any).avatarUrl || "");
      setEditPhone((user as any).phone || "");
      setEditDepartment((user as any).department || "");
      setEditBio((user as any).bio || "");
    }
  }, [user]);

  // Mutation to update user profile
  const updateProfileMutation = trpc.auth.updateProfile.useMutation({
    onSuccess: async () => {
      setShowEditProfileModal(false);
      await utils.auth.me.invalidate();
      toast.success("บันทึกข้อมูลโปรไฟล์เรียบร้อยแล้ว");
    },
    onError: err => {
      toast.error("บันทึกโปรไฟล์ไม่สำเร็จ", {
        description: err.message || "กรุณาลองใหม่อีกครั้ง",
      });
    },
    onSettled: () => {
      setIsSaving(false);
    },
  });

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim()) {
      toast.error("กรุณาระบุชื่อ-นามสกุล");
      return;
    }
    setIsSaving(true);
    await updateProfileMutation.mutateAsync({
      name: editName.trim(),
      avatarUrl: editAvatarUrl.trim() || null,
      phone: editPhone.trim() || null,
      department: editDepartment.trim() || null,
      bio: editBio.trim() || null,
    });
  };

  // Same fallback chain AppLayout uses for the same value, so this page
  // does not show a different placeholder church than the rest of the app.
  const churchName =
    churchProfileQuery.data?.name || user?.name || "คริสตจักรพระคุณสมบูรณ์";
  const userRoleInfo = getChurchRoleInfo(user?.churchRole);

  const pendingApprovalsCount =
    pendingApprovalsQuery.data?.filter(w => w.status === "pending").length || 0;
  const unreadCount =
    notificationsQuery.data?.filter(n => !n.readAt).length || 0;

  // Operator precedence bug: `A || B ? C : D` parses as `(A || B) ? C : D`,
  // so whenever a custom avatarUrl was set but openId was not a URL, this
  // returned openId (an auth identifier, not an image) instead of the
  // avatar the user had just chosen.
  const avatarUrl = (user as any)?.avatarUrl as string | undefined;
  const openId = (user as any)?.openId as string | undefined;
  const effectiveAvatar =
    avatarUrl || (openId?.includes("http") ? openId : null);

  return (
    <AppLayout
      activeRoute="/profile"
      title="โปรไฟล์"
      subtitle="ข้อมูลส่วนตัวและสิทธิ์การใช้งานของคุณ"
    >
      <div className="max-w-4xl mx-auto space-y-5 sm:space-y-6">
        {/* ── PROFILE HERO: Logged-in User's Actual Profile & ID Card Action ──── */}
        <section className="bg-[#262626] rounded-2xl sm:rounded-2xl border border-[#3D3D3D] p-4 sm:p-6 md:p-8 shadow-xs relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-bl from-[#FC6E20]/10 via-[#9BCBA5]/10 to-transparent rounded-full blur-2xl pointer-events-none" />

          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6 text-center sm:text-left relative z-10">
            {/* Large Circular Avatar */}
            <div className="relative shrink-0">
              {effectiveAvatar ? (
                <img
                  src={effectiveAvatar}
                  alt={user?.name || "Profile"}
                  className="w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 rounded-full object-cover border-4 border-white shadow-md"
                />
              ) : (
                <div className="w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 rounded-full bg-gradient-to-br from-[#1B1B1B] to-[#FC6E20]/25 border-4 border-white shadow-md flex items-center justify-center text-[#C9B8A8] font-bold text-2xl sm:text-3xl md:text-4xl select-none">
                  {user?.name ? user.name.slice(0, 1) : "ศ"}
                </div>
              )}
              <div className="absolute bottom-0.5 right-0.5 sm:bottom-1 sm:right-1 w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-[#34D399] border-2 border-[#1B1B1B] flex items-center justify-center shadow-xs">
                <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white stroke-[3]" />
              </div>
            </div>

            {/* Name, Roles, and Department */}
            <div className="flex-1 min-w-0 space-y-2">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <h2 className="text-xl sm:text-2xl md:text-3xl font-semibold text-[#FFE7D0] tracking-tight break-words">
                    {user?.name || "ผู้ใช้งานระบบ"}
                  </h2>
                </div>
                <p className="text-xs sm:text-sm font-semibold text-[#C9B8A8] flex items-center justify-center sm:justify-start gap-1.5 flex-wrap">
                  <Building className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#FC6E20] shrink-0" />
                  <span>
                    {(user as any)?.department || "สมาชิกครอบครัวของพระเจ้า"}
                  </span>
                </p>
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 text-[11px] sm:text-xs text-[#8F8477]">
                  <span className="flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5" />
                    <span>{user?.email || "ไม่ระบุอีเมล"}</span>
                  </span>
                  {(user as any)?.phone && (
                    <span className="flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5" />
                      <span>{(user as any)?.phone}</span>
                    </span>
                  )}
                </div>
                {(user as any)?.bio && (
                  <p className="text-xs text-[#8F8477] italic pt-1 max-w-lg">
                    "{(user as any)?.bio}"
                  </p>
                )}
              </div>

              {/* Role Badge */}
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1.5">
                <span
                  className={`inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-bold border ${userRoleInfo.badgeColor} shadow-2xs`}
                >
                  <span>{userRoleInfo.badgeLabel}</span>
                </span>
                <span className="text-xs text-[#8F8477] font-medium">
                  {userRoleInfo.description}
                </span>
              </div>
            </div>
          </div>

          {/* ── Action Buttons ───────────────────────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3 mt-5 sm:mt-6 pt-5 sm:pt-6 border-t border-[#3D3D3D]/60">
            <button
              onClick={() => setShowIdCardModal(true)}
              className="w-full min-h-11 sm:min-h-12 py-2.5 sm:py-3 px-3 sm:px-5 rounded-2xl bg-[#262626] hover:bg-[#1B1B1B] text-[#C9B8A8] font-bold text-xs sm:text-sm border border-[#3D3D3D] shadow-xs flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
            >
              <QrCode className="w-4 h-4 text-[#FC6E20] shrink-0" />
              <span className="truncate">
                ดูโปรไฟล์ / บัตรประจำตัวคริสตจักร
              </span>
            </button>
            <button
              onClick={() => setShowEditProfileModal(true)}
              className="w-full min-h-11 sm:min-h-12 py-2.5 sm:py-3 px-3 sm:px-5 rounded-xl bg-[#FC6E20] hover:bg-[#D9591A] text-[#1B1B1B] font-bold text-xs sm:text-sm shadow-xs flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
            >
              <Edit3 className="w-4 h-4 stroke-[2.5] shrink-0" />
              <span>แก้ไขโปรไฟล์และรูปภาพ</span>
            </button>
          </div>
        </section>

        {/* ── ROLE-BASED QUICK WORKSPACE ACTIONS ────────────────────────────── */}
        {canCountOfferings(user) && (
          <section className="bg-gradient-to-r from-[#262626] to-[#262626] rounded-2xl sm:rounded-2xl border border-[#3D3D3D] p-4 sm:p-6 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3.5 text-center sm:text-left">
              <div className="w-12 h-12 rounded-2xl bg-orange-100 border border-orange-200 text-orange-700 flex items-center justify-center shrink-0 shadow-xs">
                <Coins className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-semibold tracking-tight text-[#FFE7D0]">
                  ระบบนับเงินถวาย
                </h3>
                <p className="text-xs text-[#8F8477]">
                  สำหรับกรรมการนับเงิน: บันทึกรอบนับ ยอดเงินสด สแกนจ่าย
                  และธนบัตร
                </p>
              </div>
            </div>
            <button
              onClick={() => setLocation("/counting")}
              className="min-h-11 px-5 py-2.5 rounded-xl bg-[#FC6E20] hover:bg-[#D9591A] text-[#1B1B1B] font-bold text-xs sm:text-sm shadow-xs flex items-center gap-2 shrink-0 transition-transform active:scale-95"
            >
              <span>เข้าสู่ห้องนับเงิน</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </section>
        )}

        {isSuperAdmin(user) && (
          <section className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl sm:rounded-2xl border border-amber-200 p-4 sm:p-6 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3.5 text-center sm:text-left">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 border border-amber-300 text-amber-800 flex items-center justify-center shrink-0 shadow-xs">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-semibold tracking-tight text-amber-950">
                  แผงควบคุมผู้ดูแลระบบ
                </h3>
                <p className="text-xs text-amber-800/80">
                  จัดการสิทธิ์ผู้ใช้งาน ตรวจสอบประวัติการใช้งาน
                  และตั้งค่าคริสตจักร
                </p>
              </div>
            </div>
            <button
              onClick={() => setLocation("/settings")}
              className="min-h-11 px-5 py-2.5 rounded-2xl bg-[#FC6E20] hover:bg-[#D9591A] text-[#1B1B1B] font-bold text-xs sm:text-sm shadow-xs flex items-center gap-2 shrink-0 transition-transform active:scale-95"
            >
              <span>ไปที่หน้าตั้งค่าและสิทธิ์</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </section>
        )}

        {/* ── SECTION: โครงสร้างสิทธิ์การใช้งานและผู้รับผิดชอบอย่างเป็นทางการ ── */}
        <section className="bg-[#262626] rounded-2xl sm:rounded-2xl border border-[#3D3D3D] p-4 sm:p-6 md:p-8 space-y-4 sm:space-y-6 shadow-xs">
          <div className="border-b border-[#3D3D3D]/60 pb-3 sm:pb-4">
            <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-bold bg-[#262626] text-[#C9B8A8] border border-[#3D3D3D] mb-2">
              <Award className="w-3.5 h-3.5 text-[#FC6E20]" />
              มติคริสตจักรอย่างเป็นทางการ
            </span>
            <h3 className="text-lg sm:text-xl font-semibold tracking-tight text-[#FFE7D0]">
              โครงสร้างสิทธิ์การใช้งานและผู้รับผิดชอบอย่างเป็นทางการ
            </h3>
            <p className="text-xs sm:text-sm text-[#8F8477] mt-1">
              กำหนดบทบาท หน้าที่ความรับผิดชอบ
              และรายนามผู้ได้รับมอบหมายตามมติคริสตจักร
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {OFFICIAL_CHURCH_ROSTER.map((roster, idx) => (
              <div
                key={roster.role}
                className="rounded-2xl border border-[#3D3D3D] bg-[#262626] hover:bg-[#262626] p-4 sm:p-5 space-y-3 transition-all hover:shadow-xs flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${roster.badgeStyle.bg} ${roster.badgeStyle.text} ${roster.badgeStyle.border}`}
                    >
                      <span>{roster.badgeStyle.icon}</span>
                      <span>{roster.title}</span>
                    </span>
                  </div>

                  {canSeeRoleHolders && (
                    <div>
                      <span className="text-[11px] font-bold text-[#8F8477] uppercase tracking-wider">
                        ผู้ดำรงตำแหน่งในระบบ:
                      </span>
                      <p className="text-sm font-bold text-[#FFE7D0]">
                        {usersQuery.isLoading
                          ? "กำลังโหลด…"
                          : usersQuery.isError
                            ? "โหลดไม่สำเร็จ"
                            : (usersQuery.data ?? [])
                                .filter(
                                  u =>
                                    (u.churchRole || "MEMBER") === roster.role
                                )
                                .map(u => u.name || u.email || "ไม่ระบุชื่อ")
                                .join(", ") || "ยังไม่มี"}
                      </p>
                    </div>
                  )}

                  <p className="text-xs text-[#8F8477] leading-relaxed">
                    {roster.summary}
                  </p>

                  <div className="pt-2 border-t border-[#3D3D3D]/50">
                    <span className="text-[11px] font-bold text-[#8F8477] block mb-1.5">
                      ขอบเขตหน้าที่ในระบบ:
                    </span>
                    <ul className="space-y-1">
                      {roster.responsibilities.map((resp, rIdx) => (
                        <li
                          key={rIdx}
                          className="text-xs text-[#FFE7D0] flex items-start gap-1.5"
                        >
                          <span className="text-emerald-600 font-bold mt-0.5">
                            •
                          </span>
                          <span>{resp}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── SECTION: ข้อมูลบัญชีและทางเลือกความปลอดภัย ─────────────────────── */}
        <section className="rounded-2xl sm:rounded-2xl border border-[#3D3D3D] bg-[#262626] p-4 sm:p-6 md:p-8 shadow-xs space-y-4">
          <h3 className="text-base font-semibold tracking-tight text-[#FFE7D0]">
            บัญชีผู้ใช้และความปลอดภัย
          </h3>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="text-xs sm:text-sm text-[#C9B8A8]">
              <p>
                เข้าสู่ระบบโดย:{" "}
                <strong className="text-[#FFE7D0] font-bold">
                  {user?.email || user?.name}
                </strong>
              </p>
              <p className="text-[#8F8477] mt-0.5">
                ระดับสิทธิ์ปัจจุบัน:{" "}
                <strong className="text-emerald-800 font-bold">
                  {userRoleInfo.labelWithCode}
                </strong>
              </p>
            </div>
            <button
              type="button"
              onClick={async () => {
                const confirmed = await Swal.confirm(
                  "ต้องการออกจากระบบ?",
                  "คุณแน่ใจหรือไม่ว่าต้องการออกจากระบบบัญชีปัจจุบัน"
                );
                if (confirmed) {
                  await logout();
                }
              }}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-2.5 text-sm font-bold text-rose-700 transition-colors hover:bg-rose-100 active:scale-95"
            >
              <LogOut className="h-4 w-4" />
              ออกจากระบบ
            </button>
          </div>
        </section>
      </div>

      {/* ── MODAL 1: ดูโปรไฟล์ / บัตรประจำตัวคริสตจักร (Digital ID Card) ──────── */}
      {showIdCardModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-[#262626] rounded-2xl sm:rounded-2xl border border-[#3D3D3D] max-w-sm sm:max-w-md w-full p-4 sm:p-6 md:p-8 space-y-4 sm:space-y-6 shadow-2xl relative max-h-[92vh] overflow-y-auto overscroll-contain">
            <button
              onClick={() => setShowIdCardModal(false)}
              className="absolute top-4 right-4 sm:top-5 sm:right-5 rounded-full hover:bg-stone-100 text-[#C9B8A8] transition-colors min-h-11 min-w-11 flex items-center justify-center"
              aria-label="ปิดหน้าต่าง"
            >
              <X className="w-5 h-5" aria-hidden="true" />
            </button>

            <div className="text-center space-y-1 pt-1 sm:pt-2">
              <span className="px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-[11px] font-bold bg-[#1A2E20] text-[#4F6E28] uppercase tracking-wider">
                Digital Church Member Card
              </span>
              <h3 className="text-lg sm:text-xl font-semibold tracking-tight text-[#FFE7D0] pt-1">
                บัตรประจำตัวคริสตจักร
              </h3>
              <p className="text-xs text-[#C9B8A8]">{churchName}</p>
            </div>

            {/* ID Card Box */}
            <div className="p-4 sm:p-6 rounded-2xl sm:rounded-2xl bg-gradient-to-br from-[#262626] via-[#262626] to-[#1B1B1B] border-2 border-[#3D3D3D] shadow-sm text-center space-y-3 sm:space-y-4">
              {effectiveAvatar ? (
                <img
                  src={effectiveAvatar}
                  alt={user?.name || "Member Avatar"}
                  className="w-16 h-16 sm:w-20 sm:h-20 mx-auto rounded-full object-cover shadow-md border-3 border-[#FC6E20]"
                />
              ) : (
                <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto rounded-full bg-[#262626] shadow-md border-3 border-[#FC6E20] flex items-center justify-center text-2xl sm:text-3xl font-bold text-[#C9B8A8]">
                  {user?.name ? user.name.slice(0, 1) : "ศ"}
                </div>
              )}
              <div className="space-y-0.5 sm:space-y-1">
                <h4 className="text-base sm:text-lg font-semibold tracking-tight text-[#FFE7D0] break-words">
                  {user?.name || "สมาชิกคริสตจักร"}
                </h4>
                <div className="inline-block">
                  <span
                    className={`px-3 py-0.5 rounded-full text-xs font-bold border ${userRoleInfo.badgeColor}`}
                  >
                    {userRoleInfo.badgeLabel}
                  </span>
                </div>
              </div>

              {/* QR Code */}
              <div className="p-3 sm:p-4 bg-[#262626] rounded-2xl border border-[#3D3D3D] inline-block shadow-2xs">
                <QrCode className="w-24 h-24 sm:w-28 sm:h-28 text-[#FFE7D0] mx-auto" />
                <p className="text-[10px] text-[#8F8477] font-mono mt-1 font-bold">
                  ID: GL-
                  {user?.id ? user.id.toString().padStart(5, "0") : "00001"}
                </p>
              </div>

              <div className="text-left pt-2 border-t border-[#3D3D3D]/70 text-xs">
                <span className="text-[10px] text-[#8F8477]">
                  สังกัดคริสตจักร:
                </span>
                <p className="font-bold text-[#FFE7D0] truncate">
                  {churchName}
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => window.print()}
                className="flex-1 min-h-11 py-2.5 rounded-2xl bg-[#262626] border border-[#3D3D3D] text-[#C9B8A8] font-bold text-xs sm:text-sm hover:bg-[#1B1B1B] transition-all flex items-center justify-center gap-1.5"
              >
                <Printer className="w-4 h-4" />
                <span>พิมพ์บัตร</span>
              </button>
              <button
                onClick={() => setShowIdCardModal(false)}
                className="flex-1 min-h-11 py-2.5 rounded-2xl bg-[#323232] text-white font-bold text-xs sm:text-sm hover:bg-[#454545] transition-all"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 2: แก้ไขโปรไฟล์ (Edit Profile Dialog) ───────────────────── */}
      {showEditProfileModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-[#262626] rounded-2xl sm:rounded-2xl border border-[#3D3D3D] max-w-sm sm:max-w-md w-full p-4 sm:p-6 md:p-8 space-y-4 sm:space-y-5 shadow-2xl relative max-h-[92vh] overflow-y-auto overscroll-contain">
            <button
              onClick={() => setShowEditProfileModal(false)}
              className="absolute top-4 right-4 sm:top-5 sm:right-5 rounded-full hover:bg-stone-100 text-[#C9B8A8] transition-colors min-h-11 min-w-11 flex items-center justify-center"
              aria-label="ปิดหน้าต่าง"
            >
              <X className="w-5 h-5" aria-hidden="true" />
            </button>

            <div className="space-y-1">
              <h3 className="text-lg sm:text-xl font-semibold tracking-tight text-[#FFE7D0]">
                แก้ไขโปรไฟล์ผู้ใช้งาน
              </h3>
              <p className="text-xs text-[#8F8477]">
                ปรับปรุงชื่อ รูปภาพโปรไฟล์ เบอร์โทรศัพท์ และข้อมูลส่วนตัว
              </p>
            </div>

            <form
              onSubmit={handleSaveProfile}
              className="space-y-3 sm:space-y-4"
            >
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#FFE7D0]">
                  ชื่อ-นามสกุลทางการ{" "}
                  <span className="text-[#FF5C5C]" aria-hidden="true">
                    *
                  </span>
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  className="w-full px-3.5 sm:px-4 py-2.5 sm:py-3 rounded-2xl border border-[#3D3D3D] text-xs sm:text-sm font-semibold text-[#FFE7D0] focus:border-[#FC6E20] focus:outline-none focus:ring-2 focus:ring-[#FC6E20]/20 transition-all"
                  placeholder="เช่น สมชาย ใจดี"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#FFE7D0]">
                  ลิงก์รูปภาพโปรไฟล์ (Avatar URL)
                </label>
                <input
                  type="url"
                  value={editAvatarUrl}
                  onChange={e => setEditAvatarUrl(e.target.value)}
                  className="w-full px-3.5 sm:px-4 py-2.5 sm:py-3 rounded-2xl border border-[#3D3D3D] text-xs sm:text-sm font-semibold text-[#FFE7D0] focus:border-[#FC6E20] focus:outline-none focus:ring-2 focus:ring-[#FC6E20]/20 transition-all"
                  placeholder="https://..."
                />
                <div className="flex items-center gap-2 pt-1">
                  <span className="text-[11px] text-[#8F8477]">
                    หรือเลือกรูปสำเร็จรูป:
                  </span>
                  <div className="flex gap-1.5">
                    {PRESET_AVATARS.map((p, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setEditAvatarUrl(p)}
                        className={`w-7 h-7 rounded-full overflow-hidden border-2 transition-all ${
                          editAvatarUrl === p
                            ? "border-[#FC6E20] scale-110 shadow-xs"
                            : "border-transparent"
                        }`}
                      >
                        <img
                          src={p}
                          alt={`Avatar ${i}`}
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#FFE7D0]">
                    เบอร์โทรศัพท์
                  </label>
                  <input
                    type="tel"
                    value={editPhone}
                    onChange={e => setEditPhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-2xl border border-[#3D3D3D] text-xs font-semibold text-[#FFE7D0] focus:border-[#FC6E20] focus:outline-none"
                    placeholder="08X-XXX-XXXX"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#FFE7D0]">
                    ฝ่าย / พันธกิจ
                  </label>
                  <input
                    type="text"
                    value={editDepartment}
                    onChange={e => setEditDepartment(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-2xl border border-[#3D3D3D] text-xs font-semibold text-[#FFE7D0] focus:border-[#FC6E20] focus:outline-none"
                    placeholder="เช่น ฝ่ายการเงิน, ฝ่ายดนตรี"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#FFE7D0]">
                  คติพจน์ / ข้อพระคัมภีร์ประจำใจ
                </label>
                <textarea
                  rows={2}
                  value={editBio}
                  onChange={e => setEditBio(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl border border-[#3D3D3D] text-xs font-semibold text-[#FFE7D0] focus:border-[#FC6E20] focus:outline-none resize-none"
                  placeholder="เช่น ผู้ให้ด้วยใจยินดี พระเจ้าทรงรัก (2 โครินธ์ 9:7)"
                />
              </div>

              <div className="p-3 sm:p-3.5 rounded-2xl bg-[#262626] border border-[#3D3D3D]/60 text-xs text-[#8F8477] space-y-1">
                <span className="font-bold text-[#FFE7D0]">
                  หมายเหตุเรื่องบทบาท:
                </span>
                <p className="leading-relaxed">
                  บทบาทและสิทธิ์การใช้งานของท่าน ({userRoleInfo.label})
                  ถูกกำหนดโดยมติคริสตจักรและผู้ดูแลระบบสูงสุด
                  หากต้องการเปลี่ยนแปลงสิทธิ์
                  กรุณาติดต่อผู้ดูแลระบบสูงสุดของคริสตจักร
                </p>
              </div>

              <div className="flex items-center gap-2.5 sm:gap-3 pt-1 sm:pt-2">
                <button
                  type="button"
                  onClick={() => setShowEditProfileModal(false)}
                  className="flex-1 min-h-11 py-2.5 sm:py-3 rounded-2xl border border-[#3D3D3D] text-xs sm:text-sm font-bold text-[#C9B8A8] hover:bg-[#262626] transition-all"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 min-h-11 py-2.5 sm:py-3 rounded-2xl bg-[#FC6E20] hover:bg-[#D9591A] text-[#1B1B1B] text-xs sm:text-sm font-bold shadow-xs transition-all disabled:opacity-50 active:scale-[0.98]"
                >
                  {isSaving ? "กำลังบันทึก..." : "บันทึกโปรไฟล์"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
