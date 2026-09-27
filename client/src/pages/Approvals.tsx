import React, { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { trpc, type RouterOutputs } from "@/lib/trpc";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  EmptyState,
  MoneyDisplay,
  StatusBadge,
} from "@/components/common/CommonUI";
import {
  AlertCircle,
  Banknote,
  CheckCircle2,
  Clock,
  DollarSign,
  FileText,
  ShieldCheck,
  ThumbsDown,
  ThumbsUp,
  User,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

type WithdrawalItem = RouterOutputs["withdrawals"]["list"][number];

export interface ApprovalRequest {
  id: number;
  purpose: string;
  amount: number;
  status: string;
  date: string | Date;
  requester: string;
  fund: string;
  details: string;
}

export default function Approvals() {
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<
    "pending" | "approved" | "rejected"
  >("pending");
  const [selectedReq, setSelectedReq] = useState<ApprovalRequest | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectModal, setShowRejectModal] = useState(false);

  const {
    data: withdrawalsData,
    isLoading,
    refetch,
  } = trpc.withdrawals.list.useQuery(undefined, { retry: false });

  const approveMutation = trpc.withdrawals.approve.useMutation({
    onSuccess: () => {
      toast.success("อนุมัติคำขอเบิกจ่ายเรียบร้อยแล้ว");
      refetch();
    },
    onError: error => {
      toast.error("ดำเนินการคำขอเบิกไม่สำเร็จ", { description: error.message });
    },
  });

  const requests = useMemo(() => {
    if (withdrawalsData && withdrawalsData.length > 0) {
      return withdrawalsData.map(
        (w: WithdrawalItem): ApprovalRequest => ({
          id: w.id,
          purpose: w.purpose,
          amount: Number(w.amount),
          status: w.status,
          date: w.requestDate || w.createdAt,
          requester: "ผู้ประสานงานพันธกิจ",
          fund: "บัญชีทั่วไป",
          details: w.details || "เบิกจ่ายตามงบประมาณที่ได้รับอนุมัติ",
        })
      );
    }

    return [];
  }, [withdrawalsData]);

  const filteredRequests = useMemo(() => {
    return requests.filter(r => r.status === activeTab);
  }, [requests, activeTab]);

  const handleApprove = (id: number) => {
    approveMutation.mutate({ id, action: "approved" });
  };

  const handleReject = () => {
    if (!rejectReason.trim()) {
      toast.error("กรุณาระบุเหตุผลในการไม่อนุมัติ");
      return;
    }
    if (selectedReq) {
      approveMutation.mutate({
        id: selectedReq.id,
        action: "rejected",
        note: rejectReason.trim(),
      });
    }
    setShowRejectModal(false);
    setRejectReason("");
  };

  return (
    <AppLayout
      title="การอนุมัติเบิกจ่าย"
      subtitle="ตรวจสอบคำขอเบิกเงิน วัตถุประสงค์ และเอกสารประกอบก่อนอนุมัติ"
      action={
        <button
          onClick={() => setLocation("/withdrawals/new")}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#F97316] px-4 text-sm font-semibold text-[#171717] hover:bg-[#D95E0B]"
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
                ? "bg-[#F1EFE9] text-foreground border border-[#E5E1D8]"
                : "text-[#7A766F] hover:text-foreground"
            }`}
          >
            <Clock className="w-4 h-4 text-primary" />
            <span>
              รอดำเนินการ ({requests.filter(r => r.status === "pending").length}
              )
            </span>
          </button>
          <button
            onClick={() => setActiveTab("approved")}
            className={`min-h-11 shrink-0 whitespace-nowrap px-4 rounded-xl text-sm font-medium transition-colors flex items-center gap-2 ${
              activeTab === "approved"
                ? "bg-[#F1EFE9] text-foreground border border-[#E5E1D8]"
                : "text-[#7A766F] hover:text-foreground"
            }`}
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>
              อนุมัติแล้ว (
              {requests.filter(r => r.status === "approved").length})
            </span>
          </button>
          <button
            onClick={() => setActiveTab("rejected")}
            className={`min-h-11 shrink-0 whitespace-nowrap px-4 rounded-xl text-sm font-medium transition-colors flex items-center gap-2 ${
              activeTab === "rejected"
                ? "bg-[#F1EFE9] text-foreground border border-[#E5E1D8]"
                : "text-[#7A766F] hover:text-foreground"
            }`}
          >
            <XCircle className="w-4 h-4 text-rose-600" />
            <span>
              ไม่อนุมัติ ({requests.filter(r => r.status === "rejected").length}
              )
            </span>
          </button>
        </div>

        {/* Requests List */}
        {filteredRequests.length === 0 ? (
          <EmptyState
            title="ไม่มีคำขอในหมวดหมู่นี้"
            description="คำขอเบิกจ่ายทั้งหมดได้รับการตรวจสอบและดำเนินการเรียบร้อยแล้ว"
          />
        ) : (
          <div className="space-y-4">
            {filteredRequests.map(req => (
              <div
                key={req.id}
                className="bg-white rounded-2xl border border-[#E5E1D8] p-6 shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row md:items-center justify-between gap-6"
              >
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-mono text-[#7A766F] bg-background px-2.5 py-0.5 rounded-full border border-[#E5E1D8]">
                      REQ-2026-00{req.id}
                    </span>
                    <span className="text-xs font-medium text-[#5F5B55] bg-[#F1EFE9] px-2.5 py-0.5 rounded-full border border-[#E5E1D8]/60">
                      {req.fund}
                    </span>
                    <StatusBadge
                      status={
                        req.status === "pending"
                          ? "pending"
                          : req.status === "approved"
                            ? "completed"
                            : "failed"
                      }
                    />
                  </div>

                  <h3 className="text-base font-bold text-foreground">
                    {req.purpose}
                  </h3>

                  <p className="text-xs text-[#7A766F] leading-relaxed">
                    {req.details}
                  </p>

                  <div className="flex items-center gap-4 text-xs text-[#7A766F] pt-1">
                    <span className="flex items-center gap-1">
                      <User className="w-3.5 h-3.5 text-primary" />
                      {req.requester}
                    </span>
                    <span>•</span>
                    <span>
                      ยื่นคำขอเมื่อ{" "}
                      {new Date(req.date).toLocaleDateString("th-TH")}
                    </span>
                  </div>
                </div>

                {/* Amount & Actions */}
                <div className="flex flex-row md:flex-col items-center md:items-end justify-between gap-4 pt-4 md:pt-0 border-t md:border-t-0 border-[#E5E1D8]/40 flex-shrink-0">
                  <div className="text-left md:text-right">
                    <p className="text-xs text-[#7A766F]">ยอดขอเบิก</p>
                    <MoneyDisplay
                      amount={req.amount}
                      type="expense"
                      size="md"
                    />
                  </div>

                  {req.status === "pending" && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setSelectedReq(req);
                          setShowRejectModal(true);
                        }}
                        className="min-h-11 px-4 py-2 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold transition-colors"
                      >
                        ไม่อนุมัติ
                      </button>
                      <button
                        onClick={() => handleApprove(req.id)}
                        className="min-h-11 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors shadow-sm"
                      >
                        อนุมัติคำขอ
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Reject Reason Modal */}
        {showRejectModal && (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl border border-[#E5E1D8] max-w-md w-full max-h-[calc(100dvh-2rem)] overflow-y-auto overscroll-contain p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between border-b border-[#E5E1D8] pb-3">
                <h3 className="text-lg font-bold text-foreground">
                  ระบุเหตุผลที่ไม่อนุมัติ
                </h3>
                <button
                  onClick={() => setShowRejectModal(false)}
                  type="button"
                  aria-label="ปิด"
                  className="-mr-2 flex size-11 shrink-0 items-center justify-center rounded-xl text-xl font-bold text-[#7A766F] hover:bg-[#F1EFE9] hover:text-foreground"
                >
                  ×
                </button>
              </div>

              <div className="space-y-2 text-xs">
                <p className="text-[#7A766F]">
                  คำขอนี้จะถูกปฏิเสธ และระบบจะส่งการแจ้งเตือนไปยังผู้ยื่นคำขอ
                </p>
                <textarea
                  rows={3}
                  required
                  placeholder="เช่น เอกสารใบเสนอราคาไม่ครบถ้วน, เกินงบประมาณที่จัดสรรไว้..."
                  value={rejectReason}
                  onChange={e => setRejectReason(e.target.value)}
                  className="w-full p-3 rounded-2xl border border-[#E5E1D8] text-xs text-foreground focus:outline-none focus:border-rose-400"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  onClick={() => setShowRejectModal(false)}
                  className="px-4 py-2 rounded-xl border border-[#E5E1D8] text-xs font-medium text-[#5F5B55]"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={handleReject}
                  className="px-5 py-2 rounded-xl bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700"
                >
                  ยืนยันไม่อนุมัติ
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
