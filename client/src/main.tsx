import { useEffect, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { UNAUTHED_ERR_MSG } from "@shared/const";
import { ClerkProvider, useAuth } from "@clerk/clerk-react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink, TRPCClientError } from "@trpc/client";
import { createRoot } from "react-dom/client";
import superjson from "superjson";
import App from "./App";
import "./index.css";

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

const queryClient = new QueryClient();

// Inner component that can access Clerk's useAuth
function TrpcProvider({ children }: { children: React.ReactNode }) {
  const { getToken, signOut } = useAuth();

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

    const unsubscribeQueryCache = queryClient.getQueryCache().subscribe(event => {
      if (event.type === "updated" && event.action.type === "error") {
        redirectToLoginIfUnauthorized(event.query.state.error);
      }
    });

    const unsubscribeMutationCache = queryClient.getMutationCache().subscribe(event => {
      if (event.type === "updated" && event.action.type === "error") {
        redirectToLoginIfUnauthorized(event.mutation.state.error);
      }
    });

    return () => {
      unsubscribeQueryCache();
      unsubscribeMutationCache();
    };
  }, [signOut]);

  const trpcClient = useMemo(
    () =>
      trpc.createClient({
        links: [
          httpBatchLink({
            url: "/api/trpc",
            transformer: superjson,
            async headers() {
              // Pass Clerk session token to backend for authentication
              const token = await getToken().catch(() => null);
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
    [getToken]
  );

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </trpc.Provider>
  );
}

createRoot(document.getElementById("root")!).render(
  <ClerkProvider publishableKey={PUBLISHABLE_KEY}>
    <TrpcProvider>
      <App />
    </TrpcProvider>
  </ClerkProvider>
);
