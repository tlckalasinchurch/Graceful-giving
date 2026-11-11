import React, { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { GuardedLink } from "@/components/layout/GuardedLink";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  canCountOfferings,
  canManageFinance,
  canViewFinanceRecords,
  isSuperAdmin,
  type RoleUser,
} from "@shared/roles";
import {
  ArrowRight,
  Check,
  Coins,
  Copy,
  HandCoins,
  Inbox,
  NotebookPen,
  QrCode,
} from "lucide-react";
import { toast } from "sonner";

type GuideStep = {
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  step: string;
  title: string;
  when: string;
  description: string;
  cta: string;
  canOpen: (user: RoleUser | null | undefined) => boolean;
};

/**
 * The weekly giving loop, in the order the work actually happens:
 * donors give (slip or envelope) → slips are reviewed → envelopes are
 * counted on service day → everything approved lands in the ledger.
 * Each card only renders for roles that can open its page.
 */
const STEPS: GuideStep[] = [
  {
    path: "/giving/inbox",
    icon: Inbox,
    step: "01",
    title: "ตรวจสลิป LINE",
    when: "ทุกวัน · หลังมีสลิปเข้า",
    description:
      "ผู้ถวายสแกน QR แล้วแนบสลิปโอนเงิน ระบบอ่านยอดจากสลิปให้ เหรัญญิกตรวจก่อนอนุมัติเข้าบัญชี",
    cta: "เปิดกล่องสลิป",
    canOpen: canManageFinance,
  },
  {
    path: "/counting",
    icon: Coins,
    step: "02",
    title: "นับซองหน้างาน",
    when: "วันนมัสการ",
    description:
      "กรรมการนับเงินเปิดรอบนับประจำวัน บันทึกยอดซองสดและเช็คทีละประเภท แล้วส่งให้ทีมตรวจสอบ",
    cta: "เปิดรอบนับเงิน",
    canOpen: canCountOfferings,
  },
  {
    path: "/offerings",
    icon: HandCoins,
    step: "03",
    title: "สมุดบัญชีถวาย",
    when: "ย้อนหลัง · ส่งออก",
    description:
      "รายการถวายทั้งหมดที่อนุมัติแล้ว ดูย้อนหลัง พิมพ์ใบเสร็จ หรือส่งออก CSV ไปทำบัญชี",
    cta: "เปิดสมุดบัญชี",
    canOpen: canViewFinanceRecords,
  },
  {
    path: "/offerings/new",
    icon: NotebookPen,
    step: "04",
    title: "บันทึกเอง",
    when: "เงินสด · รายการพิเศษ",
    description:
      "บันทึกรายการถวายที่ไม่ได้ผ่านสลิป LINE เช่น เงินสดหน้าบูธ หรือรายการที่ต้องแก้ไขย้อนหลัง",
    cta: "บันทึกการถวาย",
    canOpen: canManageFinance,
  },
];

export default function GivingGuide() {
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);
  const steps = STEPS.filter(s => s.canOpen(user));
  const giveUrl =
    typeof window === "undefined" ? "/give" : `${window.location.origin}/give`;

  const copyGiveLink = async () => {
    try {
      await navigator.clipboard.writeText(giveUrl);
      setCopied(true);
      toast.success("คัดลอกลิงก์ถวายแล้ว");
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("คัดลอกไม่สำเร็จ", {
        description: "กรุณาคัดลอกลิงก์ด้วยตนเอง",
      });
    }
  };

  return (
    <AppLayout
      title="ขั้นตอนการถวาย"
      subtitle="ลำดับงานประจำสัปดาห์ ตั้งแต่ผู้ถวายจนถึงบัญชี — เลือกขั้นตอนที่ต้องการ"
    >
      <div className="space-y-5 sm:space-y-6">
        {/* Donor boundary: members give through /give, staff work here */}
        <section className="bento-card flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div className="flex min-w-0 items-start gap-4">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl border-2 border-[var(--ink)] bg-accent text-accent-foreground shadow-[3px_3px_0_var(--ink)]">
              <QrCode className="size-5 text-brand" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <h2 className="text-base font-extrabold text-ink">
                ลิงก์สำหรับผู้ถวาย
              </h2>
              <p className="mt-1 text-sm leading-relaxed text-ink-2">
                สมาชิกคริสตจักรสแกน QR จากโปสเตอร์แล้วกรอกที่{" "}
                <code className="rounded bg-paper-2 px-1.5 py-0.5 font-mono text-xs font-bold text-brand">
                  /give
                </code>{" "}
                — ไม่ต้องเข้าสู่หน้านี้
                หน้านี้สำหรับทีมงานที่ตรวจสอบและบันทึกบัญชี
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void copyGiveLink()}
            className="btn-secondary inline-flex min-h-11 shrink-0 items-center justify-center gap-2 px-4 text-sm font-bold"
          >
            {copied ? (
              <Check className="size-4 text-income" aria-hidden="true" />
            ) : (
              <Copy className="size-4" aria-hidden="true" />
            )}
            {copied ? "คัดลอกแล้ว" : "คัดลอกลิงก์"}
          </button>
        </section>

        {/* The weekly loop, in working order */}
        <ol className="grid gap-4 sm:grid-cols-2">
          {steps.map(
            ({ path, icon: Icon, step, title, when, description, cta }) => (
              <li key={path}>
                <article className="bento-card group flex h-full flex-col p-5 sm:p-6">
                  <div className="flex items-start justify-between gap-3">
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-xl border-2 border-[var(--ink)] bg-paper-2 text-ink shadow-[3px_3px_0_var(--ink)]">
                      <Icon className="size-5 text-brand" aria-hidden="true" />
                    </span>
                    <span className="money rounded-lg border border-line bg-surface px-2.5 py-1 text-xs font-extrabold text-ink-3">
                      ขั้นตอน {step}
                    </span>
                  </div>
                  <h2 className="mt-4 text-lg font-extrabold text-ink">
                    {title}
                  </h2>
                  <p className="mt-1 text-xs font-bold uppercase tracking-wider text-ink-3">
                    {when}
                  </p>
                  <p className="mt-3 flex-1 text-sm leading-relaxed text-ink-2">
                    {description}
                  </p>
                  <GuardedLink
                    href={path}
                    className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 self-start rounded-xl border-2 border-[var(--ink)] bg-accent px-5 text-sm font-bold text-accent-foreground shadow-[3px_3px_0_var(--ink)] transition-all hover:bg-ground group-hover:-translate-y-0.5"
                  >
                    {cta}
                    <ArrowRight className="size-4" aria-hidden="true" />
                  </GuardedLink>
                </article>
              </li>
            )
          )}
        </ol>

        {isSuperAdmin(user) && (
          <p className="px-1 text-xs leading-relaxed text-ink-3">
            สิทธิ์ที่เกี่ยวข้อง: กรรมการนับเงิน (COUNTER) ใช้ขั้นตอนที่ 01–02 ·
            เหรัญญิก (TREASURER) ใช้ทุกขั้นตอน · ศิษยาภิบาล (PASTOR) ดูสมุดบัญชี
            และรายงาน
          </p>
        )}
      </div>
    </AppLayout>
  );
}
