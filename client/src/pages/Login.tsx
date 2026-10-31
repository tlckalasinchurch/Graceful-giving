import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { useEffect } from "react";
import { useLocation } from "wouter";
import { Sprout } from "lucide-react";

const ERRORS: Record<string, string> = {
  cancelled: "ยกเลิกการเข้าสู่ระบบด้วย LINE",
  state: "การเข้าสู่ระบบหมดอายุ กรุณาลองใหม่",
  failed: "เข้าสู่ระบบด้วย LINE ไม่สำเร็จ กรุณาลองใหม่",
  not_configured:
    "ระบบเข้าสู่ระบบด้วย LINE ยังไม่ได้ตั้งค่า โปรดติดต่อผู้ดูแลระบบ",
};

function LineMark() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-6"
      aria-hidden="true"
      fill="currentColor"
    >
      <path d="M12 2C6.48 2 2 5.58 2 9.99c0 3.95 3.5 7.26 8.23 7.89.32.07.76.21.87.49.1.25.07.64.03.9l-.14.84c-.04.25-.2.98.86.53 1.06-.45 5.72-3.37 7.8-5.77C20.99 12.5 22 11.33 22 9.99 22 5.58 17.52 2 12 2z" />
    </svg>
  );
}

export default function Login() {
  const [, setLocation] = useLocation();
  const { isAuthenticated, loading, logout } = useAuth();
  const statusQuery = trpc.auth.status.useQuery(undefined, { retry: false });
  const state = statusQuery.data?.state;
  const name =
    statusQuery.data && "name" in statusQuery.data
      ? statusQuery.data.name
      : null;

  useEffect(() => {
    if (!loading && isAuthenticated) setLocation("/");
  }, [loading, isAuthenticated, setLocation]);

  const errorKey =
    typeof window === "undefined"
      ? null
      : new URLSearchParams(window.location.search).get("error");
  const error = errorKey ? (ERRORS[errorKey] ?? ERRORS.failed) : null;

  return (
    <div className="grid min-h-dvh bg-[#050506] lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      {/* Editorial panel: the verse the ministry stands on. Desktop only. */}
      <aside className="relative hidden flex-col justify-between bg-[#0E0E10] border-r border-white/[0.07] p-12 text-white lg:flex xl:p-16">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-2xl bg-gradient-to-r from-[#FF6A00] via-[#FFC400] to-[#00F58A] text-black">
            <Sprout className="size-5" aria-hidden="true" />
          </span>
          <span className="display text-xl font-black">Grace Ledger</span>
        </div>
        <figure className="max-w-md space-y-6">
          <p className="eyebrow !text-[#00F58A]">2 โครินธ์ 9:7</p>
          <blockquote className="display text-4xl font-black leading-tight xl:text-6xl">
            “ผู้ให้ด้วยใจยินดี พระเจ้าทรงรัก”
          </blockquote>
        </figure>
        <p className="text-sm text-white/60">
          ระบบบัญชีการเงินคริสตจักร · เพื่อพันธกิจของพระเจ้า
        </p>
      </aside>

      <main className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-sm">
          <div className="mb-10 space-y-3">
            <div className="flex items-center gap-3 lg:hidden">
              <span className="flex size-10 items-center justify-center rounded-2xl bg-gradient-to-r from-[#FF6A00] via-[#FFC400] to-[#00F58A] text-black">
                <Sprout className="size-5" aria-hidden="true" />
              </span>
              <span className="display text-xl font-black text-white">Grace Ledger</span>
            </div>
            <p className="eyebrow !text-[#00F58A]">Sign in</p>
            <h1 className="display text-5xl font-black text-white">เข้าสู่ระบบ</h1>
            <p className="text-sm text-white/60">
              ใช้บัญชี LINE ของคุณ ผู้ดูแลระบบจะอนุมัติสิทธิ์ให้ในครั้งแรก
            </p>
          </div>

          {state === "pending" || state === "disabled" ? (
            <div className="space-y-4 rounded-[28px] border border-white/[0.07] bg-[#0E0E10] p-6">
              <p className="display text-xl font-black text-white">
                {state === "pending"
                  ? "รอผู้ดูแลระบบอนุมัติ"
                  : "บัญชีนี้ถูกปิดการใช้งาน"}
              </p>
              <p className="text-sm text-white/60">
                {state === "pending"
                  ? `${name ? `คุณ${name} ` : ""}เข้าสู่ระบบด้วย LINE แล้ว แต่ยังไม่ได้รับสิทธิ์ใช้งาน โปรดแจ้งผู้ดูแลระบบของคริสตจักรให้อนุมัติบัญชีของคุณ แล้วกลับมาเปิดหน้านี้อีกครั้ง`
                  : "โปรดติดต่อผู้ดูแลระบบของคริสตจักร"}
              </p>
              <button
                type="button"
                onClick={() => void logout()}
                className="w-full rounded-2xl border border-white/15 px-4 py-3 text-sm font-bold text-white hover:bg-white/10"
              >
                ออกจากระบบ
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <a
                href="/api/auth/line/login"
                className="flex min-h-16 w-full items-center justify-center gap-3 rounded-[28px] bg-gradient-to-r from-[#FF6A00] via-[#FFC400] to-[#00F58A] px-4 text-lg font-black text-black shadow-[0_14px_36px_-10px_rgba(0,245,138,0.45)] hover:brightness-110 active:scale-[0.98] transition-all"
              >
                <LineMark />
                เข้าสู่ระบบด้วย LINE
              </a>
              {error && (
                <p role="alert" className="text-sm text-rose-400">
                  {error}
                </p>
              )}
              <p className="border-t border-white/10 pt-4 text-xs text-white/50">
                ระบบนี้เปิดให้เฉพาะผู้ที่ได้รับมอบหมาย หากยังไม่มีสิทธิ์
                โปรดติดต่อผู้ดูแลระบบของคริสตจักร
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
