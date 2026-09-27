import React, { useEffect, useState } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  Banknote,
  Building,
  CheckCircle2,
  CreditCard,
  Loader2,
  Lock,
  Save,
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
import { ErrorState, LoadingSkeleton } from "@/components/common/CommonUI";

const ROLE_OPTIONS = Object.values(CHURCH_ROLES);

const FIELD_CLASS =
  "min-h-11 w-full px-4 py-2.5 rounded-xl border border-[#E7DCC8] bg-white text-base md:text-sm text-[#171311] placeholder:text-[#807266] focus:border-[#0066CC] focus-visible:ring-2 focus-visible:ring-[#0066CC]/30";

type ProfileFields = {
  name: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  pastorName: string;
  assistantPastorName: string;
  treasurerName: string;
  bankName: string;
  bankAccount: string;
  bankAccountName: string;
  motto: string;
};

const EMPTY_PROFILE: ProfileFields = {
  name: "",
  address: "",
  phone: "",
  email: "",
  website: "",
  pastorName: "",
  assistantPastorName: "",
  treasurerName: "",
  bankName: "",
  bankAccount: "",
  bankAccountName: "",
  motto: "",
};

const AUDIT_ACTION_LABELS: Record<string, string> = {
  AUTH_SET_CHURCH_ROLE: "เปลี่ยนบทบาทผู้ใช้",
  AUTH_UPDATE_PROFILE: "แก้ไขโปรไฟล์",
  CHURCH_UPDATE_PROFILE: "แก้ไขข้อมูลคริสตจักร",
};

const TABS = [
  { id: "church", label: "ข้อมูลคริสตจักร" },
  { id: "roles", label: "บทบาทและสิทธิ์" },
  { id: "categories", label: "หมวดหมู่บัญชี" },
  { id: "payment", label: "บัญชีธนาคาร" },
  { id: "audit", label: "ประวัติการใช้งาน" },
] as const;
import { NativeSelect } from "@/components/ui/native-select";

export default function Settings() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<
    "church" | "roles" | "categories" | "payment" | "audit"
  >("church");
  const utils = trpc.useUtils();

  const {
    data: churchProfile,
    isLoading,
    isError: profileError,
    refetch,
  } = trpc.church.getProfile.useQuery(undefined, { retry: false });

  const usersQuery = trpc.auth.listUsers.useQuery(undefined, {
    enabled: activeTab === "roles",
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

  const handleRoleChange = async (userId: number, newRole: string) => {
    const targetUser = usersQuery.data?.find(u => u.id === userId);
    const targetRoleInfo = getChurchRoleInfo(newRole as any);

    const isConfirmed = await Swal.confirm(
      "ยืนยันการเปลี่ยนบทบาท?",
      `คุณต้องการปรับบทบาทของ "${targetUser?.name || targetUser?.email || "ผู้ใช้งาน"}" เป็น "${targetRoleInfo.label}" หรือไม่? ผู้ใช้จะได้รับสิทธิ์และเมนูตามบทบาทนี้ทันที`,
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
      toast.success(
        `เปลี่ยนบทบาทของ ${targetUser?.name || "ผู้ใช้งาน"} เป็น ${targetRoleInfo.label} แล้ว`
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

  // Every editable field is tracked. The old baseline left out website,
  // assistant pastor and all three bank fields, so leaving the page after
  // editing the bank account gave no unsaved-changes warning.
  const [form, setForm] = useState<ProfileFields>(EMPTY_PROFILE);
  const [baseline, setBaseline] = useState<ProfileFields>(EMPTY_PROFILE);
  const [isSaving, setIsSaving] = useState(false);
  const setField = (key: keyof ProfileFields) => (value: string) =>
    setForm(current => ({ ...current, [key]: value }));
  const {
    name,
    address,
    phone,
    email,
    website,
    pastorName,
    assistantPastorName,
    treasurerName,
    bankName,
    bankAccount,
    bankAccountName,
    motto,
  } = form;

  useEffect(() => {
    if (!churchProfile) return;
    const loaded: ProfileFields = {
      name: churchProfile.name || "",
      address: churchProfile.address || "",
      phone: churchProfile.phone || "",
      email: churchProfile.email || "",
      website: churchProfile.website || "",
      pastorName: churchProfile.pastorName || "",
      assistantPastorName: churchProfile.assistantPastorName || "",
      treasurerName: churchProfile.treasurerName || "",
      bankName: churchProfile.bankName || "",
      bankAccount: churchProfile.bankAccount || "",
      bankAccountName: churchProfile.bankAccountName || "",
      motto: churchProfile.motto || "",
    };
    setForm(loaded);
    setBaseline(loaded);
  }, [churchProfile]);

  const isDirty = (Object.keys(form) as Array<keyof ProfileFields>).some(
    key => form[key] !== baseline[key]
  );
  useUnsavedChanges(isDirty);

  const updateProfileMutation = trpc.church.updateProfile.useMutation({
    onSuccess: async () => {
      setIsSaving(false);
      void utils.church.getProfile.invalidate();
      refetch();
      toast.success("บันทึกการตั้งค่าข้อมูลคริสตจักรเรียบร้อยแล้ว");
    },
    onError: async error => {
      setIsSaving(false);
      await Swal.error(
        "บันทึกไม่สำเร็จ",
        error.message || "บันทึกการตั้งค่าไม่สำเร็จ กรุณาลองใหม่อีกครั้ง"
      );
    },
  });

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    // Saving a form that never loaded would overwrite stored values with
    // the empty defaults.
    if (isSaving || !churchProfile) return;
    setIsSaving(true);
    updateProfileMutation.mutate({
      name,
      address,
      phone,
      email,
      website,
      pastorName,
      assistantPastorName,
      treasurerName,
      bankName,
      bankAccount,
      bankAccountName,
      fiscalYearStartMonth: churchProfile?.fiscalYearStartMonth ?? 1,
      motto,
    });
  };

  const churchRoles = [
    {
      role: "SUPER_ADMIN",
      title: "ผู้ดูแลระบบสูงสุด",
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
      title: "มัคนายก / คณะกรรมการ",
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
      role: "MEMBER",
      title: "สมาชิกคริสตจักร",
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

  if (!isSuperAdmin(user)) {
    return (
      <AppLayout>
        <div className="max-w-xl mx-auto my-12 bg-white rounded-2xl p-8 border-2 border-[#E7DCC8] text-center space-y-4 shadow-sm">
          <div className="w-16 h-16 rounded-full bg-rose-100 border-2 border-rose-200 mx-auto flex items-center justify-center text-rose-600">
            <Lock className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-semibold tracking-tight text-[#171311]">
            สิทธิ์การเข้าถึงถูกจำกัด
          </h2>
          <p className="text-sm text-[#807266]">
            หน้านี้สงวนไว้สำหรับ{" "}
            <strong className="text-amber-800 font-bold">
              ผู้ดูแลระบบสูงสุด (SUPER_ADMIN)
            </strong>{" "}
            เท่านั้น
            เพื่อความปลอดภัยของข้อมูลคริสตจักรและการกำหนดสิทธิ์ผู้ใช้งาน
          </p>
          <div className="pt-2">
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#0066CC] text-white font-bold text-sm hover:bg-[#0052A3] transition-all shadow-xs"
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
        <div className="relative">
          <div
            role="group"
            aria-label="หมวดการตั้งค่า"
            className="flex items-center gap-1.5 sm:gap-2 border-b border-[#E7DCC8] pb-1 overflow-x-auto no-scrollbar -mx-1 px-1 touch-pan-x"
          >
            {TABS.map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                aria-pressed={activeTab === tab.id}
                className={`min-h-11 px-3.5 sm:px-5 py-2 rounded-xl text-sm font-semibold transition-colors whitespace-nowrap border ${
                  activeTab === tab.id
                    ? "bg-[#CFE4FA] text-[#0052A3] border-[#9CC7EC]"
                    : "text-[#51443A] border-transparent hover:bg-[#FFF8EA]"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div
            aria-hidden="true"
            className="pointer-events-none absolute right-0 top-0 bottom-1 w-8 bg-gradient-to-l from-[#FFF4D6] to-transparent"
          />
        </div>

        {(activeTab === "church" || activeTab === "payment") &&
          (isLoading ? (
            <LoadingSkeleton count={2} />
          ) : profileError || !churchProfile ? (
            <ErrorState
              title="โหลดข้อมูลคริสตจักรไม่สำเร็จ"
              description="แก้ไขได้หลังโหลดข้อมูลสำเร็จ เพื่อไม่ให้ค่าที่บันทึกไว้ถูกเขียนทับด้วยช่องว่าง"
              onRetry={() => void refetch()}
            />
          ) : null)}

        {/* Tab 1: Church Profile Form */}
        {activeTab === "church" && churchProfile && (
          <form onSubmit={handleSaveProfile} className="space-y-6">
            <div className="bg-white rounded-2xl border border-[#E7DCC8] p-6 md:p-8 space-y-5">
              <h3 className="text-base font-semibold tracking-tight text-[#171311] flex items-center gap-2">
                <Building
                  className="w-5 h-5 text-[#0066CC]"
                  aria-hidden="true"
                />
                ข้อมูลทั่วไปของคริสตจักร
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="space-y-1.5 sm:col-span-2">
                  <label
                    htmlFor="church-name"
                    className="font-semibold text-[#171311]"
                  >
                    ชื่อคริสตจักร{" "}
                    <span className="text-[#C8372D]" aria-hidden="true">
                      *
                    </span>
                  </label>
                  <input
                    id="church-name"
                    type="text"
                    required
                    value={name}
                    onChange={e => setField("name")(e.target.value)}
                    className={`${FIELD_CLASS} font-semibold`}
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <label
                    htmlFor="church-motto"
                    className="font-semibold text-[#171311]"
                  >
                    คำขวัญ / นิมิตคริสตจักร
                  </label>
                  <input
                    id="church-motto"
                    type="text"
                    value={motto}
                    onChange={e => setField("motto")(e.target.value)}
                    className={FIELD_CLASS}
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <label
                    htmlFor="church-address"
                    className="font-semibold text-[#171311]"
                  >
                    ที่อยู่คริสตจักร
                  </label>
                  <textarea
                    id="church-address"
                    rows={2}
                    value={address}
                    onChange={e => setField("address")(e.target.value)}
                    className={FIELD_CLASS}
                  />
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="church-phone"
                    className="font-semibold text-[#171311]"
                  >
                    เบอร์โทรศัพท์
                  </label>
                  <input
                    id="church-phone"
                    type="text"
                    value={phone}
                    onChange={e => setField("phone")(e.target.value)}
                    className={FIELD_CLASS}
                  />
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="church-email"
                    className="font-semibold text-[#171311]"
                  >
                    อีเมลทางการ
                  </label>
                  <input
                    id="church-email"
                    type="email"
                    value={email}
                    onChange={e => setField("email")(e.target.value)}
                    className={FIELD_CLASS}
                  />
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="church-pastorName"
                    className="font-semibold text-[#171311]"
                  >
                    ศิษยาภิบาลอาวุโส
                  </label>
                  <input
                    id="church-pastorName"
                    type="text"
                    value={pastorName}
                    onChange={e => setField("pastorName")(e.target.value)}
                    className={FIELD_CLASS}
                  />
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="church-treasurerName"
                    className="font-semibold text-[#171311]"
                  >
                    เหรัญญิกคริสตจักร
                  </label>
                  <input
                    id="church-treasurerName"
                    type="text"
                    value={treasurerName}
                    onChange={e => setField("treasurerName")(e.target.value)}
                    className={FIELD_CLASS}
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isSaving || !isDirty}
                className="min-h-11 px-8 rounded-xl bg-[#0066CC] hover:bg-[#0052A3] text-white font-semibold text-sm button-elevation transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                <Save className="w-4 h-4" aria-hidden="true" />
                <span>{isSaving ? "กำลังบันทึก..." : "บันทึกการตั้งค่า"}</span>
              </button>
            </div>
          </form>
        )}

        {/* Account and sign out */}
        {activeTab === "church" && (
          <section className="rounded-2xl border border-[#E7DCC8] bg-white p-6 md:p-8">
            <h3 className="text-base font-semibold tracking-tight text-[#171311]">บัญชีผู้ใช้</h3>
            <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm text-[#51443A]">
                <p className="font-bold text-[#171311]">
                  {user?.name || "ผู้ใช้งาน"}
                </p>
                <p>{user?.email || "ไม่ระบุอีเมล"}</p>
                <p className="mt-1">
                  บทบาทในระบบ:{" "}
                  <span className="font-bold text-[#171311]">
                    {getChurchRoleInfo(user?.churchRole).label}
                  </span>
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href="/profile"
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#E7DCC8] bg-white px-5 py-2.5 text-sm font-bold text-[#51443A] transition-colors hover:bg-[#FFF8EA]"
                >
                  <UserCheck
                    className="h-4 w-4 text-[#0066CC]"
                    aria-hidden="true"
                  />
                  ดูโปรไฟล์เต็ม
                </Link>
                <button
                  type="button"
                  onClick={() => void logout()}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#F8C8C5] bg-white px-5 py-2.5 text-sm font-bold text-[#B92A20] transition-colors hover:bg-[#FEECEB]"
                >
                  <LogOut className="h-4 w-4" aria-hidden="true" />
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
            <div className="bg-white rounded-2xl border border-[#E7DCC8] p-6 md:p-8 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E7DCC8]/60 pb-5">
                <div>
                  <h3 className="text-lg font-semibold tracking-tight text-[#171311] flex items-center gap-2">
                    <Users className="w-5 h-5 text-[#0066CC]" />
                    จัดการบทบาทและสิทธิ์ผู้ใช้งานในระบบ
                  </h3>
                  <p className="text-xs text-[#807266] mt-1">
                    กำหนดบทบาทให้ผู้ที่เข้าสู่ระบบ
                    เพื่อให้ได้รับสิทธิ์การใช้งานตรงตามตำแหน่งหน้าที่จริง
                  </p>
                </div>
                {user?.churchRole === "SUPER_ADMIN" ||
                user?.role === "admin" ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300 self-start sm:self-auto">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    คุณมีสิทธิ์กำหนดบทบาท
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-300 self-start sm:self-auto">
                    เฉพาะผู้ดูแลระบบสูงสุดที่สามารถเปลี่ยนสิทธิ์ได้
                  </span>
                )}
              </div>

              {/* Search & Filter Bar */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search
                    className="pointer-events-none w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#807266]"
                    aria-hidden="true"
                  />
                  <input
                    type="search"
                    aria-label="ค้นหาชื่อผู้ใช้งาน หรือ อีเมล"
                    placeholder="ค้นหาชื่อผู้ใช้งาน หรือ อีเมล..."
                    value={roleSearch}
                    onChange={e => setRoleSearch(e.target.value)}
                    className={`${FIELD_CLASS} pl-9`}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Filter
                    className="w-4 h-4 text-[#807266] shrink-0"
                    aria-hidden="true"
                  />
                  <NativeSelect
                    aria-label="กรองตามบทบาท"
                    value={roleFilter}
                    onChange={e => setRoleFilter(e.target.value)}
                    className="font-semibold focus:ring-2 focus:ring-[#0066CC]/20"
                  >
                    <option value="ALL">บทบาททั้งหมด</option>
                    {ROLE_OPTIONS.map(r => (
                      <option key={r.role} value={r.role}>
                        {r.label}
                      </option>
                    ))}
                  </NativeSelect>
                </div>
              </div>

              {usersQuery.isLoading ? (
                <div className="py-12 flex flex-col items-center justify-center text-sm text-[#807266] gap-3">
                  <Loader2 className="w-6 h-6 animate-spin text-[#0066CC]" />
                  <span>กำลังโหลดรายชื่อผู้ใช้งาน...</span>
                </div>
              ) : usersQuery.isError ? (
                <ErrorState
                  title="โหลดรายชื่อผู้ใช้งานไม่สำเร็จ"
                  description="เชื่อมต่อฐานข้อมูลไม่สำเร็จ กรุณาลองใหม่อีกครั้ง"
                  onRetry={() => void usersQuery.refetch()}
                />
              ) : !usersQuery.data || usersQuery.data.length === 0 ? (
                <div className="py-8 text-center text-sm text-[#807266] bg-[#FAF8F5] rounded-2xl border border-[#E7DCC8]/60">
                  ยังไม่พบข้อมูลผู้ใช้งานในระบบ
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-[#E7DCC8]/70 text-xs font-bold text-[#807266] uppercase">
                        <th className="pb-3 px-3">ผู้ใช้งาน</th>
                        <th className="pb-3 px-3 hidden sm:table-cell">
                          อีเมล
                        </th>
                        <th className="pb-3 px-3 hidden md:table-cell">
                          เข้าใช้ล่าสุด
                        </th>
                        <th className="pb-3 px-3 text-right">บทบาทในระบบ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E7DCC8]/40">
                      {(() => {
                        const filteredUsers = (usersQuery.data || []).filter(
                          u => {
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
                          }
                        );

                        if (filteredUsers.length === 0) {
                          return (
                            <tr>
                              <td
                                colSpan={4}
                                className="py-8 text-center text-xs text-[#807266] bg-[#FAF8F5]/30"
                              >
                                ไม่พบผู้ใช้งานที่ตรงกับเงื่อนไขการค้นหา
                              </td>
                            </tr>
                          );
                        }

                        return filteredUsers.map(u => {
                          const isMe = u.openId === user?.openId;
                          const isUpdating = updatingUserId === u.id;
                          const canEdit =
                            user?.churchRole === "SUPER_ADMIN" ||
                            user?.role === "admin";

                          return (
                            <tr
                              key={u.id}
                              className="hover:bg-[#FAF8F5]/50 transition-colors"
                            >
                              <td className="py-3.5 px-3">
                                <div className="font-bold text-[#171311] flex items-center gap-2">
                                  <span>{u.name || "ไม่ระบุชื่อ"}</span>
                                  {isMe && (
                                    <span className="text-xs bg-[#FFF4D6] text-[#0052A3] font-semibold px-2 py-0.5 rounded-full border border-[#CFE4FA]">
                                      คุณ
                                    </span>
                                  )}
                                </div>

                                <div className="sm:hidden text-xs font-normal text-[#807266] break-all">
                                  {u.email || "-"}
                                </div>
                              </td>
                              <td className="py-3.5 px-3 text-[#51443A] hidden sm:table-cell">
                                {u.email || "-"}
                              </td>
                              <td className="py-3.5 px-3 text-xs text-[#807266] hidden md:table-cell">
                                {u.lastSignedIn
                                  ? new Date(u.lastSignedIn).toLocaleDateString(
                                      "th-TH",
                                      {
                                        year: "numeric",
                                        month: "short",
                                        day: "numeric",
                                        hour: "2-digit",
                                        minute: "2-digit",
                                      }
                                    )
                                  : "-"}
                              </td>
                              <td className="py-3.5 px-3 text-right">
                                {canEdit ? (
                                  <div className="inline-flex items-center gap-2">
                                    {isUpdating && (
                                      <Loader2 className="w-4 h-4 animate-spin text-[#0066CC]" />
                                    )}
                                    <NativeSelect
                                      aria-label={`บทบาทของ ${u.name || u.email || "ผู้ใช้งาน"}`}
                                      value={u.churchRole || "MEMBER"}
                                      disabled={isUpdating}
                                      onChange={e =>
                                        handleRoleChange(u.id, e.target.value)
                                      }
                                      className="font-semibold shadow-sm hover:border-[#0066CC] focus:ring-2 focus:ring-[#0066CC]/20 transition-all"
                                    >
                                      {ROLE_OPTIONS.map(r => (
                                        <option key={r.role} value={r.role}>
                                          {r.label}
                                        </option>
                                      ))}
                                    </NativeSelect>
                                  </div>
                                ) : (
                                  <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-[#FFF8EA] text-[#51443A] border border-[#E7DCC8]">
                                    {getChurchRoleInfo(u.churchRole).label}
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        });
                      })()}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Structure and Appointed Roles Reference */}
            <div className="bg-white rounded-2xl border border-[#E7DCC8] p-6 md:p-8 space-y-6">
              <div>
                <h3 className="text-lg font-semibold tracking-tight text-[#171311] flex items-center gap-2">
                  <Shield
                    className="w-5 h-5 text-[#0066CC]"
                    aria-hidden="true"
                  />
                  โครงสร้างสิทธิ์การใช้งาน
                </h3>
                <p className="text-sm text-[#807266] mt-1">
                  หน้าที่ของแต่ละบทบาท และผู้ใช้ที่มีบทบาทนั้นในระบบขณะนี้
                </p>
              </div>

              <div className="space-y-4">
                {churchRoles.map(r => (
                  <div
                    key={r.role}
                    className="p-5 rounded-2xl bg-[#FFF8EA] border border-[#E7DCC8] space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E7DCC8]/50 pb-3">
                      <div>
                        <span className="font-bold text-base text-[#171311]">
                          {r.title}
                        </span>
                        <span className="ml-2.5 font-mono text-xs text-[#807266] bg-white px-2.5 py-0.5 rounded-md border border-[#E7DCC8]">
                          {r.role}
                        </span>
                      </div>
                      <div className="text-xs font-semibold px-3 py-1 rounded-full border bg-white text-[#171311] border-[#E7DCC8] self-start sm:self-auto">
                        ผู้ใช้ในบทบาทนี้:{" "}
                        <span className="text-[#0052A3] font-bold">
                          {usersQuery.isLoading
                            ? "กำลังโหลด…"
                            : usersQuery.isError
                              ? "โหลดไม่สำเร็จ"
                              : (usersQuery.data ?? [])
                                  .filter(
                                    u => (u.churchRole || "MEMBER") === r.role
                                  )
                                  .map(u => u.name || u.email || "ไม่ระบุชื่อ")
                                  .join(", ") || "ยังไม่มี"}
                        </span>
                      </div>
                    </div>

                    <p className="text-xs text-[#807266] leading-relaxed font-medium">
                      {r.desc}
                    </p>

                    <div className="pt-1">
                      <p className="text-xs font-bold text-[#171311] mb-1.5">
                        ขอบเขตหน้าที่ในระบบ:
                      </p>
                      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs text-[#51443A]">
                        {r.duties.map((duty, idx) => (
                          <li key={idx} className="flex items-start gap-1.5">
                            <span
                              className="text-[#0052A3] font-bold"
                              aria-hidden="true"
                            >
                              •
                            </span>
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
          <div className="bg-white rounded-2xl border border-[#E7DCC8] p-6 md:p-8 space-y-5">
            <h3 className="text-base font-semibold tracking-tight text-[#171311] flex items-center gap-2">
              <Banknote className="w-5 h-5 text-[#0066CC]" aria-hidden="true" />
              หมวดหมู่การเงินมาตรฐานคริสตจักร
            </h3>

            <p className="text-sm text-[#51443A]">
              หมวดหมู่เหล่านี้คือค่าที่ระบบใช้จริงทั้งในฐานข้อมูล แบบฟอร์ม
              และรายงาน
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-[#E7DCC8] bg-[#FFF8EA] p-4">
                <p className="font-bold text-[#171311]">
                  หมวดรายรับ (เงินถวาย)
                </p>
                <ul className="mt-2 space-y-1">
                  {OFFERING_CATEGORIES.map(c => (
                    <li
                      key={c.id}
                      className="flex items-center justify-between gap-3 text-sm text-[#51443A]"
                    >
                      <span>{c.label}</span>
                      <span className="font-mono text-xs text-[#807266]">
                        {c.id}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-2xl border border-[#E7DCC8] bg-[#FFF8EA] p-4">
                <p className="font-bold text-[#171311]">หมวดรายจ่าย</p>
                <ul className="mt-2 space-y-1">
                  {EXPENSE_CATEGORIES.map(c => (
                    <li
                      key={c.id}
                      className="flex items-center justify-between gap-3 text-sm text-[#51443A]"
                    >
                      <span>{c.label}</span>
                      <span className="font-mono text-xs text-[#807266]">
                        {c.id}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Bank account. The fields were saved by updateProfile but
            had no inputs, and the tab showed a generic QR icon as if it were
            the church's scannable PromptPay code. */}
        {activeTab === "payment" && churchProfile && (
          <form
            onSubmit={handleSaveProfile}
            className="bg-white rounded-2xl border border-[#E7DCC8] p-6 md:p-8 space-y-5"
          >
            <div>
              <h3 className="text-base font-semibold tracking-tight text-[#171311] flex items-center gap-2">
                <CreditCard
                  className="w-5 h-5 text-[#0066CC]"
                  aria-hidden="true"
                />
                บัญชีรับเงินถวาย
              </h3>
              <p className="text-sm text-[#807266] mt-1">
                ตรวจเลขที่บัญชีให้ถูกต้องก่อนบันทึก
                สมาชิกจะใช้ข้อมูลนี้ในการโอนเงินถวาย
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label
                  htmlFor="bank-name"
                  className="text-sm font-semibold text-[#171311]"
                >
                  ธนาคาร
                </label>
                <input
                  id="bank-name"
                  type="text"
                  maxLength={120}
                  value={bankName}
                  onChange={e => setField("bankName")(e.target.value)}
                  placeholder="เช่น ธนาคารกสิกรไทย"
                  className={FIELD_CLASS}
                />
              </div>
              <div className="space-y-1.5">
                <label
                  htmlFor="bank-account"
                  className="text-sm font-semibold text-[#171311]"
                >
                  เลขที่บัญชี
                </label>
                <input
                  id="bank-account"
                  type="text"
                  inputMode="numeric"
                  maxLength={30}
                  value={bankAccount}
                  onChange={e => setField("bankAccount")(e.target.value)}
                  placeholder="เช่น 123-4-56789-0"
                  className={`${FIELD_CLASS} font-mono`}
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <label
                  htmlFor="bank-account-name"
                  className="text-sm font-semibold text-[#171311]"
                >
                  ชื่อบัญชี
                </label>
                <input
                  id="bank-account-name"
                  type="text"
                  maxLength={120}
                  value={bankAccountName}
                  onChange={e => setField("bankAccountName")(e.target.value)}
                  placeholder="เช่น คริสตจักร... (บัญชีพันธกิจ)"
                  className={FIELD_CLASS}
                />
              </div>
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isSaving || !isDirty}
                className="min-h-11 px-8 rounded-xl bg-[#0066CC] hover:bg-[#0052A3] text-white font-semibold text-sm button-elevation transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                <Save className="w-4 h-4" aria-hidden="true" />
                <span>{isSaving ? "กำลังบันทึก..." : "บันทึกบัญชีธนาคาร"}</span>
              </button>
            </div>
          </form>
        )}

        {/* Tab 5: Audit Log */}
        {activeTab === "audit" && (
          <div className="bg-white rounded-2xl border border-[#E7DCC8] p-6 md:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E7DCC8]/60 pb-5">
              <div>
                <h3 className="text-lg font-semibold tracking-tight text-[#171311] flex items-center gap-2">
                  <FileText
                    className="w-5 h-5 text-[#0066CC]"
                    aria-hidden="true"
                  />
                  บันทึกประวัติการดำเนินงาน
                </h3>
                <p className="text-xs text-[#807266] mt-1">
                  ตรวจสอบความปลอดภัย การปรับเปลี่ยนบทบาทผู้ใช้
                  และการแก้ไขข้อมูลสำคัญทั้งหมดในระบบ
                </p>
              </div>
              <button
                type="button"
                onClick={() => void auditQuery.refetch()}
                disabled={auditQuery.isFetching}
                className="min-h-11 inline-flex items-center gap-1.5 px-4 rounded-xl border border-[#E7DCC8] bg-white hover:bg-[#FFF8EA] text-sm font-semibold text-[#51443A] transition-colors disabled:opacity-50 self-start sm:self-auto"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${
                    auditQuery.isFetching ? "animate-spin text-[#0066CC]" : ""
                  }`}
                />
                <span>รีเฟรชข้อมูล</span>
              </button>
            </div>

            {/* Search & Filter Bar */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search
                  className="pointer-events-none w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#807266]"
                  aria-hidden="true"
                />
                <input
                  type="search"
                  aria-label="ค้นหาชื่อผู้ดำเนินการ อีเมล หรือกิจกรรม"
                  placeholder="ค้นหาชื่อผู้ดำเนินการ, อีเมล หรือกิจกรรม..."
                  value={auditSearch}
                  onChange={e => setAuditSearch(e.target.value)}
                  className={`${FIELD_CLASS} pl-9`}
                />
              </div>
              <div className="flex items-center gap-2">
                <Filter
                  className="w-4 h-4 text-[#807266] shrink-0"
                  aria-hidden="true"
                />
                <NativeSelect
                  aria-label="กรองตามกิจกรรม"
                  value={auditActionFilter}
                  onChange={e => setAuditActionFilter(e.target.value)}
                  className="font-semibold focus:ring-2 focus:ring-[#0066CC]/20"
                >
                  <option value="ALL">กิจกรรมทั้งหมด</option>
                  {Object.entries(AUDIT_ACTION_LABELS).map(([id, label]) => (
                    <option key={id} value={id}>
                      {label}
                    </option>
                  ))}
                </NativeSelect>
              </div>
            </div>

            {auditQuery.isLoading ? (
              <div className="py-12 flex flex-col items-center justify-center text-sm text-[#807266] gap-3">
                <Loader2 className="w-6 h-6 animate-spin text-[#0066CC]" />
                <span>กำลังโหลด Audit Log...</span>
              </div>
            ) : auditQuery.isError ? (
              <ErrorState
                title="โหลดประวัติการใช้งานไม่สำเร็จ"
                description="เชื่อมต่อฐานข้อมูลไม่สำเร็จ กรุณาลองใหม่อีกครั้ง"
                onRetry={() => void auditQuery.refetch()}
              />
            ) : (
              (() => {
                const logs = (auditQuery.data || []).filter(log => {
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
                      .includes(auditSearch.toLowerCase());
                  const matchesFilter =
                    auditActionFilter === "ALL" ||
                    log.action === auditActionFilter;
                  return matchesSearch && matchesFilter;
                });

                if (logs.length === 0) {
                  return (
                    <div className="py-10 text-center text-sm text-[#807266] bg-[#FAF8F5] rounded-2xl border border-[#E7DCC8]/60">
                      ยังไม่พบบันทึกประวัติ หรือไม่ตรงกับเงื่อนไขการค้นหา
                    </div>
                  );
                }

                return (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-[#E7DCC8]/70 font-bold text-[#807266] uppercase">
                          <th className="pb-3 px-3">วัน-เวลา</th>
                          <th className="pb-3 px-3">ผู้ดำเนินการ (Actor)</th>
                          <th className="pb-3 px-3">กิจกรรม (Action)</th>
                          <th className="pb-3 px-3">เป้าหมาย (Target)</th>
                          <th className="pb-3 px-3">รายละเอียด (Details)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E7DCC8]/40">
                        {logs.map(log => {
                          const dateStr = new Date(
                            log.createdAt
                          ).toLocaleDateString("th-TH", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                            second: "2-digit",
                          });

                          const actionBadge = (
                            <span className="px-2.5 py-1 rounded-full bg-[#FFF8EA] text-[#51443A] font-semibold text-xs border border-[#E7DCC8]">
                              {AUDIT_ACTION_LABELS[log.action] ?? log.action}
                            </span>
                          );

                          return (
                            <tr
                              key={log.id}
                              className="hover:bg-[#FAF8F5]/50 transition-colors"
                            >
                              <td className="py-3.5 px-3 text-[#807266] font-mono whitespace-nowrap">
                                {dateStr}
                              </td>
                              <td className="py-3.5 px-3 font-semibold text-[#171311]">
                                <div>{log.userName || "ไม่ระบุชื่อ"}</div>
                                {log.userEmail && (
                                  <div className="text-[11px] text-[#807266] font-normal">
                                    {log.userEmail}
                                  </div>
                                )}
                              </td>
                              <td className="py-3.5 px-3 whitespace-nowrap">
                                {actionBadge}
                              </td>
                              <td className="py-3.5 px-3 text-[#51443A]">
                                <span className="font-mono text-[11px] bg-[#FFF8EA] px-2 py-0.5 rounded-md border border-[#E7DCC8]">
                                  {log.entity}
                                  {log.entityId ? ` #${log.entityId}` : ""}
                                </span>
                              </td>
                              <td className="py-3.5 px-3 text-[#51443A] max-w-sm">
                                {log.metadata ? (
                                  <div
                                    className="font-mono text-[11px] bg-slate-50 p-1.5 rounded-lg border border-slate-200 truncate max-w-[280px]"
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
                );
              })()
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
