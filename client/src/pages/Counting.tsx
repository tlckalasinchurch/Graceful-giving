import React, { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  EmptyState,
  ErrorState,
  LoadingSkeleton,
  StatusBadge,
} from "@/components/common/CommonUI";
import {
  confirmDiscardChanges,
  useUnsavedChanges,
} from "@/hooks/useUnsavedChanges";
import { Swal } from "@/lib/sweetalert";
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  Coins,
  FileText,
  Lock,
  Plus,
  RotateCcw,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";

/** The Sunday on or before today, as a yyyy-mm-dd string for a date input. */
function lastSunday(): string {
  const today = new Date();
  const back = today.getDay();
  const sunday = new Date(today);
  sunday.setDate(today.getDate() - back);
  const offset = sunday.getTimezoneOffset();
  return new Date(sunday.getTime() - offset * 60_000)
    .toISOString()
    .slice(0, 10);
}

const fmtThaiDate = (value: Date | string) =>
  new Intl.DateTimeFormat("th-TH", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(value));

type FilterTab = "all" | "pending" | "completed";

export default function Counting() {
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const [showCreate, setShowCreate] = useState(false);
  const [serviceDate, setServiceDate] = useState(lastSunday());
  const [notes, setNotes] = useState("");
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const sessionsQuery = trpc.counting.list.useQuery(undefined, {
    retry: false,
  });

  const isDirty = showCreate && (serviceDate !== lastSunday() || notes !== "");
  useUnsavedChanges(isDirty);

  const closeCreate = async () => {
    if (!(await confirmDiscardChanges(isDirty))) return;
    setShowCreate(false);
    setServiceDate(lastSunday());
    setNotes("");
  };

  const createSession = trpc.counting.create.useMutation({
    onSuccess: async ({ id }) => {
      await utils.counting.list.invalidate();
      setShowCreate(false);
      setNotes("");
      toast.success("เปิดรอบนับเงินถวายแล้ว");
      setLocation(`/counting/${id}`);
    },
    onError: error =>
      toast.error("เปิดรอบไม่สำเร็จ", { description: error.message }),
  });

  const deleteSession = trpc.counting.deleteSession.useMutation({
    onSuccess: async () => {
      await utils.counting.list.invalidate();
      toast.success("ลบรอบนับเงินถวายเรียบร้อยแล้ว");
    },
    onError: error =>
      toast.error("ลบรอบไม่สำเร็จ", { description: error.message }),
  });

  const resetSession = trpc.counting.resetSession.useMutation({
    onSuccess: async (_, variables) => {
      await utils.counting.list.invalidate();
      await utils.counting.get.invalidate({ id: variables.id });
      toast.success("รีเซ็ตรอบเพื่อนับใหม่เรียบร้อยแล้ว");
      setLocation(`/counting/${variables.id}`);
    },
    onError: error =>
      toast.error("รีเซ็ตรอบไม่สำเร็จ", { description: error.message }),
  });

  const handleDeleteSession = async (session: {
    id: number;
    serviceDate: Date | string;
  }) => {
    const dateStr = fmtThaiDate(session.serviceDate);
    const confirmed = await Swal.confirm(
      "ยืนยันการลบรอบนับเงิน?",
      `คุณต้องการลบรอบนับเงินถวายประจำ "${dateStr}" หรือไม่?\n\nข้อมูลซองถวายและผลการนับในรอบนี้จะถูกลบออกจากระบบอย่างถาวร (ไม่มีผลกระทบต่อยอดเงินในบัญชี)`,
      {
        icon: "warning",
        confirmButtonText: "ลบรอบนี้",
        confirmButtonColor: "#C8372D",
        cancelButtonText: "ยกเลิก",
      }
    );

    if (confirmed) {
      deleteSession.mutate({ id: session.id });
    }
  };

  const handleResetSession = async (session: {
    id: number;
    serviceDate: Date | string;
  }) => {
    const dateStr = fmtThaiDate(session.serviceDate);
    const confirmed = await Swal.confirm(
      "ล้างข้อมูลเพื่อนับใหม่?",
      `ต้องการล้างรายการซองถวายและผลนับทั้งหมดของรอบ "${dateStr}" เพื่อเริ่มนับใหม่ใช่หรือไม่?\n\nระบบจะปรับสถานะกลับมาเป็น "กำลังนับ" และล้างรายการที่เคยกรอกไว้เพื่อความถูกต้อง`,
      {
        icon: "question",
        confirmButtonText: "ล้างเพื่อนับใหม่",
        confirmButtonColor: "#C94F16",
        cancelButtonText: "ยกเลิก",
      }
    );

    if (confirmed) {
      resetSession.mutate({ id: session.id });
    }
  };

  const sessions = sessionsQuery.data ?? [];

  const openCount = useMemo(
    () =>
      sessions.filter(
        s =>
          s.status === "counting" ||
          s.status === "counted" ||
          s.status === "verified"
      ).length,
    [sessions]
  );

  const completedCount = useMemo(
    () =>
      sessions.filter(s => s.status === "posted" || s.status === "closed")
        .length,
    [sessions]
  );

  const filteredSessions = useMemo(() => {
    return sessions.filter(session => {
      // Tab filter
      const isPending =
        session.status === "counting" ||
        session.status === "counted" ||
        session.status === "verified";
      if (activeTab === "pending" && !isPending) return false;
      if (activeTab === "completed" && isPending) return false;

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const dateStr = fmtThaiDate(session.serviceDate).toLowerCase();
        const notesStr = (session.notes ?? "").toLowerCase();
        const varStr = (session.varianceNote ?? "").toLowerCase();
        return (
          dateStr.includes(q) || notesStr.includes(q) || varStr.includes(q)
        );
      }
      return true;
    });
  }, [sessions, activeTab, searchQuery]);

  return (
    <AppLayout
      activeRoute="/counting"
      title="นับเงินถวาย"
      subtitle="บันทึกและกระทบยอดเงินถวายของแต่ละวันอาทิตย์"
      action={
        <button
          type="button"
          onClick={() => (showCreate ? closeCreate() : setShowCreate(true))}
          className="min-h-11 inline-flex items-center gap-2 rounded-xl bg-[#C94F16] px-4 py-2.5 text-sm font-bold text-white shadow-sm transition-all duration-200 ease-in-out hover:bg-[#9F3B0F] active:scale-95 hover:shadow-sm disabled:opacity-55 disabled:cursor-not-allowed"
        >
          <Plus className="h-4 w-4" />
          เปิดรอบใหม่
        </button>
      }
    >
      <div className="space-y-6">
        {/* Header Overview Card */}
        {openCount > 0 && (
          <div className="flex items-center gap-2 rounded-xl border border-[#F9D2AE] bg-[#FFF4D6] px-4 py-3 text-sm font-medium text-[#9F3B0F]">
            <Clock className="size-4 shrink-0 text-[#C94F16]" />
            มี {openCount} รอบที่ค้างอยู่หรือกำลังนับ
          </div>
        )}

        {/* Create Form */}
        {showCreate && (
          <form
            onSubmit={event => {
              event.preventDefault();
              createSession.mutate({
                serviceDate: new Date(`${serviceDate}T00:00:00`),
                serviceRound: 1,
                notes: notes.trim() || undefined,
              });
            }}
            className="rounded-2xl border border-[#E7DCC8] bg-card p-6 shadow-sm animate-in fade-in"
          >
            <div className="mb-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#C94F16]/15 text-[#C94F16]">
                  <Calendar className="h-4 w-4" />
                </div>
                <h2 className="font-bold text-[#171311]">
                  เปิดรอบนับเงินถวายใหม่
                </h2>
              </div>
              <button
                type="button"
                onClick={closeCreate}
                aria-label="ปิด"
                className="flex size-10 items-center justify-center rounded-xl text-[#6E6155] hover:bg-[#FFF4D6] transition-all duration-200 ease-in-out"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="text-sm font-semibold text-[#51443A]">
                วันอาทิตย์ที่รับถวาย *
                <input
                  type="date"
                  required
                  value={serviceDate}
                  onChange={event => setServiceDate(event.target.value)}
                  className="mt-1 w-full rounded-xl border border-[#E7DCC8] p-3 text-sm font-normal text-[#171311] focus:border-[#C94F16] focus:outline-none focus:ring-1 focus:ring-[#C94F16]"
                />
              </label>
              <label className="text-sm font-semibold text-[#51443A] md:col-span-2">
                บันทึกเพิ่มเติม
                <textarea
                  rows={2}
                  value={notes}
                  onChange={event => setNotes(event.target.value)}
                  placeholder="เช่น มีถวายพิเศษวันครบรอบคริสตจักร, ถวายพันธกิจคริสต์มาส"
                  className="mt-1 w-full rounded-xl border border-[#E7DCC8] p-3 text-sm font-normal text-[#171311] focus:border-[#C94F16] focus:outline-none focus:ring-1 focus:ring-[#C94F16]"
                />
              </label>
            </div>
            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={closeCreate}
                className="min-h-11 rounded-xl border border-[#E7DCC8] px-4 py-2 text-sm font-bold text-[#51443A] hover:bg-[#FAF8F5] transition-all duration-200 ease-in-out"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                disabled={createSession.isPending}
                className="min-h-11 rounded-xl bg-[#2D6A2E] px-5 py-2 text-sm font-bold text-white shadow-sm hover:bg-[#2D6A2E] transition-all duration-200 ease-in-out disabled:opacity-50 hover:shadow-sm active:scale-[0.98]"
              >
                {createSession.isPending
                  ? "กำลังเปิดรอบ…"
                  : "เปิดรอบและเริ่มนับ"}
              </button>
            </div>
          </form>
        )}

        {/* Filter Controls & Search */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Tabs */}
          <div className="flex items-center gap-1.5 rounded-2xl bg-[#FFF4D6] p-1.5 border border-[#E7DCC8]/80 overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveTab("all")}
              className={`inline-flex min-h-11 items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-semibold transition-all duration-200 ease-in-out shrink-0 ${
                activeTab === "all"
                  ? "bg-card text-[#171311] shadow-xs"
                  : "text-[#51443A] hover:text-[#171311]"
              }`}
            >
              <span>ทั้งหมด</span>
              <span className="rounded-md bg-[#E7DCC8]/50 px-1.5 py-0.5 text-[11px] font-semibold text-[#51443A]">
                {sessions.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("pending")}
              className={`inline-flex min-h-11 items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-semibold transition-all duration-200 ease-in-out shrink-0 ${
                activeTab === "pending"
                  ? "bg-card text-[#9F3B0F] shadow-xs"
                  : "text-[#51443A] hover:text-[#9F3B0F]"
              }`}
            >
              <Clock className="h-3.5 w-3.5 text-[#9F3B0F]" />
              <span>กำลังดำเนินการ / ค้างอยู่</span>
              {openCount > 0 && (
                <span className="rounded-md bg-[#C94F16]/20 px-1.5 py-0.5 text-[11px] font-bold text-[#9F3B0F]">
                  {openCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("completed")}
              className={`inline-flex min-h-11 items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-semibold transition-all duration-200 ease-in-out shrink-0 ${
                activeTab === "completed"
                  ? "bg-card text-[#2D6A2E] shadow-xs"
                  : "text-[#51443A] hover:text-[#2D6A2E]"
              }`}
            >
              <CheckCircle2 className="h-3.5 w-3.5 text-[#2D6A2E]" />
              <span>ปิดรอบเสร็จสมบูรณ์</span>
              <span className="rounded-md bg-[#2D6A2E]/15 px-1.5 py-0.5 text-[11px] font-semibold text-[#2D6A2E]">
                {completedCount}
              </span>
            </button>
          </div>

          {/* Search bar */}
          <div className="relative min-w-[220px]">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6E6155]" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="ค้นหาวันที่, บันทึก..."
              className="min-h-11 w-full rounded-2xl border border-[#E7DCC8] bg-white pl-9 pr-3 py-2 text-base md:text-sm text-[#171311] placeholder-[#6E6155] focus:border-[#C94F16] focus:outline-none focus:ring-1 focus:ring-[#C94F16]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#6E6155] hover:text-[#171311] transition-all duration-200 ease-in-out"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Session List */}
        {sessionsQuery.isLoading ? (
          <LoadingSkeleton count={4} />
        ) : sessionsQuery.isError ? (
          <ErrorState
            title="โหลดรอบนับเงินถวายไม่สำเร็จ"
            description="เชื่อมต่อฐานข้อมูลไม่ได้ กรุณาลองใหม่อีกครั้ง"
            onRetry={() => sessionsQuery.refetch()}
          />
        ) : sessions.length === 0 ? (
          <EmptyState
            title="ยังไม่มีรอบนับเงินถวาย"
            description="เปิดรอบของวันอาทิตย์ล่าสุดเพื่อเริ่มบันทึกซองถวายและนับเงิน"
            actionText="เปิดรอบใหม่"
            onAction={() => setShowCreate(true)}
          />
        ) : filteredSessions.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#E7DCC8] bg-white/60 p-12 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FFF4D6] text-[#C94F16] mb-3">
              <AlertCircle className="h-7 w-7" />
            </div>
            <h3 className="text-base font-bold text-[#171311]">
              ไม่พบรายการในหมวดหมู่นี้
            </h3>
            <p className="mt-1 text-sm text-[#51443A]">
              {searchQuery
                ? `ไม่พบผลการค้นหาสำหรับ "${searchQuery}"`
                : activeTab === "pending"
                  ? "ไม่มีรอบที่ค้างอยู่ ทุกรอบได้รับการปิดรอบเรียบร้อยแล้ว"
                  : "ยังไม่มีรอบที่ปิดบัญชีเสร็จสมบูรณ์"}
            </p>
            {activeTab !== "all" && (
              <button
                type="button"
                onClick={() => {
                  setActiveTab("all");
                  setSearchQuery("");
                }}
                className="mt-4 rounded-xl border border-[#E7DCC8] bg-card px-4 py-2 text-sm font-semibold text-[#51443A] hover:bg-[#FAF8F5] transition-all duration-200 ease-in-out"
              >
                ดูทุกรอบทั้งหมด
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3.5">
            {filteredSessions.map(session => {
              const isUnposted =
                session.status === "counting" ||
                session.status === "counted" ||
                session.status === "verified";

              return (
                <div
                  key={session.id}
                  className={`rounded-2xl border transition-all p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                    isUnposted
                      ? "border-[#E7DCC8] bg-card shadow-xs hover:border-[#C94F16]/60"
                      : "border-[#E7DCC8]/80 bg-card shadow-2xs"
                  }`}
                >
                  {/* Left: Date & Status & Notes */}
                  <div
                    onClick={() => setLocation(`/counting/${session.id}`)}
                    className="min-w-0 cursor-pointer flex-1 group"
                  >
                    <div className="flex flex-wrap items-center gap-2.5">
                      <h2 className="font-bold text-[#171311] group-hover:text-[#C94F16] transition-all duration-200 ease-in-out text-base sm:text-lg">
                        {fmtThaiDate(session.serviceDate)}
                      </h2>
                      <StatusBadge status={session.status} />
                      {!isUnposted && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-[#F5EDE0] px-2 py-0.5 text-[11px] font-medium text-[#51443A]">
                          <Lock className="h-3 w-3 text-[#6E6155]" />
                          ลงบัญชีแล้ว
                        </span>
                      )}
                    </div>

                    {session.varianceNote && (
                      <p className="mt-1 text-xs sm:text-sm font-medium text-[#9F3B0F]">
                        ⚠️ มีบันทึกผลต่าง: {session.varianceNote}
                      </p>
                    )}

                    {session.notes && (
                      <p className="mt-1 truncate text-xs sm:text-sm text-[#51443A]">
                        {session.notes}
                      </p>
                    )}

                    <div className="mt-2 flex items-center gap-4 text-xs text-[#6E6155]">
                      <span>รอบที่ {session.serviceRound ?? 1}</span>
                      <span>•</span>
                      <span>
                        สร้างเมื่อ{" "}
                        {new Date(session.createdAt).toLocaleDateString(
                          "th-TH"
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex flex-wrap items-center gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#EFE5D3]">
                    {isUnposted ? (
                      <>
                        {/* Continue Button */}
                        <button
                          type="button"
                          onClick={() => setLocation(`/counting/${session.id}`)}
                          className="min-h-10 inline-flex items-center gap-1.5 rounded-xl bg-[#C94F16] px-3.5 py-2 text-sm font-semibold text-white shadow-xs hover:bg-[#9F3B0F] transition-all duration-200 ease-in-out active:scale-95 hover:shadow-sm disabled:opacity-55 disabled:cursor-not-allowed"
                        >
                          <span>นับต่อ</span>
                          <ChevronRight className="h-3.5 w-3.5" />
                        </button>

                        {/* Reset / Recount Button */}
                        <button
                          type="button"
                          title="ล้างข้อมูลทั้งหมดในรอบนี้เพื่อเริ่มนับใหม่"
                          onClick={() => handleResetSession(session)}
                          disabled={resetSession.isPending}
                          className="min-h-10 inline-flex items-center gap-1 rounded-xl border border-[#E7DCC8] bg-[#FFF4D6] px-3 py-2 text-sm font-semibold text-[#9F3B0F] hover:bg-[#FFF4D6] hover:border-[#C94F16]/50 transition-all duration-200 ease-in-out disabled:opacity-50"
                        >
                          <RotateCcw className="h-3.5 w-3.5 text-[#9F3B0F]" />
                          <span>นับใหม่</span>
                        </button>

                        {/* Delete Session Button */}
                        <button
                          type="button"
                          title="ลบรอบนับเงินค้างนี้อย่างถาวร"
                          onClick={() => handleDeleteSession(session)}
                          disabled={deleteSession.isPending}
                          className="min-h-10 inline-flex items-center gap-1 rounded-xl border border-[#F8C8C5] bg-[#FEECEB] px-3 py-2 text-sm font-semibold text-[#C8372D] hover:bg-[#FEECEB] hover:border-[#F8C8C5] transition-all duration-200 ease-in-out disabled:opacity-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          <span>ลบรอบค้าง</span>
                        </button>
                      </>
                    ) : (
                      /* Completed session: View Summary */
                      <button
                        type="button"
                        onClick={() => setLocation(`/counting/${session.id}`)}
                        className="min-h-10 inline-flex items-center gap-1.5 rounded-xl border border-[#E7DCC8] bg-card px-4 py-2 text-sm font-semibold text-[#51443A] hover:bg-[#FAF8F5] hover:text-[#171311] transition-all duration-200 ease-in-out"
                      >
                        <FileText className="h-3.5 w-3.5 text-[#2D6A2E]" />
                        <span>ดูสรุป & รายงาน</span>
                        <ChevronRight className="h-3.5 w-3.5 text-[#6E6155]" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
