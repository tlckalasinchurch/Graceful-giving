import { useEffect, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { UNAUTHED_ERR_MSG } from "@shared/const";
import { SessionProvider } from "@/_core/SessionProvider";
import { supabase } from "@/lib/supabase";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink, TRPCClientError } from "@trpc/client";
import { createRoot } from "react-dom/client";
import superjson from "superjson";
import App from "./App";
import "./index.css";

const queryClient = new QueryClient();

function TrpcProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const redirectToLoginIfUnauthorized = (error: unknown) => {
      if (!(error instanceof TRPCClientError)) return;
      if (typeof window === "undefined") return;
      if (error.message === UNAUTHED_ERR_MSG) {
        if (window.location.pathname !== "/login") {
          window.location.href = "/login";
        }
      }
    };

    const unsubscribeQuery = queryClient.getQueryCache().subscribe(event => {
      if (event.type === "updated" && event.action.type === "error") {
        redirectToLoginIfUnauthorized(event.query.state.error);
      }
    });

    const unsubscribeMutation = queryClient
      .getMutationCache()
      .subscribe(event => {
        if (event.type === "updated" && event.action.type === "error") {
          redirectToLoginIfUnauthorized(event.mutation.state.error);
        }
      });

    return () => {
      unsubscribeQuery();
      unsubscribeMutation();
    };
  }, []);

  const trpcClient = useMemo(
    () =>
      trpc.createClient({
        links: [
          httpBatchLink({
            url: "/api/trpc",
            transformer: superjson,
            async headers() {
              // supabase-js refreshes an expired access token before returning it.
              const { data } = await supabase.auth
                .getSession()
                .catch(() => ({ data: { session: null } }));
              const token = data.session?.access_token;
              return token ? { Authorization: `Bearer ${token}` } : {};
            },
            fetch(input, init) {
              return globalThis.fetch(input, {
                ...(init ?? {}),
                credentials: "include",
              });
            },
          }),
        ],
      }),
    []
  );

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </trpc.Provider>
  );
}

createRoot(document.getElementById("root")!).render(
  <SessionProvider>
    <TrpcProvider>
      <App />
    </TrpcProvider>
  </SessionProvider>
);
