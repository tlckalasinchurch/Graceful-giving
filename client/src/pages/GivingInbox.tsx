import { useEffect, useState, useRef } from "react";
import { formatBaht } from "@/lib/format";
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
  Clock,
  ExternalLink,
  UserCheck,
  Building,
  Calendar,
  CreditCard,
  Copy,
  RefreshCw,
  Search,
  Check,
  ChevronRight,
  ShieldAlert,
  Sparkles,
  Link2,
  UploadCloud,
  QrCode,
  ArrowRight,
  BookOpen,
  Image as ImageIcon,
  HelpCircle,
  X,
  Zap,
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
import { OFFERING_CATEGORIES, type OfferingCategory } from "@shared/categories";
import { NativeSelect } from "@/components/ui/native-select";
import { ErrorState } from "@/components/common/CommonUI";

/** Baht with at most two decimals; parseFloat would accept "12abc". */
const AMOUNT_PATTERN = /^\d+(\.\d{1,2})?$/;

function parseAmount(value: string): number | null {
  const raw = value.replace(/,/g, "").trim();
  if (!AMOUNT_PATTERN.test(raw)) return null;
  const n = Number(raw);
  return n > 0 ? n : null;
}

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
    bg: "bg-stone-100",
    textCol: "text-stone-700",
    border: "border-stone-300",
  },
  processing: {
    text: "กำลังอ่านสลิป",
    bg: "bg-amber-50",
    textCol: "text-amber-700",
    border: "border-amber-200",
  },
  extracted: {
    text: "อ่านข้อมูลแล้ว",
    bg: "bg-blue-50",
    textCol: "text-blue-700",
    border: "border-blue-200",
  },
  needs_review: {
    text: "ต้องตรวจสอบ",
    bg: "bg-amber-500/10",
    textCol: "text-amber-700",
    border: "border-amber-400",
  },
  matched: {
    text: "พร้อมอนุมัติ",
    bg: "bg-emerald-500/10",
    textCol: "text-emerald-700",
    border: "border-emerald-400",
  },
  duplicate: {
    text: "สลิปซ้ำ",
    bg: "bg-purple-500/10",
    textCol: "text-purple-700",
    border: "border-purple-300",
  },
  approved: {
    text: "อนุมัติแล้ว",
    bg: "bg-emerald-500/15",
    textCol: "text-emerald-800",
    border: "border-emerald-500/30",
  },
  rejected: {
    text: "ปฏิเสธ",
    bg: "bg-rose-500/10",
    textCol: "text-rose-700",
    border: "border-rose-300",
  },
  failed: {
    text: "อ่านสลิปล้มเหลว",
    bg: "bg-rose-100",
    textCol: "text-rose-800",
    border: "border-rose-300",
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
      // Clear the review form first: it still holds the previously opened
      // slip's amount, fund and member until the new slip's data arrives.
      setEditAmount("");
      setEditMemberId(null);
      setEditReviewNote("");
      setEditCategory("general");
      seededKeyRef.current = null;
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
  const [editCategory, setEditCategory] = useState<OfferingCategory>("general");
  const [editMemberId, setEditMemberId] = useState<number | null>(null);
  const [editReviewNote, setEditReviewNote] = useState<string>("");

  // The review form is seeded from a slip once per (slip, extracted amount):
  // on selection, on upload (where only the id is known at first), and again
  // when AI extraction fills in an amount the form did not have yet. A later
  // refetch with the same data does not overwrite what the reviewer typed.
  const seededKeyRef = useRef<string | null>(null);
  const seedKey = (slip: any) =>
    `${slip.id}:${slip.approvedAmount ?? slip.extractedAmount ?? ""}`;
  const seedForm = (slip: any) => {
    seededKeyRef.current = seedKey(slip);
    setEditAmount(slip.approvedAmount || slip.extractedAmount || "");
    setEditFundId(slip.fundId || (fundsQuery.data?.[0]?.id ?? undefined));
    setEditCategory("general");
    setEditMemberId(slip.matchedMemberId || null);
    setEditReviewNote(slip.reviewNote || "");
  };

  const handleSelectSlip = (slip: any) => {
    setSelectedSlipId(slip.id);
    seedForm(slip);
  };

  useEffect(() => {
    if (!currentSlip || seededKeyRef.current === seedKey(currentSlip)) return;
    const sameSlip = seededKeyRef.current?.startsWith(`${currentSlip.id}:`);
    if (!sameSlip || !editAmount) seedForm(currentSlip);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSlip]);

  const handleApprove = async () => {
    if (!currentSlip) return;
    const amountNum = parseAmount(editAmount);
    if (amountNum === null) {
      Swal.error(
        "ยอดเงินไม่ถูกต้อง",
        "กรุณาระบุจำนวนเงินมากกว่า 0 บาท ทศนิยมไม่เกิน 2 ตำแหน่ง"
      );
      return;
    }
    if (!editFundId) {
      Swal.error(
        "ยังไม่ได้เลือกกองทุน",
        "กรุณาเลือกบัญชีกองทุนที่ต้องการนำเงินเข้า"
      );
      return;
    }

    const confirmed = await Swal.confirm(
      "ยืนยันการอนุมัติการถวาย",
      `คุณกำลังจะอนุมัติเงินถวาย ${formatBaht(amountNum)} จาก ${
        currentSlip.matchedMemberName ||
        currentSlip.extractedSenderName ||
        currentSlip.lineDisplayName ||
        "ผู้ถวาย"
      } เข้า${
        fundsQuery.data?.find(f => f.id === editFundId)?.name ??
        "กองทุนที่เลือก"
      } · ${OFFERING_CATEGORIES.find(c => c.id === editCategory)?.label ?? ""}`,
      "อนุมัติและบันทึก"
    );

    if (!confirmed) return;

    approveMutation.mutate({
      slipId: currentSlip.id,
      amount: amountNum,
      fundId: editFundId,
      category: editCategory,
      memberId: editMemberId,
      donorName:
        currentSlip.matchedMemberName || currentSlip.extractedSenderName,
      reviewNote: editReviewNote,
      receiptDate: currentSlip.extractedDate
        ? new Date(currentSlip.extractedDate)
        : new Date(),
    });
  };

  const handleQuickApprove = async (e: React.MouseEvent, slip: any) => {
    e.stopPropagation();
    const amountNum = parseAmount(String(slip.extractedAmount ?? ""));
    const defaultFundId = fundsQuery.data?.[0]?.id;

    if (amountNum === null || !defaultFundId) {
      handleSelectSlip(slip);
      return;
    }

    const confirmed = await Swal.confirm(
      "อนุมัติด่วน?",
      `อนุมัติเงินถวาย ${formatBaht(amountNum)} จาก ${
        slip.matchedMemberName || slip.extractedSenderName || "ผู้ถวาย"
      } เข้า${fundsQuery.data?.[0]?.name} · ประเภทถวายทั่วไป (เปิดสลิปเพื่อเลือกกองทุนหรือประเภทอื่น)`,
      "อนุมัติทันที"
    );

    if (!confirmed) return;

    approveMutation.mutate({
      slipId: slip.id,
      amount: amountNum,
      fundId: defaultFundId,
      category: "general",
      memberId: slip.matchedMemberId,
      donorName: slip.matchedMemberName || slip.extractedSenderName,
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("กรุณาเลือกไฟล์รูปภาพเท่านั้น (JPG, PNG, WEBP)");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setUploadPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
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
      slip.extractedRef?.toLowerCase().includes(q) ||
      String(slip.extractedAmount).includes(q)
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
            className="px-3.5 py-2 rounded-2xl bg-white border border-[#E7DCC8] text-[#51443A] hover:bg-[#FFF8EA] text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs"
            title="ดูสมุดบัญชีเงินถวายที่อนุมัติแล้ว"
          >
            <BookOpen className="w-3.5 h-3.5 text-[#0066CC]" />
            <span className="hidden sm:inline">สมุดบัญชีถวาย</span>
          </button>

          {/* 2. LINE Info / QR Modal */}
          <button
            type="button"
            onClick={() => setShowLineInfoModal(true)}
            className="px-3.5 py-2 rounded-2xl bg-white border border-[#E7DCC8] text-[#51443A] hover:bg-[#FFF8EA] text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs"
            title="ข้อมูลการเชื่อมต่อ LINE และ QR Code"
          >
            <QrCode className="w-3.5 h-3.5 text-[#2F7A45]" />
            <span className="hidden sm:inline">LINE บอท</span>
          </button>

          {/* 3. Manual Test Upload Button */}
          <button
            type="button"
            onClick={() => setShowUploadModal(true)}
            className="px-4 py-2 rounded-xl bg-[#0066CC] hover:bg-[#0052A3] text-white text-xs font-bold button-elevation transition-all flex items-center gap-1.5 shadow-xs"
          >
            <UploadCloud className="w-4 h-4" />
            <span>อัปโหลดสลิป</span>
          </button>

          {/* 4. Refresh Button */}
          <button
            type="button"
            onClick={() => drainWorkerMutation.mutate()}
            disabled={drainWorkerMutation.isPending}
            className="flex size-11 items-center justify-center rounded-xl bg-white border border-[#E7DCC8] text-[#51443A] hover:bg-[#FFF8EA] transition-colors disabled:opacity-50"
            title="รีเฟรชข้อมูลและประมวลผลคิวสลิป"
            aria-label="รีเฟรชข้อมูลและประมวลผลคิวสลิป"
          >
            <RefreshCw
              className={`w-4 h-4 ${drainWorkerMutation.isPending ? "animate-spin" : ""}`}
              aria-hidden="true"
            />
          </button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* ── Stat Summary Tabs ── */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <button
            onClick={() => setSelectedStatus("needs_review")}
            className={`min-h-11 p-3.5 rounded-xl border transition-all text-left ${
              selectedStatus === "needs_review"
                ? "bg-amber-50 border-amber-400 shadow-2xs ring-2 ring-amber-400/20"
                : "bg-white border-[#E7DCC8] hover:bg-[#FFFFFF]"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-800">
                ต้องตรวจสอบ
              </span>
              <AlertTriangle className="w-4 h-4 text-amber-600" />
            </div>
            <div className="text-2xl font-bold text-amber-700 mt-1 tabular-nums">
              {stats?.needs_review ?? 0}
            </div>
          </button>

          <button
            onClick={() => setSelectedStatus("matched")}
            className={`min-h-11 p-3.5 rounded-xl border transition-all text-left ${
              selectedStatus === "matched"
                ? "bg-emerald-50 border-emerald-400 shadow-2xs ring-2 ring-emerald-400/20"
                : "bg-white border-[#E7DCC8] hover:bg-[#FFFFFF]"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-800">
                พร้อมอนุมัติ
              </span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-bold text-emerald-700 mt-1 tabular-nums">
              {stats?.matched ?? 0}
            </div>
          </button>

          <button
            onClick={() => setSelectedStatus("duplicate")}
            className={`min-h-11 p-3.5 rounded-xl border transition-all text-left ${
              selectedStatus === "duplicate"
                ? "bg-purple-50 border-purple-400 shadow-2xs ring-2 ring-purple-400/20"
                : "bg-white border-[#E7DCC8] hover:bg-[#FFFFFF]"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-purple-800">สลิปซ้ำ</span>
              <ShieldAlert className="w-4 h-4 text-purple-600" />
            </div>
            <div className="text-2xl font-bold text-purple-700 mt-1 tabular-nums">
              {stats?.duplicate ?? 0}
            </div>
          </button>

          <button
            onClick={() => setSelectedStatus("approved")}
            className={`min-h-11 p-3.5 rounded-xl border transition-all text-left ${
              selectedStatus === "approved"
                ? "bg-stone-100 border-stone-400 shadow-2xs ring-2 ring-stone-400/20"
                : "bg-white border-[#E7DCC8] hover:bg-[#FFFFFF]"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-stone-700">
                อนุมัติแล้ว
              </span>
              <Check className="w-4 h-4 text-stone-600" />
            </div>
            <div className="text-2xl font-bold text-stone-700 mt-1 tabular-nums">
              {stats?.approved ?? 0}
            </div>
          </button>

          <button
            onClick={() => setSelectedStatus("all")}
            className={`min-h-11 p-3.5 rounded-xl border transition-all text-left col-span-2 sm:col-span-1 ${
              selectedStatus === "all"
                ? "bg-[#FFF8EA] border-[#0066CC] shadow-2xs ring-2 ring-[#0066CC]/20"
                : "bg-white border-[#E7DCC8] hover:bg-[#FFFFFF]"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#51443A]">
                สลิปทั้งหมด
              </span>
              <Inbox className="w-4 h-4 text-[#51443A]" />
            </div>
            <div className="text-2xl font-bold text-[#171311] mt-1 tabular-nums">
              {stats?.total ?? 0}
            </div>
          </button>
        </div>

        {/* ── If Total Slips is 0: Show Warm Onboarding Guide Card ── */}
        {totalSlips === 0 && !slipsQuery.isLoading && (
          <div className="bg-gradient-to-br from-white via-[#FFFFFF] to-[#FFF8EA] rounded-2xl border-2 border-[#E7DCC8] p-6 sm:p-8 shadow-sm">
            <div className="max-w-3xl mx-auto space-y-6 text-center sm:text-left">
              <div className="flex flex-col sm:flex-row items-center gap-5">
                <div className="w-16 h-16 rounded-2xl bg-[#2F7A45]/15 border-2 border-[#2F7A45]/30 flex items-center justify-center text-[#2F7A45] shrink-0">
                  <Sparkles className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-xl sm:text-2xl font-bold text-[#171311]">
                    ยินดีต้อนรับสู่ระบบ LINE Slip AI 🌿
                  </h3>
                  <p className="text-sm text-[#807266] mt-1">
                    ระบบพร้อมรับภาพสลิปจากสมาชิกผ่าน LINE เพื่อสกัดข้อมูล
                    ตรวจสอบยอดเงิน และให้เหรัญญิกอนุมัติ
                  </p>
                </div>
              </div>

              {/* 3 Simple Steps */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                <div className="p-4 rounded-2xl bg-white border border-[#E7DCC8] space-y-2">
                  <div className="w-8 h-8 rounded-xl bg-[#0066CC]/20 text-[#0066CC] font-bold text-sm flex items-center justify-center">
                    1
                  </div>
                  <h4 className="font-bold text-sm text-[#171311]">
                    สมาชิกส่งสลิปทาง LINE
                  </h4>
                  <p className="text-xs text-[#807266] leading-relaxed">
                    สมาชิกโอนเงินเข้าบัญชีคริสตจักร
                    แล้วส่งรูปสลิปเข้ามาในห้องแชท LINE OA
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-white border border-[#E7DCC8] space-y-2">
                  <div className="w-8 h-8 rounded-xl bg-[#2F7A45]/20 text-[#2F7A45] font-bold text-sm flex items-center justify-center">
                    2
                  </div>
                  <h4 className="font-bold text-sm text-[#171311]">
                    AI อ่านข้อมูลอัตโนมัติ
                  </h4>
                  <p className="text-xs text-[#807266] leading-relaxed">
                    ระบบดึงยอดเงิน วันที่ บัญชี ตรวจสลิปซ้ำ
                    และจับคู่สมาชิกคริสตจักรทันที
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-white border border-[#E7DCC8] space-y-2">
                  <div className="w-8 h-8 rounded-xl bg-[#0066CC]/20 text-[#0066CC] font-bold text-sm flex items-center justify-center">
                    3
                  </div>
                  <h4 className="font-bold text-sm text-[#171311]">
                    เหรัญญิกกดอนุมัติ
                  </h4>
                  <p className="text-xs text-[#807266] leading-relaxed">
                    ตรวจสอบความถูกต้อง
                    และกดอนุมัติเพื่อบันทึกเข้าสมุดบัญชีเงินถวายทันที
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(true)}
                  className="px-6 py-3 rounded-xl bg-[#0066CC] hover:bg-[#0052A3] text-white font-bold text-sm shadow-md transition-all flex items-center gap-2"
                >
                  <UploadCloud className="w-4 h-4" />{" "}
                  ทดลองอัปโหลดสลิปจากเครื่องเดี๋ยวนี้
                </button>
                <button
                  type="button"
                  onClick={() => setShowLineInfoModal(true)}
                  className="px-5 py-3 rounded-2xl bg-white border border-[#E7DCC8] text-[#51443A] hover:bg-[#FFF8EA] font-bold text-sm transition-all flex items-center gap-2"
                >
                  <QrCode className="w-4 h-4 text-[#2F7A45]" /> ดูวิธีเชื่อมต่อ
                  LINE OA
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
            <div className="bg-white rounded-2xl border border-[#E7DCC8] p-3 shadow-2xs flex items-center gap-2">
              <Search
                className="w-4 h-4 text-[#807266] ml-2"
                aria-hidden="true"
              />
              <input
                type="search"
                aria-label="ค้นหาสลิป"
                placeholder="ค้นหาชื่อผู้โอน, สมาชิก, ยอดเงิน..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="min-h-11 w-full text-base md:text-sm bg-transparent border-0 focus:outline-none text-[#171311]"
              />
            </div>

            {/* Slips Cards */}
            {slipsQuery.isLoading ? (
              <div className="p-12 text-center text-sm text-[#807266] bg-white rounded-2xl border border-[#E7DCC8]">
                กำลังโหลดรายการสลิป...
              </div>
            ) : slipsQuery.isError ? (
              <ErrorState
                title="โหลดรายการสลิปไม่สำเร็จ"
                description="เชื่อมต่อฐานข้อมูลไม่สำเร็จ กรุณาลองใหม่อีกครั้ง"
                onRetry={() => void slipsQuery.refetch()}
              />
            ) : filteredSlips.length === 0 ? (
              <div className="p-12 text-center text-[#807266] bg-white rounded-2xl border border-[#E7DCC8] space-y-3">
                <CheckCircle2 className="w-10 h-10 text-emerald-600/50 mx-auto" />
                <p className="font-bold">ไม่มีรายการสลิปในหมวดนี้</p>
                <p className="text-xs text-[#807266] max-w-xs mx-auto">
                  สลิปใหม่ที่ส่งเข้า LINE หรืออัปโหลดทดสอบจะปรากฏที่นี่
                </p>
                <button
                  type="button"
                  onClick={() => setShowUploadModal(true)}
                  className="min-h-11 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#FFF8EA] border border-[#E7DCC8] text-[#51443A] text-xs font-bold hover:bg-[#FFF4D6] transition-all"
                >
                  <UploadCloud className="w-3.5 h-3.5" /> อัปโหลดสลิปทดสอบ
                </button>
              </div>
            ) : (
              <div className="space-y-3 max-h-[720px] overflow-y-auto pr-1">
                {filteredSlips.map(slip => {
                  const statusConf = STATUS_LABELS[slip.status] || {
                    text: slip.status,
                    bg: "bg-stone-100",
                    textCol: "text-stone-700",
                    border: "border-stone-200",
                  };
                  const isSelected = slip.id === selectedSlipId;

                  return (
                    <div
                      key={slip.id}
                      className={`rounded-2xl border transition-colors ${
                        isSelected
                          ? "bg-[#FFF8EA] border-[#0066CC] ring-2 ring-[#0066CC]/20"
                          : "bg-white border-[#E7DCC8] hover:border-[#0066CC]"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => handleSelectSlip(slip)}
                        aria-pressed={isSelected}
                        className="block w-full p-4 text-left rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#0066CC]"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            {slip.signedImageUrl ? (
                              <img
                                src={slip.signedImageUrl}
                                alt="สลิป"
                                className="w-14 h-14 object-cover rounded-xl border border-[#E7DCC8] shrink-0 bg-stone-100"
                              />
                            ) : (
                              <div className="w-14 h-14 rounded-xl bg-stone-100 border border-[#E7DCC8] flex items-center justify-center text-stone-400 shrink-0">
                                <CreditCard className="w-6 h-6" />
                              </div>
                            )}
                            <div className="min-w-0">
                              <div className="font-bold text-base text-[#171311] truncate">
                                {slip.matchedMemberName ||
                                  slip.extractedSenderName ||
                                  slip.lineDisplayName ||
                                  "ผู้ถวาย"}
                              </div>
                              <div className="text-xs text-[#807266] flex items-center gap-1.5 mt-0.5 truncate">
                                <span>{slip.lineDisplayName || "ผู้ใช้"}</span>
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
                            <div className="text-lg font-bold text-[#0066CC]">
                              {slip.extractedAmount
                                ? formatBaht(Number(slip.extractedAmount))
                                : "—"}
                            </div>
                            <span
                              className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold border mt-1 ${statusConf.bg} ${statusConf.textCol} ${statusConf.border}`}
                            >
                              {statusConf.text}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-[#E7DCC8]/50 text-xs text-[#807266]">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            {slip.extractedDate
                              ? new Date(slip.extractedDate).toLocaleDateString(
                                  "th-TH",
                                  {
                                    day: "numeric",
                                    month: "short",
                                    year: "2-digit",
                                  }
                                )
                              : new Date(slip.createdAt).toLocaleDateString(
                                  "th-TH"
                                )}
                          </span>

                          {slip.extractedRef && (
                            <span className="font-mono text-xs truncate max-w-[130px]">
                              Ref: {slip.extractedRef}
                            </span>
                          )}
                        </div>
                      </button>

                      {/* Quick approve sits outside the select button: a
                          button inside a button is invalid and unreachable. */}
                      {slip.status === "matched" && (
                        <div className="px-4 pb-4">
                          <button
                            type="button"
                            onClick={e => handleQuickApprove(e, slip)}
                            disabled={approveMutation.isPending}
                            className="min-h-11 inline-flex items-center gap-1.5 px-4 rounded-xl bg-[#2D6A2E] hover:bg-[#235324] text-white font-bold text-sm transition-colors disabled:opacity-50"
                            title="อนุมัติด่วนด้วยข้อมูลที่จับคู่ได้"
                          >
                            <Zap className="w-4 h-4" aria-hidden="true" />{" "}
                            อนุมัติด่วน
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right Column: Slip Detail & Review Form (7 cols on lg) */}
          <div className="lg:col-span-7">
            {!selectedSlipId || !currentSlip ? (
              <div className="p-12 text-center bg-white rounded-2xl border border-dashed border-[#E7DCC8] text-[#807266] space-y-3 min-h-[420px] flex flex-col items-center justify-center">
                <Inbox className="w-12 h-12 text-[#0066CC]/50" />
                <div className="font-bold text-base text-[#171311]">
                  เลือกสลิปจากรายการด้านซ้าย
                </div>
                <p className="text-xs max-w-sm text-stone-500">
                  เพื่อตรวจสอบหลักฐาน ข้อมูลที่ AI แนะนำ
                  และอนุมัติบันทึกลงบัญชีเงินถวาย
                </p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-[#E7DCC8] p-5 sm:p-6 shadow-xs space-y-6 animate-in fade-in duration-150">
                {/* Header of Detail */}
                <div className="flex items-start justify-between gap-4 pb-4 border-b border-[#E7DCC8]">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg sm:text-xl font-bold text-[#171311]">
                        ตรวจสอบสลิป #{currentSlip.id}
                      </h2>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                          STATUS_LABELS[currentSlip.status]?.bg
                        } ${STATUS_LABELS[currentSlip.status]?.textCol} ${
                          STATUS_LABELS[currentSlip.status]?.border
                        }`}
                      >
                        {STATUS_LABELS[currentSlip.status]?.text ||
                          currentSlip.status}
                      </span>
                    </div>
                    <p className="text-xs text-stone-500 mt-1">
                      ส่งเข้ามาเมื่อ:{" "}
                      {new Date(currentSlip.createdAt).toLocaleString("th-TH")}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {currentSlip.status !== "approved" &&
                      currentSlip.status !== "rejected" && (
                        <button
                          type="button"
                          onClick={() => handleRescan(currentSlip.id)}
                          disabled={rescanMutation.isPending}
                          className="min-h-11 px-3 py-1.5 rounded-xl border border-amber-300 bg-amber-50 text-xs font-bold text-amber-800 hover:bg-amber-100 inline-flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                          title="ให้ AI สแกนอ่านข้อมูลสลิปนี้ใหม่"
                        >
                          <Sparkles
                            className={`w-3.5 h-3.5 text-amber-600 ${rescanMutation.isPending ? "animate-spin" : ""}`}
                          />
                          <span>
                            {rescanMutation.isPending
                              ? "กำลังอ่านข้อมูล..."
                              : "สแกน AI ใหม่"}
                          </span>
                        </button>
                      )}
                  </div>
                </div>

                {/* Duplicate Warning */}
                {currentSlip.status === "duplicate" && (
                  <div className="p-4 rounded-xl bg-purple-50 border border-purple-300 text-purple-900 space-y-1">
                    <div className="flex items-center gap-2 font-bold text-sm">
                      <ShieldAlert className="w-5 h-5 text-purple-600" />
                      ตรวจพบสลิปซ้ำ (Duplicate Detected)
                    </div>
                    <p className="text-xs leading-relaxed text-purple-800">
                      {currentSlip.lastErrorMessage ||
                        "สลิปนี้มีหมายเลขอ้างอิง รูปภาพ หรือรายการธุรกรรมที่ตรงกับข้อมูลที่มีอยู่แล้วในระบบ"}
                    </p>
                  </div>
                )}

                {/* ── 1. หลักฐาน (Evidence) ── */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-[#51443A] uppercase tracking-wider">
                      1. หลักฐานการโอน (สลิป)
                    </h3>
                    {currentSlip.signedImageUrl && (
                      <a
                        href={currentSlip.signedImageUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="min-h-11 px-3 py-1.5 rounded-xl border border-[#E7DCC8] bg-[#FFF8EA] text-xs font-bold text-[#51443A] hover:bg-[#FFF4D6] inline-flex items-center gap-1.5 transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5" /> ดูภาพเต็ม
                      </a>
                    )}
                  </div>
                  <div className="rounded-xl border border-[#E7DCC8] overflow-hidden bg-stone-50 max-h-[340px] flex items-center justify-center p-2">
                    {currentSlip.signedImageUrl ? (
                      <img
                        src={currentSlip.signedImageUrl}
                        alt="สลิปการโอนเงิน"
                        className="max-h-[320px] w-auto object-contain rounded-lg shadow-2xs"
                      />
                    ) : (
                      <div className="py-16 text-xs text-stone-400">
                        ไม่มีรูปภาพสลิป
                      </div>
                    )}
                  </div>
                </div>

                {/* ── 2. ข้อมูลที่ AI อ่านได้ (AI Extraction) ── */}
                <div className="space-y-3 bg-[#FFFFFF] border border-[#E7DCC8] p-4 rounded-xl text-xs">
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[#E7DCC8]/50">
                    <div className="font-bold text-sm text-[#171311] flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-[#0066CC]" />
                      <span>2. ข้อมูลที่ AI อ่านได้</span>
                    </div>
                    <span className="text-[11px] text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                      ข้อมูลแนะนำจาก AI กรุณาตรวจสอบก่อนบันทึก
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                    <div className="p-2.5 rounded-lg bg-white border border-[#E7DCC8]/60">
                      <span className="text-stone-500 block text-[11px]">
                        ยอดเงินที่ตรวจพบ
                      </span>
                      <span className="text-base font-bold text-[#0066CC] tabular-nums block mt-0.5">
                        {currentSlip.extractedAmount
                          ? formatBaht(Number(currentSlip.extractedAmount))
                          : "อ่านไม่ได้"}
                      </span>
                      {currentSlip.extractedAmountConfidence && (
                        <span className="text-[10px] text-emerald-700 font-medium">
                          ความมั่นใจ{" "}
                          {(
                            Number(currentSlip.extractedAmountConfidence) * 100
                          ).toFixed(0)}
                          %
                        </span>
                      )}
                    </div>

                    <div className="p-2.5 rounded-lg bg-white border border-[#E7DCC8]/60">
                      <span className="text-stone-500 block text-[11px]">
                        ชื่อผู้โอนในสลิป
                      </span>
                      <span className="text-xs font-bold text-[#171311] block mt-1 truncate">
                        {currentSlip.extractedSenderName || "—"}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-lg bg-white border border-[#E7DCC8]/60">
                      <span className="text-stone-500 block text-[11px]">
                        ธนาคาร
                      </span>
                      <span className="text-xs font-medium text-[#171311] block mt-1 truncate">
                        {currentSlip.extractedBank || "—"}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-lg bg-white border border-[#E7DCC8]/60">
                      <span className="text-stone-500 block text-[11px]">
                        วันที่โอน
                      </span>
                      <span className="text-xs font-medium text-[#171311] block mt-1 truncate">
                        {currentSlip.extractedDate
                          ? new Date(currentSlip.extractedDate).toLocaleString(
                              "th-TH"
                            )
                          : "—"}
                      </span>
                    </div>
                  </div>

                  {currentSlip.extractedRef && (
                    <div className="pt-1 text-[11px] text-stone-500 font-mono">
                      หมายเลขอ้างอิงสลิป: {currentSlip.extractedRef}
                    </div>
                  )}

                  {!currentSlip.extractedAmount && (
                    <div className="p-3 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs flex items-center gap-2 font-medium">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>
                        AI ไม่สามารถระบุยอดเงินจากสลิปนี้ได้ชัดเจน
                        กรุณาตรวจดูภาพสลิปแล้วกรอกจำนวนเงินด้วยตนเอง
                      </span>
                    </div>
                  )}

                  {currentSlip.extractedAmountConfidence &&
                    Number(currentSlip.extractedAmountConfidence) < 0.85 && (
                      <div className="p-2.5 rounded-xl bg-amber-50/80 border border-amber-200 text-amber-800 text-xs flex items-center gap-2 font-medium">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
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
                <div className="space-y-4 pt-2 border-t border-[#E7DCC8]">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-[#51443A] uppercase tracking-wider">
                      3. ข้อมูลที่จะบันทึกบัญชีจริง
                    </h3>
                    <span className="text-[11px] text-stone-500">
                      ตรวจสอบและระบุบัญชีกองทุนที่ถูกต้อง
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Member Selector */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-[#51443A] flex items-center justify-between">
                        <span>สมาชิกผู้ถวาย</span>
                        {currentSlip.lineUserId &&
                          editMemberId &&
                          !currentSlip.lineUserId.startsWith("manual-") && (
                            <button
                              type="button"
                              onClick={handleLinkMember}
                              disabled={linkMemberMutation.isPending}
                              className="text-[11px] text-[#2F7A45] hover:underline flex items-center gap-1 font-semibold"
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
                        className="focus:ring-2 focus:ring-[#0066CC]"
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
                        <p className="text-[11px] text-emerald-700">
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

                    {/* Fund Account */}
                    <div className="space-y-1.5">
                      <label
                        htmlFor="slip-fund"
                        className="text-xs font-bold text-[#51443A]"
                      >
                        เข้ากองทุน{" "}
                        <span className="text-[#C8372D]" aria-hidden="true">
                          *
                        </span>
                      </label>
                      <NativeSelect
                        id="slip-fund"
                        value={editFundId ?? ""}
                        onChange={e => setEditFundId(Number(e.target.value))}
                        disabled={currentSlip.status === "approved"}
                        className="focus:ring-2 focus:ring-[#0066CC] font-medium"
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
                      <label
                        htmlFor="slip-amount"
                        className="text-xs font-bold text-[#51443A]"
                      >
                        ยอดเงิน (บาท){" "}
                        <span className="text-[#C8372D]" aria-hidden="true">
                          *
                        </span>
                      </label>
                      <input
                        id="slip-amount"
                        type="number"
                        inputMode="decimal"
                        min="0.01"
                        step="0.01"
                        value={editAmount}
                        onChange={e => setEditAmount(e.target.value)}
                        disabled={currentSlip.status === "approved"}
                        className="min-h-11 w-full text-base font-bold tabular-nums text-[#0066CC] rounded-xl border border-[#E7DCC8] bg-white p-2.5 focus:ring-2 focus:ring-[#0066CC] focus:outline-none"
                      />
                    </div>

                    {/* Category */}
                    <div className="space-y-1.5">
                      <label
                        htmlFor="slip-category"
                        className="text-xs font-bold text-[#51443A]"
                      >
                        ประเภทการถวาย
                      </label>
                      <NativeSelect
                        id="slip-category"
                        value={editCategory}
                        onChange={e =>
                          setEditCategory(e.target.value as OfferingCategory)
                        }
                        disabled={currentSlip.status === "approved"}
                        className="focus:ring-2 focus:ring-[#0066CC]"
                      >
                        {OFFERING_CATEGORIES.map(c => (
                          <option key={c.id} value={c.id}>
                            {c.label}
                          </option>
                        ))}
                      </NativeSelect>
                    </div>
                  </div>

                  {/* Notes */}
                  <div className="space-y-1.5">
                    <label
                      htmlFor="slip-note"
                      className="text-xs font-bold text-[#51443A]"
                    >
                      หมายเหตุการตรวจสอบ
                    </label>
                    <input
                      id="slip-note"
                      type="text"
                      placeholder="บันทึกเพิ่มเติมของเจ้าหน้าที่ (ถ้ามี)"
                      value={editReviewNote}
                      onChange={e => setEditReviewNote(e.target.value)}
                      disabled={currentSlip.status === "approved"}
                      className="min-h-11 w-full text-base md:text-sm rounded-xl border border-[#E7DCC8] bg-white p-2.5 focus:ring-2 focus:ring-[#0066CC] focus:outline-none"
                    />
                  </div>
                </div>

                {/* ── 4. Action ── */}
                {currentSlip.status !== "approved" &&
                currentSlip.status !== "rejected" ? (
                  <div className="space-y-3 pt-4 border-t border-[#E7DCC8]">
                    {currentSlip.status === "duplicate" && (
                      <div className="p-3 rounded-xl bg-purple-50 border border-purple-300 text-purple-900 text-xs flex items-center gap-2">
                        <ShieldAlert className="w-4 h-4 text-purple-600 shrink-0" />
                        <span>
                          สลิปนี้ได้รับการระบุว่าเป็นสลิปซ้ำ (Duplicate)
                          ระบบไม่อนุญาตให้อนุมัติเพื่อป้องกันการลงบัญชีซ้อน
                        </span>
                      </div>
                    )}
                    <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-3">
                      <button
                        type="button"
                        onClick={handleOpenReject}
                        disabled={
                          approveMutation.isPending || rejectMutation.isPending
                        }
                        className="min-h-11 w-full sm:w-auto px-5 py-2.5 rounded-xl border border-rose-300 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-sm transition-colors cursor-pointer disabled:opacity-50"
                      >
                        ปฏิเสธสลิป
                      </button>

                      <button
                        type="button"
                        onClick={handleApprove}
                        disabled={
                          approveMutation.isPending ||
                          rejectMutation.isPending ||
                          currentSlip.status === "duplicate"
                        }
                        className="min-h-11 w-full sm:w-auto px-7 py-2.5 rounded-xl bg-[#2D6A2E] hover:bg-[#235324] text-white font-bold text-sm shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
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
                  <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 text-xs text-stone-600 flex items-center justify-between">
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
                          "th-TH"
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
          <div className="bg-white rounded-2xl border-2 border-[#E7DCC8] p-6 max-w-lg w-full space-y-5 shadow-2xl relative">
            <button
              onClick={() => {
                setShowUploadModal(false);
                setUploadPreview(null);
              }}
              className="absolute top-5 right-5 text-stone-400 hover:text-stone-700 p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#0066CC]/20 text-[#0066CC] flex items-center justify-center">
                <UploadCloud className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-[#171311]">
                  อัปโหลดสลิปทดสอบ / ด้วยตนเอง
                </h3>
                <p className="text-xs text-[#807266]">
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
                  ? "border-[#0066CC] bg-[#FAF8F5]"
                  : "border-[#E7DCC8] hover:border-[#0066CC] bg-stone-50"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />

              {uploadPreview ? (
                <div className="space-y-3">
                  <img
                    src={uploadPreview}
                    alt="ตัวอย่างสลิป"
                    className="max-h-48 mx-auto rounded-xl object-contain shadow-xs"
                  />
                  <p className="text-xs text-[#0066CC] font-bold">
                    คลิกเพื่อเปลี่ยนรูปภาพ
                  </p>
                </div>
              ) : (
                <div className="space-y-2 py-4">
                  <ImageIcon className="w-10 h-10 text-stone-400 mx-auto" />
                  <p className="font-bold text-sm text-[#171311]">
                    คลิกเพื่อเลือกไฟล์รูปสลิป
                  </p>
                  <p className="text-xs text-[#807266]">
                    รองรับไฟล์ JPG, PNG, WEBP
                  </p>
                </div>
              )}
            </div>

            {/* Optional donor name */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#51443A]">
                ชื่อผู้ถวาย (ระบุเพิ่มเติมหรือไม่ก็ได้)
              </label>
              <input
                type="text"
                placeholder="เช่น นายสมชาย สุขใจ"
                value={uploadDonorName}
                onChange={e => setUploadDonorName(e.target.value)}
                className="w-full text-sm rounded-xl border border-[#E7DCC8] p-2.5 focus:ring-2 focus:ring-[#0066CC] focus:outline-none"
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
                className="px-5 py-2.5 rounded-2xl border border-[#E7DCC8] text-[#51443A] font-bold text-sm hover:bg-stone-50"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleUploadSubmit}
                disabled={!uploadPreview || uploadSlipMutation.isPending}
                className="px-6 py-2.5 rounded-xl bg-[#0066CC] hover:bg-[#0052A3] text-white font-bold text-sm shadow-md disabled:opacity-50 flex items-center gap-2"
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
          <div className="bg-white rounded-2xl border-2 border-[#E7DCC8] p-6 max-w-lg w-full space-y-5 shadow-2xl relative">
            <button
              onClick={() => setShowLineInfoModal(false)}
              className="absolute top-5 right-5 text-stone-400 hover:text-stone-700 p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#2F7A45]/20 text-[#2F7A45] flex items-center justify-center">
                <QrCode className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-[#171311]">
                  ข้อมูลการเชื่อมต่อ LINE Official Account
                </h3>
                <p className="text-xs text-[#807266]">
                  รายละเอียดสำหรับการแอดบอทและการตั้งค่าระบบ
                </p>
              </div>
            </div>

            {/* Webhook URL Box */}
            <div className="bg-stone-50 border border-[#E7DCC8] p-3.5 rounded-2xl space-y-1.5">
              <div className="flex items-center justify-between text-xs font-bold text-[#51443A]">
                <span>Webhook URL สำหรับ LINE Developers</span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(
                      "https://graceful-giving.vercel.app/api/line/webhook"
                    );
                    toast.success("คัดลอก Webhook URL แล้ว");
                  }}
                  className="text-emerald-700 hover:underline flex items-center gap-1 font-semibold"
                >
                  <Copy className="w-3.5 h-3.5" /> คัดลอก
                </button>
              </div>
              <div className="font-mono text-xs bg-white p-2 rounded-xl border border-[#E7DCC8] text-[#171311] break-all select-all">
                https://graceful-giving.vercel.app/api/line/webhook
              </div>
            </div>

            {/* Instructions */}
            <div className="space-y-3 text-xs text-[#3F3833]">
              <div className="font-bold text-sm text-[#171311]">
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

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowLineInfoModal(false)}
                className="px-6 py-2.5 rounded-xl bg-[#0066CC] text-white font-bold text-sm shadow-xs hover:bg-[#0052A3]"
              >
                เข้าใจแล้ว
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Custom Reject Dialog (Phase 5) ── */}
      <Dialog open={showRejectModal} onOpenChange={setShowRejectModal}>
        <DialogContent className="max-w-md bg-white border border-[#E7DCC8] rounded-2xl p-6 text-[#171311] space-y-4 shadow-xl">
          <DialogHeader className="space-y-1 text-left">
            <DialogTitle className="text-lg font-bold text-[#171311] flex items-center gap-2">
              <XCircle className="w-5 h-5 text-rose-600" />
              <span>ปฏิเสธสลิป #{currentSlip?.id}</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-stone-500">
              ระบุเหตุผลการปฏิเสธเพื่อบันทึกประวัติการตรวจสอบ ในระบบ
            </DialogDescription>
          </DialogHeader>

          {/* Quick Preset Reason Chips */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-[#51443A] block">
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
                  className={`px-2.5 py-1 text-xs rounded-lg border transition-all ${
                    rejectReason === preset
                      ? "bg-rose-100 border-rose-400 text-rose-800 font-bold"
                      : "bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100"
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
              className="text-xs font-bold text-[#51443A] block"
            >
              ระบุเหตุผล <span className="text-rose-500">*</span>
            </label>
            <textarea
              id="reject-reason"
              rows={3}
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              placeholder="ระบุรายละเอียดเหตุผลการปฏิเสธสลิปนี้..."
              className="w-full text-sm rounded-xl border border-[#E7DCC8] p-3 focus:outline-none focus:ring-2 focus:ring-rose-400 resize-none"
            />
          </div>

          <DialogFooter className="flex flex-row items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={() => setShowRejectModal(false)}
              disabled={rejectMutation.isPending}
              className="px-4 py-2 text-xs font-bold rounded-xl border border-stone-300 text-stone-700 hover:bg-stone-100 transition-colors"
            >
              ยกเลิก
            </button>
            <button
              type="button"
              onClick={handleConfirmReject}
              disabled={rejectMutation.isPending || !rejectReason.trim()}
              className="px-4 py-2 text-xs font-bold rounded-xl bg-rose-600 hover:bg-rose-700 text-white transition-colors flex items-center gap-1.5 disabled:opacity-50"
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
