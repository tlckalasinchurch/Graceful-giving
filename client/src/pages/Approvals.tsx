import React, { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { trpc, type RouterOutputs } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  EmptyState,
  LoadingSkeleton,
  MoneyDisplay,
  StatusBadge,
} from "@/components/common/CommonUI";
import {
  Banknote,
  CheckCircle2,
  Clock,
  User,
  XCircle,
  Ban,
} from "lucide-react";
import { toast } from "sonner";
import { Swal } from "@/lib/sweetalert";
import { formatBaht, THAI_LOCALE } from "@/lib/format";
import { canManageFinance } from "@shared/roles";
import { SignatureProgress } from "./Approvals/SignatureProgress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type WithdrawalItem = RouterOutputs["withdrawals"]["list"][number];

export default function Approvals() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const utils = trpc.useUtils();

  const isSigner = Boolean(user?.isBankSigner);
  const canDisburse = canManageFinance(user);
  const currentUserId = user?.id;

  const [activeTab, setActiveTab] = useState<
    "pending" | "approved" | "disbursed" | "rejected" | "cancelled"
  >("pending");

  const [selectedReq, setSelectedReq] = useState<WithdrawalItem | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [showCancelModal, setShowCancelModal] = useState(false);

  const { data: accountsData } = trpc.finance.accounts.useQuery(undefined, {
    retry: false,
    staleTime: 60_000,
  });

  const {
    data: withdrawalsData,
    isLoading,
    isError,
    refetch,
  } = trpc.withdrawals.list.useQuery(undefined, { retry: false });

  const fundNameById = useMemo(() => {
    const map = new Map<number, string>();
    for (const a of accountsData ?? []) map.set(a.id, a.name);
    return map;
  }, [accountsData]);

  const requests = withdrawalsData ?? [];

  const filteredRequests = useMemo(() => {
    return requests.filter(r => r.status === activeTab);
  }, [requests, activeTab]);

  const counts = useMemo(() => {
    return {
      pending: requests.filter(r => r.status === "pending").length,
      approved: requests.filter(r => r.status === "approved").length,
      disbursed: requests.filter(r => r.status === "disbursed").length,
      rejected: requests.filter(r => r.status === "rejected").length,
      cancelled: requests.filter(r => r.status === "cancelled").length,
    };
  }, [requests]);

  const signMutation = trpc.withdrawals.sign.useMutation({
    onSuccess: data => {
      toast.success(
        data.outcome === "approved"
          ? "ลงนามเรียบร้อย คำขอได้รับการอนุมัติครบตามเงื่อนไขแล้ว"
          : data.outcome === "rejected"
            ? "บันทึกการปฏิเสธคำขอเรียบร้อยแล้ว"
            : "บันทึกลายเซ็นของคุณเรียบร้อยแล้ว"
      );
      setShowRejectModal(false);
      setRejectReason("");
      setSelectedReq(null);
      void utils.withdrawals.list.invalidate();
    },
    onError: err => toast.error(err.message || "ไม่สามารถลงนามได้"),
  });

  const disburseMutation = trpc.withdrawals.disburse.useMutation({
    onSuccess: () => {
      toast.success(
        "บันทึกการจ่ายเงินเรียบร้อยแล้ว ยอดถูกนำเข้ารอบนับเงินแล้ว"
      );
      void utils.withdrawals.list.invalidate();
      void utils.counting.list.invalidate();
      void utils.counting.get.invalidate();
    },
    onError: err => toast.error(err.message || "ไม่สามารถบันทึกการจ่ายเงินได้"),
  });

  const cancelMutation = trpc.withdrawals.cancel.useMutation({
    onSuccess: () => {
      toast.success("ยกเลิกคำขอเบิกเงินเรียบร้อยแล้ว");
      setShowCancelModal(false);
      setCancelReason("");
      setSelectedReq(null);
      void utils.withdrawals.list.invalidate();
    },
    onError: err => toast.error(err.message || "ไม่สามารถยกเลิกคำขอได้"),
  });

  const handleApprove = async (req: WithdrawalItem) => {
    const ok = await Swal.confirm(
      "ยืนยันการลงนามอนุมัติ",
      `ต้องการลงนามอนุมัติคำขอเบิกเงิน "${req.purpose}" จำนวน ${formatBaht(req.amount)} บาท หรือไม่?`,
      "ลงนามอนุมัติ"
    );
    if (ok) {
      signMutation.mutate({ id: req.id, decision: "approved" });
    }
  };

  const handleRejectSubmit = () => {
    if (!selectedReq) return;
    if (!rejectReason.trim()) {
      toast.error("กรุณาระบุเหตุผลในการไม่อนุมัติ");
      return;
    }
    signMutation.mutate({
      id: selectedReq.id,
      decision: "rejected",
      note: rejectReason.trim(),
    });
  };

  const handleDisburse = async (req: WithdrawalItem) => {
    const ok = await Swal.confirm(
      "ยืนยันการจ่ายเงิน",
      `ยืนยันการจ่ายเงินจำนวน ${formatBaht(req.amount)} บาท ยอดนี้จะถูกนำเข้ารอบนับเงินถัดไปโดยอัตโนมัติ`,
      "ยืนยันจ่ายเงิน"
    );
    if (ok) {
      disburseMutation.mutate({ id: req.id });
    }
  };

  const handleCancelSubmit = () => {
    if (!selectedReq) return;
    if (cancelReason.trim().length < 3) {
      toast.error("กรุณาระบุเหตุผลในการยกเลิกอย่างน้อย 3 ตัวอักษร");
      return;
    }
    cancelMutation.mutate({
      id: selectedReq.id,
      reason: cancelReason.trim(),
    });
  };

  const fmtDate = (d: string | Date | null | undefined) =>
    d
      ? new Date(d).toLocaleDateString(THAI_LOCALE, {
          day: "numeric",
          month: "short",
          year: "numeric",
        })
      : "—";

  return (
    <AppLayout
      title="การอนุมัติเบิกจ่าย"
      subtitle="ตรวจสอบคำขอเบิกเงิน วัตถุประสงค์ และลงนามตามเงื่อนไขผู้มีอำนาจในบัญชีธนาคาร"
      action={
        <button
          onClick={() => setLocation("/withdrawals/new")}
          className="btn-primary inline-flex min-h-11 items-center gap-2 rounded-xl px-4 text-sm font-bold transition-all active:scale-[0.97]"
        >
          <Banknote className="size-4" />
          ยื่นคำขอเบิกเงิน
        </button>
      }
    >
      <div className="space-y-6">
        {/* Navigation Tabs */}
        <div className="bento-card-static flex items-center gap-1.5 overflow-x-auto p-1.5 no-scrollbar">
          <button
            onClick={() => setActiveTab("pending")}
            className={`min-h-11 shrink-0 whitespace-nowrap px-4 rounded-xl text-sm transition-all flex items-center gap-2 ${
              activeTab === "pending"
                ? "border-2 border-[var(--ink)] bg-accent text-accent-foreground font-extrabold shadow-[2px_2px_0_var(--ink)]"
                : "font-bold text-ink-2 hover:bg-paper-2 hover:text-ink"
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>รอดำเนินการ ({counts.pending})</span>
          </button>
          <button
            onClick={() => setActiveTab("approved")}
            className={`min-h-11 shrink-0 whitespace-nowrap px-4 rounded-xl text-sm transition-all flex items-center gap-2 ${
              activeTab === "approved"
                ? "border-2 border-[var(--ink)] bg-accent text-accent-foreground font-extrabold shadow-[2px_2px_0_var(--ink)]"
                : "font-bold text-ink-2 hover:bg-paper-2 hover:text-ink"
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>อนุมัติแล้ว ({counts.approved})</span>
          </button>
          <button
            onClick={() => setActiveTab("disbursed")}
            className={`min-h-11 shrink-0 whitespace-nowrap px-4 rounded-xl text-sm transition-all flex items-center gap-2 ${
              activeTab === "disbursed"
                ? "border-2 border-[var(--ink)] bg-accent text-accent-foreground font-extrabold shadow-[2px_2px_0_var(--ink)]"
                : "font-bold text-ink-2 hover:bg-paper-2 hover:text-ink"
            }`}
          >
            <Banknote className="w-4 h-4" />
            <span>จ่ายแล้ว ({counts.disbursed})</span>
          </button>
          <button
            onClick={() => setActiveTab("rejected")}
            className={`min-h-11 shrink-0 whitespace-nowrap px-4 rounded-xl text-sm transition-all flex items-center gap-2 ${
              activeTab === "rejected"
                ? "border-2 border-[var(--ink)] bg-accent text-accent-foreground font-extrabold shadow-[2px_2px_0_var(--ink)]"
                : "font-bold text-ink-2 hover:bg-paper-2 hover:text-ink"
            }`}
          >
            <XCircle className="w-4 h-4" />
            <span>ไม่อนุมัติ ({counts.rejected})</span>
          </button>
          <button
            onClick={() => setActiveTab("cancelled")}
            className={`min-h-11 shrink-0 whitespace-nowrap px-4 rounded-xl text-sm transition-all flex items-center gap-2 ${
              activeTab === "cancelled"
                ? "border-2 border-[var(--ink)] bg-accent text-accent-foreground font-extrabold shadow-[2px_2px_0_var(--ink)]"
                : "font-bold text-ink-2 hover:bg-paper-2 hover:text-ink"
            }`}
          >
            <Ban className="w-4 h-4" />
            <span>ยกเลิกแล้ว ({counts.cancelled})</span>
          </button>
        </div>

        {/* Requests List */}
        {isLoading ? (
          <LoadingSkeleton count={3} />
        ) : isError ? (
          <EmptyState
            title="โหลดคำขอเบิกจ่ายไม่สำเร็จ"
            description="เชื่อมต่อฐานข้อมูลไม่สำเร็จ กรุณาลองใหม่อีกครั้ง"
            actionText="ลองใหม่"
            onAction={() => refetch()}
          />
        ) : filteredRequests.length === 0 ? (
          <EmptyState
            title="ไม่มีคำขอในหมวดหมู่นี้"
            description="คำขอเบิกจ่ายทั้งหมดได้รับการตรวจสอบและดำเนินการเรียบร้อยแล้ว"
          />
        ) : (
          <div className="space-y-4">
            {filteredRequests.map(req => {
              const hasSigned = req.signatures.some(
                s => s.userId === currentUserId
              );
              const canSign =
                req.status === "pending" && isSigner && !hasSigned;
              const canPay = req.status === "approved" && canDisburse;
              const canCancel =
                (req.status === "pending" || req.status === "approved") &&
                (req.requestedBy === currentUserId || isSigner);

              const fundName =
                (req.fundId != null && fundNameById.get(req.fundId)) || "—";
              const reqDate = req.requestDate || req.createdAt;

              return (
                <div
                  key={req.id}
                  className="bento-card-static p-6 sm:p-7 flex flex-col gap-5"
                >
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                    <div className="space-y-2.5 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-mono font-extrabold text-ink bg-paper-2 px-3 py-1 rounded-full border border-[var(--ink)]/30">
                          {`REQ-${new Date(reqDate || Date.now()).getFullYear()}-${String(req.id).padStart(3, "0")}`}
                        </span>
                        <span className="text-xs font-extrabold text-ink bg-paper-2 px-3 py-1 rounded-full border border-[var(--ink)]/30">
                          {fundName}
                        </span>
                        <StatusBadge
                          status={
                            req.status === "pending"
                              ? "pending"
                              : req.status === "approved"
                                ? "completed"
                                : req.status === "disbursed"
                                  ? "completed"
                                  : "rejected"
                          }
                          label={
                            req.status === "pending"
                              ? "รอดำเนินการ"
                              : req.status === "approved"
                                ? "อนุมัติแล้ว"
                                : req.status === "disbursed"
                                  ? "จ่ายแล้ว"
                                  : req.status === "rejected"
                                    ? "ไม่อนุมัติ"
                                    : "ยกเลิกแล้ว"
                          }
                        />
                      </div>

                      <h3 className="display text-lg font-extrabold text-ink">
                        {req.purpose}
                      </h3>

                      <p className="text-sm font-medium text-ink-2 leading-relaxed">
                        {req.details || "เบิกจ่ายตามงบประมาณที่ได้รับอนุมัติ"}
                      </p>

                      <div className="flex items-center gap-3 text-xs font-bold text-ink-3 pt-1">
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--ink)]/20 bg-paper-2 px-2.5 py-1 text-ink-2">
                          <User className="w-3.5 h-3.5 text-ink-3" />
                          {req.requesterName || `ผู้ใช้ #${req.requestedBy}`}
                        </span>
                        <span>•</span>
                        <span>ยื่นคำขอเมื่อ {fmtDate(reqDate)}</span>
                      </div>
                    </div>

                    {/* Amount & Actions */}
                    <div className="flex flex-row md:flex-col items-center md:items-end justify-between gap-4 pt-4 md:pt-0 border-t border-line md:border-t-0 flex-shrink-0">
                      <div className="text-left md:text-right">
                        <p className="text-xs font-extrabold uppercase tracking-wider text-ink-3">
                          ยอดขอเบิก
                        </p>
                        <MoneyDisplay
                          amount={req.amount}
                          type="expense"
                          size="lg"
                        />
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {canSign && (
                          <>
                            <button
                              onClick={() => {
                                setSelectedReq(req);
                                setShowRejectModal(true);
                              }}
                              disabled={signMutation.isPending}
                              className="min-h-11 px-5 py-2.5 rounded-xl border-2 border-[var(--ink)] bg-danger/10 hover:bg-danger/15 text-danger text-xs font-extrabold shadow-[2px_2px_0_var(--ink)] transition-all active:scale-[0.97] disabled:opacity-50"
                            >
                              ไม่อนุมัติ
                            </button>
                            <button
                              onClick={() => handleApprove(req)}
                              disabled={signMutation.isPending}
                              className="btn-primary min-h-11 px-5 py-2.5 text-xs disabled:opacity-50"
                            >
                              ลงนามอนุมัติ
                            </button>
                          </>
                        )}

                        {canPay && (
                          <button
                            onClick={() => handleDisburse(req)}
                            disabled={disburseMutation.isPending}
                            className="btn-primary min-h-11 px-5 py-2.5 text-xs disabled:opacity-50"
                          >
                            จ่ายแล้ว
                          </button>
                        )}

                        {canCancel && (
                          <button
                            onClick={() => {
                              setSelectedReq(req);
                              setShowCancelModal(true);
                            }}
                            disabled={cancelMutation.isPending}
                            className="btn-secondary min-h-11 px-3.5 py-2 text-xs hover:text-danger disabled:opacity-50"
                          >
                            ยกเลิกคำขอ
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Signatures and Progress */}
                  <div className="rounded-2xl bg-paper-2 p-4 border-[1.5px] border-[var(--ink)]">
                    <SignatureProgress
                      signatures={req.signatures}
                      approval={req.approval}
                    />
                  </div>

                  {/* Notice if cancelled */}
                  {req.status === "cancelled" && (
                    <div className="rounded-xl border-2 border-danger bg-danger/10 p-3.5 text-xs font-extrabold text-danger">
                      ยกเลิกคำขอเมื่อ {fmtDate(req.cancelledAt)}:{" "}
                      {req.cancelReason || "ไม่ระบุเหตุผล"}
                    </div>
                  )}

                  {/* Notice if disbursed */}
                  {req.status === "disbursed" && (
                    <div className="rounded-xl border-[1.5px] border-[var(--ink)] bg-tile-mint p-3.5 text-xs font-extrabold text-tile-mint-ink">
                      จ่ายเงินแล้วเมื่อ {fmtDate(req.disbursedAt)}{" "}
                      (ยอดเข้ารอบนับเงินเรียบร้อยแล้ว)
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Reject Reason Modal */}
        <Dialog
          open={showRejectModal && Boolean(selectedReq)}
          onOpenChange={open => {
            if (!open) setShowRejectModal(false);
          }}
        >
          <DialogContent className="neo-modal max-w-md w-full max-h-[calc(100dvh-2rem)] overflow-y-auto overscroll-contain p-6 space-y-4">
            <DialogHeader className="border-b-2 border-[var(--ink)] pb-3 text-left">
              <DialogTitle className="display text-lg font-extrabold text-ink">
                ระบุเหตุผลที่ไม่อนุมัติ
              </DialogTitle>
              <DialogDescription className="text-xs font-medium text-ink-2">
                คำขอนี้จะถูกบันทึกว่าไม่ผ่านการอนุมัติจากคุณ และส่งผลให้คำขอสิ้นสุดลงทันที
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-2 text-xs">
              <textarea
                rows={3}
                required
                aria-label="เหตุผลที่ไม่อนุมัติ"
                placeholder="เช่น เอกสารใบเสนอราคาไม่ครบถ้วน, เกินงบประมาณที่จัดสรรไว้..."
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                className="neo-input w-full p-3.5 text-xs"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowRejectModal(false)}
                disabled={signMutation.isPending}
                className="btn-secondary min-h-11 px-4 py-2.5 text-xs cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleRejectSubmit}
                disabled={signMutation.isPending}
                className="min-h-11 px-5 py-2.5 rounded-xl border-2 border-[var(--ink)] bg-danger text-white text-xs font-extrabold shadow-[2px_2px_0_var(--ink)] hover:opacity-95 disabled:opacity-50 cursor-pointer"
              >
                {signMutation.isPending
                  ? "กำลังบันทึก..."
                  : "ยืนยันไม่อนุมัติ"}
              </button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Cancel Reason Modal */}
        <Dialog
          open={showCancelModal && Boolean(selectedReq)}
          onOpenChange={open => {
            if (!open) setShowCancelModal(false);
          }}
        >
          <DialogContent className="neo-modal max-w-md w-full max-h-[calc(100dvh-2rem)] overflow-y-auto overscroll-contain p-6 space-y-4">
            <DialogHeader className="border-b-2 border-[var(--ink)] pb-3 text-left">
              <DialogTitle className="display text-lg font-extrabold text-ink">
                ระบุเหตุผลในการยกเลิกคำขอ
              </DialogTitle>
              <DialogDescription className="text-xs font-medium text-ink-2">
                เมื่อยกเลิกแล้ว คำขอนี้จะไม่สามารถนำไปเบิกจ่ายได้อีก (ระบุเหตุผลอย่างน้อย 3 ตัวอักษร)
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-2 text-xs">
              <textarea
                rows={3}
                required
                aria-label="เหตุผลในการยกเลิก"
                placeholder="เช่น ยกเลิกโครงการ, ปรับเปลี่ยนรายการจัดซื้อ..."
                value={cancelReason}
                onChange={e => setCancelReason(e.target.value)}
                className="neo-input w-full p-3.5 text-xs"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowCancelModal(false)}
                disabled={cancelMutation.isPending}
                className="btn-secondary min-h-11 px-4 py-2.5 text-xs cursor-pointer"
              >
                กลับ
              </button>
              <button
                type="button"
                onClick={handleCancelSubmit}
                disabled={cancelMutation.isPending}
                className="min-h-11 px-5 py-2.5 rounded-xl border-2 border-[var(--ink)] bg-danger text-white text-xs font-extrabold shadow-[2px_2px_0_var(--ink)] hover:opacity-95 disabled:opacity-50 cursor-pointer"
              >
                {cancelMutation.isPending
                  ? "กำลังบันทึก..."
                  : "ยืนยันการยกเลิก"}
              </button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
