import { useState, useRef } from "react";
import { friendlyErrorMessage } from "@/lib/errors";
import { formatAmount, formatBaht, THAI_LOCALE } from "@/lib/format";
import { prepareSlipImage, SlipFileError } from "@/lib/slipImage";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Swal } from "@/lib/sweetalert";
import { formToast } from "@/lib/formFeedback";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  Inbox,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ExternalLink,
  Calendar,
  CreditCard,
  Copy,
  RefreshCw,
  Search,
  Check,
  ShieldAlert,
  Link2,
  UploadCloud,
  QrCode,
  BookOpen,
  Image as ImageIcon,
  X,
  Loader2,
  ZoomIn,
  ZoomOut,
  ArrowLeft,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  OFFERING_CATEGORIES,
  isOfferingCategory,
  offeringCategoryLabel,
  type OfferingCategory,
} from "@shared/categories";
import { SplitEditor } from "@/components/giving/SplitEditor";
import {
  draftsProblem,
  parseDrafts,
  startSplit,
  type SplitDraft,
} from "@/lib/splitDraft";
import { SPLIT_MESSAGE } from "@shared/givingSplit";
import { NativeSelect } from "@/components/ui/native-select";

const TOAST_KEY = "giving-inbox";

type InboxStatus =
  | "all"
  | "needs_review"
  | "matched"
  | "extracted"
  | "pending"
  | "duplicate"
  | "approved"
  | "rejected"
  | "failed";

const STATUS_LABELS: Record<
  string,
  { text: string; bg: string; textCol: string; border: string }
> = {
  pending: {
    text: "รอดึงข้อมูล",
    bg: "bg-paper-2",
    textCol: "text-ink-2",
    border: "border-line",
  },
  processing: {
    text: "กำลังอ่านสลิป",
    bg: "bg-tile-sand",
    textCol: "text-tile-sand-ink",
    border: "border-line",
  },
  extracted: {
    text: "อ่านข้อมูลแล้ว",
    bg: "bg-paper-2",
    textCol: "text-ink",
    border: "border-line",
  },
  needs_review: {
    text: "ต้องตรวจสอบ",
    bg: "bg-tile-sand",
    textCol: "text-tile-sand-ink",
    border: "border-line",
  },
  matched: {
    text: "พร้อมอนุมัติ",
    bg: "bg-tile-mint",
    textCol: "text-tile-mint-ink",
    border: "border-line",
  },
  duplicate: {
    text: "สลิปซ้ำ",
    bg: "bg-danger/10",
    textCol: "text-danger",
    border: "border-danger/30",
  },
  approved: {
    text: "อนุมัติแล้ว",
    bg: "bg-tile-mint",
    textCol: "text-tile-mint-ink",
    border: "border-line",
  },
  rejected: {
    text: "ปฏิเสธ",
    bg: "bg-danger/10",
    textCol: "text-danger",
    border: "border-danger/30",
  },
  failed: {
    text: "อ่านสลิปล้มเหลว",
    bg: "bg-danger/10",
    textCol: "text-danger",
    border: "border-danger/30",
  },
};

export default function GivingInbox() {
  const [, setLocation] = useLocation();
  const [selectedStatus, setSelectedStatus] =
    useState<InboxStatus>("needs_review");
  const [selectedSlipId, setSelectedSlipId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isZoomed, setIsZoomed] = useState(false);

  // Modals
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showLineInfoModal, setShowLineInfoModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  // Upload Form State
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [uploadDonorName, setUploadDonorName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const utils = trpc.useUtils();

  // Queries
  const statsQuery = trpc.givingInbox.stats.useQuery(undefined, {
    refetchInterval: 10000,
  });

  const slipsQuery = trpc.givingInbox.list.useQuery({
    status: selectedStatus,
    limit: 100,
  });

  const selectedSlipQuery = trpc.givingInbox.getById.useQuery(
    { id: selectedSlipId ?? 0 },
    { enabled: !!selectedSlipId }
  );

  const fundsQuery = trpc.finance.accounts.useQuery();
  const membersQuery = trpc.members.list.useQuery();

  // Mutations
  const approveMutation = trpc.givingInbox.approve.useMutation({
    onSuccess: () => {
      formToast.success(TOAST_KEY, "อนุมัติและบันทึกเงินถวายเรียบร้อยแล้ว");
      utils.givingInbox.invalidate();
      utils.finance.invalidate();

      // Auto-advance to next slip
      const currentList = slipsQuery.data ?? [];
      const currentIndex = currentList.findIndex(s => s.id === selectedSlipId);
      if (currentIndex >= 0 && currentIndex < currentList.length - 1) {
        handleSelectSlip(currentList[currentIndex + 1]);
      } else {
        setSelectedSlipId(null);
      }
    },
    onError: err => {
      const msg = err.message || "เกิดข้อผิดพลาดในการอนุมัติสลิป";
      if (msg.includes("ได้รับการอนุมัติไปแล้ว") || msg.includes("CONFLICT")) {
        Swal.warning(
          "รายการถูกดำเนินการแล้ว",
          "สลิปนี้ได้รับการอนุมัติโดยเจ้าหน้าที่ท่านอื่นไปแล้ว ระบบกำลังรีเฟรชข้อมูลล่าสุด"
        );
        utils.givingInbox.invalidate();
        utils.finance.invalidate();
        setSelectedSlipId(null);
      } else {
        Swal.error("เกิดข้อผิดพลาด", msg);
      }
    },
  });

  const rejectMutation = trpc.givingInbox.reject.useMutation({
    onSuccess: () => {
      formToast.success(TOAST_KEY, "ปฏิเสธสลิปเรียบร้อยแล้ว");
      utils.givingInbox.invalidate();
      setShowRejectModal(false);
      setRejectReason("");

      // Auto-advance to next slip
      const currentList = slipsQuery.data ?? [];
      const currentIndex = currentList.findIndex(s => s.id === selectedSlipId);
      if (currentIndex >= 0 && currentIndex < currentList.length - 1) {
        handleSelectSlip(currentList[currentIndex + 1]);
      } else {
        setSelectedSlipId(null);
      }
    },
    onError: err => {
      const msg = err.message || "เกิดข้อผิดพลาดในการปฏิเสธสลิป";
      if (msg.includes("อนุมัติ") || msg.includes("CONFLICT")) {
        formToast.error(
          TOAST_KEY,
          "สลิปนี้ได้รับการดำเนินการแล้ว ระบบกำลังอัปเดตข้อมูลล่าสุด"
        );
        utils.givingInbox.invalidate();
        setShowRejectModal(false);
      } else {
        Swal.error("เกิดข้อผิดพลาด", msg);
      }
    },
  });

  const uploadSlipMutation = trpc.givingInbox.uploadSlip.useMutation({
    onSuccess: data => {
      formToast.success(
        TOAST_KEY,
        "อัปโหลดสลิปสำเร็จ! ระบบกำลังดึงข้อมูลด้วย AI"
      );
      utils.givingInbox.invalidate();
      setShowUploadModal(false);
      setUploadPreview(null);
      setUploadDonorName("");
      setSelectedStatus("all");
      setSelectedSlipId(data.slipId);
    },
    onError: err => {
      Swal.error("อัปโหลดไม่สำเร็จ", err.message);
    },
  });

  const linkMemberMutation = trpc.givingInbox.linkMember.useMutation({
    onSuccess: () => {
      formToast.success(
        TOAST_KEY,
        "เชื่อมโยงสมาชิกกับ LINE สำเร็จ สลิปอื่นๆ จะถูกจับคู่อัตโนมัติ"
      );
      utils.givingInbox.invalidate();
      utils.members.invalidate();
    },
    onError: err => {
      formToast.error(TOAST_KEY, friendlyErrorMessage(err));
    },
  });

  const rescanMutation = trpc.givingInbox.rescan.useMutation({
    onSuccess: () => {
      formToast.success(TOAST_KEY, "AI สแกนและสกัดข้อมูลสลิปเรียบร้อยแล้ว");
      utils.givingInbox.invalidate();
    },
    onError: err => {
      formToast.error(
        TOAST_KEY,
        friendlyErrorMessage(err, "ไม่สามารถสแกนสลิปได้")
      );
    },
  });

  const drainWorkerMutation = trpc.givingInbox.drainWorker.useMutation({
    onSuccess: data => {
      utils.givingInbox.invalidate();
      if (data && data.processed > 0) {
        formToast.success(
          TOAST_KEY,
          `ประมวลผลสลิปในคิวสำเร็จ ${data.processed} รายการ`
        );
      } else {
        formToast.success(TOAST_KEY, "รีเฟรชข้อมูลล่าสุดเรียบร้อยแล้ว");
      }
    },
    onError: () => {
      utils.givingInbox.invalidate();
    },
  });

  const handleRescan = (id: number) => {
    rescanMutation.mutate({ id });
  };

  // Local edit form state when viewing detail
  const currentSlip = selectedSlipQuery.data;
  const [editAmount, setEditAmount] = useState<string>("");
  const [editFundId, setEditFundId] = useState<number | undefined>(undefined);
  const [editCategory, setEditCategory] = useState<OfferingCategory>("cash");
  const [editMemberId, setEditMemberId] = useState<number | null>(null);
  const [memberSearch, setMemberSearch] = useState<string>("");
  const [editReviewNote, setEditReviewNote] = useState<string>("");
  // The name that goes in the books. Prefilled from the slip, the treasurer may fix it.
  const [editDonorName, setEditDonorName] = useState<string>("");
  // An entry without a slip needs this ticked before it can be approved.
  const [confirmBank, setConfirmBank] = useState<boolean>(false);
  // Set when one transfer is split over several categories. Null: one category.
  const [editSplit, setEditSplit] = useState<SplitDraft[] | null>(null);

  const handleSelectSlip = (slip: any) => {
    setSelectedSlipId(slip.id);
    setEditAmount(
      slip.approvedAmount ||
        slip.extractedAmount ||
        (slip.source === "no_slip" ? slip.declaredAmount : "") ||
        ""
    );
    setEditDonorName(
      slip.matchedMemberName ||
        slip.extractedSenderName ||
        slip.typedDonorName ||
        slip.submittedByName ||
        slip.lineDisplayName ||
        ""
    );
    setConfirmBank(false);
    // The donor's own split, if the transfer pays for several categories.
    const declared = Array.isArray(slip.declaredItems)
      ? (slip.declaredItems as Array<{ category: string; amount: number }>)
      : [];
    setEditSplit(
      declared.length >= 2 &&
        declared.every(d => isOfferingCategory(d.category))
        ? declared.map(d => ({
            category: d.category as OfferingCategory,
            amount: String(d.amount),
          }))
        : null
    );
    // Fund and category are the donor's suggestion. The amount is not
    // prefilled from it: staff read the amount off the slip image.
    setEditFundId(
      slip.fundId ||
        slip.declaredFundId ||
        (fundsQuery.data?.[0]?.id ?? undefined)
    );
    setEditCategory(
      slip.declaredCategory && isOfferingCategory(slip.declaredCategory)
        ? slip.declaredCategory
        : "cash"
    );
    setEditMemberId(slip.matchedMemberId || null);
    setMemberSearch("");
    setEditReviewNote(slip.reviewNote || "");

    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleApprove = async () => {
    if (!currentSlip) return;
    const amountNum = parseFloat(editAmount);
    if (!amountNum || amountNum <= 0) {
      Swal.error("ยอดเงินไม่ถูกต้อง", "กรุณาระบุจำนวนเงินที่มากกว่า 0 บาท");
      return;
    }
    if (!editFundId) {
      Swal.error(
        "ยังไม่ได้เลือกกองทุน",
        "กรุณาเลือกบัญชีกองทุนที่ต้องการนำเงินเข้า"
      );
      return;
    }

    if (editSplit) {
      const problem = draftsProblem(editSplit, amountNum);
      if (problem) {
        Swal.error("แบ่งยอดไม่ถูกต้อง", SPLIT_MESSAGE[problem]);
        return;
      }
    }

    if (currentSlip.source === "no_slip" && !confirmBank) {
      Swal.error(
        "ยังไม่ได้ยืนยันการตรวจ",
        "รายการนี้ไม่มีสลิป กรุณาตรวจกับยอดเข้าบัญชีธนาคารแล้วติ๊กยืนยันก่อนอนุมัติ"
      );
      return;
    }

    const confirmed = await Swal.confirm(
      "ยืนยันการอนุมัติการถวาย",
      `คุณกำลังจะอนุมัติเงินถวายจำนวน ${formatBaht(amountNum)} จาก ${
        editDonorName.trim() || "ผู้ถวาย"
      } เข้ากองทุนที่เลือก`,
      "อนุมัติและบันทึก"
    );

    if (!confirmed) return;

    approveMutation.mutate({
      slipId: currentSlip.id,
      amount: amountNum,
      fundId: editFundId,
      category: editCategory,
      items: editSplit ? parseDrafts(editSplit) : undefined,
      memberId: editMemberId,
      donorName: editDonorName.trim() || undefined,
      reviewNote: editReviewNote,
      confirmedBankCheck: confirmBank,
      receiptDate: currentSlip.extractedDate
        ? new Date(currentSlip.extractedDate)
        : currentSlip.declaredDate
          ? new Date(currentSlip.declaredDate)
          : new Date(),
    });
  };

  const handleQuickApprove = async (e: React.MouseEvent, slip: any) => {
    e.stopPropagation();
    // An entry without a slip is never approved in one tap. Open it to check.
    if (
      slip.source === "no_slip" ||
      (Array.isArray(slip.declaredItems) && slip.declaredItems.length >= 2)
    ) {
      handleSelectSlip(slip);
      return;
    }
    const amountNum = parseFloat(slip.extractedAmount || "0");
    const targetFundId =
      slip.fundId || slip.declaredFundId || fundsQuery.data?.[0]?.id;
    const targetFundName =
      fundsQuery.data?.find(f => f.id === targetFundId)?.name ||
      fundsQuery.data?.[0]?.name ||
      "กองทุนหลัก";

    if (!amountNum || amountNum <= 0 || !targetFundId) {
      handleSelectSlip(slip);
      return;
    }

    const confirmed = await Swal.confirm(
      "อนุมัติด่วน?",
      `อนุมัติเงินถวาย ${formatBaht(amountNum)} จาก ${
        slip.matchedMemberName || slip.extractedSenderName
      } เข้า ${targetFundName}`,
      "อนุมัติทันที"
    );

    if (!confirmed) return;

    approveMutation.mutate({
      slipId: slip.id,
      amount: amountNum,
      fundId: targetFundId,
      category:
        slip.declaredCategory && isOfferingCategory(slip.declaredCategory)
          ? slip.declaredCategory
          : "cash",
      memberId: slip.matchedMemberId,
      donorName:
        slip.matchedMemberName ||
        slip.extractedSenderName ||
        slip.typedDonorName ||
        undefined,
      receiptDate: slip.extractedDate
        ? new Date(slip.extractedDate)
        : new Date(),
    });
  };

  const handleOpenReject = () => {
    if (!currentSlip) return;
    setRejectReason("");
    setShowRejectModal(true);
  };

  const handleConfirmReject = () => {
    if (!currentSlip) return;
    const finalReason =
      rejectReason.trim() || "ข้อมูลไม่ถูกต้องหรือไม่ตรงตามเงื่อนไข";
    rejectMutation.mutate({
      slipId: currentSlip.id,
      reason: finalReason,
    });
  };

  const handleLinkMember = () => {
    if (!currentSlip?.lineUserId || !editMemberId) {
      formToast.error(TOAST_KEY, "กรุณาเลือกสมาชิกก่อนเชื่อมโยง");
      return;
    }
    linkMemberMutation.mutate({
      lineUserId: currentSlip.lineUserId,
      memberId: editMemberId,
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target;
    const file = input.files?.[0];
    input.value = "";
    if (!file) return;
    try {
      setUploadPreview(await prepareSlipImage(file));
    } catch (err) {
      formToast.error(
        TOAST_KEY,
        err instanceof SlipFileError ? err.message : "แนบรูปสลิปไม่สำเร็จ"
      );
    }
  };

  const handleUploadSubmit = () => {
    if (!uploadPreview) {
      formToast.error(TOAST_KEY, "กรุณาเลือกรูปภาพสลิป");
      return;
    }

    uploadSlipMutation.mutate({
      base64Data: uploadPreview,
      donorName: uploadDonorName.trim() || undefined,
    });
  };

  const filteredSlips = (slipsQuery.data ?? []).filter(slip => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      slip.lineDisplayName?.toLowerCase().includes(q) ||
      slip.extractedSenderName?.toLowerCase().includes(q) ||
      slip.matchedMemberName?.toLowerCase().includes(q) ||
      slip.typedDonorName?.toLowerCase().includes(q) ||
      slip.submittedByName?.toLowerCase().includes(q) ||
      slip.extractedRef?.toLowerCase().includes(q) ||
      String(slip.extractedAmount ?? "").includes(q) ||
      String(slip.declaredAmount ?? "").includes(q)
    );
  });

  const stats = statsQuery.data as any;
  const totalSlips = stats?.total ?? 0;

  return (
    <AppLayout
      activeRoute="/giving/inbox"
      title="ตรวจสลิป LINE"
      subtitle="ตรวจสอบและอนุมัติสลิปการถวายจาก LINE Official Account ด้วย AI"
      action={
        <div className="flex flex-wrap items-center gap-2">
          {/* Navigation to Offerings Book */}
          <button
            type="button"
            onClick={() => setLocation("/offerings")}
            className="btn-secondary min-h-10 px-3.5 py-2 text-xs flex items-center gap-1.5 cursor-pointer"
            title="ดูสมุดบัญชีเงินถวายที่อนุมัติแล้ว"
          >
            <BookOpen className="w-3.5 h-3.5 text-ink-2" />
            <span className="hidden sm:inline">สมุดบัญชีถวาย</span>
          </button>

          {/* LINE Info Modal */}
          <button
            type="button"
            onClick={() => setShowLineInfoModal(true)}
            aria-label="LINE บอท"
            className="btn-secondary min-h-10 px-3.5 py-2 text-xs flex items-center gap-1.5 cursor-pointer"
            title="ข้อมูลการเชื่อมต่อ LINE และ QR Code"
          >
            <QrCode className="w-3.5 h-3.5 text-ink-2" aria-hidden="true" />
            <span>LINE บอท</span>
          </button>

          {/* Giving Station / Poster shortcut */}
          <button
            type="button"
            onClick={() => setLocation("/giving/station")}
            aria-label="ป้าย QR หน้าห้อง"
            className="btn-secondary min-h-10 px-3.5 py-2 text-xs flex items-center gap-1.5 cursor-pointer"
            title="เปิดป้าย QR Code สำหรับติดหน้าห้องและหน้าถวายอัตโนมัติ"
          >
            <QrCode className="w-3.5 h-3.5 text-ink-2" aria-hidden="true" />
            <span>
              ป้าย QR<span className="hidden sm:inline"> หน้าห้อง</span>
            </span>
          </button>

          {/* Primary CTA: Upload Slip */}
          <button
            type="button"
            onClick={() => setShowUploadModal(true)}
            className="btn-primary min-h-10 px-4 py-2 text-xs flex items-center gap-1.5 cursor-pointer"
          >
            <UploadCloud className="w-4 h-4" />
            <span>อัปโหลดสลิป</span>
          </button>

          {/* Refresh Utility */}
          <button
            type="button"
            onClick={() => drainWorkerMutation.mutate()}
            disabled={drainWorkerMutation.isPending}
            className="btn-secondary min-h-10 p-2.5 cursor-pointer"
            title="รีเฟรชข้อมูลและประมวลผลคิวสลิป"
            aria-label="รีเฟรชข้อมูลล่าสุด"
          >
            <RefreshCw
              className={`w-4 h-4 ${drainWorkerMutation.isPending ? "animate-spin text-brand" : "text-ink-2"}`}
            />
          </button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* ── Status Queue Filter Bar: Flat 1px border cards with tabular counts ── */}
        <div
          role="group"
          aria-label="กรองสลิปตามสถานะ"
          className="rounded-2xl border border-line bg-surface p-1.5 grid grid-cols-2 sm:grid-cols-5 gap-1.5"
        >
          {(
            [
              {
                id: "needs_review",
                label: "ต้องตรวจสอบ",
                value: stats?.needs_review ?? 0,
                tone: "text-brand",
              },
              {
                id: "matched",
                label: "พร้อมอนุมัติ",
                value: stats?.matched ?? 0,
                tone: "text-ink",
              },
              {
                id: "duplicate",
                label: "สลิปซ้ำ",
                value: stats?.duplicate ?? 0,
                tone: (stats?.duplicate ?? 0) > 0 ? "text-danger" : "text-ink",
              },
              {
                id: "approved",
                label: "อนุมัติแล้ว",
                value: stats?.approved ?? 0,
                tone: "text-ink",
              },
              {
                id: "all",
                label: "สลิปทั้งหมด",
                value: stats?.total ?? 0,
                tone: "text-ink",
              },
            ] as const
          ).map((tab, i) => {
            const active = selectedStatus === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                aria-pressed={active}
                onClick={() => {
                  setSelectedStatus(tab.id);
                  if (
                    typeof window !== "undefined" &&
                    window.innerWidth < 1024
                  ) {
                    setSelectedSlipId(null);
                  }
                }}
                className={`min-h-11 px-3.5 py-2.5 rounded-xl text-left transition-colors cursor-pointer ${
                  active
                    ? "border border-brand/40 bg-accent text-accent-foreground"
                    : "hover:bg-paper-2 text-ink-2"
                } ${i === 4 ? "col-span-2 sm:col-span-1" : ""}`}
              >
                <span
                  className={`block text-xs font-extrabold ${
                    active ? "text-accent-foreground" : "text-ink-2"
                  }`}
                >
                  {tab.label}
                </span>
                <span
                  className={`font-mono text-xl sm:text-2xl font-extrabold tabular-nums mt-0.5 block ${
                    active ? "text-accent-foreground" : tab.tone
                  }`}
                >
                  {tab.value}
                </span>
              </button>
            );
          })}
        </div>

        {/* ── Empty Queue Onboarding Guidance ── */}
        {totalSlips === 0 && !slipsQuery.isLoading && (
          <div className="rounded-2xl border border-line bg-surface p-6 sm:p-8 space-y-5">
            <div className="max-w-3xl space-y-4">
              <div>
                <h3 className="text-lg sm:text-xl font-extrabold text-ink tracking-tight">
                  ยังไม่มีสลิปเข้ามาในกล่องข้อความ
                </h3>
                <p className="mt-1 text-xs sm:text-sm font-medium text-ink-2 leading-relaxed">
                  สมาชิกสามารถส่งรูปสลิปการโอนผ่าน LINE OA หรือหน้าจุดถวาย
                  GraceBox ระบบจะตรวจข้อมูลอัตโนมัติแล้วส่งมาให้เหรัญญิกตรวจสอบ
                </p>
              </div>

              <ol className="list-decimal space-y-2 pl-5 text-xs sm:text-sm font-medium text-ink marker:font-bold marker:text-ink-3">
                <li>
                  สมาชิกโอนเงินเข้าบัญชีคริสตจักร แล้วส่งรูปสลิปเข้าห้องแชท LINE
                  OA
                </li>
                <li>
                  ระบบดึงยอดเงิน วันที่ บัญชี ตรวจสลิปซ้ำ
                  และจับคู่สมาชิกคริสตจักรด้วย AI
                </li>
                <li>
                  เหรัญญิกตรวจความถูกต้องและกดอนุมัติ
                  เพื่อบันทึกเข้าสมุดบัญชีเงินถวายทันที
                </li>
              </ol>

              <div className="flex flex-wrap items-center gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(true)}
                  className="btn-primary min-h-11 px-4 py-2.5 text-xs flex items-center gap-2 cursor-pointer"
                >
                  <UploadCloud className="w-4 h-4" />
                  <span>ลองอัปโหลดสลิปจากเครื่อง</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowLineInfoModal(true)}
                  className="btn-secondary min-h-11 px-4 py-2.5 text-xs flex items-center gap-2 cursor-pointer"
                >
                  <QrCode className="w-4 h-4" />
                  <span>ดูวิธีเชื่อมต่อ LINE OA</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Main Layout: Synchronized Verification Workspace ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Slips Queue List (Hidden on mobile when a slip is being reviewed) */}
          <div
            className={`space-y-4 ${
              selectedSlipId
                ? "hidden lg:block lg:col-span-5"
                : "col-span-1 lg:col-span-5"
            }`}
          >
            {/* Search Input with Clear Button */}
            <div className="rounded-2xl border border-line bg-surface p-2 flex items-center gap-2">
              <Search
                className="w-4 h-4 text-ink-3 ml-2 shrink-0"
                aria-hidden="true"
              />
              <input
                type="text"
                placeholder="ค้นหาชื่อผู้โอน, สมาชิก, ยอดเงิน..."
                aria-label="ค้นหาสลิปจากชื่อผู้โอน สมาชิก หรือยอดเงิน"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="min-h-10 w-full rounded-lg text-sm font-medium bg-transparent border-0 focus-visible:outline-none text-ink placeholder:text-ink-3"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="p-1.5 rounded-lg text-ink-3 hover:text-ink hover:bg-paper-2 cursor-pointer"
                  title="ล้างคำค้นหา"
                  aria-label="ล้างคำค้นหา"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Queue Counter Header */}
            <div className="flex items-center justify-between text-xs font-bold text-ink-2 px-1">
              <span>
                รายการสลิป{" "}
                {selectedStatus === "all"
                  ? "ทั้งหมด"
                  : STATUS_LABELS[selectedStatus]?.text}
              </span>
              <span className="tabular-nums font-mono text-ink-3">
                {filteredSlips.length} รายการ
              </span>
            </div>

            {/* Slip Cards List */}
            {slipsQuery.isLoading ? (
              <div className="rounded-2xl border border-line bg-surface p-12 text-center text-xs font-bold text-ink-3">
                กำลังโหลดรายการสลิป...
              </div>
            ) : filteredSlips.length === 0 ? (
              <div className="rounded-2xl border border-line bg-surface p-10 text-center text-ink-3 space-y-3">
                <p className="font-extrabold text-sm text-ink">
                  ไม่มีรายการสลิปในหมวดนี้
                </p>
                <p className="text-xs font-medium text-ink-3 max-w-xs mx-auto">
                  สลิปใหม่ที่ส่งเข้า LINE หรืออัปโหลดทดสอบจะปรากฏที่นี่
                </p>
                <button
                  type="button"
                  onClick={() => setShowUploadModal(true)}
                  className="btn-secondary min-h-10 inline-flex items-center gap-1.5 px-4 py-2 text-xs cursor-pointer"
                >
                  <UploadCloud className="w-3.5 h-3.5" /> อัปโหลดสลิปทดสอบ
                </button>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[calc(100vh-280px)] overflow-y-auto pr-1">
                {filteredSlips.map(slip => {
                  const statusConf = STATUS_LABELS[slip.status] || {
                    text: slip.status,
                    bg: "bg-paper-2",
                    textCol: "text-ink-2",
                    border: "border-line",
                  };
                  const isSelected = slip.id === selectedSlipId;

                  return (
                    <div
                      key={slip.id}
                      onClick={() => handleSelectSlip(slip)}
                      className={`p-3.5 rounded-2xl cursor-pointer transition-colors border ${
                        isSelected
                          ? "border-brand bg-accent/40 ring-1 ring-brand"
                          : "border-line bg-surface hover:bg-paper-2"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          {slip.signedImageUrl ? (
                            <img
                              src={slip.signedImageUrl}
                              alt="สลิป"
                              className="w-12 h-12 object-cover rounded-xl border border-line shrink-0 bg-paper-2"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-xl bg-paper-2 border border-line flex items-center justify-center text-ink-3 shrink-0">
                              <CreditCard className="w-5 h-5" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="font-extrabold text-sm sm:text-base text-ink truncate">
                              {slip.matchedMemberName ||
                                slip.extractedSenderName ||
                                slip.typedDonorName ||
                                slip.lineDisplayName ||
                                "ผู้ถวาย"}
                            </div>
                            <div className="text-xs font-medium text-ink-3 flex items-center gap-1.5 mt-0.5 truncate">
                              {Array.isArray(slip.declaredItems) &&
                                slip.declaredItems.length >= 2 && (
                                  <span className="px-1.5 py-0.5 rounded-md bg-tile-sky border border-line text-tile-sky-ink text-xs font-extrabold shrink-0">
                                    แบ่ง {slip.declaredItems.length} ประเภท
                                  </span>
                                )}
                              {slip.source === "no_slip" && (
                                <span className="px-1.5 py-0.5 rounded-md bg-tile-sand border border-line text-tile-sand-ink text-xs font-extrabold shrink-0">
                                  ไม่มีสลิป
                                </span>
                              )}
                              <span>
                                ส่งโดย{" "}
                                {slip.submittedByName ||
                                  slip.lineDisplayName ||
                                  "ผู้ใช้"}
                              </span>
                              {slip.extractedBank && (
                                <>
                                  <span>•</span>
                                  <span>{slip.extractedBank}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <div className="font-mono text-base font-extrabold tabular-nums text-ink">
                            {slip.extractedAmount
                              ? formatBaht(Number(slip.extractedAmount))
                              : slip.source === "no_slip" && slip.declaredAmount
                                ? formatBaht(Number(slip.declaredAmount))
                                : "—"}
                          </div>
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full text-xs font-extrabold border mt-1 ${statusConf.bg} ${statusConf.textCol} ${statusConf.border}`}
                          >
                            {statusConf.text}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-line text-xs font-medium text-ink-3">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {slip.extractedDate
                            ? new Date(slip.extractedDate).toLocaleDateString(
                                THAI_LOCALE,
                                {
                                  day: "numeric",
                                  month: "short",
                                  year: "2-digit",
                                }
                              )
                            : new Date(slip.createdAt).toLocaleDateString(
                                THAI_LOCALE
                              )}
                        </span>

                        {/* Quick Approve Button for High-confidence Matched Slips */}
                        {slip.status === "matched" && (
                          <button
                            type="button"
                            onClick={e => handleQuickApprove(e, slip)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-brand/40 bg-accent text-accent-foreground font-extrabold text-xs transition-colors cursor-pointer"
                            title="อนุมัติด่วนด้วยข้อมูลที่จับคู่ได้"
                          >
                            <Check className="w-3 h-3" /> อนุมัติด่วน
                          </button>
                        )}

                        {slip.status !== "matched" && slip.extractedRef && (
                          <span className="font-mono text-xs truncate max-w-[130px]">
                            Ref: {slip.extractedRef}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right Column: Slip Detail & Balanced 2-Pane Inspection Workspace */}
          <div
            id="slip-detail-panel"
            className={`${
              selectedSlipId
                ? "col-span-1 lg:col-span-7"
                : "hidden lg:block lg:col-span-7"
            }`}
          >
            {!selectedSlipId || !currentSlip ? (
              <div className="p-12 text-center bg-surface rounded-2xl border border-line text-ink-3 space-y-3 min-h-[440px] flex flex-col items-center justify-center">
                <Inbox className="w-10 h-10 text-ink-3" />
                <div className="font-extrabold text-base text-ink">
                  เลือกสลิปจากรายการด้านซ้าย
                </div>
                <p className="text-xs font-medium max-w-sm text-ink-3 leading-relaxed">
                  เพื่อตรวจสอบหลักฐานภาพสลิป ข้อมูลที่ AI สกัด
                  และบันทึกบัญชีเงินถวายเข้าคริสตจักร
                </p>
              </div>
            ) : (
              <div className="rounded-2xl border border-line bg-surface p-4 sm:p-6 space-y-5 animate-in fade-in duration-150 pb-28 lg:pb-6">
                {/* Mobile Back Navigation Bar (<1024px) */}
                <div className="lg:hidden flex items-center justify-between pb-3 border-b border-line">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedSlipId(null);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    className="btn-secondary min-h-10 px-3 py-1.5 rounded-xl text-xs font-extrabold text-ink inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>กลับไปรายการสลิป</span>
                  </button>
                  <span className="text-xs font-mono font-bold text-ink-3">
                    สลิป #{currentSlip.id}
                  </span>
                </div>

                {/* Workspace Header: Title, Status Badge, Rescan */}
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-line">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg sm:text-xl font-extrabold text-ink tracking-tight">
                        ตรวจสอบสลิป #{currentSlip.id}
                      </h2>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-extrabold border ${
                          STATUS_LABELS[currentSlip.status]?.bg
                        } ${STATUS_LABELS[currentSlip.status]?.textCol} ${
                          STATUS_LABELS[currentSlip.status]?.border
                        }`}
                      >
                        {STATUS_LABELS[currentSlip.status]?.text ||
                          currentSlip.status}
                      </span>
                    </div>
                    <p className="text-xs font-medium text-ink-3">
                      ส่งเข้ามาเมื่อ:{" "}
                      {new Date(currentSlip.createdAt).toLocaleString(
                        THAI_LOCALE
                      )}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {currentSlip.status !== "approved" &&
                      currentSlip.status !== "rejected" && (
                        <button
                          type="button"
                          onClick={() => handleRescan(currentSlip.id)}
                          disabled={rescanMutation.isPending}
                          className="btn-secondary min-h-9 px-3 py-1.5 text-xs inline-flex items-center gap-1.5 cursor-pointer"
                          title="สแกนอ่านข้อมูลสลิปนี้ใหม่ด้วย AI"
                        >
                          <RefreshCw
                            className={`w-3.5 h-3.5 ${rescanMutation.isPending ? "animate-spin text-brand" : "text-ink-2"}`}
                          />
                          <span>
                            {rescanMutation.isPending
                              ? "กำลังอ่านข้อมูล..."
                              : "สแกนอ่านข้อมูลใหม่"}
                          </span>
                        </button>
                      )}
                  </div>
                </div>

                {/* Duplicate Alert Banner */}
                {currentSlip.status === "duplicate" && (
                  <div className="p-3.5 rounded-xl bg-danger/10 border border-danger/30 text-danger space-y-1">
                    <div className="flex items-center gap-2 font-extrabold text-sm">
                      <ShieldAlert className="w-5 h-5 text-danger shrink-0" />
                      <span>ตรวจพบสลิปซ้ำในระบบ</span>
                    </div>
                    <p className="text-xs font-medium leading-relaxed text-danger">
                      {currentSlip.lastErrorMessage ||
                        "สลิปนี้มีหมายเลขอ้างอิง รูปภาพ หรือรายการธุรกรรมที่ตรงกับข้อมูลที่มีอยู่แล้วในระบบ"}
                    </p>
                  </div>
                )}

                {/* ── Balanced Two-Pane Inspection Grid ── */}
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
                  {/* Left Sub-Pane: Sticky Slip Evidence & AI Readout (xl:col-span-5) */}
                  <div className="xl:col-span-5 space-y-4 xl:sticky xl:top-4">
                    {/* Slip Image Container */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs font-extrabold text-ink-2">
                        <span>1. หลักฐานการโอน</span>
                        <div className="flex items-center gap-1.5">
                          {currentSlip.signedImageUrl && (
                            <>
                              <button
                                type="button"
                                onClick={() => setIsZoomed(z => !z)}
                                className="btn-secondary min-h-8 px-2.5 py-1 text-xs inline-flex items-center gap-1 cursor-pointer"
                                title="ขยาย/ย่อภาพสลิป"
                              >
                                {isZoomed ? (
                                  <>
                                    <ZoomOut className="w-3.5 h-3.5" />
                                    <span>ย่อ</span>
                                  </>
                                ) : (
                                  <>
                                    <ZoomIn className="w-3.5 h-3.5" />
                                    <span>ซูม</span>
                                  </>
                                )}
                              </button>
                              <a
                                href={currentSlip.signedImageUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn-secondary min-h-8 px-2.5 py-1 text-xs inline-flex items-center gap-1"
                                title="เปิดดูภาพต้นฉบับในแท็บใหม่"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                                <span>ภาพเต็ม</span>
                              </a>
                            </>
                          )}
                        </div>
                      </div>

                      <div
                        className={`rounded-xl border border-line bg-paper-2 overflow-auto flex items-center justify-center p-2 transition-all ${
                          isZoomed ? "max-h-[540px]" : "max-h-[300px]"
                        }`}
                      >
                        {currentSlip.signedImageUrl ? (
                          <img
                            src={currentSlip.signedImageUrl}
                            alt="สลิปการโอนเงิน (คลิกเพื่อซูม)"
                            onClick={() => setIsZoomed(z => !z)}
                            title="คลิกเพื่อซูมเข้า/ออก"
                            className={`w-auto object-contain rounded-lg transition-transform cursor-pointer ${
                              isZoomed
                                ? "max-h-[520px] scale-105"
                                : "max-h-[280px] hover:opacity-95"
                            }`}
                          />
                        ) : (
                          <div className="py-12 px-4 text-center text-xs font-bold text-ink-3">
                            {currentSlip.source === "no_slip"
                              ? "ผู้ถวายแจ้งผ่านระบบโดยไม่ได้แนบสลิป ตรวจกับยอดเงินเข้าบัญชีธนาคารก่อนอนุมัติ"
                              : "ไม่มีรูปภาพสลิป"}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* AI Extracted Summary Readout */}
                    <div className="rounded-xl border border-line bg-surface p-3.5 space-y-2.5 text-xs">
                      <div className="flex items-center justify-between pb-2 border-b border-line font-extrabold text-ink-2">
                        <span>2. ข้อมูลจากสลิป (AI)</span>
                        {currentSlip.extractedAmountConfidence && (
                          <span className="font-mono text-brand">
                            มั่นใจ{" "}
                            {(
                              Number(currentSlip.extractedAmountConfidence) *
                              100
                            ).toFixed(0)}
                            %
                          </span>
                        )}
                      </div>

                      {/* Declared vs Extracted Comparison */}
                      {currentSlip.declaredAmount && (
                        <div className="p-2.5 rounded-lg bg-tile-sky border border-line text-tile-sky-ink font-bold">
                          ผู้ถวายแจ้ง:{" "}
                          <span className="tabular-nums font-mono font-extrabold">
                            {formatBaht(Number(currentSlip.declaredAmount))}
                          </span>
                          {Array.isArray(currentSlip.declaredItems) &&
                          currentSlip.declaredItems.length >= 2
                            ? ` · แบ่ง ${(
                                currentSlip.declaredItems as Array<{
                                  category: string;
                                  amount: number;
                                }>
                              )
                                .map(
                                  d =>
                                    `${offeringCategoryLabel(d.category)} ${formatAmount(Number(d.amount))}`
                                )
                                .join(" + ")}`
                            : currentSlip.declaredCategory &&
                              ` · ${offeringCategoryLabel(currentSlip.declaredCategory)}`}
                          {currentSlip.extractedAmount && (
                            <div className="pt-1">
                              {Math.abs(
                                Number(currentSlip.declaredAmount) -
                                  Number(currentSlip.extractedAmount)
                              ) < 0.005 ? (
                                <span className="font-extrabold text-brand">
                                  ตรงกับยอดที่ AI อ่านจากสลิป
                                </span>
                              ) : (
                                <span className="font-extrabold text-danger">
                                  ไม่ตรงกับยอดบนสลิป (
                                  {formatBaht(
                                    Number(currentSlip.extractedAmount)
                                  )}
                                  )
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-2">
                        <div className="p-2 rounded-lg bg-paper-2 border border-line">
                          <span className="text-ink-3 font-medium block">
                            ยอดบนสลิป
                          </span>
                          <span className="text-sm font-extrabold tabular-nums font-mono text-brand block mt-0.5">
                            {currentSlip.extractedAmount
                              ? formatBaht(Number(currentSlip.extractedAmount))
                              : "อ่านไม่ได้"}
                          </span>
                        </div>
                        <div className="p-2 rounded-lg bg-paper-2 border border-line">
                          <span className="text-ink-3 font-medium block">
                            ชื่อผู้โอน
                          </span>
                          <span className="text-xs font-extrabold text-ink block mt-0.5 truncate">
                            {currentSlip.extractedSenderName || "—"}
                          </span>
                        </div>
                        <div className="p-2 rounded-lg bg-paper-2 border border-line">
                          <span className="text-ink-3 font-medium block">
                            ธนาคาร
                          </span>
                          <span className="text-xs font-bold text-ink block mt-0.5 truncate">
                            {currentSlip.extractedBank || "—"}
                          </span>
                        </div>
                        <div className="p-2 rounded-lg bg-paper-2 border border-line">
                          <span className="text-ink-3 font-medium block">
                            วันที่โอน
                          </span>
                          <span className="text-xs font-bold text-ink block mt-0.5 truncate">
                            {currentSlip.extractedDate
                              ? new Date(
                                  currentSlip.extractedDate
                                ).toLocaleDateString(THAI_LOCALE)
                              : "—"}
                          </span>
                        </div>
                      </div>

                      {currentSlip.extractedRef && (
                        <div className="pt-1 text-xs font-bold text-ink-3 font-mono truncate">
                          Ref: {currentSlip.extractedRef}
                        </div>
                      )}

                      <EscalationNote aiData={currentSlip.aiData} />
                      <ReceiverCheck aiData={currentSlip.aiData} />
                    </div>
                  </div>

                  {/* Right Sub-Pane: Ledger Entry & Review Form (xl:col-span-7) */}
                  <div className="xl:col-span-7 space-y-4">
                    {/* Submitter Metadata Card */}
                    <div className="rounded-xl border border-line bg-paper-2 p-3 text-xs space-y-1">
                      <div className="font-extrabold text-ink-2">
                        ผู้ส่งรายการเข้าสู่ระบบ
                      </div>
                      <div className="font-bold text-ink">
                        {currentSlip.submittedByName ||
                          currentSlip.lineDisplayName ||
                          "—"}
                        {currentSlip.submitterLineId && (
                          <span className="font-mono text-ink-3 break-all">
                            {" "}
                            · LINE ID: {currentSlip.submitterLineId}
                          </span>
                        )}
                      </div>
                      {currentSlip.typedDonorName && (
                        <div className="font-medium text-ink-3">
                          ชื่อที่ผู้ถวายพิมพ์เอง: {currentSlip.typedDonorName}
                        </div>
                      )}
                      {currentSlip.source === "no_slip" && (
                        <div className="text-tile-sand-ink font-extrabold">
                          รายการไม่มีสลิป · วันที่โอนที่แจ้ง:{" "}
                          {currentSlip.declaredDate
                            ? new Date(
                                currentSlip.declaredDate
                              ).toLocaleDateString(THAI_LOCALE)
                            : "—"}
                        </div>
                      )}
                    </div>

                    {/* Section 3: Ledger Inputs */}
                    <div className="space-y-3.5">
                      <div className="flex items-center justify-between text-xs font-extrabold text-ink-2">
                        <span>3. ข้อมูลลงสมุดบัญชีเงินถวาย</span>
                        <span className="text-ink-3 font-normal">
                          ตรวจสอบและระบุบัญชีให้ถูกต้อง
                        </span>
                      </div>

                      {/* Member Selection */}
                      <div className="space-y-1.5">
                        <div className="text-xs font-extrabold text-ink-2 flex items-center justify-between">
                          <span id="inbox-member-label">สมาชิกผู้ถวาย</span>
                          {currentSlip.lineUserId &&
                            editMemberId &&
                            !currentSlip.lineUserId.startsWith("manual-") && (
                              <button
                                type="button"
                                onClick={handleLinkMember}
                                disabled={linkMemberMutation.isPending}
                                className="text-xs text-income hover:underline flex items-center gap-1 font-extrabold cursor-pointer"
                              >
                                <Link2 className="w-3 h-3" /> เชื่อมโยง LINE ID
                              </button>
                            )}
                        </div>
                        {currentSlip.status !== "approved" &&
                          (membersQuery.data ?? []).length > 0 && (
                            <input
                              type="search"
                              value={memberSearch}
                              onChange={e => setMemberSearch(e.target.value)}
                              placeholder="พิมพ์ค้นหาสมาชิก หรือเลขซอง..."
                              aria-label="ค้นหาสมาชิกผู้ถวาย"
                              className="w-full rounded-xl border border-line bg-paper-2 px-3 py-2 text-xs font-bold text-ink placeholder:text-ink-3 focus:border-brand focus-visible:outline-none"
                            />
                          )}
                        <NativeSelect
                          aria-labelledby="inbox-member-label"
                          value={editMemberId ?? ""}
                          onChange={e => {
                            const nextId = e.target.value
                              ? Number(e.target.value)
                              : null;
                            setEditMemberId(nextId);
                            if (nextId && !editDonorName.trim()) {
                              const found = (membersQuery.data ?? []).find(
                                (m: any) => m.id === nextId
                              );
                              if (found?.name) setEditDonorName(found.name);
                            }
                          }}
                          disabled={currentSlip.status === "approved"}
                          className="focus:ring-2 focus:ring-brand font-medium text-xs"
                        >
                          <option value="">
                            -- ไม่ระบุสมาชิก (ผู้ถวายนิรนาม) --
                          </option>
                          {(membersQuery.data ?? [])
                            .filter((m: any) => {
                              if (m.id === editMemberId) return true;
                              const q = memberSearch.trim().toLowerCase();
                              if (!q) return true;
                              const nameMatch = String(m.name ?? "")
                                .toLowerCase()
                                .includes(q);
                              const envMatch = String(m.envelopeNo ?? "")
                                .toLowerCase()
                                .includes(q);
                              return nameMatch || envMatch;
                            })
                            .map((m: any) => (
                              <option key={m.id} value={m.id}>
                                {m.name}{" "}
                                {m.envelopeNo ? `(#${m.envelopeNo})` : ""}
                              </option>
                            ))}
                        </NativeSelect>
                        {currentSlip.matchMethod && (
                          <p className="text-xs font-bold text-brand">
                            จับคู่โดย:{" "}
                            {currentSlip.matchMethod === "line_id"
                              ? "LINE Account"
                              : "ชื่อ"}{" "}
                            (ความมั่นใจ{" "}
                            {(
                              Number(currentSlip.matchedConfidence ?? 1) * 100
                            ).toFixed(0)}
                            %)
                          </p>
                        )}
                      </div>

                      {/* Name in books */}
                      <div className="space-y-1">
                        <label
                          htmlFor="inbox-ledger-name"
                          className="text-xs font-extrabold text-ink-2 block"
                        >
                          ชื่อที่ลงบัญชีถวาย{" "}
                          <span className="text-danger">*</span>
                        </label>
                        <input
                          id="inbox-ledger-name"
                          type="text"
                          maxLength={120}
                          value={editDonorName}
                          onChange={e => setEditDonorName(e.target.value)}
                          disabled={currentSlip.status === "approved"}
                          className="neo-input w-full text-sm font-semibold p-2.5"
                        />
                        <p className="text-xs font-medium text-ink-3">
                          แก้ไขเป็นชื่อเต็มได้
                          ผู้ส่งรายการยังถูกบันทึกแยกไว้เสมอ
                        </p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                        {/* Fund Selector */}
                        <div className="space-y-1">
                          <label
                            htmlFor="givinginbo-fund"
                            className="text-xs font-extrabold text-ink-2 block"
                          >
                            เข้ากองทุน <span className="text-danger">*</span>
                          </label>
                          <NativeSelect
                            id="givinginbo-fund"
                            value={editFundId ?? ""}
                            onChange={e =>
                              setEditFundId(Number(e.target.value))
                            }
                            disabled={currentSlip.status === "approved"}
                            className="focus:ring-2 focus:ring-brand font-bold text-xs"
                          >
                            {(fundsQuery.data ?? []).map((f: any) => (
                              <option key={f.id} value={f.id}>
                                {f.name} (คงเหลือ{" "}
                                {formatBaht(Number(f.balance))})
                              </option>
                            ))}
                          </NativeSelect>
                        </div>

                        {/* Amount */}
                        <div className="space-y-1">
                          <label
                            htmlFor="givinginbo-amount"
                            className="text-xs font-extrabold text-ink-2 block"
                          >
                            ยอดเงิน (บาท) <span className="text-danger">*</span>
                          </label>
                          <input
                            id="givinginbo-amount"
                            type="number"
                            step="0.01"
                            value={editAmount}
                            onChange={e => setEditAmount(e.target.value)}
                            disabled={currentSlip.status === "approved"}
                            className="neo-input w-full text-base font-extrabold tabular-nums font-mono text-brand p-2.5"
                          />
                        </div>
                      </div>

                      {/* Category or Split */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <span
                            id="inbox-category-label"
                            className="text-xs font-extrabold text-ink-2"
                          >
                            {editSplit
                              ? "แบ่งยอดตามประเภทการถวาย"
                              : "ประเภทการถวาย"}
                          </span>
                          {!editSplit && currentSlip.status !== "approved" && (
                            <button
                              type="button"
                              onClick={() => {
                                const total = parseFloat(editAmount);
                                if (!total || total <= 0) {
                                  formToast.error(
                                    TOAST_KEY,
                                    "ใส่ยอดเงินก่อนแบ่งยอด"
                                  );
                                  return;
                                }
                                setEditSplit(startSplit(editCategory, total));
                              }}
                              className="text-xs font-extrabold text-brand underline underline-offset-2 cursor-pointer"
                            >
                              แบ่งเป็นหลายประเภท
                            </button>
                          )}
                        </div>
                        {editSplit ? (
                          <div
                            role="group"
                            aria-labelledby="inbox-category-label"
                          >
                            <SplitEditor
                              idPrefix="inbox-split"
                              lines={editSplit}
                              total={parseFloat(editAmount) || null}
                              onChange={setEditSplit}
                              onCancel={() => {
                                setEditCategory(
                                  editSplit[0]?.category ?? editCategory
                                );
                                setEditSplit(null);
                              }}
                              disabled={currentSlip.status === "approved"}
                            />
                          </div>
                        ) : (
                          <NativeSelect
                            aria-labelledby="inbox-category-label"
                            value={editCategory}
                            onChange={e =>
                              setEditCategory(
                                e.target.value as OfferingCategory
                              )
                            }
                            disabled={currentSlip.status === "approved"}
                            className="focus:ring-2 focus:ring-brand font-medium text-xs"
                          >
                            {OFFERING_CATEGORIES.map(c => (
                              <option key={c.id} value={c.id}>
                                {c.label}
                              </option>
                            ))}
                          </NativeSelect>
                        )}
                      </div>

                      {/* Notes */}
                      <div className="space-y-1">
                        <label
                          htmlFor="givinginbo-note"
                          className="text-xs font-extrabold text-ink-2 block"
                        >
                          หมายเหตุการตรวจสอบ
                        </label>
                        <input
                          id="givinginbo-note"
                          type="text"
                          placeholder="บันทึกเพิ่มเติมของเจ้าหน้าที่ (ถ้ามี)"
                          value={editReviewNote}
                          onChange={e => setEditReviewNote(e.target.value)}
                          disabled={currentSlip.status === "approved"}
                          className="neo-input w-full text-xs p-2.5"
                        />
                      </div>
                    </div>

                    {/* Section 4: Actions (Desktop Inline) */}
                    {currentSlip.status !== "approved" &&
                    currentSlip.status !== "rejected" ? (
                      <div className="space-y-3 pt-3 border-t border-line">
                        {currentSlip.source === "no_slip" && (
                          <label className="flex items-start gap-2.5 p-3 rounded-xl border border-line bg-tile-sand text-xs font-bold text-tile-sand-ink cursor-pointer">
                            <input
                              type="checkbox"
                              checked={confirmBank}
                              onChange={e => setConfirmBank(e.target.checked)}
                              className="mt-0.5 w-4 h-4 shrink-0"
                            />
                            <span>
                              ตรวจกับยอดเข้าบัญชีธนาคารแล้ว
                              ว่ามีเงินจำนวนนี้เข้ามาจริง ในวันที่และชื่อที่แจ้ง
                            </span>
                          </label>
                        )}

                        <div className="hidden lg:flex items-center justify-end gap-3 pt-1">
                          <button
                            type="button"
                            onClick={handleOpenReject}
                            disabled={
                              approveMutation.isPending ||
                              rejectMutation.isPending
                            }
                            className="min-h-11 px-5 py-2.5 rounded-xl border border-danger/30 bg-danger/10 hover:bg-danger/15 text-danger font-extrabold text-xs transition-colors cursor-pointer disabled:opacity-50"
                          >
                            ปฏิเสธสลิป
                          </button>

                          <button
                            type="button"
                            onClick={handleApprove}
                            disabled={
                              approveMutation.isPending ||
                              rejectMutation.isPending ||
                              currentSlip.status === "duplicate" ||
                              (currentSlip.source === "no_slip" && !confirmBank)
                            }
                            className="btn-primary min-h-11 px-6 py-2.5 text-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                          >
                            {approveMutation.isPending ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span>กำลังบันทึกบัญชี...</span>
                              </>
                            ) : (
                              <>
                                <CheckCircle2 className="w-4 h-4" />
                                <span>อนุมัติและบันทึกบัญชี</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="p-3.5 rounded-xl bg-paper-2 border border-line text-xs font-bold text-ink-2 flex items-center justify-between">
                        <span>
                          รายการนี้ได้รับการ
                          {currentSlip.status === "approved"
                            ? "อนุมัติแล้ว"
                            : "ปฏิเสธแล้ว"}
                          {currentSlip.approvedOfferingId &&
                            ` (Offering #${currentSlip.approvedOfferingId})`}
                        </span>
                        {currentSlip.reviewedAt && (
                          <span>
                            เมื่อ:{" "}
                            {new Date(currentSlip.reviewedAt).toLocaleString(
                              THAI_LOCALE
                            )}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* ── Sticky Mobile Action Bar (<1024px) ── */}
                {currentSlip.status !== "approved" &&
                  currentSlip.status !== "rejected" && (
                    <div className="lg:hidden fixed bottom-0 left-0 right-0 p-3 bg-surface/95 backdrop-blur border-t border-line pb-[max(0.75rem,env(safe-area-inset-bottom))] z-30 flex items-center gap-2.5">
                      <button
                        type="button"
                        onClick={handleOpenReject}
                        disabled={
                          approveMutation.isPending || rejectMutation.isPending
                        }
                        className="min-h-12 flex-1 px-4 py-2.5 rounded-xl border border-danger/30 bg-danger/10 text-danger font-extrabold text-sm transition-colors cursor-pointer disabled:opacity-50"
                      >
                        ปฏิเสธ
                      </button>

                      <button
                        type="button"
                        onClick={handleApprove}
                        disabled={
                          approveMutation.isPending ||
                          rejectMutation.isPending ||
                          currentSlip.status === "duplicate" ||
                          (currentSlip.source === "no_slip" && !confirmBank)
                        }
                        className="btn-primary min-h-12 flex-[2] px-4 py-2.5 text-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                      >
                        {approveMutation.isPending ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>กำลังบันทึก...</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-4 h-4" />
                            <span>อนุมัติบันทึกบัญชี</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Modal: Manual / Test Slip Upload ── */}
      <Dialog
        open={showUploadModal}
        onOpenChange={open => {
          setShowUploadModal(open);
          if (!open) setUploadPreview(null);
        }}
      >
        <DialogContent className="neo-modal max-w-lg p-6 text-ink space-y-5">
          <DialogHeader className="text-left">
            <div className="flex items-center gap-3 pr-8">
              <div className="w-10 h-10 shrink-0 rounded-xl border border-line bg-accent text-accent-foreground flex items-center justify-center">
                <UploadCloud className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-extrabold text-ink tracking-tight">
                  อัปโหลดสลิปทดสอบ / ด้วยตนเอง
                </DialogTitle>
                <DialogDescription className="text-xs font-medium text-ink-3">
                  เลือกรูปสลิปจากคอมพิวเตอร์ เพื่อให้ AI
                  ดึงข้อมูลและนำเข้ากล่องสลิปทันที
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {/* Dropzone Area */}
          <div
            role="button"
            tabIndex={0}
            aria-label={
              uploadPreview
                ? "คลิกเพื่อเปลี่ยนรูปภาพสลิป"
                : "คลิกเพื่อเลือกไฟล์รูปสลิป"
            }
            onClick={() => fileInputRef.current?.click()}
            onKeyDown={e => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                fileInputRef.current?.click();
              }
            }}
            className={`border border-dashed rounded-2xl p-6 text-center cursor-pointer transition-colors focus:outline-hidden focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 ${
              uploadPreview
                ? "border-brand bg-paper-2"
                : "border-line hover:border-brand bg-paper-2"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              aria-label="เลือกไฟล์รูปสลิป"
              tabIndex={-1}
              onClick={e => e.stopPropagation()}
              onChange={e => void handleFileChange(e)}
              className="sr-only"
            />

            {uploadPreview ? (
              <div className="space-y-3">
                <img
                  src={uploadPreview}
                  alt="ตัวอย่างสลิป"
                  className="max-h-48 mx-auto rounded-xl object-contain border border-line"
                />
                <p className="text-xs text-brand font-extrabold">
                  คลิกเพื่อเปลี่ยนรูปภาพ
                </p>
              </div>
            ) : (
              <div className="space-y-2 py-4">
                <ImageIcon className="w-10 h-10 text-ink-3 mx-auto" />
                <p className="font-extrabold text-sm text-ink">
                  คลิกเพื่อเลือกไฟล์รูปสลิป
                </p>
                <p className="text-xs font-medium text-ink-3">
                  รองรับไฟล์ JPG, PNG, WEBP
                </p>
              </div>
            )}
          </div>

          {/* Optional donor name */}
          <div className="space-y-1.5">
            <label
              htmlFor="givinginbo-upload-donor"
              className="text-xs font-extrabold text-ink-2 block"
            >
              ชื่อผู้ถวาย (ระบุเพิ่มเติมหรือไม่ก็ได้)
            </label>
            <input
              id="givinginbo-upload-donor"
              type="text"
              placeholder="เช่น นายสมชาย สุขใจ"
              value={uploadDonorName}
              onChange={e => setUploadDonorName(e.target.value)}
              className="neo-input w-full text-sm p-2.5"
            />
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                setShowUploadModal(false);
                setUploadPreview(null);
              }}
              className="btn-secondary min-h-10 px-4 py-2 text-xs cursor-pointer"
            >
              ยกเลิก
            </button>
            <button
              type="button"
              onClick={handleUploadSubmit}
              disabled={!uploadPreview || uploadSlipMutation.isPending}
              className="btn-primary min-h-10 px-5 py-2 text-xs disabled:opacity-50 flex items-center gap-2 cursor-pointer"
            >
              {uploadSlipMutation.isPending
                ? "กำลังประมวลผล..."
                : "ส่งให้ AI อ่านสลิป"}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Modal: LINE Bot Setup & Info ── */}
      <Dialog open={showLineInfoModal} onOpenChange={setShowLineInfoModal}>
        <DialogContent className="neo-modal max-w-lg p-6 text-ink space-y-5">
          <DialogHeader className="text-left">
            <div className="flex items-center gap-3 pr-8">
              <div className="w-10 h-10 shrink-0 rounded-xl border border-line bg-tile-mint text-tile-mint-ink flex items-center justify-center">
                <QrCode className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-extrabold text-ink tracking-tight">
                  ข้อมูลการเชื่อมต่อ LINE Official Account
                </DialogTitle>
                <DialogDescription className="text-xs font-medium text-ink-3">
                  รายละเอียดสำหรับการแอดบอทและการตั้งค่าระบบ
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {/* Webhook URL Box */}
          <div className="bg-paper-2 border border-line p-3.5 rounded-2xl space-y-1.5">
            <div className="flex items-center justify-between text-xs font-extrabold text-ink-2">
              <span>Webhook URL สำหรับ LINE Developers</span>
              <button
                type="button"
                onClick={() => {
                  const webhookUrl = `${
                    typeof window !== "undefined"
                      ? window.location.origin
                      : "https://graceful-giving.vercel.app"
                  }/api/line/webhook`;
                  navigator.clipboard.writeText(webhookUrl);
                  formToast.success(TOAST_KEY, "คัดลอก Webhook URL แล้ว");
                }}
                className="text-brand hover:underline flex items-center gap-1 font-extrabold min-h-9 px-2 rounded-lg cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" /> คัดลอก
              </button>
            </div>
            <div className="font-mono text-xs bg-surface p-2 rounded-xl border border-line text-ink break-all select-all">
              {typeof window !== "undefined"
                ? `${window.location.origin}/api/line/webhook`
                : "https://graceful-giving.vercel.app/api/line/webhook"}
            </div>
          </div>

          {/* Instructions */}
          <div className="space-y-2.5 text-xs font-medium text-ink-2">
            <div className="font-extrabold text-sm text-ink">
              วิธีใช้งานสำหรับสมาชิก:
            </div>
            <ol className="list-decimal pl-4 space-y-1.5 leading-relaxed">
              <li>เปิดห้องแชทของ LINE Official Account ประจำคริสตจักร</li>
              <li>ถ่ายรูปหรือส่งรูปสลิปการโอนเงินเข้ามาในห้องแชท</li>
              <li>
                ระบบจะตอบกลับว่าได้รับสลิปแล้ว
                และนำส่งเข้ามาที่กล่องข้อความนี้โดยอัตโนมัติ
              </li>
            </ol>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
            <button
              type="button"
              onClick={() => {
                setShowLineInfoModal(false);
                setLocation("/giving/station");
              }}
              className="btn-secondary min-h-10 px-4 py-2 text-xs flex items-center gap-1.5 cursor-pointer"
            >
              <QrCode className="w-4 h-4" />
              <span>เปิดโปสเตอร์ป้าย QR ติดหน้าห้อง</span>
            </button>
            <button
              type="button"
              onClick={() => setShowLineInfoModal(false)}
              className="btn-primary min-h-10 px-5 py-2 text-xs cursor-pointer"
            >
              เข้าใจแล้ว
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Custom Reject Dialog ── */}
      <Dialog open={showRejectModal} onOpenChange={setShowRejectModal}>
        <DialogContent className="neo-modal max-w-md p-6 text-ink space-y-4">
          <DialogHeader className="space-y-1 text-left">
            <DialogTitle className="text-lg font-extrabold text-ink flex items-center gap-2 tracking-tight">
              <XCircle className="w-5 h-5 text-danger" />
              <span>ปฏิเสธสลิป #{currentSlip?.id}</span>
            </DialogTitle>
            <DialogDescription className="text-xs font-medium text-ink-3">
              ระบุเหตุผลการปฏิเสธเพื่อบันทึกประวัติการตรวจสอบในระบบ
            </DialogDescription>
          </DialogHeader>

          {/* Quick Preset Reason Chips */}
          <div className="space-y-2">
            <span className="text-xs font-extrabold text-ink-2 block">
              เลือกเหตุผลด่วน:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {[
                "ภาพสลิปไม่ชัดเจน / เบลอ",
                "ยอดเงินไม่ตรงกับสลิป",
                "สลิปซ้ำ / โอนซ้ำ",
                "ไม่ใช่บัญชีของคริสตจักร",
                "วันที่โอนไม่ถูกต้อง",
              ].map(preset => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setRejectReason(preset)}
                  className={`px-2.5 py-1 text-xs rounded-lg border transition-colors cursor-pointer ${
                    rejectReason === preset
                      ? "bg-danger/15 border-danger text-danger font-extrabold"
                      : "bg-paper-2 border-line text-ink-2 font-bold hover:bg-surface"
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          {/* Detailed Reason Textarea */}
          <div className="space-y-1.5">
            <label
              htmlFor="reject-reason"
              className="text-xs font-extrabold text-ink-2 block"
            >
              ระบุเหตุผล <span className="text-danger">*</span>
            </label>
            <textarea
              id="reject-reason"
              rows={3}
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              placeholder="ระบุรายละเอียดเหตุผลการปฏิเสธสลิปนี้..."
              className="neo-input w-full text-sm p-3 resize-none"
            />
          </div>

          <DialogFooter className="flex flex-row items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={() => setShowRejectModal(false)}
              disabled={rejectMutation.isPending}
              className="btn-secondary min-h-10 px-4 py-2 text-xs cursor-pointer"
            >
              ยกเลิก
            </button>
            <button
              type="button"
              onClick={handleConfirmReject}
              disabled={rejectMutation.isPending || !rejectReason.trim()}
              className="min-h-10 px-4 py-2 text-xs font-extrabold rounded-xl border border-danger/30 bg-danger hover:bg-danger/90 text-white transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {rejectMutation.isPending ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>กำลังปฏิเสธ...</span>
                </>
              ) : (
                <span>ปฏิเสธรายการ</span>
              )}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}

type ReceiverKind = "match" | "mismatch" | "suspect" | "unknown";

const RECEIVER_NOTE: Record<ReceiverKind, { text: string; cls: string }> = {
  match: {
    text: "ตรงกับบัญชีของคริสตจักร",
    cls: "bg-tile-mint border-line text-tile-mint-ink",
  },
  mismatch: {
    text: "ไม่ตรงกับบัญชีของคริสตจักร ตรวจภาพสลิปก่อนอนุมัติ",
    cls: "bg-danger/10 border-danger/30 text-danger",
  },
  suspect: {
    text: "ต่างจากบัญชีคริสตจักร 1 หลัก อาจอ่านผิด ตรวจภาพสลิปก่อนอนุมัติ",
    cls: "bg-tile-sand border-line text-tile-sand-ink",
  },
  unknown: {
    text: "ตรวจเทียบอัตโนมัติไม่ได้ (พร้อมเพย์ ปิดเลขมาก หรือยังไม่ได้ตั้งเลขบัญชีคริสตจักร) ให้ดูภาพสลิป",
    cls: "bg-paper-2 border-line text-ink-2",
  },
};

/** The receiver account on the slip, and whether it is the church's account. */
export function ReceiverCheck({ aiData }: { aiData: unknown }) {
  const data = (aiData ?? null) as {
    receiverAccount?: string | null;
    receiverName?: string | null;
    receiverBank?: string | null;
    verification?: { receiver?: ReceiverKind };
  } | null;
  // A slip read before this check existed has no result to show.
  const kind = data?.verification?.receiver;
  if (!data || !kind) return null;
  const note = RECEIVER_NOTE[kind];
  const shown = [data.receiverBank, data.receiverAccount, data.receiverName]
    .filter(Boolean)
    .join(" · ");
  return (
    <div className={`p-3 rounded-xl border text-xs font-bold ${note.cls}`}>
      <div className="font-extrabold">ผู้รับในสลิป</div>
      {shown && <div className="font-mono pt-0.5 break-all">{shown}</div>}
      <div className="pt-1">{note.text}</div>
    </div>
  );
}

/** Shown when the system stopped turning a donor away and left the slip to staff. */
export function EscalationNote({ aiData }: { aiData: unknown }) {
  const escalated =
    (aiData as { verification?: { escalated?: unknown } } | null)?.verification
      ?.escalated === true;
  if (!escalated) return null;
  return (
    <div
      role="note"
      className="p-3 rounded-xl border border-line bg-tile-sand text-tile-sand-ink text-xs font-bold"
    >
      <span className="font-extrabold">
        ผู้ถวายส่งไม่ผ่านการตรวจอัตโนมัติหลายครั้งใน 24 ชั่วโมง
      </span>{" "}
      ระบบจึงไม่ปฏิเสธเอง ให้เทียบภาพสลิปกับยอดและบัญชีที่แจ้งด้วยตาก่อนอนุมัติ
    </div>
  );
}
