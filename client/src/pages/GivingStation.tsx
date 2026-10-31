import React, { useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  OFFERING_CATEGORIES,
  offeringCategoryLabel,
  type OfferingCategory,
} from "@shared/categories";
import {
  canManageFinance,
  getChurchRoleInfo,
  isStationOnlyUser,
} from "@shared/roles";
import { MAX_GIVING_AMOUNT } from "@shared/givingLimits";
import { formatThaiDateTime } from "@/lib/format";
import { prepareSlipImage, SlipFileError } from "@/lib/slipImage";
import type { DonorSlipState, DonorSlipStatus } from "@shared/donorSlip";
import {
  buildSendChecklist,
  canSend,
  type ChecklistItem,
  describeOutcome,
  failedAttemptsNote,
  resolveAmount,
  resolveSubmitMode,
  type StationSubmission,
} from "./givingStationFlow";
import { StationOnlyFrame } from "@/components/layout/StationOnlyFrame";
import { PromptPayQrCard } from "@/components/ui/promptpay-qr-card";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Copy,
  CreditCard,
  Image as ImageIcon,
  Printer,
  QrCode,
  RotateCcw,
  Smartphone,
  Sparkles,
  UploadCloud,
} from "lucide-react";
import { toast } from "sonner";
import {
  StationCountdownCard,
  defaultStationUrl,
  StationCubeLogo,
  StationHeroCTA,
  StationOfferingPackageCard,
  StationProfileCard,
  StationQrPoster,
  StationStatusCard,
  StationStepStatusCard,
  StationUnlockConfirmCard,
} from "@/components/ui/station-giving-kit";

type StationTab = "flow" | "poster";
type FlowStep = 1 | 2 | 3 | 4;

const DEFAULT_AMOUNTS: Record<OfferingCategory, number> = {
  tithe: 1000,
  general: 300,
  mission: 500,
  building: 1000,
  welfare: 500,
  special: 300,
};

const PRESET_CHOICES: Record<OfferingCategory, number[]> = {
  tithe: [500, 1000, 2000, 5000],
  general: [100, 300, 500, 1000],
  mission: [200, 500, 1000, 3000],
  building: [500, 1000, 3000, 5000],
  welfare: [200, 500, 1000, 2000],
  special: [100, 300, 500, 1000],
};

/** The route component at /giving/station. */
export default function GivingStation() {
  return <GivingStationView />;
}

/** The donor flow in the plain frame, for any role. Used by /give. */
export function PlainGivingStation() {
  return <GivingStationView plain />;
}

function GivingStationView({ plain = false }: { plain?: boolean }) {
  const [, setLocation] = useLocation();
  const { user, logout } = useAuth();
  // An ordinary member, or anyone on /give, sees only the donor flow, in a
  // plain frame.
  const stationOnly = plain || isStationOnlyUser(user);
  const utils = trpc.useUtils();

  const [activeTabState, setActiveTab] = useState<StationTab>("flow");
  const activeTab: StationTab = stationOnly ? "flow" : activeTabState;
  const [step, setStep] = useState<FlowStep>(1);

  // Queries
  const churchQuery = trpc.church.getProfile.useQuery(undefined, {
    retry: false,
  });
  const fundOptionsQuery = trpc.finance.fundOptions.useQuery(undefined, {
    retry: false,
  });
  const funds = fundOptionsQuery.data ?? [];
  // Where to pay, for a donor who has not paid yet.
  const payeeQuery = trpc.church.payeeInfo.useQuery(undefined, {
    enabled: step === 3,
    retry: false,
  });
  const payee = payeeQuery.data ?? null;
  const mySlipsQuery = trpc.givingInbox.mySlips.useQuery(undefined, {
    retry: false,
  });
  // Loading counts as ready. Only a failed load blocks the flow.
  const stationReady = !churchQuery.isError && !fundOptionsQuery.isError;

  // Flow State
  const [selectedCategory, setSelectedCategory] =
    useState<OfferingCategory>("general");
  const [amountsByCat, setAmountsByCat] =
    useState<Record<OfferingCategory, number>>(DEFAULT_AMOUNTS);
  const [customAmount, setCustomAmount] = useState<string>("");
  const [selectedFundId, setSelectedFundId] = useState<string>("");
  // null until the donor types, so the name fills in once `user` has loaded.
  const [donorNameInput, setDonorNameInput] = useState<string | null>(null);
  const donorName = donorNameInput ?? user?.name ?? "";
  // Set only when the server accepted the giving. Step 4 shows this and
  // nothing else, so the "done" screen cannot appear without a saved record.
  const [submission, setSubmission] = useState<StationSubmission | null>(null);
  const [slipPreview, setSlipPreview] = useState<string | null>(null);
  // Has the donor paid yet? "not_yet" shows where to pay. "done" goes to the slip.
  const [transferState, setTransferState] = useState<"not_yet" | "done">(
    "not_yet"
  );
  // How many slips the system turned away for this donor in 24 hours.
  const [failedAttempts, setFailedAttempts] = useState(0);
  const slipInputRef = useRef<HTMLInputElement>(null);

  // Poster Customization State
  const [posterBrandPrefix, setPosterBrandPrefix] = useState("Grace");
  const [posterBrandHighlight, setPosterBrandHighlight] = useState("Box");
  const [posterHeadlineWhite, setPosterHeadlineWhite] =
    useState("จุดถวายทรัพย์");
  const [posterHeadlineOrange, setPosterHeadlineOrange] = useState("อัตโนมัติ");
  const [posterScanPrompt, setPosterScanPrompt] = useState(
    "สแกน LINE หรือ QR เพื่อเริ่มใช้งาน"
  );
  const [posterQrValue, setPosterQrValue] = useState(defaultStationUrl);
  const [posterCenterBadge, setPosterCenterBadge] = useState("LINE");
  const [posterQrCaption, setPosterQrCaption] = useState("LINE OFFICIAL");
  const [posterFooterWhite, setPosterFooterWhite] = useState("ใจยินดี?");
  const [posterFooterOrange, setPosterFooterOrange] =
    useState("ร่วมถวายได้เลย");
  const [posterFooterSub, setPosterFooterSub] = useState(
    "เปิดรับถวายทุกกองทุน ส่งสลิปให้เหรัญญิกตรวจสอบก่อนบันทึกเข้าบัญชี"
  );
  const [customQrImage, setCustomQrImage] = useState<string | null>(null);
  const qrUploadRef = useRef<HTMLInputElement>(null);
  const posterHasQr = customQrImage !== null || posterQrValue.trim() !== "";

  const effectiveFundId = useMemo(() => {
    if (selectedFundId) return Number(selectedFundId);
    return funds[0]?.id ?? 0;
  }, [selectedFundId, funds]);

  // null when the custom amount is not a usable number.
  const effectiveAmount = useMemo(
    () => resolveAmount(customAmount, amountsByCat[selectedCategory] ?? 300),
    [customAmount, amountsByCat, selectedCategory]
  );

  // A PromptPay QR with the chosen amount, once the donor reaches step 3. Null
  // when the church has not set a PromptPay ID.
  const paymentQrQuery = trpc.church.paymentQr.useQuery(
    { amount: effectiveAmount ?? 1 },
    { enabled: step === 3 && effectiveAmount !== null, retry: false }
  );
  const paymentQr =
    effectiveAmount !== null && paymentQrQuery.data?.amount === effectiveAmount
      ? paymentQrQuery.data
      : null;

  const canRecordDirectly = canManageFinance(user);
  const submitMode = resolveSubmitMode({
    canManageFinance: canRecordDirectly,
    hasSlip: slipPreview !== null,
  });

  const submitSlipMutation = trpc.givingInbox.submitSlip.useMutation({
    onError: err => {
      toast.error(err.message || "ส่งสลิปไม่สำเร็จ");
    },
  });

  const createOfferingMutation = trpc.offerings.create.useMutation({
    onError: err => {
      toast.error(err.message || "บันทึกการถวายไม่สำเร็จ");
    },
  });

  const handleSelectPackage = (cat: OfferingCategory) => {
    if (resolveAmount(customAmount, amountsByCat[cat] ?? 300) === null) {
      toast.error(
        `กรุณาระบุจำนวนเงินที่ถูกต้อง (ไม่เกิน ${MAX_GIVING_AMOUNT.toLocaleString()} บาท)`
      );
      return;
    }
    setSelectedCategory(cat);
    setStep(3);
  };

  const handleSlipFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const input = e.target;
    const file = input.files?.[0];
    // Lets the same file be picked again after an error.
    input.value = "";
    if (!file) return;
    try {
      // Shrinks a large phone photo so it fits the server limit.
      setSlipPreview(await prepareSlipImage(file));
    } catch (err) {
      toast.error(
        err instanceof SlipFileError ? err.message : "แนบรูปสลิปไม่สำเร็จ"
      );
    }
  };

  const handleQrImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target;
    const file = input.files?.[0];
    input.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("กรุณาเลือกไฟล์รูปภาพ QR Code");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setCustomQrImage(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleCopyAccount = async (account: string) => {
    try {
      await navigator.clipboard.writeText(account);
      toast.success("คัดลอกเลขบัญชีแล้ว");
    } catch {
      toast.error("คัดลอกไม่สำเร็จ กรุณาคัดลอกเลขบัญชีด้วยตนเอง");
    }
  };

  const handleConfirmGiving = async () => {
    if (isSubmitting) return;
    if (effectiveAmount === null) {
      toast.error("กรุณาระบุจำนวนเงินที่ต้องการถวาย");
      return;
    }
    if (submitMode === "needs-slip") {
      toast.error("กรุณาแนบรูปสลิปการโอนก่อนยืนยัน");
      return;
    }

    const name = donorName.trim() || undefined;
    let check: StationSubmission["check"] = null;
    let failedAttemptsAfter = failedAttempts;
    try {
      if (submitMode === "slip" && slipPreview) {
        const result = await submitSlipMutation.mutateAsync({
          base64Data: slipPreview,
          amount: effectiveAmount,
          category: selectedCategory,
          fundId: effectiveFundId > 0 ? effectiveFundId : undefined,
          donorName: name,
        });
        check = result.check;
        failedAttemptsAfter = result.failedAttempts;
        setFailedAttempts(result.failedAttempts);
        void utils.givingInbox.invalidate();
      } else {
        await createOfferingMutation.mutateAsync({
          category: selectedCategory,
          amount: effectiveAmount,
          fundId: effectiveFundId > 0 ? effectiveFundId : undefined,
          method: "transfer",
          receiptDate: new Date(),
          donorName: name,
          notes: "ทำรายการผ่านจุดถวายอัตโนมัติ (GraceBox Station)",
        });
        void Promise.all([
          utils.offerings.list.invalidate(),
          utils.finance.summary.invalidate(),
        ]);
      }
    } catch {
      // The mutation's onError already showed the reason. Stay on this step.
      return;
    }

    setSubmission({
      mode: submitMode,
      category: selectedCategory,
      amount: effectiveAmount,
      check,
      failedAttempts:
        check?.state === "rejected" ? failedAttemptsAfter : undefined,
    });
    if (check?.state === "rejected") {
      // Keep the slip so the donor can send it again with the right amount.
      toast.error(check.message);
    } else {
      setSlipPreview(null);
      toast.success("ส่งข้อมูลการถวายเรียบร้อยแล้ว");
    }
    setStep(4);
  };

  /** After a mismatch: keep the slip and use the amount printed on it. */
  const retryWithSlipAmount = (amount: number) => {
    setCustomAmount(String(amount));
    setSubmission(null);
    setStep(3);
  };

  /** After a mismatch: pick another slip image for the same amount. */
  const retryWithOtherSlip = () => {
    setSlipPreview(null);
    setSubmission(null);
    setStep(3);
  };

  const handleCountdownExpire = () => {
    // Never wipe the form while a submission is on its way to the server.
    if (isSubmitting) return;
    toast.info("หมดเวลาทำรายการ กรุณาเริ่มใหม่อีกครั้ง");
    resetFlow();
  };

  const resetFlow = () => {
    setTransferState("not_yet");
    setSlipPreview(null);
    setCustomAmount("");
    setSubmission(null);
    setStep(1);
  };

  const checklist = buildSendChecklist({
    category: selectedCategory,
    amount: effectiveAmount,
    donorName,
    hasSlip: slipPreview !== null,
    slipOptional: canRecordDirectly,
  });
  const attemptsNote = failedAttemptsNote(failedAttempts);

  const isSubmitting =
    submitSlipMutation.isPending || createOfferingMutation.isPending;

  // Step 4 is only valid after a saved submission.
  const shownStep: FlowStep = step === 4 && !submission ? 1 : step;

  const updatedStamp = useMemo(
    () => `อัปเดตล่าสุด ${formatThaiDateTime(new Date())}`,
    [step]
  );

  const body = (
    <div className="space-y-6">
      {/* ── Mode Switcher Bar (Hidden when printing poster) ── */}
      <div
        className={`rounded-2xl p-2 border flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 print:hidden ${
          stationOnly
            ? "bg-white/5 border-white/10"
            : "bg-white border-line shadow-2xs"
        }`}
      >
        {!stationOnly && (
          <div className="grid grid-cols-2 gap-1.5 flex-1">
            <button
              type="button"
              onClick={() => setActiveTab("flow")}
              className={`min-h-11 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                activeTab === "flow"
                  ? "bg-[#18120E] text-[#F97316] shadow-sm"
                  : "text-ink-2 hover:bg-paper"
              }`}
            >
              <Smartphone className="w-4 h-4" />
              <span>1. หน้าเว็บถวายอัตโนมัติ (Mobile Flow)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("poster")}
              className={`min-h-11 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                activeTab === "poster"
                  ? "bg-[#F97316] text-white shadow-sm"
                  : "text-ink-2 hover:bg-paper"
              }`}
            >
              <QrCode className="w-4 h-4" />
              <span>
                2. โปสเตอร์ป้าย QR ติดหน้าห้อง (1 สแกน ➔ 2 เลือกประเภท ➔ 3
                โอน/สลิป ➔ 4 ขอบคุณพระเจ้า)
              </span>
            </button>
          </div>
        )}

        {activeTab === "flow" && (
          <ol
            aria-label="ขั้นตอนการถวาย"
            className="flex items-center justify-center gap-1.5 px-2 py-1"
          >
            {([1, 2, 3, 4] as FlowStep[]).map(n => (
              <li
                key={n}
                aria-current={shownStep === n ? "step" : undefined}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                  shownStep === n
                    ? "bg-[#F97316] text-white"
                    : stationOnly
                      ? "bg-white/10 text-stone-300"
                      : "bg-paper text-ink-3"
                }`}
              >
                ขั้นที่ {n}
              </li>
            ))}
          </ol>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
            TAB 1: INTERACTIVE MOBILE FLOW (Adapted from JamBox Screens 1, 2, 3)
           ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "flow" && (
        <div className="max-w-md mx-auto">
          {/* Dark Mobile Station Shell */}
          <div className="rounded-[36px] bg-gradient-to-b from-[#231914] via-[#140F0D] to-[#0B0D13] p-5 sm:p-7 text-white shadow-2xl border border-[#3B2A20] space-y-6 relative overflow-hidden">
            {/* Top Bar: TH Language Pill & Step Back Button */}
            <div className="flex items-center justify-between">
              {shownStep > 1 && shownStep < 4 ? (
                <button
                  type="button"
                  onClick={() =>
                    setStep(prev => (prev > 1 ? ((prev - 1) as FlowStep) : 1))
                  }
                  className="w-11 h-11 rounded-full bg-white/8 hover:bg-white/15 border border-white/15 flex items-center justify-center text-white transition-colors cursor-pointer"
                  title="ย้อนกลับ"
                  aria-label="ย้อนกลับ"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
              ) : (
                <div className="w-11 h-11" />
              )}

              <div className="w-11 h-11 rounded-full bg-[#241B16] border border-white/15 flex items-center justify-center text-xs font-extrabold text-white tracking-wider">
                TH
              </div>
            </div>

            {/* A 5-minute timer for choosing. It is not on step 3, where a donor
                may be in a bank app paying. Expiry clears the form. */}
            {shownStep === 2 && (
              <StationCountdownCard
                initialSeconds={300}
                label="เวลาทำรายการคงเหลือ"
                onExpire={handleCountdownExpire}
              />
            )}

            {/* ── STEP 1: Landing / Status / Give Now (Adapted from Image 2) ── */}
            {shownStep === 1 && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div className="text-center -mt-4">
                  <StationCubeLogo
                    brandTitle="GraceBox"
                    subtitle="AUTOMATED CHURCH GIVING STATION"
                  />
                </div>

                {/* Station Breadcrumb */}
                <div className="text-xs sm:text-sm font-extrabold tracking-[0.2em] text-stone-300 uppercase text-center sm:text-left">
                  GRACEBOX STATION{" "}
                  <span className="text-stone-500 mx-1">/</span>{" "}
                  {churchQuery.data?.name || "SANCTUARY SPACE"}
                </div>

                {/* Donor Profile Card */}
                <StationProfileCard
                  userName={user?.name || donorName || "ผู้ถวายด้วยใจยินดี"}
                  avatarUrl={user?.avatarUrl}
                  metricLabel="สถานะผู้ถวาย"
                  metricValue={getChurchRoleInfo(user?.churchRole).label}
                />

                {/* Room / Station Availability Card */}
                <StationStatusCard
                  label="สถานะจุดถวาย"
                  statusBadgeText={
                    stationReady ? "พร้อมรับถวาย" : "ระบบไม่พร้อม"
                  }
                  statusDetail={
                    stationReady
                      ? "ส่งสลิปการถวายให้เหรัญญิกตรวจสอบได้ทุกเวลา"
                      : "โหลดข้อมูลคริสตจักรไม่สำเร็จ กรุณาลองใหม่ภายหลัง"
                  }
                  isAvailable={stationReady}
                />

                {/* Big Orange Gradient CTA (Jam Now -> Give Now) */}
                <StationHeroCTA
                  eyebrow="เริ่มใช้งาน"
                  headline="พร้อมถวายทรัพย์เลยไหม?"
                  buttonTitle="Give Now"
                  buttonSubtitle="เริ่มถวายทันที"
                  helperText="ถ้าต้องการถวายเจาะจงกองทุน กดเพื่อเลือกหมวดหมู่ · ทำรายการได้ทันที"
                  onClick={() =>
                    stationReady
                      ? setStep(2)
                      : toast.error(
                          "ระบบยังไม่พร้อมรับถวาย กรุณาลองใหม่ภายหลัง"
                        )
                  }
                />

                <MySlipHistory
                  items={mySlipsQuery.data}
                  loading={mySlipsQuery.isLoading}
                />
              </div>
            )}

            {/* ── STEP 2: Countdown + Offering Packages (Adapted from Image 3) ── */}
            {shownStep === 2 && (
              <div className="space-y-4 animate-in fade-in duration-200">
                <div className="text-base font-extrabold text-white tracking-tight px-1">
                  GraceBox Station · {churchQuery.data?.name || "Sanctuary"}
                </div>

                {/* Selection Status Card */}
                <StationStepStatusCard
                  eyebrow="สถานะการเข้าใช้งาน"
                  title="เลือกประเภทและยอดถวายที่ต้องการ"
                  updatedAtText={updatedStamp}
                />

                {/* Fund Selector & Custom Amount Box */}
                <div className="rounded-3xl bg-[#0D1017] border border-white/10 p-4 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label
                        htmlFor="station-fund"
                        className="text-xs font-bold text-[#FDBA74] block"
                      >
                        เข้ากองทุนคริสตจักร
                      </label>
                      <select
                        id="station-fund"
                        value={selectedFundId}
                        onChange={e => setSelectedFundId(e.target.value)}
                        className="w-full min-h-10 rounded-xl bg-[#161B26] border border-white/15 px-3 py-2 text-xs font-bold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2DD4BF]"
                      >
                        {funds.length === 0 ? (
                          <option value="">กองทุนทั่วไปของคริสตจักร</option>
                        ) : (
                          funds.map(f => (
                            <option key={f.id} value={f.id}>
                              {f.name}
                            </option>
                          ))
                        )}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label
                        htmlFor="station-custom-amount"
                        className="text-xs font-bold text-[#FDBA74] block"
                      >
                        หรือระบุยอดเอง (THB)
                      </label>
                      <input
                        id="station-custom-amount"
                        type="number"
                        min="1"
                        max={MAX_GIVING_AMOUNT}
                        inputMode="decimal"
                        placeholder="ระบุจำนวนเงินบาท..."
                        value={customAmount}
                        onChange={e => setCustomAmount(e.target.value)}
                        className="w-full min-h-10 rounded-xl bg-[#161B26] border border-white/15 px-3 py-2 text-xs font-bold text-white placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2DD4BF]"
                      />
                    </div>
                  </div>
                </div>

                {/* Offering Package Cards (1 hr / 320 THB style) */}
                <div className="space-y-3.5 max-h-[540px] overflow-y-auto pr-1">
                  {OFFERING_CATEGORIES.map(cat => {
                    const currentCatAmount =
                      resolveAmount(
                        customAmount,
                        amountsByCat[cat.id] ?? 300
                      ) ??
                      amountsByCat[cat.id] ??
                      300;

                    return (
                      <StationOfferingPackageCard
                        key={cat.id}
                        title={cat.label}
                        subtitle="พร้อมเริ่มทำรายการและส่งสลิปได้ทันที"
                        amountThb={currentCatAmount}
                        presetAmounts={PRESET_CHOICES[cat.id]}
                        onSelectAmount={amt => {
                          setCustomAmount("");
                          setAmountsByCat(prev => ({
                            ...prev,
                            [cat.id]: amt,
                          }));
                        }}
                        ctaLabel="ดูสรุปการถวาย"
                        selected={selectedCategory === cat.id}
                        onSelect={() => handleSelectPackage(cat.id)}
                      />
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── STEP 3: Confirm & Unlock / Submit Slip (Adapted from Image 1) ── */}
            {shownStep === 3 && (
              <div className="space-y-5 animate-in fade-in duration-200">
                {/* Summary Pill */}
                <div className="rounded-3xl bg-[#1A1412] border border-white/12 p-5 space-y-3">
                  <div className="flex items-center justify-between text-xs font-bold text-[#FDBA74]">
                    <span>สรุปรายการถวายทรัพย์</span>
                    <button
                      type="button"
                      onClick={() => setStep(2)}
                      className="underline hover:text-white cursor-pointer"
                    >
                      เปลี่ยนประเภท/ยอด
                    </button>
                  </div>

                  <div className="flex items-baseline justify-between gap-2">
                    <div>
                      <div className="text-xl font-extrabold text-white">
                        {offeringCategoryLabel(selectedCategory)}
                      </div>
                      <div className="text-xs text-stone-400">
                        กองทุน:{" "}
                        {funds.find(f => f.id === effectiveFundId)?.name ||
                          "กองทุนหลักคริสตจักร"}
                      </div>
                    </div>
                    <div className="text-2xl font-black text-[#34D399] tabular-nums">
                      {effectiveAmount === null
                        ? "—"
                        : `${effectiveAmount.toLocaleString()} THB`}
                    </div>
                  </div>
                </div>

                {/* Has the donor paid yet? */}
                <section
                  aria-label="สถานะการโอนเงิน"
                  className="rounded-3xl bg-[#1A1412] border border-white/12 p-4 space-y-3"
                >
                  <h3 className="text-xs font-bold text-[#FDBA74]">
                    โอนเงินแล้วหรือยัง?
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    {(
                      [
                        ["not_yet", "ยังไม่ได้โอน"],
                        ["done", "โอนแล้ว"],
                      ] as const
                    ).map(([value, label]) => (
                      <button
                        key={value}
                        type="button"
                        aria-pressed={transferState === value}
                        onClick={() => setTransferState(value)}
                        className={`min-h-11 rounded-2xl border text-sm font-bold cursor-pointer focus-visible:ring-2 focus-visible:ring-[#2DD4BF] ${
                          transferState === value
                            ? "border-[#2DD4BF] bg-[#14B8A6]/20 text-[#5EEAD4]"
                            : "border-white/15 bg-white/5 text-stone-300 hover:bg-white/10"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-stone-400 leading-relaxed">
                    {transferState === "not_yet"
                      ? "โอนตามบัญชีหรือ QR ด้านล่าง แล้วกลับมาที่หน้านี้เพื่อแนบสลิปยืนยันยอด"
                      : "แนบสลิปและตรวจรายการด้านล่างเพื่อยืนยันยอดที่โอน"}
                  </p>
                </section>

                {transferState === "not_yet" && (
                  <>
                    {payee ? (
                      <section
                        aria-label="บัญชีรับถวาย"
                        className="rounded-3xl bg-[#1A1412] border border-white/12 p-4 flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="space-y-0.5 min-w-0">
                          <div className="text-stone-400">
                            {payee.bankName || "บัญชีธนาคารคริสตจักร"}
                          </div>
                          <div className="font-mono font-bold text-base text-white break-all">
                            {payee.bankAccount}
                          </div>
                          {payee.bankAccountName && (
                            <div className="text-stone-400">
                              {payee.bankAccountName}
                            </div>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            void handleCopyAccount(payee.bankAccount)
                          }
                          className="shrink-0 min-h-11 px-3 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-bold text-white inline-flex items-center gap-1 cursor-pointer focus-visible:ring-2 focus-visible:ring-[#2DD4BF]"
                        >
                          <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>คัดลอก</span>
                        </button>
                      </section>
                    ) : (
                      !paymentQr &&
                      !payeeQuery.isLoading && (
                        <p className="rounded-3xl bg-[#1A1412] border border-white/12 p-4 text-xs text-stone-400 leading-relaxed">
                          คริสตจักรยังไม่ได้ตั้งค่าบัญชีรับถวายในระบบ
                          กรุณาสอบถามเจ้าหน้าที่ แล้วกลับมาแนบสลิป
                        </p>
                      )
                    )}

                    {paymentQr && (
                      <PromptPayQrCard
                        payload={paymentQr.payload}
                        amount={paymentQr.amount}
                        payeeName={paymentQr.payeeName}
                      />
                    )}
                  </>
                )}

                {attemptsNote && (
                  <p
                    role="status"
                    className="rounded-2xl border border-amber-400/40 bg-amber-500/10 p-3 text-xs text-amber-200 leading-relaxed"
                  >
                    {attemptsNote}
                  </p>
                )}

                {/* Unlock / Confirm Modal Card (Adapted directly from Image 1) */}
                <StationUnlockConfirmCard
                  title="พร้อมยืนยันการถวายแล้วหรือยัง?"
                  description={
                    submitMode === "ledger"
                      ? "ไม่ได้แนบสลิป ระบบจะบันทึกรายการถวายเข้าบัญชีทันทีในนามเจ้าหน้าที่การเงิน"
                      : "เมื่อโอนเงินและแนบสลิปเรียบร้อยแล้ว กดปุ่มด้านล่างเพื่อส่งสลิป เหรัญญิกจะตรวจสอบก่อนบันทึกเข้าบัญชี"
                  }
                  buttonLabel={
                    submitMode === "ledger"
                      ? "บันทึกรายการถวายเข้าบัญชี"
                      : "ยืนยันและส่งสลิปถวาย"
                  }
                  loading={isSubmitting}
                  disabled={
                    submitMode === "needs-slip" ||
                    effectiveAmount === null ||
                    !canSend(checklist)
                  }
                  onConfirm={() => void handleConfirmGiving()}
                >
                  <div className="space-y-3 my-2">
                    {/* Donor Name Input */}
                    <div className="space-y-1">
                      <label
                        htmlFor="station-donor-name"
                        className="text-xs font-bold text-stone-300 block"
                      >
                        ชื่อผู้ถวาย (ไม่ระบุเพื่อถวายนิรนามได้)
                      </label>
                      <input
                        id="station-donor-name"
                        type="text"
                        maxLength={120}
                        value={donorName}
                        onChange={e => setDonorNameInput(e.target.value)}
                        placeholder="เช่น สมชาย สุขใจ หรือ ผู้ถวายนิรนาม"
                        className="w-full rounded-2xl bg-black/40 border border-white/15 px-3.5 py-2.5 text-sm text-white placeholder:text-stone-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#34D399]"
                      />
                    </div>

                    {/* Optional Slip Image Dropzone */}
                    <div>
                      <input
                        ref={slipInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        aria-label="รูปสลิปการโอน"
                        onChange={e => void handleSlipFileChange(e)}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => slipInputRef.current?.click()}
                        className="w-full rounded-2xl border border-dashed border-white/20 hover:border-[#34D399] bg-black/30 p-3.5 text-center transition-colors cursor-pointer flex items-center justify-center gap-2.5"
                      >
                        <UploadCloud className="w-5 h-5 text-[#34D399] shrink-0" />
                        <span className="text-xs font-bold text-stone-200">
                          {slipPreview
                            ? "เปลี่ยนรูปสลิปที่แนบไว้"
                            : canRecordDirectly
                              ? "แตะเพื่อแนบรูปสลิปการโอน (ถ้ามี)"
                              : "แตะเพื่อแนบรูปสลิปการโอน (จำเป็น)"}
                        </span>
                      </button>
                      {slipPreview && (
                        <div className="mt-2 flex justify-center">
                          <img
                            src={slipPreview}
                            alt="สลิปที่แนบ"
                            className="max-h-32 rounded-xl border border-white/15 object-contain"
                          />
                        </div>
                      )}
                    </div>

                    <SendChecklist items={checklist} />
                  </div>
                </StationUnlockConfirmCard>
              </div>
            )}

            {/* ── STEP 4: Completed State ── */}
            {shownStep === 4 &&
              submission &&
              (() => {
                const outcome = describeOutcome(submission);
                const toneStyle =
                  outcome.tone === "success"
                    ? "bg-[#10B981]/20 border-[#34D399] text-[#34D399]"
                    : outcome.tone === "warning"
                      ? "bg-amber-500/20 border-amber-400 text-amber-300"
                      : "bg-rose-500/20 border-rose-400 text-rose-300";
                const Icon =
                  outcome.tone === "success" ? CheckCircle2 : AlertTriangle;
                const slipAmount = outcome.slipAmount;
                return (
                  <div
                    role={outcome.tone === "error" ? "alert" : "status"}
                    className="rounded-[32px] bg-[#1C1613] border border-[#3E2E25] p-7 text-center space-y-5 animate-in zoom-in-95 duration-200"
                  >
                    <div
                      className={`w-16 h-16 rounded-full border-2 mx-auto flex items-center justify-center ${toneStyle}`}
                    >
                      <Icon className="w-9 h-9" aria-hidden="true" />
                    </div>

                    <div className="space-y-1.5">
                      <h3 className="text-2xl font-extrabold text-white">
                        {outcome.title}
                      </h3>
                      <p className="text-xs sm:text-sm text-stone-300 leading-relaxed">
                        {outcome.message}
                      </p>
                    </div>

                    <div className="flex flex-col gap-2.5 pt-2">
                      {outcome.canRetry ? (
                        <>
                          {slipAmount !== null && (
                            <button
                              type="button"
                              onClick={() => retryWithSlipAmount(slipAmount)}
                              className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#F97316] to-[#EA580C] text-white font-extrabold text-sm shadow-md cursor-pointer focus-visible:ring-2 focus-visible:ring-white"
                            >
                              ใช้ยอด {slipAmount.toLocaleString()} THB
                              ตามสลิปแล้วส่งใหม่
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={retryWithOtherSlip}
                            className="w-full py-3 rounded-2xl bg-white/8 hover:bg-white/15 text-stone-200 font-bold text-xs cursor-pointer focus-visible:ring-2 focus-visible:ring-[#2DD4BF]"
                          >
                            เปลี่ยนรูปสลิป (ยอดเดิม{" "}
                            {submission.amount.toLocaleString()} THB)
                          </button>
                          <button
                            type="button"
                            onClick={resetFlow}
                            className="w-full py-3 rounded-2xl bg-white/8 hover:bg-white/15 text-stone-200 font-bold text-xs cursor-pointer focus-visible:ring-2 focus-visible:ring-[#2DD4BF]"
                          >
                            เริ่มใหม่ทั้งหมด
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={resetFlow}
                          className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#F97316] to-[#EA580C] text-white font-extrabold text-sm shadow-md cursor-pointer focus-visible:ring-2 focus-visible:ring-white"
                        >
                          ทำรายการถวายใหม่อีกครั้ง
                        </button>
                      )}
                      {canRecordDirectly && !outcome.canRetry && (
                        <button
                          type="button"
                          onClick={() => setLocation("/offerings")}
                          className="w-full py-3 rounded-2xl bg-white/8 hover:bg-white/15 text-stone-200 font-bold text-xs cursor-pointer focus-visible:ring-2 focus-visible:ring-[#2DD4BF]"
                        >
                          ดูรายการสมุดบัญชีเงินถวาย
                        </button>
                      )}
                    </div>
                  </div>
                );
              })()}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
            TAB 2: PRINTABLE QR STANDEE POSTER (Adapted from Image 4)
           ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "poster" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Poster Customizer (Hidden when printing) */}
          <div className="lg:col-span-5 bg-white rounded-2xl border border-line p-6 space-y-5 shadow-xs print:hidden">
            <div className="flex items-center justify-between border-b border-line pb-4">
              <div>
                <h3 className="text-base font-bold text-ink flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#F97316]" />
                  <span>ปรับแต่งป้าย QR Code หน้าห้อง</span>
                </h3>
                <p className="text-xs text-ink-3 mt-0.5">
                  แก้ไขข้อความ ลิงก์ QR หรืออัปโหลดรูป QR LINE /
                  พร้อมเพย์จริงเพื่อพิมพ์ติดหน้าห้อง
                </p>
              </div>
            </div>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label
                    htmlFor="poster-posterBrandPrefix"
                    className="font-bold text-ink-2 block"
                  >
                    ชื่อแบรนด์ (สีขาว)
                  </label>
                  <input
                    id="poster-posterBrandPrefix"
                    type="text"
                    value={posterBrandPrefix}
                    onChange={e => setPosterBrandPrefix(e.target.value)}
                    className="w-full rounded-xl border border-line px-3 py-2 font-bold text-ink"
                  />
                </div>
                <div className="space-y-1">
                  <label
                    htmlFor="poster-posterBrandHighlight"
                    className="font-bold text-ink-2 block"
                  >
                    ชื่อแบรนด์ (สีส้ม)
                  </label>
                  <input
                    id="poster-posterBrandHighlight"
                    type="text"
                    value={posterBrandHighlight}
                    onChange={e => setPosterBrandHighlight(e.target.value)}
                    className="w-full rounded-xl border border-line px-3 py-2 font-bold text-[#EA580C]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label
                    htmlFor="poster-posterHeadlineWhite"
                    className="font-bold text-ink-2 block"
                  >
                    หัวข้อหลัก (สีขาว)
                  </label>
                  <input
                    id="poster-posterHeadlineWhite"
                    type="text"
                    value={posterHeadlineWhite}
                    onChange={e => setPosterHeadlineWhite(e.target.value)}
                    className="w-full rounded-xl border border-line px-3 py-2 font-bold text-ink"
                  />
                </div>
                <div className="space-y-1">
                  <label
                    htmlFor="poster-posterHeadlineOrange"
                    className="font-bold text-ink-2 block"
                  >
                    หัวข้อเน้น (สีส้ม)
                  </label>
                  <input
                    id="poster-posterHeadlineOrange"
                    type="text"
                    value={posterHeadlineOrange}
                    onChange={e => setPosterHeadlineOrange(e.target.value)}
                    className="w-full rounded-xl border border-line px-3 py-2 font-bold text-[#EA580C]"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="poster-posterScanPrompt"
                  className="font-bold text-ink-2 block"
                >
                  ข้อความเหนือ QR Code
                </label>
                <input
                  id="poster-posterScanPrompt"
                  type="text"
                  value={posterScanPrompt}
                  onChange={e => setPosterScanPrompt(e.target.value)}
                  className="w-full rounded-xl border border-line px-3 py-2 font-semibold text-ink"
                />
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="poster-posterQrValue"
                  className="font-bold text-ink-2 block"
                >
                  ลิงก์สำหรับสร้าง QR Code (เช่น ลิงก์ LINE OA หรือหน้าถวาย)
                </label>
                <input
                  id="poster-posterQrValue"
                  type="text"
                  value={posterQrValue}
                  maxLength={500}
                  onChange={e => setPosterQrValue(e.target.value)}
                  className="w-full rounded-xl border border-line px-3 py-2 font-mono text-xs text-ink"
                />
              </div>

              {/* Upload Custom QR Image */}
              <div className="space-y-1.5">
                <span
                  id="poster-qr-image-label"
                  className="font-bold text-ink-2 block"
                >
                  หรืออัปโหลดรูป QR จริง (LINE Official / PromptPay)
                </span>
                <input
                  ref={qrUploadRef}
                  type="file"
                  accept="image/*"
                  aria-labelledby="poster-qr-image-label"
                  onChange={handleQrImageUpload}
                  className="hidden"
                />
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => qrUploadRef.current?.click()}
                    aria-describedby="poster-qr-image-label"
                    className="flex-1 py-2.5 px-3 rounded-xl border border-dashed border-brand bg-paper hover:bg-paper-2 text-brand font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <ImageIcon className="w-4 h-4" />
                    <span>
                      {customQrImage
                        ? "เปลี่ยนรูป QR Code"
                        : "เลือกรูป QR จากเครื่อง"}
                    </span>
                  </button>
                  {customQrImage && (
                    <button
                      type="button"
                      onClick={() => setCustomQrImage(null)}
                      className="px-3 py-2.5 rounded-xl border border-line text-danger font-bold hover:bg-rose-50 cursor-pointer"
                    >
                      ใช้ QR อัตโนมัติ
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label
                    htmlFor="poster-posterCenterBadge"
                    className="font-bold text-ink-2 block"
                  >
                    ป้ายตรงกลาง QR
                  </label>
                  <input
                    id="poster-posterCenterBadge"
                    type="text"
                    value={posterCenterBadge}
                    onChange={e => setPosterCenterBadge(e.target.value)}
                    className="w-full rounded-xl border border-line px-3 py-2 font-bold text-ink"
                  />
                </div>
                <div className="space-y-1">
                  <label
                    htmlFor="poster-posterQrCaption"
                    className="font-bold text-ink-2 block"
                  >
                    ข้อความใต้กรอบ QR
                  </label>
                  <input
                    id="poster-posterQrCaption"
                    type="text"
                    value={posterQrCaption}
                    onChange={e => setPosterQrCaption(e.target.value)}
                    className="w-full rounded-xl border border-line px-3 py-2 font-bold text-ink"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label
                    htmlFor="poster-posterFooterWhite"
                    className="font-bold text-ink-2 block"
                  >
                    ข้อความท้ายป้าย (ขาว)
                  </label>
                  <input
                    id="poster-posterFooterWhite"
                    type="text"
                    value={posterFooterWhite}
                    onChange={e => setPosterFooterWhite(e.target.value)}
                    className="w-full rounded-xl border border-line px-3 py-2 font-bold text-ink"
                  />
                </div>
                <div className="space-y-1">
                  <label
                    htmlFor="poster-posterFooterOrange"
                    className="font-bold text-ink-2 block"
                  >
                    ข้อความท้ายป้าย (ส้ม)
                  </label>
                  <input
                    id="poster-posterFooterOrange"
                    type="text"
                    value={posterFooterOrange}
                    onChange={e => setPosterFooterOrange(e.target.value)}
                    className="w-full rounded-xl border border-line px-3 py-2 font-bold text-[#EA580C]"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="poster-posterFooterSub"
                  className="font-bold text-ink-2 block"
                >
                  คำอธิบายบรรทัดล่างสุด
                </label>
                <input
                  id="poster-posterFooterSub"
                  type="text"
                  value={posterFooterSub}
                  onChange={e => setPosterFooterSub(e.target.value)}
                  className="w-full rounded-xl border border-line px-3 py-2 font-semibold text-ink"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-line flex flex-col sm:flex-row gap-2.5">
              <button
                type="button"
                onClick={() => window.print()}
                disabled={!posterHasQr}
                title={
                  posterHasQr
                    ? undefined
                    : "ใส่ลิงก์หรืออัปโหลดรูป QR Code ก่อนพิมพ์"
                }
                className="flex-1 py-3 px-4 rounded-xl bg-[#F97316] hover:bg-[#EA580C] disabled:opacity-50 disabled:cursor-not-allowed text-white font-extrabold text-sm shadow-sm flex items-center justify-center gap-2 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>พิมพ์โปสเตอร์ป้าย QR (A4)</span>
              </button>
            </div>
          </div>

          {/* Right Column: Live Poster Preview (Full width on print) */}
          <div className="lg:col-span-7 flex flex-col items-center justify-center">
            <StationQrPoster
              brandPrefix={posterBrandPrefix}
              brandHighlight={posterBrandHighlight}
              headlineWhite={posterHeadlineWhite}
              headlineOrange={posterHeadlineOrange}
              scanPrompt={posterScanPrompt}
              qrValue={posterQrValue}
              customQrImageUrl={customQrImage}
              qrCenterBadge={posterCenterBadge}
              qrCaption={posterQrCaption}
              footerLeadWhite={posterFooterWhite}
              footerLeadOrange={posterFooterOrange}
              footerSubtext={posterFooterSub}
              churchName={churchQuery.data?.name}
            />
          </div>
        </div>
      )}
    </div>
  );

  if (stationOnly) {
    return (
      <StationOnlyFrame
        churchName={churchQuery.data?.name}
        userName={user?.name}
        onLogout={() => void logout()}
      >
        {body}
      </StationOnlyFrame>
    );
  }

  return (
    <AppLayout
      activeRoute="/offerings"
      hideHeaderOnPrint
      eyebrow="GraceBox Station"
      title="จุดถวายทรัพย์อัตโนมัติ & ป้าย QR"
      subtitle="ระบบถวายทรัพย์บริการตนเองสไตล์โมเดิร์น (สแกน -> เลือกยอด -> โอน/แนบสลิป -> ยืนยัน) พร้อมป้าย QR สำหรับพิมพ์ติดหน้าห้อง"
      action={
        <div className="flex flex-wrap items-center gap-2 print:hidden">
          <button
            type="button"
            onClick={() => setLocation("/offerings")}
            className="px-3.5 py-2 rounded-2xl bg-white border border-line text-ink-2 hover:bg-paper-2 text-xs font-bold transition-all flex items-center gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>กลับหน้าถวายทรัพย์</span>
          </button>
          <button
            type="button"
            onClick={() =>
              setActiveTab(activeTab === "flow" ? "poster" : "flow")
            }
            className="px-4 py-2 rounded-xl bg-brand hover:bg-brand-ink text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            {activeTab === "flow" ? (
              <>
                <QrCode className="w-4 h-4" />
                <span>ดูโปสเตอร์ป้าย QR หน้าห้อง</span>
              </>
            ) : (
              <>
                <Smartphone className="w-4 h-4" />
                <span>เปิดหน้าแอปถวายอัตโนมัติ</span>
              </>
            )}
          </button>
        </div>
      }
    >
      {body}
    </AppLayout>
  );
}

const SLIP_STATE_STYLE: Record<DonorSlipState, { label: string; cls: string }> =
  {
    checking: { label: "กำลังตรวจสอบ", cls: "bg-white/10 text-stone-200" },
    verified: {
      label: "ยอดตรง รอเหรัญญิก",
      cls: "bg-emerald-500/20 text-emerald-300",
    },
    in_review: { label: "รอเหรัญญิก", cls: "bg-amber-500/20 text-amber-300" },
    rejected: { label: "ไม่ผ่าน", cls: "bg-rose-500/20 text-rose-300" },
    duplicate: { label: "สลิปซ้ำ", cls: "bg-amber-500/20 text-amber-300" },
    approved: {
      label: "บันทึกแล้ว",
      cls: "bg-emerald-500/20 text-emerald-300",
    },
  };

/** The donor's own recent slips and what became of each. */
function MySlipHistory({
  items,
  loading,
}: {
  items:
    | Array<{
        id: number;
        createdAt: Date | string;
        declaredAmount: number | null;
        declaredCategory: string | null;
        check: DonorSlipStatus;
      }>
    | undefined;
  loading: boolean;
}) {
  if (loading || !items || items.length === 0) return null;
  return (
    <section
      aria-label="รายการถวายล่าสุดของฉัน"
      className="rounded-3xl bg-[#0D1017] border border-white/10 p-4 space-y-2.5"
    >
      <h3 className="text-xs font-bold text-[#FDBA74]">
        รายการที่ส่งสลิปล่าสุดของฉัน
      </h3>
      <ul className="space-y-2">
        {items.slice(0, 5).map(item => {
          const style = SLIP_STATE_STYLE[item.check.state];
          return (
            <li
              key={item.id}
              className="flex items-center justify-between gap-3 text-xs"
            >
              <div className="min-w-0">
                <div className="font-bold text-white truncate">
                  {item.declaredCategory
                    ? offeringCategoryLabel(item.declaredCategory)
                    : "ถวาย"}
                  {item.declaredAmount !== null &&
                    ` · ${item.declaredAmount.toLocaleString()} THB`}
                </div>
                <div className="text-stone-400">
                  {formatThaiDateTime(new Date(item.createdAt))}
                </div>
              </div>
              <span
                className={`shrink-0 rounded-full px-2.5 py-1 font-bold ${style.cls}`}
              >
                {style.label}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** What will be sent and what is missing, shown before every send. */
function SendChecklist({ items }: { items: ChecklistItem[] }) {
  return (
    <section
      aria-label="ตรวจรายการก่อนส่ง"
      className="rounded-2xl bg-black/30 border border-white/10 p-3 space-y-2"
    >
      <h4 className="text-xs font-bold text-stone-300">ตรวจรายการก่อนส่ง</h4>
      <ul className="space-y-1.5">
        {items.map(item => (
          <li key={item.id} className="flex items-start gap-2 text-xs">
            {item.ok ? (
              <CheckCircle2
                className="mt-0.5 size-4 shrink-0 text-[#34D399]"
                aria-label="ผ่าน"
              />
            ) : (
              <AlertTriangle
                className="mt-0.5 size-4 shrink-0 text-amber-300"
                aria-label="ยังไม่ผ่าน"
              />
            )}
            <div className="min-w-0">
              <span className="font-bold text-stone-200">{item.label}: </span>
              <span className={item.ok ? "text-stone-300" : "text-amber-200"}>
                {item.detail}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
