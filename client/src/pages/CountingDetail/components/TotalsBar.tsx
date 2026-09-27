import { MoneyDisplay } from "@/components/common/CommonUI";
import type { reconcile } from "@shared/counting";
import { Variance } from "./Variance";

type Recon = ReturnType<typeof reconcile>;

export function TotalsBar({ r }: { r: Recon }) {
  return (
        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <div className="rounded-2xl border border-hairline bg-white p-4">
            <p className="text-sm text-secondary-foreground">ยอดถวายตามซอง</p>
            <MoneyDisplay amount={r.offeringTotal} type="income" size="lg" />
          </div>
          <div className="rounded-2xl border border-hairline bg-white p-4">
            <p className="text-sm text-secondary-foreground">นับเงินสดได้</p>
            <MoneyDisplay amount={r.countedCashTotal} size="lg" />
            <div className="mt-1 text-sm">
              <Variance amount={r.cashVariance} />
            </div>
          </div>
          <div className="rounded-2xl border border-hairline bg-white p-4">
            <p className="text-sm text-secondary-foreground">หักเบิก</p>
            <MoneyDisplay amount={r.deductionTotal} type="expense" size="lg" />
          </div>
          <div className="rounded-2xl border border-hairline bg-white p-4">
            <p className="text-sm text-secondary-foreground">ต้องนำฝาก</p>
            <MoneyDisplay amount={r.expectedDeposit} size="lg" />
            <div className="mt-1 text-sm">
              <Variance amount={r.depositVariance} />
            </div>
          </div>
        </section>
  );
}
