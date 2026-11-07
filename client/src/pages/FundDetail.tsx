import React, { useMemo } from "react";
import { useLocation, useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  BackLink,
  EmptyState,
  LoadingSkeleton,
  MoneyDisplay,
  StatusBadge,
} from "@/components/common/CommonUI";
import { ArrowRightLeft, Download, Wallet } from "lucide-react";
import { toast } from "sonner";
import {
  expenseCategoryLabel,
  offeringCategoryLabel,
} from "@shared/categories";
import { formatThaiDate, THAI_LOCALE } from "@/lib/format";

const FUND_TYPE_LABELS: Record<string, string> = {
  general: "ดำเนินงานทั่วไป",
  tithe: "ทศางค์",
  mission: "พันธกิจและประกาศ",
  building: "อาคารและบูรณะ",
  welfare: "สงเคราะห์และสวัสดิการ",
  special: "กองทุนโครงการพิเศษ",
};

export default function FundDetail() {
  const params = useParams();
  const [, setLocation] = useLocation();
  const fundId = Number(params.id);
  const { data: accounts, isLoading } = trpc.finance.accounts.useQuery(
    undefined,
    { retry: false }
  );
  const { data: offeringsData } = trpc.offerings.list.useQuery(
    { limit: 100 },
    { retry: false }
  );
  const { data: expensesData } = trpc.expenses.list.useQuery(
    { limit: 100 },
    { retry: false }
  );
  const fund = accounts?.find(account => account.id === fundId);

  const fundTransactions = useMemo(() => {
    if (!fund) return [];
    const items: Array<{
      id: string;
      rawId: number;
      title: string;
      date: string | Date;
      type: "income" | "expense";
      categoryLabel: string;
      amount: number;
    }> = [];
    for (const o of offeringsData ?? []) {
      if (o.fundId === fund.id) {
        items.push({
          id: `offering-${o.id}`,
          rawId: o.id,
          title: offeringCategoryLabel(o.category),
          date: o.receiptDate,
          type: "income",
          categoryLabel: offeringCategoryLabel(o.category),
          amount: Number(o.amount),
        });
      }
    }
    for (const e of expensesData ?? []) {
      if (e.fundId === fund.id) {
        items.push({
          id: `expense-${e.id}`,
          rawId: e.id,
          title: e.description,
          date: e.expenseDate,
          type: "expense",
          categoryLabel: expenseCategoryLabel(e.category),
          amount: Number(e.amount),
        });
      }
    }
    return items.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [fund, offeringsData, expensesData]);

  const handleExportStatement = () => {
    if (!fund) return;
    if (fundTransactions.length === 0) {
      toast.info("ยังไม่มีรายการเคลื่อนไหวสำหรับกองทุนนี้");
      return;
    }
    const headers = "ID,วันที่,ประเภท,รายการ,หมวดหมู่,จำนวนเงิน (บาท)\n";
    const rows = fundTransactions
      .map(
        tx =>
          `"${tx.id}","${new Date(tx.date).toLocaleDateString(THAI_LOCALE)}","${
            tx.type === "income" ? "รายรับ" : "รายจ่าย"
          }","${tx.title.replace(/"/g, '""')}","${tx.categoryLabel}",${
            tx.type === "income"
              ? tx.amount.toFixed(2)
              : (-tx.amount).toFixed(2)
          }`
      )
      .join("\n");
    const blob = new Blob(["\uFEFF" + headers + rows], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute(
      "download",
      `statement-fund-${fund.id}-${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("ดาวน์โหลด Statement กองทุนเรียบร้อยแล้ว");
  };

  if (isLoading)
    return (
      <AppLayout title="รายละเอียดกองทุน">
        <LoadingSkeleton count={3} />
      </AppLayout>
    );
  if (!fund)
    return (
      <AppLayout title="ไม่พบกองทุน">
        <EmptyState
          title="ไม่พบข้อมูลกองทุน"
          description="กองทุนนี้ไม่มีอยู่ในข้อมูลที่คุณมีสิทธิ์เข้าถึง หรืออาจถูกปิดใช้งาน"
          actionText="กลับหน้ากองทุน"
          onAction={() => setLocation("/funds")}
        />
      </AppLayout>
    );

  const balance = Number(fund.balance);
  return (
    <AppLayout title="รายละเอียดกองทุน" subtitle={fund.name}>
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <BackLink
            label="กลับหน้ารายการกองทุน"
            onClick={() => setLocation("/funds")}
          />
          <span className="font-mono text-xs font-extrabold text-accent-foreground bg-accent px-3 py-1 rounded-full border-2 border-[var(--ink)] shadow-[2px_2px_0_var(--ink)]">
            FD-{String(fund.id).padStart(3, "0")}
          </span>
        </div>
        <section className="bento-card p-6 md:p-8 space-y-6">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
            <div className="space-y-2">
              <StatusBadge
                status={fund.isActive ? "active" : "inactive"}
                label={fund.isActive ? "กำลังใช้งาน" : "ปิดใช้งาน"}
              />
              <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-ink">
                {fund.name}
              </h1>
              <p className="text-sm font-medium text-ink-3 max-w-xl">
                {fund.description || "ยังไม่มีคำอธิบายกองทุนในระบบ"}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() =>
                  toast.info(
                    "ฟังก์ชันโอนเงินจะเปิดใช้เมื่อมี workflow จากระบบรองรับ"
                  )
                }
                className="btn-secondary min-h-11 inline-flex items-center gap-2 px-4 py-2.5 text-sm"
              >
                <ArrowRightLeft className="w-4 h-4 text-brand" />
                โอนเงินระหว่างกองทุน
              </button>
              <button
                onClick={handleExportStatement}
                className="btn-primary min-h-11 inline-flex items-center gap-2 px-4 py-2.5 text-sm"
              >
                <Download className="w-4 h-4" />
                ดาวน์โหลด Statement
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 divide-y-2 sm:divide-y-0 sm:divide-x-2 divide-[var(--ink)] rounded-2xl border-2 border-[var(--ink)] bg-surface overflow-hidden">
            <div className="p-4 flex items-baseline justify-between sm:block">
              <p className="text-xs text-ink-3 font-extrabold uppercase tracking-wider">
                ยอดคงเหลือสุทธิ
              </p>
              <div className="text-right sm:text-left sm:mt-1">
                <MoneyDisplay amount={balance} size="xl" />
                <p className="text-[11px] font-medium text-ink-3 mt-1">
                  ยอดจริงจากบัญชีกองทุน
                </p>
              </div>
            </div>
            <div className="p-4 flex items-baseline justify-between sm:block">
              <p className="text-xs text-ink-3 font-extrabold uppercase tracking-wider">
                ประเภทกองทุน
              </p>
              <div className="text-right sm:text-left sm:mt-1">
                <p className="text-2xl font-extrabold text-ink">
                  {FUND_TYPE_LABELS[fund.type] || fund.type}
                </p>
                <p className="text-[11px] font-medium text-ink-3 mt-1">
                  รายการเคลื่อนไหวในระบบ {fundTransactions.length} รายการ
                </p>
              </div>
            </div>
          </div>
        </section>
        <section className="bento-card-static p-6">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b-2 border-[var(--ink)]">
            <Wallet className="w-5 h-5 text-brand" />
            <h2 className="text-base font-extrabold text-ink">
              กิจกรรมล่าสุด ({fundTransactions.length})
            </h2>
          </div>
          {fundTransactions.length === 0 ? (
            <EmptyState
              title="ยังไม่มีข้อมูลกิจกรรม"
              description="ยังไม่มีรายการถวายหรือรายจ่ายที่ผูกกับกองทุนนี้"
            />
          ) : (
            <div className="divide-y divide-line">
              {fundTransactions.map(tx => (
                <div
                  key={tx.id}
                  onClick={() => setLocation(`/transactions/${tx.id}`)}
                  className="py-3.5 px-3 flex items-center justify-between gap-4 hover:bg-paper-2 rounded-xl cursor-pointer transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-extrabold text-ink truncate">
                      {tx.title}
                    </p>
                    <p className="text-xs font-medium text-ink-3">
                      {formatThaiDate(tx.date)} · {tx.categoryLabel}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <MoneyDisplay
                      amount={tx.amount}
                      type={tx.type}
                      size="base"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </AppLayout>
  );
}
