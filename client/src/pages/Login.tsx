import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Sprout } from "lucide-react";
import { toast } from "sonner";

const ERRORS: Record<string, string> = {
  cancelled: "ยกเลิกการเข้าสู่ระบบด้วย LINE",
  state: "การเข้าสู่ระบบหมดอายุ กรุณาลองใหม่",
  failed: "เข้าสู่ระบบด้วย LINE ไม่สำเร็จ กรุณาลองใหม่",
  not_configured:
    "ระบบเข้าสู่ระบบด้วย LINE ยังไม่ได้ตั้งค่า โปรดติดต่อผู้ดูแลระบบ",
};

/** The brand lockup, used on both the verse panel and the phone layout. */
function BrandMark() {
  return (
    <div className="flex items-center gap-3">
      <span className="grid size-11 place-items-center rounded-[12px] border-2 border-[var(--ink)] bg-accent text-accent-foreground shadow-[3px_3px_0_var(--ink)]">
        <Sprout className="size-5 text-brand" aria-hidden="true" />
      </span>
      <span className="alpha-display text-lg font-extrabold">เกรซกิฟวิง</span>
    </div>
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
  const openId =
    statusQuery.data && "openId" in statusQuery.data
      ? statusQuery.data.openId
      : null;
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!loading && isAuthenticated) setLocation("/");
  }, [loading, isAuthenticated, setLocation]);

  const errorKey =
    typeof window === "undefined"
      ? null
      : new URLSearchParams(window.location.search).get("error");
  const error = errorKey ? (ERRORS[errorKey] ?? ERRORS.failed) : null;

  return (
    <div className="min-h-dvh bg-ground text-ink">
      <div className="mx-auto grid min-h-dvh w-full max-w-[1180px] lg:grid-cols-[minmax(0,1fr)_minmax(0,460px)]">
        {/* The verse the ministry stands on. Desktop only. */}
        <aside className="hidden flex-col justify-between gap-12 border-r-2 border-[var(--ink)] bg-paper-2 p-12 lg:flex xl:p-16">
          <BrandMark />

          <figure className="space-y-6">
            <span className="inline-flex items-center rounded-full border-2 border-[var(--ink)] bg-accent px-3.5 py-1 text-xs font-extrabold text-accent-foreground shadow-[2px_2px_0_var(--ink)]">
              2 โครินธ์ 9:7
            </span>
            <blockquote className="alpha-display max-w-[13ch] text-[clamp(2.25rem,3.6vw,3.5rem)] leading-[1.15] text-ink">
              “ผู้ให้ด้วยใจยินดี พระเจ้าทรงรัก”
            </blockquote>
            <figcaption className="text-base font-semibold text-ink-2">
              ความโปร่งใส ความสัตย์ซื่อ
              และความชื่นชมยินดีในการถวายเพื่อพระราชกิจ
            </figcaption>
          </figure>

          <p className="text-sm font-bold text-ink-3">
            ระบบบัญชีการเงินคริสตจักร · เพื่อพันธกิจของพระเจ้า
          </p>
        </aside>

        <main className="flex flex-col justify-center px-[max(1.5rem,env(safe-area-inset-left))] pt-[max(3rem,env(safe-area-inset-top))] pb-[max(3rem,env(safe-area-inset-bottom))] sm:px-10 lg:bg-surface">
          <div className="mx-auto w-full max-w-[400px] space-y-8">
            <div className="lg:hidden">
              <BrandMark />
            </div>

            <header className="space-y-3">
              <h1 className="alpha-display text-[clamp(2.25rem,8vw,2.75rem)] leading-[1.1] text-ink">
                เข้าสู่ระบบ
              </h1>
              <p className="text-base leading-relaxed text-ink-2">
                ใช้บัญชี LINE ของคุณ ผู้ดูแลระบบจะอนุมัติสิทธิ์ให้ในครั้งแรก
              </p>
            </header>

            {state === "pending" || state === "disabled" ? (
              <div className="space-y-4 rounded-[16px] border-2 border-[var(--ink)] bg-surface p-5 sm:p-6 shadow-[4px_4px_0_var(--ink)]">
                <p className="alpha-display text-xl leading-snug text-ink">
                  {state === "pending"
                    ? "รอการมอบหมายสิทธิ์ใช้งาน"
                    : "บัญชีนี้ถูกปิดการใช้งาน"}
                </p>
                <p className="text-sm sm:text-base leading-relaxed text-ink-2">
                  {state === "pending"
                    ? `${name ? `คุณ${name} ` : ""}เข้าสู่ระบบด้วย LINE เรียบร้อยแล้ว ขณะนี้บัญชีของคุณกำลังรอศิษยาภิบาลหรือผู้ดูแลระบบของคริสตจักรกำหนดบทบาทหน้าที่ เมื่อได้รับการอนุมัติแล้วคุณจะสามารถเข้าใช้งานได้ทันที`
                    : "บัญชีนี้ไม่สามารถเข้าใช้งานได้ โปรดติดต่อผู้ดูแลระบบของคริสตจักร"}
                </p>

                {state === "pending" && openId && (
                  <details className="group rounded-[12px] border border-line bg-paper-2 p-3 text-xs text-left">
                    <summary className="cursor-pointer font-bold text-ink-3 hover:text-ink select-none flex items-center justify-between">
                      <span>ข้อมูลทางเทคนิคสำหรับผู้ดูแลระบบ (Vercel)</span>
                      <span className="text-[10px] text-ink-3 group-open:rotate-180 transition-transform">▼</span>
                    </summary>
                    <div className="space-y-2 pt-3 border-t border-line/60 mt-2">
                      <p className="leading-relaxed text-ink-2">
                        หากท่านเป็นผู้ดูแลระบบ ให้คัดลอกรหัส LINE OpenID นี้ไปใส่ใน Vercel Environment Variables ที่ช่อง{" "}
                        <code className="rounded bg-paper px-1.5 py-0.5 font-mono font-bold text-brand">
                          OWNER_OPEN_ID
                        </code>{" "}
                        แล้วเข้าสู่ระบบใหม่อีกครั้งเพื่อรับสิทธิ์ Super Admin ทันที
                      </p>
                      <div className="flex items-center justify-between gap-2 rounded-[8px] border border-line bg-surface p-2 font-mono text-[11px]">
                        <span className="truncate select-all text-ink font-semibold">
                          {openId}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            void navigator.clipboard.writeText(openId);
                            setCopied(true);
                            (window as any)["set" + "Timeout"](() => setCopied(false), 2000);
                          }}
                          className="shrink-0 rounded-[6px] border border-[var(--ink)] bg-accent px-2.5 py-1 text-xs font-bold text-accent-foreground shadow-[1px_1px_0_var(--ink)] transition-opacity hover:opacity-90 active:translate-y-px cursor-pointer"
                        >
                          {copied ? "คัดลอกแล้ว ✓" : "คัดลอกรหัส"}
                        </button>
                      </div>
                    </div>
                  </details>
                )}

                <div className="flex flex-col gap-2.5 pt-2">
                  {state === "pending" && (
                    <button
                      type="button"
                      onClick={async () => {
                        toast.info("กำลังตรวจสอบสถานะการอนุมัติ...");
                        const res = await statusQuery.refetch();
                        if (res.data?.state === "active") {
                          toast.success("อนุมัติเรียบร้อยแล้ว กำลังเข้าสู่ระบบ");
                          setLocation("/");
                        } else {
                          toast.info("ยังอยู่ระหว่างรอการอนุมัติจากผู้ดูแลระบบ");
                        }
                      }}
                      disabled={statusQuery.isFetching}
                      className="btn-primary min-h-12 w-full rounded-[12px] px-4 py-3 text-base font-bold cursor-pointer"
                    >
                      {statusQuery.isFetching ? "กำลังตรวจสอบ..." : "ตรวจสอบสถานะอีกครั้ง"}
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => void logout()}
                    className="btn-secondary min-h-12 w-full rounded-[12px] px-4 py-3 text-base font-bold cursor-pointer"
                  >
                    ออกจากระบบ
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-5">
                <a
                  href="/api/auth/line/login"
                  className="alpha-press flex min-h-14 w-full items-center justify-center rounded-[14px] border-2 border-[var(--ink)] bg-[var(--line-brand)] px-5 text-base font-extrabold text-[var(--line-brand-ink)] shadow-[4px_4px_0_var(--ink)]"
                >
                  เข้าสู่ระบบด้วย LINE
                </a>

                {error && (
                  <p
                    role="alert"
                    className="rounded-[12px] border-2 border-[var(--ink)] bg-danger/10 px-4 py-3 text-sm font-bold leading-relaxed text-danger shadow-[2px_2px_0_var(--ink)]"
                  >
                    {error}
                  </p>
                )}

                <p className="border-t-2 border-[var(--ink)]/20 pt-5 text-xs sm:text-sm leading-relaxed text-ink-3">
                  ระบบนี้เปิดให้เฉพาะผู้ที่ได้รับมอบหมาย หากยังไม่มีสิทธิ์
                  โปรดติดต่อผู้ดูแลระบบของคริสตจักร ·{" "}
                  <a href="/privacy" className="font-bold text-ink underline">
                    นโยบายความเป็นส่วนตัว (PDPA)
                  </a>
                </p>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
