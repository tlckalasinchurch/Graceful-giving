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
import {
  ArrowRightLeft,
  Download,
  HandHeart,
  ReceiptText,
  Wallet,
} from "lucide-react";
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
          <span className="font-mono text-xs text-ink-3 bg-paper-2 px-3 py-1 rounded-full border border-line">
            FD-{String(fund.id).padStart(3, "0")}
          </span>
        </div>
        <section className="bg-paper-2 border border-line rounded-2xl p-6 md:p-8 space-y-6 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
            <div className="space-y-2">
              <StatusBadge
                status={fund.isActive ? "active" : "inactive"}
                label={fund.isActive ? "กำลังใช้งาน" : "ปิดใช้งาน"}
              />
              <h1 className="text-2xl md:text-3xl font-bold text-ink">
                {fund.name}
              </h1>
              <p className="text-sm text-ink-3 max-w-xl">
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
                className="min-h-11 inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-surface border border-line text-ink-2 text-sm font-medium"
              >
                <ArrowRightLeft className="w-4 h-4 text-brand" />
                โอนเงินระหว่างกองทุน
              </button>
              <button
                onClick={handleExportStatement}
                className="min-h-11 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand text-black text-sm font-medium"
              >
                <Download className="w-4 h-4" />
                ดาวน์โหลด Statement
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-surface p-4 rounded-2xl border border-line/80">
              <p className="text-xs text-ink-3 font-medium">ยอดคงเหลือสุทธิ</p>
              <MoneyDisplay amount={balance} size="xl" />
              <p className="text-[11px] text-ink-3 mt-1">
                ยอดจริงจากบัญชีกองทุน
              </p>
            </div>
            <div className="bg-surface p-4 rounded-2xl border border-line/80">
              <p className="text-xs text-ink-3 font-medium">ประเภทกองทุน</p>
              <p className="text-2xl font-bold text-ink mt-1">
                {FUND_TYPE_LABELS[fund.type] || fund.type}
              </p>
              <p className="text-[11px] text-ink-3 mt-1">
                รายการเคลื่อนไหวในระบบ {fundTransactions.length} รายการ
              </p>
            </div>
          </div>
        </section>
        <section className="bg-surface rounded-2xl border border-line p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Wallet className="w-5 h-5 text-brand" />
            <h2 className="text-base font-bold text-ink">
              กิจกรรมล่าสุด ({fundTransactions.length})
            </h2>
          </div>
          {fundTransactions.length === 0 ? (
            <EmptyState
              title="ยังไม่มีข้อมูลกิจกรรม"
              description="ยังไม่มีรายการถวายหรือรายจ่ายที่ผูกกับกองทุนนี้"
              className="border-dashed shadow-none"
            />
          ) : (
            <div className="divide-y divide-line/60">
              {fundTransactions.map(tx => (
                <div
                  key={tx.id}
                  onClick={() => setLocation(`/transactions/${tx.id}`)}
                  className="py-3.5 px-2 flex items-center justify-between gap-4 hover:bg-paper/60 rounded-xl cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`size-10 rounded-xl flex items-center justify-center shrink-0 ${
                        tx.type === "income"
                          ? "bg-tile-mint text-tile-mint-ink"
                          : "bg-tile-sand text-tile-sand-ink"
                      }`}
                    >
                      {tx.type === "income" ? (
                        <HandHeart className="size-5" />
                      ) : (
                        <ReceiptText className="size-5" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-ink truncate">
                        {tx.title}
                      </p>
                      <p className="text-xs text-ink-3">
                        {formatThaiDate(tx.date)} · {tx.categoryLabel}
                      </p>
                    </div>
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
