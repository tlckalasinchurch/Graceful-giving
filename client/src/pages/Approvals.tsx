import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { trpc, type RouterOutputs } from "@/lib/trpc";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  ConfirmDialog,
  EmptyState,
  ErrorState,
  LoadingSkeleton,
  MoneyDisplay,
  StatusBadge,
} from "@/components/common/CommonUI";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Banknote } from "lucide-react";
import { toast } from "sonner";
import { formatBaht, formatThaiDate } from "@/lib/format";

type WithdrawalItem = RouterOutputs["withdrawals"]["list"][number];
type Tab = "pending" | "approved" | "rejected";

const TABS: { id: Tab; label: string }[] = [
  { id: "pending", label: "รออนุมัติ" },
  { id: "approved", label: "อนุมัติแล้ว" },
  { id: "rejected", label: "ไม่อนุมัติ" },
];

const EMPTY_TEXT: Record<Tab, { title: string; description: string }> = {
  pending: {
    title: "ไม่มีคำขอที่รออนุมัติ",
    description: "เมื่อมีผู้ยื่นคำขอเบิกเงิน รายการจะแสดงที่นี่",
  },
  approved: {
    title: "ยังไม่มีคำขอที่อนุมัติ",
    description: "คำขอที่อนุมัติแล้วจะแสดงที่นี่เพื่อใช้ตรวจสอบย้อนหลัง",
  },
  rejected: {
    title: "ยังไม่มีคำขอที่ไม่อนุมัติ",
    description: "คำขอที่ไม่อนุมัติจะแสดงพร้อมเหตุผลที่นี่",
  },
};

export default function Approvals() {
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<Tab>("pending");
  const [approveTarget, setApproveTarget] = useState<WithdrawalItem | null>(
    null
  );
  const [rejectTarget, setRejectTarget] = useState<WithdrawalItem | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectError, setRejectError] = useState("");

  const {
    data: withdrawalsData,
    isLoading,
    isError,
    refetch,
  } = trpc.withdrawals.list.useQuery(undefined, { retry: false });

  // Requests carry a fundId only; the account list gives the fund its name.
  const { data: accounts } = trpc.finance.accounts.useQuery(undefined, {
    retry: false,
    staleTime: 60_000,
  });
  const fundName = useMemo(() => {
    const m = new Map((accounts ?? []).map(a => [a.id, a.name]));
    return (id: number | null) => (id != null && m.get(id)) || null;
  }, [accounts]);

  const approveMutation = trpc.withdrawals.approve.useMutation({
    onSuccess: (_data, variables) => {
      toast.success(
        variables.action === "approved"
          ? "อนุมัติคำขอเบิกจ่ายแล้ว"
          : "บันทึกการไม่อนุมัติแล้ว"
      );
      setApproveTarget(null);
      setRejectTarget(null);
      setRejectReason("");
      void refetch();
    },
    onError: error => {
      toast.error("ดำเนินการคำขอเบิกไม่สำเร็จ", { description: error.message });
    },
  });

  const requests = withdrawalsData ?? [];
  const countFor = (tab: Tab) => requests.filter(r => r.status === tab).length;
  const visible = requests.filter(r => r.status === activeTab);

  const handleReject = () => {
    if (!rejectTarget) return;
    if (!rejectReason.trim()) {
      setRejectError("กรุณาระบุเหตุผล ผู้ยื่นคำขอจะเห็นข้อความนี้");
      return;
    }
    approveMutation.mutate({
      id: rejectTarget.id,
      action: "rejected",
      note: rejectReason.trim(),
    });
  };

  return (
    <AppLayout
      title="การอนุมัติเบิกจ่าย"
      subtitle="ตรวจสอบวัตถุประสงค์และยอดเงินของแต่ละคำขอก่อนอนุมัติ"
      action={
        <button
          type="button"
          onClick={() => setLocation("/withdrawals/new")}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-semibold text-foreground hover:bg-muted"
        >
          <Banknote className="size-4" aria-hidden="true" />
          ยื่นคำขอเบิกเงิน
        </button>
      }
    >
      <div className="space-y-4">
        {/* Segmented tabs: equal width so all three fit a 320px screen. */}
        <div
          role="tablist"
          aria-label="สถานะคำขอ"
          className="grid grid-cols-3 gap-1 rounded-xl border border-border bg-muted p-1"
        >
          {TABS.map(tab => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setActiveTab(tab.id)}
                className={`min-h-10 rounded-lg px-1 text-[13px] transition-colors ${
                  active
                    ? "bg-card font-semibold text-foreground shadow-xs"
                    : "font-medium text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.label}
                <span className="ml-1 tabular-nums">
                  {isLoading ? "" : countFor(tab.id)}
                </span>
              </button>
            );
          })}
        </div>

        {isLoading ? (
          <LoadingSkeleton count={3} height="h-24" />
        ) : isError ? (
          <ErrorState
            title="โหลดคำขอเบิกไม่สำเร็จ"
            description="ตรวจสอบการเชื่อมต่อแล้วลองอีกครั้ง"
            onRetry={() => void refetch()}
          />
        ) : visible.length === 0 ? (
          <EmptyState
            title={EMPTY_TEXT[activeTab].title}
            description={EMPTY_TEXT[activeTab].description}
          />
        ) : (
          <ul className="space-y-3">
            {visible.map(req => {
              const fund = fundName(req.fundId);
              return (
                <li
                  key={req.id}
                  className="rounded-2xl border border-border bg-card p-4 sm:p-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="text-[15px] font-semibold leading-snug text-foreground">
                        {req.purpose}
                      </h3>
                      <p className="mt-1 text-xs text-muted-foreground">
                        คำขอ #{req.id} · ยื่นเมื่อ{" "}
                        {formatThaiDate(req.requestDate || req.createdAt)}
                        {fund ? ` · ${fund}` : ""}
                      </p>
                    </div>
                    <StatusBadge status={req.status} />
                  </div>

                  <p className="mt-3 text-xs text-muted-foreground">
                    ยอดขอเบิก
                  </p>
                  <MoneyDisplay amount={Number(req.amount)} size="lg" />

                  {req.details && (
                    <p className="mt-2 text-sm leading-relaxed text-foreground-soft">
                      {req.details}
                    </p>
                  )}
                  {req.status === "rejected" && req.rejectionReason && (
                    <p className="mt-2 rounded-xl bg-destructive-soft px-3 py-2 text-sm text-destructive-strong">
                      เหตุผล: {req.rejectionReason}
                    </p>
                  )}
                  {req.status === "approved" && req.approvalDate && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      อนุมัติเมื่อ {formatThaiDate(req.approvalDate)}
                    </p>
                  )}

                  {req.status === "pending" && (
                    <div className="mt-4 grid grid-cols-2 gap-2 border-t border-divider pt-4">
                      <button
                        type="button"
                        disabled={approveMutation.isPending}
                        onClick={() => {
                          setRejectTarget(req);
                          setRejectError("");
                        }}
                        className="min-h-11 rounded-xl border border-destructive-border bg-card text-sm font-semibold text-destructive hover:bg-destructive-soft disabled:opacity-50"
                      >
                        ไม่อนุมัติ
                      </button>
                      <button
                        type="button"
                        disabled={approveMutation.isPending}
                        onClick={() => setApproveTarget(req)}
                        className="min-h-11 rounded-xl bg-success text-sm font-semibold text-white hover:bg-success-strong disabled:opacity-50"
                      >
                        อนุมัติ
                      </button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <ConfirmDialog
        open={approveTarget !== null}
        onOpenChange={open => !open && setApproveTarget(null)}
        title="ยืนยันการอนุมัติ"
        description={
          approveTarget
            ? `อนุมัติคำขอ "${approveTarget.purpose}" ยอด ${formatBaht(Number(approveTarget.amount))}`
            : ""
        }
        confirmText="อนุมัติ"
        variant="success"
        isLoading={approveMutation.isPending}
        onConfirm={() =>
          approveTarget &&
          approveMutation.mutate({ id: approveTarget.id, action: "approved" })
        }
      />

      <Dialog
        open={rejectTarget !== null}
        onOpenChange={open => {
          if (!open) {
            setRejectTarget(null);
            setRejectReason("");
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>ไม่อนุมัติคำขอนี้</DialogTitle>
            <DialogDescription>
              {rejectTarget
                ? `"${rejectTarget.purpose}" ยอด ${formatBaht(Number(rejectTarget.amount))} ผู้ยื่นคำขอจะได้รับแจ้งพร้อมเหตุผล`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <label
              htmlFor="reject-reason"
              className="text-sm font-semibold text-foreground"
            >
              เหตุผล <span className="text-destructive">*</span>
            </label>
            <textarea
              id="reject-reason"
              rows={3}
              value={rejectReason}
              onChange={e => {
                setRejectReason(e.target.value);
                if (rejectError) setRejectError("");
              }}
              aria-invalid={rejectError ? true : undefined}
              aria-describedby={rejectError ? "reject-reason-error" : undefined}
              placeholder="เช่น เอกสารใบเสนอราคาไม่ครบ หรือเกินงบประมาณที่ตั้งไว้"
              className="w-full rounded-xl border border-input bg-card px-3.5 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none aria-invalid:border-destructive"
            />
            {rejectError && (
              <p id="reject-reason-error" className="text-sm text-destructive">
                {rejectError}
              </p>
            )}
          </div>
          <DialogFooter>
            <button
              type="button"
              onClick={() => setRejectTarget(null)}
              className="min-h-11 rounded-xl border border-border bg-card px-4 text-sm font-semibold text-foreground hover:bg-muted"
            >
              ยกเลิก
            </button>
            <button
              type="button"
              onClick={handleReject}
              disabled={approveMutation.isPending}
              className="min-h-11 rounded-xl bg-destructive px-5 text-sm font-semibold text-destructive-foreground hover:bg-destructive-strong disabled:opacity-50"
            >
              {approveMutation.isPending ? "กำลังบันทึก…" : "ยืนยันไม่อนุมัติ"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
