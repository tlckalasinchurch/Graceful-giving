import React from "react";
import { SignUp } from "@clerk/clerk-react";
import { Sprout } from "lucide-react";

export default function Register() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-[#262626] via-[#262626] to-[#262626] p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 space-y-2 text-center">
          <div className="relative mb-2 inline-flex size-16 items-center justify-center overflow-hidden rounded-2xl border border-[#FC6E20]/30 bg-[#FC6E20]/15 shadow-xs">
            <Sprout className="size-9 text-[#C9B8A8]" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-[#FFE7D0]">
            Grace <span className="text-[#FC6E20]">Ledger</span>
          </h1>
          <p className="text-sm text-[#C9B8A8]">สมัครบัญชีใหม่</p>
        </div>

        <SignUp
          routing="hash"
          signInUrl="/login"
          fallbackRedirectUrl="/"
          forceRedirectUrl="/"
          appearance={{
            variables: {
              colorPrimary: "#FC6E20",
              colorBackground: "#262626",
              borderRadius: "1rem",
            },
          }}
        />
      </div>
    </div>
  );
}
