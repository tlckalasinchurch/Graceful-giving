import React, { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import {
  EMPTY_GUARDED_PROFILE,
  isProfileDirty,
  type GuardedProfile,
} from "./settingsDirty";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  Banknote,
  Building,
  CheckCircle2,
  CreditCard,
  Globe,
  Loader2,
  Lock,
  Mail,
  Phone,
  Save,
  Settings as SettingsIcon,
  Shield,
  UserCheck,
  Users,
  FileText,
  Search,
  Filter,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { Swal } from "@/lib/sweetalert";
import { useUnsavedChanges } from "@/hooks/useUnsavedChanges";
import { useAuth } from "@/_core/hooks/useAuth";
import { LogOut } from "lucide-react";
import { EXPENSE_CATEGORIES, OFFERING_CATEGORIES } from "@shared/categories";
import { isSuperAdmin, getChurchRoleInfo, CHURCH_ROLES } from "@shared/roles";
import { NativeSelect } from "@/components/ui/native-select";
import { THAI_LOCALE } from "@/lib/format";
import { BankSignersSection } from "./Settings/BankSignersSection";
import { friendlyErrorMessage } from "@/lib/errors";

export default function Settings() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<
    "church" | "roles" | "categories" | "payment" | "audit"
  >(() => {
    const tab =
      typeof window === "undefined"
        ? null
        : new URLSearchParams(window.location.search).get("tab");
    return tab === "roles" ||
      tab === "categories" ||
      tab === "payment" ||
      tab === "audit"
      ? tab
      : "church";
  });
  const utils = trpc.useUtils();

  const {
    data: churchProfile,
    isLoading,
    refetch,
  } = trpc.church.getProfile.useQuery(undefined, { retry: false });

  const usersQuery = trpc.auth.listUsers.useQuery(undefined, {
    retry: false,
  });

  const auditQuery = trpc.audit.list.useQuery(
    { limit: 100 },
    {
      enabled: activeTab === "audit",
      retry: false,
    }
  );

  const [updatingUserId, setUpdatingUserId] = useState<number | null>(null);
  const [roleSearch, setRoleSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("ALL");

  const [auditSearch, setAuditSearch] = useState("");
  const [auditActionFilter, setAuditActionFilter] = useState<string>("ALL");

  const setRoleMutation = trpc.auth.setChurchRole.useMutation({
    onSuccess: () => {
      void usersQuery.refetch();
      void utils.auth.me.invalidate();
      void auditQuery.refetch();
    },
    onError: err => {
      toast.error(err.message || "ไม่สามารถอัปเดตบทบาทได้");
    },
    onSettled: () => {
      setUpdatingUserId(null);
    },
  });

  const statusMutation = trpc.auth.setUserStatus.useMutation({
    onSuccess: (_data, vars) => {
      toast.success(
        vars.status === "active" ? "อนุมัติบัญชีแล้ว" : "ปิดการใช้งานบัญชีแล้ว"
      );
      void usersQuery.refetch();
    },
    onError: err => toast.error(err.message || "ไม่สามารถเปลี่ยนสถานะได้"),
  });

  const deleteUserMutation = trpc.auth.deleteUser.useMutation({
    onSuccess: () => {
      toast.success("ลบบัญชีแล้ว");
      void usersQuery.refetch();
    },
    onError: err => toast.error(err.message || "ไม่สามารถลบบัญชีได้"),
  });

  const handleRoleChange = async (userId: number, newRole: string) => {
    const targetUser = usersQuery.data?.find(u => u.id === userId);
    const targetRoleInfo = getChurchRoleInfo(newRole as any);

    const isConfirmed = await Swal.confirm(
      "ยืนยันการเปลี่ยนบทบาท?",
      `คุณต้องการปรับบทบาทของ "${targetUser?.name || targetUser?.email || "ผู้ใช้งาน"}" เป็น "${targetRoleInfo.badgeLabel}" หรือไม่? ผู้ใช้จะได้รับสิทธิ์และเมนูตามบทบาทนี้ทันที`,
      {
        confirmButtonText: "ยืนยันเปลี่ยนบทบาท",
        cancelButtonText: "ยกเลิก",
      }
    );

    if (!isConfirmed) return;

    setUpdatingUserId(userId);
    try {
      await setRoleMutation.mutateAsync({
        userId,
        churchRole: newRole as any,
      });
      await Swal.success(
        "เปลี่ยนบทบาทสำเร็จ!",
        `ได้เปลี่ยนบทบาทของ ${targetUser?.name || "ผู้ใช้งาน"} เป็น ${targetRoleInfo.badgeLabel} เรียบร้อยแล้ว`
      );
    } catch (err: any) {
      await Swal.error(
        "ไม่สามารถเปลี่ยนบทบาทได้",
        err.message || "เกิดข้อผิดพลาดในการปรับเปลี่ยนบทบาท"
      );
    } finally {
      setUpdatingUserId(null);
    }
  };

  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [pastorName, setPastorName] = useState("");
  const [assistantPastorName, setAssistantPastorName] = useState("");
  const [treasurerName, setTreasurerName] = useState("");
  const [fiscalYearStartMonth, setFiscalYearStartMonth] = useState("1");
  const [bankName, setBankName] = useState("");
  const [bankAccount, setBankAccount] = useState("");
  const [bankAccountName, setBankAccountName] = useState("");
  const [promptPayId, setPromptPayId] = useState("");
  const [motto, setMotto] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [baseline, setBaseline] = useState<GuardedProfile>(
    EMPTY_GUARDED_PROFILE
  );

  useEffect(() => {
    const loaded: GuardedProfile = {
      name: churchProfile?.name || "",
      address: churchProfile?.address || "",
      phone: churchProfile?.phone || "",
      email: churchProfile?.email || "",
      website: churchProfile?.website || "",
      pastorName: churchProfile?.pastorName || "",
      assistantPastorName: churchProfile?.assistantPastorName || "",
      treasurerName: churchProfile?.treasurerName || "",
      fiscalYearStartMonth: String(churchProfile?.fiscalYearStartMonth ?? 1),
      motto: churchProfile?.motto || "",
      bankName: churchProfile?.bankName || "",
      bankAccount: churchProfile?.bankAccount || "",
      bankAccountName: churchProfile?.bankAccountName || "",
      promptPayId: churchProfile?.promptPayId || "",
    };
    setName(loaded.name);
    setAddress(loaded.address);
    setPhone(loaded.phone);
    setEmail(loaded.email);
    setWebsite(loaded.website);
    setPastorName(loaded.pastorName);
    setAssistantPastorName(loaded.assistantPastorName);
    setTreasurerName(loaded.treasurerName);
    setFiscalYearStartMonth(loaded.fiscalYearStartMonth);
    setBankName(churchProfile?.bankName || "");
    setBankAccount(churchProfile?.bankAccount || "");
    setBankAccountName(churchProfile?.bankAccountName || "");
    setPromptPayId(churchProfile?.promptPayId || "");
    setMotto(loaded.motto);
    setBaseline(loaded);
  }, [churchProfile]);

  const isDirty = isProfileDirty(
    {
      name,
      address,
      phone,
      email,
      website,
      pastorName,
      assistantPastorName,
      treasurerName,
      fiscalYearStartMonth,
      motto,
      bankName,
      bankAccount,
      bankAccountName,
      promptPayId,
    },
    baseline
  );
  useUnsavedChanges(isDirty);

  const updateProfileMutation = trpc.church.updateProfile.useMutation({
    onSuccess: async () => {
      setIsSaving(false);
      void utils.church.getProfile.invalidate();
      refetch();
      await Swal.success(
        "บันทึกข้อมูลสำเร็จ!",
        "บันทึกการตั้งค่าข้อมูลคริสตจักรเรียบร้อยแล้ว"
      );
    },
    onError: async error => {
      setIsSaving(false);
      await Swal.error(
        "บันทึกไม่สำเร็จ",
        friendlyErrorMessage(
          error,
          "บันทึกการตั้งค่าไม่สำเร็จ กรุณาลองใหม่อีกครั้ง"
        )
      );
    },
  });

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    updateProfileMutation.mutate({
      name,
      address,
      phone,
      email,
      website: website.trim() || undefined,
      pastorName,
      assistantPastorName: assistantPastorName.trim() || undefined,
      treasurerName,
      bankName,
      bankAccount,
      bankAccountName,
      promptPayId,
      fiscalYearStartMonth: parseInt(fiscalYearStartMonth, 10) || 1,
      motto,
    });
  };

  // Real appointees: everyone holding the church role (from auth.listUsers).
  // Falls back to the profile's office-holder fields only where they exist,
  // and to an explicit "ยังไม่ได้กำหนด" rather than an invented person.
  const churchRoles = useMemo(() => {
    const assigneesFor = (role: string): string => {
      const fromProfile =
        role === "PASTOR"
          ? [pastorName, assistantPastorName].filter(Boolean).join(", ")
          : role === "TREASURER"
            ? treasurerName
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
      return names.length ? names.join(", ") : "ยังไม่ได้กำหนด";
    };
    return [
      {
        role: "SUPER_ADMIN",
        title: "ผู้ดูแลระบบสูงสุด",
        appointee: assigneesFor("SUPER_ADMIN"),
        desc: "ดูแลระบบและโครงสร้างทั้งหมด จัดการผู้ใช้งานและสิทธิ์ ตั้งค่าคริสตจักร และตรวจสอบ Audit Log (สิทธิ์สูงสุดของระบบ)",
        duties: [
          "ดูแลระบบและโครงสร้างทั้งหมด",
          "จัดการผู้ใช้งานและสิทธิ์",
          "ตั้งค่าคริสตจักร",
          "ตรวจสอบ Audit Log",
          "เข้าถึงข้อมูลทุกส่วนตามสิทธิ์สูงสุดของระบบ",
        ],
      },
      {
        role: "TREASURER",
        title: "เหรัญญิกคริสตจักร",
        appointee: assigneesFor("TREASURER"),
        desc: "บันทึกรายรับ-รายจ่าย ตรวจสอบเงินถวายและบัญชี จัดการเบิกจ่าย ติดตามงบประมาณ ออกใบเสร็จ และจัดทำรายงานการเงิน",
        duties: [
          "บันทึกรายรับและรายจ่าย",
          "ตรวจสอบเงินถวาย",
          "ตรวจสอบบัญชีและยอดเงิน",
          "จัดการรายการเบิกจ่าย",
          "ตรวจสอบและติดตามงบประมาณ",
          "ออกใบเสร็จรับเงินถวาย",
          "จัดทำรายงานทางการเงิน",
        ],
      },
      {
        role: "PASTOR",
        title: "ศิษยาภิบาล / ผู้นำฝ่ายวิญญาณ",
        appointee: assigneesFor("PASTOR"),
        desc: "กำกับทิศทางและงานของคริสตจักร พิจารณาและอนุมัติโครงการ ตรวจสอบภาพรวมการเงิน และดูแลด้านอภิบาลสมาชิก",
        duties: [
          "กำกับทิศทางและงานของคริสตจักร",
          "พิจารณาและอนุมัติโครงการตามอำนาจที่กำหนด",
          "ตรวจสอบภาพรวมด้านการเงิน",
          "ติดตามการดำเนินงานของฝ่ายต่าง ๆ",
          "ดูแลด้านอภิบาลและสมาชิก",
          "ติดตามผลการดำเนินพันธกิจ",
        ],
      },
      {
        role: "DEACON",
        title: "ผู้รับผิดชอบฝ่าย",
        appointee: assigneesFor("DEACON"),
        desc: "ดูแลและติดตามงานตามฝ่ายที่รับผิดชอบ ตรวจรับงานและติดตามโครงการ เสนอคำของบประมาณและรายการเบิกจ่าย",
        duties: [
          "ดูแลและติดตามงานตามฝ่ายที่รับผิดชอบ",
          "ตรวจรับงานและติดตามโครงการ",
          "เสนอคำของบประมาณ",
          "เสนอรายการเบิกจ่าย",
          "ตรวจสอบการใช้ทรัพยากรของฝ่าย",
          "ดูรายงานเฉพาะส่วนที่ได้รับมอบหมาย",
        ],
      },
      {
        role: "COUNTER",
        title: "ทีมนับเงิน / กรรมการนับเงิน",
        appointee: assigneesFor("COUNTER"),
        desc: "บันทึกและตรวจนับเงินถวายสด ซองถวาย ร่วมกับพยานนับเงิน และกระทบยอดก่อนส่งมอบให้เหรัญญิกโพสต์ลงบัญชี",
        duties: [
          "บันทึกและตรวจนับเงินสดแต่ละรอบนมัสการ",
          "บันทึกซองถวายและผู้ถวายที่มีหมายเลขซอง",
          "ร่วมลงชื่อเป็นพยานในการตรวจนับเงินถวาย",
          "กระทบยอดเงินสดกับยอดซองให้ตรงกัน",
          "ส่งมอบรอบการนับให้เหรัญญิกโพสต์ลงบัญชี",
        ],
      },
      {
        role: "MEMBER",
        title: "สมาชิกคริสตจักร",
        appointee: assigneesFor("MEMBER"),
        desc: "ดูข่าวสาร ประกาศ ตารางกิจกรรม ตารางรับใช้ และดูประวัติการถวายส่วนบุคคลอย่างปลอดภัย",
        duties: [
          "ดูข่าวสารและประกาศ",
          "ดูตารางกิจกรรมและตารางรับใช้",
          "ดูข้อมูลกิจกรรมที่ตนเองเกี่ยวข้อง",
          "ดูประวัติการถวายส่วนบุคคล",
          "ดูใบเสร็จหรือหลักฐานการถวายของตนเอง",
          "จัดการข้อมูลส่วนตัวตามที่ระบบอนุญาต",
        ],
      },
    ];
  }, [usersQuery.data, pastorName, assistantPastorName, treasurerName]);

  if (!isSuperAdmin(user)) {
    return (
      <AppLayout>
        <div className="bento-card max-w-xl mx-auto my-12 p-8 text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-danger/10 border-2 border-[var(--ink)] shadow-[3px_3px_0_var(--ink)] mx-auto flex items-center justify-center text-danger">
            <Lock className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-extrabold text-ink">
            สิทธิ์การเข้าถึงถูกจำกัด
          </h2>
          <p className="text-sm text-ink-3">
            หน้านี้สงวนไว้สำหรับ{" "}
            <strong className="text-tile-sand-ink font-bold">
              ผู้ดูแลระบบสูงสุด (SUPER_ADMIN)
            </strong>{" "}
            เท่านั้น
            เพื่อความปลอดภัยของข้อมูลคริสตจักรและการกำหนดสิทธิ์ผู้ใช้งาน
          </p>
          <div className="pt-2">
            <Link
              href="/"
              className="btn-primary inline-flex min-h-11 items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-extrabold"
            >
              กลับสู่หน้าหลัก
            </Link>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      title="ตั้งค่าคริสตจักร"
      subtitle="ข้อมูลพื้นฐาน สิทธิ์ผู้ใช้งาน หมวดหมู่บัญชี และช่องทางรับเงินถวาย"
    >
      <div className="max-w-4xl space-y-6">
        {/* Tab Selector */}
        <div className="bento-card-static flex items-center gap-1.5 p-1.5 overflow-x-auto no-scrollbar touch-pan-x">
          <button
            onClick={() => setActiveTab("church")}
            className={`min-h-11 px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-1.5 sm:gap-2 whitespace-nowrap ${
              activeTab === "church"
                ? "border-2 border-[var(--ink)] bg-accent text-accent-foreground font-extrabold shadow-[2px_2px_0_var(--ink)]"
                : "text-ink-2 hover:bg-paper-2 hover:text-ink"
            }`}
          >
            <Building className="w-4 h-4 text-brand shrink-0" />
            <span>ข้อมูลคริสตจักร</span>
          </button>
          <button
            onClick={() => setActiveTab("roles")}
            className={`min-h-11 px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-1.5 sm:gap-2 whitespace-nowrap ${
              activeTab === "roles"
                ? "border-2 border-[var(--ink)] bg-accent text-accent-foreground font-extrabold shadow-[2px_2px_0_var(--ink)]"
                : "text-ink-2 hover:bg-paper-2 hover:text-ink"
            }`}
          >
            <Shield className="w-4 h-4 text-brand shrink-0" />
            <span>บทบาทและสิทธิ์</span>
          </button>
          <button
            onClick={() => setActiveTab("categories")}
            className={`min-h-11 px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-1.5 sm:gap-2 whitespace-nowrap ${
              activeTab === "categories"
                ? "border-2 border-[var(--ink)] bg-accent text-accent-foreground font-extrabold shadow-[2px_2px_0_var(--ink)]"
                : "text-ink-2 hover:bg-paper-2 hover:text-ink"
            }`}
          >
            <Banknote className="w-4 h-4 text-tile-sand-ink shrink-0" />
            <span>หมวดหมู่บัญชี</span>
          </button>
          <button
            onClick={() => setActiveTab("payment")}
            className={`min-h-11 px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-1.5 sm:gap-2 whitespace-nowrap ${
              activeTab === "payment"
                ? "border-2 border-[var(--ink)] bg-accent text-accent-foreground font-extrabold shadow-[2px_2px_0_var(--ink)]"
                : "text-ink-2 hover:bg-paper-2 hover:text-ink"
            }`}
          >
            <CreditCard className="w-4 h-4 text-brand shrink-0" />
            <span>บัญชีธนาคาร</span>
          </button>
          <button
            onClick={() => setActiveTab("audit")}
            className={`min-h-11 px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-1.5 sm:gap-2 whitespace-nowrap ${
              activeTab === "audit"
                ? "border-2 border-[var(--ink)] bg-accent text-accent-foreground font-extrabold shadow-[2px_2px_0_var(--ink)]"
                : "text-ink-2 hover:bg-paper-2 hover:text-ink"
            }`}
          >
            <FileText className="w-4 h-4 text-ink-3 shrink-0" />
            <span>ประวัติการใช้งาน</span>
          </button>
        </div>

        {/* Tab 1: Church Profile Form */}
        {activeTab === "church" && (
          <form onSubmit={handleSaveProfile} className="space-y-6">
            <div className="bento-card-static p-6 md:p-8 space-y-5">
              <h3 className="text-base font-extrabold text-ink flex items-center gap-2">
                <Building className="w-5 h-5 text-brand" />
                ข้อมูลทั่วไปของคริสตจักร
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="font-bold text-ink">
                    ชื่อคริสตจักร <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="neo-input w-full px-4 py-2.5 text-sm font-semibold text-ink"
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <label className="font-bold text-ink">
                    คำขวัญ / นิมิตคริสตจักร
                  </label>
                  <input
                    type="text"
                    value={motto}
                    onChange={e => setMotto(e.target.value)}
                    className="neo-input w-full px-4 py-2.5 text-sm text-ink"
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <label className="font-bold text-ink">ที่อยู่คริสตจักร</label>
                  <textarea
                    rows={2}
                    value={address}
                    onChange={e => setAddress(e.target.value)}
                    className="neo-input w-full px-4 py-2.5 text-sm text-ink"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-ink">เบอร์โทรศัพท์</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    className="neo-input w-full px-4 py-2.5 text-sm text-ink"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-ink">อีเมลทางการ</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="neo-input w-full px-4 py-2.5 text-sm text-ink"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-ink">
                    เว็บไซต์ / เพจคริสตจักร
                  </label>
                  <input
                    type="url"
                    placeholder="https://..."
                    value={website}
                    onChange={e => setWebsite(e.target.value)}
                    className="neo-input w-full px-4 py-2.5 text-sm text-ink"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-ink">ศิษยาภิบาลอาวุโส</label>
                  <input
                    type="text"
                    value={pastorName}
                    onChange={e => setPastorName(e.target.value)}
                    className="neo-input w-full px-4 py-2.5 text-sm text-ink"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-ink">
                    ผู้ช่วยศิษยาภิบาล / ผู้ประกาศ
                  </label>
                  <input
                    type="text"
                    value={assistantPastorName}
                    onChange={e => setAssistantPastorName(e.target.value)}
                    className="neo-input w-full px-4 py-2.5 text-sm text-ink"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-ink">
                    เหรัญญิกคริสตจักร
                  </label>
                  <input
                    type="text"
                    value={treasurerName}
                    onChange={e => setTreasurerName(e.target.value)}
                    className="neo-input w-full px-4 py-2.5 text-sm text-ink"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-ink">
                    เดือนเริ่มต้นปีงบประมาณ
                  </label>
                  <NativeSelect
                    value={fiscalYearStartMonth}
                    onChange={e => setFiscalYearStartMonth(e.target.value)}
                    className="w-full font-semibold"
                  >
                    <option value="1">มกราคม (มาตรฐาน ปฏิทินสากล)</option>
                    <option value="2">กุมภาพันธ์</option>
                    <option value="3">มีนาคม</option>
                    <option value="4">เมษายน</option>
                    <option value="5">พฤษภาคม</option>
                    <option value="6">มิถุนายน</option>
                    <option value="7">กรกฎาคม</option>
                    <option value="8">สิงหาคม</option>
                    <option value="9">กันยายน</option>
                    <option value="10">ตุลาคม (ปีงบประมาณราชการ)</option>
                    <option value="11">พฤศจิกายน</option>
                    <option value="12">ธันวาคม</option>
                  </NativeSelect>
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isSaving}
                className="btn-primary min-h-11 px-8 py-3 rounded-xl font-extrabold text-sm flex items-center gap-2 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{isSaving ? "กำลังบันทึก..." : "บันทึกการตั้งค่า"}</span>
              </button>
            </div>
          </form>
        )}

        {/* Account and sign out */}
        {activeTab === "church" && (
          <section className="bento-card-static p-6 md:p-8">
            <h3 className="text-base font-extrabold text-ink">บัญชีผู้ใช้</h3>
            <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm text-ink-2">
                <p className="font-bold text-ink">
                  {user?.name || "ผู้ใช้งาน"}
                </p>
                <p>{user?.email || "ไม่ระบุอีเมล"}</p>
                <p className="mt-1">
                  บทบาทในระบบ:{" "}
                  <span className="font-bold text-brand">
                    {getChurchRoleInfo(user?.churchRole).badgeLabel}
                  </span>
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href="/profile"
                  className="btn-secondary inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold"
                >
                  <UserCheck className="h-4 w-4 text-brand" />
                  ดูโปรไฟล์เต็ม
                </Link>
                <button
                  type="button"
                  onClick={() => void logout()}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border-2 border-[var(--ink)] bg-danger/10 px-5 py-2.5 text-sm font-bold text-danger shadow-[2px_2px_0_var(--ink)] transition-all hover:bg-danger/15"
                >
                  <LogOut className="h-4 w-4" />
                  ออกจากระบบ
                </button>
              </div>
            </div>
          </section>
        )}

        {/* Tab 2: Roles & User Management */}
        {activeTab === "roles" && (
          <div className="space-y-6">
            {/* User Management Table */}
            <div className="bento-card-static p-6 md:p-8 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-line pb-5">
                <div>
                  <h3 className="text-lg font-extrabold text-ink flex items-center gap-2">
                    <Users className="w-5 h-5 text-brand" />
                    จัดการบทบาทและสิทธิ์ผู้ใช้งานในระบบ
                  </h3>
                  <p className="text-xs text-ink-3 mt-1">
                    กำหนดบทบาทให้ผู้ที่เข้าสู่ระบบ
                    เพื่อให้ได้รับสิทธิ์การใช้งานตรงตามตำแหน่งหน้าที่จริง
                  </p>
                </div>
                {user?.churchRole === "SUPER_ADMIN" ||
                user?.role === "admin" ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-accent text-accent-foreground border-[1.5px] border-[var(--ink)] self-start sm:self-auto">
                    <CheckCircle2 className="w-3.5 h-3.5 text-brand" />
                    คุณมีสิทธิ์กำหนดบทบาท
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-tile-sand text-tile-sand-ink border-[1.5px] border-[var(--ink)]/30 self-start sm:self-auto">
                    เฉพาะผู้ดูแลระบบสูงสุดที่สามารถเปลี่ยนสิทธิ์ได้
                  </span>
                )}
              </div>

              {/* Search & Filter Bar */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-3" />
                  <input
                    type="text"
                    placeholder="ค้นหาชื่อผู้ใช้งาน หรือ อีเมล..."
                    value={roleSearch}
                    onChange={e => setRoleSearch(e.target.value)}
                    className="neo-input w-full pl-9 pr-4 py-2 text-xs font-semibold text-ink"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-ink-3 shrink-0" />
                  <NativeSelect
                    value={roleFilter}
                    onChange={e => setRoleFilter(e.target.value)}
                    className="font-semibold focus:ring-2 focus:ring-brand/20"
                  >
                    <option value="ALL">บทบาททั้งหมด</option>
                    <option value="SUPER_ADMIN">
                      ผู้ดูแลระบบสูงสุด (SUPER_ADMIN)
                    </option>
                    <option value="PASTOR">ศิษยาภิบาล (PASTOR)</option>
                    <option value="TREASURER">เหรัญญิก (TREASURER)</option>
                    <option value="DEACON">ผู้รับผิดชอบฝ่าย (DEACON)</option>
                    <option value="COUNTER">ทีมนับเงิน (COUNTER)</option>
                    <option value="MEMBER">สมาชิกทั่วไป (MEMBER)</option>
                  </NativeSelect>
                </div>
              </div>

              {usersQuery.isLoading ? (
                <div className="py-12 flex flex-col items-center justify-center text-sm text-ink-3 gap-3">
                  <Loader2 className="w-6 h-6 animate-spin text-brand" />
                  <span>กำลังโหลดรายชื่อผู้ใช้งาน...</span>
                </div>
              ) : !usersQuery.data || usersQuery.data.length === 0 ? (
                <div className="py-8 text-center text-sm text-ink-3 bg-paper-2 rounded-2xl border-[1.5px] border-[var(--ink)]/20">
                  ยังไม่พบข้อมูลผู้ใช้งานในระบบ
                </div>
              ) : (
                (() => {
                  const filteredUsers = (usersQuery.data || []).filter(u => {
                    const matchesSearch =
                      !roleSearch ||
                      (u.name &&
                        u.name
                          .toLowerCase()
                          .includes(roleSearch.toLowerCase())) ||
                      (u.email &&
                        u.email
                          .toLowerCase()
                          .includes(roleSearch.toLowerCase()));
                    const matchesFilter =
                      roleFilter === "ALL" ||
                      (u.churchRole || "MEMBER") === roleFilter;
                    return matchesSearch && matchesFilter;
                  });

                  if (filteredUsers.length === 0) {
                    return (
                      <div className="py-8 text-center text-xs text-ink-3 bg-paper-2/50 rounded-xl border border-[var(--ink)]/20">
                        ไม่พบผู้ใช้งานที่ตรงกับเงื่อนไขการค้นหา
                      </div>
                    );
                  }

                  const canEdit =
                    user?.churchRole === "SUPER_ADMIN" ||
                    user?.role === "admin";

                  return (
                    <>
                      {/* Mobile Card List (md:hidden) */}
                      <div className="md:hidden space-y-3">
                        {filteredUsers.map(u => {
                          const isMe = u.openId === user?.openId;
                          const isUpdating = updatingUserId === u.id;

                          return (
                            <div
                              key={u.id}
                              className="p-4 rounded-2xl border-2 border-[var(--ink)] bg-paper-2 shadow-[2px_2px_0_var(--ink)] space-y-3"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="space-y-0.5">
                                  <div className="font-extrabold text-sm text-ink flex flex-wrap items-center gap-1.5">
                                    <span>{u.name || "ไม่ระบุชื่อ"}</span>
                                    {isMe && (
                                      <span className="text-[11px] bg-accent text-accent-foreground font-extrabold px-2 py-0.5 rounded-full border border-[var(--ink)]">
                                        คุณ
                                      </span>
                                    )}
                                    {u.status === "pending" && (
                                      <span className="text-[11px] bg-tile-sky text-tile-sky-ink font-bold px-2 py-0.5 rounded-full border border-[var(--ink)]/20">
                                        รออนุมัติ
                                      </span>
                                    )}
                                    {u.status === "disabled" && (
                                      <span className="text-[11px] bg-danger/10 text-danger font-bold px-2 py-0.5 rounded-full border border-danger/30">
                                        ปิดใช้งาน
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-xs text-ink-2 font-mono">
                                    {u.email || "ไม่มีอีเมล"}
                                  </div>
                                </div>
                                <div className="text-[11px] text-ink-3 font-mono shrink-0">
                                  {u.lastSignedIn
                                    ? new Date(
                                        u.lastSignedIn
                                      ).toLocaleDateString(THAI_LOCALE, {
                                        day: "numeric",
                                        month: "short",
                                      })
                                    : "-"}
                                </div>
                              </div>

                              <div className="space-y-1.5 pt-1 border-t border-[var(--ink)]/10">
                                <label className="text-xs font-bold text-ink-2">
                                  บทบาทในระบบ:
                                </label>
                                {canEdit ? (
                                  <div className="flex items-center gap-2">
                                    {isUpdating && (
                                      <Loader2 className="w-4 h-4 animate-spin text-brand shrink-0" />
                                    )}
                                    <NativeSelect
                                      value={u.churchRole || "MEMBER"}
                                      disabled={isUpdating || isMe}
                                      onChange={e =>
                                        handleRoleChange(u.id, e.target.value)
                                      }
                                      className="w-full min-h-11 font-semibold text-xs"
                                    >
                                      <option value="SUPER_ADMIN">
                                        ผู้ดูแลระบบสูงสุด (SUPER_ADMIN)
                                      </option>
                                      <option value="PASTOR">
                                        ศิษยาภิบาล (PASTOR)
                                      </option>
                                      <option value="TREASURER">
                                        เหรัญญิกคริสตจักร (TREASURER)
                                      </option>
                                      <option value="DEACON">
                                        ผู้รับผิดชอบฝ่าย (DEACON)
                                      </option>
                                      <option value="COUNTER">
                                        ทีมนับเงินถวาย (COUNTER)
                                      </option>
                                      <option value="MEMBER">
                                        สมาชิกคริสตจักร (MEMBER)
                                      </option>
                                    </NativeSelect>
                                  </div>
                                ) : (
                                  <span className="inline-block px-3 py-1.5 rounded-xl text-xs font-extrabold bg-surface text-ink border border-[var(--ink)]">
                                    {u.churchRole || "MEMBER"}
                                  </span>
                                )}
                              </div>

                              {!isMe && canEdit && (
                                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[var(--ink)]/10">
                                  {u.status !== "active" && (
                                    <button
                                      type="button"
                                      disabled={statusMutation.isPending}
                                      onClick={() =>
                                        statusMutation.mutate({
                                          userId: u.id,
                                          status: "active",
                                        })
                                      }
                                      className="btn-primary min-h-11 flex-1 py-2 px-3 text-xs font-extrabold cursor-pointer"
                                    >
                                      {u.status === "pending"
                                        ? "อนุมัติผู้ใช้"
                                        : "เปิดใช้งาน"}
                                    </button>
                                  )}
                                  {u.status === "active" && (
                                    <button
                                      type="button"
                                      disabled={statusMutation.isPending}
                                      onClick={async () => {
                                        const ok = await Swal.confirm(
                                          "ปิดการใช้งานบัญชี?",
                                          `${u.name || "ผู้ใช้"} จะเข้าสู่ระบบไม่ได้จนกว่าจะเปิดใช้งานอีกครั้ง`,
                                          {
                                            confirmButtonText: "ปิดการใช้งาน",
                                            cancelButtonText: "ไม่ปิด",
                                          }
                                        );
                                        if (ok)
                                          statusMutation.mutate({
                                            userId: u.id,
                                            status: "disabled",
                                          });
                                      }}
                                      className="min-h-11 flex-1 py-2 px-3 rounded-xl border-2 border-[var(--ink)] bg-danger/10 text-danger text-xs font-bold hover:bg-danger/15 cursor-pointer"
                                    >
                                      ปิดใช้งาน
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    disabled={deleteUserMutation.isPending}
                                    onClick={async () => {
                                      const ok = await Swal.confirm(
                                        "ลบบัญชีนี้?",
                                        `${u.name || "ผู้ใช้"} จะถูกลบออกจากรายชื่อถาวร หากเขาล็อกอินด้วย LINE อีก จะกลับมาเป็นสถานะรออนุมัติ`,
                                        {
                                          confirmButtonText: "ลบบัญชี",
                                          cancelButtonText: "ไม่ลบ",
                                        }
                                      );
                                      if (ok)
                                        deleteUserMutation.mutate({
                                          userId: u.id,
                                        });
                                    }}
                                    className="min-h-11 px-4 rounded-xl border-2 border-[var(--ink)] bg-surface text-danger text-xs font-bold hover:bg-danger/10 cursor-pointer"
                                  >
                                    ลบ
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* Desktop Table (hidden md:block) */}
                      <div className="hidden md:block overflow-x-auto">
                        <table className="w-full text-left text-sm">
                          <thead>
                            <tr className="border-b-2 border-[var(--ink)] text-xs font-extrabold text-ink">
                              <th className="pb-3 px-3">ผู้ใช้งาน</th>
                              <th className="pb-3 px-3">อีเมล</th>
                              <th className="pb-3 px-3">เข้าใช้ล่าสุด</th>
                              <th className="pb-3 px-3 text-right">
                                บทบาทในระบบ
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-line">
                            {filteredUsers.map(u => {
                              const isMe = u.openId === user?.openId;
                              const isUpdating = updatingUserId === u.id;

                              return (
                                <tr
                                  key={u.id}
                                  className="hover:bg-paper-2/60 transition-colors"
                                >
                                  <td className="py-3.5 px-3">
                                    <div className="font-bold text-ink flex items-center gap-2">
                                      <span>{u.name || "ไม่ระบุชื่อ"}</span>
                                      {isMe && (
                                        <span className="text-xs bg-accent text-accent-foreground font-extrabold px-2 py-0.5 rounded-full border border-[var(--ink)]">
                                          คุณ
                                        </span>
                                      )}
                                      {u.status === "pending" && (
                                        <span className="text-xs bg-tile-sky text-tile-sky-ink font-bold px-2 py-0.5 rounded-full border border-[var(--ink)]/20">
                                          รออนุมัติ
                                        </span>
                                      )}
                                      {u.status === "disabled" && (
                                        <span className="text-xs bg-danger/10 text-danger font-bold px-2 py-0.5 rounded-full border border-danger/30">
                                          ปิดใช้งาน
                                        </span>
                                      )}
                                    </div>
                                  </td>
                                  <td className="py-3.5 px-3 text-ink-2">
                                    {u.email || "-"}
                                  </td>
                                  <td className="py-3.5 px-3 text-xs text-ink-3">
                                    {u.lastSignedIn
                                      ? new Date(
                                          u.lastSignedIn
                                        ).toLocaleDateString(THAI_LOCALE, {
                                          year: "numeric",
                                          month: "short",
                                          day: "numeric",
                                          hour: "2-digit",
                                          minute: "2-digit",
                                        })
                                      : "-"}
                                  </td>
                                  <td className="py-3.5 px-3 text-right">
                                    {canEdit ? (
                                      <div className="inline-flex items-center gap-2">
                                        {isUpdating && (
                                          <Loader2 className="w-4 h-4 animate-spin text-brand" />
                                        )}
                                        <NativeSelect
                                          value={u.churchRole || "MEMBER"}
                                          // Your own role is changed by another super admin.
                                          disabled={isUpdating || isMe}
                                          title={
                                            isMe
                                              ? "เปลี่ยนบทบาทของตัวเองไม่ได้"
                                              : undefined
                                          }
                                          onChange={e =>
                                            handleRoleChange(
                                              u.id,
                                              e.target.value
                                            )
                                          }
                                          className="font-semibold hover:border-brand focus:ring-2 focus:ring-brand/20 transition-all"
                                        >
                                          <option value="SUPER_ADMIN">
                                            ผู้ดูแลระบบสูงสุด (SUPER_ADMIN)
                                          </option>
                                          <option value="PASTOR">
                                            ศิษยาภิบาล (PASTOR)
                                          </option>
                                          <option value="TREASURER">
                                            เหรัญญิกคริสตจักร (TREASURER)
                                          </option>
                                          <option value="DEACON">
                                            ผู้รับผิดชอบฝ่าย (DEACON)
                                          </option>
                                          <option value="COUNTER">
                                            ทีมนับเงินถวาย (COUNTER)
                                          </option>
                                          <option value="MEMBER">
                                            สมาชิกคริสตจักร (MEMBER)
                                          </option>
                                        </NativeSelect>
                                        {!isMe && u.status !== "active" && (
                                          <button
                                            type="button"
                                            disabled={statusMutation.isPending}
                                            onClick={() =>
                                              statusMutation.mutate({
                                                userId: u.id,
                                                status: "active",
                                              })
                                            }
                                            className="btn-primary min-h-9 whitespace-nowrap rounded-lg px-2.5 py-1.5 text-xs font-extrabold cursor-pointer"
                                          >
                                            {u.status === "pending"
                                              ? "อนุมัติ"
                                              : "เปิดใช้งาน"}
                                          </button>
                                        )}
                                        {!isMe && u.status !== "active" && (
                                          <button
                                            type="button"
                                            disabled={
                                              deleteUserMutation.isPending
                                            }
                                            onClick={async () => {
                                              const ok = await Swal.confirm(
                                                "ลบบัญชีนี้?",
                                                `${u.name || "ผู้ใช้"} จะถูกลบออกจากรายชื่อถาวร หากเขาล็อกอินด้วย LINE อีก จะกลับมาเป็นสถานะรออนุมัติ`,
                                                {
                                                  confirmButtonText: "ลบบัญชี",
                                                  cancelButtonText: "ไม่ลบ",
                                                }
                                              );
                                              if (ok)
                                                deleteUserMutation.mutate({
                                                  userId: u.id,
                                                });
                                            }}
                                            className="min-h-9 whitespace-nowrap rounded-lg border-[1.5px] border-[var(--ink)] bg-danger/10 px-2.5 py-1.5 text-xs font-bold text-danger hover:bg-danger/15 cursor-pointer"
                                          >
                                            ลบ
                                          </button>
                                        )}
                                        {!isMe && u.status === "active" && (
                                          <button
                                            type="button"
                                            disabled={statusMutation.isPending}
                                            onClick={async () => {
                                              const ok = await Swal.confirm(
                                                "ปิดการใช้งานบัญชี?",
                                                `${u.name || "ผู้ใช้"} จะเข้าสู่ระบบไม่ได้จนกว่าจะเปิดใช้งานอีกครั้ง`,
                                                {
                                                  confirmButtonText:
                                                    "ปิดการใช้งาน",
                                                  cancelButtonText: "ไม่ปิด",
                                                }
                                              );
                                              if (ok)
                                                statusMutation.mutate({
                                                  userId: u.id,
                                                  status: "disabled",
                                                });
                                            }}
                                            className="min-h-9 whitespace-nowrap rounded-lg border-[1.5px] border-[var(--ink)] bg-danger/10 px-2.5 py-1.5 text-xs font-bold text-danger hover:bg-danger/15 cursor-pointer"
                                          >
                                            ปิดใช้งาน
                                          </button>
                                        )}
                                      </div>
                                    ) : (
                                      <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-paper-2 text-ink border-[1.5px] border-[var(--ink)]/30">
                                        {u.churchRole || "MEMBER"}
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </>
                  );
                })()
              )}
            </div>

            {/* Structure and Appointed Roles Reference */}
            <div className="bento-card-static p-6 md:p-8 space-y-6">
              <div>
                <h3 className="text-lg font-extrabold text-ink flex items-center gap-2">
                  <Shield className="w-5 h-5 text-brand" />
                  โครงสร้างสิทธิ์การใช้งานและผู้รับผิดชอบอย่างเป็นทางการ
                </h3>
                <p className="text-xs text-ink-3 mt-1">
                  กำหนดบทบาท หน้าที่ความรับผิดชอบ
                  และรายนามผู้ได้รับมอบหมายตามมติคริสตจักร
                </p>
              </div>

              <div className="space-y-4">
                {churchRoles.map(r => (
                  <div
                    key={r.role}
                    className="p-5 rounded-2xl bg-paper-2 border-[1.5px] border-[var(--ink)] space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-line pb-3">
                      <div>
                        <span className="font-extrabold text-base text-ink">
                          {r.title}
                        </span>
                        <span className="ml-2.5 font-mono text-xs text-ink-2 bg-surface px-2.5 py-0.5 rounded-md border border-[var(--ink)]/30">
                          {r.role}
                        </span>
                      </div>
                      <div className="text-xs font-bold px-3 py-1 rounded-full border-[1.5px] border-[var(--ink)] bg-surface text-ink self-start sm:self-auto">
                        ผู้รับผิดชอบ:{" "}
                        <span className="text-brand font-extrabold">
                          {r.appointee}
                        </span>
                      </div>
                    </div>

                    <p className="text-xs text-ink-2 leading-relaxed font-medium">
                      {r.desc}
                    </p>

                    <div className="pt-1">
                      <p className="text-xs font-bold text-ink mb-1.5">
                        ขอบเขตหน้าที่ในระบบ:
                      </p>
                      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs text-ink-2">
                        {r.duties.map((duty, idx) => (
                          <li key={idx} className="flex items-start gap-1.5">
                            <span className="text-brand font-bold">•</span>
                            <span>{duty}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Categories */}
        {activeTab === "categories" && (
          <div className="bento-card-static p-6 md:p-8 space-y-5">
            <h3 className="text-base font-extrabold text-ink flex items-center gap-2">
              <Banknote className="w-5 h-5 text-tile-sand-ink" />
              หมวดหมู่การเงินมาตรฐานคริสตจักร
            </h3>

            <p className="text-sm text-ink-2">
              หมวดหมู่เหล่านี้คือค่าที่ระบบใช้จริงทั้งในฐานข้อมูล แบบฟอร์ม
              และรายงาน
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border-[1.5px] border-[var(--ink)] bg-paper-2 p-4">
                <p className="font-extrabold text-ink">หมวดรายรับ (เงินถวาย)</p>
                <ul className="mt-2 space-y-1">
                  {OFFERING_CATEGORIES.map(c => (
                    <li
                      key={c.id}
                      className="flex items-center justify-between gap-3 text-sm text-ink-2"
                    >
                      <span>{c.label}</span>
                      <span className="font-mono text-xs text-ink-3">
                        {c.id}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-2xl border-[1.5px] border-[var(--ink)] bg-paper-2 p-4">
                <p className="font-extrabold text-ink">หมวดรายจ่าย</p>
                <ul className="mt-2 space-y-1">
                  {EXPENSE_CATEGORIES.map(c => (
                    <li
                      key={c.id}
                      className="flex items-center justify-between gap-3 text-sm text-ink-2"
                    >
                      <span>{c.label}</span>
                      <span className="font-mono text-xs text-ink-3">
                        {c.id}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Payment */}
        {activeTab === "payment" && (
          <div className="space-y-6">
            <div className="bento-card-static p-6 md:p-8 space-y-5">
              <h3 className="text-base font-extrabold text-ink flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-brand" />
                บัญชีรับเงินถวาย
              </h3>

              <div className="p-4 rounded-2xl bg-paper-2 border-[1.5px] border-[var(--ink)] flex flex-col sm:flex-row items-center gap-6">
                <div className="w-14 h-14 bg-surface rounded-2xl border-[1.5px] border-[var(--ink)] shadow-[2px_2px_0_var(--ink)] flex items-center justify-center shrink-0">
                  <CreditCard className="w-7 h-7 text-brand" />
                </div>

                <div className="space-y-2 text-center sm:text-left text-xs">
                  <p className="font-extrabold text-base text-ink">
                    {bankAccountName}
                  </p>
                  <p className="text-ink-2">
                    ธนาคาร:{" "}
                    <span className="font-bold text-ink">{bankName}</span>
                  </p>
                  <p className="text-ink-2">
                    เลขที่บัญชี:{" "}
                    <span className="font-mono font-bold text-sm text-ink">
                      {bankAccount}
                    </span>
                  </p>
                  <p className="text-xs text-ink-3">
                    ช่องทางโอนเงินถวายของคริสตจักร —
                    ข้อมูลนี้แสดงเมื่อบันทึกแล้ว
                  </p>
                </div>
              </div>

              <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
                <p className="text-ink-3 leading-relaxed">
                  ระบบใช้ข้อมูลนี้ตรวจว่าสลิปโอนเข้าบัญชีของคริสตจักรจริง
                  และสร้าง QR
                  พร้อมเพย์ที่ใส่ยอดไว้แล้วให้ผู้ถวายสแกนจ่ายในแอปธนาคาร
                  ผู้ถวายเห็นเลขบัญชีนี้ในหน้าถวายเมื่อยังไม่ได้โอน
                  ส่วนเลขพร้อมเพย์ไม่แสดง เห็นเฉพาะใน QR
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label
                      htmlFor="set-bank-name"
                      className="font-bold text-ink"
                    >
                      ธนาคาร
                    </label>
                    <input
                      id="set-bank-name"
                      type="text"
                      maxLength={120}
                      value={bankName}
                      onChange={e => setBankName(e.target.value)}
                      className="neo-input w-full px-4 py-2.5 text-sm text-ink"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label
                      htmlFor="set-bank-account"
                      className="font-bold text-ink"
                    >
                      เลขที่บัญชี
                    </label>
                    <input
                      id="set-bank-account"
                      type="text"
                      inputMode="numeric"
                      maxLength={30}
                      value={bankAccount}
                      onChange={e => setBankAccount(e.target.value)}
                      className="neo-input w-full px-4 py-2.5 text-sm font-mono text-ink"
                    />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <label
                      htmlFor="set-bank-account-name"
                      className="font-bold text-ink"
                    >
                      ชื่อบัญชี
                    </label>
                    <input
                      id="set-bank-account-name"
                      type="text"
                      maxLength={120}
                      value={bankAccountName}
                      onChange={e => setBankAccountName(e.target.value)}
                      className="neo-input w-full px-4 py-2.5 text-sm text-ink"
                    />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <label
                      htmlFor="set-promptpay"
                      className="font-bold text-ink"
                    >
                      เลขพร้อมเพย์ของคริสตจักร
                    </label>
                    <input
                      id="set-promptpay"
                      type="text"
                      inputMode="numeric"
                      maxLength={20}
                      value={promptPayId}
                      onChange={e => setPromptPayId(e.target.value)}
                      aria-describedby="set-promptpay-help"
                      placeholder="เบอร์มือถือ 10 หลัก หรือเลขประจำตัวผู้เสียภาษี 13 หลัก"
                      className="neo-input w-full px-4 py-2.5 text-sm font-mono text-ink"
                    />
                    <p id="set-promptpay-help" className="text-ink-3">
                      ต้องตรงกับพร้อมเพย์ที่ลงทะเบียนไว้กับธนาคาร
                      เว้นว่างไว้ถ้าไม่ใช้ ระบบจะไม่สร้าง QR พร้อมเพย์
                    </p>
                  </div>
                </div>
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="btn-primary min-h-11 px-8 py-3 rounded-xl font-extrabold text-sm flex items-center gap-2 disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    <span>
                      {isSaving ? "กำลังบันทึก..." : "บันทึกข้อมูลบัญชี"}
                    </span>
                  </button>
                </div>
              </form>
            </div>
            <BankSignersSection />
          </div>
        )}

        {/* Tab 5: Audit Log */}
        {activeTab === "audit" && (
          <div className="bento-card-static p-6 md:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-line pb-5">
              <div>
                <h3 className="text-lg font-extrabold text-ink flex items-center gap-2">
                  <FileText className="w-5 h-5 text-ink-3" />
                  บันทึกประวัติการดำเนินงาน
                </h3>
                <p className="text-xs text-ink-3 mt-1">
                  ตรวจสอบความปลอดภัย การปรับเปลี่ยนบทบาทผู้ใช้
                  และการแก้ไขข้อมูลสำคัญทั้งหมดในระบบ
                </p>
              </div>
              <button
                type="button"
                onClick={() => void auditQuery.refetch()}
                disabled={auditQuery.isFetching}
                className="btn-secondary inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold disabled:opacity-50 self-start sm:self-auto"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${
                    auditQuery.isFetching ? "animate-spin text-brand" : ""
                  }`}
                />
                <span>รีเฟรชข้อมูล</span>
              </button>
            </div>

            {/* Search & Filter Bar */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-3" />
                <input
                  type="text"
                  placeholder="ค้นหาชื่อผู้ดำเนินการ, อีเมล หรือกิจกรรม..."
                  value={auditSearch}
                  onChange={e => setAuditSearch(e.target.value)}
                  className="neo-input w-full pl-9 pr-4 py-2 text-xs font-semibold text-ink"
                />
              </div>
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-ink-3 shrink-0" />
                <NativeSelect
                  value={auditActionFilter}
                  onChange={e => setAuditActionFilter(e.target.value)}
                  className="font-semibold focus:ring-2 focus:ring-brand/20"
                >
                  <option value="ALL">กิจกรรมทั้งหมด</option>
                  <optgroup label="ธุรกรรมการเงิน">
                    <option value="CREATE">สร้างรายการใหม่ (CREATE)</option>
                    <option value="UPDATE">แก้ไขรายการ (UPDATE)</option>
                    <option value="VOID">ยกเลิกรายการ (VOID)</option>
                    <option value="DELETE">ลบรายการ (DELETE)</option>
                  </optgroup>
                  <optgroup label="การนับเงินและโพสต์">
                    <option value="POST">โพสต์ลงบัญชี (POST)</option>
                    <option value="SUBMIT">ส่งตรวจนับ (SUBMIT)</option>
                    <option value="VERIFY">ตรวจนับ / รับรอง (VERIFY)</option>
                  </optgroup>
                  <optgroup label="การเบิกจ่ายและลงนาม">
                    <option value="APPROVE">อนุมัติคำขอเบิก (APPROVE)</option>
                    <option value="SIGN">ลงนามคำขอเบิก (SIGN)</option>
                    <option value="DISBURSE">จ่ายเงินสำเร็จ (DISBURSE)</option>
                  </optgroup>
                  <optgroup label="สลิปถวายทรัพย์">
                    <option value="APPROVE_LINE_SLIP">
                      อนุมัติสลิป (APPROVE_LINE_SLIP)
                    </option>
                    <option value="REJECT_LINE_SLIP">
                      ปฏิเสธสลิป (REJECT_LINE_SLIP)
                    </option>
                    <option value="LINK_LINE_MEMBER">
                      เชื่อมโยงสมาชิก (LINK_LINE_MEMBER)
                    </option>
                  </optgroup>
                  <optgroup label="ผู้ใช้งานและความปลอดภัย">
                    <option value="owner_auto_promote">
                      กู้คืนสิทธิ์เจ้าของระบบ (owner_auto_promote)
                    </option>
                    <option value="update_user_role">
                      เปลี่ยนบทบาท (update_user_role)
                    </option>
                    <option value="approve_user">
                      อนุมัติบัญชี (approve_user)
                    </option>
                    <option value="disable_user">
                      ปิดการใช้งาน (disable_user)
                    </option>
                    <option value="delete_user">
                      ลบบัญชีผู้ใช้ (delete_user)
                    </option>
                  </optgroup>
                  <optgroup label="การตั้งค่าระบบ">
                    <option value="update_church_profile">
                      ตั้งค่าคริสตจักร (update_church_profile)
                    </option>
                    <option value="update_profile">
                      แก้ไขโปรไฟล์ส่วนตัว (update_profile)
                    </option>
                    <option value="save_station_poster">
                      บันทึกโปสเตอร์จุดถวาย (save_station_poster)
                    </option>
                  </optgroup>
                </NativeSelect>
              </div>
            </div>

            {auditQuery.isLoading ? (
              <div className="py-12 flex flex-col items-center justify-center text-sm text-ink-3 gap-3">
                <Loader2 className="w-6 h-6 animate-spin text-brand" />
                <span>กำลังโหลด Audit Log...</span>
              </div>
            ) : (
              (() => {
                const AUDIT_ACTION_THAI: Record<string, string> = {
                  owner_auto_promote: "กู้คืนสิทธิ์เจ้าของระบบ",
                  update_user_role: "เปลี่ยนบทบาท",
                  AUTH_SET_CHURCH_ROLE: "เปลี่ยนบทบาท",
                  approve_user: "อนุมัติบัญชี",
                  disable_user: "ปิดการใช้งาน",
                  delete_user: "ลบบัญชีผู้ใช้",
                  CREATE: "บันทึกใหม่",
                  UPDATE: "แก้ไขข้อมูล",
                  VOID: "ยกเลิกรายการ",
                  DELETE: "ลบข้อมูล",
                  APPROVE: "อนุมัติ",
                  APPROVE_LINE_SLIP: "อนุมัติสลิป",
                  REJECT_LINE_SLIP: "ปฏิเสธสลิป",
                  LINK_LINE_MEMBER: "เชื่อมโยงสมาชิก",
                  SIGN: "ลงนาม",
                  DISBURSE: "จ่ายเงินแล้ว",
                  POST: "โพสต์ลงบัญชี",
                  SUBMIT: "ส่งตรวจนับ",
                  VERIFY: "ตรวจนับแล้ว",
                  update_church_profile: "ตั้งค่าคริสตจักร",
                  update_profile: "แก้ไขโปรไฟล์ส่วนตัว",
                  save_station_poster: "บันทึกโปสเตอร์จุดถวาย",
                };

                const logs = (auditQuery.data || []).filter(log => {
                  const actionThai = AUDIT_ACTION_THAI[log.action] || "";
                  const matchesSearch =
                    !auditSearch ||
                    (log.userName &&
                      log.userName
                        .toLowerCase()
                        .includes(auditSearch.toLowerCase())) ||
                    (log.userEmail &&
                      log.userEmail
                        .toLowerCase()
                        .includes(auditSearch.toLowerCase())) ||
                    log.action
                      .toLowerCase()
                      .includes(auditSearch.toLowerCase()) ||
                    actionThai
                      .toLowerCase()
                      .includes(auditSearch.toLowerCase()) ||
                    (log.entity &&
                      log.entity
                        .toLowerCase()
                        .includes(auditSearch.toLowerCase()));
                  const matchesFilter =
                    auditActionFilter === "ALL" ||
                    log.action === auditActionFilter;
                  return matchesSearch && matchesFilter;
                });

                if (logs.length === 0) {
                  return (
                    <div className="py-10 text-center text-sm text-ink-3 bg-paper-2 rounded-2xl border-[1.5px] border-[var(--ink)]/20">
                      ยังไม่พบบันทึกประวัติ หรือไม่ตรงกับเงื่อนไขการค้นหา
                    </div>
                  );
                }

                const renderBadge = (action: string) => {
                  switch (action) {
                    case "CREATE":
                      return (
                        <span className="px-2.5 py-0.5 rounded-full bg-accent text-accent-foreground font-extrabold text-[11px] border border-[var(--ink)]">
                          บันทึกใหม่
                        </span>
                      );
                    case "UPDATE":
                      return (
                        <span className="px-2.5 py-0.5 rounded-full bg-tile-sky text-tile-sky-ink font-bold text-[11px] border border-[var(--ink)]/20">
                          แก้ไขข้อมูล
                        </span>
                      );
                    case "VOID":
                      return (
                        <span className="px-2.5 py-0.5 rounded-full bg-danger/15 text-danger font-extrabold text-[11px] border border-danger/30">
                          ยกเลิกรายการ
                        </span>
                      );
                    case "DELETE":
                    case "delete_user":
                      return (
                        <span className="px-2.5 py-0.5 rounded-full bg-danger/20 text-danger font-extrabold text-[11px] border border-danger/40">
                          ลบข้อมูล
                        </span>
                      );
                    case "APPROVE":
                    case "APPROVE_LINE_SLIP":
                    case "approve_user":
                      return (
                        <span className="px-2.5 py-0.5 rounded-full bg-tile-mint text-tile-mint-ink font-extrabold text-[11px] border border-[var(--ink)]">
                          อนุมัติ
                        </span>
                      );
                    case "REJECT_LINE_SLIP":
                      return (
                        <span className="px-2.5 py-0.5 rounded-full bg-tile-peach text-tile-peach-ink font-extrabold text-[11px] border border-danger/30">
                          ปฏิเสธสลิป
                        </span>
                      );
                    case "SIGN":
                      return (
                        <span className="px-2.5 py-0.5 rounded-full bg-tile-lavender text-tile-lavender-ink font-extrabold text-[11px] border border-[var(--ink)]">
                          ลงนาม
                        </span>
                      );
                    case "DISBURSE":
                      return (
                        <span className="px-2.5 py-0.5 rounded-full bg-brand text-white font-extrabold text-[11px] border border-[var(--ink)]">
                          จ่ายเงินแล้ว
                        </span>
                      );
                    case "POST":
                      return (
                        <span className="px-2.5 py-0.5 rounded-full bg-tile-mint text-tile-mint-ink font-extrabold text-[11px] border border-[var(--ink)]">
                          โพสต์ลงบัญชี
                        </span>
                      );
                    case "SUBMIT":
                    case "VERIFY":
                      return (
                        <span className="px-2.5 py-0.5 rounded-full bg-tile-sand text-tile-sand-ink font-bold text-[11px] border border-[var(--ink)]/30">
                          {action === "SUBMIT" ? "ส่งตรวจนับ" : "ตรวจนับแล้ว"}
                        </span>
                      );
                    case "owner_auto_promote":
                      return (
                        <span className="px-2.5 py-0.5 rounded-full bg-accent text-accent-foreground font-extrabold text-[11px] border border-[var(--ink)]">
                          กู้คืนสิทธิ์เจ้าของระบบ
                        </span>
                      );
                    case "update_user_role":
                    case "AUTH_SET_CHURCH_ROLE":
                      return (
                        <span className="px-2.5 py-0.5 rounded-full bg-brand/15 text-brand font-extrabold text-[11px] border border-brand/30">
                          เปลี่ยนบทบาท
                        </span>
                      );
                    case "disable_user":
                      return (
                        <span className="px-2.5 py-0.5 rounded-full bg-danger/15 text-danger font-bold text-[11px] border border-danger/30">
                          ปิดการใช้งาน
                        </span>
                      );
                    default:
                      return (
                        <span className="px-2.5 py-0.5 rounded-full bg-paper-2 text-ink-2 font-mono text-[11px] border border-[var(--ink)]/20">
                          {action}
                        </span>
                      );
                  }
                };

                return (
                  <>
                    {/* Mobile Cards (md:hidden) */}
                    <div className="md:hidden space-y-3">
                      {logs.map(log => {
                        const dateStr = new Date(
                          log.createdAt
                        ).toLocaleDateString(THAI_LOCALE, {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        });

                        return (
                          <div
                            key={log.id}
                            className="p-4 rounded-2xl border-2 border-[var(--ink)] bg-paper-2 shadow-[2px_2px_0_var(--ink)] space-y-2.5"
                          >
                            <div className="flex items-center justify-between gap-2">
                              {renderBadge(log.action)}
                              <span className="font-mono text-[11px] text-ink-3">
                                {dateStr}
                              </span>
                            </div>

                            <div className="text-xs">
                              <span className="text-ink-3">ผู้ดำเนินการ: </span>
                              <span className="font-extrabold text-ink">
                                {log.userName || "ไม่ระบุชื่อ"}
                              </span>
                              {log.userEmail && (
                                <span className="text-ink-3 font-mono text-[11px] block">
                                  {log.userEmail}
                                </span>
                              )}
                            </div>

                            <div className="text-xs flex items-center gap-2">
                              <span className="text-ink-3">เป้าหมาย:</span>
                              <span className="font-mono text-xs bg-surface px-2 py-0.5 rounded border border-[var(--ink)]/20 font-bold text-ink">
                                {log.entity}
                                {log.entityId ? ` #${log.entityId}` : ""}
                              </span>
                            </div>

                            {Boolean(log.metadata) && (
                              <div className="font-mono text-[11px] bg-surface p-2 rounded-lg border border-[var(--ink)]/15 text-ink-2 break-all max-h-24 overflow-y-auto">
                                {JSON.stringify(log.metadata)}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Desktop Table (hidden md:block) */}
                    <div className="hidden md:block overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b-2 border-[var(--ink)] font-extrabold text-ink">
                            <th className="pb-3 px-3">วัน-เวลา</th>
                            <th className="pb-3 px-3">ผู้ดำเนินการ (Actor)</th>
                            <th className="pb-3 px-3">กิจกรรม (Action)</th>
                            <th className="pb-3 px-3">เป้าหมาย (Target)</th>
                            <th className="pb-3 px-3">รายละเอียด (Details)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-line">
                          {logs.map(log => {
                            const dateStr = new Date(
                              log.createdAt
                            ).toLocaleDateString(THAI_LOCALE, {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                              second: "2-digit",
                            });

                            return (
                              <tr
                                key={log.id}
                                className="hover:bg-paper-2/60 transition-colors"
                              >
                                <td className="py-3.5 px-3 text-ink-3 font-mono whitespace-nowrap">
                                  {dateStr}
                                </td>
                                <td className="py-3.5 px-3 font-semibold text-ink">
                                  <div>{log.userName || "ไม่ระบุชื่อ"}</div>
                                  {log.userEmail && (
                                    <div className="text-xs text-ink-3 font-normal">
                                      {log.userEmail}
                                    </div>
                                  )}
                                </td>
                                <td className="py-3.5 px-3 whitespace-nowrap">
                                  {renderBadge(log.action)}
                                </td>
                                <td className="py-3.5 px-3 text-ink-2">
                                  <span className="font-mono text-xs bg-paper-2 px-2 py-0.5 rounded-md border border-[var(--ink)]/20">
                                    {log.entity}
                                    {log.entityId ? ` #${log.entityId}` : ""}
                                  </span>
                                </td>
                                <td className="py-3.5 px-3 text-ink-2 max-w-sm">
                                  {log.metadata ? (
                                    <div
                                      className="font-mono text-xs bg-paper-2 p-1.5 rounded-lg border border-[var(--ink)]/20 truncate max-w-[280px]"
                                      title={JSON.stringify(
                                        log.metadata,
                                        null,
                                        2
                                      )}
                                    >
                                      {JSON.stringify(log.metadata)}
                                    </div>
                                  ) : (
                                    "-"
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </>
                );
              })()
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
