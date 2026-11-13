import React, { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import {
  getChurchRoleInfo,
  isSuperAdmin,
  canManageFinance,
  canManageChurchSettings,
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
  Calendar,
  Receipt,
  HeartHandshake,
  ArrowRight,
  UserCheck,
  Building,
  Check,
  FileText,
  DollarSign,
  Users,
  Coins,
  Phone,
  Mail,
  ChevronRight,
  ShieldCheck,
  Award,
  UserRound,
} from "lucide-react";
import { FieldError, useFieldErrors } from "@/lib/formFeedback";
import { useLocation } from "wouter";

// ── Official Church Governance Structure Model ────────────────────────────────
interface ChurchOfficialRoster {
  role: string;
  title: string;
  appointee: string;
  badgeStyle: {
    bg: string;
    text: string;
    border: string;
    icon: React.ReactNode;
  };
  summary: string;
  responsibilities: string[];
}

const ROSTER_TEMPLATES: Omit<ChurchOfficialRoster, "appointee">[] = [
  {
    role: "SUPER_ADMIN",
    title: "ผู้ดูแลระบบสูงสุด (SUPER_ADMIN)",
    badgeStyle: {
      bg: "bg-tile-sand",
      text: "text-tile-sand-ink",
      border: "border-tile-sand-ink/20",
      icon: <Shield className="size-3.5" aria-hidden="true" />,
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
      bg: "bg-brand/10",
      text: "text-brand",
      border: "border-brand/25",
      icon: <Receipt className="size-3.5" aria-hidden="true" />,
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
      bg: "bg-tile-sky",
      text: "text-tile-sky-ink",
      border: "border-tile-sky-ink/20",
      icon: <HeartHandshake className="size-3.5" aria-hidden="true" />,
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
    title: "ผู้รับผิดชอบฝ่าย",
    badgeStyle: {
      bg: "bg-danger/10",
      text: "text-danger",
      border: "border-danger/25",
      icon: <Briefcase className="size-3.5" aria-hidden="true" />,
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
      bg: "bg-tile-sand",
      text: "text-tile-sand-ink",
      border: "border-tile-sand-ink/20",
      icon: <CheckCircle2 className="size-3.5" aria-hidden="true" />,
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
      bg: "bg-paper-2",
      text: "text-ink",
      border: "border-field",
      icon: <UserCheck className="size-3.5" aria-hidden="true" />,
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

// Local files in client/public/avatars. A stock photo from a third party would
// send every viewer's address to that party and fail when offline.
const PRESET_AVATARS = [
  "/avatars/avatar-1.svg",
  "/avatars/avatar-2.svg",
  "/avatars/avatar-3.svg",
  "/avatars/avatar-4.svg",
];

function ProfileAvatar({
  src,
  name,
  fallbackText,
  className,
  fallbackClassName,
}: {
  src: string | null | undefined;
  name: string;
  fallbackText: string;
  className: string;
  fallbackClassName: string;
}) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  if (src && !failed) {
    return (
      <img
        src={src}
        alt={name}
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
        className={className}
      />
    );
  }

  return (
    <div aria-hidden="true" className={fallbackClassName}>
      {fallbackText}
    </div>
  );
}

export default function Profile() {
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();

  // Queries for live financial data
  const churchProfileQuery = trpc.church.getProfile.useQuery(undefined, {
    staleTime: 60_000,
  });
  const usersQuery = trpc.auth.listUsers.useQuery(undefined, {
    enabled: canManageChurchSettings(user),
    retry: false,
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
    if (user && showEditProfileModal) {
      setEditName(user.name || "");
      setEditAvatarUrl((user as any).avatarUrl || "");
      setEditPhone((user as any).phone || "");
      setEditDepartment((user as any).department || "");
      setEditBio((user as any).bio || "");
    }
  }, [showEditProfileModal, user?.id]);

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

  const { errors, report, clearField, invalidProps } = useFieldErrors(
    "profile",
    { name: "profile-f0" }
  );

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !report({ name: editName.trim() ? undefined : "กรุณาระบุชื่อ-นามสกุล" })
    )
      return;
    setIsSaving(true);
    await updateProfileMutation.mutateAsync({
      name: editName.trim(),
      avatarUrl: editAvatarUrl.trim() || null,
      phone: editPhone.trim() || null,
      department: editDepartment.trim() || null,
      bio: editBio.trim() || null,
    });
  };

  const churchProfile = churchProfileQuery.data;
  const churchName = churchProfile?.name || "คริสตจักร";
  const userRoleInfo = getChurchRoleInfo(user?.churchRole);

  const churchRoster = useMemo<ChurchOfficialRoster[]>(() => {
    const assigneesFor = (role: string): string => {
      const fromProfile =
        role === "PASTOR"
          ? [churchProfile?.pastorName, churchProfile?.assistantPastorName]
              .filter(Boolean)
              .join(", ")
          : role === "TREASURER"
            ? churchProfile?.treasurerName
            : null;
      const usersWithRole = (usersQuery.data ?? [])
        .filter(u => {
          if (u.churchRole === role) return true;
          if (u.churchRole) return false;
          const extra = u.churchRoles ?? "";
          return extra.includes(role);
        })
        .map(u => u.name)
        .filter(Boolean);
      const names = [fromProfile, ...usersWithRole]
        .filter((n): n is string => Boolean(n && n.trim()))
        .filter((n, i, arr) => arr.indexOf(n) === i);
      if (names.length > 0) return names.join(", ");
      if (role === "MEMBER") return "สมาชิกคริสตจักรทั่วไป";
      return "ตามที่คริสตจักรมอบหมาย";
    };
    return ROSTER_TEMPLATES.map(t => ({
      ...t,
      appointee: assigneesFor(t.role),
    }));
  }, [churchProfile, usersQuery.data]);

  const { data: unreadCount = 0 } = trpc.notifications.unreadCount.useQuery(
    undefined,
    { retry: false }
  );

  const effectiveAvatar =
    (user as any)?.avatarUrl ||
    ((user as any)?.openId?.includes("http") ? (user as any)?.openId : null);

  return (
    <AppLayout
      activeRoute="/profile"
      title="โปรไฟล์"
      subtitle="ข้อมูลส่วนตัวและสิทธิ์การใช้งานของคุณ"
    >
      <div className="max-w-4xl mx-auto space-y-5 sm:space-y-6">
        {/* ── PROFILE HERO: Logged-in User's Actual Profile & ID Card Action ──── */}
        <section className="bento-card p-4 sm:p-6 md:p-8 relative overflow-hidden">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6 text-center sm:text-left relative z-10">
            {/* Large Circular Avatar */}
            <div className="relative shrink-0">
              <ProfileAvatar
                src={effectiveAvatar}
                name={user?.name || "Profile"}
                fallbackText={
                  user?.name?.trim() ? user.name.trim().slice(0, 1) : "ศ"
                }
                className="w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 rounded-full object-cover border border-line"
                fallbackClassName="w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 rounded-full bg-accent border border-line flex items-center justify-center text-accent-foreground font-extrabold text-2xl sm:text-3xl md:text-4xl select-none"
              />
              <div className="absolute bottom-0.5 right-0.5 sm:bottom-1 sm:right-1 w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-brand border border-line flex items-center justify-center">
                <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white stroke-[3]" />
              </div>
            </div>

            {/* Name, Roles, and Department */}
            <div className="flex-1 min-w-0 space-y-2">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <h2 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-ink tracking-tight break-words">
                    {user?.name || "ผู้ใช้งานระบบ"}
                  </h2>
                </div>
                <p className="text-xs sm:text-sm font-bold text-ink-2 flex items-center justify-center sm:justify-start gap-1.5 flex-wrap">
                  <Building className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-brand shrink-0" />
                  <span>
                    {(user as any)?.department || "สมาชิกครอบครัวของพระเจ้า"}
                  </span>
                </p>
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 text-xs sm:text-sm text-ink-3">
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
                  <p className="text-xs text-ink-3 italic pt-1 max-w-lg">
                    "{(user as any)?.bio}"
                  </p>
                )}
              </div>

              {/* Role Badge */}
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1.5">
                <span
                  className={`inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-extrabold border ${userRoleInfo.badgeColor}`}
                >
                  <span>{userRoleInfo.badgeLabel}</span>
                </span>
                <span className="text-xs text-ink-3 font-medium">
                  {userRoleInfo.description}
                </span>
              </div>
            </div>
          </div>

          {/* ── Action Buttons ───────────────────────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3 mt-5 sm:mt-6 pt-5 sm:pt-6 border-t border-line">
            <button
              onClick={() => setShowIdCardModal(true)}
              className="btn-secondary w-full min-h-11 sm:min-h-12 py-2.5 sm:py-3 px-3 sm:px-5 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2"
            >
              <UserRound className="w-4 h-4 text-brand shrink-0" />
              <span className="truncate">ดูข้อมูลโปรไฟล์</span>
            </button>
            <button
              onClick={() => setShowEditProfileModal(true)}
              className="btn-primary w-full min-h-11 sm:min-h-12 py-2.5 sm:py-3 px-3 sm:px-5 rounded-xl font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2"
            >
              <Edit3 className="w-4 h-4 stroke-[2.5] shrink-0" />
              <span>แก้ไขโปรไฟล์และรูปภาพ</span>
            </button>
          </div>
        </section>

        {/* ── ROLE-BASED QUICK WORKSPACE ACTIONS ────────────────────────────── */}
        {canCountOfferings(user) && (
          <section className="bento-card-static p-4 sm:p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3.5 text-center sm:text-left">
              <div className="w-12 h-12 rounded-xl bg-paper-2 border border-line text-brand flex items-center justify-center shrink-0">
                <Coins className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-ink">
                  ระบบนับเงินถวาย
                </h3>
                <p className="text-xs text-ink-3">
                  สำหรับกรรมการนับเงิน: บันทึกรอบนับ ยอดเงินสด สแกนจ่าย
                  และธนบัตร
                </p>
              </div>
            </div>
            <button
              onClick={() => setLocation("/counting")}
              className="btn-primary min-h-11 px-5 py-2.5 rounded-xl font-extrabold text-xs sm:text-sm flex items-center gap-2 shrink-0"
            >
              <span>เข้าสู่ห้องนับเงิน</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </section>
        )}

        {isSuperAdmin(user) && (
          <section className="bento-card-static p-4 sm:p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3.5 text-center sm:text-left">
              <div className="w-12 h-12 rounded-xl bg-paper-2 border border-line text-ink flex items-center justify-center shrink-0">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-ink">
                  แผงควบคุมผู้ดูแลระบบ
                </h3>
                <p className="text-xs text-ink-3">
                  จัดการสิทธิ์ผู้ใช้งาน ตรวจสอบประวัติการใช้งาน
                  และตั้งค่าคริสตจักร
                </p>
              </div>
            </div>
            <button
              onClick={() => setLocation("/settings")}
              className="btn-secondary min-h-11 px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 shrink-0"
            >
              <span>ไปที่หน้าตั้งค่าและสิทธิ์</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </section>
        )}

        {/* ── SECTION: โครงสร้างสิทธิ์การใช้งานและผู้รับผิดชอบอย่างเป็นทางการ ── */}
        <section className="bento-card-static p-4 sm:p-6 md:p-8 space-y-4 sm:space-y-6">
          <div className="border-b border-line pb-3 sm:pb-4">
            <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-extrabold bg-accent text-accent-foreground border border-brand/40 mb-2">
              <Award className="w-3.5 h-3.5 text-brand" />
              มติคริสตจักรอย่างเป็นทางการ
            </span>
            <h3 className="text-lg sm:text-xl font-extrabold text-ink">
              โครงสร้างสิทธิ์การใช้งานและผู้รับผิดชอบอย่างเป็นทางการ
            </h3>
            <p className="text-xs sm:text-sm text-ink-3 mt-1">
              กำหนดบทบาท หน้าที่ความรับผิดชอบ
              และรายนามผู้ได้รับมอบหมายตามมติคริสตจักร
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {churchRoster.map(roster => (
              <div
                key={roster.role}
                className="rounded-2xl border border-line bg-paper-2 hover:bg-surface p-4 sm:p-5 space-y-3 transition-colors flex flex-col justify-between"
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
                    <span className="text-xs font-bold text-ink-3">
                      ผู้รับผิดชอบ:
                    </span>
                    <p className="text-sm font-extrabold text-ink">
                      {roster.appointee}
                    </p>
                  </div>

                  <p className="text-xs text-ink-2 leading-relaxed">
                    {roster.summary}
                  </p>

                  <div className="pt-2 border-t border-line">
                    <span className="text-xs font-bold text-ink-3 block mb-1.5">
                      ขอบเขตหน้าที่ในระบบ:
                    </span>
                    <ul className="space-y-1">
                      {roster.responsibilities.map(resp => (
                        <li
                          key={resp}
                          className="text-xs text-ink flex items-start gap-1.5"
                        >
                          <span className="text-brand font-bold mt-0.5">•</span>
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
        <section className="bento-card-static p-4 sm:p-6 md:p-8 space-y-4">
          <h3 className="text-base font-extrabold text-ink">
            บัญชีผู้ใช้และความปลอดภัย
          </h3>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="text-xs sm:text-sm text-ink-2">
              <p>
                เข้าสู่ระบบโดย:{" "}
                <strong className="text-ink font-bold">
                  {user?.email || user?.name}
                </strong>
              </p>
              <p className="text-ink-3 mt-0.5">
                ระดับสิทธิ์ปัจจุบัน:{" "}
                <strong className="text-brand font-bold">
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
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-danger/30 bg-danger/10 px-5 py-2.5 text-sm font-bold text-danger transition-colors hover:bg-danger/15 active:scale-[0.97]"
            >
              <LogOut className="h-4 w-4" />
              ออกจากระบบ
            </button>
          </div>
        </section>
      </div>

      {/* ── MODAL 1: ดูโปรไฟล์ / บัตรประจำตัวคริสตจักร (Digital ID Card) ──────── */}
      <Dialog open={showIdCardModal} onOpenChange={setShowIdCardModal}>
        <DialogContent className="max-w-sm space-y-4 p-4 sm:max-w-md sm:space-y-6 sm:p-6 md:p-8">
          <div className="text-center space-y-1 pt-1 sm:pt-2">
            <DialogTitle className="pt-1 text-center text-lg font-extrabold text-ink sm:text-xl">
              ข้อมูลโปรไฟล์
            </DialogTitle>
            <DialogDescription className="text-center text-xs text-ink-2">
              {churchName}
            </DialogDescription>
          </div>

          {/* Profile summary. Not a membership credential: it carries no code or number. */}
          <div className="p-4 sm:p-6 rounded-2xl border border-line bg-paper-2 text-center space-y-3 sm:space-y-4">
            <ProfileAvatar
              src={effectiveAvatar}
              name={user?.name || "รูปโปรไฟล์"}
              fallbackText={
                user?.name?.trim() ? user.name.trim().slice(0, 1) : "ศ"
              }
              className="w-16 h-16 sm:w-20 sm:h-20 mx-auto rounded-full object-cover border border-line"
              fallbackClassName="w-16 h-16 sm:w-20 sm:h-20 mx-auto rounded-full bg-accent border border-line flex items-center justify-center text-2xl sm:text-3xl font-extrabold text-accent-foreground select-none"
            />
            <div className="space-y-0.5 sm:space-y-1">
              <h4 className="text-base sm:text-lg font-extrabold text-ink break-words">
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left pt-3 border-t border-line text-xs">
              <div>
                <span className="text-xs text-ink-3">สังกัดคริสตจักร:</span>
                <p className="font-bold text-ink break-words">{churchName}</p>
              </div>
              <div>
                <span className="text-xs text-ink-3">อีเมล:</span>
                <p className="font-bold text-ink break-all">
                  {user?.email || "ไม่ระบุ"}
                </p>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setShowIdCardModal(false)}
              className="btn-primary w-full min-h-11 py-2.5 rounded-xl font-extrabold text-xs sm:text-sm cursor-pointer"
            >
              ปิดหน้าต่าง
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── MODAL 2: แก้ไขโปรไฟล์ (Edit Profile Dialog) ───────────────────── */}
      <Dialog
        open={showEditProfileModal}
        onOpenChange={setShowEditProfileModal}
      >
        <DialogContent className="max-w-sm space-y-4 p-4 sm:max-w-md sm:space-y-5 sm:p-6 md:p-8">
          <DialogHeader className="space-y-1 pr-10 text-left">
            <DialogTitle className="text-lg font-extrabold text-ink sm:text-xl">
              แก้ไขโปรไฟล์ผู้ใช้งาน
            </DialogTitle>
            <DialogDescription className="text-xs text-ink-3">
              ปรับปรุงชื่อ รูปภาพโปรไฟล์ เบอร์โทรศัพท์ และข้อมูลส่วนตัว
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={handleSaveProfile}
            noValidate
            className="space-y-3 sm:space-y-4"
          >
            <div className="space-y-1.5">
              <label
                htmlFor="profile-f0"
                className="text-xs font-bold text-ink"
              >
                ชื่อ-นามสกุลทางการ <span className="text-danger">*</span>
              </label>
              <input
                id="profile-f0"
                type="text"
                required
                value={editName}
                onChange={e => {
                  setEditName(e.target.value);
                  clearField("name");
                }}
                className="neo-input w-full px-3.5 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm font-semibold text-ink"
                placeholder="เช่น ชื่อ-นามสกุลจริงของคุณ"
                {...invalidProps("name")}
              />
              <FieldError fieldId="profile-f0" message={errors.name} />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="profile-f1"
                className="text-xs font-bold text-ink"
              >
                ลิงก์รูปภาพโปรไฟล์ (Avatar URL)
              </label>
              <input
                id="profile-f1"
                type="text"
                inputMode="url"
                value={editAvatarUrl}
                onChange={e => setEditAvatarUrl(e.target.value)}
                className="neo-input w-full px-3.5 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm font-semibold text-ink"
                placeholder="https://... หรือเลือกจากด้านล่าง"
              />
              <div className="space-y-1.5 pt-1">
                <span className="text-xs text-ink-3 block font-bold">
                  หรือเลือกรูปสำเร็จรูป:
                </span>
                <div className="flex flex-wrap gap-2">
                  {PRESET_AVATARS.map((p, i) => (
                    <button
                      key={p}
                      type="button"
                      aria-label={`เลือกรูปโปรไฟล์แบบที่ ${i + 1}`}
                      onClick={() => setEditAvatarUrl(p)}
                      className={`size-11 min-w-11 min-h-11 rounded-full overflow-hidden border transition-[transform,border-color,box-shadow] cursor-pointer p-0.5 ${
                        editAvatarUrl === p
                          ? "border-brand ring-2 ring-brand/40 scale-105"
                          : "border-line hover:border-brand/50"
                      }`}
                    >
                      <img
                        src={p}
                        alt=""
                        className="w-full h-full rounded-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label
                  htmlFor="profile-f2"
                  className="text-xs font-bold text-ink"
                >
                  เบอร์โทรศัพท์
                </label>
                <input
                  id="profile-f2"
                  type="tel"
                  value={editPhone}
                  onChange={e => setEditPhone(e.target.value)}
                  className="neo-input w-full px-3.5 py-2.5 text-xs font-semibold text-ink"
                  placeholder="08X-XXX-XXXX"
                />
              </div>
              <div className="space-y-1.5">
                <label
                  htmlFor="profile-f3"
                  className="text-xs font-bold text-ink"
                >
                  ฝ่าย / พันธกิจ
                </label>
                <input
                  id="profile-f3"
                  type="text"
                  value={editDepartment}
                  onChange={e => setEditDepartment(e.target.value)}
                  className="neo-input w-full px-3.5 py-2.5 text-xs font-semibold text-ink"
                  placeholder="เช่น ฝ่ายการเงิน, ฝ่ายดนตรี"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="profile-f4"
                className="text-xs font-bold text-ink"
              >
                คติพจน์ / ข้อพระคัมภีร์ประจำใจ
              </label>
              <textarea
                id="profile-f4"
                rows={2}
                value={editBio}
                onChange={e => setEditBio(e.target.value)}
                className="neo-input w-full px-3.5 py-2.5 text-xs font-semibold text-ink resize-none"
                placeholder="เช่น ผู้ให้ด้วยใจยินดี พระเจ้าทรงรัก (2 โครินธ์ 9:7)"
              />
            </div>

            <div className="p-3 sm:p-3.5 rounded-2xl bg-paper-2 border border-line text-xs text-ink-3 space-y-1">
              <span className="font-bold text-ink">หมายเหตุเรื่องบทบาท:</span>
              <p className="leading-relaxed">
                บทบาทและสิทธิ์การใช้งานของท่าน ({userRoleInfo.label})
                ถูกกำหนดโดยมติคริสตจักรและผู้ดูแลระบบสูงสุด
                หากต้องการเปลี่ยนแปลงสิทธิ์ กรุณาติดต่อผู้ดูแลระบบของคริสตจักร
              </p>
            </div>

            <div className="flex items-center gap-2.5 sm:gap-3 pt-1 sm:pt-2">
              <button
                type="button"
                onClick={() => setShowEditProfileModal(false)}
                className="btn-secondary flex-1 min-h-11 py-2.5 sm:py-3 rounded-xl text-xs sm:text-sm font-bold"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="btn-primary flex-1 min-h-11 py-2.5 sm:py-3 rounded-xl text-xs sm:text-sm font-extrabold disabled:opacity-50"
              >
                {isSaving ? "กำลังบันทึก..." : "บันทึกโปรไฟล์"}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
