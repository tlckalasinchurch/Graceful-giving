import React from "react";
import { SignUp } from "@clerk/clerk-react";
import { Sprout } from "lucide-react";

export default function Register() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-[#FFFFFF] via-[#FAF8F5] to-[#FFF8EA] p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 space-y-2 text-center">
          <div className="relative mb-2 inline-flex size-16 items-center justify-center overflow-hidden rounded-2xl border border-[#0066CC]/30 bg-[#0066CC]/15 shadow-xs">
            <Sprout className="size-9 text-[#51443A]" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#171311]">
            Grace <span className="text-[#0066CC]">Ledger</span>
          </h1>
          <p className="text-sm text-[#51443A]">สมัครบัญชีใหม่</p>
        </div>

        <SignUp
          routing="hash"
          signInUrl="/login"
          fallbackRedirectUrl="/"
          forceRedirectUrl="/"
          appearance={{
            variables: {
              colorPrimary: "#0066CC",
              colorBackground: "#FFFFFF",
              borderRadius: "1rem",
            },
          }}
        />
      </div>
    </div>
  );
}
