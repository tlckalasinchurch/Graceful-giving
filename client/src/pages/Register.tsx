import React from "react";
import { SignUp } from "@clerk/clerk-react";
import { Sprout } from "lucide-react";

export default function Register() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-card p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 space-y-2 text-center">
          <div className="relative mb-2 inline-flex size-16 items-center justify-center overflow-hidden rounded-2xl border border-primary/30 bg-primary/15">
            <Sprout className="size-9 text-foreground-soft" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Grace <span className="text-primary">Ledger</span>
          </h1>
          <p className="text-sm text-foreground-soft">สมัครบัญชีใหม่</p>
        </div>

        <SignUp
          routing="hash"
          signInUrl="/login"
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
