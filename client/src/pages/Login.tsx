import { useAuth } from "@/_core/hooks/useAuth";
import { signInWithPassword } from "@/lib/supabase";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Sprout } from "lucide-react";

export default function Login() {
  const [, setLocation] = useLocation();
  const {
    isAuthenticated,
    loading,
    notInvited,
    email: sessionEmail,
    logout,
  } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && isAuthenticated) setLocation("/");
  }, [loading, isAuthenticated, setLocation]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setStarting(true);
    const { error } = await signInWithPassword(email, password);
    setStarting(false);
    if (error) {
      setError("อีเมลหรือรหัสผ่านไม่ถูกต้อง");
      return;
    }
    setPassword("");
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
                {sessionEmail} ไม่อยู่ในรายชื่อผู้ได้รับเชิญ
                โปรดติดต่อผู้ดูแลระบบของคริสตจักร
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
            <form onSubmit={handleSubmit} className="space-y-4">
              <label className="block text-sm font-medium text-ink">
                อีเมล
                <input
                  type="email"
                  required
                  autoComplete="username"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-line bg-white px-3 py-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brand/30"
                />
              </label>
              <label className="block text-sm font-medium text-ink">
                รหัสผ่าน
                <input
                  type="password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-line bg-white px-3 py-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brand/30"
                />
              </label>
              {error && (
                <p role="alert" className="text-center text-sm text-red-600">
                  {error}
                </p>
              )}
              <button
                type="submit"
                disabled={starting}
                className="w-full rounded-xl bg-brand px-4 py-3 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
              >
                {starting ? "กำลังเข้าสู่ระบบ…" : "เข้าสู่ระบบ"}
              </button>
              <p className="text-center text-xs text-ink-2">
                ระบบนี้เปิดให้เฉพาะผู้ที่ได้รับเชิญ หากยังไม่มีบัญชี
                โปรดติดต่อผู้ดูแลระบบของคริสตจักร
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
