import React from "react";
import { SignIn } from "@clerk/clerk-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { useLocation } from "wouter";
import { useEffect } from "react";
import { Sprout } from "lucide-react";

export default function Login() {
  const [, setLocation] = useLocation();
  const { isAuthenticated, loading } = useAuth();

  useEffect(() => {
    if (!loading && isAuthenticated) setLocation("/");
  }, [loading, isAuthenticated, setLocation]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-card via-background to-muted p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 space-y-2 text-center">
          <div className="relative mb-2 inline-flex size-16 items-center justify-center overflow-hidden rounded-2xl border border-primary/30 bg-primary/15 shadow-xs">
            <Sprout className="size-9 text-foreground-soft" />
            <div className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full bg-success-border">
              <span className="text-[11px] font-bold text-white">✝</span>
            </div>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Grace <span className="text-primary">Ledger</span>
          </h1>
          <p className="text-sm text-foreground-soft">ระบบบัญชีการเงินคริสตจักร</p>
        </div>

        {/* Clerk Sign-In component — handles all auth providers */}
        <SignIn
          routing="hash"
          signUpUrl="/register"
          fallbackRedirectUrl="/"
          forceRedirectUrl="/"
          appearance={{
            variables: {
              colorPrimary: "#C94F16",
              colorBackground: "#FFFFFF",
              borderRadius: "1rem",
            },
          }}
        />
      </div>
    </div>
  );
}
