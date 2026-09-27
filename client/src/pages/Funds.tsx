import React, { useMemo, useState } from "react";
import { formatBaht } from "@/lib/format";
import { Link } from "wouter";
import { trpc, type RouterOutputs } from "@/lib/trpc";
import { AppLayout } from "@/components/layout/AppLayout";
import { ArrowRight, Building, Cross, Plus, Wallet } from "lucide-react";
import { toast } from "sonner";
import {
  EmptyState,
  ErrorState,
  LoadingSkeleton,
  MoneyDisplay,
} from "@/components/common/CommonUI";
import { NativeSelect } from "@/components/ui/native-select";
import { FUND_TYPE_LABELS } from "@shared/categories";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type AccountItem = RouterOutputs["finance"]["accounts"][number];

const INPUT_CLASS =
  "min-h-11 w-full px-4 py-2.5 rounded-xl border border-[#E5E1D8] text-base md:text-sm text-[#171717] placeholder-[#7A766F] focus:border-[#F97316] focus-visible:ring-2 focus-visible:ring-[#F97316]/30";

export default function Funds() {
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
      balance: Number(account.balance),
    }));
  }, [accountsData]);

  const totalFundsBalance = useMemo(() => {
    return fundsList.reduce((acc, curr) => acc + curr.balance, 0);
  }, [fundsList]);

  const handleCreateFund = (e: React.FormEvent) => {
    e.preventDefault();
    if (createAccountMutation.isPending) return;
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
      subtitle="แยกเงินถวายตามวัตถุประสงค์ เพื่อใช้ให้ตรงกับเป้าหมายของแต่ละกองทุน"
      action={
        <button
          onClick={() => setShowNewFundModal(true)}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#F97316] px-4 text-sm font-semibold text-[#171717] hover:bg-[#D95E0B]"
        >
          <Plus className="size-4" aria-hidden="true" />
          สร้างกองทุนใหม่
        </button>
      }
    >
      <div className="space-y-6">
        <section
          aria-label="ยอดเงินรวมทุกกองทุน"
          className="rounded-2xl border border-[#E5E1D8] bg-[#FFFFFF] p-5"
        >
          <p className="text-sm font-medium text-[#7A766F]">
            ยอดเงินรวมทุกกองทุน
          </p>
          <div className="mt-1">
            {isLoading || isError ? (
              <span className="text-3xl sm:text-4xl font-bold text-[#7A766F]">
                —
              </span>
            ) : (
              <MoneyDisplay amount={totalFundsBalance} size="xl" />
            )}
          </div>
          {!isLoading && !isError && (
            <p className="mt-1 text-xs text-[#7A766F]">
              จาก {fundsList.length} กองทุนที่เปิดใช้งาน
            </p>
          )}
        </section>

        {isLoading ? (
          <LoadingSkeleton count={3} />
        ) : isError ? (
          <ErrorState
            title="โหลดข้อมูลกองทุนไม่สำเร็จ"
            description="เชื่อมต่อฐานข้อมูลไม่สำเร็จ กรุณาลองใหม่อีกครั้ง"
            onRetry={() => void refetch()}
          />
        ) : fundsList.length === 0 ? (
          <EmptyState
            title="ยังไม่มีกองทุนในระบบ"
            description="สร้างกองทุนเพื่อแยกเงินถวายตามวัตถุประสงค์ เช่น พันธกิจ หรือสร้างอาคาร"
            illustrationSrc="/illustrations/balance_wallet.jpg"
            illustrationAlt="กระเป๋าสตางค์"
            actionText="สร้างกองทุนใหม่"
            onAction={() => setShowNewFundModal(true)}
          />
        ) : (
          <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {fundsList.map(f => {
              const Icon = f.icon;
              return (
                <li key={f.id}>
                  <Link
                    href={`/funds/${f.id}`}
                    className="h-full bg-[#FFFFFF] rounded-2xl border border-[#E5E1D8] p-6 hover:border-[#F97316] transition-colors flex flex-col justify-between group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F97316]"
                  >
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="w-11 h-11 rounded-xl bg-[#FFFFFF] flex items-center justify-center">
                          <Icon
                            className="w-5 h-5 text-[#F97316]"
                            aria-hidden="true"
                          />
                        </div>
                        <span className="text-xs font-mono text-[#7A766F] px-2.5 py-1 rounded-full border border-[#E5E1D8]">
                          {f.code}
                        </span>
                      </div>

                      <div>
                        <h3 className="text-base font-bold text-[#171717]">
                          {f.name}
                        </h3>
                        {f.description && (
                          <p className="text-xs text-[#7A766F] line-clamp-2 mt-1 leading-relaxed">
                            {f.description}
                          </p>
                        )}
                      </div>

                      <div>
                        <p className="text-xs text-[#7A766F]">
                          ยอดคงเหลือสุทธิ
                        </p>
                        <div
                          className={`text-2xl font-bold tabular-nums whitespace-nowrap ${f.balance < 0 ? "text-[#FF5B5B]" : "text-[#171717]"}`}
                        >
                          {formatBaht(f.balance)}
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 mt-4 border-t border-[#E5E1D8] flex items-center justify-between text-xs font-semibold text-[#5F5B55] group-hover:text-[#D95E0B]">
                      <span>ดูสเตทเมนต์และรายละเอียด</span>
                      <ArrowRight className="w-4 h-4" aria-hidden="true" />
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}

        <Dialog
          open={showNewFundModal}
          onOpenChange={open => {
            if (!createAccountMutation.isPending) setShowNewFundModal(open);
          }}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>สร้างกองทุนใหม่</DialogTitle>
              <DialogDescription>
                กองทุนใช้แยกเงินถวายตามวัตถุประสงค์ของการรับและจ่าย
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleCreateFund} className="space-y-4">
              <div className="space-y-1.5">
                <label
                  htmlFor="fund-name"
                  className="text-sm font-semibold text-[#171717]"
                >
                  ชื่อกองทุน{" "}
                  <span className="text-[#FF5B5B]" aria-hidden="true">
                    *
                  </span>
                </label>
                <input
                  id="fund-name"
                  type="text"
                  required
                  minLength={2}
                  maxLength={120}
                  placeholder="เช่น กองทุนทุนการศึกษาบุตรศิษยาภิบาล"
                  value={newFundName}
                  onChange={e => setNewFundName(e.target.value)}
                  className={INPUT_CLASS}
                />
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="fund-type"
                  className="text-sm font-semibold text-[#171717]"
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
                  {(
                    [
                      "mission",
                      "building",
                      "welfare",
                      "special",
                      "general",
                    ] as const
                  ).map(t => (
                    <option key={t} value={t}>
                      {FUND_TYPE_LABELS[t]}
                    </option>
                  ))}
                </NativeSelect>
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="fund-desc"
                  className="text-sm font-semibold text-[#171717]"
                >
                  คำอธิบายและวัตถุประสงค์
                </label>
                <textarea
                  id="fund-desc"
                  rows={3}
                  placeholder="ระบุวัตถุประสงค์ของการรับและจ่ายเงินกองทุนนี้..."
                  value={newFundDesc}
                  onChange={e => setNewFundDesc(e.target.value)}
                  className={INPUT_CLASS}
                />
              </div>

              <DialogFooter className="pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewFundModal(false)}
                  disabled={createAccountMutation.isPending}
                  className="min-h-11 px-4 rounded-xl border border-[#E5E1D8] bg-[#FFFFFF] text-sm font-medium text-[#5F5B55] hover:bg-[#FFFFFF] disabled:opacity-50"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={createAccountMutation.isPending}
                  className="min-h-11 px-6 rounded-xl bg-[#F97316] text-[#171717] text-sm font-semibold hover:bg-[#D95E0B] disabled:opacity-60 disabled:cursor-not-allowed"
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
