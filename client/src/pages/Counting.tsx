import React, { useMemo, useState } from "react";
import { useSubmitLock } from "@/hooks/useSubmitLock";
import { isOpenSession } from "./countingStatus";
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
  ChevronRight,
  FileText,
  Plus,
  RotateCcw,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { THAI_LOCALE, toLocalISODate } from "@/lib/format";
import { friendlyErrorMessage } from "@/lib/errors";

/** The Sunday on or before today, as a yyyy-mm-dd string for a date input. */
function lastSunday(): string {
  const today = new Date();
  const back = today.getDay();
  const sunday = new Date(today);
  sunday.setDate(today.getDate() - back);
  return toLocalISODate(sunday);
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

  const { lock, unlock } = useSubmitLock();
  const createSession = trpc.counting.create.useMutation({
    onSettled: unlock,
    onSuccess: async ({ id }) => {
      await utils.counting.list.invalidate();
      setShowCreate(false);
      setNotes("");
      toast.success("เปิดรอบนับเงินถวายแล้ว");
      setLocation(`/counting/${id}`);
    },
    onError: error =>
      toast.error("เปิดรอบไม่สำเร็จ", {
        description: friendlyErrorMessage(error),
      }),
  });

  const deleteSession = trpc.counting.deleteSession.useMutation({
    onSuccess: async () => {
      await utils.counting.list.invalidate();
      toast.success("ลบรอบนับเงินถวายเรียบร้อยแล้ว");
    },
    onError: error =>
      toast.error("ลบรอบไม่สำเร็จ", {
        description: friendlyErrorMessage(error),
      }),
  });

  const resetSession = trpc.counting.resetSession.useMutation({
    onSuccess: async (_, variables) => {
      await utils.counting.list.invalidate();
      await utils.counting.get.invalidate({ id: variables.id });
      toast.success("รีเซ็ตรอบเพื่อนับใหม่เรียบร้อยแล้ว");
      setLocation(`/counting/${variables.id}`);
    },
    onError: error =>
      toast.error("รีเซ็ตรอบไม่สำเร็จ", {
        description: friendlyErrorMessage(error),
      }),
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
        confirmButtonColor: "var(--destructive)",
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
      }
    );
    if (confirmed) {
      resetSession.mutate({ id: session.id });
    }
  };

  const sessions = sessionsQuery.data ?? [];

  const openCount = useMemo(
    () => sessions.filter(s => isOpenSession(s.status)).length,
    [sessions]
  );

  const completedCount = sessions.length - openCount;

  const filteredSessions = useMemo(() => {
    return sessions.filter(session => {
      const isPending = isOpenSession(session.status);
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
      title="นับเงินถวาย"
      subtitle="บันทึกและกระทบยอดเงินถวายของแต่ละวันอาทิตย์"
      action={
        <button
          type="button"
          onClick={() => (showCreate ? closeCreate() : setShowCreate(true))}
          className="btn-primary min-h-11 px-4 py-2.5 text-sm"
        >
          <Plus className="h-4 w-4" />
          เปิดรอบใหม่
        </button>
      }
    >
      <div className="space-y-6">
        {openCount > 0 && (
          <div className="inline-flex items-center gap-2 rounded-xl border-2 border-[var(--ink)] bg-tile-sand px-3.5 py-2 text-xs font-extrabold text-tile-sand-ink shadow-[2px_2px_0_var(--ink)]">
            <span className="money">{openCount} รอบ</span>
            <span>ค้างอยู่หรือกำลังนับ</span>
          </div>
        )}

        {/* Create Form */}
        {showCreate && (
          <form
            onSubmit={event => {
              event.preventDefault();
              if (!lock()) return;
              createSession.mutate({
                serviceDate: new Date(`${serviceDate}T12:00:00`),
                serviceRound: 1,
                notes: notes.trim() || undefined,
              });
            }}
            className="bento-card-static p-6 sm:p-7 animate-in fade-in"
          >
            <div className="mb-5 flex items-center justify-between">
              <h2 className="display text-lg text-ink">
                เปิดรอบนับเงินถวายใหม่
              </h2>
              <button
                type="button"
                onClick={closeCreate}
                aria-label="ปิด"
                className="flex size-10 items-center justify-center rounded-xl border-1.5 border-[var(--ink)] bg-paper-2 text-ink hover:bg-surface transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="text-sm font-extrabold text-ink">
                วันอาทิตย์ที่รับถวาย *
                <input
                  type="date"
                  required
                  value={serviceDate}
                  onChange={event => setServiceDate(event.target.value)}
                  className="neo-input mt-1.5"
                />
              </label>
              <label className="text-sm font-extrabold text-ink md:col-span-2">
                บันทึกเพิ่มเติม
                <textarea
                  rows={2}
                  value={notes}
                  onChange={event => setNotes(event.target.value)}
                  placeholder="เช่น มีถวายพิเศษวันครบรอบคริสตจักร, ถวายพันธกิจคริสต์มาส"
                  className="neo-input mt-1.5"
                />
              </label>
            </div>
            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={closeCreate}
                className="btn-secondary min-h-11 px-4 py-2 text-sm"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                disabled={createSession.isPending}
                className="btn-primary min-h-11 px-5 py-2 text-sm disabled:opacity-50"
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
          <div
            role="group"
            aria-label="กรองรอบนับเงิน"
            className="flex max-w-full flex-none items-center gap-1.5 overflow-x-auto rounded-2xl border-2 border-[var(--ink)] bg-surface p-1.5 shadow-[3px_3px_0_var(--ink)] no-scrollbar sm:max-w-[calc(100%-14rem)]"
          >
            {(
              [
                { id: "all", label: "ทั้งหมด", count: sessions.length },
                {
                  id: "pending",
                  label: "กำลังดำเนินการ / ค้างอยู่",
                  count: openCount,
                },
                {
                  id: "completed",
                  label: "ปิดรอบเสร็จสมบูรณ์",
                  count: completedCount,
                },
              ] as const
            ).map(tab => (
              <button
                key={tab.id}
                type="button"
                aria-pressed={activeTab === tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-extrabold transition-all ${
                  activeTab === tab.id
                    ? "border-1.5 border-[var(--ink)] bg-accent text-accent-foreground shadow-[2px_2px_0_var(--ink)]"
                    : "text-ink-2 hover:bg-paper-2 hover:text-ink"
                }`}
              >
                <span>{tab.label}</span>
                <span className="money rounded-full border border-[var(--ink)] bg-surface px-1.5 py-0.5 text-xs font-bold text-ink">
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Search bar */}
          <div className="relative min-w-[220px]">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="ค้นหาวันที่, บันทึก..."
              aria-label="ค้นหารอบนับเงิน"
              className="neo-input pl-9 pr-8 py-2"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                aria-label="ล้างคำค้นหา"
                className="absolute right-0.5 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center text-ink-3 hover:text-ink"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
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
          <div className="bento-card-static p-12 text-center">
            <h3 className="display text-base font-bold text-ink">
              ไม่พบรายการในหมวดหมู่นี้
            </h3>
            <p className="mt-1 text-sm font-medium text-ink-2">
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
                className="mt-4 min-h-11 px-3 text-sm font-extrabold text-brand hover:underline"
              >
                ดูทุกรอบทั้งหมด
              </button>
            )}
          </div>
        ) : (
          <div className="bento-card-static divide-y divide-line overflow-hidden">
            {filteredSessions.map(session => {
              const isUnposted = isOpenSession(session.status);

              return (
                <div
                  key={session.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 sm:px-6 transition-colors hover:bg-paper-2/50"
                >
                  {/* Left: Date & Status & Notes */}
                  <div
                    onClick={() => setLocation(`/counting/${session.id}`)}
                    className="min-w-0 cursor-pointer flex-1 group"
                  >
                    <div className="flex flex-wrap items-center gap-2.5">
                      <h2 className="display text-base sm:text-lg text-ink group-hover:text-brand transition-colors">
                        {fmtThaiDate(session.serviceDate)}
                      </h2>
                      <StatusBadge status={session.status} />
                    </div>

                    {session.varianceNote && (
                      <p className="mt-1.5 text-xs sm:text-sm font-bold text-brand">
                        มีบันทึกผลต่าง: {session.varianceNote}
                      </p>
                    )}

                    {session.notes && (
                      <p className="mt-1 truncate text-xs sm:text-sm font-medium text-ink-2">
                        {session.notes}
                      </p>
                    )}

                    <div className="mt-2 flex items-center gap-3 text-xs font-semibold text-ink-3">
                      <span className="text-ink-2">
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
                  <div className="flex flex-wrap items-center gap-2 shrink-0 pt-3 sm:pt-0 border-t sm:border-t-0 border-line">
                    {isUnposted ? (
                      <>
                        {/* Continue Button */}
                        <button
                          type="button"
                          onClick={() => setLocation(`/counting/${session.id}`)}
                          className="btn-primary min-h-11 px-4 py-2 text-xs"
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
                          className="btn-secondary min-h-11 px-3.5 py-2 text-xs disabled:opacity-50"
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
                          className="min-h-11 inline-flex items-center gap-1 rounded-xl border-2 border-[var(--ink)] bg-tile-peach px-3.5 py-2 text-xs font-extrabold text-tile-peach-ink shadow-[2px_2px_0_var(--ink)] hover:bg-danger hover:text-white transition-colors disabled:opacity-50"
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
                        className="btn-secondary min-h-11 px-4 py-2 text-xs disabled:opacity-50"
                      >
                        <FileText className="h-3.5 w-3.5 text-brand" />
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
