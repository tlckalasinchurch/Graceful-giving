import React, { useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
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
import { formatThaiDate } from "@/lib/format";

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
        confirmButtonColor: "#0066CC",
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
          aria-expanded={showCreate}
          className="min-h-11 inline-flex items-center gap-2 rounded-xl bg-[#0066CC] px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#0052A3]"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          เปิดรอบใหม่
        </button>
      }
    >
      <div className="space-y-6">
        {/* Header Overview Card */}
        {openCount > 0 && (
          <div className="flex items-center gap-2 rounded-xl border border-[#CFE4FA] bg-[#EAF3FC] px-4 py-3 text-sm font-medium text-[#7F3A0D]">
            <Clock
              className="size-4 shrink-0 text-[#0066CC]"
              aria-hidden="true"
            />
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
            className="rounded-2xl border border-[#E7DCC8] bg-white p-6"
          >
            <div className="mb-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#FFF4D6] text-[#0066CC]">
                  <Calendar className="h-4 w-4" aria-hidden="true" />
                </div>
                <h2 className="font-bold text-[#171311]">
                  เปิดรอบนับเงินถวายใหม่
                </h2>
              </div>
              <button
                type="button"
                onClick={closeCreate}
                aria-label="ปิด"
                className="flex size-11 items-center justify-center rounded-xl text-[#807266] hover:bg-[#FFF8EA] transition-colors"
              >
                <X className="h-5 w-5" aria-hidden="true" />
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
                  className="mt-1 min-h-11 w-full rounded-xl border border-[#E7DCC8] p-3 text-base md:text-sm font-normal text-[#171311] focus:border-[#0066CC] focus:outline-none focus:ring-1 focus:ring-[#0066CC]"
                />
              </label>
              <label className="text-sm font-semibold text-[#51443A] md:col-span-2">
                บันทึกเพิ่มเติม
                <textarea
                  rows={2}
                  value={notes}
                  onChange={event => setNotes(event.target.value)}
                  placeholder="เช่น มีถวายพิเศษวันครบรอบคริสตจักร, ถวายพันธกิจคริสต์มาส"
                  className="mt-1 min-h-11 w-full rounded-xl border border-[#E7DCC8] p-3 text-base md:text-sm font-normal text-[#171311] focus:border-[#0066CC] focus:outline-none focus:ring-1 focus:ring-[#0066CC]"
                />
              </label>
            </div>
            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={closeCreate}
                className="min-h-11 rounded-xl border border-[#E7DCC8] bg-white px-4 py-2 text-sm font-bold text-[#51443A] hover:bg-[#FFF8EA] transition-colors"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                disabled={createSession.isPending}
                className="min-h-11 rounded-xl bg-[#0066CC] px-5 py-2 text-sm font-bold text-white hover:bg-[#0052A3] transition-colors disabled:opacity-50"
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
          <div className="relative min-w-0">
          <div
            role="group"
            aria-label="สถานะรอบ"
            className="flex items-center gap-1.5 rounded-2xl bg-[#FFF8EA] p-1.5 border border-[#E7DCC8] overflow-x-auto no-scrollbar"
          >
            <button
              type="button"
              onClick={() => setActiveTab("all")}
              aria-pressed={activeTab === "all"}
              className={`inline-flex min-h-11 items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition-colors shrink-0 border border-transparent ${
                activeTab === "all"
                  ? "bg-white text-[#171311] border border-[#E7DCC8]"
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
              aria-pressed={activeTab === "pending"}
              className={`inline-flex min-h-11 items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition-colors shrink-0 border border-transparent ${
                activeTab === "pending"
                  ? "bg-white text-[#0052A3] border border-[#CFE4FA]"
                  : "text-[#51443A] hover:text-[#0052A3]"
              }`}
            >
              <Clock
                className="h-3.5 w-3.5 text-[#0052A3]"
                aria-hidden="true"
              />
              <span>กำลังดำเนินการ / ค้างอยู่</span>
              {openCount > 0 && (
                <span className="rounded-md bg-[#FFF4D6] px-1.5 py-0.5 text-[11px] font-bold text-[#0052A3]">
                  {openCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("completed")}
              aria-pressed={activeTab === "completed"}
              className={`inline-flex min-h-11 items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition-colors shrink-0 border border-transparent ${
                activeTab === "completed"
                  ? "bg-white text-[#2F7A45] border border-[#C3E4B8]"
                  : "text-[#51443A] hover:text-[#2F7A45]"
              }`}
            >
              <CheckCircle2
                className="h-3.5 w-3.5 text-[#2F7A45]"
                aria-hidden="true"
              />
              <span>ปิดรอบเสร็จสมบูรณ์</span>
              <span className="rounded-md bg-[#E4F3E7] px-1.5 py-0.5 text-[11px] font-semibold text-[#2F7A45]">
                {completedCount}
              </span>
            </button>
          </div>
          <div
            aria-hidden="true"
            className="pointer-events-none absolute right-1.5 top-1.5 bottom-1.5 w-8 rounded-r-xl bg-gradient-to-l from-[#FFF8EA] to-transparent"
          />
          </div>

          {/* Search bar */}
          <div className="relative min-w-[220px]">
            <Search
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#807266]"
              aria-hidden="true"
            />
            <input
              type="search"
              aria-label="ค้นหาวันที่หรือบันทึก"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="ค้นหาวันที่, บันทึก..."
              className="min-h-11 w-full rounded-xl border border-[#E7DCC8] bg-white pl-9 pr-11 py-2 text-base md:text-sm text-[#171311] placeholder-[#807266] focus:border-[#0066CC] focus:outline-none focus:ring-1 focus:ring-[#0066CC]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                aria-label="ล้างคำค้นหา"
                className="absolute right-0 top-1/2 -translate-y-1/2 flex size-11 items-center justify-center rounded-xl text-[#807266] hover:text-[#171311]"
              >
                <X className="h-4 w-4" aria-hidden="true" />
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
          <EmptyState
            title="ไม่พบรอบในหมวดหมู่นี้"
            description={
              searchQuery
                ? `ไม่พบผลการค้นหาสำหรับ "${searchQuery}"`
                : activeTab === "pending"
                  ? "ไม่มีรอบที่ค้างอยู่ ทุกรอบได้รับการปิดรอบเรียบร้อยแล้ว"
                  : "ยังไม่มีรอบที่ปิดบัญชีเสร็จสมบูรณ์"
            }
            actionText="ดูทุกรอบทั้งหมด"
            onAction={() => {
              setActiveTab("all");
              setSearchQuery("");
            }}
          />
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
                  className="rounded-2xl border border-[#E7DCC8] bg-white transition-colors p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-[#0066CC]"
                >
                  {/* Left: Date & Status & Notes */}
                  <Link
                    href={`/counting/${session.id}`}
                    className="min-w-0 flex-1 group rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0066CC] focus-visible:ring-offset-2"
                  >
                    <div className="flex flex-wrap items-center gap-2.5">
                      <h2 className="font-bold text-[#171311] group-hover:text-[#0066CC] transition-colors text-base sm:text-lg">
                        {fmtThaiDate(session.serviceDate)}
                      </h2>
                      <StatusBadge status={session.status} />
                      {!isUnposted && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-[#FFF8EA] px-2 py-0.5 text-xs font-medium text-[#51443A]">
                          <Lock
                            className="h-3 w-3 text-[#807266]"
                            aria-hidden="true"
                          />
                          แก้ไขไม่ได้
                        </span>
                      )}
                    </div>

                    {session.varianceNote && (
                      <p className="mt-1 flex items-start gap-1.5 text-xs sm:text-sm font-medium text-[#0052A3]">
                        <AlertCircle
                          className="mt-0.5 h-3.5 w-3.5 shrink-0"
                          aria-hidden="true"
                        />
                        มีบันทึกผลต่าง: {session.varianceNote}
                      </p>
                    )}

                    {session.notes && (
                      <p className="mt-1 truncate text-xs sm:text-sm text-[#51443A]">
                        {session.notes}
                      </p>
                    )}

                    <div className="mt-2 flex items-center gap-4 text-xs text-[#807266]">
                      <span>รอบที่ {session.serviceRound ?? 1}</span>
                      <span>•</span>
                      <span>
                        สร้างเมื่อ {formatThaiDate(session.createdAt)}
                      </span>
                    </div>
                  </Link>

                  {/* Right: Actions */}
                  <div className="flex flex-wrap items-center gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#EDE8E3]">
                    {isUnposted ? (
                      <>
                        {/* Continue Button */}
                        <button
                          type="button"
                          onClick={() => setLocation(`/counting/${session.id}`)}
                          className="min-h-11 inline-flex items-center gap-1.5 rounded-xl bg-[#0066CC] px-3.5 py-2 text-xs font-bold text-white hover:bg-[#0052A3] transition-colors"
                        >
                          <span>นับต่อ</span>
                          <ChevronRight
                            className="h-3.5 w-3.5"
                            aria-hidden="true"
                          />
                        </button>

                        {/* Reset / Recount Button */}
                        <button
                          type="button"
                          title="ล้างข้อมูลทั้งหมดในรอบนี้เพื่อเริ่มนับใหม่"
                          onClick={() => handleResetSession(session)}
                          disabled={resetSession.isPending}
                          className="min-h-11 inline-flex items-center gap-1 rounded-xl border border-[#E7DCC8] bg-[#FFF8EA] px-3 py-2 text-xs font-bold text-[#0052A3] hover:bg-[#FFF4D6] hover:border-[#0066CC]/50 transition-colors disabled:opacity-50"
                        >
                          <RotateCcw
                            className="h-3.5 w-3.5 text-[#0052A3]"
                            aria-hidden="true"
                          />
                          <span>นับใหม่</span>
                        </button>

                        {/* Delete Session Button */}
                        <button
                          type="button"
                          title="ลบรอบนับเงินค้างนี้อย่างถาวร"
                          onClick={() => handleDeleteSession(session)}
                          disabled={deleteSession.isPending}
                          className="min-h-11 inline-flex items-center gap-1 rounded-xl border border-[#F8C8C5] bg-white px-3 py-2 text-xs font-bold text-[#B92A20] hover:bg-[#FEECEB] transition-colors disabled:opacity-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>ลบรอบค้าง</span>
                        </button>
                      </>
                    ) : (
                      /* Completed session: View Summary */
                      <button
                        type="button"
                        onClick={() => setLocation(`/counting/${session.id}`)}
                        className="min-h-11 inline-flex items-center gap-1.5 rounded-xl border border-[#E7DCC8] bg-white px-4 py-2 text-xs font-bold text-[#51443A] hover:bg-[#FFF8EA] hover:text-[#171311] transition-colors"
                      >
                        <FileText
                          className="h-3.5 w-3.5 text-[#2F7A45]"
                          aria-hidden="true"
                        />
                        <span>ดูสรุป & รายงาน</span>
                        <ChevronRight
                          className="h-3.5 w-3.5 text-[#807266]"
                          aria-hidden="true"
                        />
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
