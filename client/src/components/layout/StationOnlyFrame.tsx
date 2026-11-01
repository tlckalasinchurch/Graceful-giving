import React from "react";
import { LogOut } from "lucide-react";

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
    <div className="min-h-dvh bg-[#0B0D13] text-white">
      <header className="mx-auto flex max-w-md items-center justify-between gap-3 px-[max(1rem,env(safe-area-inset-left))] pt-[max(1rem,env(safe-area-inset-top))]">
        <div className="min-w-0">
          <p className="truncate text-sm font-extrabold">
            {churchName || "จุดถวายทรัพย์"}
          </p>
          {userName && (
            <p className="truncate text-xs text-stone-400">{userName}</p>
          )}
        </div>
        <button
          type="button"
          onClick={onLogout}
          className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-2xl border border-white/15 bg-white/5 px-3.5 text-xs font-bold text-stone-200 hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-[#2DD4BF]"
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
