import React, { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import {
  getChurchRoleInfo,
  isSuperAdmin,
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
  appointee: string;
  badgeStyle: { bg: string; text: string; border: string; icon: string };
  summary: string;
  responsibilities: string[];
}

const OFFICIAL_CHURCH_ROSTER: ChurchOfficialRoster[] = [
  {
    role: "SUPER_ADMIN",
    title: "ผู้ดูแลระบบสูงสุด (SUPER_ADMIN)",
    appointee: "พณ.ท่านหม่อมหลวงราชวงศ์สุริยงค์ บาลเพ็ชร",
    badgeStyle: {
      bg: "bg-amber-100",
      text: "text-amber-900",
      border: "border-amber-300",
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
    appointee: "สุดารัตน์ จิณเซ่ง, อาจารย์ทัศนา ดวงจิตร",
    badgeStyle: {
      bg: "bg-emerald-100",
      text: "text-emerald-900",
      border: "border-emerald-300",
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
    appointee: "ศบ.อาจารย์สรรเสริญ ดวงจิตร",
    badgeStyle: {
      bg: "bg-blue-100",
      text: "text-blue-900",
      border: "border-blue-300",
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
    appointee: "อาจารย์ทัศนา ดวงจิตร",
    badgeStyle: {
      bg: "bg-purple-100",
      text: "text-purple-900",
      border: "border-purple-300",
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
    appointee: "สุดารัตน์ จิณเซ่ง (และผู้ได้รับมอบหมายประจำสัปดาห์)",
    badgeStyle: {
      bg: "bg-orange-100",
      text: "text-orange-900",
      border: "border-orange-300",
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
    appointee: "สมาชิกคริสตจักรทั่วไป",
    badgeStyle: {
      bg: "bg-stone-100",
      text: "text-stone-800",
      border: "border-stone-300",
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
      await Swal.success(
        "บันทึกข้อมูลเรียบร้อยแล้ว",
        "โปรไฟล์ของคุณได้รับการอัปเดตอย่างสมบูรณ์"
      );
    },
    onError: err => {
      Swal.error(
        "เกิดข้อผิดพลาดในการบันทึก",
        err.message || "กรุณาลองใหม่อีกครั้ง"
      );
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

  const churchName =
    churchProfileQuery.data?.name || "คริสตจักรชีวิตสุขสันต์กาฬสินธุ์";
  const userRoleInfo = getChurchRoleInfo(user?.churchRole);

  const pendingApprovalsCount =
    pendingApprovalsQuery.data?.filter(w => w.status === "pending").length || 0;
  const unreadCount =
    notificationsQuery.data?.filter(n => !n.readAt).length || 0;

  const effectiveAvatar =
    (user as any)?.avatarUrl || (user as any)?.openId?.includes("http")
      ? (user as any)?.openId
      : null;

  return (
    <AppLayout
      activeRoute="/profile"
      title="โปรไฟล์"
      subtitle="ข้อมูลส่วนตัวและสิทธิ์การใช้งานของคุณ"
    >
      <div className="max-w-4xl mx-auto space-y-5 sm:space-y-6">
        {/* ── PROFILE HERO: Logged-in User's Actual Profile & ID Card Action ──── */}
        <section className="bg-white rounded-2xl sm:rounded-2xl border border-[#E5E1D8] p-4 sm:p-6 md:p-8 shadow-xs relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-bl from-[#F97316]/10 via-[#20C997]/10 to-transparent rounded-full blur-2xl pointer-events-none" />

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
                <div className="w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 rounded-full bg-gradient-to-br from-[#FFF0DD] to-[#F97316]/25 border-4 border-white shadow-md flex items-center justify-center text-[#5F5B55] font-bold text-2xl sm:text-3xl md:text-4xl select-none">
                  {user?.name ? user.name.slice(0, 1) : "ศ"}
                </div>
              )}
              <div className="absolute bottom-0.5 right-0.5 sm:bottom-1 sm:right-1 w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-[#20C997] border-2 border-white flex items-center justify-center shadow-xs">
                <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white stroke-[3]" />
              </div>
            </div>

            {/* Name, Roles, and Department */}
            <div className="flex-1 min-w-0 space-y-2">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-[#171717] tracking-tight break-words">
                    {user?.name || "ผู้ใช้งานระบบ"}
                  </h2>
                </div>
                <p className="text-xs sm:text-sm font-semibold text-[#5F5B55] flex items-center justify-center sm:justify-start gap-1.5 flex-wrap">
                  <Building className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#F97316] shrink-0" />
                  <span>
                    {(user as any)?.department || "สมาชิกครอบครัวของพระเจ้า"}
                  </span>
                </p>
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 text-[11px] sm:text-xs text-[#7A766F]">
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
                  <p className="text-xs text-[#7A766F] italic pt-1 max-w-lg">
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
                <span className="text-xs text-[#7A766F] font-medium">
                  {userRoleInfo.description}
                </span>
              </div>
            </div>
          </div>

          {/* ── Action Buttons ───────────────────────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3 mt-5 sm:mt-6 pt-5 sm:pt-6 border-t border-[#E5E1D8]/60">
            <button
              onClick={() => setShowIdCardModal(true)}
              className="w-full min-h-11 sm:min-h-12 py-2.5 sm:py-3 px-3 sm:px-5 rounded-2xl bg-[#F1EFE9] hover:bg-[#FFF0DD] text-[#5F5B55] font-bold text-xs sm:text-sm border border-[#E5E1D8] shadow-xs flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
            >
              <QrCode className="w-4 h-4 text-[#F97316] shrink-0" />
              <span className="truncate">
                ดูโปรไฟล์ / บัตรประจำตัวคริสตจักร
              </span>
            </button>
            <button
              onClick={() => setShowEditProfileModal(true)}
              className="w-full min-h-11 sm:min-h-12 py-2.5 sm:py-3 px-3 sm:px-5 rounded-xl bg-[#F97316] hover:bg-[#D95E0B] text-[#171717] font-bold text-xs sm:text-sm shadow-xs flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
            >
              <Edit3 className="w-4 h-4 stroke-[2.5] shrink-0" />
              <span>แก้ไขโปรไฟล์และรูปภาพ</span>
            </button>
          </div>
        </section>

        {/* ── ROLE-BASED QUICK WORKSPACE ACTIONS ────────────────────────────── */}
        {canCountOfferings(user) && (
          <section className="bg-gradient-to-r from-[#F5F3EE] to-[#F1EFE9] rounded-2xl sm:rounded-2xl border border-[#E5E1D8] p-4 sm:p-6 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3.5 text-center sm:text-left">
              <div className="w-12 h-12 rounded-2xl bg-orange-100 border border-orange-200 text-orange-700 flex items-center justify-center shrink-0 shadow-xs">
                <Coins className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#171717]">
                  ระบบนับเงินถวาย
                </h3>
                <p className="text-xs text-[#7A766F]">
                  สำหรับกรรมการนับเงิน: บันทึกรอบนับ ยอดเงินสด สแกนจ่าย
                  และธนบัตร
                </p>
              </div>
            </div>
            <button
              onClick={() => setLocation("/counting")}
              className="min-h-11 px-5 py-2.5 rounded-xl bg-[#F97316] hover:bg-[#D95E0B] text-[#171717] font-bold text-xs sm:text-sm shadow-xs flex items-center gap-2 shrink-0 transition-transform active:scale-95"
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
                <h3 className="text-base font-bold text-amber-950">
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
              className="min-h-11 px-5 py-2.5 rounded-2xl bg-amber-700 hover:bg-amber-800 text-white font-bold text-xs sm:text-sm shadow-xs flex items-center gap-2 shrink-0 transition-transform active:scale-95"
            >
              <span>ไปที่หน้าตั้งค่าและสิทธิ์</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </section>
        )}

        {/* ── SECTION: โครงสร้างสิทธิ์การใช้งานและผู้รับผิดชอบอย่างเป็นทางการ ── */}
        <section className="bg-white rounded-2xl sm:rounded-2xl border border-[#E5E1D8] p-4 sm:p-6 md:p-8 space-y-4 sm:space-y-6 shadow-xs">
          <div className="border-b border-[#E5E1D8]/60 pb-3 sm:pb-4">
            <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-bold bg-[#F1EFE9] text-[#5F5B55] border border-[#E5E1D8] mb-2">
              <Award className="w-3.5 h-3.5 text-[#F97316]" />
              มติคริสตจักรอย่างเป็นทางการ
            </span>
            <h3 className="text-lg sm:text-xl font-bold text-[#171717]">
              โครงสร้างสิทธิ์การใช้งานและผู้รับผิดชอบอย่างเป็นทางการ
            </h3>
            <p className="text-xs sm:text-sm text-[#7A766F] mt-1">
              กำหนดบทบาท หน้าที่ความรับผิดชอบ
              และรายนามผู้ได้รับมอบหมายตามมติคริสตจักร
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {OFFICIAL_CHURCH_ROSTER.map((roster, idx) => (
              <div
                key={roster.role}
                className="rounded-2xl border border-[#E5E1D8] bg-[#FFFFFF] hover:bg-white p-4 sm:p-5 space-y-3 transition-all hover:shadow-xs flex flex-col justify-between"
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

                  <div>
                    <span className="text-[11px] font-bold text-[#7A766F] uppercase tracking-wider">
                      ผู้รับผิดชอบ:
                    </span>
                    <p className="text-sm font-bold text-[#171717]">
                      {roster.appointee}
                    </p>
                  </div>

                  <p className="text-xs text-[#7A766F] leading-relaxed">
                    {roster.summary}
                  </p>

                  <div className="pt-2 border-t border-[#E5E1D8]/50">
                    <span className="text-[11px] font-bold text-[#7A766F] block mb-1.5">
                      ขอบเขตหน้าที่ในระบบ:
                    </span>
                    <ul className="space-y-1">
                      {roster.responsibilities.map((resp, rIdx) => (
                        <li
                          key={rIdx}
                          className="text-xs text-[#171717] flex items-start gap-1.5"
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
        <section className="rounded-2xl sm:rounded-2xl border border-[#E5E1D8] bg-white p-4 sm:p-6 md:p-8 shadow-xs space-y-4">
          <h3 className="text-base font-bold text-[#171717]">
            บัญชีผู้ใช้และความปลอดภัย
          </h3>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="text-xs sm:text-sm text-[#5F5B55]">
              <p>
                เข้าสู่ระบบโดย:{" "}
                <strong className="text-[#171717] font-bold">
                  {user?.email || user?.name}
                </strong>
              </p>
              <p className="text-[#7A766F] mt-0.5">
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
          <div className="bg-white rounded-2xl sm:rounded-2xl border border-[#E5E1D8] max-w-sm sm:max-w-md w-full p-4 sm:p-6 md:p-8 space-y-4 sm:space-y-6 shadow-2xl relative max-h-[92vh] overflow-y-auto overscroll-contain">
            <button
              onClick={() => setShowIdCardModal(false)}
              className="absolute top-4 right-4 sm:top-5 sm:right-5 p-2 rounded-full hover:bg-stone-100 text-[#5F5B55] transition-colors min-h-10 min-w-10 flex items-center justify-center"
              aria-label="ปิดหน้าต่าง"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center space-y-1 pt-1 sm:pt-2">
              <span className="px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-[11px] font-bold bg-[#E3F8F1] text-[#4F6E28] uppercase tracking-wider">
                Digital Church Member Card
              </span>
              <h3 className="text-lg sm:text-xl font-bold text-[#171717] pt-1">
                บัตรประจำตัวคริสตจักร
              </h3>
              <p className="text-xs text-[#5F5B55]">{churchName}</p>
            </div>

            {/* ID Card Box */}
            <div className="p-4 sm:p-6 rounded-2xl sm:rounded-2xl bg-gradient-to-br from-[#F1EFE9] via-[#F5F3EE] to-[#FFF0DD] border-2 border-[#E5E1D8] shadow-sm text-center space-y-3 sm:space-y-4">
              {effectiveAvatar ? (
                <img
                  src={effectiveAvatar}
                  alt={user?.name || "Member Avatar"}
                  className="w-16 h-16 sm:w-20 sm:h-20 mx-auto rounded-full object-cover shadow-md border-3 border-[#F97316]"
                />
              ) : (
                <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto rounded-full bg-white shadow-md border-3 border-[#F97316] flex items-center justify-center text-2xl sm:text-3xl font-bold text-[#5F5B55]">
                  {user?.name ? user.name.slice(0, 1) : "ศ"}
                </div>
              )}
              <div className="space-y-0.5 sm:space-y-1">
                <h4 className="text-base sm:text-lg font-bold text-[#171717] break-words">
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
              <div className="p-3 sm:p-4 bg-white rounded-2xl border border-[#E5E1D8] inline-block shadow-2xs">
                <QrCode className="w-24 h-24 sm:w-28 sm:h-28 text-[#171717] mx-auto" />
                <p className="text-[10px] text-[#7A766F] font-mono mt-1 font-bold">
                  ID: GL-
                  {user?.id ? user.id.toString().padStart(5, "0") : "00001"}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-left pt-2 border-t border-[#E5E1D8]/70 text-xs">
                <div>
                  <span className="text-[10px] text-[#7A766F]">
                    สังกัดคริสตจักร:
                  </span>
                  <p className="font-bold text-[#171717] truncate">
                    {churchName}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] text-[#7A766F]">
                    สถานะสมาชิก:
                  </span>
                  <p className="font-bold text-emerald-700">
                    ยืนยันแล้ว (Active)
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => window.print()}
                className="flex-1 min-h-11 py-2.5 rounded-2xl bg-[#F1EFE9] border border-[#E5E1D8] text-[#5F5B55] font-bold text-xs sm:text-sm hover:bg-[#FFF0DD] transition-all flex items-center justify-center gap-1.5"
              >
                <Printer className="w-4 h-4" />
                <span>พิมพ์บัตร</span>
              </button>
              <button
                onClick={() => setShowIdCardModal(false)}
                className="flex-1 min-h-11 py-2.5 rounded-2xl bg-[#171717] text-white font-bold text-xs sm:text-sm hover:bg-[#171717] transition-all"
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
          <div className="bg-white rounded-2xl sm:rounded-2xl border border-[#E5E1D8] max-w-sm sm:max-w-md w-full p-4 sm:p-6 md:p-8 space-y-4 sm:space-y-5 shadow-2xl relative max-h-[92vh] overflow-y-auto overscroll-contain">
            <button
              onClick={() => setShowEditProfileModal(false)}
              className="absolute top-4 right-4 sm:top-5 sm:right-5 p-2 rounded-full hover:bg-stone-100 text-[#5F5B55] transition-colors min-h-10 min-w-10 flex items-center justify-center"
              aria-label="ปิดหน้าต่าง"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-1">
              <h3 className="text-lg sm:text-xl font-bold text-[#171717]">
                แก้ไขโปรไฟล์ผู้ใช้งาน
              </h3>
              <p className="text-xs text-[#7A766F]">
                ปรับปรุงชื่อ รูปภาพโปรไฟล์ เบอร์โทรศัพท์ และข้อมูลส่วนตัว
              </p>
            </div>

            <form
              onSubmit={handleSaveProfile}
              className="space-y-3 sm:space-y-4"
            >
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#171717]">
                  ชื่อ-นามสกุลทางการ <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  className="w-full px-3.5 sm:px-4 py-2.5 sm:py-3 rounded-2xl border border-[#E5E1D8] text-xs sm:text-sm font-semibold text-[#171717] focus:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316]/20 transition-all"
                  placeholder="เช่น พณ.ท่านสุริยงค์ บาลเพ็ชร"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#171717]">
                  ลิงก์รูปภาพโปรไฟล์ (Avatar URL)
                </label>
                <input
                  type="url"
                  value={editAvatarUrl}
                  onChange={e => setEditAvatarUrl(e.target.value)}
                  className="w-full px-3.5 sm:px-4 py-2.5 sm:py-3 rounded-2xl border border-[#E5E1D8] text-xs sm:text-sm font-semibold text-[#171717] focus:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316]/20 transition-all"
                  placeholder="https://..."
                />
                <div className="flex items-center gap-2 pt-1">
                  <span className="text-[11px] text-[#7A766F]">
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
                            ? "border-[#F97316] scale-110 shadow-xs"
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
                  <label className="text-xs font-bold text-[#171717]">
                    เบอร์โทรศัพท์
                  </label>
                  <input
                    type="tel"
                    value={editPhone}
                    onChange={e => setEditPhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-2xl border border-[#E5E1D8] text-xs font-semibold text-[#171717] focus:border-[#F97316] focus:outline-none"
                    placeholder="08X-XXX-XXXX"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#171717]">
                    ฝ่าย / พันธกิจ
                  </label>
                  <input
                    type="text"
                    value={editDepartment}
                    onChange={e => setEditDepartment(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-2xl border border-[#E5E1D8] text-xs font-semibold text-[#171717] focus:border-[#F97316] focus:outline-none"
                    placeholder="เช่น ฝ่ายการเงิน, ฝ่ายดนตรี"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#171717]">
                  คติพจน์ / ข้อพระคัมภีร์ประจำใจ
                </label>
                <textarea
                  rows={2}
                  value={editBio}
                  onChange={e => setEditBio(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl border border-[#E5E1D8] text-xs font-semibold text-[#171717] focus:border-[#F97316] focus:outline-none resize-none"
                  placeholder="เช่น ผู้ให้ด้วยใจยินดี พระเจ้าทรงรัก (2 โครินธ์ 9:7)"
                />
              </div>

              <div className="p-3 sm:p-3.5 rounded-2xl bg-[#F5F3EE] border border-[#E5E1D8]/60 text-xs text-[#7A766F] space-y-1">
                <span className="font-bold text-[#171717]">
                  หมายเหตุเรื่องบทบาท:
                </span>
                <p className="leading-relaxed">
                  บทบาทและสิทธิ์การใช้งานของท่าน ({userRoleInfo.label})
                  ถูกกำหนดโดยมติคริสตจักรและผู้ดูแลระบบสูงสุด
                  หากต้องการเปลี่ยนแปลงสิทธิ์ กรุณาติดต่อ
                  พณ.ท่านหม่อมหลวงราชวงศ์สุริยงค์ บาลเพ็ชร
                </p>
              </div>

              <div className="flex items-center gap-2.5 sm:gap-3 pt-1 sm:pt-2">
                <button
                  type="button"
                  onClick={() => setShowEditProfileModal(false)}
                  className="flex-1 min-h-11 py-2.5 sm:py-3 rounded-2xl border border-[#E5E1D8] text-xs sm:text-sm font-bold text-[#5F5B55] hover:bg-[#F5F3EE] transition-all"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 min-h-11 py-2.5 sm:py-3 rounded-2xl bg-[#F97316] hover:bg-[#D95E0B] text-[#171717] text-xs sm:text-sm font-bold shadow-xs transition-all disabled:opacity-50 active:scale-[0.98]"
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
