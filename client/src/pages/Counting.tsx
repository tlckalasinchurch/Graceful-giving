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
  FileText,
  Lock,
  Plus,
  RotateCcw,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { THAI_LOCALE } from "@/lib/format";

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
  new Intl.DateTimeFormat(THAI_LOCALE, {
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
        confirmButtonText: "ลบรอบถาวร",
        cancelButtonText: "ยกเลิก",
        confirmButtonColor: "#e11d48",
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
      "รีเซ็ตรอบเพื่อนับใหม่ตั้งแต่ต้น?",
      `ต้องการล้างข้อมูลซองถวายและผลนับของ "${dateStr}" เพื่อเริ่มนับใหม่ใช่หรือไม่?\n\nรอบนี้จะยังคงอยู่ แต่ซองถวายและผลการนับเดิมจะถูกล้างออกทั้งหมด`,
      {
        icon: "question",
        confirmButtonText: "ล้างข้อมูลและนับใหม่",
        cancelButtonText: "ยกเลิก",
        confirmButtonColor: "#4f46e5",
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
      const isPending =
        session.status === "counting" ||
        session.status === "counted" ||
        session.status === "verified";
      if (activeTab === "pending" && !isPending) return false;
      if (activeTab === "completed" && isPending) return false;

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
      eyebrow="Counting"
      title="นับเงินถวาย"
      subtitle="บันทึกและกระทบยอดเงินถวายของแต่ละวันอาทิตย์"
      action={
        <button
          type="button"
          onClick={() => (showCreate ? closeCreate() : setShowCreate(true))}
          className="min-h-11 inline-flex items-center gap-2 rounded-2xl bg-brand px-4 py-2.5 text-sm font-bold text-white shadow-[0_6px_16px_-4px_rgba(79,70,229,0.45)] transition-all hover:bg-brand-ink active:scale-95"
        >
          <Plus className="h-4 w-4" />
          เปิดรอบใหม่
        </button>
      }
    >
      <div className="space-y-6">
        {/* Header Overview Card */}
        {openCount > 0 && (
          <div className="flex items-center gap-2.5 rounded-2xl bg-tile-peach px-4 py-3.5 text-sm font-bold text-tile-peach-ink">
            <Clock className="size-4 shrink-0" />
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
            className="rounded-3xl bg-surface p-6 sm:p-7 fintech-card animate-in fade-in"
          >
            <div className="mb-5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-tile-lilac text-brand-ink">
                  <Calendar className="h-5 w-5" />
                </div>
                <h2 className="display font-bold text-ink">
                  เปิดรอบนับเงินถวายใหม่
                </h2>
              </div>
              <button
                type="button"
                onClick={closeCreate}
                aria-label="ปิด"
                className="flex size-10 items-center justify-center rounded-2xl text-ink-3 hover:bg-paper transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="text-sm font-bold text-ink-2">
                วันอาทิตย์ที่รับถวาย *
                <input
                  type="date"
                  required
                  value={serviceDate}
                  onChange={event => setServiceDate(event.target.value)}
                  className="mt-1.5 w-full rounded-2xl border border-field bg-paper p-3 text-sm font-normal text-ink focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                />
              </label>
              <label className="text-sm font-bold text-ink-2 md:col-span-2">
                บันทึกเพิ่มเติม
                <textarea
                  rows={2}
                  value={notes}
                  onChange={event => setNotes(event.target.value)}
                  placeholder="เช่น มีถวายพิเศษวันครบรอบคริสตจักร, ถวายพันธกิจคริสต์มาส"
                  className="mt-1.5 w-full rounded-2xl border border-field bg-paper p-3 text-sm font-normal text-ink focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                />
              </label>
            </div>
            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={closeCreate}
                className="min-h-11 rounded-2xl border border-line bg-paper px-4 py-2 text-sm font-bold text-ink-2 hover:bg-paper-2 transition-colors"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                disabled={createSession.isPending}
                className="min-h-11 rounded-2xl bg-income px-5 py-2 text-sm font-bold text-white shadow-sm hover:opacity-95 transition-all disabled:opacity-50"
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
          <div className="flex items-center gap-1.5 rounded-2xl bg-surface p-1.5 fintech-card overflow-x-auto no-scrollbar">
            <button
              type="button"
              onClick={() => setActiveTab("all")}
              className={`inline-flex min-h-11 items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition-all shrink-0 ${
                activeTab === "all"
                  ? "bg-tile-lilac text-brand-ink shadow-xs"
                  : "text-ink-2 hover:bg-paper hover:text-ink"
              }`}
            >
              <span>ทั้งหมด</span>
              <span className="rounded-full bg-surface/80 px-2 py-0.5 text-[11px] font-bold text-ink-2">
                {sessions.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("pending")}
              className={`inline-flex min-h-11 items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition-all shrink-0 ${
                activeTab === "pending"
                  ? "bg-tile-peach text-tile-peach-ink shadow-xs"
                  : "text-ink-2 hover:bg-paper hover:text-ink"
              }`}
            >
              <Clock className="h-3.5 w-3.5" />
              <span>กำลังดำเนินการ / ค้างอยู่</span>
              {openCount > 0 && (
                <span className="rounded-full bg-surface/80 px-2 py-0.5 text-[11px] font-bold">
                  {openCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("completed")}
              className={`inline-flex min-h-11 items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition-all shrink-0 ${
                activeTab === "completed"
                  ? "bg-tile-mint text-tile-mint-ink shadow-xs"
                  : "text-ink-2 hover:bg-paper hover:text-ink"
              }`}
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>ปิดรอบเสร็จสมบูรณ์</span>
              <span className="rounded-full bg-surface/80 px-2 py-0.5 text-[11px] font-bold">
                {completedCount}
              </span>
            </button>
          </div>

          {/* Search bar */}
          <div className="relative min-w-[220px]">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="ค้นหาวันที่, บันทึก..."
              className="min-h-11 w-full rounded-2xl border border-field bg-surface pl-9 pr-3 py-2 text-base md:text-sm text-ink placeholder-ink-3 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-3 hover:text-ink"
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
          <div className="rounded-3xl bg-surface p-12 text-center fintech-card">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-tile-lilac text-brand-ink mb-3">
              <AlertCircle className="h-7 w-7" />
            </div>
            <h3 className="display text-base font-bold text-ink">
              ไม่พบรายการในหมวดหมู่นี้
            </h3>
            <p className="mt-1 text-sm text-ink-2">
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
                className="mt-4 rounded-2xl bg-tile-lilac px-4 py-2 text-xs font-bold text-brand-ink hover:opacity-90"
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
                  className="rounded-3xl bg-surface p-5 sm:p-6 fintech-card flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  {/* Left: Date & Status & Notes */}
                  <div
                    onClick={() => setLocation(`/counting/${session.id}`)}
                    className="min-w-0 cursor-pointer flex-1 group"
                  >
                    <div className="flex flex-wrap items-center gap-2.5">
                      <h2 className="display font-bold text-ink group-hover:text-brand transition-colors text-base sm:text-lg">
                        {fmtThaiDate(session.serviceDate)}
                      </h2>
                      <StatusBadge status={session.status} />
                      {!isUnposted && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-paper px-2.5 py-0.5 text-[11px] font-bold text-ink-2 border border-line/60">
                          <Lock className="h-3 w-3 text-ink-3" />
                          ลงบัญชีแล้ว
                        </span>
                      )}
                    </div>

                    {session.varianceNote && (
                      <p className="mt-1.5 text-xs sm:text-sm font-semibold text-tile-peach-ink">
                        ⚠️ มีบันทึกผลต่าง: {session.varianceNote}
                      </p>
                    )}

                    {session.notes && (
                      <p className="mt-1 truncate text-xs sm:text-sm text-ink-2">
                        {session.notes}
                      </p>
                    )}

                    <div className="mt-2 flex items-center gap-3 text-xs font-medium text-ink-3">
                      <span className="rounded-full bg-paper px-2.5 py-0.5 text-ink-2">
                        รอบที่ {session.serviceRound ?? 1}
                      </span>
                      <span>•</span>
                      <span>
                        สร้างเมื่อ{" "}
                        {new Date(session.createdAt).toLocaleDateString(
                          THAI_LOCALE
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex flex-wrap items-center gap-2 shrink-0 pt-3 sm:pt-0 border-t sm:border-t-0 border-line/60">
                    {isUnposted ? (
                      <>
                        {/* Continue Button */}
                        <button
                          type="button"
                          onClick={() => setLocation(`/counting/${session.id}`)}
                          className="min-h-10 inline-flex items-center gap-1.5 rounded-2xl bg-brand px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-brand-ink transition-all active:scale-95"
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
                          className="min-h-10 inline-flex items-center gap-1 rounded-2xl bg-tile-lilac/60 px-3.5 py-2 text-xs font-bold text-brand-ink hover:bg-tile-lilac transition-colors disabled:opacity-50"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                          <span>นับใหม่</span>
                        </button>

                        {/* Delete Session Button */}
                        <button
                          type="button"
                          title="ลบรอบนับเงินค้างนี้อย่างถาวร"
                          onClick={() => handleDeleteSession(session)}
                          disabled={deleteSession.isPending}
                          className="min-h-10 inline-flex items-center gap-1 rounded-2xl bg-tile-rose px-3.5 py-2 text-xs font-bold text-tile-rose-ink hover:bg-rose-200/70 transition-colors disabled:opacity-50"
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
                        className="min-h-10 inline-flex items-center gap-1.5 rounded-2xl bg-paper px-4 py-2 text-xs font-bold text-ink-2 hover:bg-tile-lilac/50 hover:text-brand-ink transition-colors"
                      >
                        <FileText className="h-3.5 w-3.5 text-income" />
                        <span>ดูสรุป & รายงาน</span>
                        <ChevronRight className="h-3.5 w-3.5 text-ink-3" />
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
