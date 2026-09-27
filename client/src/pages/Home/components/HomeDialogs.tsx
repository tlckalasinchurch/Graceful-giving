import { BookOpen, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Illustration } from "@/components/Illustration";
import {
  offeringCategoryLabel,
  type OfferingCategory,
  type ExpenseCategory,
  OFFERING_CATEGORIES,
  EXPENSE_CATEGORIES,
} from "@shared/categories";
import type { SubmittedOffering } from "../types";
import { fmtBaht } from "../utils";

export interface ExpenseFormState {
  title: string;
  amount: string;
  category: ExpenseCategory;
  fundId: string;
  paymentMethod: string;
  notes: string;
}

export interface WithdrawalFormState {
  purpose: string;
  amount: string;
  fundId: string;
  urgency: string;
  notes: string;
}

interface HomeDialogsProps {
  // Offering dialog
  offeringOpen: boolean;
  onOfferingOpenChange: (open: boolean) => void;
  offeringStep: 1 | 2 | 3;
  onOfferingStepChange: (step: 1 | 2 | 3) => void;
  offeringType: OfferingCategory;
  onOfferingTypeChange: (type: OfferingCategory) => void;
  offeringAmount: string;
  onOfferingAmountChange: (v: string) => void;
  offeringFund: string;
  onOfferingFundChange: (v: string) => void;
  offeringMethod: string;
  onOfferingMethodChange: (v: string) => void;
  offeringNotes: string;
  onOfferingNotesChange: (v: string) => void;
  offeringAnon: boolean;
  onOfferingAnonChange: (v: boolean) => void;
  onOfferingSubmit: (e: React.FormEvent) => void;
  createOfferingMutation: { isPending: boolean };

  // Success dialog
  offeringSuccess: boolean;
  onOfferingSuccessChange: (open: boolean) => void;
  submittedOffering: SubmittedOffering | null;

  // Expense dialog
  expenseOpen: boolean;
  onExpenseOpenChange: (open: boolean) => void;
  expenseForm: ExpenseFormState;
  onExpenseFormChange: (form: ExpenseFormState) => void;
  onExpenseSubmit: (e: React.FormEvent) => void;
  createExpenseMutation: { isPending: boolean };

  // Withdrawal dialog
  withdrawalOpen: boolean;
  onWithdrawalOpenChange: (open: boolean) => void;
  withdrawalForm: WithdrawalFormState;
  onWithdrawalFormChange: (form: WithdrawalFormState) => void;
  onWithdrawalSubmit: (e: React.FormEvent) => void;
  createWithdrawalMutation: { isPending: boolean };

  // News sheet
  newsOpen: boolean;
  onNewsOpenChange: (open: boolean) => void;

  // Fund accounts for selects
  fundAccounts: Array<{ id: number; name: string }>;
}

export function HomeDialogs(props: HomeDialogsProps) {
  const {
    offeringOpen,
    onOfferingOpenChange,
    offeringStep,
    onOfferingStepChange,
    offeringType,
    onOfferingTypeChange,
    offeringAmount,
    onOfferingAmountChange,
    offeringFund,
    onOfferingFundChange,
    offeringMethod,
    onOfferingMethodChange,
    offeringNotes,
    onOfferingNotesChange,
    offeringAnon,
    onOfferingAnonChange,
    onOfferingSubmit,
    createOfferingMutation,
    offeringSuccess,
    onOfferingSuccessChange,
    submittedOffering,
    expenseOpen,
    onExpenseOpenChange,
    expenseForm,
    onExpenseFormChange,
    onExpenseSubmit,
    createExpenseMutation,
    withdrawalOpen,
    onWithdrawalOpenChange,
    withdrawalForm,
    onWithdrawalFormChange,
    onWithdrawalSubmit,
    createWithdrawalMutation,
    newsOpen,
    onNewsOpenChange,
    fundAccounts,
  } = props;

  return (
    <>
      <Dialog open={offeringOpen} onOpenChange={onOfferingOpenChange}>
        <DialogContent className="max-w-md bg-surface border-hairline rounded-[30px] p-6 text-foreground">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl overflow-hidden bg-success-bg p-1 border border-[#D2EAC7] shrink-0">
                <Illustration
                  src="/illustrations/offering_box.jpg"
                  alt="กล่องถวาย"
                  className="w-full h-full object-cover rounded-xl"
                  width={48}
                  height={48}
                />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-secondary-foreground">
                  บันทึกการถวายทรัพย์
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  ขั้นตอนที่ {offeringStep} จาก 3:{" "}
                  {offeringStep === 1
                    ? "เลือกประเภทการถวาย"
                    : offeringStep === 2
                      ? "ระบุจำนวนเงิน"
                      : "เลือกช่องทางและบันทึก"}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {offeringStep === 1 && (
            <div className="space-y-4 pt-2">
              <label className="text-xs font-bold text-secondary-foreground">
                ประเภทการถวาย
              </label>
              <div className="grid grid-cols-2 gap-2">
                {OFFERING_CATEGORIES.map(cat => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => onOfferingTypeChange(cat.id)}
                    className={`p-3 rounded-2xl border text-xs font-bold text-left transition-all ${offeringType === cat.id ? "bg-surface-subtle border-primary text-secondary-foreground" : "bg-white border-hairline text-secondary-foreground/80 hover:bg-surface-subtle"}`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => onOfferingStepChange(2)}
                className="w-full mt-4 py-3 rounded-2xl bg-primary hover:bg-[#0071e3] text-white font-bold text-sm clay-button-shadow transition-all"
              >
                ถัดไป: ระบุจำนวนเงิน →
              </button>
            </div>
          )}

          {offeringStep === 2 && (
            <div className="space-y-4 pt-2">
              <label className="text-xs font-bold text-secondary-foreground">
                จำนวนเงินถวาย (บาท)
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-bold text-success">
                  ฿
                </span>
                <input
                  type="number"
                  value={offeringAmount}
                  onChange={e => onOfferingAmountChange(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 rounded-2xl bg-white border border-hairline text-2xl font-bold text-success focus:outline-none focus:border-[#0071e3]"
                  placeholder="0.00"
                />
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                {[100, 300, 500, 1000, 2000, 5000].map(amt => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => onOfferingAmountChange(String(amt))}
                    className="px-3 py-1.5 rounded-full bg-surface-subtle border border-hairline text-xs font-bold text-secondary-foreground hover:bg-primary/10"
                  >
                    +฿{amt.toLocaleString()}
                  </button>
                ))}
              </div>
              <div className="flex gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => onOfferingStepChange(1)}
                  className="flex-1 py-3 rounded-2xl bg-surface-subtle text-secondary-foreground font-bold text-sm border border-hairline"
                >
                  ← ย้อนกลับ
                </button>
                <button
                  type="button"
                  onClick={() => onOfferingStepChange(3)}
                  disabled={!offeringAmount || Number(offeringAmount) <= 0}
                  className="flex-2 py-3 rounded-2xl bg-primary hover:bg-[#0071e3] text-white font-bold text-sm clay-button-shadow disabled:opacity-50"
                >
                  ถัดไป: ช่องทางถวาย →
                </button>
              </div>
            </div>
          )}

          {offeringStep === 3 && (
            <form onSubmit={onOfferingSubmit} className="space-y-4 pt-2">
              <div>
                <label className="text-xs font-bold text-secondary-foreground mb-1.5 block">
                  เข้ากองทุน
                </label>
                <select
                  required
                  value={offeringFund}
                  onChange={e => onOfferingFundChange(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-white border border-hairline text-xs font-medium text-foreground"
                >
                  <option value="" disabled>
                    -- เลือกกองทุน --
                  </option>
                  {fundAccounts.map(fa => (
                    <option key={fa.id} value={fa.id}>
                      {fa.name}
                    </option>
                  ))}
                </select>
                {fundAccounts.length === 0 && (
                  <p className="text-[11px] text-[#D45945] mt-1">
                    ยังไม่มีกองทุนในระบบ กรุณาเพิ่มกองทุนก่อนบันทึกการถวาย
                  </p>
                )}
              </div>
              <div>
                <label className="text-xs font-bold text-secondary-foreground mb-1.5 block">
                  วิธีการชำระเงิน
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {["เงินสด", "โอนธนาคาร", "พร้อมเพย์ / QR", "เช็ค"].map(m => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => onOfferingMethodChange(m)}
                      className={`p-2.5 rounded-xl border text-xs font-bold text-center transition-all ${offeringMethod === m ? "bg-success-bg border-success-border text-success" : "bg-white border-hairline text-secondary-foreground/80"}`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-secondary-foreground mb-1 block">
                  บันทึกเพิ่มเติม (ถ้ามี)
                </label>
                <input
                  type="text"
                  value={offeringNotes}
                  onChange={e => onOfferingNotesChange(e.target.value)}
                  placeholder="เช่น ขอบพระคุณสำหรับสุขภาพ, วันเกิด"
                  className="w-full p-2.5 rounded-xl bg-white border border-hairline text-xs"
                />
              </div>
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="anon"
                  checked={offeringAnon}
                  onChange={e => onOfferingAnonChange(e.target.checked)}
                  className="rounded text-primary focus:ring-[#0071e3]"
                />
                <label htmlFor="anon" className="text-xs text-secondary-foreground">
                  ไม่ระบุชื่อผู้ถวาย (ถวายโดยไม่เปิดเผยนาม)
                </label>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => onOfferingStepChange(2)}
                  className="flex-1 py-3 rounded-2xl bg-surface-subtle text-secondary-foreground font-bold text-sm border border-hairline"
                >
                  ← ย้อนกลับ
                </button>
                <button
                  type="submit"
                  disabled={createOfferingMutation.isPending || !offeringFund}
                  className="flex-2 py-3 rounded-2xl bg-primary hover:bg-[#0071e3] text-white font-bold text-sm clay-button-shadow disabled:opacity-50"
                >
                  {createOfferingMutation.isPending
                    ? "กำลังบันทึก..."
                    : "ยืนยันการบันทึกถวาย"}
                </button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* ─── MODAL 2: OFFERING SUCCESS CELEBRATION ─── */}
      <Dialog open={offeringSuccess} onOpenChange={onOfferingSuccessChange}>
        <DialogContent className="max-w-sm bg-surface border-hairline rounded-[30px] p-6 text-center text-foreground space-y-4">
          <div className="w-20 h-20 mx-auto rounded-3xl overflow-hidden border border-hairline p-1 bg-success-bg">
            <Illustration
              src="/illustrations/income_hand_heart.jpg"
              alt="ถวายสำเร็จ"
              className="w-full h-full object-cover rounded-2xl"
              width={80}
              height={80}
            />
          </div>
          <div>
            <h3 className="text-xl font-bold text-secondary-foreground">
              บันทึกการถวายเรียบร้อยแล้ว
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              "ขอพระเจ้าทรงอวยพระพรและตอบแทนทุกน้ำใจที่ท่านได้มอบให้เพื่อพันธกิจของพระองค์"
            </p>
          </div>
          {submittedOffering && (
            <div className="p-3.5 rounded-2xl bg-surface-subtle border border-hairline text-xs text-left space-y-1">
              <p>
                <span className="text-muted-foreground">รายการ:</span>{" "}
                <span className="font-bold text-secondary-foreground">
                  {offeringCategoryLabel(
                    submittedOffering.type as OfferingCategory
                  )}
                </span>
              </p>
              <p>
                <span className="text-muted-foreground">จำนวน:</span>{" "}
                <span className="font-bold text-success">
                  {fmtBaht(submittedOffering.amount)}
                </span>
              </p>
              <p>
                <span className="text-muted-foreground">กองทุน:</span>{" "}
                <span className="font-medium text-secondary-foreground">
                  {submittedOffering.fund}
                </span>
              </p>
            </div>
          )}
          <button
            onClick={() => onOfferingSuccessChange(false)}
            className="w-full py-3 rounded-2xl bg-success hover:bg-[#96C764] text-white font-bold text-sm clay-button-shadow"
          >
            เรียบร้อย (สรรเสริญพระเจ้า)
          </button>
        </DialogContent>
      </Dialog>

      {/* ─── MODAL 3: EXPENSE ENTRY DIALOG ─── */}
      <Dialog open={expenseOpen} onOpenChange={onExpenseOpenChange}>
        <DialogContent className="max-w-md bg-surface border-hairline rounded-[30px] p-6 text-foreground">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-secondary-foreground">
              บันทึกรายจ่ายคริสตจักร
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              บันทึกค่าใช้จ่ายพร้อมหักยอดจากกองทุนที่เกี่ยวข้อง
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={onExpenseSubmit} className="space-y-3.5 pt-2">
            <div>
              <label className="text-xs font-bold text-secondary-foreground mb-1 block">
                ชื่อรายการรายจ่าย
              </label>
              <input
                type="text"
                required
                value={expenseForm.title}
                onChange={e =>
                  onExpenseFormChange({ ...expenseForm, title: e.target.value })
                }
                placeholder="เช่น ค่าอุปกรณ์นมัสการ, ค่าไฟฟ้า"
                className="w-full p-2.5 rounded-xl bg-white border border-hairline text-xs md:text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-secondary-foreground mb-1 block">
                  จำนวนเงิน (บาท)
                </label>
                <input
                  type="number"
                  required
                  value={expenseForm.amount}
                  onChange={e =>
                    onExpenseFormChange({
                      ...expenseForm,
                      amount: e.target.value,
                    })
                  }
                  placeholder="0.00"
                  className="w-full p-2.5 rounded-xl bg-white border border-hairline text-xs md:text-sm font-bold text-error"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-secondary-foreground mb-1 block">
                  หมวดหมู่
                </label>
                <select
                  value={expenseForm.category}
                  onChange={e =>
                    onExpenseFormChange({
                      ...expenseForm,
                      category: e.target.value as ExpenseCategory,
                    })
                  }
                  className="w-full p-2.5 rounded-xl bg-white border border-hairline text-xs"
                >
                  {EXPENSE_CATEGORIES.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-secondary-foreground mb-1 block">
                หักจากกองทุน
              </label>
              <select
                required
                value={expenseForm.fundId}
                onChange={e =>
                  onExpenseFormChange({
                    ...expenseForm,
                    fundId: e.target.value,
                  })
                }
                className="w-full p-2.5 rounded-xl bg-white border border-hairline text-xs"
              >
                <option value="" disabled>
                  -- เลือกกองทุน --
                </option>
                {fundAccounts.map(fa => (
                  <option key={fa.id} value={fa.id}>
                    {fa.name}
                  </option>
                ))}
              </select>
              {fundAccounts.length === 0 && (
                <p className="text-[11px] text-[#D45945] mt-1">
                  ยังไม่มีกองทุนในระบบ กรุณาเพิ่มกองทุนก่อนบันทึกรายจ่าย
                </p>
              )}
            </div>
            <button
              type="submit"
              disabled={createExpenseMutation.isPending || !expenseForm.fundId}
              className="w-full py-3 mt-2 rounded-2xl bg-primary hover:bg-[#0071e3] text-white font-bold text-sm clay-button-shadow disabled:opacity-50"
            >
              {createExpenseMutation.isPending
                ? "กำลังบันทึก..."
                : "บันทึกรายจ่าย"}
            </button>
          </form>
        </DialogContent>
      </Dialog>

      {/* ─── MODAL 4: WITHDRAWAL REQUEST DIALOG ─── */}
      <Dialog open={withdrawalOpen} onOpenChange={onWithdrawalOpenChange}>
        <DialogContent className="max-w-md bg-surface border-hairline rounded-[30px] p-6 text-foreground">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-secondary-foreground">
              ยื่นคำขอเบิกเงิน (Withdrawal Request)
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              ส่งคำขอเบิกเงินเพื่อให้ศิษยาภิบาลหรือเหรัญญิกพิจารณาอนุมัติ
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={onWithdrawalSubmit} className="space-y-3.5 pt-2">
            <div>
              <label className="text-xs font-bold text-secondary-foreground mb-1 block">
                วัตถุประสงค์การเบิก
              </label>
              <input
                type="text"
                required
                value={withdrawalForm.purpose}
                onChange={e =>
                  onWithdrawalFormChange({
                    ...withdrawalForm,
                    purpose: e.target.value,
                  })
                }
                placeholder="เช่น ค่าจัดค่ายอนุชน, ค่าซ่อมแซมห้องน้ำ"
                className="w-full p-2.5 rounded-xl bg-white border border-hairline text-xs md:text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-secondary-foreground mb-1 block">
                  จำนวนเงิน (บาท)
                </label>
                <input
                  type="number"
                  required
                  value={withdrawalForm.amount}
                  onChange={e =>
                    onWithdrawalFormChange({
                      ...withdrawalForm,
                      amount: e.target.value,
                    })
                  }
                  placeholder="0.00"
                  className="w-full p-2.5 rounded-xl bg-white border border-hairline text-xs font-bold"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-secondary-foreground mb-1 block">
                  ความเร่งด่วน
                </label>
                <select
                  value={withdrawalForm.urgency}
                  onChange={e =>
                    onWithdrawalFormChange({
                      ...withdrawalForm,
                      urgency: e.target.value,
                    })
                  }
                  className="w-full p-2.5 rounded-xl bg-white border border-hairline text-xs"
                >
                  <option value="normal">ปกติ (ตามรอบ)</option>
                  <option value="urgent">เร่งด่วน</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-secondary-foreground mb-1 block">
                เบิกจากกองทุน
              </label>
              <select
                required
                value={withdrawalForm.fundId}
                onChange={e =>
                  onWithdrawalFormChange({
                    ...withdrawalForm,
                    fundId: e.target.value,
                  })
                }
                className="w-full p-2.5 rounded-xl bg-white border border-hairline text-xs"
              >
                <option value="" disabled>
                  -- เลือกกองทุน --
                </option>
                {fundAccounts.map(fa => (
                  <option key={fa.id} value={fa.id}>
                    {fa.name}
                  </option>
                ))}
              </select>
              {fundAccounts.length === 0 && (
                <p className="text-[11px] text-[#D45945] mt-1">
                  ยังไม่มีกองทุนในระบบ กรุณาเพิ่มกองทุนก่อนยื่นคำขอเบิกเงิน
                </p>
              )}
            </div>
            <button
              type="submit"
              disabled={
                createWithdrawalMutation.isPending || !withdrawalForm.fundId
              }
              className="w-full py-3 mt-2 rounded-2xl bg-primary hover:bg-[#0071e3] text-white font-bold text-sm clay-button-shadow disabled:opacity-50"
            >
              {createWithdrawalMutation.isPending
                ? "กำลังส่งคำขอ..."
                : "ยื่นคำขอเบิกเงิน"}
            </button>
          </form>
        </DialogContent>
      </Dialog>

      {/* ─── SHEET: CHURCH NEWS & ANNOUNCEMENTS ─── */}
      <Sheet open={newsOpen} onOpenChange={onNewsOpenChange}>
        <SheetContent className="bg-surface border-l border-hairline w-full sm:max-w-md p-6 overflow-y-auto">
          <SheetHeader className="mb-4">
            <SheetTitle className="text-lg font-bold text-secondary-foreground flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" />
              <span>ข่าวสารและประกาศคริสตจักร</span>
            </SheetTitle>
            <SheetDescription className="text-xs text-muted-foreground">
              ติดตามกิจกรรม พันธกิจ และคำพยานพระพร
            </SheetDescription>
          </SheetHeader>
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-surface-subtle border border-hairline space-y-2">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary text-white">
                ประกาศสำคัญ
              </span>
              <h4 className="text-sm font-bold text-secondary-foreground">
                ค่ายสามัคคีธรรมประจำปี 2026
              </h4>
              <p className="text-xs text-foreground leading-relaxed">
                ขอเชิญชวนพี่น้องสมาชิกทุกท่านร่วมค่ายสามัคคีธรรม วันที่ 18-20
                ต.ค. นี้ ณ ศูนย์ฝึกอบรมคริสเตียน
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-success-bg border border-[#D2EAC7] space-y-2">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-success text-white">
                รายงานพันธกิจ
              </span>
              <h4 className="text-sm font-bold text-success">
                โครงการแจกถุงยังชีพสู่ชุมชนรอบโบสถ์
              </h4>
              <p className="text-xs text-foreground leading-relaxed">
                คริสตจักรได้ส่งมอบถุงยังชีพจำนวน 120 ชุดแก่ครอบครัวยากไร้
                ขอบคุณพระเจ้าสำหรับทุกการถวาย
              </p>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
