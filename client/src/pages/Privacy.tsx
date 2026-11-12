import React from "react";
import { Link, useLocation } from "wouter";
import { ArrowLeft, Lock, ShieldCheck } from "lucide-react";

export default function Privacy() {
  const [, setLocation] = useLocation();
  const handleBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      window.history.back();
    } else {
      setLocation("/login");
    }
  };

  return (
    <div className="min-h-dvh bg-ground text-ink py-10 px-5 sm:px-8">
      <main className="mx-auto max-w-2xl space-y-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleBack}
              className="btn-secondary inline-flex min-h-11 items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold"
            >
              <ArrowLeft className="size-4" />
              ย้อนกลับ
            </button>
            <Link
              href="/give"
              className="btn-secondary inline-flex min-h-11 items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold"
            >
              หน้าถวายทรัพย์
            </Link>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-tile-mint px-3.5 py-1 text-xs font-semibold text-tile-mint-ink">
            <ShieldCheck className="size-3.5" />
            PDPA Compliance
          </span>
        </div>

        <header className="space-y-3 border-b border-line pb-6">
          <h1 className="display text-2xl sm:text-[1.75rem] font-bold text-ink">
            นโยบายความเป็นส่วนตัว (PDPA)
          </h1>
          <p className="text-sm text-ink-2 leading-relaxed">
            ระบบบัญชีการเงินและการถวายทรัพย์ของคริสตจักร (Grace Ledger)
            ให้ความสำคัญสูงสุดต่อความโปร่งใสและความปลอดภัยของข้อมูลส่วนบุคคลของสมาชิกและผู้ถวายทุกท่าน
          </p>
        </header>

        <section className="bento-card space-y-4 p-6">
          <h2 className="text-base font-extrabold text-ink flex items-center gap-2">
            <Lock className="size-4 text-brand" />
            1. ข้อมูลที่เราเก็บรวบรวม
          </h2>
          <ul className="list-disc pl-5 space-y-2 text-sm text-ink-2 leading-relaxed">
            <li>
              <strong>ข้อมูลบัญชี LINE:</strong> รหัสผู้ใช้งาน (LINE User ID),
              ชื่อที่แสดง (Display Name) และรูปโปรไฟล์ เมื่อท่านเข้าสู่ระบบผ่าน
              LINE Login หรือส่งสลิปผ่าน LINE Official Account
            </li>
            <li>
              <strong>ข้อมูลการถวายทรัพย์และหลักฐานการโอน:</strong>{" "}
              ภาพสลิปการโอนเงิน จำนวนเงิน วันที่โอน ประเภทการถวาย
              และชื่อผู้ถวายที่ท่านระบุเพื่อออกหลักฐานและบันทึกบัญชีคริสตจักร
            </li>
          </ul>
        </section>

        <section className="bento-card-static space-y-4 p-6">
          <h2 className="text-base font-extrabold text-ink">
            2. วัตถุประสงค์และการจำกัดสิทธิ์การเข้าถึง
          </h2>
          <ul className="list-disc pl-5 space-y-2 text-sm text-ink-2 leading-relaxed">
            <li>
              ใช้สำหรับตรวจสอบยอดเงินโอน บันทึกสมุดบัญชีรายรับของคริสตจักร
              และออกใบเสร็จรับเงินถวายให้แก่สมาชิก
            </li>
            <li>
              <strong>การปกป้องชื่อผู้ถวาย:</strong>{" "}
              ข้อมูลชื่อผู้ถวายและภาพสลิปถูกเก็บรักษาในระบบจัดเก็บข้อมูลส่วนตัว
              (Private Bucket) ที่เข้าถึงได้เฉพาะเหรัญญิก (TREASURER)
              และผู้ดูแลระบบสูงสุด (SUPER_ADMIN) ตามมติคริสตจักรเท่านั้น
              แม้แต่ผู้นำฝ่ายวิญญาณ (PASTOR)
              จะเห็นเพียงยอดรวมโดยไม่แสดงชื่อผู้ถวาย
            </li>
          </ul>
        </section>

        <section className="bento-card-static space-y-4 p-6">
          <h2 className="text-base font-extrabold text-ink">
            3. สิทธิของเจ้าของข้อมูลส่วนบุคคล
          </h2>
          <p className="text-sm text-ink-2 leading-relaxed">
            ท่านมีสิทธิในการขอตรวจสอบ แก้ไขข้อมูลส่วนตัว
            หรือขอให้ระงับการใช้งานบัญชีของท่านได้ตลอดเวลา
            โดยติดต่อผ่านเหรัญญิกหรือผู้ดูแลระบบของคริสตจักร
          </p>
        </section>
      </main>
    </div>
  );
}
