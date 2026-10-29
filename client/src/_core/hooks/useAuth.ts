import { startLogin } from "@/const";
import { useSession } from "@/_core/SessionProvider";
import { supabase } from "@/lib/supabase";
import { trpc } from "@/lib/trpc";
import { useCallback, useEffect, useMemo } from "react";

type UseAuthOptions = {
  redirectOnUnauthenticated?: boolean;
  redirectPath?: string;
};

export function useAuth(options?: UseAuthOptions) {
  const { redirectOnUnauthenticated = false, redirectPath } = options ?? {};
  const { session, loaded } = useSession();
  const hasSession = Boolean(session);
  const utils = trpc.useUtils();

  const meQuery = trpc.auth.me.useQuery(undefined, {
    enabled: loaded && hasSession,
    retry: false,
    refetchOnWindowFocus: true,
    staleTime: 5_000,
    refetchInterval: 30_000,
  });

  const logout = useCallback(async () => {
    try {
      await supabase.auth.signOut();
    } finally {
      utils.auth.me.setData(undefined, null);
      await utils.auth.me.invalidate();
      window.location.href = "/login";
    }
  }, [utils]);

  const state = useMemo(() => {
    const user = hasSession ? (meQuery.data ?? null) : null;
    // Signed in with Google, but the server has no account for this email.
    const notInvited = hasSession && meQuery.isSuccess && meQuery.data === null;

    return {
      user,
      loading: !loaded || (hasSession && meQuery.isLoading),
      error: meQuery.error ?? null,
      isAuthenticated: Boolean(user),
      hasSession,
      notInvited,
      email: session?.user.email ?? null,
    };
  }, [
    loaded,
    hasSession,
    session,
    meQuery.data,
    meQuery.error,
    meQuery.isLoading,
    meQuery.isSuccess,
  ]);

  useEffect(() => {
    if (!redirectOnUnauthenticated) return;
    if (state.loading) return;
    if (state.user) return;
    if (typeof window === "undefined") return;
    if (redirectPath && window.location.pathname === redirectPath) return;

    if (redirectPath) {
      window.location.href = redirectPath;
    } else {
      startLogin();
    }
  }, [redirectOnUnauthenticated, redirectPath, state.loading, state.user]);

  return {
    ...state,
    refresh: () => meQuery.refetch(),
    logout,
  };
}
