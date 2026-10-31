export type ChurchRole =
  | "SUPER_ADMIN"
  | "PASTOR"
  | "TREASURER"
  | "DEACON"
  | "COUNTER"
  | "MEMBER";

export interface ChurchRoleInfo {
  role: ChurchRole;
  label: string;
  labelWithCode: string;
  badgeLabel: string;
  badgeColor: string;
  icon: string;
  description: string;
}

export const CHURCH_ROLES: Record<ChurchRole, ChurchRoleInfo> = {
  SUPER_ADMIN: {
    role: "SUPER_ADMIN",
    label: "ผู้ดูแลระบบสูงสุด",
    labelWithCode: "ผู้ดูแลระบบสูงสุด (SUPER_ADMIN)",
    badgeLabel: "👑 ผู้ดูแลระบบสูงสุด (SUPER_ADMIN)",
    badgeColor: "bg-amber-100 text-amber-900 border-amber-300",
    icon: "👑",
    description:
      "มีสิทธิ์สูงสุดในการดูแลระบบ ตั้งค่าคริสตจักร และกำหนดสิทธิ์ผู้ใช้งาน",
  },
  PASTOR: {
    role: "PASTOR",
    label: "ศิษยาภิบาล",
    labelWithCode: "ศิษยาภิบาล (PASTOR)",
    badgeLabel: "✝️ ศิษยาภิบาล (PASTOR)",
    badgeColor: "bg-blue-100 text-blue-900 border-blue-300",
    icon: "✝️",
    description:
      "ผู้นำฝ่ายจิตวิญญาณและพันธกิจคริสตจักร ดูแลภาพรวมและรายงานการเงิน",
  },
  TREASURER: {
    role: "TREASURER",
    label: "เหรัญญิกคริสตจักร",
    labelWithCode: "เหรัญญิกคริสตจักร (TREASURER)",
    badgeLabel: "💰 เหรัญญิกคริสตจักร (TREASURER)",
    badgeColor: "bg-emerald-100 text-emerald-900 border-emerald-300",
    icon: "💰",
    description:
      "ผู้รับผิดชอบการเงิน บัญชี ตรวจสอบเงินถวาย และอนุมัติการเบิกจ่าย",
  },
  DEACON: {
    role: "DEACON",
    label: "ผู้รับผิดชอบฝ่าย",
    labelWithCode: "ผู้รับผิดชอบฝ่าย",
    badgeLabel: "🤝 ผู้รับผิดชอบฝ่าย",
    badgeColor: "bg-purple-100 text-purple-900 border-purple-300",
    icon: "🤝",
    description:
      "รับผิดชอบงานและงบประมาณของฝ่าย เสนอคำของบประมาณและรายการเบิกจ่าย",
  },
  COUNTER: {
    role: "COUNTER",
    label: "กรรมการนับเงิน",
    labelWithCode: "กรรมการนับเงิน (COUNTER)",
    badgeLabel: "📝 กรรมการนับเงิน (COUNTER)",
    badgeColor: "bg-orange-100 text-orange-900 border-orange-300",
    icon: "📝",
    description: "บันทึกและตรวจนับเงินถวายรอบนมัสการร่วมกับทีม",
  },
  MEMBER: {
    role: "MEMBER",
    label: "สมาชิกคริสตจักร",
    labelWithCode: "สมาชิกคริสตจักร (MEMBER)",
    badgeLabel: "👤 สมาชิกคริสตจักร (MEMBER)",
    badgeColor: "bg-stone-100 text-stone-800 border-stone-300",
    icon: "👤",
    description: "ดูข่าวสาร พันธกิจ และบันทึกประวัติการถวายทรัพย์ส่วนตัว",
  },
};

export function getChurchRoleInfo(role?: string | null): ChurchRoleInfo {
  if (role && role in CHURCH_ROLES) {
    return CHURCH_ROLES[role as ChurchRole];
  }
  return CHURCH_ROLES.MEMBER;
}

export function isSuperAdmin(
  user?: { role?: string; churchRole?: string | null } | null
): boolean {
  return Boolean(
    user && (user.churchRole === "SUPER_ADMIN" || user.role === "admin")
  );
}

export function canManageChurchSettings(
  user?: { role?: string; churchRole?: string | null } | null
): boolean {
  return Boolean(
    user &&
      (user.churchRole === "SUPER_ADMIN" ||
        user.churchRole === "PASTOR" ||
        user.role === "admin")
  );
}

export function canManageFinance(
  user?: { role?: string; churchRole?: string | null } | null
): boolean {
  return Boolean(
    user &&
      (user.churchRole === "SUPER_ADMIN" ||
        user.churchRole === "TREASURER" ||
        user.role === "admin")
  );
}

export function canCountOfferings(
  user?: { role?: string; churchRole?: string | null } | null
): boolean {
  return Boolean(
    user &&
      (user.churchRole === "SUPER_ADMIN" ||
        user.churchRole === "TREASURER" ||
        user.churchRole === "COUNTER" ||
        user.role === "admin")
  );
}

export function canViewReports(
  user?: { role?: string; churchRole?: string | null } | null
): boolean {
  return Boolean(
    user &&
      (user.churchRole === "SUPER_ADMIN" ||
        user.churchRole === "PASTOR" ||
        user.churchRole === "TREASURER" ||
        user.role === "admin")
  );
}

/**
 * Ministry records are managed by church leadership and by deacons, whose
 * role is defined above as overseeing ministry and service work. Reading the
 * ministry list stays open to every signed-in member.
 */
export function canManageMinistries(
  user?: { role?: string; churchRole?: string | null } | null
): boolean {
  return Boolean(
    user && (canManageChurchSettings(user) || user.churchRole === "DEACON")
  );
}

/**
 * Ledger records and church-wide totals: offerings, expenses, fund balances,
 * reports. The same people who manage budgets. The server enforces this
 * (canViewFinanceRecords in server/routers.ts); this copy only decides what
 * the UI offers.
 */
export function canViewFinanceRecords(
  user?: { role?: string; churchRole?: string | null } | null
): boolean {
  return Boolean(
    user && (canManageFinance(user) || canManageChurchSettings(user))
  );
}

/**
 * Budget plans are compared against recorded spending, so both reading and
 * writing them stay with the treasurer, the pastor and the super admin.
 */
export function canManageBudgets(
  user?: { role?: string; churchRole?: string | null } | null
): boolean {
  return Boolean(
    user && (canManageFinance(user) || canManageChurchSettings(user))
  );
}

/** Roles held by the people who run the church's finances and ministries. */
const STAFF_ROLES: ReadonlyArray<string> = [
  "SUPER_ADMIN",
  "PASTOR",
  "TREASURER",
  "DEACON",
  "COUNTER",
];

/**
 * True for an ordinary member: no staff role and not an admin. Such a person
 * sees only the giving station, not the rest of the app. `roles` is the full
 * list from auth.me; without it only `churchRole` is checked.
 */
export function isStationOnlyUser(
  user?: {
    role?: string;
    churchRole?: string | null;
    roles?: readonly string[];
  } | null
): boolean {
  if (!user) return false;
  if (user.role === "admin") return false;
  const roles =
    user.roles && user.roles.length > 0
      ? user.roles
      : [user.churchRole ?? "MEMBER"];
  return !roles.some(r => STAFF_ROLES.includes(r));
}
