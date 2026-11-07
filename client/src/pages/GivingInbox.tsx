import { useState, useRef } from "react";
import { formatBaht, THAI_LOCALE } from "@/lib/format";
import { prepareSlipImage, SlipFileError } from "@/lib/slipImage";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Swal } from "@/lib/sweetalert";
import { toast } from "sonner";
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
    border: "border-[var(--ink)]/20",
  },
  processing: {
    text: "กำลังอ่านสลิป",
    bg: "bg-tile-sand",
    textCol: "text-tile-sand-ink",
    border: "border-[var(--ink)]/20",
  },
  extracted: {
    text: "อ่านข้อมูลแล้ว",
    bg: "bg-paper-2",
    textCol: "text-ink",
    border: "border-[var(--ink)]/20",
  },
  needs_review: {
    text: "ต้องตรวจสอบ",
    bg: "bg-tile-sand",
    textCol: "text-tile-sand-ink",
    border: "border-[var(--ink)]/30",
  },
  matched: {
    text: "พร้อมอนุมัติ",
    bg: "bg-tile-mint",
    textCol: "text-tile-mint-ink",
    border: "border-[var(--ink)]/30",
  },
  duplicate: {
    text: "สลิปซ้ำ",
    bg: "bg-danger/10",
    textCol: "text-danger",
    border: "border-danger/40",
  },
  approved: {
    text: "อนุมัติแล้ว",
    bg: "bg-tile-mint",
    textCol: "text-tile-mint-ink",
    border: "border-[var(--ink)]/30",
  },
  rejected: {
    text: "ปฏิเสธ",
    bg: "bg-danger/10",
    textCol: "text-danger",
    border: "border-danger/40",
  },
  failed: {
    text: "อ่านสลิปล้มเหลว",
    bg: "bg-danger/10",
    textCol: "text-danger",
    border: "border-danger/40",
  },
};

export default function GivingInbox() {
  const [, setLocation] = useLocation();
  const [selectedStatus, setSelectedStatus] =
    useState<InboxStatus>("needs_review");
  const [selectedSlipId, setSelectedSlipId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

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
      toast.success("อนุมัติและบันทึกเงินถวายเรียบร้อยแล้ว");
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
      toast.success("ปฏิเสธสลิปเรียบร้อยแล้ว");
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
        toast.error(
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
      toast.success("อัปโหลดสลิปสำเร็จ! ระบบกำลังดึงข้อมูลด้วย AI");
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
      toast.success(
        "เชื่อมโยงสมาชิกกับ LINE สำเร็จ สลิปอื่นๆ จะถูกจับคู่อัตโนมัติ"
      );
      utils.givingInbox.invalidate();
      utils.members.invalidate();
    },
    onError: err => {
      toast.error(err.message);
    },
  });

  const rescanMutation = trpc.givingInbox.rescan.useMutation({
    onSuccess: () => {
      toast.success("AI สแกนและสกัดข้อมูลสลิปเรียบร้อยแล้ว");
      utils.givingInbox.invalidate();
    },
    onError: err => {
      toast.error(err.message || "ไม่สามารถสแกนสลิปได้");
    },
  });

  const drainWorkerMutation = trpc.givingInbox.drainWorker.useMutation({
    onSuccess: data => {
      utils.givingInbox.invalidate();
      if (data && data.processed > 0) {
        toast.success(`ประมวลผลสลิปในคิวสำเร็จ ${data.processed} รายการ`);
      } else {
        toast.success("รีเฟรชข้อมูลล่าสุดเรียบร้อยแล้ว");
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
    setEditReviewNote(slip.reviewNote || "");
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
      `คุณกำลังจะอนุมัติเงินถวายจำนวน ${amountNum.toLocaleString()} บาท จาก ${
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
      `อนุมัติเงินถวาย ฿${amountNum.toLocaleString()} จาก ${
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
      toast.error("กรุณาเลือกสมาชิกก่อนเชื่อมโยง");
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
      // Same check and shrinking as the giving station.
      setUploadPreview(await prepareSlipImage(file));
    } catch (err) {
      toast.error(
        err instanceof SlipFileError ? err.message : "แนบรูปสลิปไม่สำเร็จ"
      );
    }
  };

  const handleUploadSubmit = () => {
    if (!uploadPreview) {
      toast.error("กรุณาเลือกรูปภาพสลิป");
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
      title="กล่องสลิปการถวาย"
      subtitle="ตรวจสอบและอนุมัติสลิปการถวายจาก LINE Official Account ด้วย AI"
      action={
        <div className="flex flex-wrap items-center gap-2">
          {/* 1. Link to Offerings Book */}
          <button
            type="button"
            onClick={() => setLocation("/offerings")}
            className="btn-secondary min-h-10 px-3.5 py-2 text-xs flex items-center gap-1.5"
            title="ดูสมุดบัญชีเงินถวายที่อนุมัติแล้ว"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">สมุดบัญชีถวาย</span>
          </button>

          {/* 2. LINE Info / QR Modal */}
          <button
            type="button"
            onClick={() => setShowLineInfoModal(true)}
            aria-label="LINE บอท"
            className="btn-secondary min-h-10 px-3.5 py-2 text-xs flex items-center gap-1.5"
            title="ข้อมูลการเชื่อมต่อ LINE และ QR Code"
          >
            <QrCode className="w-3.5 h-3.5" aria-hidden="true" />
            <span>LINE บอท</span>
          </button>

          <button
            type="button"
            onClick={() => setLocation("/giving/station")}
            aria-label="ป้าย QR หน้าห้อง"
            className="btn-secondary min-h-10 px-3.5 py-2 text-xs flex items-center gap-1.5 cursor-pointer"
            title="เปิดป้าย QR Code สำหรับติดหน้าห้องและหน้าถวายอัตโนมัติ"
          >
            <QrCode className="w-3.5 h-3.5" aria-hidden="true" />
            <span>
              ป้าย QR<span className="hidden sm:inline"> หน้าห้อง</span>
            </span>
          </button>

          {/* 3. Manual Test Upload Button */}
          <button
            type="button"
            onClick={() => setShowUploadModal(true)}
            className="btn-primary min-h-10 px-4 py-2 text-xs flex items-center gap-1.5"
          >
            <UploadCloud className="w-4 h-4" />
            <span>อัปโหลดสลิป</span>
          </button>

          {/* 4. Refresh Button */}
          <button
            type="button"
            onClick={() => drainWorkerMutation.mutate()}
            disabled={drainWorkerMutation.isPending}
            className="btn-secondary min-h-10 p-2 cursor-pointer"
            title="รีเฟรชข้อมูลและประมวลผลคิวสลิป"
          >
            <RefreshCw
              className={`w-4 h-4 ${drainWorkerMutation.isPending ? "animate-spin" : ""}`}
            />
          </button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* ── Queue filter: one card split by hairlines. Colour only on the
            queues that need a person (to review, duplicates). ── */}
        <div
          role="group"
          aria-label="กรองสลิปตามสถานะ"
          className="bento-card-static grid grid-cols-2 divide-x-2 divide-y-2 divide-[var(--ink)] overflow-hidden p-0 sm:grid-cols-5 sm:divide-y-0"
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
                onClick={() => setSelectedStatus(tab.id)}
                className={`min-h-11 px-4 py-3.5 text-left transition-colors ${
                  active
                    ? "bg-accent text-accent-foreground"
                    : "hover:bg-paper-2"
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
                  className={`money mt-1 block text-2xl font-extrabold ${
                    active ? "text-accent-foreground" : tab.tone
                  }`}
                >
                  {tab.value}
                </span>
              </button>
            );
          })}
        </div>

        {/* ── Nothing yet: say how slips arrive, in order ── */}
        {totalSlips === 0 && !slipsQuery.isLoading && (
          <div className="bento-card p-6 sm:p-8">
            <div className="max-w-3xl space-y-5">
              <div>
                <h3 className="text-xl font-extrabold text-ink">
                  ยังไม่มีสลิปเข้ามา
                </h3>
                <p className="mt-1 text-sm font-medium text-ink-2">
                  สมาชิกส่งรูปสลิปมาทาง LINE OA ระบบอ่านข้อมูลให้
                  แล้วเหรัญญิกตรวจและอนุมัติ
                </p>
              </div>

              <ol className="list-decimal space-y-2 pl-5 text-sm font-medium text-ink marker:font-bold marker:text-ink-3">
                <li>
                  สมาชิกโอนเงินเข้าบัญชีคริสตจักร แล้วส่งรูปสลิปเข้าห้องแชท LINE
                  OA
                </li>
                <li>
                  ระบบดึงยอดเงิน วันที่ บัญชี ตรวจสลิปซ้ำ
                  และจับคู่สมาชิกคริสตจักร
                </li>
                <li>
                  เหรัญญิกตรวจความถูกต้องและกดอนุมัติ
                  เพื่อบันทึกเข้าสมุดบัญชีเงินถวาย
                </li>
              </ol>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(true)}
                  className="btn-primary min-h-11 px-5 py-3 text-sm flex items-center gap-2"
                >
                  <UploadCloud className="w-4 h-4" /> ลองอัปโหลดสลิปจากเครื่อง
                </button>
                <button
                  type="button"
                  onClick={() => setShowLineInfoModal(true)}
                  className="btn-secondary min-h-11 px-5 py-3 text-sm flex items-center gap-2"
                >
                  <QrCode className="w-4 h-4" /> ดูวิธีเชื่อมต่อ LINE OA
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Main Layout: Slips List + Detail Split View ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: List (5 cols on lg) */}
          <div className="lg:col-span-5 space-y-4">
            {/* Search and Filters */}
            <div className="bento-card-static p-3 flex items-center gap-2">
              <Search className="w-4 h-4 text-ink-3 ml-2" />
              <input
                type="text"
                placeholder="ค้นหาชื่อผู้โอน, สมาชิก, ยอดเงิน..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="min-h-11 w-full text-base md:text-sm font-medium bg-transparent border-0 focus:outline-none text-ink"
              />
            </div>

            {/* Slips Cards */}
            {slipsQuery.isLoading ? (
              <div className="bento-card-static p-12 text-center text-sm font-bold text-ink-3">
                กำลังโหลดรายการสลิป...
              </div>
            ) : filteredSlips.length === 0 ? (
              <div className="bento-card-static p-12 text-center text-ink-3 space-y-3">
                <p className="font-extrabold text-ink">
                  ไม่มีรายการสลิปในหมวดนี้
                </p>
                <p className="text-xs font-medium text-ink-3 max-w-xs mx-auto">
                  สลิปใหม่ที่ส่งเข้า LINE หรืออัปโหลดทดสอบจะปรากฏที่นี่
                </p>
                <button
                  type="button"
                  onClick={() => setShowUploadModal(true)}
                  className="btn-secondary min-h-11 inline-flex items-center gap-1.5 px-4 py-2 text-xs"
                >
                  <UploadCloud className="w-3.5 h-3.5" /> อัปโหลดสลิปทดสอบ
                </button>
              </div>
            ) : (
              <div className="space-y-3 max-h-[720px] overflow-y-auto pr-1">
                {filteredSlips.map(slip => {
                  const statusConf = STATUS_LABELS[slip.status] || {
                    text: slip.status,
                    bg: "bg-paper-2",
                    textCol: "text-ink-2",
                    border: "border-[var(--ink)]/20",
                  };
                  const isSelected = slip.id === selectedSlipId;

                  return (
                    <div
                      key={slip.id}
                      onClick={() => handleSelectSlip(slip)}
                      className={`p-4 rounded-2xl cursor-pointer transition-all ${
                        isSelected
                          ? "border-2 border-[var(--ink)] bg-paper-2 shadow-[4px_4px_0_var(--ink)]"
                          : "border-[1.5px] border-[var(--ink)] bg-surface shadow-[2px_2px_0_var(--ink)] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[4px_4px_0_var(--ink)]"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          {slip.signedImageUrl ? (
                            <img
                              src={slip.signedImageUrl}
                              alt="สลิป"
                              className="w-14 h-14 object-cover rounded-xl border-[1.5px] border-[var(--ink)] shrink-0 bg-paper-2"
                            />
                          ) : (
                            <div className="w-14 h-14 rounded-xl bg-paper-2 border-[1.5px] border-[var(--ink)] flex items-center justify-center text-ink-3 shrink-0">
                              <CreditCard className="w-6 h-6" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="font-extrabold text-base text-ink truncate">
                              {slip.matchedMemberName ||
                                slip.extractedSenderName ||
                                slip.typedDonorName ||
                                slip.lineDisplayName ||
                                "ผู้ถวาย"}
                            </div>
                            <div className="text-xs font-medium text-ink-3 flex items-center gap-1.5 mt-0.5 truncate">
                              {Array.isArray(slip.declaredItems) &&
                                slip.declaredItems.length >= 2 && (
                                  <span className="px-1.5 py-0.5 rounded-md bg-tile-sky border border-[var(--ink)]/20 text-tile-sky-ink text-xs font-extrabold shrink-0">
                                    แบ่ง {slip.declaredItems.length} ประเภท
                                  </span>
                                )}
                              {slip.source === "no_slip" && (
                                <span className="px-1.5 py-0.5 rounded-md bg-tile-sand border border-[var(--ink)]/25 text-tile-sand-ink text-xs font-extrabold shrink-0">
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
                          <div className="money text-lg font-extrabold text-ink">
                            {slip.extractedAmount
                              ? formatBaht(Number(slip.extractedAmount))
                              : slip.source === "no_slip" && slip.declaredAmount
                                ? formatBaht(Number(slip.declaredAmount))
                                : "—"}
                          </div>
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-extrabold border mt-1 ${statusConf.bg} ${statusConf.textCol} ${statusConf.border}`}
                          >
                            {statusConf.text}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-line text-xs font-medium text-ink-3">
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
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-[var(--ink)] bg-accent text-accent-foreground font-extrabold text-[11px] shadow-[1px_1px_0_var(--ink)] transition-all"
                            title="อนุมัติด่วนด้วยข้อมูลที่จับคู่ได้"
                          >
                            <Check className="w-3 h-3" /> อนุมัติด่วน
                          </button>
                        )}

                        {slip.status !== "matched" && slip.extractedRef && (
                          <span className="font-mono text-[11px] truncate max-w-[130px]">
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

          {/* Right Column: Slip Detail & Review Form (7 cols on lg) */}
          <div className="lg:col-span-7">
            {!selectedSlipId || !currentSlip ? (
              <div className="p-12 text-center bg-surface rounded-2xl border-2 border-dashed border-[var(--ink)]/30 text-ink-3 space-y-3 min-h-[420px] flex flex-col items-center justify-center">
                <Inbox className="w-10 h-10 text-ink-3" />
                <div className="font-extrabold text-base text-ink">
                  เลือกสลิปจากรายการด้านซ้าย
                </div>
                <p className="text-xs font-medium max-w-sm text-ink-3">
                  เพื่อตรวจสอบหลักฐาน ข้อมูลที่ AI แนะนำ
                  และอนุมัติบันทึกลงบัญชีเงินถวาย
                </p>
              </div>
            ) : (
              <div className="bento-card-static p-5 sm:p-6 space-y-6 animate-in fade-in duration-150">
                {/* Header of Detail */}
                <div className="flex items-start justify-between gap-4 pb-4 border-b-2 border-[var(--ink)]">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg sm:text-xl font-extrabold text-ink">
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
                    <p className="text-xs font-medium text-ink-3 mt-1">
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
                          className="btn-secondary min-h-10 px-3 py-1.5 text-xs inline-flex items-center gap-1.5 cursor-pointer"
                          title="สแกนอ่านข้อมูลสลิปนี้ใหม่"
                        >
                          <RefreshCw
                            className={`w-3.5 h-3.5 ${rescanMutation.isPending ? "animate-spin" : ""}`}
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

                {/* Duplicate Warning */}
                {currentSlip.status === "duplicate" && (
                  <div className="p-4 rounded-xl bg-danger/10 border-2 border-danger text-danger space-y-1">
                    <div className="flex items-center gap-2 font-extrabold text-sm">
                      <ShieldAlert className="w-5 h-5 text-danger" />
                      ตรวจพบสลิปซ้ำในระบบ
                    </div>
                    <p className="text-xs font-medium leading-relaxed text-danger">
                      {currentSlip.lastErrorMessage ||
                        "สลิปนี้มีหมายเลขอ้างอิง รูปภาพ หรือรายการธุรกรรมที่ตรงกับข้อมูลที่มีอยู่แล้วในระบบ"}
                    </p>
                  </div>
                )}

                {/* Who sent it. Never overwritten by the name in the books. */}
                <div className="rounded-xl border-[1.5px] border-[var(--ink)] bg-paper-2 p-3 text-xs space-y-1">
                  <div className="font-extrabold text-ink-2">ผู้ส่งรายการ</div>
                  <div className="font-bold text-ink">
                    {currentSlip.submittedByName ||
                      currentSlip.lineDisplayName ||
                      "—"}
                    {currentSlip.submitterLineId && (
                      <span className="font-medium text-ink-3 break-all">
                        {" "}
                        · LINE ID: {currentSlip.submitterLineId}
                      </span>
                    )}
                  </div>
                  {currentSlip.typedDonorName && (
                    <div className="font-medium text-ink-3">
                      ชื่อที่ผู้ถวายพิมพ์: {currentSlip.typedDonorName}
                    </div>
                  )}
                  {currentSlip.source === "no_slip" && (
                    <div className="text-tile-sand-ink font-extrabold">
                      ส่งโดยไม่มีสลิป · วันที่โอนที่แจ้ง:{" "}
                      {currentSlip.declaredDate
                        ? new Date(currentSlip.declaredDate).toLocaleDateString(
                            THAI_LOCALE
                          )
                        : "—"}
                    </div>
                  )}
                  {currentSlip.lastErrorMessage &&
                    currentSlip.status !== "rejected" && (
                      <div className="text-tile-sand-ink font-medium">
                        {currentSlip.lastErrorMessage}
                      </div>
                    )}
                </div>

                {/* ── 1. หลักฐาน (Evidence) ── */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-extrabold text-ink-2">
                      1. หลักฐานการโอน (สลิป)
                    </h3>
                    {currentSlip.signedImageUrl && (
                      <a
                        href={currentSlip.signedImageUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-secondary min-h-10 px-3 py-1.5 text-xs inline-flex items-center gap-1.5"
                      >
                        <ExternalLink className="w-3.5 h-3.5" /> ดูภาพเต็ม
                      </a>
                    )}
                  </div>
                  <div className="rounded-xl border-2 border-[var(--ink)] overflow-hidden bg-paper-2 max-h-[340px] flex items-center justify-center p-2">
                    {currentSlip.signedImageUrl ? (
                      <img
                        src={currentSlip.signedImageUrl}
                        alt="สลิปการโอนเงิน"
                        className="max-h-[320px] w-auto object-contain rounded-lg"
                      />
                    ) : (
                      <div className="py-16 text-xs font-bold text-ink-3">
                        {currentSlip.source === "no_slip"
                          ? "ผู้ถวายไม่ได้แนบสลิป ตรวจกับยอดเข้าบัญชีธนาคารก่อนอนุมัติ"
                          : "ไม่มีรูปภาพสลิป"}
                      </div>
                    )}
                  </div>
                </div>

                {/* ── 2. ข้อมูลที่ AI อ่านได้ (AI Extraction) ── */}
                <div className="space-y-3 bg-surface border-[1.5px] border-[var(--ink)] p-4 rounded-xl text-xs shadow-[2px_2px_0_var(--ink)]">
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-line">
                    <div className="font-extrabold text-sm text-ink flex items-center gap-1.5">
                      <Search className="w-4 h-4 text-brand" />
                      <span>2. ข้อมูลที่อ่านได้จากสลิป</span>
                    </div>
                    <span className="text-[11px] font-bold text-tile-sand-ink bg-tile-sand px-2 py-0.5 rounded-md border border-[var(--ink)]/20">
                      ข้อมูลจากการตรวจสอบอัตโนมัติ กรุณาตรวจสอบก่อนบันทึก
                    </span>
                  </div>

                  {currentSlip.declaredAmount && (
                    <div className="p-3 rounded-xl bg-tile-sky border-[1.5px] border-[var(--ink)]/25 text-tile-sky-ink text-xs font-bold">
                      ผู้ถวายแจ้งผ่านจุดถวาย:{" "}
                      <span className="font-extrabold tabular-nums">
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
                                `${offeringCategoryLabel(d.category)} ${Number(d.amount).toLocaleString()}`
                            )
                            .join(" + ")}`
                        : currentSlip.declaredCategory &&
                          ` · ${offeringCategoryLabel(currentSlip.declaredCategory)}`}{" "}
                      {currentSlip.extractedAmount ? (
                        Math.abs(
                          Number(currentSlip.declaredAmount) -
                            Number(currentSlip.extractedAmount)
                        ) < 0.005 ? (
                          <span className="block pt-1 font-extrabold text-brand">
                            ตรงกับยอดที่ AI อ่านจากสลิป
                          </span>
                        ) : (
                          <span className="block pt-1 font-extrabold text-danger">
                            ไม่ตรงกับยอดที่ AI อ่านจากสลิป (
                            {formatBaht(Number(currentSlip.extractedAmount))})
                            ตรวจภาพสลิปก่อนอนุมัติ
                          </span>
                        )
                      ) : (
                        <span className="block pt-1 font-medium">
                          (ยังไม่ได้ตรวจสอบ ให้เทียบกับภาพสลิปก่อนอนุมัติ)
                        </span>
                      )}
                    </div>
                  )}

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                    <div className="p-2.5 rounded-lg bg-paper-2 border border-[var(--ink)]/20">
                      <span className="text-ink-3 font-bold block text-[11px]">
                        ยอดเงินที่ตรวจพบ
                      </span>
                      <span className="text-base font-extrabold text-brand tabular-nums block mt-0.5">
                        {currentSlip.extractedAmount
                          ? formatBaht(Number(currentSlip.extractedAmount))
                          : "อ่านไม่ได้"}
                      </span>
                      {currentSlip.extractedAmountConfidence && (
                        <span className="text-[10px] text-brand font-bold">
                          ความมั่นใจ{" "}
                          {(
                            Number(currentSlip.extractedAmountConfidence) * 100
                          ).toFixed(0)}
                          %
                        </span>
                      )}
                    </div>

                    <div className="p-2.5 rounded-lg bg-paper-2 border border-[var(--ink)]/20">
                      <span className="text-ink-3 font-bold block text-[11px]">
                        ชื่อผู้โอนในสลิป
                      </span>
                      <span className="text-xs font-extrabold text-ink block mt-1 truncate">
                        {currentSlip.extractedSenderName || "—"}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-lg bg-paper-2 border border-[var(--ink)]/20">
                      <span className="text-ink-3 font-bold block text-[11px]">
                        ธนาคาร
                      </span>
                      <span className="text-xs font-bold text-ink block mt-1 truncate">
                        {currentSlip.extractedBank || "—"}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-lg bg-paper-2 border border-[var(--ink)]/20">
                      <span className="text-ink-3 font-bold block text-[11px]">
                        วันที่โอน
                      </span>
                      <span className="text-xs font-bold text-ink block mt-1 truncate">
                        {currentSlip.extractedDate
                          ? new Date(currentSlip.extractedDate).toLocaleString(
                              THAI_LOCALE
                            )
                          : "—"}
                      </span>
                    </div>
                  </div>

                  <EscalationNote aiData={currentSlip.aiData} />
                  <ReceiverCheck aiData={currentSlip.aiData} />

                  {currentSlip.extractedRef && (
                    <div className="pt-1 text-[11px] font-bold text-ink-3 font-mono">
                      หมายเลขอ้างอิงสลิป: {currentSlip.extractedRef}
                    </div>
                  )}

                  {!currentSlip.extractedAmount && (
                    <div className="p-3 rounded-xl bg-tile-sand border border-[var(--ink)]/25 text-tile-sand-ink text-xs flex items-center gap-2 font-bold">
                      <AlertTriangle className="w-4 h-4 text-tile-sand-ink shrink-0" />
                      <span>
                        AI ไม่สามารถระบุยอดเงินจากสลิปนี้ได้ชัดเจน
                        กรุณาตรวจดูภาพสลิปแล้วกรอกจำนวนเงินด้วยตนเอง
                      </span>
                    </div>
                  )}

                  {currentSlip.extractedAmountConfidence &&
                    Number(currentSlip.extractedAmountConfidence) < 0.85 && (
                      <div className="p-2.5 rounded-xl bg-tile-sand border border-[var(--ink)]/25 text-tile-sand-ink text-xs flex items-center gap-2 font-bold">
                        <AlertTriangle className="w-3.5 h-3.5 text-tile-sand-ink shrink-0" />
                        <span>
                          ความมั่นใจของ AI ต่ำกว่าเกณฑ์ (
                          {(
                            Number(currentSlip.extractedAmountConfidence) * 100
                          ).toFixed(0)}
                          %) กรุณาตรวจทานยอดเงินและวันที่จากภาพสลิป
                        </span>
                      </div>
                    )}
                </div>

                {/* ── 3. ข้อมูลที่จะบันทึกบัญชี (Ledger Record) ── */}
                <div className="space-y-4 pt-2 border-t-2 border-[var(--ink)]">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-extrabold text-ink-2">
                      3. ข้อมูลที่จะบันทึกบัญชีจริง
                    </h3>
                    <span className="text-[11px] font-bold text-ink-3">
                      ตรวจสอบและระบุบัญชีกองทุนที่ถูกต้อง
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Member Selector */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-extrabold text-ink-2 flex items-center justify-between">
                        <span>สมาชิกผู้ถวาย</span>
                        {currentSlip.lineUserId &&
                          editMemberId &&
                          !currentSlip.lineUserId.startsWith("manual-") && (
                            <button
                              type="button"
                              onClick={handleLinkMember}
                              disabled={linkMemberMutation.isPending}
                              className="text-[11px] text-income hover:underline flex items-center gap-1 font-extrabold"
                            >
                              <Link2 className="w-3 h-3" /> เชื่อมโยง LINE ID
                            </button>
                          )}
                      </label>
                      <NativeSelect
                        value={editMemberId ?? ""}
                        onChange={e =>
                          setEditMemberId(
                            e.target.value ? Number(e.target.value) : null
                          )
                        }
                        disabled={currentSlip.status === "approved"}
                        className="focus:ring-2 focus:ring-brand"
                      >
                        <option value="">
                          -- ไม่ระบุสมาชิก (ผู้ถวายนิรนาม) --
                        </option>
                        {(membersQuery.data ?? []).map((m: any) => (
                          <option key={m.id} value={m.id}>
                            {m.name} {m.envelopeNo ? `(#${m.envelopeNo})` : ""}
                          </option>
                        ))}
                      </NativeSelect>
                      {currentSlip.matchMethod && (
                        <p className="text-[11px] font-bold text-brand">
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

                    {/* Name in the books */}
                    <div className="space-y-1.5 sm:col-span-2">
                      <label
                        htmlFor="inbox-ledger-name"
                        className="text-xs font-extrabold text-ink-2"
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
                        className="neo-input min-h-11 w-full text-sm p-2.5"
                      />
                      <p className="text-[11px] font-medium text-ink-3">
                        ระบบใส่ชื่อบนสลิปให้ ชื่อบนสลิปธนาคารมักถูกปิดบังบางส่วน
                        แก้เป็นชื่อเต็มได้ ผู้ส่งรายการยังบันทึกแยกไว้เสมอ
                      </p>
                    </div>

                    {/* Fund Account */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-extrabold text-ink-2">
                        เข้ากองทุน <span className="text-danger">*</span>
                      </label>
                      <NativeSelect
                        value={editFundId ?? ""}
                        onChange={e => setEditFundId(Number(e.target.value))}
                        disabled={currentSlip.status === "approved"}
                        className="focus:ring-2 focus:ring-brand font-bold"
                      >
                        {(fundsQuery.data ?? []).map((f: any) => (
                          <option key={f.id} value={f.id}>
                            {f.name} (คงเหลือ {formatBaht(Number(f.balance))})
                          </option>
                        ))}
                      </NativeSelect>
                    </div>

                    {/* Amount */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-extrabold text-ink-2">
                        ยอดเงิน (บาท) <span className="text-danger">*</span>
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={editAmount}
                        onChange={e => setEditAmount(e.target.value)}
                        disabled={currentSlip.status === "approved"}
                        className="neo-input min-h-11 w-full text-base font-extrabold tabular-nums text-brand p-2.5"
                      />
                    </div>

                    {/* Category, or one transfer split over several categories */}
                    <div className="space-y-1.5 sm:col-span-2">
                      <div className="flex items-center justify-between gap-2">
                        <label className="text-xs font-extrabold text-ink-2">
                          {editSplit
                            ? "แบ่งยอดตามประเภทการถวาย"
                            : "ประเภทการถวาย"}
                        </label>
                        {!editSplit && currentSlip.status !== "approved" && (
                          <button
                            type="button"
                            onClick={() => {
                              const total = parseFloat(editAmount);
                              if (!total || total <= 0) {
                                toast.error("ใส่ยอดเงินก่อนแบ่งยอด");
                                return;
                              }
                              setEditSplit(startSplit(editCategory, total));
                            }}
                            className="min-h-11 px-2 text-[11px] font-extrabold text-brand underline underline-offset-2"
                          >
                            แบ่งเป็นหลายประเภท
                          </button>
                        )}
                      </div>
                      {editSplit ? (
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
                      ) : (
                        <NativeSelect
                          value={editCategory}
                          onChange={e =>
                            setEditCategory(e.target.value as OfferingCategory)
                          }
                          disabled={currentSlip.status === "approved"}
                          className="focus:ring-2 focus:ring-brand"
                        >
                          {OFFERING_CATEGORIES.map(c => (
                            <option key={c.id} value={c.id}>
                              {c.label}
                            </option>
                          ))}
                        </NativeSelect>
                      )}
                    </div>
                  </div>

                  {/* Notes */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-extrabold text-ink-2">
                      หมายเหตุการตรวจสอบ
                    </label>
                    <input
                      type="text"
                      placeholder="บันทึกเพิ่มเติมของเจ้าหน้าที่ (ถ้ามี)"
                      value={editReviewNote}
                      onChange={e => setEditReviewNote(e.target.value)}
                      disabled={currentSlip.status === "approved"}
                      className="neo-input min-h-11 w-full text-sm p-2.5"
                    />
                  </div>
                </div>

                {/* ── 4. Action ── */}
                {currentSlip.status !== "approved" &&
                currentSlip.status !== "rejected" ? (
                  <div className="space-y-3 pt-4 border-t-2 border-[var(--ink)]">
                    {currentSlip.status === "duplicate" && (
                      <div className="p-3 rounded-xl bg-danger/10 border-2 border-danger text-danger text-xs font-bold flex items-center gap-2">
                        <ShieldAlert className="w-4 h-4 text-danger shrink-0" />
                        <span>
                          สลิปนี้ได้รับการระบุว่าเป็นสลิปซ้ำ (Duplicate)
                          ระบบไม่อนุญาตให้อนุมัติเพื่อป้องกันการลงบัญชีซ้อน
                        </span>
                      </div>
                    )}
                    {currentSlip.source === "no_slip" && (
                      <label className="flex items-start gap-2.5 p-3 rounded-xl border-[1.5px] border-[var(--ink)] bg-tile-sand text-xs font-bold text-tile-sand-ink cursor-pointer">
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
                    <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-3">
                      <button
                        type="button"
                        onClick={handleOpenReject}
                        disabled={
                          approveMutation.isPending || rejectMutation.isPending
                        }
                        className="min-h-11 w-full sm:w-auto px-5 py-2.5 rounded-xl border-2 border-[var(--ink)] bg-danger/10 hover:bg-danger/15 text-danger font-extrabold text-sm shadow-[2px_2px_0_var(--ink)] transition-colors cursor-pointer disabled:opacity-50"
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
                        className="btn-primary min-h-11 w-full sm:w-auto px-7 py-2.5 text-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
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
                  <div className="p-4 rounded-xl bg-paper-2 border-[1.5px] border-[var(--ink)] text-xs font-bold text-ink-2 flex items-center justify-between">
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
            )}
          </div>
        </div>
      </div>

      {/* ── Modal: Manual / Test Slip Upload ── */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="neo-modal p-6 max-w-lg w-full space-y-5 relative">
            <button
              onClick={() => {
                setShowUploadModal(false);
                setUploadPreview(null);
              }}
              className="absolute top-5 right-5 text-ink-3 hover:text-ink p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl border-2 border-[var(--ink)] bg-accent text-accent-foreground shadow-[2px_2px_0_var(--ink)] flex items-center justify-center">
                <UploadCloud className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-extrabold text-ink">
                  อัปโหลดสลิปทดสอบ / ด้วยตนเอง
                </h3>
                <p className="text-xs font-medium text-ink-3">
                  เลือกรูปสลิปจากคอมพิวเตอร์ เพื่อให้ AI
                  ดึงข้อมูลและนำเข้ากล่องสลิปทันที
                </p>
              </div>
            </div>

            {/* Dropzone Area */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
                uploadPreview
                  ? "border-brand bg-paper-2"
                  : "border-[var(--ink)]/40 hover:border-brand bg-paper-2"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={e => void handleFileChange(e)}
                className="hidden"
              />

              {uploadPreview ? (
                <div className="space-y-3">
                  <img
                    src={uploadPreview}
                    alt="ตัวอย่างสลิป"
                    className="max-h-48 mx-auto rounded-xl object-contain"
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
              <label className="text-xs font-extrabold text-ink-2">
                ชื่อผู้ถวาย (ระบุเพิ่มเติมหรือไม่ก็ได้)
              </label>
              <input
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
                className="btn-secondary min-h-11 px-5 py-2.5 text-sm"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleUploadSubmit}
                disabled={!uploadPreview || uploadSlipMutation.isPending}
                className="btn-primary min-h-11 px-6 py-2.5 text-sm disabled:opacity-50 flex items-center gap-2"
              >
                {uploadSlipMutation.isPending
                  ? "กำลังประมวลผล..."
                  : "ส่งให้ AI อ่านสลิป"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: LINE Bot Setup & Info ── */}
      {showLineInfoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="neo-modal p-6 max-w-lg w-full space-y-5 relative">
            <button
              onClick={() => setShowLineInfoModal(false)}
              className="absolute top-5 right-5 text-ink-3 hover:text-ink p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl border-2 border-[var(--ink)] bg-tile-mint text-tile-mint-ink shadow-[2px_2px_0_var(--ink)] flex items-center justify-center">
                <QrCode className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-extrabold text-ink">
                  ข้อมูลการเชื่อมต่อ LINE Official Account
                </h3>
                <p className="text-xs font-medium text-ink-3">
                  รายละเอียดสำหรับการแอดบอทและการตั้งค่าระบบ
                </p>
              </div>
            </div>

            {/* Webhook URL Box */}
            <div className="bg-paper-2 border-[1.5px] border-[var(--ink)] p-3.5 rounded-2xl space-y-1.5">
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
                    toast.success("คัดลอก Webhook URL แล้ว");
                  }}
                  className="text-brand hover:underline flex items-center gap-1 font-extrabold"
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
            <div className="space-y-3 text-xs font-medium text-ink-2">
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

            <div className="flex items-center justify-between gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowLineInfoModal(false);
                  setLocation("/giving/station");
                }}
                className="btn-secondary min-h-11 px-4 py-2.5 text-xs flex items-center gap-1.5 cursor-pointer"
              >
                <QrCode className="w-4 h-4" />
                <span>เปิดโปสเตอร์ป้าย QR ติดหน้าห้อง</span>
              </button>
              <button
                type="button"
                onClick={() => setShowLineInfoModal(false)}
                className="btn-primary min-h-11 px-6 py-2.5 text-sm"
              >
                เข้าใจแล้ว
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Custom Reject Dialog (Phase 5) ── */}
      <Dialog open={showRejectModal} onOpenChange={setShowRejectModal}>
        <DialogContent className="neo-modal max-w-md p-6 text-ink space-y-4">
          <DialogHeader className="space-y-1 text-left">
            <DialogTitle className="text-lg font-extrabold text-ink flex items-center gap-2">
              <XCircle className="w-5 h-5 text-danger" />
              <span>ปฏิเสธสลิป #{currentSlip?.id}</span>
            </DialogTitle>
            <DialogDescription className="text-xs font-medium text-ink-3">
              ระบุเหตุผลการปฏิเสธเพื่อบันทึกประวัติการตรวจสอบ ในระบบ
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
                  className={`px-2.5 py-1 text-xs rounded-lg border-[1.5px] transition-all ${
                    rejectReason === preset
                      ? "bg-danger/15 border-danger text-danger font-extrabold"
                      : "bg-paper-2 border-[var(--ink)]/30 text-ink-2 font-bold hover:bg-surface"
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
              className="btn-secondary min-h-10 px-4 py-2 text-xs"
            >
              ยกเลิก
            </button>
            <button
              type="button"
              onClick={handleConfirmReject}
              disabled={rejectMutation.isPending || !rejectReason.trim()}
              className="min-h-10 px-4 py-2 text-xs font-extrabold rounded-xl border-2 border-[var(--ink)] bg-danger hover:bg-danger/90 text-white shadow-[2px_2px_0_var(--ink)] transition-colors flex items-center gap-1.5 disabled:opacity-50"
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
    cls: "bg-tile-mint border-[var(--ink)]/30 text-tile-mint-ink",
  },
  mismatch: {
    text: "ไม่ตรงกับบัญชีของคริสตจักร ตรวจภาพสลิปก่อนอนุมัติ",
    cls: "bg-danger/10 border-danger/40 text-danger",
  },
  suspect: {
    text: "ต่างจากบัญชีคริสตจักร 1 หลัก อาจอ่านผิด ตรวจภาพสลิปก่อนอนุมัติ",
    cls: "bg-tile-sand border-[var(--ink)]/30 text-tile-sand-ink",
  },
  unknown: {
    text: "ตรวจเทียบอัตโนมัติไม่ได้ (พร้อมเพย์ ปิดเลขมาก หรือยังไม่ได้ตั้งเลขบัญชีคริสตจักร) ให้ดูภาพสลิป",
    cls: "bg-paper-2 border-[var(--ink)]/20 text-ink-2",
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
    <div
      className={`p-3 rounded-xl border-[1.5px] text-xs font-bold ${note.cls}`}
    >
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
      className="p-3 rounded-xl border-[1.5px] border-[var(--ink)]/30 bg-tile-sand text-tile-sand-ink text-xs font-bold"
    >
      <span className="font-extrabold">
        ผู้ถวายส่งไม่ผ่านการตรวจอัตโนมัติหลายครั้งใน 24 ชั่วโมง
      </span>{" "}
      ระบบจึงไม่ปฏิเสธเอง ให้เทียบภาพสลิปกับยอดและบัญชีที่แจ้งด้วยตาก่อนอนุมัติ
    </div>
  );
}
