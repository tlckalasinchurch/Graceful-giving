import { useMemo } from "react";
import { useLocation, useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  BackLink,
  EmptyState,
  ErrorState,
  LoadingSkeleton,
  MoneyDisplay,
  StatusBadge,
  TransactionFeed,
  type FeedItem,
} from "@/components/common/CommonUI";
import {
  expenseCategoryLabel,
  offeringCategoryLabel,
  paymentMethodLabel,
} from "@shared/categories";
import { fundTypeLabel } from "@/lib/fundTypes";

/** Rows read per list; the movement list says when it may be incomplete. */
const LIST_LIMIT = 200;

export default function FundDetail() {
  const params = useParams();
  const [, setLocation] = useLocation();
  const fundId = Number(params.id);
  const {
    data: accounts,
    isLoading,
    isError,
    refetch,
  } = trpc.finance.accounts.useQuery(undefined, { retry: false });
  const fund = accounts?.find(account => account.id === fundId);

  // The API has no per-fund statement, so the movements come from the latest
  // offerings and expenses, filtered to this fund.
  const offerings = trpc.offerings.list.useQuery(
    { limit: LIST_LIMIT },
    { retry: false, enabled: !!fund }
  );
  const expenses = trpc.expenses.list.useQuery(
    { limit: LIST_LIMIT },
    { retry: false, enabled: !!fund }
  );

  const movements = useMemo<FeedItem[]>(() => {
    const list: FeedItem[] = [];
    for (const o of offerings.data ?? []) {
      if (o.fundId !== fundId) continue;
      list.push({
        id: `offering-${o.id}`,
        href: `/transactions/offering-${o.id}`,
        title: offeringCategoryLabel(o.category),
        meta: paymentMethodLabel(o.method || "cash"),
        amount: Number(o.amount),
        type: "income",
        category: o.category,
        date: o.receiptDate,
      });
    }
    for (const e of expenses.data ?? []) {
      if (e.fundId !== fundId) continue;
      list.push({
        id: `expense-${e.id}`,
        href: `/transactions/expense-${e.id}`,
        title: e.description,
        meta: expenseCategoryLabel(e.category),
        amount: Number(e.amount),
        type: "expense",
        category: e.category,
        date: e.expenseDate,
      });
    }
    return list.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [offerings.data, expenses.data, fundId]);

  const listsCapped =
    (offerings.data?.length ?? 0) >= LIST_LIMIT ||
    (expenses.data?.length ?? 0) >= LIST_LIMIT;
  const totalIn = movements
    .filter(m => m.type === "income")
    .reduce((t, m) => t + m.amount, 0);
  const totalOut = movements
    .filter(m => m.type === "expense")
    .reduce((t, m) => t + m.amount, 0);

  const back = (
    <BackLink label="กองทุนทั้งหมด" onClick={() => setLocation("/funds")} />
  );

  if (isLoading)
    return (
      <AppLayout title="รายละเอียดกองทุน" action={back}>
        <LoadingSkeleton count={3} />
      </AppLayout>
    );
  if (isError)
    return (
      <AppLayout title="รายละเอียดกองทุน" action={back}>
        <ErrorState
          title="โหลดข้อมูลกองทุนไม่สำเร็จ"
          description="ตรวจสอบการเชื่อมต่อแล้วลองอีกครั้ง"
          onRetry={() => void refetch()}
        />
      </AppLayout>
    );
  if (!fund)
    return (
      <AppLayout title="ไม่พบกองทุน" action={back}>
        <EmptyState
          title="ไม่พบข้อมูลกองทุน"
          description="กองทุนนี้ไม่มีอยู่ในข้อมูลที่คุณมีสิทธิ์เข้าถึง หรืออาจถูกปิดใช้งาน"
          actionText="กลับหน้ากองทุน"
          onAction={() => setLocation("/funds")}
        />
      </AppLayout>
    );

  const movementsLoading = offerings.isLoading || expenses.isLoading;

  return (
    <AppLayout
      title={fund.name}
      subtitle={fundTypeLabel(fund.type)}
      subtitleOnMobile
      action={back}
    >
      <div className="mx-auto max-w-3xl space-y-6">
        <section
          aria-label="ยอดคงเหลือของกองทุน"
          className="rounded-2xl border border-border bg-card p-5 sm:p-6"
        >
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm font-medium text-muted-foreground">
              ยอดคงเหลือ
            </p>
            <StatusBadge
              status={fund.isActive ? "active" : "inactive"}
              label={fund.isActive ? "เปิดใช้งาน" : "ปิดใช้งาน"}
            />
          </div>
          <div className="mt-2">
            <MoneyDisplay amount={Number(fund.balance)} size="xl" />
          </div>
          {fund.description && (
            <p className="mt-3 text-sm leading-relaxed text-foreground-soft">
              {fund.description}
            </p>
          )}
          {movements.length > 0 && (
            <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-divider pt-4">
              <div className="min-w-0">
                <dt className="text-xs text-muted-foreground">
                  รับเข้าในรายการที่แสดง
                </dt>
                <dd>
                  <MoneyDisplay amount={totalIn} type="income" size="sm" />
                </dd>
              </div>
              <div className="min-w-0">
                <dt className="text-xs text-muted-foreground">
                  จ่ายออกในรายการที่แสดง
                </dt>
                <dd>
                  <MoneyDisplay amount={totalOut} type="expense" size="sm" />
                </dd>
              </div>
            </dl>
          )}
        </section>

        <section aria-labelledby="movements-heading" className="space-y-3">
          <h2
            id="movements-heading"
            className="text-base font-semibold text-foreground"
          >
            ความเคลื่อนไหว
          </h2>
          {movementsLoading ? (
            <LoadingSkeleton count={4} />
          ) : offerings.isError || expenses.isError ? (
            <ErrorState
              title="โหลดความเคลื่อนไหวไม่สำเร็จ"
              description="ลองอีกครั้ง หรือดูรายการทั้งหมดในหน้ารายการ"
              onRetry={() => {
                void offerings.refetch();
                void expenses.refetch();
              }}
            />
          ) : movements.length === 0 ? (
            <EmptyState
              title="ยังไม่มีความเคลื่อนไหว"
              description="เมื่อบันทึกรายรับหรือรายจ่ายเข้ากองทุนนี้ รายการจะแสดงที่นี่"
            />
          ) : (
            <>
              <TransactionFeed items={movements} />
              {listsCapped && (
                <p className="text-xs text-muted-foreground">
                  แสดงจากรายการล่าสุด {LIST_LIMIT} รายการของแต่ละประเภท
                  รายการที่เก่ากว่านั้นดูได้ในหน้ารายงาน
                </p>
              )}
            </>
          )}
        </section>
      </div>
    </AppLayout>
  );
}
