import { useAuth } from "@/_core/hooks/useAuth";
import { fetchLiffId, signInWithLiff } from "@/lib/liffSignIn";
import { trpc } from "@/lib/trpc";
import { useEffect, useRef, useState } from "react";
import { PlainGivingStation } from "./GivingStation";

/** Sign-in that returns to this page and activates an ordinary member. */
export const GIVE_LOGIN_URL = "/api/auth/line/login?next=give";

const ERRORS: Record<string, string> = {
  cancelled: "ยกเลิกการเข้าสู่ระบบด้วย LINE",
  state: "การเข้าสู่ระบบหมดอายุ กรุณาลองใหม่",
  failed: "เข้าสู่ระบบด้วย LINE ไม่สำเร็จ กรุณาลองใหม่",
  not_configured:
    "ระบบเข้าสู่ระบบด้วย LINE ยังไม่ได้ตั้งค่า โปรดติดต่อเจ้าหน้าที่",
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

function GiveShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-[#0B0D13] text-white">
      <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-6 px-[max(1.25rem,env(safe-area-inset-left))] pt-[max(2.5rem,env(safe-area-inset-top))] pb-[max(2.5rem,env(safe-area-inset-bottom))]">
        {children}
      </main>
    </div>
  );
}

/**
 * The public giving link, /give. The poster's QR code opens it. It shows one
 * thing: the giving page. A signed-out visitor sees a LINE sign-in button and
 * no link to any other page.
 */
export default function Give() {
  const { isAuthenticated, loading } = useAuth();
  const statusQuery = trpc.auth.status.useQuery(undefined, {
    retry: false,
    enabled: !loading && !isAuthenticated,
  });

  // Inside the LINE app the page signs the person in by itself. It tries once.
  // Outside LINE, or if it fails, the LINE button below is the way in.
  const utils = trpc.useUtils();
  const [liffTrying, setLiffTrying] = useState(false);
  const liffTried = useRef(false);
  useEffect(() => {
    if (loading || isAuthenticated || liffTried.current) return;
    liffTried.current = true;
    void (async () => {
      const liffId = await fetchLiffId();
      if (!liffId) return;
      setLiffTrying(true);
      const result = await signInWithLiff(liffId);
      if (result === "signed_in") {
        await utils.auth.me.invalidate();
      }
      // "redirecting" keeps the message, because the page is about to reload.
      if (result !== "redirecting") setLiffTrying(false);
    })();
  }, [loading, isAuthenticated, utils]);

  if (loading) {
    return (
      <GiveShell>
        <p role="status" className="text-center text-sm text-stone-400">
          กำลังโหลด…
        </p>
      </GiveShell>
    );
  }

  if (isAuthenticated) {
    // Every signed-in person sees the same plain giving page here, staff too.
    // Staff manage the station at /giving/station inside the full app.
    return <PlainGivingStation />;
  }

  const disabled = statusQuery.data?.state === "disabled";
  const errorKey =
    typeof window === "undefined"
      ? null
      : new URLSearchParams(window.location.search).get("error");
  const error = errorKey ? (ERRORS[errorKey] ?? ERRORS.failed) : null;

  return (
    <GiveShell>
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-extrabold">ถวายทรัพย์</h1>
        <p className="text-sm text-stone-300">
          เข้าสู่ระบบด้วย LINE เพื่อเลือกรายการถวายและแนบสลิปโอนเงิน
        </p>
      </div>
      {liffTrying ? (
        <p role="status" className="text-center text-sm text-stone-300">
          กำลังเข้าสู่ระบบด้วย LINE…
        </p>
      ) : disabled ? (
        <p
          role="alert"
          className="rounded-2xl border border-white/15 bg-white/5 p-4 text-center text-sm text-stone-200"
        >
          บัญชีนี้ถูกปิดการใช้งาน โปรดติดต่อเจ้าหน้าที่ของคริสตจักร
        </p>
      ) : (
        <a
          href={GIVE_LOGIN_URL}
          className="flex min-h-12 w-full items-center justify-center gap-3 rounded-2xl bg-[#06C755] px-4 text-base font-bold text-white hover:brightness-95 focus-visible:ring-2 focus-visible:ring-[#2DD4BF]"
        >
          <LineMark />
          เข้าสู่ระบบด้วย LINE
        </a>
      )}
      {error && (
        <p role="alert" className="text-center text-sm text-rose-300">
          {error}
        </p>
      )}
    </GiveShell>
  );
}
