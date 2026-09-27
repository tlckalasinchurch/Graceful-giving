import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import { canManageChurchSettings } from "@shared/roles";
import { trpc } from "@/lib/trpc";
import { clearSetupSkip, markSetupSkipped } from "@/lib/setupSkip";
import { Check, ChevronRight, Settings2, X } from "lucide-react";
import {
  DEFAULT_FUNDS,
  DEFAULT_OFFERING_CATEGORIES,
  getSaveErrorMessage,
  SetupData,
  STEPS,
} from "./ChurchSetup/components/setupTypes";
import {
  Step1,
  Step2,
  Step3,
  Step4,
  Step5,
  Step6,
  Step7,
  Step8,
} from "./ChurchSetup/components/SetupSteps";

export default function ChurchSetup() {
  const [, setLocation] = useLocation();
  const { user, loading: authLoading } = useAuth();
  const [step, setStep] = useState(1);

  useEffect(() => {
    if (!authLoading && user && !canManageChurchSettings(user)) {
      toast.error(
        "เฉพาะผู้ดูแลระบบสูงสุด (SUPER_ADMIN) หรือผู้นำคริสตจักรเท่านั้นที่สามารถเข้าถึงหน้านี้ได้"
      );
      setLocation("/");
    }
  }, [user, authLoading, setLocation]);

  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<SetupData>({
    name: "",
    address: "",
    phone: "",
    email: "",
    website: "",
    pastorName: "",
    assistantPastorName: "",
    treasurerName: "",
    motto: "2 โครินธ์ 9:7 · ผู้ให้ด้วยใจยินดี พระเจ้าทรงรัก",
    bankName: "",
    bankAccount: "",
    bankAccountName: "",
    offeringCategories: DEFAULT_OFFERING_CATEGORIES.slice(0, 4),
    funds: DEFAULT_FUNDS,
    fiscalYearStartMonth: 1,
    budgetYear: 2569,
  });

  const updateProfileMutation = trpc.church.updateProfile.useMutation();
  const completeSetupMutation = trpc.church.completeSetup.useMutation();
  const utils = trpc.useUtils();

  function skipSetup() {
    markSetupSkipped();
    setLocation("/");
  }

  const set = (partial: Partial<SetupData>) =>
    setData(d => ({ ...d, ...partial }));
  const totalSteps = STEPS.length;
  const progressPct = ((step - 1) / (totalSteps - 1)) * 100;
  const currentStepConfig = STEPS[step - 1];
  const StepIcon = currentStepConfig.icon;

  function validateStep(): boolean {
    if (step === 1 && !data.name.trim()) {
      toast.error("กรุณาระบุชื่อคริสตจักร");
      return false;
    }
    if (step === 2 && !data.pastorName.trim()) {
      toast.error("กรุณาระบุชื่อศิษยาภิบาล");
      return false;
    }
    if (step === 4 && data.offeringCategories.length === 0) {
      toast.error("กรุณาเลือกหมวดหมู่การถวายอย่างน้อย 1 หมวด");
      return false;
    }
    return true;
  }

  function next() {
    if (!validateStep()) return;
    setStep(s => Math.min(s + 1, totalSteps));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function back() {
    setStep(s => Math.max(s - 1, 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleFinish() {
    if (!validateStep()) return;
    setSaving(true);
    try {
      await updateProfileMutation.mutateAsync({
        name: data.name,
        address: data.address,
        phone: data.phone,
        email: data.email || undefined,
        website: data.website || undefined,
        pastorName: data.pastorName,
        assistantPastorName: data.assistantPastorName,
        treasurerName: data.treasurerName,
        bankName: data.bankName,
        bankAccount: data.bankAccount,
        bankAccountName: data.bankAccountName,
        fiscalYearStartMonth: data.fiscalYearStartMonth,
        motto: data.motto,
      });
      await completeSetupMutation.mutateAsync();
      clearSetupSkip();
      await utils.church.getProfile.invalidate();
      toast.success("ตั้งค่าคริสตจักรเรียบร้อย! 🎉");
      setTimeout(() => setLocation("/"), 1200);
    } catch (error: unknown) {
      toast.error(getSaveErrorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-canvas">
      <div className="mx-auto min-h-screen max-w-[560px] overflow-x-hidden bg-canvas pb-32 shadow-[0_0_40px_rgba(112,78,45,0.07)] lg:my-6 lg:min-h-0 lg:rounded-2xl lg:border lg:border-hairline">
        {/* Header */}
        <div className="relative overflow-hidden bg-surface border-b border-hairline px-5 pb-6 pt-5 sm:px-8">
          <button
            onClick={skipSetup}
            aria-label="กลับหน้าหลัก"
            className="absolute right-5 top-5 grid size-9 place-items-center rounded-full bg-white/70 text-muted-foreground hover:bg-white transition"
          >
            <X className="size-4" />
          </button>
          <p className="text-xs font-bold text-warning">
            GRACE-GIVING · ตั้งค่าคริสตจักร
          </p>
          <h1 className="font-display mt-2 text-2xl font-bold leading-tight tracking-tight text-foreground">
            ยินดีต้อนรับ 👋
            <br />
            มาเริ่มต้นด้วยกัน
          </h1>

          {/* Progress bar */}
          <div className="mt-5">
            <div className="mb-2 flex items-center justify-between text-xs font-bold text-secondary-foreground">
              <span>
                ขั้นตอนที่ {step} จาก {totalSteps}
              </span>
              <span>{Math.round(progressPct)}%</span>
            </div>
            <div
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(progressPct)}
              aria-label="ความคืบหน้าการตั้งค่า"
              className="h-2 overflow-hidden rounded-full bg-accent"
            >
              <div
                className="h-full rounded-full bg-primary transition-all duration-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>

          {/* Step dots */}
          <div className="mt-4 flex justify-center gap-1.5">
            {STEPS.map(s => (
              <button
                key={s.id}
                onClick={() => step > s.id && setStep(s.id)}
                aria-label={`ขั้นตอน ${s.id}`}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  s.id === step
                    ? "w-6 bg-primary"
                    : s.id < step
                      ? "w-3 bg-primary/50"
                      : "w-3 bg-accent"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Step Card */}
        <div className="px-4 pt-4 sm:px-6">
          <div className="rounded-2xl border border-hairline bg-white px-5 py-6 shadow-[0_8px_24px_rgba(94,70,42,0.06)] sm:px-7">
            {/* Step Header */}
            <div className="mb-5 flex items-center gap-3">
              <span
                className={`grid size-12 place-items-center rounded-2xl ${currentStepConfig.bgColor}`}
              >
                <StepIcon className={`size-6 ${currentStepConfig.color}`} />
              </span>
              <div>
                <p className="text-xs font-bold text-warning">
                  ขั้นตอนที่ {step}
                </p>
                <h2 className="font-display text-lg font-bold leading-tight text-foreground">
                  {currentStepConfig.title}
                </h2>
                <p className="text-xs text-secondary-foreground">
                  {currentStepConfig.subtitle}
                </p>
              </div>
            </div>

            {/* Step Content */}
            {step === 1 && <Step1 data={data} set={set} />}
            {step === 2 && <Step2 data={data} set={set} />}
            {step === 3 && <Step3 data={data} set={set} />}
            {step === 4 && <Step4 data={data} set={set} />}
            {step === 5 && <Step5 data={data} />}
            {step === 6 && <Step6 data={data} set={set} />}
            {step === 7 && <Step7 />}
            {step === 8 && <Step8 data={data} />}
          </div>
        </div>

        {/* All Steps Overview (collapsed) */}
        <div className="px-4 pt-3 sm:px-6">
          <details className="group rounded-2xl border border-hairline bg-white overflow-hidden">
            <summary className="flex cursor-pointer items-center justify-between px-4 py-3 text-xs font-bold text-secondary-foreground select-none">
              <span className="flex items-center gap-2">
                <Settings2 className="size-4 text-warning" />
                ขั้นตอนทั้งหมด
              </span>
              <ChevronRight className="size-4 transition-transform duration-200 group-open:rotate-90" />
            </summary>
            <div className="divide-y divide-[#e0e0e0]">
              {STEPS.map(s => {
                const done = step > s.id;
                const active = step === s.id;
                return (
                  <button
                    key={s.id}
                    onClick={() => done && setStep(s.id)}
                    disabled={!done && !active}
                    className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-xs transition ${
                      active ? "bg-canvas" : done ? "hover:bg-canvas" : ""
                    }`}
                  >
                    <span
                      className={`grid size-7 shrink-0 place-items-center rounded-lg text-xs font-bold ${
                        done
                          ? "bg-[#3F9156] text-white"
                          : active
                            ? "bg-primary text-white"
                            : "bg-accent text-muted-foreground"
                      }`}
                    >
                      {done ? <Check className="size-3.5" /> : s.id}
                    </span>
                    <div className="min-w-0">
                      <p
                        className={`font-bold ${active ? "text-warning" : done ? "text-foreground" : "text-muted-foreground"}`}
                      >
                        {s.title}
                      </p>
                      <p className="text-[10px] text-muted-foreground">{s.subtitle}</p>
                    </div>
                    {done && (
                      <Check className="ml-auto size-3.5 shrink-0 text-[#3F9156]" />
                    )}
                  </button>
                );
              })}
            </div>
          </details>
        </div>
      </div>

      {/* Fixed Bottom Navigation */}
      <div className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-[560px]">
        <div className="border-t border-hairline bg-canvas/95 px-4 pb-[max(16px,env(safe-area-inset-bottom))] pt-3 backdrop-blur sm:px-6">
          <div className="flex gap-3">
            {step > 1 && (
              <button
                onClick={back}
                className="min-h-[48px] flex-1 rounded-2xl border border-hairline bg-white text-sm font-bold text-secondary-foreground hover:bg-accent active:scale-[0.98] transition"
              >
                ← ย้อนกลับ
              </button>
            )}
            {step < totalSteps ? (
              <button
                onClick={next}
                className="min-h-[48px] flex-[2] rounded-2xl bg-primary text-sm font-bold text-white hover:opacity-95 active:scale-[0.98] transition"
              >
                ถัดไป →
              </button>
            ) : (
              <button
                onClick={handleFinish}
                disabled={saving}
                className="min-h-[48px] flex-[2] rounded-2xl bg-success text-sm font-bold text-white hover:opacity-95 active:scale-[0.98] transition disabled:opacity-60"
              >
                {saving ? "กำลังบันทึก..." : "✓ ยืนยันและเริ่มใช้งาน"}
              </button>
            )}
          </div>
          <button
            onClick={skipSetup}
            className="mt-2 w-full py-2 text-center text-xs font-bold text-secondary-foreground transition hover:text-foreground"
          >
            ไว้ทีหลัง →
          </button>
        </div>
      </div>
    </div>
  );
}
