import React, { useMemo, useState } from "react";
import { formatBaht } from "@/lib/format";
import { useLocation } from "wouter";
import { trpc, type RouterOutputs } from "@/lib/trpc";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  ArrowRight,
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
import { MoneyDisplay } from "@/components/common/CommonUI";
import { NativeSelect } from "@/components/ui/native-select";

type AccountItem = RouterOutputs["finance"]["accounts"][number];

export default function Funds() {
  const [, setLocation] = useLocation();
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
      description: account.description || "รายละเอียดกองทุนยังไม่มีในระบบ",
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
      subtitle="แยกเงินถวายตามวัตถุประสงค์ เพื่อใช้ให้ตรงกับเป้าหมายของแต่ละกองทุน"
      action={
        <button
          onClick={() => setShowNewFundModal(true)}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#F97316] px-4 text-sm font-semibold text-white hover:bg-[#D95E0B]"
        >
          <Plus className="size-4" />
          สร้างกองทุนใหม่
        </button>
      }
    >
      <div className="space-y-6">
        {/* Overview */}
        <div className="rounded-2xl border border-[#E5E1D8] bg-white p-5">
          <p className="text-sm font-medium text-[#7A766F]">
            ยอดเงินรวมทุกกองทุน
          </p>
          <div className="mt-1">
            <MoneyDisplay amount={totalFundsBalance} size="xl" />
          </div>
          <p className="mt-1 text-xs text-[#7A766F]">
            จาก {fundsList.length} กองทุนที่เปิดใช้งาน
          </p>
        </div>

        {/* Funds Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {fundsList.length === 0 && (
            <p className="md:col-span-2 lg:col-span-3 py-12 text-center text-sm text-[#7A766F] bg-white rounded-2xl border border-dashed border-[#E5E1D8]">
              ยังไม่มีข้อมูลกองทุนจากระบบ
            </p>
          )}
          {fundsList.map(f => {
            const Icon = f.icon;
            const percentage = null;

            return (
              <div
                key={f.id}
                className="bg-white rounded-2xl border border-[#E5E1D8] p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group cursor-pointer"
                onClick={() => setLocation(`/funds/${f.id}`)}
              >
                <div className="space-y-4">
                  {/* Top Bar */}
                  <div className="flex items-center justify-between">
                    <div className="w-12 h-12 rounded-2xl bg-[#F1EFE9] flex items-center justify-center text-[#5F5B55] group-hover:scale-105 transition-transform">
                      <Icon className="w-6 h-6 text-primary" />
                    </div>
                    <span className="text-xs font-mono text-[#7A766F] bg-background px-2.5 py-1 rounded-full border border-[#E5E1D8]">
                      {f.code}
                    </span>
                  </div>

                  {/* Title & Desc */}
                  <div>
                    <h3 className="text-base font-bold text-foreground group-hover:text-primary transition-colors">
                      {f.name}
                    </h3>
                    <p className="text-xs text-[#7A766F] line-clamp-2 mt-1 leading-relaxed">
                      {f.description}
                    </p>
                  </div>

                  {/* Balance Display */}
                  <div className="pt-2">
                    <p className="text-xs text-[#7A766F]">ยอดคงเหลือสุทธิ</p>
                    <div
                      className={`text-2xl font-bold tabular-nums ${f.balance < 0 ? "text-[#FF5B5B]" : "text-[#171717]"}`}
                    >
                      {formatBaht(f.balance)}
                    </div>
                  </div>

                  {/* Progress towards target */}
                  <div className="pt-1 text-xs text-[#7A766F]">
                    ยังไม่มีข้อมูลเป้าหมายสำรองสำหรับกองทุนนี้
                  </div>

                  {/* Monthly Inflow/Outflow */}
                  <div className="pt-2 border-t border-[#E5E1D8]/40 text-xs text-[#7A766F]">
                    กิจกรรมล่าสุดจะแสดงเมื่อมีข้อมูลจากระบบ
                  </div>
                </div>

                {/* Bottom Action */}
                <div className="pt-5 mt-4 border-t border-[#E5E1D8]/50 flex items-center justify-between text-xs font-semibold text-[#5F5B55] group-hover:text-primary">
                  <span>ดูสเตทเมนต์และรายละเอียด</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            );
          })}
        </div>

        {/* Create Fund Modal */}
        {showNewFundModal && (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl border border-[#E5E1D8] max-w-md w-full max-h-[calc(100dvh-2rem)] overflow-y-auto overscroll-contain p-6 md:p-8 space-y-5 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between border-b border-[#E5E1D8] pb-3">
                <h3 className="text-lg font-bold text-foreground">
                  สร้างกองทุนใหม่
                </h3>
                <button
                  onClick={() => setShowNewFundModal(false)}
                  type="button"
                  aria-label="ปิด"
                  className="-mr-2 flex size-11 shrink-0 items-center justify-center rounded-xl text-xl font-bold text-[#7A766F] hover:bg-[#F1EFE9] hover:text-foreground"
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
                    className="w-full px-4 py-2.5 rounded-2xl border border-[#E5E1D8] text-sm focus:border-primary focus:outline-none"
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
                    className="w-full px-4 py-2.5 rounded-2xl border border-[#E5E1D8] text-sm focus:border-primary focus:outline-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setShowNewFundModal(false)}
                    className="px-4 py-2.5 rounded-xl border border-[#E5E1D8] text-xs font-medium text-[#5F5B55]"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-xl bg-primary text-white text-xs font-semibold hover:bg-[#D95E0B]"
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
