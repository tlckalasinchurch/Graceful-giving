import { useAuth } from "@/_core/hooks/useAuth";
import { fetchLiffId, signInWithLiff } from "@/lib/liffSignIn";
import { trpc } from "@/lib/trpc";
import { HandHeart, Loader2 } from "lucide-react";
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

/** What happens after the sign-in, in the order the donor meets it. */
const NOTES = [
  {
    title: "เลือกประเภทการถวาย",
    detail: "เลือกได้หลายประเภทในการถวายครั้งเดียว",
  },
  {
    title: "แนบสลิปโอนเงิน",
    detail: "ระบบช่วยอ่านยอดเงินจากสลิปให้",
  },
  {
    title: "เหรัญญิกตรวจสอบ",
    detail: "อนุมัติแล้วจึงบันทึกเข้าบัญชีของคริสตจักร",
  },
];

function GiveShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative isolate min-h-dvh overflow-x-clip bg-ground text-ink">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10"
      >
        <div className="give-aurora absolute inset-0" />
        <div className="give-ledger absolute inset-0" />
      </div>
      <main className="relative mx-auto flex min-h-dvh w-full max-w-[32rem] flex-col justify-center gap-8 px-[max(1.25rem,env(safe-area-inset-left))] pt-[max(2.5rem,env(safe-area-inset-top))] pb-[max(2.5rem,env(safe-area-inset-bottom))]">
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
      let finished = false;
      const timer = setTimeout(() => {
        if (!finished) {
          finished = true;
          setLiffTrying(false);
        }
      }, 3500);
      const result = await signInWithLiff(liffId);
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      if (result === "signed_in") {
        await utils.auth.me.invalidate();
      }
      if (result !== "redirecting") setLiffTrying(false);
    })();
  }, [loading, isAuthenticated, utils]);

  if (loading) {
    return (
      <GiveShell>
        <p role="status" className="text-center text-base font-bold text-ink-3">
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
      <header className="space-y-5">
        <div className="flex items-center gap-2.5">
          <span className="grid size-11 place-items-center rounded-xl border-2 border-[var(--ink)] bg-accent text-accent-foreground shadow-[3px_3px_0_var(--ink)]">
            <HandHeart
              className="size-5 text-brand"
              strokeWidth={2.2}
              aria-hidden="true"
            />
          </span>
          <span className="text-base font-extrabold text-ink">เกรซกิฟวิง</span>
        </div>

        <div className="space-y-3">
          <h1 className="display text-[clamp(2.4rem,10vw,3.25rem)] font-extrabold text-ink">
            ถวายทรัพย์
          </h1>
          <p className="max-w-[32ch] text-base leading-relaxed text-ink-2">
            เข้าสู่ระบบด้วย LINE เพื่อเลือกประเภทการถวาย แนบสลิปโอนเงิน
            และส่งให้เหรัญญิกตรวจสอบ
          </p>
        </div>
      </header>

      <div className="space-y-3">
        {liffTrying ? (
          <div
            role="status"
            className="bento-card-static flex min-h-14 items-center justify-center gap-2.5 text-base font-bold text-ink-2"
          >
            <Loader2
              className="size-5 animate-spin text-brand"
              aria-hidden="true"
            />
            กำลังเข้าสู่ระบบด้วย LINE…
          </div>
        ) : disabled ? (
          <p
            role="alert"
            className="rounded-2xl border-2 border-[var(--ink)] bg-danger/10 p-4 text-center text-sm font-bold leading-relaxed text-danger shadow-[3px_3px_0_var(--ink)]"
          >
            บัญชีนี้ถูกปิดการใช้งาน โปรดติดต่อเจ้าหน้าที่ของคริสตจักร
          </p>
        ) : (
          <>
            <a
              href={GIVE_LOGIN_URL}
              className="alpha-press flex min-h-14 w-full items-center justify-center rounded-2xl border-2 border-[var(--ink)] bg-line-brand px-6 text-base font-extrabold text-[var(--line-brand-ink)] shadow-[4px_4px_0_var(--ink)]"
            >
              เข้าสู่ระบบด้วย LINE
            </a>
            <p className="text-center text-xs sm:text-sm font-medium text-ink-3">
              ใช้บัญชี LINE ที่มีอยู่ ไม่ต้องสมัครใหม่
            </p>
          </>
        )}

        {error && (
          <p
            role="alert"
            className="rounded-xl border-2 border-[var(--ink)] bg-danger/10 px-4 py-3 text-center text-sm font-bold leading-relaxed text-danger shadow-[2px_2px_0_var(--ink)]"
          >
            {error}
          </p>
        )}
      </div>

      <ol className="bento-card-static divide-y divide-line px-4">
        {NOTES.map(({ title, detail }, index) => (
          <li key={title} className="flex gap-4 py-4">
            <span className="money mt-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded-lg border border-[var(--ink)] bg-accent text-xs font-extrabold text-accent-foreground">
              {String(index + 1).padStart(2, "0")}
            </span>
            <div className="min-w-0">
              <p className="text-base font-extrabold text-ink">{title}</p>
              <p className="mt-0.5 text-sm leading-relaxed text-ink-2">
                {detail}
              </p>
            </div>
          </li>
        ))}
      </ol>

      <p className="text-center text-xs sm:text-sm leading-relaxed text-ink-3">
        หากเข้าสู่ระบบไม่ได้ โปรดติดต่อเจ้าหน้าที่ของคริสตจักร
      </p>
    </GiveShell>
  );
}
