import React, { useMemo, useState } from "react";
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
      eyebrow="Approvals"
      title="การอนุมัติเบิกจ่าย"
      subtitle="ตรวจสอบคำขอเบิกเงิน วัตถุประสงค์ และลงนามตามเงื่อนไขผู้มีอำนาจในบัญชีธนาคาร"
      action={
        <button
          onClick={() => setLocation("/withdrawals/new")}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-ink"
        >
          <Banknote className="size-4" />
          ยื่นคำขอเบิกเงิน
        </button>
      }
    >
      <div className="space-y-6">
        {/* Navigation Tabs */}
        <div className="-mx-1 flex items-center gap-1 overflow-x-auto px-1 pb-1 no-scrollbar">
          <button
            onClick={() => setActiveTab("pending")}
            className={`min-h-11 shrink-0 whitespace-nowrap px-4 rounded-xl text-sm font-medium transition-colors flex items-center gap-2 ${
              activeTab === "pending"
                ? "bg-paper-2 text-foreground border border-line"
                : "text-ink-3 hover:text-foreground"
            }`}
          >
            <Clock className="w-4 h-4 text-primary" />
            <span>รอดำเนินการ ({counts.pending})</span>
          </button>
          <button
            onClick={() => setActiveTab("approved")}
            className={`min-h-11 shrink-0 whitespace-nowrap px-4 rounded-xl text-sm font-medium transition-colors flex items-center gap-2 ${
              activeTab === "approved"
                ? "bg-paper-2 text-foreground border border-line"
                : "text-ink-3 hover:text-foreground"
            }`}
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>อนุมัติแล้ว ({counts.approved})</span>
          </button>
          <button
            onClick={() => setActiveTab("disbursed")}
            className={`min-h-11 shrink-0 whitespace-nowrap px-4 rounded-xl text-sm font-medium transition-colors flex items-center gap-2 ${
              activeTab === "disbursed"
                ? "bg-paper-2 text-foreground border border-line"
                : "text-ink-3 hover:text-foreground"
            }`}
          >
            <Banknote className="w-4 h-4 text-emerald-600" />
            <span>จ่ายแล้ว ({counts.disbursed})</span>
          </button>
          <button
            onClick={() => setActiveTab("rejected")}
            className={`min-h-11 shrink-0 whitespace-nowrap px-4 rounded-xl text-sm font-medium transition-colors flex items-center gap-2 ${
              activeTab === "rejected"
                ? "bg-paper-2 text-foreground border border-line"
                : "text-ink-3 hover:text-foreground"
            }`}
          >
            <XCircle className="w-4 h-4 text-rose-600" />
            <span>ไม่อนุมัติ ({counts.rejected})</span>
          </button>
          <button
            onClick={() => setActiveTab("cancelled")}
            className={`min-h-11 shrink-0 whitespace-nowrap px-4 rounded-xl text-sm font-medium transition-colors flex items-center gap-2 ${
              activeTab === "cancelled"
                ? "bg-paper-2 text-foreground border border-line"
                : "text-ink-3 hover:text-foreground"
            }`}
          >
            <Ban className="w-4 h-4 text-ink-3" />
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
                  className="bg-white rounded-2xl border border-line p-6 shadow-sm hover:shadow-md transition-all flex flex-col gap-5"
                >
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-mono text-ink-3 bg-paper px-2.5 py-0.5 rounded-full border border-line">
                          {`REQ-${new Date(reqDate || Date.now()).getFullYear()}-00${req.id}`}
                        </span>
                        <span className="text-xs font-medium text-ink-2 bg-paper-2 px-2.5 py-0.5 rounded-full border border-line/60">
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

                      <h3 className="text-base font-bold text-foreground">
                        {req.purpose}
                      </h3>

                      <p className="text-xs text-ink-3 leading-relaxed">
                        {req.details || "เบิกจ่ายตามงบประมาณที่ได้รับอนุมัติ"}
                      </p>

                      <div className="flex items-center gap-4 text-xs text-ink-3 pt-1">
                        <span className="flex items-center gap-1">
                          <User className="w-3.5 h-3.5 text-primary" />
                          {req.requesterName || `ผู้ใช้ #${req.requestedBy}`}
                        </span>
                        <span>•</span>
                        <span>ยื่นคำขอเมื่อ {fmtDate(reqDate)}</span>
                      </div>
                    </div>

                    {/* Amount & Actions */}
                    <div className="flex flex-row md:flex-col items-center md:items-end justify-between gap-4 pt-4 md:pt-0 border-t md:border-t-0 border-line/40 flex-shrink-0">
                      <div className="text-left md:text-right">
                        <p className="text-xs text-ink-3">ยอดขอเบิก</p>
                        <MoneyDisplay
                          amount={req.amount}
                          type="expense"
                          size="md"
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
                              className="min-h-11 px-4 py-2 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold transition-colors disabled:opacity-50"
                            >
                              ไม่อนุมัติ
                            </button>
                            <button
                              onClick={() => handleApprove(req)}
                              disabled={signMutation.isPending}
                              className="min-h-11 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors shadow-sm disabled:opacity-50"
                            >
                              ลงนามอนุมัติ
                            </button>
                          </>
                        )}

                        {canPay && (
                          <button
                            onClick={() => handleDisburse(req)}
                            disabled={disburseMutation.isPending}
                            className="min-h-11 px-5 py-2 rounded-xl bg-brand hover:bg-brand-ink text-white text-xs font-semibold transition-colors shadow-sm disabled:opacity-50"
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
                            className="min-h-11 px-3 py-2 rounded-xl border border-line hover:bg-paper-2 text-ink-3 hover:text-danger text-xs font-medium transition-colors disabled:opacity-50"
                          >
                            ยกเลิกคำขอ
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Signatures and Progress */}
                  <div className="border-t border-line/60 pt-4">
                    <SignatureProgress
                      signatures={req.signatures}
                      approval={req.approval}
                    />
                  </div>

                  {/* Notice if cancelled */}
                  {req.status === "cancelled" && (
                    <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
                      ยกเลิกคำขอเมื่อ {fmtDate(req.cancelledAt)}:{" "}
                      {req.cancelReason || "ไม่ระบุเหตุผล"}
                    </div>
                  )}

                  {/* Notice if disbursed */}
                  {req.status === "disbursed" && (
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">
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
        {showRejectModal && selectedReq && (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl border border-line max-w-md w-full max-h-[calc(100dvh-2rem)] overflow-y-auto overscroll-contain p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between border-b border-line pb-3">
                <h3 className="text-lg font-bold text-foreground">
                  ระบุเหตุผลที่ไม่อนุมัติ
                </h3>
                <button
                  onClick={() => setShowRejectModal(false)}
                  type="button"
                  aria-label="ปิด"
                  className="-mr-2 flex size-11 shrink-0 items-center justify-center rounded-xl text-xl font-bold text-ink-3 hover:bg-paper-2 hover:text-foreground"
                >
                  ×
                </button>
              </div>

              <div className="space-y-2 text-xs">
                <p className="text-ink-3">
                  คำขอนี้จะถูกบันทึกว่าไม่ผ่านการอนุมัติจากคุณ
                  และส่งผลให้คำขอสิ้นสุดลงทันที
                </p>
                <textarea
                  rows={3}
                  required
                  placeholder="เช่น เอกสารใบเสนอราคาไม่ครบถ้วน, เกินงบประมาณที่จัดสรรไว้..."
                  value={rejectReason}
                  onChange={e => setRejectReason(e.target.value)}
                  className="w-full p-3 rounded-2xl border border-line text-xs text-foreground focus:outline-none focus:border-rose-400"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  onClick={() => setShowRejectModal(false)}
                  disabled={signMutation.isPending}
                  className="px-4 py-2 rounded-xl border border-line text-xs font-medium text-ink-2"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={handleRejectSubmit}
                  disabled={signMutation.isPending}
                  className="px-5 py-2 rounded-xl bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700 disabled:opacity-50"
                >
                  {signMutation.isPending
                    ? "กำลังบันทึก..."
                    : "ยืนยันไม่อนุมัติ"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Cancel Reason Modal */}
        {showCancelModal && selectedReq && (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl border border-line max-w-md w-full max-h-[calc(100dvh-2rem)] overflow-y-auto overscroll-contain p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between border-b border-line pb-3">
                <h3 className="text-lg font-bold text-foreground">
                  ระบุเหตุผลในการยกเลิกคำขอ
                </h3>
                <button
                  onClick={() => setShowCancelModal(false)}
                  type="button"
                  aria-label="ปิด"
                  className="-mr-2 flex size-11 shrink-0 items-center justify-center rounded-xl text-xl font-bold text-ink-3 hover:bg-paper-2 hover:text-foreground"
                >
                  ×
                </button>
              </div>

              <div className="space-y-2 text-xs">
                <p className="text-ink-3">
                  เมื่อยกเลิกแล้ว คำขอนี้จะไม่สามารถนำไปเบิกจ่ายได้อีก
                  (ระบุเหตุผลอย่างน้อย 3 ตัวอักษร)
                </p>
                <textarea
                  rows={3}
                  required
                  placeholder="เช่น ยกเลิกโครงการ, ปรับเปลี่ยนรายการจัดซื้อ..."
                  value={cancelReason}
                  onChange={e => setCancelReason(e.target.value)}
                  className="w-full p-3 rounded-2xl border border-line text-xs text-foreground focus:outline-none focus:border-rose-400"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  onClick={() => setShowCancelModal(false)}
                  disabled={cancelMutation.isPending}
                  className="px-4 py-2 rounded-xl border border-line text-xs font-medium text-ink-2"
                >
                  กลับ
                </button>
                <button
                  onClick={handleCancelSubmit}
                  disabled={cancelMutation.isPending}
                  className="px-5 py-2 rounded-xl bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700 disabled:opacity-50"
                >
                  {cancelMutation.isPending
                    ? "กำลังยกเลิก..."
                    : "ยืนยันยกเลิกคำขอ"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
