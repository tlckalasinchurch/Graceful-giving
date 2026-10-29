import React from "react";
import { SignUp } from "@clerk/clerk-react";
import { Sprout } from "lucide-react";

export default function Register() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-ground p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 space-y-2 text-center">
          <div className="relative mb-2 inline-flex size-16 items-center justify-center overflow-hidden rounded-2xl bg-tile-peach">
            <Sprout className="size-9 text-tile-peach-ink" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">
            Grace <span className="text-brand-ink">Ledger</span>
          </h1>
          <p className="text-sm text-ink-2">สมัครบัญชีใหม่</p>
        </div>

        <div className="rounded-3xl bg-surface p-2 fintech-card">
          <SignUp
            routing="hash"
            signInUrl="/login"
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
