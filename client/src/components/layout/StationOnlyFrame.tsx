import React from "react";
import { LogOut, Sprout } from "lucide-react";

/**
 * The plain frame an ordinary member sees: the church name, who is signed in,
 * a sign-out button and the page. No menu, so there is nowhere else to go.
 */
export function StationOnlyFrame({
  churchName,
  userName,
  onLogout,
  children,
}: {
  churchName?: string | null;
  userName?: string | null;
  onLogout: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-ground text-ink">
      <header className="mx-auto flex max-w-md items-center justify-between gap-3 px-[max(1rem,env(safe-area-inset-left))] pt-[max(1rem,env(safe-area-inset-top))]">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl border-2 border-[var(--ink)] bg-brand text-white shadow-[2px_2px_0_var(--ink)]">
            <Sprout className="size-4" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-extrabold text-ink">
              {churchName || "จุดถวายทรัพย์"}
            </p>
            {userName && (
              <p className="truncate text-xs font-medium text-ink-3">
                {userName}
              </p>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={onLogout}
          className="btn-secondary inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-xl px-3.5 text-xs font-bold focus-visible:ring-2 focus-visible:ring-brand"
        >
          <LogOut className="size-4" aria-hidden="true" />
          <span>ออกจากระบบ</span>
        </button>
      </header>
      <main className="mx-auto w-full max-w-md px-[max(0.75rem,env(safe-area-inset-left))] pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-[max(1rem,env(safe-area-inset-left))]">
        {children}
      </main>
    </div>
  );
}
