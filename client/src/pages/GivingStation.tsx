import React, { useEffect, useMemo, useRef, useState } from "react";
import { friendlyErrorMessage } from "@/lib/errors";
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
  canManageChurchSettings,
  canManageFinance,
  getChurchRoleInfo,
  isStationOnlyUser,
} from "@shared/roles";
import {
  DEFAULT_STATION_POSTER,
  type StationPoster,
} from "@shared/stationPoster";
import { MAX_GIVING_AMOUNT } from "@shared/givingLimits";
import { formatAmount, formatThaiDateTime } from "@/lib/format";
import { prepareSlipImage, SlipFileError } from "@/lib/slipImage";
import type { DonorSlipState, DonorSlipStatus } from "@shared/donorSlip";
import {
  buildSendChecklist,
  canSend,
  type ChecklistItem,
  describeOutcome,
  failedAttemptsNote,
  resolveSubmitMode,
  type StationSubmission,
} from "./givingStationFlow";
import { fetchLiffId } from "@/lib/liffSignIn";
import { GiveChooser } from "@/components/giving/GiveChooser";
import { UNREADABLE_SLIP, type SlipReading } from "@shared/slipReading";
import { giveTotal, parseDrafts, type SplitDraft } from "@/lib/splitDraft";
import { checkSplit } from "@shared/givingSplit";
import { clearDraft, loadDraft, saveDraft } from "./givingDraft";
import { StationOnlyFrame } from "@/components/layout/StationOnlyFrame";
import { PromptPayQrCard } from "@/components/ui/promptpay-qr-card";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Copy,
  Download,
  Image as ImageIcon,
  Camera,
  Printer,
  QrCode,
  Save,
  Share2,
  RotateCcw,
  Smartphone,
  Loader2,
  UploadCloud,
} from "lucide-react";
import { toast } from "sonner";
import {
  canShareImage,
  downloadObjectUrl,
  posterFileName,
  printPosterImage,
  renderPosterExport,
  renderPosterImage,
  shareImage,
  type PosterImageType,
  type PosterPaper,
} from "@/lib/posterExport";
import {
  StationCountdownCard,
  defaultStationUrl,
  StationCubeLogo,
  StationHeroCTA,
  StationProfileCard,
  StationQrPoster,
  StationStatusCard,
  StationStepStatusCard,
  StationUnlockConfirmCard,
} from "@/components/ui/station-giving-kit";

type StationTab = "flow" | "poster";
type FlowStep = 1 | 2 | 3 | 4;

const DEFAULT_AMOUNTS: Record<OfferingCategory, number> = {
  cash: 300,
  meal: 100,
  memorial: 500,
  mission: 500,
  special: 300,
  land: 1000,
  party: 300,
  venue_rent: 1000,
  tithe: 1000,
};

const PRESET_CHOICES: Record<OfferingCategory, number[]> = {
  cash: [100, 300, 500, 1000],
  meal: [50, 100, 200, 500],
  memorial: [300, 500, 1000, 3000],
  mission: [200, 500, 1000, 3000],
  special: [100, 300, 500, 1000],
  land: [500, 1000, 3000, 5000],
  party: [100, 300, 500, 1000],
  venue_rent: [500, 1000, 3000, 5000],
  tithe: [500, 1000, 3000, 5000],
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
  const payeeQuery = trpc.church.payeeInfo.useQuery(undefined, {
    enabled: step === 3,
    retry: false,
  });
  const payee = payeeQuery.data ?? null;
  const mySlipsQuery = trpc.givingInbox.mySlips.useQuery(undefined, {
    retry: false,
  });
  const stationReady = !churchQuery.isError && !fundOptionsQuery.isError;

  // Flow State
  const [giveLines, setGiveLines] = useState<SplitDraft[]>([]);
  const giveLinesRef = useRef<SplitDraft[]>([]);
  giveLinesRef.current = giveLines;
  const selectedCategory: OfferingCategory = giveLines[0]?.category ?? "cash";
  const [selectedFundId, setSelectedFundId] = useState<string>("");
  const [donorNameInput, setDonorNameInput] = useState<string | null>(null);
  const donorName = donorNameInput ?? user?.name ?? "";
  const [transferDate, setTransferDate] = useState<string>(() =>
    new Date().toLocaleDateString("sv-SE")
  );
  const [submission, setSubmission] = useState<StationSubmission | null>(null);
  const [slipPreview, setSlipPreview] = useState<string | null>(null);
  const [slipReading, setSlipReading] = useState<
    | { state: "idle" }
    | { state: "reading" }
    | { state: "done"; data: SlipReading }
  >({ state: "idle" });
  const readingFor = useRef<string | null>(null);
  const nameTouched = useRef(false);
  const [nameFromSlip, setNameFromSlip] = useState(false);
  const [amountFromSlip, setAmountFromSlip] = useState(false);
  const [transferState, setTransferState] = useState<"not_yet" | "done">(
    "not_yet"
  );
  const [restoredFromDraft, setRestoredFromDraft] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const slipInputRef = useRef<HTMLInputElement>(null);
  const slipCameraRef = useRef<HTMLInputElement>(null);

  // Poster Customization State
  const posterQuery = trpc.church.stationPoster.useQuery(undefined, {
    retry: false,
    enabled: !stationOnly,
  });
  const [posterBrandPrefix, setPosterBrandPrefix] = useState(
    DEFAULT_STATION_POSTER.brandPrefix
  );
  const [posterBrandHighlight, setPosterBrandHighlight] = useState(
    DEFAULT_STATION_POSTER.brandHighlight
  );
  const [posterHeadlineWhite, setPosterHeadlineWhite] = useState(
    DEFAULT_STATION_POSTER.headlineWhite
  );
  const [posterHeadlineOrange, setPosterHeadlineOrange] = useState(
    DEFAULT_STATION_POSTER.headlineOrange
  );
  const [posterScanPrompt, setPosterScanPrompt] = useState(
    DEFAULT_STATION_POSTER.scanPrompt
  );
  const [posterQrValue, setPosterQrValue] = useState(defaultStationUrl);
  const [posterCenterBadge, setPosterCenterBadge] = useState(
    DEFAULT_STATION_POSTER.centerBadge
  );
  const [posterQrCaption, setPosterQrCaption] = useState(
    DEFAULT_STATION_POSTER.qrCaption
  );
  const [posterFooterWhite, setPosterFooterWhite] = useState(
    DEFAULT_STATION_POSTER.footerWhite
  );
  const [posterFooterOrange, setPosterFooterOrange] = useState(
    DEFAULT_STATION_POSTER.footerOrange
  );
  const [posterFooterSub, setPosterFooterSub] = useState(
    DEFAULT_STATION_POSTER.footerSub
  );
  const applyPoster = (p: StationPoster) => {
    setPosterBrandPrefix(p.brandPrefix);
    setPosterBrandHighlight(p.brandHighlight);
    setPosterHeadlineWhite(p.headlineWhite);
    setPosterHeadlineOrange(p.headlineOrange);
    setPosterScanPrompt(p.scanPrompt);
    setPosterQrValue(p.qrValue || defaultStationUrl());
    setPosterCenterBadge(p.centerBadge);
    setPosterQrCaption(p.qrCaption);
    setPosterFooterWhite(p.footerWhite);
    setPosterFooterOrange(p.footerOrange);
    setPosterFooterSub(p.footerSub);
  };
  const posterLoaded = useRef(false);
  useEffect(() => {
    if (!posterQuery.data || posterLoaded.current) return;
    posterLoaded.current = true;
    applyPoster(posterQuery.data);
  }, [posterQuery.data]);
  const savePosterMutation = trpc.church.saveStationPoster.useMutation({
    onSuccess: () => {
      toast.success("บันทึกข้อความป้ายแล้ว");
      void utils.church.stationPoster.invalidate();
    },
    onError: err =>
      toast.error(friendlyErrorMessage(err, "บันทึกข้อความป้ายไม่สำเร็จ")),
  });
  const canSavePoster = canManageChurchSettings(user);
  const savePoster = () => {
    const link = defaultStationUrl();
    savePosterMutation.mutate({
      brandPrefix: posterBrandPrefix,
      brandHighlight: posterBrandHighlight,
      headlineWhite: posterHeadlineWhite,
      headlineOrange: posterHeadlineOrange,
      scanPrompt: posterScanPrompt,
      qrValue: posterQrValue.trim() === link ? "" : posterQrValue,
      centerBadge: posterCenterBadge,
      qrCaption: posterQrCaption,
      footerWhite: posterFooterWhite,
      footerOrange: posterFooterOrange,
      footerSub: posterFooterSub,
    });
  };
  const givingLink = defaultStationUrl();
  const [liffId, setLiffId] = useState<string | null>(null);
  useEffect(() => {
    if (stationOnly) return;
    let active = true;
    void fetchLiffId().then(id => {
      if (active) setLiffId(id);
    });
    return () => {
      active = false;
    };
  }, [stationOnly]);
  const liffLink = liffId ? `https://liff.line.me/${liffId}` : null;
  const lineShareLink = liffLink ?? givingLink;
  const shareText = "ถวายทรัพย์ออนไลน์ ผ่าน LINE";
  const copyLink = async (link: string) => {
    try {
      await navigator.clipboard.writeText(link);
      toast.success("คัดลอกลิงก์แล้ว");
    } catch {
      toast.error("คัดลอกไม่สำเร็จ ให้กดค้างที่ลิงก์เพื่อคัดลอก");
    }
  };
  const canNativeShare =
    typeof navigator !== "undefined" && typeof navigator.share === "function";
  const nativeShare = () => {
    navigator
      .share({ title: shareText, text: shareText, url: givingLink })
      .catch(() => undefined);
  };
  const [customQrImage, setCustomQrImage] = useState<string | null>(null);
  const qrUploadRef = useRef<HTMLInputElement>(null);
  const posterHasQr = customQrImage !== null || posterQrValue.trim() !== "";
  const posterRef = useRef<HTMLDivElement>(null);
  const [posterBusy, setPosterBusy] = useState(false);
  const [posterFile, setPosterFile] = useState<{
    url: string;
    dataUrl: string;
    name: string;
    blob: Blob;
  } | null>(null);
  useEffect(
    () => () => {
      if (posterFile) URL.revokeObjectURL(posterFile.url);
    },
    [posterFile]
  );

  const exportPoster = async (
    action:
      | { kind: "save"; type: PosterImageType }
      | { kind: "print"; paper: PosterPaper }
  ) => {
    const node = posterRef.current;
    if (!node || posterBusy) return;
    setPosterBusy(true);
    try {
      if (action.kind === "save") {
        const { blob, dataUrl } = await renderPosterExport(node, action.type);
        const name = posterFileName(action.type);
        const url = URL.createObjectURL(blob);
        setPosterFile({ url, dataUrl, name, blob });
        downloadObjectUrl(url, name);
        toast.success(
          "สร้างรูปโปสเตอร์แล้ว ดูตัวอย่างและปุ่มดาวน์โหลดด้านล่าง"
        );
      } else {
        const url = await renderPosterImage(node, "png");
        await printPosterImage(url, action.paper);
      }
    } catch (err) {
      toast.error(
        err instanceof Error && err.message
          ? err.message
          : "สร้างรูปโปสเตอร์ไม่สำเร็จ ลองใหม่อีกครั้ง"
      );
    } finally {
      setPosterBusy(false);
    }
  };

  const effectiveFundId = useMemo(() => {
    if (selectedFundId) return Number(selectedFundId);
    return funds[0]?.id ?? 0;
  }, [selectedFundId, funds]);

  // GAP-05: Upload & submission error tracking with auto-scroll and retry
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const errorBannerRef = useRef<HTMLDivElement>(null);
  const isSubmittingRef = useRef(false);

  const effectiveAmount = useMemo(() => giveTotal(giveLines), [giveLines]);

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

  const splitActive = giveLines.length >= 2;
  const splitLines = splitActive ? parseDrafts(giveLines) : null;
  const splitProblem =
    splitLines && effectiveAmount !== null
      ? checkSplit(splitLines, effectiveAmount)
      : null;

  const readSlipMutation = trpc.givingInbox.readSlip.useMutation();

  const submitNoSlipMutation = trpc.givingInbox.submitWithoutSlip.useMutation({
    onError: err => {
      toast.error(friendlyErrorMessage(err, "ส่งรายการไม่สำเร็จ"));
    },
  });

  const submitSlipMutation = trpc.givingInbox.submitSlip.useMutation({
    onError: err => {
      toast.error(friendlyErrorMessage(err, "ส่งสลิปไม่สำเร็จ"));
    },
  });

  const createOfferingMutation = trpc.offerings.create.useMutation({
    onError: err => {
      toast.error(friendlyErrorMessage(err, "บันทึกการถวายไม่สำเร็จ"));
    },
  });

  const draftRestored = useRef(false);
  useEffect(() => {
    if (draftRestored.current || !user) return;
    draftRestored.current = true;
    const draft = loadDraft(user.id);
    if (!draft) return;
    setGiveLines(
      draft.items && draft.items.length > 0
        ? draft.items.map(i => ({
            category: i.category,
            amount: String(i.amount),
          }))
        : [{ category: draft.category, amount: String(draft.amount) }]
    );
    setSelectedFundId(draft.fundId);
    setTransferState(draft.transferState);
    setRestoredFromDraft(true);
    setStep(3);
  }, [user]);

  useEffect(() => {
    if (!user || !draftRestored.current) return;
    if (step !== 3) {
      if (step === 4 || step === 1) clearDraft();
      return;
    }
    const amount = giveTotal(giveLines);
    if (amount === null) return;
    saveDraft({
      userId: user.id,
      category: selectedCategory,
      amount,
      items:
        giveLines.length >= 2
          ? parseDrafts(giveLines).map(l => ({
              category: l.category,
              amount: l.amount,
            }))
          : undefined,
      fundId: selectedFundId,
      transferState,
      savedAt: Date.now(),
    });
  }, [user, step, giveLines, selectedCategory, selectedFundId, transferState]);

  const handleGoToSummary = () => {
    if (effectiveAmount === null) {
      toast.error(
        `เลือกประเภทและใส่ยอดให้ถูกต้อง (ไม่เกิน ${formatAmount(MAX_GIVING_AMOUNT, 0)} บาท)`
      );
      return;
    }
    setStep(3);
  };

  const readAttachedSlip = async (dataUrl: string) => {
    readingFor.current = dataUrl;
    setSlipReading({ state: "reading" });
    setNameFromSlip(false);
    setAmountFromSlip(false);
    let reading: SlipReading;
    try {
      reading = await readSlipMutation.mutateAsync({ base64Data: dataUrl });
    } catch {
      reading = UNREADABLE_SLIP;
    }
    if (readingFor.current !== dataUrl) return;
    setSlipReading({ state: "done", data: reading });
    if (reading.senderName && !nameTouched.current) {
      setDonorNameInput(reading.senderName);
      setNameFromSlip(true);
    }
    if (reading.amount !== null && giveLinesRef.current.length === 1) {
      const amount = reading.amount;
      setGiveLines(prev =>
        prev.length === 1 ? [{ ...prev[0], amount: String(amount) }] : prev
      );
      setAmountFromSlip(true);
    }
  };

  const handleSlipFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const input = e.target;
    const file = input.files?.[0];
    input.value = "";
    if (!file) return;
    setIsCompressing(true);
    setSubmissionError(null);
    try {
      const prepared = await prepareSlipImage(file);
      setSlipPreview(prepared);
      void readAttachedSlip(prepared);
    } catch (err) {
      const msg =
        err instanceof SlipFileError ? err.message : "แนบรูปสลิปไม่สำเร็จ";
      setSubmissionError(msg);
      toast.error(msg);
      setTimeout(() => {
        errorBannerRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }, 50);
    } finally {
      setIsCompressing(false);
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
    if (isSubmitting || isSubmittingRef.current || isCompressing) return;
    isSubmittingRef.current = true;
    setSubmissionError(null);

    if (effectiveAmount === null) {
      toast.error("กรุณาระบุจำนวนเงินที่ต้องการถวาย");
      isSubmittingRef.current = false;
      return;
    }
    if (!canSend(checklist)) {
      toast.error("กรุณากรอกข้อมูลให้ครบถ้วนก่อนยืนยัน");
      isSubmittingRef.current = false;
      return;
    }

    const name = donorName.trim() || undefined;
    const items = splitActive && splitLines ? splitLines : undefined;
    const categoryToSend = items?.[0].category ?? selectedCategory;
    let check: StationSubmission["check"] = null;
    let failedAttemptsAfter = failedAttempts;
    try {
      if (submitMode === "slip" && slipPreview) {
        const result = await submitSlipMutation.mutateAsync({
          base64Data: slipPreview,
          amount: effectiveAmount,
          category: categoryToSend,
          items,
          fundId: effectiveFundId > 0 ? effectiveFundId : undefined,
          donorName: name,
        });
        check = result.check;
        failedAttemptsAfter = result.failedAttempts;
        setFailedAttempts(result.failedAttempts);
        void utils.givingInbox.invalidate();
      } else if (submitMode === "no-slip") {
        const result = await submitNoSlipMutation.mutateAsync({
          amount: effectiveAmount,
          category: categoryToSend,
          items,
          fundId: effectiveFundId > 0 ? effectiveFundId : undefined,
          donorName: donorName.trim(),
          transferDate: new Date(transferDate),
        });
        check = result.check;
        void utils.givingInbox.invalidate();
      } else {
        const linesToCreate =
          items && items.length > 0
            ? items
            : [{ category: selectedCategory, amount: effectiveAmount }];
        if (effectiveFundId <= 0) {
          toast.error("ยังไม่มีกองทุนในระบบ ต้องสร้างกองทุนก่อนบันทึกการถวาย");
          return;
        }
        for (const line of linesToCreate) {
          await createOfferingMutation.mutateAsync({
            category: line.category,
            amount: line.amount,
            fundId: effectiveFundId,
            method: "transfer",
            receiptDate: new Date(),
            donorName: name,
            notes: "ทำรายการผ่านจุดถวายอัตโนมัติ (GraceBox Station)",
          });
        }
        void Promise.all([
          utils.offerings.list.invalidate(),
          utils.finance.summary.invalidate(),
          utils.finance.accounts.invalidate(),
        ]);
      }
    } catch (err: any) {
      const msg =
        err?.message ||
        "ไม่สามารถบันทึกสลิปได้ กรุณาตรวจสอบการเชื่อมต่อและลองใหม่อีกครั้ง";
      setSubmissionError(msg);
      setTimeout(() => {
        errorBannerRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }, 50);
      return;
    } finally {
      isSubmittingRef.current = false;
    }

    setSubmission({
      mode: submitMode,
      category: categoryToSend,
      amount: effectiveAmount,
      splitCount: items?.length,
      check,
      failedAttempts:
        check?.state === "rejected" ? failedAttemptsAfter : undefined,
    });
    if (check?.state === "rejected") {
      toast.error(check.message);
    } else {
      setSlipPreview(null);
      toast.success("ส่งข้อมูลการถวายเรียบร้อยแล้ว");
    }
    setStep(4);
  };

  const retryWithSlipAmount = (amount: number) => {
    if (giveLinesRef.current.length === 1) {
      setGiveLines(prev => [{ ...prev[0], amount: String(amount) }]);
    } else {
      toast.info(
        `ปรับยอดแต่ละประเภทให้รวมเป็น ${formatAmount(amount)} บาท ตามสลิป`
      );
    }
    setSubmission(null);
    setStep(3);
  };

  const retryWithOtherSlip = () => {
    setSlipPreview(null);
    setSubmission(null);
    setStep(3);
  };

  const handleCountdownExpire = () => {
    if (isSubmitting || slipPreview !== null) return;
    if (giveLines.length > 0) {
      toast.warning(
        "หมดเวลาทำรายการสำหรับเครื่องสาธารณะ หากต้องการทำรายการต่อโปรดแตะหน้าจอ"
      );
      return;
    }
    toast.info("หมดเวลาทำรายการ กำลังรีเซ็ตหน้าจอเพื่อความปลอดภัย");
    resetFlow();
  };

  const resetFlow = () => {
    setTransferState("not_yet");
    setRestoredFromDraft(false);
    setSlipPreview(null);
    setGiveLines([]);
    setSubmission(null);
    setStep(1);
  };

  const checklist = buildSendChecklist({
    category: selectedCategory,
    amount: effectiveAmount,
    donorName,
    hasSlip: slipPreview !== null,
    mode: submitMode,
    transferDate,
    split:
      splitActive && splitLines
        ? { lines: splitLines, problem: splitProblem }
        : undefined,
  });
  const attemptsNote = failedAttemptsNote(failedAttempts);

  const isSubmitting =
    submitSlipMutation.isPending ||
    submitNoSlipMutation.isPending ||
    createOfferingMutation.isPending ||
    isCompressing;

  const shownStep: FlowStep = step === 4 && !submission ? 1 : step;

  const updatedStamp = useMemo(
    () => `อัปเดตล่าสุด ${formatThaiDateTime(new Date())}`,
    [step]
  );

  const body = (
    <div className="space-y-6">
      {/* ── Mode Switcher Bar (Hidden when printing poster) ── */}
      <div className="rounded-2xl p-1.5 border border-line bg-surface flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 print:hidden">
        {!stationOnly && (
          <div className="grid grid-cols-2 gap-1.5 flex-1">
            <button
              type="button"
              onClick={() => setActiveTab("flow")}
              className={`min-h-11 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold flex items-center justify-center gap-2 transition-colors cursor-pointer ${
                activeTab === "flow"
                  ? "border border-brand/40 bg-accent text-accent-foreground "
                  : "text-ink-2 hover:bg-paper-2 hover:text-ink"
              }`}
            >
              <Smartphone className="w-4 h-4 text-brand" />
              <span>1. หน้าเว็บถวายอัตโนมัติ (Mobile Flow)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("poster")}
              className={`min-h-11 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold flex items-center justify-center gap-2 transition-colors cursor-pointer ${
                activeTab === "poster"
                  ? "border border-brand/40 bg-accent text-accent-foreground "
                  : "text-ink-2 hover:bg-paper-2 hover:text-ink"
              }`}
            >
              <QrCode className="w-4 h-4 text-brand" />
              <span>
                2. โปสเตอร์ป้าย QR ติดหน้าห้อง (1 สแกน → 2 เลือกประเภท → 3
                โอน/สลิป → 4 ขอบคุณพระเจ้า)
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
                className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-colors ${
                  shownStep === n
                    ? "border border-brand bg-brand text-white "
                    : "border border-line bg-paper-2 text-ink-2"
                }`}
              >
                ขั้นที่ {n}
              </li>
            ))}
          </ol>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
            TAB 1: INTERACTIVE MOBILE FLOW
           ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "flow" && (
        <div
          className={
            shownStep === 3
              ? "max-w-md sm:max-w-xl lg:max-w-4xl mx-auto"
              : "max-w-md sm:max-w-lg mx-auto"
          }
        >
          {/* Station Card Shell */}
          <div className="rounded-2xl bg-paper-2 p-4 sm:p-7 text-ink border border-line space-y-5 sm:space-y-6 relative">
            {/* Top Bar: TH Language Pill & Step Back Button */}
            <div className="flex items-center justify-between">
              {shownStep > 1 && shownStep < 4 ? (
                <button
                  type="button"
                  onClick={() =>
                    setStep(prev => (prev > 1 ? ((prev - 1) as FlowStep) : 1))
                  }
                  className="grid size-11 place-items-center rounded-xl border border-brand/40 bg-surface text-ink transition-colors hover:bg-accent active:scale-95 cursor-pointer"
                  title="ย้อนกลับ"
                  aria-label="ย้อนกลับ"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
              ) : (
                <div className="w-11 h-11" />
              )}

              <div className="grid size-11 place-items-center rounded-xl border border-line bg-surface text-xs font-bold text-ink">
                TH
              </div>
            </div>

            {stationOnly && shownStep === 2 && (
              <StationCountdownCard
                initialSeconds={300}
                label="เวลาทำรายการคงเหลือ"
                onExpire={handleCountdownExpire}
              />
            )}

            {/* ── STEP 1: Landing / Status / Give Now ── */}
            {shownStep === 1 && (
              <div className="space-y-5 animate-in fade-in duration-200">
                <div className="text-center -mt-2">
                  <StationCubeLogo
                    brandTitle="GraceBox"
                    subtitle="AUTOMATED CHURCH GIVING STATION"
                  />
                </div>

                {/* Station Breadcrumb */}
                <div className="text-xs sm:text-sm font-semibold text-ink-3 text-center sm:text-left">
                  GRACEBOX STATION <span className="text-ink-3 mx-1">/</span>{" "}
                  {churchQuery.data?.name || "คริสตจักรชีวิตสุขสันต์กาฬสินธุ์"}
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

                {/* Primary Give Now CTA */}
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

                {/* Direct category shortcuts */}
                <div className="rounded-2xl border border-line bg-surface p-4 space-y-2.5">
                  <div className="text-xs font-bold text-ink-2">
                    หมวดหมู่การถวาย (เลือกเพื่อเริ่มถวายได้ทันที)
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {OFFERING_CATEGORIES.map(c => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          setGiveLines([
                            {
                              category: c.id,
                              amount: String(DEFAULT_AMOUNTS[c.id]),
                            },
                          ]);
                          setStep(2);
                        }}
                        className="inline-flex items-center min-h-9 px-3 py-1 rounded-full text-xs font-bold border border-line bg-paper-2 hover:bg-tile-mint hover:text-tile-mint-ink hover:border-brand transition-colors cursor-pointer"
                      >
                        {c.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <MySlipHistory
                    items={mySlipsQuery.data}
                    loading={mySlipsQuery.isLoading}
                  />
                </div>
              </div>
            )}

            {/* ── STEP 2: Countdown + Offering Packages ── */}
            {shownStep === 2 && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 animate-in fade-in duration-200">
                <div className="lg:col-span-2 text-xl font-extrabold text-ink tracking-tight px-1">
                  จุดถวายอัตโนมัติ · {churchQuery.data?.name || "Sanctuary"}
                </div>

                {/* Selection Status Card */}
                <StationStepStatusCard
                  title="เลือกประเภทและยอดถวายที่ต้องการ"
                  updatedAtText={updatedStamp}
                />

                {/* Fund Selector */}
                <div className="space-y-1.5 rounded-2xl border border-line bg-surface p-5 lg:col-span-2">
                  <label
                    htmlFor="station-fund"
                    className="text-xs font-extrabold text-ink-2 block"
                  >
                    เข้ากองทุนคริสตจักร
                  </label>
                  <select
                    id="station-fund"
                    value={selectedFundId}
                    onChange={e => setSelectedFundId(e.target.value)}
                    className="neo-input font-bold"
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

                {/* Tap the categories, then type an amount for each */}
                <GiveChooser
                  lines={giveLines}
                  onChange={setGiveLines}
                  defaults={DEFAULT_AMOUNTS}
                  presets={PRESET_CHOICES}
                />

                <div className="lg:col-span-2">
                  <button
                    type="button"
                    onClick={handleGoToSummary}
                    disabled={effectiveAmount === null}
                    className="btn-primary w-full min-h-12 text-sm disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                  >
                    ดูสรุปการถวาย
                  </button>
                </div>
              </div>
            )}

            {/* ── STEP 3: Confirm & Submit Slip ── */}
            {shownStep === 3 && (
              <div className="space-y-5 animate-in fade-in duration-200">
                {restoredFromDraft && (
                  <div className="rounded-xl border border-line bg-tile-mint p-3.5 text-xs font-bold text-tile-mint-ink flex items-center justify-between gap-2">
                    <span>
                      ดึงรายการที่คุณเลือกไว้กลับมาให้แล้ว
                      แนบสลิปหรือกดยืนยันต่อได้เลย
                    </span>
                    <button
                      type="button"
                      onClick={() => setRestoredFromDraft(false)}
                      className="shrink-0 underline hover:opacity-80 cursor-pointer"
                    >
                      รับทราบ
                    </button>
                  </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                  {/* Left Column: Summary & Payment Details */}
                  <div className="lg:col-span-6 space-y-4">
                    {/* Summary Card */}
                    <div className="rounded-2xl bg-surface border border-line p-5 space-y-3">
                      <div className="flex items-center justify-between text-xs font-bold text-ink-2">
                        <span>สรุปรายการถวายทรัพย์</span>
                        <button
                          type="button"
                          onClick={() => {
                            setRestoredFromDraft(false);
                            setStep(2);
                          }}
                          className="underline hover:text-brand cursor-pointer"
                        >
                          เปลี่ยนประเภท/ยอด
                        </button>
                      </div>

                      <div className="flex items-baseline justify-between gap-2">
                        <div>
                          <div className="text-xl font-extrabold text-ink">
                            {giveLines.length >= 2
                              ? `แบ่งถวาย ${giveLines.length} ประเภท`
                              : offeringCategoryLabel(selectedCategory)}
                          </div>
                          {giveLines.length >= 2 && (
                            <ul className="mt-1 space-y-0.5 text-xs font-medium text-ink-2">
                              {parseDrafts(giveLines).map(l => (
                                <li key={l.category} className="tabular-nums">
                                  {offeringCategoryLabel(l.category)}{" "}
                                  {Number.isNaN(l.amount)
                                    ? "—"
                                    : formatAmount(l.amount)}{" "}
                                  บาท
                                </li>
                              ))}
                            </ul>
                          )}
                          <div className="text-xs font-medium text-ink-3 mt-1">
                            กองทุน:{" "}
                            {funds.find(f => f.id === effectiveFundId)?.name ||
                              "กองทุนหลักคริสตจักร"}
                          </div>
                        </div>
                        <div className="text-2xl sm:text-3xl font-extrabold text-income tabular-nums">
                          {effectiveAmount === null
                            ? "—"
                            : `${formatAmount(effectiveAmount)} บาท`}
                        </div>
                      </div>
                    </div>

                    {/* Has the donor paid yet? */}
                    <section
                      aria-label="สถานะการโอนเงิน"
                      className="rounded-2xl bg-surface border border-line p-4 space-y-3"
                    >
                      <h3 className="text-xs font-bold text-ink-2">
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
                            className={`min-h-11 rounded-xl border border-line text-sm font-bold cursor-pointer focus-visible:ring-2 focus-visible:ring-brand transition-colors ${
                              transferState === value
                                ? "bg-accent text-accent-foreground"
                                : "bg-surface text-ink-2 hover:bg-paper-2"
                            }`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                      <p className="text-xs font-medium text-ink-3 leading-relaxed">
                        {transferState === "not_yet"
                          ? "โอนตามบัญชีหรือ QR ด้านล่าง แล้วกลับมาที่หน้านี้เพื่อแนบสลิปยืนยันยอด"
                          : "แนบสลิปและตรวจรายการด้านล่างเพื่อยืนยันยอดที่โอน"}
                      </p>
                      {transferState === "not_yet" && (
                        <ol className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-xs font-bold text-ink">
                          <li className="rounded-xl border border-line bg-paper-2 px-3 py-2 flex items-center gap-2">
                            <span className="inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-brand text-xs font-black text-white">
                              1
                            </span>
                            <span>คัดลอกเลขบัญชี หรือบันทึกรูป QR</span>
                          </li>
                          <li className="rounded-xl border border-line bg-paper-2 px-3 py-2 flex items-center gap-2">
                            <span className="inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-brand text-xs font-black text-white">
                              2
                            </span>
                            <span>เปิดแอปธนาคารเพื่อโอนเงิน</span>
                          </li>
                          <li className="rounded-xl border border-line bg-paper-2 px-3 py-2 flex items-center gap-2">
                            <span className="inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-brand text-xs font-black text-white">
                              3
                            </span>
                            <span>กลับมาหน้านี้เพื่อแนบรูปสลิป</span>
                          </li>
                        </ol>
                      )}
                    </section>

                    {transferState === "not_yet" && (
                      <>
                        {payee ? (
                          <section
                            aria-label="บัญชีรับถวาย"
                            className="rounded-2xl bg-surface border border-line p-4 flex items-center justify-between gap-3 text-xs"
                          >
                            <div className="space-y-0.5 min-w-0">
                              <div className="font-semibold text-ink-3">
                                {payee.bankName || "บัญชีธนาคารคริสตจักร"}
                              </div>
                              <div className="font-bold text-base sm:text-lg text-ink tabular-nums tracking-wide break-all">
                                {payee.bankAccount}
                              </div>
                              {payee.bankAccountName && (
                                <div className="font-medium text-ink-3">
                                  {payee.bankAccountName}
                                </div>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() =>
                                void handleCopyAccount(payee.bankAccount)
                              }
                              className="btn-secondary shrink-0 min-h-10 px-3 text-xs"
                            >
                              <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                              <span>คัดลอก</span>
                            </button>
                          </section>
                        ) : (
                          !paymentQr &&
                          !payeeQuery.isLoading && (
                            <p className="rounded-2xl bg-surface border border-line p-4 text-xs font-medium text-ink-3 leading-relaxed">
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
                        className="rounded-xl border border-line bg-tile-sand p-3 text-xs font-bold text-tile-sand-ink leading-relaxed"
                      >
                        {attemptsNote}
                      </p>
                    )}
                  </div>

                  {/* Right Column: Slip Media Tray, Verification & Confirm */}
                  <div className="lg:col-span-6 space-y-4">
                    <StationUnlockConfirmCard
                      title="ตรวจสอบและยืนยันการถวาย"
                      description={
                        submitMode === "ledger"
                          ? "ไม่ได้แนบสลิป ระบบจะบันทึกรายการถวายเข้าบัญชีทันทีในนามเจ้าหน้าที่การเงิน"
                          : submitMode === "no-slip"
                            ? "ไม่ได้แนบสลิป กรอกชื่อและวันที่โอนให้ถูกต้อง เหรัญญิกจะตรวจกับยอดเข้าบัญชีธนาคารก่อนนับเข้าบัญชี และแจ้งผลให้คุณทราบ"
                            : "เมื่อโอนเงินและแนบสลิปเรียบร้อยแล้ว กดปุ่มด้านล่างเพื่อส่งสลิป เหรัญญิกจะตรวจสอบก่อนบันทึกเข้าบัญชี"
                      }
                      buttonLabel={
                        submitMode === "ledger"
                          ? "บันทึกรายการถวายเข้าบัญชี"
                          : submitMode === "no-slip"
                            ? "ส่งให้เหรัญญิกตรวจสอบ"
                            : "ยืนยันและส่งสลิปถวาย"
                      }
                      loading={isSubmitting}
                      disabled={effectiveAmount === null || !canSend(checklist)}
                      onConfirm={() => void handleConfirmGiving()}
                    >
                      <div className="space-y-3.5 my-2">
                        {/* Submission Error Banner with Auto-scroll and Retry (GAP-05) */}
                        {submissionError && (
                          <div
                            ref={errorBannerRef}
                            role="alert"
                            aria-live="assertive"
                            className="rounded-xl border border-danger/40 bg-tile-peach p-4 text-left space-y-2.5"
                          >
                            <div className="flex items-start gap-2.5">
                              <AlertTriangle className="size-5 shrink-0 text-danger mt-0.5" />
                              <div className="flex-1 space-y-1">
                                <h4 className="font-bold text-tile-peach-ink text-sm sm:text-base">
                                  ไม่สามารถบันทึกสลิปได้ กรุณาลองใหม่อีกครั้ง
                                </h4>
                                <p className="text-xs sm:text-sm font-medium text-tile-peach-ink leading-relaxed">
                                  {submissionError}
                                </p>
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-2 pt-1 border-t border-line">
                              <button
                                type="button"
                                onClick={() => void handleConfirmGiving()}
                                disabled={isSubmitting}
                                className="btn-primary py-2 px-3 text-xs font-bold cursor-pointer"
                              >
                                {isSubmitting
                                  ? "กำลังส่งอีกครั้ง..."
                                  : "ลองส่งใหม่อีกครั้ง"}
                              </button>
                              {submitMode === "slip" && (
                                <button
                                  type="button"
                                  onClick={() => slipInputRef.current?.click()}
                                  className="btn-secondary py-2 px-3 text-xs font-bold cursor-pointer"
                                >
                                  เลือกรูปสลิปใหม่
                                </button>
                              )}
                              {submitMode === "slip" && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSlipPreview(null);
                                    setSubmissionError(null);
                                  }}
                                  className="rounded-xl border border-line bg-paper-2 px-3 py-2 text-xs font-bold text-ink hover:bg-surface cursor-pointer"
                                >
                                  ส่งแบบไม่แนบสลิปแทน
                                </button>
                              )}
                            </div>
                          </div>
                        )}

                        {isCompressing && (
                          <div className="flex items-center justify-center gap-2 rounded-xl bg-paper-2 border border-line p-3 text-xs font-bold text-ink">
                            <Loader2 className="size-4 animate-spin motion-reduce:animate-none text-brand" />
                            กำลังปรับขนาดรูปสลิปและบีบอัดให้เหมาะสม…
                          </div>
                        )}

                        {/* Donor Name Input */}
                        <div className="space-y-1">
                          <label
                            htmlFor="station-donor-name"
                            className="text-xs font-bold text-ink-2 block"
                          >
                            {submitMode === "no-slip"
                              ? "ชื่อผู้ถวาย (จำเป็น ต้องตรงกับชื่อบัญชีที่โอน)"
                              : "ชื่อผู้ถวาย (ไม่ระบุเพื่อถวายนิรนามได้)"}
                          </label>
                          <input
                            id="station-donor-name"
                            type="text"
                            maxLength={120}
                            value={donorName}
                            onChange={e => {
                              nameTouched.current = true;
                              setNameFromSlip(false);
                              setDonorNameInput(e.target.value);
                            }}
                            placeholder="เช่น สมชาย สุขใจ หรือ ผู้ถวายนิรนาม"
                            className="neo-input"
                          />
                          {nameFromSlip && (
                            <p className="text-xs font-semibold text-brand">
                              ชื่อจากสลิป (AI อ่านให้) แก้ไขได้
                            </p>
                          )}
                        </div>

                        {submitMode === "no-slip" && (
                          <div className="space-y-1">
                            <label
                              htmlFor="station-transfer-date"
                              className="text-xs font-bold text-ink-2 block"
                            >
                              วันที่โอนเงิน (จำเป็น)
                            </label>
                            <input
                              id="station-transfer-date"
                              type="date"
                              required
                              max={new Date().toLocaleDateString("sv-SE")}
                              value={transferDate}
                              onChange={e => setTransferDate(e.target.value)}
                              className="neo-input"
                            />
                          </div>
                        )}

                        {/* Unified Slip Media Action Area */}
                        <div className="rounded-xl border border-line bg-paper-2 p-3.5 space-y-2.5">
                          <input
                            ref={slipInputRef}
                            type="file"
                            accept="image/*,image/jpeg,image/png,image/webp,image/heic,image/heif"
                            aria-label="รูปสลิปการโอน"
                            onChange={e => void handleSlipFileChange(e)}
                            className="hidden"
                          />
                          <input
                            ref={slipCameraRef}
                            type="file"
                            accept="image/*"
                            capture="environment"
                            aria-label="ถ่ายรูปสลิปด้วยกล้อง"
                            onChange={e => void handleSlipFileChange(e)}
                            className="hidden"
                          />

                          <div className="text-xs font-bold text-ink-2">
                            {slipPreview
                              ? "รูปสลิปที่แนบไว้"
                              : canRecordDirectly
                                ? "แนบรูปสลิปการโอน (ถ้ามี)"
                                : "แนบรูปสลิปการโอน (แนะนำ ตรวจได้เร็วกว่า)"}
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={() => slipInputRef.current?.click()}
                              className="min-h-11 rounded-xl border border-dashed border-line hover:border-brand bg-surface hover:bg-ground p-2.5 text-center transition-colors cursor-pointer flex items-center justify-center gap-2 focus:outline-hidden focus-visible:ring-2 focus-visible:ring-brand"
                            >
                              <UploadCloud className="w-4 h-4 text-brand shrink-0" />
                              <span className="text-xs font-bold text-ink">
                                {slipPreview ? "เปลี่ยนรูปสลิป" : "เลือกรูปสลิป"}
                              </span>
                            </button>

                            <button
                              type="button"
                              onClick={() => slipCameraRef.current?.click()}
                              className="min-h-11 rounded-xl border border-line bg-surface hover:bg-ground p-2.5 text-center transition-colors cursor-pointer flex items-center justify-center gap-2 focus:outline-hidden focus-visible:ring-2 focus-visible:ring-brand"
                            >
                              <Camera
                                className="w-4 h-4 text-brand shrink-0"
                                aria-hidden="true"
                              />
                              <span className="text-xs font-bold text-ink">
                                ถ่ายรูปสลิปด้วยกล้อง
                              </span>
                            </button>
                          </div>

                          <p className="text-center text-xs text-ink-3">
                            ถ่ายสลิปให้เห็นยอดเงิน เลขบัญชี และวันที่ครบ วางบนพื้นเรียบ ไม่ให้เงาบัง
                          </p>

                          {slipPreview && slipReading.state === "reading" && (
                            <p
                              role="status"
                              className="flex items-center justify-center gap-2 text-xs font-bold text-ink-2 py-1"
                            >
                              <Loader2
                                className="w-4 h-4 animate-spin text-brand"
                                aria-hidden="true"
                              />
                              AI กำลังอ่านสลิป...
                            </p>
                          )}

                          {slipPreview && slipReading.state === "done" && (
                            <div
                              role="status"
                              className={`rounded-xl border border-line p-3 text-xs leading-relaxed ${
                                slipReading.data.status === "read"
                                  ? "bg-tile-mint text-tile-mint-ink"
                                  : "bg-tile-sand text-tile-sand-ink"
                              }`}
                            >
                              {slipReading.data.status === "read" ? (
                                <>
                                  <div className="font-extrabold">
                                    AI อ่านสลิปแล้ว ตรวจและแก้ไขได้
                                  </div>
                                  {slipReading.data.amount !== null && (
                                    <div>
                                      ยอดโอน {formatAmount(slipReading.data.amount)}{" "}
                                      บาท
                                      {amountFromSlip ? " (ใส่ยอดถวายให้แล้ว)" : ""}
                                    </div>
                                  )}
                                  {slipReading.data.amount !== null &&
                                    effectiveAmount !== null &&
                                    giveLines.length >= 2 &&
                                    slipReading.data.amount !== effectiveAmount && (
                                      <div className="font-extrabold text-tile-sand-ink">
                                        ยอดบนสลิปไม่ตรงกับยอดรวม{" "}
                                        {formatAmount(effectiveAmount)} บาท
                                        ปรับยอดแต่ละประเภทให้รวมเป็นยอดบนสลิป
                                      </div>
                                    )}
                                  {slipReading.data.senderName && (
                                    <div>
                                      ชื่อผู้โอน {slipReading.data.senderName}
                                    </div>
                                  )}
                                  {slipReading.data.transferDate && (
                                    <div>
                                      วันที่โอน {slipReading.data.transferDate}
                                    </div>
                                  )}
                                </>
                              ) : (
                                <>
                                  AI อ่านสลิปนี้ไม่ชัด กรอกข้อมูลเอง
                                  ระบบจะตรวจสลิปอีกครั้งหลังกดส่ง
                                </>
                              )}
                            </div>
                          )}

                          {slipPreview && (
                            <div className="pt-1 flex justify-center">
                              <img
                                src={slipPreview}
                                alt="สลิปที่แนบ"
                                className="max-h-36 rounded-lg border border-line object-contain"
                              />
                            </div>
                          )}
                        </div>

                        <SendChecklist items={checklist} />
                      </div>
                    </StationUnlockConfirmCard>
                  </div>
                </div>
              </div>
            )}

            {/* ── STEP 4: Completed State ── */}
            {shownStep === 4 &&
              submission &&
              (() => {
                const outcome = describeOutcome(submission);
                const toneColor =
                  outcome.tone === "success"
                    ? "text-income"
                    : outcome.tone === "warning"
                      ? "text-tile-sand-ink"
                      : "text-danger";
                const Icon =
                  outcome.tone === "success" ? CheckCircle2 : AlertTriangle;
                const slipAmount = outcome.slipAmount;
                return (
                  <div
                    role={outcome.tone === "error" ? "alert" : "status"}
                    className="rounded-2xl bg-surface border border-line p-6 text-center space-y-4"
                  >
                    <Icon
                      className={`w-8 h-8 mx-auto ${toneColor}`}
                      aria-hidden="true"
                    />

                    <div className="space-y-1.5">
                      <h3 className="display text-2xl text-ink">
                        {outcome.title}
                      </h3>
                      <p className="text-xs sm:text-sm font-medium text-ink-2 leading-relaxed">
                        {outcome.message}
                      </p>
                    </div>

                    {submission.mode === "slip" &&
                      submission.check &&
                      (submission.check.state === "in_review" ||
                        submission.check.state === "verified") && (
                        <div className="rounded-xl border border-line bg-tile-mint p-3 text-xs font-bold text-tile-mint-ink leading-relaxed">
                          ระบบได้รับสลิปของคุณเรียบร้อยแล้ว ไม่ต้องกดส่งซ้ำ
                          เหรัญญิกจะตรวจสอบและแจ้งผลให้ทราบ
                        </div>
                      )}

                    <div className="flex flex-col gap-2.5 pt-2">
                      {outcome.canRetry ? (
                        <>
                          {slipAmount !== null && (
                            <button
                              type="button"
                              onClick={() => retryWithSlipAmount(slipAmount)}
                              className="btn-primary w-full py-4 text-base cursor-pointer"
                            >
                              ใช้ยอด {formatAmount(slipAmount)} บาท
                              ตามสลิปแล้วส่งใหม่
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={retryWithOtherSlip}
                            className="btn-secondary w-full py-3 text-xs cursor-pointer"
                          >
                            เปลี่ยนรูปสลิป (ยอดเดิม{" "}
                            {formatAmount(submission.amount)} บาท)
                          </button>
                          <button
                            type="button"
                            onClick={resetFlow}
                            className="btn-secondary w-full py-3 text-xs cursor-pointer"
                          >
                            เริ่มใหม่ทั้งหมด
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={resetFlow}
                          className="btn-primary w-full py-4 text-sm cursor-pointer"
                        >
                          ทำรายการถวายใหม่อีกครั้ง
                        </button>
                      )}
                      {canRecordDirectly && !outcome.canRetry && (
                        <button
                          type="button"
                          onClick={() => setLocation("/offerings")}
                          className="btn-secondary w-full py-3 text-xs cursor-pointer"
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
            TAB 2: PRINTABLE QR STANDEE POSTER
           ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "poster" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Poster Customizer (Hidden when printing) */}
          <div className="lg:col-span-5 bento-card-static p-6 space-y-5 print:hidden">
            <div className="flex items-center justify-between border-b border-line pb-4">
              <div>
                <h3 className="display text-base text-ink flex items-center gap-2">
                  <QrCode className="w-4 h-4 text-brand" />
                  <span>ปรับแต่งป้าย QR Code หน้าห้อง</span>
                </h3>
                <p className="text-xs font-medium text-ink-3 mt-0.5">
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
                    className="font-extrabold text-ink-2 block"
                  >
                    ชื่อแบรนด์ (สีขาว)
                  </label>
                  <input
                    id="poster-posterBrandPrefix"
                    type="text"
                    value={posterBrandPrefix}
                    onChange={e => setPosterBrandPrefix(e.target.value)}
                    className="neo-input font-bold"
                  />
                </div>
                <div className="space-y-1">
                  <label
                    htmlFor="poster-posterBrandHighlight"
                    className="font-extrabold text-ink-2 block"
                  >
                    ชื่อแบรนด์ (สีส้ม)
                  </label>
                  <input
                    id="poster-posterBrandHighlight"
                    type="text"
                    value={posterBrandHighlight}
                    onChange={e => setPosterBrandHighlight(e.target.value)}
                    className="neo-input font-bold text-brand"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label
                    htmlFor="poster-posterHeadlineWhite"
                    className="font-extrabold text-ink-2 block"
                  >
                    หัวข้อหลัก (สีขาว)
                  </label>
                  <input
                    id="poster-posterHeadlineWhite"
                    type="text"
                    value={posterHeadlineWhite}
                    onChange={e => setPosterHeadlineWhite(e.target.value)}
                    className="neo-input font-bold"
                  />
                </div>
                <div className="space-y-1">
                  <label
                    htmlFor="poster-posterHeadlineOrange"
                    className="font-extrabold text-ink-2 block"
                  >
                    หัวข้อเน้น (สีส้ม)
                  </label>
                  <input
                    id="poster-posterHeadlineOrange"
                    type="text"
                    value={posterHeadlineOrange}
                    onChange={e => setPosterHeadlineOrange(e.target.value)}
                    className="neo-input font-bold text-brand"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="poster-posterScanPrompt"
                  className="font-extrabold text-ink-2 block"
                >
                  ข้อความเหนือ QR Code
                </label>
                <input
                  id="poster-posterScanPrompt"
                  type="text"
                  value={posterScanPrompt}
                  onChange={e => setPosterScanPrompt(e.target.value)}
                  className="neo-input font-semibold"
                />
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="poster-posterQrValue"
                  className="font-extrabold text-ink-2 block"
                >
                  ลิงก์สำหรับสร้าง QR Code (เช่น ลิงก์ LINE OA หรือหน้าถวาย)
                </label>
                <input
                  id="poster-posterQrValue"
                  type="text"
                  value={posterQrValue}
                  maxLength={500}
                  onChange={e => setPosterQrValue(e.target.value)}
                  className="neo-input font-mono text-xs"
                />
              </div>

              {/* Upload Custom QR Image */}
              <div className="space-y-1.5">
                <span
                  id="poster-qr-image-label"
                  className="font-extrabold text-ink-2 block"
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
                    className="flex-1 py-2.5 px-3 rounded-xl border border-dashed border-line bg-paper-2 hover:bg-ground text-brand font-extrabold flex items-center justify-center gap-1.5 cursor-pointer focus:outline-hidden focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
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
                      className="px-3 py-2.5 rounded-xl border border-danger/30 text-danger font-extrabold hover:bg-danger/10 cursor-pointer"
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
                    className="font-extrabold text-ink-2 block"
                  >
                    ป้ายตรงกลาง QR
                  </label>
                  <input
                    id="poster-posterCenterBadge"
                    type="text"
                    value={posterCenterBadge}
                    onChange={e => setPosterCenterBadge(e.target.value)}
                    className="neo-input font-bold"
                  />
                </div>
                <div className="space-y-1">
                  <label
                    htmlFor="poster-posterQrCaption"
                    className="font-extrabold text-ink-2 block"
                  >
                    ข้อความใต้กรอบ QR
                  </label>
                  <input
                    id="poster-posterQrCaption"
                    type="text"
                    value={posterQrCaption}
                    onChange={e => setPosterQrCaption(e.target.value)}
                    className="neo-input font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label
                    htmlFor="poster-posterFooterWhite"
                    className="font-extrabold text-ink-2 block"
                  >
                    ข้อความท้ายป้าย (ขาว)
                  </label>
                  <input
                    id="poster-posterFooterWhite"
                    type="text"
                    value={posterFooterWhite}
                    onChange={e => setPosterFooterWhite(e.target.value)}
                    className="neo-input font-bold"
                  />
                </div>
                <div className="space-y-1">
                  <label
                    htmlFor="poster-posterFooterOrange"
                    className="font-extrabold text-ink-2 block"
                  >
                    ข้อความท้ายป้าย (ส้ม)
                  </label>
                  <input
                    id="poster-posterFooterOrange"
                    type="text"
                    value={posterFooterOrange}
                    onChange={e => setPosterFooterOrange(e.target.value)}
                    className="neo-input font-bold text-brand"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="poster-posterFooterSub"
                  className="font-extrabold text-ink-2 block"
                >
                  คำอธิบายท้ายป้าย
                </label>
                <input
                  id="poster-posterFooterSub"
                  type="text"
                  value={posterFooterSub}
                  onChange={e => setPosterFooterSub(e.target.value)}
                  className="neo-input font-semibold"
                />
              </div>
            </div>

            {canSavePoster && (
              <div className="pt-3 border-t border-line flex flex-col sm:flex-row gap-2.5">
                <button
                  type="button"
                  onClick={savePoster}
                  disabled={savePosterMutation.isPending}
                  className="btn-primary flex-1 py-3 px-4 text-sm cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>
                    {savePosterMutation.isPending
                      ? "กำลังบันทึก…"
                      : "บันทึกข้อความป้าย"}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => applyPoster(DEFAULT_STATION_POSTER)}
                  className="btn-secondary py-3 px-4 text-sm cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>ค่าเริ่มต้น</span>
                </button>
              </div>
            )}

            <div className="pt-3 border-t border-line space-y-2.5">
              <p className="font-extrabold text-ink-2 text-xs flex items-center gap-1.5">
                <Share2 className="w-3.5 h-3.5 text-brand" />
                <span>แชร์ลิงก์ถวาย (LINE, Facebook และอื่นๆ)</span>
              </p>
              <input
                readOnly
                aria-label="ลิงก์ถวาย"
                value={givingLink}
                onFocus={e => e.currentTarget.select()}
                className="neo-input font-mono text-xs"
              />
              {liffLink && (
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold text-ink-3">
                    ลิงก์สำหรับ LINE: เปิดในแอป LINE และเข้าสู่ระบบให้อัตโนมัติ
                    ใช้กับ Rich Menu และข้อความในแชต
                  </p>
                  <div className="flex gap-2">
                    <input
                      readOnly
                      aria-label="ลิงก์สำหรับ LINE"
                      value={liffLink}
                      onFocus={e => e.currentTarget.select()}
                      className="neo-input min-w-0 flex-1 font-mono text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => void copyLink(liffLink)}
                      className="btn-secondary shrink-0 py-2 px-3 text-xs cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>คัดลอก</span>
                    </button>
                  </div>
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void copyLink(givingLink)}
                  className="btn-secondary py-2 px-3 text-xs cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>คัดลอกลิงก์</span>
                </button>
                <a
                  href={`https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(lineShareLink)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center py-2 px-3 rounded-xl border border-line bg-line-brand text-black font-extrabold text-xs"
                >
                  ส่งทาง LINE
                </a>
                <a
                  href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(givingLink)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center py-2 px-3 rounded-xl border border-line bg-[var(--social-facebook)] text-white font-extrabold text-xs"
                >
                  แชร์ Facebook
                </a>
                {canNativeShare && (
                  <button
                    type="button"
                    onClick={nativeShare}
                    className="btn-secondary py-2 px-3 text-xs cursor-pointer"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>แชร์ผ่านแอปอื่น</span>
                  </button>
                )}
              </div>
            </div>

            <div className="pt-3 border-t border-line space-y-2.5">
              <p className="text-xs font-extrabold text-ink-2">
                บันทึกหรือพิมพ์โปสเตอร์
              </p>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() =>
                    void exportPoster({ kind: "save", type: "png" })
                  }
                  disabled={!posterHasQr || posterBusy}
                  className="btn-secondary min-h-11 text-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Download className="w-4 h-4" />
                  <span>บันทึกเป็น PNG</span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    void exportPoster({ kind: "save", type: "jpeg" })
                  }
                  disabled={!posterHasQr || posterBusy}
                  className="btn-secondary min-h-11 text-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Download className="w-4 h-4" />
                  <span>บันทึกเป็น JPG</span>
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() =>
                    void exportPoster({ kind: "print", paper: "A5" })
                  }
                  disabled={!posterHasQr || posterBusy}
                  className="btn-primary min-h-11 text-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Printer className="w-4 h-4" />
                  <span>พิมพ์ A5 (1 หน้า)</span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    void exportPoster({ kind: "print", paper: "A4" })
                  }
                  disabled={!posterHasQr || posterBusy}
                  className="btn-secondary min-h-11 text-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Printer className="w-4 h-4" />
                  <span>พิมพ์ A4 (1 หน้า)</span>
                </button>
              </div>
              {posterFile && (
                <div className="rounded-xl border border-line bg-paper-2 p-3 space-y-2.5">
                  <img
                    src={posterFile.dataUrl}
                    alt="ตัวอย่างโปสเตอร์ที่บันทึก"
                    className="mx-auto max-h-64 w-auto rounded-lg"
                  />
                  <p className="text-xs font-medium text-ink-3">
                    ถ้าไม่พบไฟล์ในเครื่อง กดปุ่มดาวน์โหลดด้านล่าง
                    หรือกดค้างที่รูปแล้วเลือกบันทึกรูป
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <a
                      href={posterFile.url}
                      download={posterFile.name}
                      className="btn-primary min-h-11 px-4 text-sm"
                    >
                      <Download className="w-4 h-4" />
                      <span>ดาวน์โหลด {posterFile.name}</span>
                    </a>
                    {canShareImage(posterFile.blob, posterFile.name) && (
                      <button
                        type="button"
                        onClick={() =>
                          void shareImage(
                            posterFile.blob,
                            posterFile.name
                          ).catch(() => undefined)
                        }
                        className="btn-secondary min-h-11 px-4 text-sm cursor-pointer"
                      >
                        <Share2 className="w-4 h-4" />
                        <span>แชร์ / บันทึกรูป</span>
                      </button>
                    )}
                  </div>
                </div>
              )}
              {posterBusy && (
                <p role="status" className="text-xs font-medium text-ink-3">
                  กำลังสร้างรูปโปสเตอร์...
                </p>
              )}
              {!posterHasQr && (
                <p className="text-xs font-medium text-ink-3">
                  ใส่ลิงก์หรืออัปโหลดรูป QR Code ก่อนบันทึกหรือพิมพ์
                </p>
              )}
            </div>
          </div>

          {/* Right Column: Live Poster Preview (Full width on print) */}
          <div className="lg:col-span-7 flex flex-col items-center justify-center">
            <div ref={posterRef} className="w-full max-w-md">
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
      title="จุดถวายทรัพย์อัตโนมัติ & ป้าย QR"
      subtitle="ระบบถวายทรัพย์บริการตนเองสไตล์โมเดิร์น (สแกน -> เลือกยอด -> โอน/แนบสลิป -> ยืนยัน) พร้อมป้าย QR สำหรับพิมพ์ติดหน้าห้อง"
      action={
        <div className="flex flex-wrap items-center gap-2 print:hidden">
          <button
            type="button"
            onClick={() => setLocation("/offerings")}
            className="btn-secondary min-h-11 px-3.5 py-2 text-xs"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>กลับหน้าถวายทรัพย์</span>
          </button>
          <button
            type="button"
            onClick={() =>
              setActiveTab(activeTab === "flow" ? "poster" : "flow")
            }
            className="btn-primary min-h-11 px-4 py-2 text-xs cursor-pointer"
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
    checking: {
      label: "กำลังตรวจสอบ",
      cls: "border border-line bg-paper-2 text-ink",
    },
    verified: {
      label: "ยอดตรง รอเหรัญญิก",
      cls: "border border-line bg-tile-mint text-tile-mint-ink",
    },
    in_review: {
      label: "รอเหรัญญิก",
      cls: "border border-line bg-tile-sand text-tile-sand-ink",
    },
    rejected: {
      label: "ไม่ผ่าน",
      cls: "border border-line bg-tile-peach text-tile-peach-ink",
    },
    duplicate: {
      label: "สลิปซ้ำ",
      cls: "border border-line bg-tile-sand text-tile-sand-ink",
    },
    approved: {
      label: "บันทึกแล้ว",
      cls: "border border-line bg-tile-mint text-tile-mint-ink",
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
      className="rounded-2xl bg-surface border border-line p-4 space-y-2.5"
    >
      <h3 className="text-xs font-extrabold text-ink-2">
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
                <div className="font-extrabold text-ink truncate">
                  {item.declaredCategory
                    ? offeringCategoryLabel(item.declaredCategory)
                    : "ถวาย"}
                  {item.declaredAmount !== null &&
                    ` · ${formatAmount(item.declaredAmount)} บาท`}
                </div>
                <div className="font-medium text-ink-3">
                  {formatThaiDateTime(new Date(item.createdAt))}
                </div>
              </div>
              <span
                className={`shrink-0 rounded-full px-2.5 py-0.5 font-extrabold ${style.cls}`}
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
      className="rounded-xl bg-paper-2 border border-line p-3 space-y-2"
    >
      <h4 className="text-xs font-extrabold text-ink-2">ตรวจรายการก่อนส่ง</h4>
      <ul className="space-y-1.5">
        {items.map(item => (
          <li key={item.id} className="flex items-start gap-2 text-xs">
            {item.ok ? (
              <CheckCircle2
                className="mt-0.5 size-4 shrink-0 text-income"
                aria-label="ผ่าน"
              />
            ) : (
              <AlertTriangle
                className="mt-0.5 size-4 shrink-0 text-tile-sand-ink"
                aria-label="ยังไม่ผ่าน"
              />
            )}
            <div className="min-w-0">
              <span className="font-extrabold text-ink">{item.label}: </span>
              <span
                className={
                  item.ok
                    ? "font-medium text-ink-2"
                    : "font-bold text-tile-sand-ink"
                }
              >
                {item.detail}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
