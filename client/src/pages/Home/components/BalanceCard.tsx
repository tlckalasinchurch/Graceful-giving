import { Eye, EyeOff } from "lucide-react";
import { formatAmount } from "@/lib/format";
import { monthDelta, spentShare } from "../summaryFormat";

interface BalanceCardProps {
  showBalance: boolean;
  setShowBalance: (show: boolean) => void;
  isLoading: boolean;
  isError: boolean;
  hasData: boolean;
  totalBalance: number | undefined;
  monthlyIncome: number | undefined;
  monthlyExpense: number | undefined;
  prevIncome: number | undefined;
  prevExpense: number | undefined;
  canOpenReports: boolean;
  onOpenReports: () => void;
}

const HIDDEN = "••••••";

function Baht({ value, sign = "" }: { value: number; sign?: string }) {
  const negative = value < 0;
  return (
    <>
      {negative ? "−" : sign}฿&#8239;{formatAmount(Math.abs(value))}
    </>
  );
}

function Cell({
  label,
  loading,
  children,
  note,
}: {
  label: string;
  loading: boolean;
  children: React.ReactNode;
  note: string;
}) {
  return (
    <div className="flex min-w-0 items-center justify-between gap-3 py-3 sm:block sm:px-4 sm:py-4 sm:first:pl-0 sm:last:pr-0">
      <dt className="text-xs text-ink-3">{label}</dt>
      <dd className="sm:mt-1 max-sm:text-right">
        {loading ? (
          <span className="block h-6 w-24 rounded bg-paper-2" aria-hidden />
        ) : (
          <span className="money block truncate text-xl font-semibold text-ink">
            {children}
          </span>
        )}
        <span className="mt-0.5 block text-xs text-ink-3">{note}</span>
      </dd>
    </div>
  );
}

export function BalanceCard({
  showBalance,
  setShowBalance,
  isLoading,
  isError,
  hasData,
  totalBalance,
  monthlyIncome,
  monthlyExpense,
  prevIncome,
  prevExpense,
  canOpenReports,
  onOpenReports,
}: BalanceCardProps) {
  const income = monthlyIncome ?? 0;
  const expense = monthlyExpense ?? 0;
  const net = income - expense;
  const share = hasData ? spentShare(income, expense) : null;
  const over = share !== null && share > 100;
  const shown = showBalance && hasData;

  return (
    <section
      aria-label="ยอดเงินคงเหลือรวม"
      aria-busy={isLoading}
      className="rounded-2xl border border-line bg-surface p-5 sm:p-6"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-sm text-ink-2">ยอดเงินคงเหลือรวม</h2>
          {isLoading ? (
            <span
              className="mt-2 block h-10 w-56 rounded bg-paper-2"
              aria-hidden
            />
          ) : (
            <p
              className={`money mt-1 text-4xl font-semibold ${
                hasData && (totalBalance ?? 0) < 0 ? "text-danger" : "text-ink"
              }`}
            >
              {!hasData ? (
                <span className="text-ink-3">—</span>
              ) : shown ? (
                <Baht value={totalBalance ?? 0} />
              ) : (
                <span aria-label="ยอดเงินถูกซ่อน">฿&#8239;{HIDDEN}</span>
              )}
            </p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {canOpenReports && (
            <button
              type="button"
              onClick={onOpenReports}
              className="min-h-11 rounded-full px-3 text-sm font-medium text-brand-ink hover:bg-paper-2"
            >
              ดูรายงาน
            </button>
          )}
          <button
            type="button"
            onClick={() => setShowBalance(!showBalance)}
            className="inline-flex size-11 items-center justify-center rounded-full text-ink-2 hover:bg-paper-2"
            aria-label={showBalance ? "ซ่อนยอดเงิน" : "แสดงยอดเงิน"}
            aria-pressed={!showBalance}
          >
            {showBalance ? (
              <Eye className="size-4" aria-hidden />
            ) : (
              <EyeOff className="size-4" aria-hidden />
            )}
          </button>
        </div>
      </div>

      {isError && (
        <p role="alert" className="mt-3 text-sm text-danger">
          โหลดข้อมูลการเงินไม่สำเร็จ ลองรีเฟรชหน้านี้อีกครั้ง
        </p>
      )}
      {!isLoading && !isError && !hasData && (
        <p className="mt-3 text-sm text-ink-2">ยังไม่มีข้อมูลการเงิน</p>
      )}

      <dl className="mt-5 grid grid-cols-1 divide-y divide-line border-t border-line sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        <Cell
          label="รายรับเดือนนี้"
          loading={isLoading}
          note={hasData ? monthDelta(income, prevIncome ?? 0) : "ไม่มีข้อมูล"}
        >
          {shown ? <Baht value={income} sign="+" /> : HIDDEN}
        </Cell>
        <Cell
          label="รายจ่ายเดือนนี้"
          loading={isLoading}
          note={hasData ? monthDelta(expense, prevExpense ?? 0) : "ไม่มีข้อมูล"}
        >
          {shown ? <Baht value={expense} /> : HIDDEN}
        </Cell>
        <Cell
          label="คงเหลือสุทธิเดือนนี้"
          loading={isLoading}
          note={
            !hasData
              ? "ไม่มีข้อมูล"
              : net >= 0
                ? "รายรับมากกว่ารายจ่าย"
                : "รายจ่ายมากกว่ารายรับ"
          }
        >
          {shown ? <Baht value={net} sign={net > 0 ? "+" : ""} /> : HIDDEN}
        </Cell>
      </dl>

      {!isLoading && hasData && (
        <div className="mt-1 border-t border-line pt-4">
          {share === null ? (
            <p className="text-sm text-ink-2">ยังไม่มีรายรับเดือนนี้</p>
          ) : (
            <>
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="text-ink-2">
                  ใช้ไปแล้ว {share}% ของรายรับเดือนนี้
                </span>
                {over && <span className="text-danger">เกินรายรับ</span>}
              </div>
              <div
                className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-line"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.min(share, 100)}
                aria-label={`ใช้ไปแล้ว ${share}% ของรายรับเดือนนี้`}
              >
                <div
                  className={`h-full rounded-full ${over ? "bg-danger" : "bg-brand"}`}
                  style={{ width: `${Math.min(share, 100)}%` }}
                />
              </div>
            </>
          )}
        </div>
      )}
    </section>
  );
}
