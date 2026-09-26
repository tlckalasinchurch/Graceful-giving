import React, { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { trpc, type RouterOutputs } from "@/lib/trpc";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  EmptyState,
  ErrorState,
  LoadingSkeleton,
  MoneyDisplay,
  StatusBadge,
} from "@/components/common/CommonUI";
import { Banknote, CheckCircle2, Clock, User, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Swal } from "@/lib/sweetalert";
import { formatAmount, formatThaiDate } from "@/lib/format";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type WithdrawalItem = RouterOutputs["withdrawals"]["list"][number];
type Tab = "pending" | "approved" | "rejected";

export interface ApprovalRequest {
  id: number;
  refCode: string;
  purpose: string;
  amount: number;
  status: string;
  date: string | Date;
  requesterId: number;
  fund: string;
  details: string | null;
  rejectionReason: string | null;
}

// "disbursed" is an approved request that has been paid out, so it belongs
// under the approved tab rather than in no tab at all.
const TAB_OF_STATUS: Record<string, Tab> = {
  pending: "pending",
  approved: "approved",
  disbursed: "approved",
  rejected: "rejected",
};

const TABS: Array<{
  id: Tab;
  label: string;
  icon: typeof Clock;
  empty: string;
}> = [
  {
    id: "pending",
    label: "รอดำเนินการ",
    icon: Clock,
    empty: "ไม่มีคำขอที่รอการอนุมัติ",
  },
  {
    id: "approved",
    label: "อนุมัติแล้ว",
    icon: CheckCircle2,
    empty: "ยังไม่มีคำขอที่อนุมัติแล้ว",
  },
  {
    id: "rejected",
    label: "ไม่อนุมัติ",
    icon: XCircle,
    empty: "ยังไม่มีคำขอที่ไม่อนุมัติ",
  },
];

export default function Approvals() {
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<Tab>("pending");
  const [selectedReq, setSelectedReq] = useState<ApprovalRequest | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const {
    data: withdrawalsData,
    isLoading,
    isError,
    refetch,
  } = trpc.withdrawals.list.useQuery(undefined, { retry: false });

  const { data: accountsData } = trpc.finance.accounts.useQuery(undefined, {
    retry: false,
    staleTime: 60_000,
  });

  const approveMutation = trpc.withdrawals.approve.useMutation({
    onSuccess: (_data, variables) => {
      toast.success(
        variables.action === "approved"
          ? "อนุมัติคำขอเบิกจ่ายเรียบร้อยแล้ว"
          : "บันทึกการไม่อนุมัติเรียบร้อยแล้ว"
      );
      setSelectedReq(null);
      setRejectReason("");
      refetch();
    },
    onError: error => {
      toast.error("ดำเนินการคำขอเบิกไม่สำเร็จ", { description: error.message });
    },
  });

  const requests = useMemo(() => {
    const fundName = (id: number | null) =>
      (id != null && (accountsData ?? []).find(a => a.id === id)?.name) ||
      "ไม่ระบุกองทุน";
    return (withdrawalsData ?? []).map((w: WithdrawalItem): ApprovalRequest => {
      const date = w.requestDate || w.createdAt;
      return {
        id: w.id,
        refCode: `REQ-${new Date(date).getFullYear()}-${String(w.id).padStart(4, "0")}`,
        purpose: w.purpose,
        amount: Number(w.amount),
        status: w.status,
        date,
        requesterId: w.requestedBy,
        fund: fundName(w.fundId),
        details: w.details || null,
        rejectionReason: w.rejectionReason || null,
      };
    });
  }, [withdrawalsData, accountsData]);

  const countByTab = (tab: Tab) =>
    requests.filter(r => TAB_OF_STATUS[r.status] === tab).length;
  const filteredRequests = requests.filter(
    r => TAB_OF_STATUS[r.status] === activeTab
  );
  const pendingId = approveMutation.isPending
    ? approveMutation.variables?.id
    : undefined;

  const handleApprove = async (req: ApprovalRequest) => {
    const confirmed = await Swal.confirm(
      "ยืนยันการอนุมัติคำขอนี้?",
      `${req.purpose} · ฿${formatAmount(req.amount)} · ${req.fund}`,
      { confirmButtonText: "อนุมัติคำขอ", icon: "question" }
    );
    if (confirmed) approveMutation.mutate({ id: req.id, action: "approved" });
  };

  const handleReject = (event: React.FormEvent) => {
    event.preventDefault();
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
  };

  return (
    <AppLayout
      title="การอนุมัติเบิกจ่าย"
      subtitle="ตรวจสอบคำขอเบิกเงิน วัตถุประสงค์ และเอกสารประกอบก่อนอนุมัติ"
      action={
        <button
          onClick={() => setLocation("/withdrawals/new")}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#C94F16] px-4 text-sm font-semibold text-white hover:bg-[#9F3B0F]"
        >
          <Banknote className="size-4" aria-hidden="true" />
          ยื่นคำขอเบิกเงิน
        </button>
      }
    >
      <div className="space-y-6">
        <div
          role="group"
          aria-label="สถานะคำขอ"
          className="-mx-1 flex items-center gap-1 overflow-x-auto px-1 pb-1 no-scrollbar"
        >
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setActiveTab(id)}
              aria-pressed={activeTab === id}
              className={`min-h-11 shrink-0 whitespace-nowrap px-4 rounded-xl text-sm font-medium transition-colors flex items-center gap-2 border ${
                activeTab === id
                  ? "bg-[#FFF4D6] text-[#9F3B0F] border-[#F9D2AE] font-semibold"
                  : "bg-white text-[#51443A] border-[#E7DCC8] hover:bg-[#FFF8EA]"
              }`}
            >
              <Icon className="w-4 h-4" aria-hidden="true" />
              <span>
                {label}
                {!isLoading && !isError && (
                  <span className="ml-1 tabular-nums">({countByTab(id)})</span>
                )}
              </span>
            </button>
          ))}
        </div>

        {isLoading ? (
          <LoadingSkeleton count={3} />
        ) : isError ? (
          <ErrorState
            title="โหลดคำขอเบิกไม่สำเร็จ"
            description="เชื่อมต่อฐานข้อมูลไม่สำเร็จ กรุณาลองใหม่อีกครั้ง"
            onRetry={() => void refetch()}
          />
        ) : filteredRequests.length === 0 ? (
          <EmptyState
            title={TABS.find(t => t.id === activeTab)!.empty}
            description={
              activeTab === "pending"
                ? "คำขอใหม่จะแสดงที่นี่เมื่อมีผู้ยื่นขอเบิกเงิน"
                : "คำขอที่ดำเนินการแล้วจะแสดงที่นี่"
            }
          />
        ) : (
          <ul className="space-y-4">
            {filteredRequests.map(req => (
              <li
                key={req.id}
                className="bg-white rounded-2xl border border-[#E7DCC8] p-6 flex flex-col md:flex-row md:items-center justify-between gap-6"
              >
                <div className="space-y-2 flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-mono text-[#807266] px-2.5 py-0.5 rounded-full border border-[#E7DCC8]">
                      {req.refCode}
                    </span>
                    <span className="text-xs font-medium text-[#51443A] bg-[#FFF8EA] px-2.5 py-0.5 rounded-full border border-[#E7DCC8]">
                      {req.fund}
                    </span>
                    <StatusBadge
                      status={
                        req.status === "disbursed" ? "completed" : req.status
                      }
                      label={
                        req.status === "disbursed"
                          ? "จ่ายเงินแล้ว"
                          : req.status === "rejected"
                            ? "ไม่อนุมัติ"
                            : undefined
                      }
                    />
                  </div>

                  <h3 className="text-base font-bold text-[#171311] break-words">
                    {req.purpose}
                  </h3>

                  {req.details && (
                    <p className="text-sm text-[#51443A] leading-relaxed">
                      {req.details}
                    </p>
                  )}

                  {req.rejectionReason && (
                    <p className="text-sm text-[#B92A20] leading-relaxed">
                      เหตุผลที่ไม่อนุมัติ: {req.rejectionReason}
                    </p>
                  )}

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#807266] pt-1">
                    <span className="flex items-center gap-1">
                      <User
                        className="w-3.5 h-3.5 text-[#C94F16]"
                        aria-hidden="true"
                      />
                      รหัสผู้ยื่น #{req.requesterId}
                    </span>
                    <span>ยื่นคำขอเมื่อ {formatThaiDate(req.date)}</span>
                  </div>
                </div>

                <div className="flex flex-row flex-wrap md:flex-col items-center md:items-end justify-between gap-4 pt-4 md:pt-0 border-t md:border-t-0 border-[#E7DCC8] flex-shrink-0">
                  <div className="text-left md:text-right">
                    <p className="text-xs text-[#807266]">ยอดขอเบิก</p>
                    <MoneyDisplay
                      amount={req.amount}
                      type="expense"
                      size="md"
                    />
                  </div>

                  {req.status === "pending" && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedReq(req);
                          setRejectReason("");
                        }}
                        disabled={approveMutation.isPending}
                        className="min-h-11 whitespace-nowrap px-4 py-2 rounded-xl border border-[#F8C8C5] bg-white hover:bg-[#FEECEB] text-[#B92A20] text-sm font-semibold transition-colors disabled:opacity-50"
                      >
                        ไม่อนุมัติ
                      </button>
                      <button
                        type="button"
                        onClick={() => handleApprove(req)}
                        disabled={approveMutation.isPending}
                        className="min-h-11 whitespace-nowrap px-5 py-2 rounded-xl bg-[#C94F16] hover:bg-[#9F3B0F] text-white text-sm font-semibold transition-colors disabled:opacity-50"
                      >
                        {pendingId === req.id ? "กำลังบันทึก…" : "อนุมัติคำขอ"}
                      </button>
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}

        <Dialog
          open={selectedReq !== null}
          onOpenChange={open => {
            if (!open && !approveMutation.isPending) setSelectedReq(null);
          }}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>ระบุเหตุผลที่ไม่อนุมัติ</DialogTitle>
              <DialogDescription>
                {selectedReq
                  ? `${selectedReq.purpose} · ฿${formatAmount(selectedReq.amount)}`
                  : ""}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleReject} className="space-y-4">
              <label htmlFor="reject-reason" className="sr-only">
                เหตุผลที่ไม่อนุมัติ
              </label>
              <textarea
                id="reject-reason"
                rows={3}
                required
                placeholder="เช่น เอกสารใบเสนอราคาไม่ครบถ้วน, เกินงบประมาณที่จัดสรรไว้..."
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                className="w-full p-3 rounded-xl border border-[#E7DCC8] text-base md:text-sm text-[#171311] placeholder-[#807266] focus:border-[#C94F16] focus-visible:ring-2 focus-visible:ring-[#C94F16]/30"
              />
              <p className="text-xs text-[#807266]">
                ผู้ยื่นคำขอจะได้รับแจ้งพร้อมเหตุผลนี้
              </p>
              <DialogFooter>
                <button
                  type="button"
                  onClick={() => setSelectedReq(null)}
                  disabled={approveMutation.isPending}
                  className="min-h-11 px-4 rounded-xl border border-[#E7DCC8] bg-white text-sm font-medium text-[#51443A] hover:bg-[#FFF8EA] disabled:opacity-50"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={approveMutation.isPending}
                  className="min-h-11 px-5 rounded-xl bg-[#C8372D] text-white text-sm font-semibold hover:bg-[#B3322A] disabled:opacity-50"
                >
                  {approveMutation.isPending
                    ? "กำลังบันทึก…"
                    : "ยืนยันไม่อนุมัติ"}
                </button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
