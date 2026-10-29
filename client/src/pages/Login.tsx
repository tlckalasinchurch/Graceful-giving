import { useAuth } from "@/_core/hooks/useAuth";
import { signInWithGoogle } from "@/lib/supabase";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Sprout } from "lucide-react";

function GoogleMark() {
  return (
    <svg viewBox="0 0 48 48" className="size-5" aria-hidden="true">
      <path
        fill="#EA4335"
        d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17.5z"
      />
      <path
        fill="#FBBC05"
        d="M10.5 28.7a14.5 14.5 0 0 1 0-9.4l-7.9-6.1a24 24 0 0 0 0 21.6l7.9-6.1z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.1 1.4-4.9 2.3-8.4 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z"
      />
    </svg>
  );
}

export default function Login() {
  const [, setLocation] = useLocation();
  const { isAuthenticated, loading, notInvited, email, logout } = useAuth();
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && isAuthenticated) setLocation("/");
  }, [loading, isAuthenticated, setLocation]);

  const handleGoogle = async () => {
    setError(null);
    setStarting(true);
    const { error } = await signInWithGoogle();
    if (error) {
      setError("เริ่มเข้าสู่ระบบไม่สำเร็จ กรุณาลองอีกครั้ง");
      setStarting(false);
    }
  };

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
          {notInvited ? (
            <div className="space-y-3 text-center">
              <p className="text-sm font-medium text-ink">
                บัญชีนี้ยังไม่ได้รับเชิญ
              </p>
              <p className="text-sm text-ink-2">
                {email} ไม่อยู่ในรายชื่อผู้ได้รับเชิญ
                โปรดติดต่อผู้ดูแลระบบของคริสตจักรเพื่อขอคำเชิญ
                หรือเข้าสู่ระบบด้วยอีเมลอื่น
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
              <button
                type="button"
                onClick={() => void handleGoogle()}
                disabled={starting}
                className="flex w-full items-center justify-center gap-3 rounded-xl border border-line bg-white px-4 py-3 text-sm font-medium text-ink shadow-sm hover:bg-ground disabled:opacity-60"
              >
                <GoogleMark />
                {starting ? "กำลังเปิด Google…" : "เข้าสู่ระบบด้วย Google"}
              </button>
              {error && (
                <p role="alert" className="text-center text-sm text-red-600">
                  {error}
                </p>
              )}
              <p className="text-center text-xs text-ink-2">
                ระบบนี้เปิดให้เฉพาะผู้ที่ได้รับเชิญ ใช้อีเมล Google
                ที่ผู้ดูแลระบบเชิญไว้
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
