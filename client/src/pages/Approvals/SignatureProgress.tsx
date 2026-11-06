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
      <h4 className="display text-sm font-bold text-ink">ลงนามโดยผู้มีอำนาจ</h4>

      {signatures.length > 0 && (
        <ul className="divide-y divide-line rounded-xl border border-line bg-surface">
          {signatures.map(sig => (
            <li
              key={sig.userId}
              className="flex flex-wrap items-center gap-x-2.5 gap-y-1 px-3.5 py-2.5 text-sm"
            >
              <span className="font-bold text-ink">
                {sig.name || `ผู้ใช้ #${sig.userId}`}
              </span>
              {sig.wasRequiredSigner && (
                <span className="rounded-full border border-line bg-paper px-2.5 py-0.5 text-[11px] font-medium text-ink-2">
                  ต้องลงนามทุกครั้ง
                </span>
              )}
              <span
                className={
                  sig.decision === "approved"
                    ? "text-xs font-medium text-ink"
                    : "text-xs font-medium text-danger"
                }
              >
                {sig.decision === "approved" ? "ลงนามแล้ว" : "ปฏิเสธ"}
              </span>
              <span className="text-xs text-ink-3">
                {fmtDate(sig.createdAt) ?? ""}
              </span>
              {sig.note && (
                <span className="w-full text-xs text-ink-2 pt-0.5">
                  เหตุผล: <span>{sig.note}</span>
                </span>
              )}
            </li>
          ))}
        </ul>
      )}

      {approval.outcome === "approved" && (
        <p className="inline-flex items-center rounded-full border border-line bg-surface px-3 py-1 text-xs font-medium text-ink">
          ครบตามเงื่อนไขธนาคาร
        </p>
      )}
      {approval.outcome === "rejected" && (
        <p className="inline-flex items-center rounded-full border border-rose-500/30 bg-rose-500/10 px-3 py-1 text-xs font-medium text-danger">
          ถูกปฏิเสธ คำขอนี้ไปไม่ถึงการจ่ายเงิน
        </p>
      )}
      {approval.outcome === "pending" && (
        <p className="flex flex-wrap items-center gap-2 text-xs">
          {!approval.requiredSignerApproved && (
            <span className="inline-flex items-center rounded-full border border-line bg-surface px-3 py-1 font-bold text-brand-ink">
              รอศิษยาภิบาลลงนาม
            </span>
          )}
          {approval.approvedCount < MIN_APPROVALS && (
            <span className="inline-flex items-center rounded-full border border-line bg-surface px-3 py-1 font-bold text-ink-2">
              รออีก {MIN_APPROVALS - approval.approvedCount} คน
            </span>
          )}
        </p>
      )}
    </section>
  );
}
