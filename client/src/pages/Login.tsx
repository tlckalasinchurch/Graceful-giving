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
    <div className="flex min-h-screen flex-col items-center justify-center bg-ground p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 space-y-2 text-center">
          <div className="relative mb-2 inline-flex size-16 items-center justify-center overflow-hidden rounded-2xl bg-tile-peach">
            <Sprout className="size-9 text-tile-peach-ink" />
            <div className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full bg-income">
              <span className="text-[11px] font-bold text-white">✝</span>
            </div>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">
            Grace <span className="text-brand-ink">Ledger</span>
          </h1>
          <p className="text-sm text-ink-2">ระบบบัญชีการเงินคริสตจักร</p>
        </div>

        {/* Clerk Sign-In component — handles all auth providers */}
        <div className="rounded-3xl bg-surface p-2 fintech-card">
          <SignIn
            routing="hash"
            signUpUrl="/register"
            fallbackRedirectUrl="/"
            forceRedirectUrl="/"
            appearance={{
              variables: {
                colorPrimary: "#c94f16",
                colorBackground: "#ffffff",
                colorText: "#1b1d1f",
                colorTextSecondary: "#5c6064",
                colorInputBackground: "#ffffff",
                colorInputText: "#1b1d1f",
                colorNeutral: "#5c6064",
                borderRadius: "0.625rem",
                fontFamily: "'Manrope', 'IBM Plex Sans Thai', sans-serif",
              },
              elements: {
                card: "shadow-none bg-transparent",
              },
            }}
          />
        </div>
      </div>
    </div>
  );
}
