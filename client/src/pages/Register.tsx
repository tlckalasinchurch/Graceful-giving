import React from "react";
import { SignUp } from "@clerk/clerk-react";
import { Sprout } from "lucide-react";

export default function Register() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-[#FFFFFF] via-[#F5F3EE] to-[#F1EFE9] p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 space-y-2 text-center">
          <div className="relative mb-2 inline-flex size-16 items-center justify-center overflow-hidden rounded-2xl border border-[#F97316]/30 bg-[#F97316]/15 shadow-xs">
            <Sprout className="size-9 text-[#5F5B55]" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#171717]">
            Grace <span className="text-[#F97316]">Ledger</span>
          </h1>
          <p className="text-sm text-[#5F5B55]">สมัครบัญชีใหม่</p>
        </div>

        <SignUp
          routing="hash"
          signInUrl="/login"
          fallbackRedirectUrl="/"
          forceRedirectUrl="/"
          appearance={{
            variables: {
              colorPrimary: "#F97316",
              colorBackground: "#FFFFFF",
              borderRadius: "1rem",
            },
          }}
        />
      </div>
    </div>
  );
}
