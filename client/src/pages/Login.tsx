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
    <div className="flex min-h-screen flex-col items-center justify-center bg-ground p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 space-y-2 text-center">
          <div className="relative mb-2 inline-flex size-16 items-center justify-center overflow-hidden rounded-2xl bg-tile-peach">
            <Sprout className="size-9 text-tile-peach-ink" />
            <div className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full bg-income">
              <span className="text-[11px] font-bold text-white">✝</span>
            </div>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">
            Grace <span className="text-brand-ink">Ledger</span>
          </h1>
          <p className="text-sm text-ink-2">ระบบบัญชีการเงินคริสตจักร</p>
        </div>

        <div className="space-y-4 rounded-3xl bg-surface p-6 fintech-card">
          {state === "pending" || state === "disabled" ? (
            <div className="space-y-3 text-center">
              <p className="text-sm font-medium text-ink">
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
                className="w-full rounded-xl border border-line px-4 py-3 text-sm font-medium text-ink hover:bg-ground"
              >
                ออกจากระบบ
              </button>
            </div>
          ) : (
            <>
              <a
                href="/api/auth/line/login"
                className="flex w-full items-center justify-center gap-3 rounded-xl bg-[#06C755] px-4 py-3 text-sm font-semibold text-white shadow-sm hover:brightness-95"
              >
                <LineMark />
                เข้าสู่ระบบด้วย LINE
              </a>
              {error && (
                <p role="alert" className="text-center text-sm text-red-600">
                  {error}
                </p>
              )}
              <p className="text-center text-xs text-ink-2">
                ครั้งแรกที่เข้าใช้
                ผู้ดูแลระบบต้องอนุมัติบัญชีและกำหนดบทบาทให้ก่อน
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
