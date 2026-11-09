import React, { useEffect, useMemo, useState } from "react";
import { formatBaht } from "@/lib/format";
import { useLocation } from "wouter";
import { trpc, type RouterOutputs } from "@/lib/trpc";
import { AppLayout } from "@/components/layout/AppLayout";
import { ChevronRight, Plus } from "lucide-react";
import { toast } from "sonner";
import { FundBreakdown, fundTone } from "./Home/components/FundBreakdown";
import { fundShares } from "./Home/fundShares";
import { NativeSelect } from "@/components/ui/native-select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/_core/hooks/useAuth";
import { canManageFinance } from "@shared/roles";
import { friendlyErrorMessage } from "@/lib/errors";

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

  const { data: accountsData, refetch } = trpc.finance.accounts.useQuery(
    undefined,
    { retry: false }
  );

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
      toast.error("สร้างกองทุนไม่สำเร็จ", {
        description: friendlyErrorMessage(error),
      });
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

  const generalFundBalance = useMemo(
    () =>
      fundsList
        .filter(f => f.type === "general")
        .reduce((sum, f) => sum + f.balance, 0),
    [fundsList]
  );
  const restrictedFundBalance = useMemo(
    () =>
      fundsList
        .filter(f => f.type !== "general")
        .reduce((sum, f) => sum + f.balance, 0),
    [fundsList]
  );

  useEffect(() => {
    if (!showNewFundModal) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowNewFundModal(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showNewFundModal]);

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
            className="btn-primary inline-flex min-h-11 items-center gap-2 rounded-xl px-4 text-sm font-bold"
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
          className="bento-card space-y-4 p-5 sm:p-6"
        >
          <div>
            <p className="eyebrow">ยอดเงินรวมทุกกองทุน</p>
            <p
              className={`display money mt-2 text-[clamp(2rem,4vw,2.75rem)] leading-none ${totalFundsBalance < 0 ? "text-danger" : "text-ink"}`}
            >
              {formatBaht(totalFundsBalance)}
            </p>
            <p className="mt-1.5 text-xs font-bold text-ink-3">
              จาก {fundsList.length} กองทุนที่เปิดใช้งาน
            </p>
          </div>
          <FundBreakdown rows={barRows} hidden={false} legend={false} />
        </section>

        {/* Subtotal Split: General (Unrestricted) vs. Restricted */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <div className="rounded-2xl border-2 border-[var(--ink)] bg-tile-mint p-4 sm:p-5 shadow-[2px_2px_0_var(--ink)] space-y-1">
            <span className="eyebrow text-tile-mint-ink font-extrabold text-xs">
              กองทุนทั่วไป (คล่องตัว ไม่ผูกพัน)
            </span>
            <p className="money text-xl sm:text-2xl font-extrabold text-tile-mint-ink">
              {formatBaht(generalFundBalance)}
            </p>
            <p className="text-xs text-tile-mint-ink/80 font-medium">
              ใช้จ่ายในพันธกิจและดำเนินงานทั่วไปของคริสตจักรได้
            </p>
          </div>
          <div className="rounded-2xl border-2 border-[var(--ink)] bg-tile-sand p-4 sm:p-5 shadow-[2px_2px_0_var(--ink)] space-y-1">
            <span className="eyebrow text-tile-sand-ink font-extrabold text-xs">
              กองทุนเฉพาะพันธกิจ (เงินผูกพัน)
            </span>
            <p className="money text-xl sm:text-2xl font-extrabold text-tile-sand-ink">
              {formatBaht(restrictedFundBalance)}
            </p>
            <p className="text-xs text-tile-sand-ink/80 font-medium">
              ผูกพันตามวัตถุประสงค์เฉพาะของผู้ถวาย เช่น อาคาร, สงเคราะห์,
              โครงการพิเศษ
            </p>
          </div>
        </div>

        {/* Funds: one divided list, name and type left, balance and share right */}
        <section
          aria-label="รายการกองทุน"
          className="bento-card-static overflow-hidden p-0"
        >
          {fundsList.length === 0 ? (
            <div className="m-5 rounded-2xl border-2 border-dashed border-[var(--ink)]/30 bg-paper-2 p-6 text-center space-y-3">
              <p className="text-sm font-extrabold text-ink">
                ยังไม่มีข้อมูลกองทุนในระบบ
              </p>
              <p className="text-xs font-medium text-ink-3 max-w-md mx-auto">
                เริ่มต้นสร้างกองทุนแรกของคริสตจักร เช่น กองทุนทั่วไป
                หรือกองทุนพันธกิจ เพื่อเริ่มบันทึกเงินถวายและค่าใช้จ่าย
              </p>
              {canCreate && (
                <button
                  type="button"
                  onClick={() => setShowNewFundModal(true)}
                  className="btn-primary inline-flex min-h-11 items-center gap-2 rounded-xl px-4 text-xs font-bold"
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
                      className="flex min-h-16 w-full items-center gap-4 px-5 py-3.5 text-left transition-colors hover:bg-paper-2 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand"
                    >
                      <span
                        aria-hidden="true"
                        className={`size-3 shrink-0 rounded-md border border-[var(--ink)] ${
                          toneIndexById.has(f.id)
                            ? fundTone(toneIndexById.get(f.id) ?? 3)
                            : "bg-paper-2"
                        }`}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-extrabold text-ink">
                          {f.name}
                        </span>
                        <span className="block truncate text-xs font-medium text-ink-3">
                          {FUND_TYPE_LABELS[f.type] || f.type} · {f.code}
                        </span>
                      </span>
                      <span className="shrink-0 text-right">
                        <span
                          className={`money block text-base font-extrabold ${f.balance < 0 ? "text-danger" : "text-ink"}`}
                        >
                          {formatBaht(f.balance)}
                        </span>
                        <span className="money block text-xs font-medium text-ink-3">
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
        <Dialog open={showNewFundModal} onOpenChange={setShowNewFundModal}>
          <DialogContent className="neo-modal max-h-[calc(100dvh-2rem)] w-full max-w-md space-y-5 overflow-y-auto overscroll-contain p-6 md:p-8">
            <DialogHeader className="border-b-2 border-[var(--ink)] pb-3 text-left">
              <DialogTitle className="text-lg font-extrabold text-ink">
                สร้างกองทุนใหม่
              </DialogTitle>
              <DialogDescription className="sr-only">
                กรอกข้อมูลชื่อ ประเภท และวัตถุประสงค์เพื่อสร้างกองทุนใหม่
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleCreateFund} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-ink-2">
                  ชื่อกองทุน <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="เช่น กองทุนทุนการศึกษาบุตรศิษยาภิบาล"
                  value={newFundName}
                  onChange={e => setNewFundName(e.target.value)}
                  className="neo-input w-full px-4 py-2.5 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-ink-2">
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
                <label className="text-xs font-extrabold text-ink-2">
                  คำอธิบายและวัตถุประสงค์
                </label>
                <textarea
                  rows={3}
                  placeholder="ระบุวัตถุประสงค์ของการรับและจ่ายเงินกองทุนนี้..."
                  value={newFundDesc}
                  onChange={e => setNewFundDesc(e.target.value)}
                  className="neo-input w-full px-4 py-2.5 text-sm"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowNewFundModal(false)}
                  className="btn-secondary min-h-11 px-4 py-2.5 text-xs"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="btn-primary min-h-11 px-6 py-2.5 text-xs"
                >
                  สร้างกองทุน
                </button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
