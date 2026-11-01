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
          className="inline-flex min-h-11 items-center gap-2 rounded-2xl bg-brand px-4 text-sm font-bold text-black shadow-md shadow-brand/25 hover:bg-brand-ink transition-all"
        >
          <Banknote className="size-4" />
          ยื่นคำขอเบิกเงิน
        </button>
      }
    >
      <div className="space-y-6">
        {/* Segmented Pastel Navigation Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto rounded-2xl bg-surface p-1.5 fintech-card no-scrollbar">
          <button
            onClick={() => setActiveTab("pending")}
            className={`min-h-11 shrink-0 whitespace-nowrap px-4 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${
              activeTab === "pending"
                ? "bg-tile-lilac text-brand-ink shadow-xs"
                : "text-ink-2 hover:bg-paper hover:text-ink"
            }`}
          >
            <Clock className="w-4 h-4 text-brand" />
            <span>รอดำเนินการ ({counts.pending})</span>
          </button>
          <button
            onClick={() => setActiveTab("approved")}
            className={`min-h-11 shrink-0 whitespace-nowrap px-4 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${
              activeTab === "approved"
                ? "bg-tile-mint text-tile-mint-ink shadow-xs"
                : "text-ink-2 hover:bg-paper hover:text-ink"
            }`}
          >
            <CheckCircle2 className="w-4 h-4 text-income" />
            <span>อนุมัติแล้ว ({counts.approved})</span>
          </button>
          <button
            onClick={() => setActiveTab("disbursed")}
            className={`min-h-11 shrink-0 whitespace-nowrap px-4 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${
              activeTab === "disbursed"
                ? "bg-tile-sky text-tile-sky-ink shadow-xs"
                : "text-ink-2 hover:bg-paper hover:text-ink"
            }`}
          >
            <Banknote className="w-4 h-4 text-tile-sky-ink" />
            <span>จ่ายแล้ว ({counts.disbursed})</span>
          </button>
          <button
            onClick={() => setActiveTab("rejected")}
            className={`min-h-11 shrink-0 whitespace-nowrap px-4 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${
              activeTab === "rejected"
                ? "bg-tile-rose text-tile-rose-ink shadow-xs"
                : "text-ink-2 hover:bg-paper hover:text-ink"
            }`}
          >
            <XCircle className="w-4 h-4 text-danger" />
            <span>ไม่อนุมัติ ({counts.rejected})</span>
          </button>
          <button
            onClick={() => setActiveTab("cancelled")}
            className={`min-h-11 shrink-0 whitespace-nowrap px-4 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${
              activeTab === "cancelled"
                ? "bg-paper-2 text-ink shadow-xs"
                : "text-ink-2 hover:bg-paper hover:text-ink"
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
                  className="bg-surface rounded-3xl p-6 sm:p-7 fintech-card flex flex-col gap-5"
                >
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                    <div className="space-y-2.5 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-mono font-bold text-ink-2 bg-paper px-3 py-1 rounded-full border border-line/70">
                          {`REQ-${new Date(reqDate || Date.now()).getFullYear()}-00${req.id}`}
                        </span>
                        <span className="text-xs font-bold text-tile-lilac-ink bg-tile-lilac px-3 py-1 rounded-full">
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

                      <h3 className="display text-lg font-bold text-ink">
                        {req.purpose}
                      </h3>

                      <p className="text-sm text-ink-2 leading-relaxed">
                        {req.details || "เบิกจ่ายตามงบประมาณที่ได้รับอนุมัติ"}
                      </p>

                      <div className="flex items-center gap-3 text-xs font-medium text-ink-3 pt-1">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-paper px-2.5 py-1 text-ink-2">
                          <User className="w-3.5 h-3.5 text-brand" />
                          {req.requesterName || `ผู้ใช้ #${req.requestedBy}`}
                        </span>
                        <span>•</span>
                        <span>ยื่นคำขอเมื่อ {fmtDate(reqDate)}</span>
                      </div>
                    </div>

                    {/* Amount & Actions */}
                    <div className="flex flex-row md:flex-col items-center md:items-end justify-between gap-4 pt-4 md:pt-0 border-t md:border-t-0 border-line/50 flex-shrink-0">
                      <div className="text-left md:text-right">
                        <p className="text-xs font-bold text-ink-3">
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
                              className="min-h-11 px-4 py-2 rounded-2xl bg-tile-rose hover:bg-rose-500/25 text-tile-rose-ink text-xs font-bold transition-colors disabled:opacity-50"
                            >
                              ไม่อนุมัติ
                            </button>
                            <button
                              onClick={() => handleApprove(req)}
                              disabled={signMutation.isPending}
                              className="min-h-11 px-5 py-2 rounded-2xl bg-income hover:opacity-95 text-white text-xs font-bold transition-all shadow-sm disabled:opacity-50"
                            >
                              ลงนามอนุมัติ
                            </button>
                          </>
                        )}

                        {canPay && (
                          <button
                            onClick={() => handleDisburse(req)}
                            disabled={disburseMutation.isPending}
                            className="min-h-11 px-5 py-2 rounded-2xl bg-brand hover:bg-brand-ink text-black text-xs font-bold transition-all shadow-sm disabled:opacity-50"
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
                            className="min-h-11 px-3.5 py-2 rounded-2xl border border-line bg-paper hover:bg-tile-rose/50 text-ink-2 hover:text-danger text-xs font-bold transition-colors disabled:opacity-50"
                          >
                            ยกเลิกคำขอ
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Signatures and Progress */}
                  <div className="rounded-2xl bg-paper p-4 border border-line/50">
                    <SignatureProgress
                      signatures={req.signatures}
                      approval={req.approval}
                    />
                  </div>

                  {/* Notice if cancelled */}
                  {req.status === "cancelled" && (
                    <div className="rounded-2xl bg-tile-rose p-3.5 text-xs font-semibold text-tile-rose-ink">
                      ยกเลิกคำขอเมื่อ {fmtDate(req.cancelledAt)}:{" "}
                      {req.cancelReason || "ไม่ระบุเหตุผล"}
                    </div>
                  )}

                  {/* Notice if disbursed */}
                  {req.status === "disbursed" && (
                    <div className="rounded-2xl bg-tile-mint p-3.5 text-xs font-semibold text-tile-mint-ink">
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
          <div className="fixed inset-0 z-50 bg-ink/40 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-surface rounded-3xl border border-line max-w-md w-full max-h-[calc(100dvh-2rem)] overflow-y-auto overscroll-contain p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between border-b border-line pb-3">
                <h3 className="display text-lg font-bold text-ink">
                  ระบุเหตุผลที่ไม่อนุมัติ
                </h3>
                <button
                  onClick={() => setShowRejectModal(false)}
                  type="button"
                  aria-label="ปิด"
                  className="-mr-2 flex size-11 shrink-0 items-center justify-center rounded-2xl text-xl font-bold text-ink-3 hover:bg-paper hover:text-ink"
                >
                  ×
                </button>
              </div>

              <div className="space-y-2 text-xs">
                <p className="text-ink-2">
                  คำขอนี้จะถูกบันทึกว่าไม่ผ่านการอนุมัติจากคุณ
                  และส่งผลให้คำขอสิ้นสุดลงทันที
                </p>
                <textarea
                  rows={3}
                  required
                  placeholder="เช่น เอกสารใบเสนอราคาไม่ครบถ้วน, เกินงบประมาณที่จัดสรรไว้..."
                  value={rejectReason}
                  onChange={e => setRejectReason(e.target.value)}
                  className="w-full p-3.5 rounded-2xl border border-field bg-paper text-xs text-ink focus:outline-none focus:border-brand"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  onClick={() => setShowRejectModal(false)}
                  disabled={signMutation.isPending}
                  className="px-4 py-2.5 rounded-2xl border border-line bg-paper text-xs font-bold text-ink-2"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={handleRejectSubmit}
                  disabled={signMutation.isPending}
                  className="px-5 py-2.5 rounded-2xl bg-danger text-white text-xs font-bold hover:opacity-95 disabled:opacity-50"
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
          <div className="fixed inset-0 z-50 bg-ink/40 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-surface rounded-3xl border border-line max-w-md w-full max-h-[calc(100dvh-2rem)] overflow-y-auto overscroll-contain p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between border-b border-line pb-3">
                <h3 className="display text-lg font-bold text-ink">
                  ระบุเหตุผลในการยกเลิกคำขอ
                </h3>
                <button
                  onClick={() => setShowCancelModal(false)}
                  type="button"
                  aria-label="ปิด"
                  className="-mr-2 flex size-11 shrink-0 items-center justify-center rounded-2xl text-xl font-bold text-ink-3 hover:bg-paper hover:text-ink"
                >
                  ×
                </button>
              </div>

              <div className="space-y-2 text-xs">
                <p className="text-ink-2">
                  เมื่อยกเลิกแล้ว คำขอนี้จะไม่สามารถนำไปเบิกจ่ายได้อีก
                  (ระบุเหตุผลอย่างน้อย 3 ตัวอักษร)
                </p>
                <textarea
                  rows={3}
                  required
                  placeholder="เช่น ยกเลิกโครงการ, ปรับเปลี่ยนรายการจัดซื้อ..."
                  value={cancelReason}
                  onChange={e => setCancelReason(e.target.value)}
                  className="w-full p-3.5 rounded-2xl border border-field bg-paper text-xs text-ink focus:outline-none focus:border-brand"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  onClick={() => setShowCancelModal(false)}
                  disabled={cancelMutation.isPending}
                  className="px-4 py-2.5 rounded-2xl border border-line bg-paper text-xs font-bold text-ink-2"
                >
                  กลับ
                </button>
                <button
                  onClick={handleCancelSubmit}
                  disabled={cancelMutation.isPending}
                  className="px-5 py-2.5 rounded-2xl bg-danger text-white text-xs font-bold hover:opacity-95 disabled:opacity-50"
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
