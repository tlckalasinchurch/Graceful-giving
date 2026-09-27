import { Download, Heart, Landmark, Plus, Search } from "lucide-react";
import { Illustration } from "@/components/Illustration";
import type { TransactionItem } from "../types";
import { fmtBaht, fmtThaiDate } from "../utils";

interface HomeLedgerTabProps {
  allTransactions: TransactionItem[];
  filteredTransactions: TransactionItem[];
  searchTerm: string;
  onSearchChange: (v: string) => void;
  categoryFilter: string;
  onCategoryChange: (v: string) => void;
  ledgerTab: "all" | "offerings" | "expenses" | "withdrawals";
  onLedgerTabChange: (
    tab: "all" | "offerings" | "expenses" | "withdrawals"
  ) => void;
  onExportCSV: () => void;
  onOpenOffering: () => void;
}

export function HomeLedgerTab({
  allTransactions,
  filteredTransactions,
  searchTerm,
  onSearchChange,
  categoryFilter,
  onCategoryChange,
  ledgerTab,
  onLedgerTabChange,
  onExportCSV,
  onOpenOffering,
}: HomeLedgerTabProps) {
  return (
    <div role="tabpanel" aria-label="สมุดบัญชีการเงิน" className="space-y-4">
      <div className="bg-white rounded-2xl p-5 md:p-6 border border-hairline clay-card-shadow">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-xl font-bold text-secondary-foreground">
              สมุดบัญชีการเงิน
            </h2>
            <p className="text-xs text-muted-foreground">
              บันทึกรายการรายรับ-รายจ่ายของคริสตจักรอย่างโปร่งใส
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onExportCSV}
              className="px-3.5 py-2 rounded-xl bg-surface-subtle hover:bg-primary/10 text-secondary-foreground text-xs font-bold border border-hairline flex items-center gap-1.5 transition-all focus-visible:ring-2 focus-visible:ring-[#E99A4A]"
            >
              <Download className="w-3.5 h-3.5" />
              <span>ส่งออก CSV</span>
            </button>
            <button
              type="button"
              onClick={onOpenOffering}
              className="px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold flex items-center gap-1.5 clay-button-shadow hover:bg-[#0071e3] transition-all"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>บันทึกใหม่</span>
            </button>
          </div>
        </div>

        <div
          role="tablist"
          aria-label="ประเภทรายการ"
          className="flex items-center gap-1.5 p-1 rounded-2xl bg-surface-subtle border border-hairline mb-4"
        >
          <button
            role="tab"
            aria-selected={ledgerTab === "all"}
            onClick={() => onLedgerTabChange("all")}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${ledgerTab === "all" ? "bg-white text-secondary-foreground" : "text-muted-foreground"}`}
          >
            ทั้งหมด ({allTransactions.length})
          </button>
          <button
            role="tab"
            aria-selected={ledgerTab === "offerings"}
            onClick={() => onLedgerTabChange("offerings")}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${ledgerTab === "offerings" ? "bg-success-bg text-success" : "text-muted-foreground"}`}
          >
            รายรับถวาย
          </button>
          <button
            role="tab"
            aria-selected={ledgerTab === "expenses"}
            onClick={() => onLedgerTabChange("expenses")}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${ledgerTab === "expenses" ? "bg-[#FFEBE5] text-[#D45945]" : "text-muted-foreground"}`}
          >
            รายจ่าย
          </button>
        </div>

        <div className="relative mb-4">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
          <label htmlFor="ledger-search" className="sr-only">
            ค้นหารายการทางการเงิน
          </label>
          <input
            id="ledger-search"
            type="text"
            value={searchTerm}
            onChange={e => onSearchChange(e.target.value)}
            placeholder="ค้นหารายการ, หมวดหมู่ หรือผู้ถวาย..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-surface border border-hairline text-xs md:text-sm focus:outline-none focus:border-[#0071e3]"
          />
        </div>

        {filteredTransactions.length === 0 ? (
          <div className="py-12 px-4 flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-24 h-24 rounded-2xl overflow-hidden bg-surface-subtle p-1 border border-hairline">
              <Illustration
                src="/illustrations/offering_box.jpg"
                alt="กล่องถวาย"
                className="w-full h-full object-cover rounded-2xl"
                width={96}
                height={96}
              />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-secondary-foreground">
                {searchTerm || categoryFilter !== "all" || ledgerTab !== "all"
                  ? "ไม่พบรายการที่ตรงกับเงื่อนไข"
                  : "ยังไม่มีรายการถวาย"}
              </h3>
              <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                {searchTerm || categoryFilter !== "all" || ledgerTab !== "all"
                  ? "ลองเปลี่ยนคำค้นหา หรือเลือกประเภทรายการอื่น"
                  : "เริ่มบันทึกการถวายรายการแรกของคริสตจักรของคุณเพื่อความโปร่งใสและเป็นระเบียบ"}
              </p>
            </div>
            <button
              type="button"
              onClick={onOpenOffering}
              className="px-5 py-2.5 rounded-full bg-primary text-white text-xs font-bold clay-button-shadow hover:bg-[#0071e3] transition-all flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>บันทึกการถวายรายการแรก</span>
            </button>
          </div>
        ) : (
          <div className="divide-y divide-[#F0E6D8]/60">
            {filteredTransactions.map(tx => {
              const isIncome = tx.type === "income";
              const IconComp = tx.icon || (isIncome ? Heart : Landmark);
              return (
                <div
                  key={tx.id}
                  className="py-3 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-10 h-10 rounded-full ${tx.tone} flex items-center justify-center shrink-0`}
                    >
                      <IconComp className="w-5 h-5 stroke-[2.2]" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-foreground truncate">
                        {tx.title}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {typeof tx.date === "string"
                          ? tx.date
                          : fmtThaiDate(tx.date)}{" "}
                        · {tx.subCategory}
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p
                      className={`text-sm md:text-base font-bold ${isIncome ? "text-success" : "text-error"}`}
                    >
                      {isIncome ? "+" : "-"}
                      {fmtBaht(tx.amount)}
                    </p>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-surface-subtle text-secondary-foreground font-medium">
                      {tx.category}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
