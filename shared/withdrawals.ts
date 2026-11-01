/**
 * Pure approval rule for withdrawal requests signed by the people named on
 * the church's bank account. Shared by the server (router + db) and the
 * client (progress display). No imports from `server/` — this must stay
 * usable in the browser bundle.
 */

/** Every signer listed on the bank account approves; the bank then needs at least this many. */
export const MIN_APPROVALS = 2;

export type SignatureDecision = "approved" | "rejected";

export interface Signature {
  userId: number;
  decision: SignatureDecision;
  /** Whether this signer is the required signer ("ต้องลงนามทุกครั้ง") — stored on the signature row, not looked up. */
  wasRequiredSigner: boolean;
}

export type ApprovalOutcome = "pending" | "approved" | "rejected";

export interface ApprovalState {
  outcome: ApprovalOutcome;
  approvedCount: number;
  requiredSignerApproved: boolean;
}

/**
 * The bank's rule: the required signer must approve AND the approvals must
 * total at least MIN_APPROVALS. Any rejection cancels the request.
 */
export function approvalState(signatures: readonly Signature[]): ApprovalState {
  const approved = signatures.filter(s => s.decision === "approved");
  const anyRejected = signatures.some(s => s.decision === "rejected");
  const requiredSignerApproved = approved.some(s => s.wasRequiredSigner);
  const approvedCount = approved.length;

  if (anyRejected) {
    return { outcome: "rejected", approvedCount, requiredSignerApproved };
  }
  if (requiredSignerApproved && approvedCount >= MIN_APPROVALS) {
    return { outcome: "approved", approvedCount, requiredSignerApproved };
  }
  return { outcome: "pending", approvedCount, requiredSignerApproved };
}
