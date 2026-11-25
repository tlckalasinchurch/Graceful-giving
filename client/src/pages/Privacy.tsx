import React from "react";
import { Link, useLocation } from "wouter";
import { ArrowLeft, Lock } from "lucide-react";

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
              className="btn-secondary inline-flex min-h-11 items-center gap-2 rounded-xl px-4 py-2 text-xs font-medium"
            >
              <ArrowLeft className="size-4" />
              ย้อนกลับ
            </button>
            <Link
              href="/give"
              className="btn-secondary inline-flex min-h-11 items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-medium"
            >
              หน้าถวายทรัพย์
            </Link>
          </div>
        </div>

        <header className="space-y-3 border-b border-line pb-6">
          <h1 className="display text-2xl sm:text-[1.75rem] font-semibold text-ink">
            นโยบายความเป็นส่วนตัว (PDPA)
          </h1>
          <p className="text-sm text-ink-2 leading-relaxed">
            ระบบบัญชีการเงินและการถวายทรัพย์ของคริสตจักร (Grace Giving)
            ให้ความสำคัญสูงสุดต่อความโปร่งใสและความปลอดภัยของข้อมูลส่วนบุคคลของสมาชิกและผู้ถวายทุกท่าน
          </p>
        </header>

        <section className="bento-card space-y-4 p-6">
          <h2 className="text-base font-semibold text-ink flex items-center gap-2">
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
          <h2 className="text-base font-semibold text-ink">
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
            <li>
              สิทธิ์ข้างต้นเป็นการเข้าถึงภายในระบบของคริสตจักรเท่านั้น
              การส่งภาพสลิปไปให้ Google อ่านด้วย AI เป็นอีกเรื่องหนึ่ง
              ซึ่งอธิบายไว้ในข้อ 3
            </li>
          </ul>
        </section>

        <section
          aria-labelledby="privacy-ai"
          className="bento-card-static space-y-4 p-6"
        >
          <h2 id="privacy-ai" className="text-base font-semibold text-ink">
            3. การอ่านสลิปด้วย AI ของ Google
          </h2>
          <ul className="list-disc pl-5 space-y-2 text-sm text-ink-2 leading-relaxed">
            <li>
              เพื่ออ่านยอดเงิน วันที่ ชื่อผู้โอน
              และบัญชีผู้รับจากสลิปโดยอัตโนมัติ ระบบส่งภาพสลิปไปยังบริการ Google
              Gemini API ของบริษัท Google ภาพสลิปอาจมีชื่อผู้โอน เลขบัญชี
              ยอดเงิน และวันที่โอน
            </li>
            <li>
              ภาพจะถูกส่งไปอ่านทันทีที่ท่านแนบรูปในหน้าถวายทรัพย์
              (ก่อนกดส่งรายการ) และทุกครั้งที่ท่านส่งรูปสลิปผ่าน LINE Official
              Account ของคริสตจักร
            </li>
            <li>
              คริสตจักรใช้บริการนี้แบบไม่มีค่าใช้จ่าย (Free Tier) ตามเงื่อนไขของ
              Google ข้อมูลที่ส่งเข้าบริการแบบไม่มีค่าใช้จ่าย Google
              อาจนำไปใช้เพื่อให้บริการ ปรับปรุง และพัฒนาผลิตภัณฑ์ของ Google
              รวมถึงเทคโนโลยีการเรียนรู้ของเครื่อง (Machine Learning)
            </li>
            <li>
              หากไม่ต้องการให้ภาพสลิปถูกส่งไปอ่าน ให้ส่งรายการในหน้าถวายทรัพย์
              โดยไม่แนบรูปสลิป แล้วกรอกชื่อและวันที่โอนเอง
              เหรัญญิกจะตรวจกับยอดเงินเข้าบัญชีธนาคารแทน
            </li>
            <li>
              การส่งผ่าน LINE ไม่มีทางเลือกนี้ รูปสลิปที่ส่งเข้า LINE Official
              Account ของคริสตจักรจะถูกส่งไปให้ Google อ่านเสมอ
            </li>
          </ul>
        </section>

        <section className="bento-card-static space-y-4 p-6">
          <h2 className="text-base font-semibold text-ink">
            4. สิทธิของเจ้าของข้อมูลส่วนบุคคล
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
