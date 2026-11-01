import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { approvalState } from "@shared/withdrawals";
import { SignatureProgress, type SignatureRow } from "./SignatureProgress";

const pastorSigned: SignatureRow = {
  userId: 1,
  name: "ศิษยาภิบาลใหญ่",
  decision: "approved",
  note: null,
  createdAt: "2026-10-30T10:00:00.000Z",
  wasRequiredSigner: true,
};

const assistantSigned: SignatureRow = {
  userId: 2,
  name: "ผู้ช่วยศิษยาภิบาล",
  decision: "approved",
  note: null,
  createdAt: "2026-10-30T11:30:00.000Z",
  wasRequiredSigner: false,
};

const treasurerRefused: SignatureRow = {
  userId: 3,
  name: "เหรัญญิก",
  decision: "rejected",
  note: "เอกสารไม่ครบ",
  createdAt: "2026-10-30T12:00:00.000Z",
  wasRequiredSigner: false,
};

const state = (sig: readonly SignatureRow[]) => approvalState(sig);

describe("SignatureProgress", () => {
  it("asks for one more signature after the required signer has signed", () => {
    render(
      <SignatureProgress
        signatures={[pastorSigned]}
        approval={state([pastorSigned])}
      />
    );
    expect(screen.getByText("รออีก 1 คน")).toBeInTheDocument();
    expect(screen.queryByText("รอศิษยาภิบาลลงนาม")).not.toBeInTheDocument();
  });

  it("asks for the required signer first on a fresh request", () => {
    render(<SignatureProgress signatures={[]} approval={state([])} />);
    expect(screen.getByText("รอศิษยาภิบาลลงนาม")).toBeInTheDocument();
  });

  it("says the request meets the bank's rule once both have signed", () => {
    render(
      <SignatureProgress
        signatures={[pastorSigned, assistantSigned]}
        approval={state([pastorSigned, assistantSigned])}
      />
    );
    expect(screen.getByText("ครบตามเงื่อนไขธนาคาร")).toBeInTheDocument();
  });

  it("lists each signer's decision under their name", () => {
    render(
      <SignatureProgress
        signatures={[pastorSigned, treasurerRefused]}
        approval={state([pastorSigned, treasurerRefused])}
      />
    );
    expect(screen.getByText("ศิษยาภิบาลใหญ่")).toBeInTheDocument();
    expect(screen.getByText("เหรัญญิก")).toBeInTheDocument();
    expect(screen.getByText("ลงนามแล้ว")).toBeInTheDocument();
    expect(screen.getByText("ปฏิเสธ")).toBeInTheDocument();
  });

  it("shows the refusal reason the signer gave", () => {
    render(
      <SignatureProgress
        signatures={[treasurerRefused]}
        approval={state([treasurerRefused])}
      />
    );
    expect(screen.getByText("เอกสารไม่ครบ")).toBeInTheDocument();
  });

  it("marks the signature that had to be there every time", () => {
    render(
      <SignatureProgress
        signatures={[pastorSigned]}
        approval={state([pastorSigned])}
      />
    );
    expect(screen.getByText(/ต้องลงนามทุกครั้ง/)).toBeInTheDocument();
  });
});
