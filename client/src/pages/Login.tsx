import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Sprout, Check, ChevronDown } from "lucide-react";
import { toast } from "sonner";

const ERRORS: Record<string, string> = {
  cancelled: "ยกเลิกการเข้าสู่ระบบ — กรุณากดปุ่ม LINE เพื่อลองใหม่",
  state: "การเข้าสู่ระบบหมดอายุ กรุณาลองใหม่",
  failed: "เข้าสู่ระบบด้วย LINE ไม่สำเร็จ กรุณาลองใหม่",
  network: "ไม่สามารถเชื่อมต่อได้ กรุณาตรวจสอบอินเทอร์เน็ตแล้วลองอีกครั้ง",
  not_configured:
    "ระบบเข้าสู่ระบบด้วย LINE ยังไม่พร้อมใช้งาน กรุณาติดต่อผู้ดูแลระบบของคริสตจักร",
};

/** The brand lockup, used on both the verse panel and the phone layout. */
function BrandMark() {
  return (
    <div className="flex items-center gap-3">
      <span className="grid size-10 place-items-center rounded-xl bg-brand text-white">
        <Sprout className="size-5" aria-hidden="true" />
      </span>
      <span className="alpha-display text-lg font-bold">เกรซกิฟวิง</span>
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
  const sessionExpired =
    !error &&
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("reason") === "expired";

  return (
    <div className="min-h-dvh bg-ground text-ink">
      <div className="mx-auto grid min-h-dvh w-full max-w-[1180px] lg:grid-cols-[minmax(0,1fr)_minmax(0,460px)]">
        {/* The verse the ministry stands on. Desktop only. */}
        <aside className="hidden flex-col justify-between gap-12 border-r border-line bg-ground p-12 lg:flex xl:p-16">
          <BrandMark />

          <figure className="space-y-6">
            <span className="inline-flex items-center rounded-full bg-tile-mint px-3.5 py-1 text-xs font-semibold text-tile-mint-ink">
              2 โครินธ์ 9:7
            </span>
            <blockquote className="alpha-display max-w-[13ch] text-[clamp(2.1rem,3.4vw,3.1rem)] leading-[1.18] text-ink">
              “ผู้ให้ด้วยใจยินดี พระเจ้าทรงรัก”
            </blockquote>
            <figcaption className="text-base font-medium text-ink-2">
              ความโปร่งใส ความสัตย์ซื่อ
              และความชื่นชมยินดีในการถวายเพื่อพระราชกิจ
            </figcaption>
          </figure>

          <p className="text-sm font-medium text-ink-3">
            ระบบบัญชีการเงินคริสตจักร · เพื่อพันธกิจของพระเจ้า
          </p>
        </aside>

        <main className="flex flex-col justify-center px-[max(1.5rem,env(safe-area-inset-left))] pt-[max(3rem,env(safe-area-inset-top))] pb-[max(3rem,env(safe-area-inset-bottom))] sm:px-10 lg:bg-surface">
          <div className="mx-auto w-full max-w-[400px] space-y-8">
            <div className="lg:hidden">
              <BrandMark />
            </div>

            <header className="space-y-2">
              <h1 className="alpha-display text-2xl sm:text-[1.75rem] leading-[1.2] text-ink">
                เข้าสู่ระบบ
              </h1>
              <p className="text-base leading-relaxed text-ink-2">
                ใช้บัญชี LINE ของคุณ ผู้ดูแลระบบจะอนุมัติสิทธิ์ให้ในครั้งแรก
              </p>
            </header>

            {state === "pending" || state === "disabled" ? (
              <div className="space-y-4 rounded-[20px] border border-line bg-surface p-5 sm:p-6">
                <p className="alpha-display text-xl leading-snug text-ink">
                  {state === "pending"
                    ? "รอการมอบหมายสิทธิ์ใช้งาน"
                    : "บัญชีนี้ถูกปิดการใช้งาน"}
                </p>
                <p className="text-sm sm:text-base leading-relaxed text-ink-2">
                  {state === "pending"
                    ? `${name ? `คุณ${name} ` : ""}เข้าสู่ระบบด้วย LINE แล้ว แต่ยังไม่ได้รับสิทธิ์ใช้งาน ผู้ดูแลระบบของคริสตจักรสามารถอนุมัติบัญชีของคุณได้จากหน้าการตั้งค่า แล้วกลับมาเปิดหน้านี้อีกครั้ง`
                    : "บัญชีนี้ไม่สามารถเข้าใช้งานได้ โปรดติดต่อผู้ดูแลระบบของคริสตจักร"}
                </p>

                {state === "pending" && openId && (
                  <details className="group rounded-xl border border-line bg-ground p-3.5 text-xs text-left">
                    <summary className="cursor-pointer font-semibold text-ink-2 hover:text-ink select-none flex items-center justify-between">
                      <span>สำหรับผู้ดูแลระบบ (การตั้งค่าครั้งแรก)</span>
                      <ChevronDown
                        className="size-4 text-ink-3 group-open:rotate-180 transition-transform motion-reduce:transition-none"
                        aria-hidden="true"
                      />
                    </summary>
                    <div className="space-y-2 pt-3 border-t border-line mt-2.5">
                      <p className="leading-relaxed text-ink-2">
                        วิธีปกติคือผู้ดูแลระบบอนุมัติบัญชีนี้ได้จากหน้าการตั้งค่า
                        ไม่ต้องทำตามขั้นตอนนี้ ขั้นตอนด้านล่างใช้เฉพาะการ
                        ตั้งค่าครั้งแรก: คัดลอกรหัส LINE OpenID นี้ไปใส่ใน
                        Vercel Environment Variables ที่ช่อง{" "}
                        <code className="rounded bg-surface px-1.5 py-0.5 font-mono font-semibold text-brand">
                          OWNER_OPEN_ID
                        </code>{" "}
                        แล้วเข้าสู่ระบบใหม่อีกครั้งเพื่อรับสิทธิ์ Super Admin
                        ทันที
                      </p>
                      <div className="flex items-center justify-between gap-2 rounded-xl border border-line bg-surface p-2 font-mono text-xs">
                        <span className="truncate select-all text-ink font-medium">
                          {openId}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            void navigator.clipboard.writeText(openId);
                            setCopied(true);
                            (window as any)["set" + "Timeout"](
                              () => setCopied(false),
                              2000
                            );
                          }}
                          className="btn-secondary inline-flex shrink-0 items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold cursor-pointer"
                        >
                          {copied && (
                            <Check
                              className="size-3.5 text-income"
                              aria-hidden="true"
                            />
                          )}
                          <span>{copied ? "คัดลอกแล้ว" : "คัดลอกรหัส"}</span>
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
                          toast.success(
                            "อนุมัติเรียบร้อยแล้ว กำลังเข้าสู่ระบบ"
                          );
                          setLocation("/");
                        } else {
                          toast.info(
                            "ยังอยู่ระหว่างรอการอนุมัติจากผู้ดูแลระบบ"
                          );
                        }
                      }}
                      disabled={statusQuery.isFetching}
                      className="btn-primary min-h-12 w-full rounded-xl px-4 py-3 text-base font-semibold cursor-pointer"
                    >
                      {statusQuery.isFetching
                        ? "กำลังตรวจสอบ..."
                        : "ตรวจสอบสถานะอีกครั้ง"}
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => void logout()}
                    className="btn-secondary min-h-12 w-full rounded-xl px-4 py-3 text-base font-semibold cursor-pointer"
                  >
                    ออกจากระบบ
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-5">
                <a
                  href="/api/auth/line/login"
                  className="alpha-press flex min-h-13 w-full items-center justify-center rounded-2xl bg-[var(--line-brand)] px-5 text-base font-bold text-[var(--line-brand-ink)]"
                >
                  เข้าสู่ระบบด้วย LINE
                </a>

                {sessionExpired && (
                  <p
                    role="status"
                    className="rounded-xl border border-line bg-paper-2 px-4 py-3 text-sm font-medium leading-relaxed text-ink"
                  >
                    เซสชันหมดอายุ กรุณาเข้าสู่ระบบด้วย LINE อีกครั้ง
                  </p>
                )}

                {error && (
                  <p
                    role="alert"
                    className="rounded-xl bg-tile-rose px-4 py-3 text-sm font-medium leading-relaxed text-tile-rose-ink"
                  >
                    {error}
                  </p>
                )}

                <p className="border-t border-line pt-5 text-xs sm:text-sm leading-relaxed text-ink-3">
                  ระบบนี้เปิดให้เฉพาะผู้ที่ได้รับมอบหมาย หากยังไม่มีสิทธิ์
                  โปรดติดต่อผู้ดูแลระบบของคริสตจักร ·{" "}
                  <a
                    href="/privacy"
                    className="font-semibold text-ink underline"
                  >
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
