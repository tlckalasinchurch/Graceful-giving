import React from "react";
import { MIN_APPROVALS, type ApprovalState } from "@shared/withdrawals";
import { THAI_LOCALE } from "@/lib/format";

export interface SignatureRow {
  userId: number;
  name: string | null;
  decision: "approved" | "rejected";
  note: string | null;
  createdAt: string | Date | null;
  wasRequiredSigner: boolean;
}

interface SignatureProgressProps {
  signatures: readonly SignatureRow[];
  approval: ApprovalState;
}

/**
 * The bank rule, written down for the reviewer: who has signed, who refused,
 * and what is still missing. The outcome lines come from the same pure
 * `approvalState` the server uses, so the words can never lie about the
 * stored signatures.
 */
export function SignatureProgress({
  signatures,
  approval,
}: SignatureProgressProps) {
  const fmtDate = (d: string | Date | null) =>
    d
      ? new Date(d).toLocaleDateString(THAI_LOCALE, {
          day: "numeric",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
        })
      : null;

  return (
    <section aria-label="สถานะการลงนาม" className="space-y-3">
      <h4 className="font-display text-sm font-semibold text-foreground">
        ลงนามโดยผู้มีอำนาจ
      </h4>

      {signatures.length > 0 && (
        <ul className="space-y-2">
          {signatures.map(sig => (
            <li
              key={sig.userId}
              className="flex flex-wrap items-center gap-x-2 gap-y-1 border-b border-line pb-2 text-sm last:border-b-0"
            >
              <span className="text-foreground">
                {sig.name || `ผู้ใช้ #${sig.userId}`}
              </span>
              {sig.wasRequiredSigner && (
                <span className="rounded-full border border-line bg-paper-2 px-2 py-0.5 text-[11px] font-medium text-ink-2">
                  ต้องลงนามทุกครั้ง
                </span>
              )}
              <span
                className={
                  sig.decision === "approved"
                    ? "text-sm font-medium text-income"
                    : "text-sm font-medium text-danger"
                }
              >
                {sig.decision === "approved" ? "ลงนามแล้ว" : "ปฏิเสธ"}
              </span>
              <span className="text-xs text-ink-3">
                {fmtDate(sig.createdAt) ?? ""}
              </span>
              {sig.note && (
                <span className="w-full text-xs text-ink-3">
                  เหตุผล: <span>{sig.note}</span>
                </span>
              )}
            </li>
          ))}
        </ul>
      )}

      {approval.outcome === "approved" && (
        <p className="text-sm font-medium text-income">ครบตามเงื่อนไขธนาคาร</p>
      )}
      {approval.outcome === "rejected" && (
        <p className="text-sm font-medium text-danger">
          ถูกปฏิเสธ คำขอนี้ไปไม่ถึงการจ่ายเงิน
        </p>
      )}
      {approval.outcome === "pending" && (
        <p className="space-y-1 text-sm">
          {!approval.requiredSignerApproved && (
            <span className="block text-danger">รอศิษยาภิบาลลงนาม</span>
          )}
          {approval.approvedCount < MIN_APPROVALS && (
            <span className="block text-ink-2">
              รออีก {MIN_APPROVALS - approval.approvedCount} คน
            </span>
          )}
        </p>
      )}
    </section>
  );
}
