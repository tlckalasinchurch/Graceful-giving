import {
  Check,
  Church,
  CreditCard,
  HandCoins,
  Landmark,
  ShieldCheck,
  Users,
  WalletCards,
} from "lucide-react";

export type SetupData = {
  // Step 1: Basic Info
  name: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  // Step 2: Leadership
  pastorName: string;
  assistantPastorName: string;
  treasurerName: string;
  motto: string;
  // Step 3: Bank Account
  bankName: string;
  bankAccount: string;
  bankAccountName: string;
  // Step 4: Offering Categories (comma-separated, stored for display)
  offeringCategories: string[];
  // Step 5: Funds
  funds: Array<{ name: string; type: string; description: string }>;
  // Step 6: Fiscal Year
  fiscalYearStartMonth: number;
  budgetYear: number;
};

export type StepConfig = {
  id: number;
  title: string;
  subtitle: string;
  icon: typeof Church;
  color: string;
  bgColor: string;
};

export const STEPS: StepConfig[] = [
  {
    id: 1,
    title: "ข้อมูลพื้นฐาน",
    subtitle: "ชื่อและที่ตั้งคริสตจักร",
    icon: Church,
    color: "text-[#0052A3]",
    bgColor: "bg-[#FFF8EA]",
  },
  {
    id: 2,
    title: "ผู้นำคริสตจักร",
    subtitle: "ศิษยาภิบาลและผู้รับผิดชอบ",
    icon: Users,
    color: "text-[#4a83b7]",
    bgColor: "bg-[#dceeff]",
  },
  {
    id: 3,
    title: "บัญชีธนาคาร",
    subtitle: "ข้อมูลการรับโอนเงิน",
    icon: CreditCard,
    color: "text-[#3F9156]",
    bgColor: "bg-[#e5f3da]",
  },
  {
    id: 4,
    title: "หมวดหมู่การถวาย",
    subtitle: "ประเภทการถวายที่ใช้",
    icon: HandCoins,
    color: "text-[#c15b4c]",
    bgColor: "bg-[#ffe1dc]",
  },
  {
    id: 5,
    title: "กองทุนและบัญชี",
    subtitle: "บัญชีแยกประเภทและกองทุน",
    icon: WalletCards,
    color: "text-[#765fc0]",
    bgColor: "bg-[#e9e1ff]",
  },
  {
    id: 6,
    title: "ปีงบประมาณ",
    subtitle: "รอบปีการเงินและงบประมาณ",
    icon: Landmark,
    color: "text-[#0066CC]",
    bgColor: "bg-[#FFF4D6]",
  },
  {
    id: 7,
    title: "สิทธิ์การเข้าถึง",
    subtitle: "บทบาทและการอนุญาต",
    icon: ShieldCheck,
    color: "text-[#336a4f]",
    bgColor: "bg-[#ddf0e6]",
  },
  {
    id: 8,
    title: "ยืนยันการตั้งค่า",
    subtitle: "ตรวจสอบและเริ่มใช้งาน",
    icon: Check,
    color: "text-[#51443A]",
    bgColor: "bg-[#FFF8EA]",
  },
];

export const THAI_MONTHS = [
  "มกราคม",
  "กุมภาพันธ์",
  "มีนาคม",
  "เมษายน",
  "พฤษภาคม",
  "มิถุนายน",
  "กรกฎาคม",
  "สิงหาคม",
  "กันยายน",
  "ตุลาคม",
  "พฤศจิกายน",
  "ธันวาคม",
];

export const DEFAULT_OFFERING_CATEGORIES = [
  "ถวายสิบลด",
  "ถวายทั่วไป",
  "ถวายพันธกิจ",
  "ถวายกองทุนอาคาร",
  "ถวายสวัสดิการ",
  "ถวายพิเศษ",
];

export const DEFAULT_FUNDS = [
  {
    name: "กองทุนทั่วไป",
    type: "general",
    description: "กองทุนหลักสำหรับค่าใช้จ่ายทั่วไป",
  },
  { name: "กองทุนสิบลด", type: "tithe", description: "เงินถวายสิบลดจากสมาชิก" },
  {
    name: "กองทุนพันธกิจ",
    type: "mission",
    description: "สนับสนุนงานประกาศและพันธกิจ",
  },
  {
    name: "กองทุนอาคาร",
    type: "building",
    description: "ซ่อมแซมและพัฒนาอาคาร",
  },
  {
    name: "กองทุนสวัสดิการ",
    type: "welfare",
    description: "ช่วยเหลือสมาชิกและผู้ยากไร้",
  },
];

export const SAVE_ERROR_PATTERNS: Array<[pattern: string, message: string]> = [
  ["10001", "กรุณาเข้าสู่ระบบด้วยบัญชีผู้ดูแลก่อนบันทึกการตั้งค่า"],
  [
    "10002",
    "บัญชีนี้ไม่มีสิทธิ์บันทึกการตั้งค่า (ต้องเป็นผู้ดูแลหรือผู้นำคริสตจักร)",
  ],
  [
    "เฉพาะผู้นำคริสตจักรเท่านั้น",
    "บัญชีนี้ไม่มีสิทธิ์บันทึกการตั้งค่า (ต้องเป็นผู้ดูแลหรือผู้นำคริสตจักร)",
  ],
  [
    "Database is not available",
    "เชื่อมต่อฐานข้อมูลไม่ได้ ข้อมูลยังไม่ถูกบันทึก กรุณาตั้งค่า DATABASE_URL แล้วลองใหม่",
  ],
];

export function getSaveErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : "";
  return (
    SAVE_ERROR_PATTERNS.find(([pattern]) => message.includes(pattern))?.[1] ??
    (message || "บันทึกไม่สำเร็จ กรุณาลองใหม่อีกครั้ง")
  );
}
