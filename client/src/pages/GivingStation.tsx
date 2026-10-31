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
import { canManageFinance } from "@shared/roles";
import { formatThaiDateTime } from "@/lib/format";
import {
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

export default function GivingStation() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const utils = trpc.useUtils();

  const [activeTab, setActiveTab] = useState<StationTab>("flow");
  const [step, setStep] = useState<FlowStep>(1);

  // Queries
  const churchQuery = trpc.church.getProfile.useQuery(undefined, {
    retry: false,
  });
  const fundOptionsQuery = trpc.finance.fundOptions.useQuery(undefined, {
    retry: false,
  });
  const funds = fundOptionsQuery.data ?? [];

  // Flow State
  const [selectedCategory, setSelectedCategory] =
    useState<OfferingCategory>("general");
  const [amountsByCat, setAmountsByCat] =
    useState<Record<OfferingCategory, number>>(DEFAULT_AMOUNTS);
  const [customAmount, setCustomAmount] = useState<string>("");
  const [selectedFundId, setSelectedFundId] = useState<string>("");
  const [donorName, setDonorName] = useState<string>(user?.name ?? "");
  const [notes, setNotes] = useState<string>("");
  const [slipPreview, setSlipPreview] = useState<string | null>(null);
  const slipInputRef = useRef<HTMLInputElement>(null);

  // Poster Customization State
  const defaultStationUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/giving/station`
      : "https://graceful-giving.vercel.app/giving/station";
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
    "เปิดรับถวายทุกกองทุน ส่งสลิปตรวจสอบอัตโนมัติทันที"
  );
  const [customQrImage, setCustomQrImage] = useState<string | null>(null);
  const qrUploadRef = useRef<HTMLInputElement>(null);

  const effectiveFundId = useMemo(() => {
    if (selectedFundId) return Number(selectedFundId);
    return funds[0]?.id ?? 0;
  }, [selectedFundId, funds]);

  const effectiveAmount = useMemo(() => {
    const parsedCustom = Number(customAmount);
    if (customAmount.trim() !== "" && parsedCustom > 0) {
      return parsedCustom;
    }
    return amountsByCat[selectedCategory] ?? 300;
  }, [customAmount, amountsByCat, selectedCategory]);

  const canRecordDirectly = canManageFinance(user);

  const uploadSlipMutation = trpc.givingInbox.uploadSlip.useMutation({
    onSuccess: () => {
      void utils.givingInbox.invalidate();
      toast.success("ส่งสลิปถวายสำเร็จ! AI กำลังตรวจสอบข้อมูล");
      setStep(4);
    },
    onError: err => {
      toast.error(err.message || "อัปโหลดสลิปไม่สำเร็จ");
    },
  });

  const createOfferingMutation = trpc.offerings.create.useMutation({
    onSuccess: () => {
      void Promise.all([
        utils.offerings.list.invalidate(),
        utils.finance.summary.invalidate(),
      ]);
      toast.success("บันทึกรายการถวายเรียบร้อยแล้ว");
      setStep(4);
    },
    onError: err => {
      toast.error(err.message || "บันทึกการถวายไม่สำเร็จ");
    },
  });

  const handleSelectPackage = (cat: OfferingCategory) => {
    setSelectedCategory(cat);
    setCustomAmount("");
    setStep(3);
  };

  const handleSlipFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("กรุณาเลือกไฟล์รูปภาพเท่านั้น");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setSlipPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleQrImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("กรุณาเลือกไฟล์รูปภาพ QR Code");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setCustomQrImage(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleConfirmGiving = () => {
    if (effectiveAmount <= 0) {
      toast.error("กรุณาระบุจำนวนเงินที่ต้องการถวาย");
      return;
    }

    if (canRecordDirectly && slipPreview) {
      uploadSlipMutation.mutate({
        base64Data: slipPreview,
        donorName:
          donorName.trim() ||
          user?.name ||
          `ถวาย${offeringCategoryLabel(selectedCategory)}`,
      });
      return;
    }

    if (canRecordDirectly && effectiveFundId > 0) {
      createOfferingMutation.mutate({
        category: selectedCategory,
        amount: effectiveAmount,
        fundId: effectiveFundId,
        method: "transfer",
        receiptDate: new Date(),
        donorName: donorName.trim() || user?.name || undefined,
        notes:
          notes.trim() ||
          `ทำรายการผ่านจุดถวายอัตโนมัติ (GraceBox Station)`,
      });
      return;
    }

    // For general members without direct ledger write permissions, complete the station flow
    toast.success("ยืนยันข้อมูลการถวายเรียบร้อยแล้ว");
    setStep(4);
  };

  const isSubmitting =
    uploadSlipMutation.isPending || createOfferingMutation.isPending;

  const updatedStamp = useMemo(
    () => `อัปเดตล่าสุด ${formatThaiDateTime(new Date())}`,
    [step]
  );

  return (
    <AppLayout
      activeRoute="/offerings"
      eyebrow="GraceBox Station"
      title="จุดถวายทรัพย์อัตโนมัติ & ป้าย QR"
      subtitle="ระบบถวายทรัพย์บริการตนเองสไตล์โมเดิร์น (สแกน -> เลือกยอด -> โอน/แนบสลิป -> ยืนยัน) พร้อมป้าย QR สำหรับพิมพ์ติดหน้าห้อง"
      action={
        <div className="flex flex-wrap items-center gap-2 print:hidden">
          <button
            type="button"
            onClick={() => setLocation("/offerings")}
            className="px-3.5 py-2 rounded-2xl bg-surface border border-line text-ink-2 hover:bg-paper-2 text-xs font-bold transition-all flex items-center gap-1.5"
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
      <div className="space-y-6">
        {/* ── Mode Switcher Bar (Hidden when printing poster) ── */}
        <div className="bg-surface rounded-2xl p-2 border border-line flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 shadow-2xs print:hidden">
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
              <span>2. โปสเตอร์ป้าย QR ติดหน้าห้อง (1 สแกน ➔ 2 เลือกประเภท ➔ 3 โอน/สลิป ➔ 4 ขอบคุณพระเจ้า)</span>
            </button>
          </div>

          {activeTab === "flow" && (
            <div className="flex items-center justify-center gap-1.5 px-2 py-1">
              {([1, 2, 3, 4] as FlowStep[]).map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStep(s)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    step === s
                      ? "bg-[#F97316] text-white"
                      : "bg-paper text-ink-3 hover:text-ink"
                  }`}
                >
                  ขั้นที่ {s}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ══════════════════════════════════════════════════════════════════════
            TAB 1: INTERACTIVE MOBILE FLOW (Adapted from JamBox Screens 1, 2, 3)
           ══════════════════════════════════════════════════════════════════════ */}
        {activeTab === "flow" && (
          <div className="max-w-md lg:max-w-5xl mx-auto">
            {/* Dark Mobile Station Shell */}
            <div className="rounded-[36px] bg-[#050506] p-5 sm:p-8 text-white border border-white/[0.06] space-y-6 relative overflow-hidden">
              {/* Top Bar: TH Language Pill & Step Back Button */}
              <div className="flex items-center justify-between">
                {step > 1 ? (
                  <button
                    type="button"
                    onClick={() =>
                      setStep(prev => (prev > 1 ? ((prev - 1) as FlowStep) : 1))
                    }
                    className="w-11 h-11 rounded-full bg-white/8 hover:bg-white/15 border border-white/15 flex items-center justify-center text-white transition-colors cursor-pointer"
                    title="ย้อนกลับ"
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

              {/* ── STEP 1: Landing / Status / Give Now (Adapted from Image 2) ── */}
              {step === 1 && (
                <div className="grid grid-cols-1 lg:grid-cols-6 gap-4 animate-in fade-in duration-200">
                  <div className="lg:col-span-6 text-center -mt-4">
                    <StationCubeLogo
                      brandTitle="GraceBox"
                      subtitle="AUTOMATED CHURCH GIVING STATION"
                    />
                  </div>

                  {/* Station Breadcrumb */}
                  <div className="lg:col-span-6 text-xs sm:text-sm font-extrabold tracking-[0.2em] text-stone-300 uppercase text-center sm:text-left">
                    GRACEBOX STATION <span className="text-stone-500 mx-1">/</span>{" "}
                    {churchQuery.data?.name || "SANCTUARY SPACE"}
                  </div>

                  {/* Donor Profile Card */}
                  <StationProfileCard
                    userName={user?.name || donorName || "ผู้ถวายด้วยใจยินดี"}
                    avatarUrl={user?.avatarUrl}
                    metricLabel="สถานะผู้ถวาย"
                    metricValue={user?.churchRole || "MEMBER"}
                    className="lg:col-span-3"
                  />

                  {/* Room / Station Availability Card */}
                  <StationStatusCard
                    label="สถานะจุดถวาย"
                    statusBadgeText="พร้อมรับถวาย"
                    statusDetail="เปิดรับถวายออนไลน์และสแกนสลิปอัตโนมัติ"
                    isAvailable={true}
                    className="lg:col-span-3"
                  />

                  {/* Big Orange Gradient CTA (Jam Now -> Give Now) */}
                  <StationHeroCTA
                    eyebrow="เริ่มใช้งาน"
                    headline="พร้อมถวายทรัพย์เลยไหม?"
                    buttonTitle="Give Now"
                    buttonSubtitle="เริ่มถวายทันที"
                    helperText="ถ้าต้องการถวายเจาะจงกองทุน กดเพื่อเลือกหมวดหมู่ · ทำรายการได้ทันที"
                    onClick={() => setStep(2)}
                    className="lg:col-span-6 pt-2"
                  />
                </div>
              )}

              {/* ── STEP 2: Countdown + Offering Packages (Adapted from Image 3) ── */}
              {step === 2 && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 animate-in fade-in duration-200">
                  <div className="lg:col-span-2 text-xl font-black text-white tracking-tight px-1">
                    GraceBox Station · {churchQuery.data?.name || "Sanctuary"}
                  </div>

                  {/* 5-Minute Countdown Timer */}
                  <StationCountdownCard
                    initialSeconds={297}
                    label="เวลายืนยันตัวเลือกคงเหลือ"
                  />

                  {/* Selection Status Card */}
                  <StationStepStatusCard
                    eyebrow="สถานะการเข้าใช้งาน"
                    title="เลือกประเภทและยอดถวายที่ต้องการ"
                    updatedAtText={updatedStamp}
                  />

                  {/* Fund Selector & Custom Amount Box */}
                  <div className="lg:col-span-2 rounded-[28px] bg-[#0E0E10] border border-white/[0.07] p-5 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-[#FDBA74] block">
                          เข้ากองทุนคริสตจักร
                        </label>
                        <select
                          value={selectedFundId}
                          onChange={e => setSelectedFundId(e.target.value)}
                          className="w-full min-h-10 rounded-xl bg-[#161B26] border border-white/15 px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-[#2DD4BF]"
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
                        <label className="text-xs font-bold text-[#FDBA74] block">
                          หรือระบุยอดเอง (THB)
                        </label>
                        <input
                          type="number"
                          min="1"
                          placeholder="ระบุจำนวนเงินบาท..."
                          value={customAmount}
                          onChange={e => setCustomAmount(e.target.value)}
                          className="w-full min-h-10 rounded-xl bg-[#161B26] border border-white/15 px-3 py-2 text-xs font-bold text-white placeholder:text-slate-500 focus:outline-none focus:border-[#2DD4BF]"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Offering Package Cards (1 hr / 320 THB style) */}
                  <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {OFFERING_CATEGORIES.map(cat => {
                      const currentCatAmount =
                        customAmount.trim() !== "" && Number(customAmount) > 0
                          ? Number(customAmount)
                          : (amountsByCat[cat.id] ?? 300);

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
              {step === 3 && (
                <div className="space-y-5 animate-in fade-in duration-200">
                  {/* Summary Pill */}
                  <div className="rounded-[28px] bg-[#0E0E10] border border-white/[0.07] p-6 space-y-3">
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
                      <div className="text-4xl font-black text-[#00F58A] tabular-nums">
                        {effectiveAmount.toLocaleString()} THB
                      </div>
                    </div>

                    {/* Bank info if configured */}
                    {(churchQuery.data?.bankAccount ||
                      churchQuery.data?.bankName) && (
                      <div className="pt-3 border-t border-white/10 flex items-center justify-between gap-2 text-xs">
                        <div className="space-y-0.5">
                          <div className="text-stone-400">
                            {churchQuery.data?.bankName || "บัญชีธนาคารคริสตจักร"}
                          </div>
                          <div className="font-mono font-bold text-sm text-white">
                            {churchQuery.data?.bankAccount}
                          </div>
                          {churchQuery.data?.bankAccountName && (
                            <div className="text-stone-400">
                              {churchQuery.data.bankAccountName}
                            </div>
                          )}
                        </div>
                        {churchQuery.data?.bankAccount && (
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(
                                churchQuery.data?.bankAccount || ""
                              );
                              toast.success("คัดลอกเลขบัญชีแล้ว");
                            }}
                            className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-bold text-white inline-flex items-center gap-1 cursor-pointer"
                          >
                            <Copy className="w-3.5 h-3.5" />
                            <span>คัดลอก</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Unlock / Confirm Modal Card (Adapted directly from Image 1) */}
                  <StationUnlockConfirmCard
                    title="พร้อมยืนยันการถวายแล้วหรือยัง?"
                    description="เมื่อโอนเงินและแนบสลิปเรียบร้อยแล้ว กดปุ่มด้านล่างเพื่อส่งสลิปและยืนยันการถวาย"
                    buttonLabel="ยืนยันและส่งสลิปถวาย"
                    loading={isSubmitting}
                    onConfirm={handleConfirmGiving}
                  >
                    <div className="space-y-3 my-2">
                      {/* Donor Name Input */}
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-stone-300 block">
                          ชื่อผู้ถวาย (ไม่ระบุเพื่อถวายนิรนามได้)
                        </label>
                        <input
                          type="text"
                          value={donorName}
                          onChange={e => setDonorName(e.target.value)}
                          placeholder="เช่น สมชาย สุขใจ หรือ ผู้ถวายนิรนาม"
                          className="w-full rounded-2xl bg-black/40 border border-white/15 px-3.5 py-2.5 text-sm text-white placeholder:text-stone-500 focus:outline-none focus:border-[#34D399]"
                        />
                      </div>

                      {/* Optional Slip Image Dropzone */}
                      <div>
                        <input
                          ref={slipInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleSlipFileChange}
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
                              : "แตะเพื่อแนบรูปสลิปการโอน (ถ้ามี)"}
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
                    </div>
                  </StationUnlockConfirmCard>
                </div>
              )}

              {/* ── STEP 4: Completed State ── */}
              {step === 4 && (
                <div className="rounded-[32px] bg-[#0E0E10] border border-white/[0.07] p-7 text-center space-y-5 animate-in zoom-in-95 duration-200">
                  <div className="w-16 h-16 rounded-full bg-[#10B981]/20 border-2 border-[#34D399] text-[#34D399] mx-auto flex items-center justify-center">
                    <CheckCircle2 className="w-9 h-9" />
                  </div>

                  <div className="space-y-1.5">
                    <h3 className="text-2xl font-extrabold text-white">
                      ขอพระเจ้าทรงอวยพระพร!
                    </h3>
                    <p className="text-xs sm:text-sm text-stone-300 leading-relaxed">
                      ระบบได้รับข้อมูลการถวาย{" "}
                      <span className="font-bold text-white">
                        {offeringCategoryLabel(selectedCategory)}
                      </span>{" "}
                      จำนวน{" "}
                      <span className="font-bold text-[#34D399]">
                        {effectiveAmount.toLocaleString()} THB
                      </span>{" "}
                      เรียบร้อยแล้ว
                    </p>
                  </div>

                  <div className="flex flex-col gap-2.5 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setSlipPreview(null);
                        setCustomAmount("");
                        setStep(1);
                      }}
                      className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#FF6A00] via-[#FFC400] to-[#00F58A] text-black font-black text-base cursor-pointer"
                    >
                      ทำรายการถวายใหม่อีกครั้ง
                    </button>
                    <button
                      type="button"
                      onClick={() => setLocation("/offerings")}
                      className="w-full py-3 rounded-2xl bg-white/8 hover:bg-white/15 text-stone-200 font-bold text-xs cursor-pointer"
                    >
                      ดูรายการสมุดบัญชีเงินถวาย
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            TAB 2: PRINTABLE QR STANDEE POSTER (Adapted from Image 4)
           ══════════════════════════════════════════════════════════════════════ */}
        {activeTab === "poster" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: Poster Customizer (Hidden when printing) */}
            <div className="lg:col-span-5 bg-surface rounded-2xl border border-line p-6 space-y-5 shadow-xs print:hidden">
              <div className="flex items-center justify-between border-b border-line pb-4">
                <div>
                  <h3 className="text-base font-bold text-ink flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#F97316]" />
                    <span>ปรับแต่งป้าย QR Code หน้าห้อง</span>
                  </h3>
                  <p className="text-xs text-ink-3 mt-0.5">
                    แก้ไขข้อความ ลิงก์ QR หรืออัปโหลดรูป QR LINE / พร้อมเพย์จริงเพื่อพิมพ์ติดหน้าห้อง
                  </p>
                </div>
              </div>

              <div className="space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-bold text-ink-2 block">
                      ชื่อแบรนด์ (สีขาว)
                    </label>
                    <input
                      type="text"
                      value={posterBrandPrefix}
                      onChange={e => setPosterBrandPrefix(e.target.value)}
                      className="w-full rounded-xl border border-line px-3 py-2 font-bold text-ink"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-ink-2 block">
                      ชื่อแบรนด์ (สีส้ม)
                    </label>
                    <input
                      type="text"
                      value={posterBrandHighlight}
                      onChange={e => setPosterBrandHighlight(e.target.value)}
                      className="w-full rounded-xl border border-line px-3 py-2 font-bold text-[#EA580C]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-bold text-ink-2 block">
                      หัวข้อหลัก (สีขาว)
                    </label>
                    <input
                      type="text"
                      value={posterHeadlineWhite}
                      onChange={e => setPosterHeadlineWhite(e.target.value)}
                      className="w-full rounded-xl border border-line px-3 py-2 font-bold text-ink"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-ink-2 block">
                      หัวข้อเน้น (สีส้ม)
                    </label>
                    <input
                      type="text"
                      value={posterHeadlineOrange}
                      onChange={e => setPosterHeadlineOrange(e.target.value)}
                      className="w-full rounded-xl border border-line px-3 py-2 font-bold text-[#EA580C]"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-ink-2 block">
                    ข้อความเหนือ QR Code
                  </label>
                  <input
                    type="text"
                    value={posterScanPrompt}
                    onChange={e => setPosterScanPrompt(e.target.value)}
                    className="w-full rounded-xl border border-line px-3 py-2 font-semibold text-ink"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-ink-2 block">
                    ลิงก์สำหรับสร้าง QR Code (เช่น ลิงก์ LINE OA หรือหน้าถวาย)
                  </label>
                  <input
                    type="text"
                    value={posterQrValue}
                    onChange={e => setPosterQrValue(e.target.value)}
                    className="w-full rounded-xl border border-line px-3 py-2 font-mono text-xs text-ink"
                  />
                </div>

                {/* Upload Custom QR Image */}
                <div className="space-y-1.5">
                  <label className="font-bold text-ink-2 block">
                    หรืออัปโหลดรูป QR จริง (LINE Official / PromptPay)
                  </label>
                  <input
                    ref={qrUploadRef}
                    type="file"
                    accept="image/*"
                    onChange={handleQrImageUpload}
                    className="hidden"
                  />
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => qrUploadRef.current?.click()}
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
                        className="px-3 py-2.5 rounded-xl border border-line text-danger font-bold hover:bg-rose-500/100/10 cursor-pointer"
                      >
                        ใช้ QR อัตโนมัติ
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-bold text-ink-2 block">
                      ป้ายตรงกลาง QR
                    </label>
                    <input
                      type="text"
                      value={posterCenterBadge}
                      onChange={e => setPosterCenterBadge(e.target.value)}
                      className="w-full rounded-xl border border-line px-3 py-2 font-bold text-ink"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-ink-2 block">
                      ข้อความใต้กรอบ QR
                    </label>
                    <input
                      type="text"
                      value={posterQrCaption}
                      onChange={e => setPosterQrCaption(e.target.value)}
                      className="w-full rounded-xl border border-line px-3 py-2 font-bold text-ink"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-bold text-ink-2 block">
                      ข้อความท้ายป้าย (ขาว)
                    </label>
                    <input
                      type="text"
                      value={posterFooterWhite}
                      onChange={e => setPosterFooterWhite(e.target.value)}
                      className="w-full rounded-xl border border-line px-3 py-2 font-bold text-ink"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-ink-2 block">
                      ข้อความท้ายป้าย (ส้ม)
                    </label>
                    <input
                      type="text"
                      value={posterFooterOrange}
                      onChange={e => setPosterFooterOrange(e.target.value)}
                      className="w-full rounded-xl border border-line px-3 py-2 font-bold text-[#EA580C]"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-ink-2 block">
                    คำอธิบายบรรทัดล่างสุด
                  </label>
                  <input
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
                  className="flex-1 py-3 px-4 rounded-xl bg-[#F97316] hover:bg-[#EA580C] text-white font-extrabold text-sm shadow-sm flex items-center justify-center gap-2 cursor-pointer"
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
    </AppLayout>
  );
}
