import React, { useMemo, useState } from "react";
import { formatBaht } from "@/lib/format";
import { Link } from "wouter";
import { trpc, type RouterOutputs } from "@/lib/trpc";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  ChevronRight,
  ArrowUpRight,
  Building,
  CheckCircle2,
  Cross,
  DollarSign,
  GraduationCap,
  HeartHandshake,
  Music,
  Plus,
  TrendingDown,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import {
  EmptyState,
  ErrorState,
  LoadingSkeleton,
  MoneyDisplay,
} from "@/components/common/CommonUI";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/_core/hooks/useAuth";
import { canManageFinance } from "@shared/roles";

import { FUND_TYPE_LABELS } from "@/lib/fundTypes";
import { NativeSelect } from "@/components/ui/native-select";

type AccountItem = RouterOutputs["finance"]["accounts"][number];

export default function Funds() {
  const { user } = useAuth();
  // createAccount is financeProcedure; church leaders can view funds only.
  const canCreate = canManageFinance(user);
  const [showNewFundModal, setShowNewFundModal] = useState(false);
  const [newFundName, setNewFundName] = useState("");
  const [newFundType, setNewFundType] = useState<
    "general" | "tithe" | "mission" | "building" | "welfare" | "special"
  >("mission");
  const [newFundDesc, setNewFundDesc] = useState("");

  const {
    data: accountsData,
    isLoading,
    isError,
    refetch,
  } = trpc.finance.accounts.useQuery(undefined, { retry: false });

  const createAccountMutation = trpc.finance.createAccount.useMutation({
    onSuccess: () => {
      toast.success("สร้างกองทุนใหม่สำเร็จ");
      setShowNewFundModal(false);
      setNewFundName("");
      setNewFundDesc("");
      refetch();
    },
    onError: error => {
      toast.error("สร้างกองทุนไม่สำเร็จ", { description: error.message });
    },
  });

  const fundsList = useMemo(() => {
    return (accountsData ?? []).map((account: AccountItem) => ({
      ...account,
      code: `FD-${String(account.id).padStart(3, "0")}`,
      icon:
        account.type === "building"
          ? Building
          : account.type === "mission"
            ? Cross
            : Wallet,
      description: account.description,
      balance: Number(account.balance),
    }));
  }, [accountsData]);

  const totalFundsBalance = useMemo(() => {
    return fundsList.reduce((acc, curr) => acc + curr.balance, 0);
  }, [fundsList]);

  const handleCreateFund = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFundName.trim()) {
      toast.error("กรุณาระบุชื่อกองทุน");
      return;
    }
    createAccountMutation.mutate({
      name: newFundName.trim(),
      type: newFundType,
      description: newFundDesc.trim() || undefined,
    });
  };

  return (
    <AppLayout
      title="กองทุน"
      subtitle="ยอดคงเหลือของแต่ละกองทุน แยกตามวัตถุประสงค์ของเงิน"
      action={
        canCreate ? (
          <button
            type="button"
            onClick={() => setShowNewFundModal(true)}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary-strong"
          >
            <Plus className="size-4" aria-hidden="true" />
            สร้างกองทุนใหม่
          </button>
        ) : undefined
      }
    >
      <div className="space-y-6">
        <section
          aria-label="ยอดเงินรวมทุกกองทุน"
          className="rounded-2xl border border-border bg-card p-4 sm:p-5"
        >
          <p className="text-sm font-medium text-muted-foreground">
            ยอดเงินรวมทุกกองทุน
          </p>
          <div className="mt-1 min-h-11">
            {isLoading ? (
              <div className="h-10 w-48 animate-pulse rounded-lg bg-muted" />
            ) : (
              <MoneyDisplay amount={totalFundsBalance} size="xl" />
            )}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            จาก {fundsList.length} กองทุนที่เปิดใช้งาน
          </p>
        </section>

        {isLoading ? (
          <LoadingSkeleton count={3} />
        ) : isError ? (
          <ErrorState
            title="โหลดข้อมูลกองทุนไม่สำเร็จ"
            description="ตรวจสอบการเชื่อมต่อแล้วลองอีกครั้ง"
            onRetry={() => void refetch()}
          />
        ) : fundsList.length === 0 ? (
          <EmptyState
            title="ยังไม่มีกองทุน"
            description="สร้างกองทุนแรกเพื่อแยกเงินตามวัตถุประสงค์ เช่น กองทุนทั่วไป หรือกองทุนพันธกิจ"
            actionText={canCreate ? "สร้างกองทุน" : undefined}
            onAction={() => setShowNewFundModal(true)}
          />
        ) : (
          <ul className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {fundsList.map(f => {
              const Icon = f.icon;
              const share =
                totalFundsBalance > 0 && f.balance > 0
                  ? (f.balance / totalFundsBalance) * 100
                  : 0;
              return (
                <li key={f.id}>
                  <Link
                    href={`/funds/${f.id}`}
                    className="flex h-full flex-col gap-3 rounded-2xl border border-border bg-card p-4 transition-colors hover:border-accent-border hover:bg-muted/40 sm:p-5"
                  >
                    <div className="flex items-start gap-3">
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted text-primary-strong">
                        <Icon className="size-5" aria-hidden="true" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate text-[15px] font-semibold text-foreground">
                          {f.name}
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          {FUND_TYPE_LABELS[f.type] ?? f.type}
                        </p>
                      </div>
                      <ChevronRight
                        className="mt-2 size-4 shrink-0 text-muted-foreground"
                        aria-hidden="true"
                      />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">
                        ยอดคงเหลือ
                      </p>
                      <MoneyDisplay amount={f.balance} size="lg" />
                    </div>
                    {f.balance < 0 ? (
                      <p className="rounded-lg bg-destructive-soft px-2.5 py-1.5 text-xs font-semibold text-destructive-strong">
                        ยอดติดลบ ตรวจสอบรายจ่ายของกองทุนนี้
                      </p>
                    ) : (
                      <div>
                        <div
                          className="h-1.5 w-full overflow-hidden rounded-full bg-divider"
                          role="img"
                          aria-label={`สัดส่วน ${share.toFixed(0)}% ของเงินทุกกองทุน`}
                        >
                          <div
                            className="h-full rounded-full bg-primary"
                            style={{ width: `${share}%` }}
                          />
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {share.toFixed(0)}% ของเงินทุกกองทุน
                        </p>
                      </div>
                    )}
                    {f.description && (
                      <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                        {f.description}
                      </p>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}

        <Dialog open={showNewFundModal} onOpenChange={setShowNewFundModal}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>สร้างกองทุนใหม่</DialogTitle>
              <DialogDescription>
                กองทุนใช้แยกเงินตามวัตถุประสงค์ ยอดเริ่มต้นเป็น 0 บาท
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateFund} className="space-y-4">
              <div className="space-y-1.5">
                <label
                  htmlFor="fund-name"
                  className="text-sm font-semibold text-foreground"
                >
                  ชื่อกองทุน <span className="text-destructive">*</span>
                </label>
                <input
                  id="fund-name"
                  type="text"
                  required
                  minLength={2}
                  placeholder="เช่น กองทุนทุนการศึกษา"
                  value={newFundName}
                  onChange={e => setNewFundName(e.target.value)}
                  className="min-h-11 w-full rounded-xl border border-input bg-card px-3.5 text-sm focus:border-primary focus:outline-none"
                />
              </div>
              <div className="space-y-1.5">
                <label
                  htmlFor="fund-type"
                  className="text-sm font-semibold text-foreground"
                >
                  ประเภทกองทุน
                </label>
                <NativeSelect
                  id="fund-type"
                  value={newFundType}
                  onChange={e =>
                    setNewFundType(e.target.value as typeof newFundType)
                  }
                >
                  {Object.entries(FUND_TYPE_LABELS).map(([id, label]) => (
                    <option key={id} value={id}>
                      {label}
                    </option>
                  ))}
                </NativeSelect>
              </div>
              <div className="space-y-1.5">
                <label
                  htmlFor="fund-desc"
                  className="text-sm font-semibold text-foreground"
                >
                  วัตถุประสงค์ (ไม่บังคับ)
                </label>
                <textarea
                  id="fund-desc"
                  rows={3}
                  placeholder="ใช้เงินกองทุนนี้เพื่ออะไร"
                  value={newFundDesc}
                  onChange={e => setNewFundDesc(e.target.value)}
                  className="w-full rounded-xl border border-input bg-card px-3.5 py-2.5 text-sm focus:border-primary focus:outline-none"
                />
              </div>
              <DialogFooter>
                <button
                  type="button"
                  onClick={() => setShowNewFundModal(false)}
                  className="min-h-11 rounded-xl border border-border bg-card px-4 text-sm font-semibold text-foreground hover:bg-muted"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={createAccountMutation.isPending}
                  className="min-h-11 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground hover:bg-primary-strong disabled:opacity-50"
                >
                  {createAccountMutation.isPending
                    ? "กำลังสร้าง…"
                    : "สร้างกองทุน"}
                </button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
