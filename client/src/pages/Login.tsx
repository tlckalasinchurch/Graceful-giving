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
    <div className="grid min-h-dvh bg-ground lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      {/* Editorial panel: the verse the ministry stands on. Desktop only. */}
      <aside className="relative hidden flex-col justify-between bg-ink p-12 text-surface lg:flex xl:p-16">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl bg-surface text-ink">
            <Sprout className="size-5" aria-hidden="true" />
          </span>
          <span className="display text-xl">Grace Ledger</span>
        </div>
        <figure className="max-w-md space-y-6">
          <p className="eyebrow !text-surface/60">2 โครินธ์ 9:7</p>
          <blockquote className="display text-4xl leading-snug xl:text-5xl">
            “ผู้ให้ด้วยใจยินดี พระเจ้าทรงรัก”
          </blockquote>
        </figure>
        <p className="text-sm text-surface/60">
          ระบบบัญชีการเงินคริสตจักร · เพื่อพันธกิจของพระเจ้า
        </p>
      </aside>

      <main className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-sm">
          <div className="mb-10 space-y-3">
            <div className="flex items-center gap-3 lg:hidden">
              <span className="flex size-10 items-center justify-center rounded-xl bg-ink text-surface">
                <Sprout className="size-5" aria-hidden="true" />
              </span>
              <span className="display text-xl text-ink">Grace Ledger</span>
            </div>
            <p className="eyebrow">Sign in</p>
            <h1 className="display text-4xl text-ink">เข้าสู่ระบบ</h1>
            <p className="text-sm text-ink-2">
              ใช้บัญชี LINE ของคุณ ผู้ดูแลระบบจะอนุมัติสิทธิ์ให้ในครั้งแรก
            </p>
          </div>

          {state === "pending" || state === "disabled" ? (
            <div className="space-y-4 rounded-xl border border-line bg-surface p-6">
              <p className="display text-xl text-ink">
                {state === "pending"
                  ? "รอผู้ดูแลระบบอนุมัติ"
                  : "บัญชีนี้ถูกปิดการใช้งาน"}
              </p>
              <p className="text-sm text-ink-2">
                {state === "pending"
                  ? `${name ? `คุณ${name} ` : ""}เข้าสู่ระบบด้วย LINE แล้ว แต่ยังไม่ได้รับสิทธิ์ใช้งาน โปรดแจ้งผู้ดูแลระบบของคริสตจักรให้อนุมัติบัญชีของคุณ แล้วกลับมาเปิดหน้านี้อีกครั้ง`
                  : "โปรดติดต่อผู้ดูแลระบบของคริสตจักร"}
              </p>
              <button
                type="button"
                onClick={() => void logout()}
                className="w-full rounded-lg border border-field px-4 py-3 text-sm font-medium text-ink hover:bg-paper-2"
              >
                ออกจากระบบ
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <a
                href="/api/auth/line/login"
                className="flex min-h-12 w-full items-center justify-center gap-3 rounded-lg bg-[#06C755] px-4 text-sm font-semibold text-white hover:brightness-95"
              >
                <LineMark />
                เข้าสู่ระบบด้วย LINE
              </a>
              {error && (
                <p role="alert" className="text-sm text-danger">
                  {error}
                </p>
              )}
              <p className="border-t border-line pt-4 text-xs text-ink-3">
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
