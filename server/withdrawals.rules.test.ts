import { describe, expect, it } from "vitest";
import {
  MIN_APPROVALS,
  approvalState,
  type Signature,
} from "../shared/withdrawals";

describe("approvalState", () => {
  it("is pending for an empty signature list", () => {
    expect(approvalState([])).toEqual({
      outcome: "pending",
      approvedCount: 0,
      requiredSignerApproved: false,
    });
  });

  it("needs one more signature when only the required signer approved", () => {
    const signatures: Signature[] = [
      { userId: 1, decision: "approved", wasRequiredSigner: true },
    ];
    expect(approvalState(signatures)).toEqual({
      outcome: "pending",
      approvedCount: 1,
      requiredSignerApproved: true,
    });
  });

  it("stays pending and flags the missing required signer when only non-required signers approved", () => {
    const signatures: Signature[] = [
      { userId: 1, decision: "approved", wasRequiredSigner: false },
      { userId: 2, decision: "approved", wasRequiredSigner: false },
    ];
    expect(approvalState(signatures)).toEqual({
      outcome: "pending",
      approvedCount: 2,
      requiredSignerApproved: false,
    });
  });

  it("approves once the required signer and one other have signed", () => {
    const signatures: Signature[] = [
      { userId: 1, decision: "approved", wasRequiredSigner: true },
      { userId: 2, decision: "approved", wasRequiredSigner: false },
    ];
    expect(approvalState(signatures)).toEqual({
      outcome: "approved",
      approvedCount: 2,
      requiredSignerApproved: true,
    });
  });

  it("approves with more than the minimum approvals", () => {
    const signatures: Signature[] = [
      { userId: 1, decision: "approved", wasRequiredSigner: true },
      { userId: 2, decision: "approved", wasRequiredSigner: false },
      { userId: 3, decision: "approved", wasRequiredSigner: false },
    ];
    expect(approvalState(signatures)).toEqual({
      outcome: "approved",
      approvedCount: 3,
      requiredSignerApproved: true,
    });
  });

  it("rejects whenever a rejection exists, even after the rule was already met", () => {
    const signatures: Signature[] = [
      { userId: 1, decision: "approved", wasRequiredSigner: true },
      { userId: 2, decision: "approved", wasRequiredSigner: false },
      { userId: 3, decision: "rejected", wasRequiredSigner: false },
    ];
    expect(approvalState(signatures).outcome).toBe("rejected");
  });

  it("uses the signer flag stored on the signature, never a current signer list", () => {
    // Review Focus 2: the required signer was changed after these signatures
    // were made; the stored flag on each signature decides the outcome.
    const signatures: Signature[] = [
      { userId: 1, decision: "approved", wasRequiredSigner: true },
      { userId: 2, decision: "approved", wasRequiredSigner: false },
    ];
    const state = approvalState(signatures);
    expect(state.outcome).toBe("approved");
    expect(state.requiredSignerApproved).toBe(true);
  });

  it("exports the minimum approvals count", () => {
    expect(MIN_APPROVALS).toBe(2);
  });
});
