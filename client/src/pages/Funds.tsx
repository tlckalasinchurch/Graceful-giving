import React, { useMemo, useState } from "react";
import { formatBaht } from "@/lib/format";
import { useLocation } from "wouter";
import { trpc, type RouterOutputs } from "@/lib/trpc";
import { AppLayout } from "@/components/layout/AppLayout";
import { ChevronRight, Plus } from "lucide-react";
import { toast } from "sonner";
import { FundBreakdown, fundTone } from "./Home/components/FundBreakdown";
import { fundShares } from "./Home/fundShares";
import { NativeSelect } from "@/components/ui/native-select";
import { useAuth } from "@/_core/hooks/useAuth";
import { canManageFinance } from "@shared/roles";

type AccountItem = RouterOutputs["finance"]["accounts"][number];

const FUND_TYPE_LABELS: Record<string, string> = {
  general: "ดำเนินงานทั่วไป",
  tithe: "ทศางค์",
  mission: "พันธกิจและประกาศ",
  building: "อาคารและบูรณะ",
  welfare: "สงเคราะห์และสวัสดิการ",
  special: "กองทุนโครงการพิเศษ",
};

export default function Funds() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const canCreate = canManageFinance(user);
  const utils = trpc.useUtils();
  const [showNewFundModal, setShowNewFundModal] = useState(false);
  const [newFundName, setNewFundName] = useState("");
  const [newFundType, setNewFundType] = useState<
    "general" | "tithe" | "mission" | "building" | "welfare" | "special"
  >("mission");
  const [newFundDesc, setNewFundDesc] = useState("");

  const {
    data: accountsData,
    isLoading,
    refetch,
  } = trpc.finance.accounts.useQuery(undefined, { retry: false });

  const createAccountMutation = trpc.finance.createAccount.useMutation({
    onSuccess: () => {
      toast.success("สร้างกองทุนใหม่สำเร็จ");
      setShowNewFundModal(false);
      setNewFundName("");
      setNewFundDesc("");
      refetch();
      void utils.finance.fundOptions.invalidate();
    },
    onError: error => {
      toast.error("สร้างกองทุนไม่สำเร็จ", { description: error.message });
    },
  });

  const fundsList = useMemo(() => {
    return (accountsData ?? []).map((account: AccountItem) => ({
      ...account,
      code: `FD-${String(account.id).padStart(3, "0")}`,
      description: account.description || "รายละเอียดกองทุนยังไม่มีในระบบ",
      balance: Number(account.balance),
    }));
  }, [accountsData]);

  const totalFundsBalance = useMemo(() => {
    return fundsList.reduce((acc, curr) => acc + curr.balance, 0);
  }, [fundsList]);

  // Every fund gets its share of the money held, so the bar and the rows agree.
  const shareById = useMemo(() => {
    const m = new Map<number, number>();
    for (const row of fundShares(fundsList, fundsList.length + 1)) {
      if (row.key.startsWith("fund-"))
        m.set(Number(row.key.slice(5)), row.share);
    }
    return m;
  }, [fundsList]);
  const toneIndexById = useMemo(() => {
    const m = new Map<number, number>();
    fundShares(fundsList, 6).forEach((row, i) => {
      if (row.key.startsWith("fund-")) m.set(Number(row.key.slice(5)), i);
    });
    return m;
  }, [fundsList]);
  const barRows = useMemo(() => fundShares(fundsList, 6), [fundsList]);

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
      subtitle="แยกเงินถวายตามวัตถุประสงค์ เพื่อใช้ให้ตรงกับเป้าหมายของแต่ละกองทุน"
      action={
        canCreate ? (
          <button
            onClick={() => setShowNewFundModal(true)}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-brand px-4 text-sm font-semibold text-black hover:bg-brand-ink"
          >
            <Plus className="size-4" />
            สร้างกองทุนใหม่
          </button>
        ) : undefined
      }
    >
      <div className="space-y-6">
        {/* Overview: the total, and the bar that shows where it sits */}
        <section
          aria-label="ยอดเงินรวมทุกกองทุน"
          className="rounded-2xl border border-line bg-surface p-5 sm:p-6 space-y-4"
        >
          <div>
            <p className="text-sm text-ink-2">ยอดเงินรวมทุกกองทุน</p>
            <p
              className={`money mt-1 text-3xl font-semibold ${totalFundsBalance < 0 ? "text-danger" : "text-ink"}`}
            >
              {formatBaht(totalFundsBalance)}
            </p>
            <p className="mt-1 text-xs text-ink-3">
              จาก {fundsList.length} กองทุนที่เปิดใช้งาน
            </p>
          </div>
          <FundBreakdown rows={barRows} hidden={false} legend={false} />
        </section>

        {/* Funds: one divided list, name and type left, balance and share right */}
        <section
          aria-label="รายการกองทุน"
          className="rounded-2xl border border-line bg-surface"
        >
          {fundsList.length === 0 ? (
            <div className="m-5 rounded-2xl border border-dashed border-line p-6 text-center space-y-3">
              <p className="text-sm font-semibold text-ink">
                ยังไม่มีข้อมูลกองทุนในระบบ
              </p>
              <p className="text-xs text-ink-3 max-w-md mx-auto">
                เริ่มต้นสร้างกองทุนแรกของคริสตจักร เช่น กองทุนทั่วไป หรือกองทุนพันธกิจ เพื่อเริ่มบันทึกเงินถวายและค่าใช้จ่าย
              </p>
              {canCreate && (
                <button
                  type="button"
                  onClick={() => setShowNewFundModal(true)}
                  className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-brand px-4 text-xs font-medium text-black hover:bg-brand-ink"
                >
                  <Plus className="size-4" />
                  สร้างกองทุนแรก
                </button>
              )}
            </div>
          ) : (
            <ul className="divide-y divide-line">
              {fundsList.map(f => {
                const share = shareById.get(f.id);
                return (
                  <li key={f.id}>
                    <button
                      type="button"
                      onClick={() => setLocation(`/funds/${f.id}`)}
                      className="flex min-h-16 w-full items-center gap-4 px-5 py-3.5 text-left hover:bg-paper focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand"
                    >
                      <span
                        aria-hidden="true"
                        className={`size-2 shrink-0 rounded-full ${
                          toneIndexById.has(f.id)
                            ? fundTone(toneIndexById.get(f.id) ?? 3)
                            : "border border-line"
                        }`}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-ink">
                          {f.name}
                        </span>
                        <span className="block truncate text-xs text-ink-3">
                          {FUND_TYPE_LABELS[f.type] || f.type} · {f.code}
                        </span>
                      </span>
                      <span className="shrink-0 text-right">
                        <span
                          className={`money block text-base font-semibold ${f.balance < 0 ? "text-danger" : "text-ink"}`}
                        >
                          {formatBaht(f.balance)}
                        </span>
                        <span className="money block text-xs text-ink-3">
                          {share === undefined
                            ? "—"
                            : `${share}% ของเงินทั้งหมด`}
                        </span>
                      </span>
                      <ChevronRight
                        className="size-4 shrink-0 text-ink-3"
                        aria-hidden="true"
                      />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Create Fund Modal */}
        {showNewFundModal && (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-surface rounded-2xl border border-line max-w-md w-full max-h-[calc(100dvh-2rem)] overflow-y-auto overscroll-contain p-6 md:p-8 space-y-5 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between border-b border-line pb-3">
                <h3 className="text-lg font-bold text-foreground">
                  สร้างกองทุนใหม่
                </h3>
                <button
                  onClick={() => setShowNewFundModal(false)}
                  type="button"
                  aria-label="ปิด"
                  className="-mr-2 flex size-11 shrink-0 items-center justify-center rounded-xl text-xl font-bold text-ink-3 hover:bg-paper-2 hover:text-foreground"
                >
                  ×
                </button>
              </div>

              <form onSubmit={handleCreateFund} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    ชื่อกองทุน <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="เช่น กองทุนทุนการศึกษาบุตรศิษยาภิบาล"
                    value={newFundName}
                    onChange={e => setNewFundName(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-2xl border border-line text-sm focus:border-primary focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    ประเภทกองทุน
                  </label>
                  <NativeSelect
                    value={newFundType}
                    onChange={e =>
                      setNewFundType(e.target.value as typeof newFundType)
                    }
                  >
                    <option value="mission">พันธกิจและประกาศ (Mission)</option>
                    <option value="tithe">ทศางค์ (Tithe)</option>
                    <option value="building">อาคารและบูรณะ (Building)</option>
                    <option value="welfare">
                      สงเคราะห์และสวัสดิการ (Welfare)
                    </option>
                    <option value="special">
                      กองทุนโครงการพิเศษ (Special)
                    </option>
                    <option value="general">ดำเนินงานทั่วไป (General)</option>
                  </NativeSelect>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    คำอธิบายและวัตถุประสงค์
                  </label>
                  <textarea
                    rows={3}
                    placeholder="ระบุวัตถุประสงค์ของการรับและจ่ายเงินกองทุนนี้..."
                    value={newFundDesc}
                    onChange={e => setNewFundDesc(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-2xl border border-line text-sm focus:border-primary focus:outline-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setShowNewFundModal(false)}
                    className="px-4 py-2.5 rounded-xl border border-line text-xs font-medium text-ink-2"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-xl bg-primary text-black text-xs font-semibold hover:bg-brand-ink"
                  >
                    สร้างกองทุน
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
