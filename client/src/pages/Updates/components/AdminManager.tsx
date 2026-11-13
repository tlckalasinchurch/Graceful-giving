import { FormEvent, useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import {
  AlertTriangle,
  CalendarDays,
  Megaphone,
  PencilLine,
  Plus,
  Search,
  Settings2,
  Trash2,
} from "lucide-react";
import { formToast } from "@/lib/formFeedback";
import { ErrorState } from "@/components/common/CommonUI";
import { friendlyErrorMessage } from "@/lib/errors";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  formatEventDate,
  formatThaiDate,
  StatusPill,
  toDateTimeLocal,
} from "./updatesUtils";
import { AdminNewsDialog } from "./AdminNewsDialog";
import { AdminEventDialog } from "./AdminEventDialog";

const TOAST_KEY = "updates-admin";

function toastMutationError(title: string) {
  return (error: unknown) =>
    formToast.error(TOAST_KEY, title, {
      description: friendlyErrorMessage(error),
    });
}

export function AdminManager() {
  const utils = trpc.useUtils();
  const { data, isLoading, error, refetch } = trpc.updates.adminList.useQuery(
    undefined,
    {
      retry: false,
    }
  );
  const createNews = trpc.updates.createNews.useMutation({
    onError: toastMutationError("สร้างข่าวสารไม่สำเร็จ"),
    onSuccess: async () => {
      await utils.updates.adminList.invalidate();
      await utils.updates.feed.invalidate();
      formToast.success(TOAST_KEY, "สร้างข่าวสารเรียบร้อย");
      setNewsOpen(false);
    },
  });
  const createEvent = trpc.updates.createEvent.useMutation({
    onError: toastMutationError("สร้างกิจกรรมไม่สำเร็จ"),
    onSuccess: async () => {
      await utils.updates.adminList.invalidate();
      await utils.updates.feed.invalidate();
      formToast.success(TOAST_KEY, "สร้างกิจกรรมเรียบร้อย");
      setEventOpen(false);
    },
  });
  const updateNews = trpc.updates.updateNews.useMutation({
    onError: toastMutationError("อัปเดตข่าวสารไม่สำเร็จ"),
    onSuccess: async () => {
      await utils.updates.adminList.invalidate();
      await utils.updates.feed.invalidate();
      formToast.success(TOAST_KEY, "อัปเดตข่าวสารเรียบร้อย");
      setNewsOpen(false);
      setEditingNewsId(null);
    },
  });
  const updateEvent = trpc.updates.updateEvent.useMutation({
    onError: toastMutationError("อัปเดตกิจกรรมไม่สำเร็จ"),
    onSuccess: async () => {
      await utils.updates.adminList.invalidate();
      await utils.updates.feed.invalidate();
      formToast.success(TOAST_KEY, "อัปเดตกิจกรรมเรียบร้อย");
      setEventOpen(false);
      setEditingEventId(null);
    },
  });
  const setNewsStatus = trpc.updates.setNewsStatus.useMutation({
    onError: toastMutationError("เปลี่ยนสถานะข่าวสารไม่สำเร็จ"),
    onSuccess: async () => {
      await utils.updates.adminList.invalidate();
      await utils.updates.feed.invalidate();
      formToast.success(TOAST_KEY, "เปลี่ยนสถานะข่าวสารเรียบร้อย");
    },
  });
  const setEventStatus = trpc.updates.setEventStatus.useMutation({
    onError: toastMutationError("เปลี่ยนสถานะกิจกรรมไม่สำเร็จ"),
    onSuccess: async () => {
      await utils.updates.adminList.invalidate();
      await utils.updates.feed.invalidate();
      formToast.success(TOAST_KEY, "เปลี่ยนสถานะกิจกรรมเรียบร้อย");
    },
  });
  const deleteNews = trpc.updates.deleteNews.useMutation({
    onError: toastMutationError("ลบข่าวสารไม่สำเร็จ"),
    onSuccess: async () => {
      await utils.updates.adminList.invalidate();
      await utils.updates.feed.invalidate();
      formToast.success(TOAST_KEY, "ลบข่าวสารเรียบร้อย");
      setDeletingNews(null);
    },
  });
  const deleteEvent = trpc.updates.deleteEvent.useMutation({
    onError: toastMutationError("ลบกิจกรรมไม่สำเร็จ"),
    onSuccess: async () => {
      await utils.updates.adminList.invalidate();
      await utils.updates.feed.invalidate();
      formToast.success(TOAST_KEY, "ลบกิจกรรมเรียบร้อย");
      setDeletingEvent(null);
    },
  });

  const [newsOpen, setNewsOpen] = useState(false);
  const [eventOpen, setEventOpen] = useState(false);
  const [editingNewsId, setEditingNewsId] = useState<number | null>(null);
  const [editingEventId, setEditingEventId] = useState<number | null>(null);

  type NewsItem = NonNullable<typeof data>["news"][number];
  type EventItem = NonNullable<typeof data>["events"][number];

  const [deletingNews, setDeletingNews] = useState<NewsItem | null>(null);
  const [deletingEvent, setDeletingEvent] = useState<EventItem | null>(null);
  const [query, setQuery] = useState("");

  const [newsForm, setNewsForm] = useState<{
    title: string;
    summary: string;
    body: string;
    category: "announcement" | "ministry" | "finance" | "pastoral";
    status: "draft" | "published" | "archived";
  }>({
    title: "",
    summary: "",
    body: "",
    category: "announcement",
    status: "draft",
  });

  const [eventForm, setEventForm] = useState<{
    title: string;
    summary: string;
    description: string;
    startsAt: string;
    endsAt: string;
    location: string;
    registrationUrl: string;
    status: "draft" | "published" | "cancelled";
  }>({
    title: "",
    summary: "",
    description: "",
    startsAt: "",
    endsAt: "",
    location: "",
    registrationUrl: "",
    status: "draft",
  });

  const filteredNews = useMemo(() => {
    const list = data?.news ?? [];
    if (!query.trim()) return list;
    const q = query.toLowerCase();
    return list.filter(
      item =>
        item.title.toLowerCase().includes(q) ||
        item.summary.toLowerCase().includes(q)
    );
  }, [data?.news, query]);

  const filteredEvents = useMemo(() => {
    const list = data?.events ?? [];
    if (!query.trim()) return list;
    const q = query.toLowerCase();
    return list.filter(
      item =>
        item.title.toLowerCase().includes(q) ||
        item.summary.toLowerCase().includes(q)
    );
  }, [data?.events, query]);

  const handleNews = (event: FormEvent) => {
    event.preventDefault();
    if (editingNewsId) updateNews.mutate({ id: editingNewsId, ...newsForm });
    else createNews.mutate(newsForm);
  };

  const handleEvent = (event: FormEvent) => {
    event.preventDefault();
    // Field rules, including "ends before it starts", run in AdminEventDialog.
    const payload = {
      ...eventForm,
      startsAt: new Date(eventForm.startsAt),
      endsAt: eventForm.endsAt ? new Date(eventForm.endsAt) : undefined,
    };
    if (editingEventId) updateEvent.mutate({ id: editingEventId, ...payload });
    else createEvent.mutate(payload);
  };

  const beginNewsEdit = (item: NewsItem) => {
    setEditingNewsId(item.id);
    setNewsForm({
      title: item.title,
      summary: item.summary,
      body: item.body,
      category: item.category,
      status: item.status,
    });
    setNewsOpen(true);
  };

  const beginEventEdit = (item: EventItem) => {
    setEditingEventId(item.id);
    setEventForm({
      title: item.title,
      summary: item.summary,
      description: item.description,
      startsAt: toDateTimeLocal(item.startsAt),
      endsAt: item.endsAt ? toDateTimeLocal(item.endsAt) : "",
      location: item.location ?? "",
      registrationUrl: item.registrationUrl ?? "",
      status: item.status,
    });
    setEventOpen(true);
  };

  const openNewNews = () => {
    setEditingNewsId(null);
    setNewsForm({
      title: "",
      summary: "",
      body: "",
      category: "announcement",
      status: "draft",
    });
    setNewsOpen(true);
  };

  const openNewEvent = () => {
    setEditingEventId(null);
    setEventForm({
      title: "",
      summary: "",
      description: "",
      startsAt: "",
      endsAt: "",
      location: "",
      registrationUrl: "",
      status: "draft",
    });
    setEventOpen(true);
  };

  return (
    <section className="bento-card-static mt-6 p-5 sm:p-7">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <Settings2 className="size-5 text-brand" />
            <h2 className="font-display text-xl font-extrabold text-ink">
              จัดการเนื้อหา
            </h2>
          </div>
          <p className="mt-1 text-sm font-medium text-ink-2">
            เพิ่มประกาศและปฏิทินกิจกรรมให้สมาชิกติดตาม
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={openNewNews}
            className="btn-primary inline-flex min-h-11 items-center gap-2 px-4 py-2.5 text-xs"
          >
            <Plus className="size-4" /> ข่าวสารใหม่
          </button>
          <button
            onClick={openNewEvent}
            className="btn-secondary inline-flex min-h-11 items-center gap-2 px-4 py-2.5 text-xs"
          >
            <CalendarDays className="size-4" /> กิจกรรมใหม่
          </button>
        </div>
      </div>

      <div className="mt-4 relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-ink-3" />
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="ค้นหาชื่อข่าวสารหรือกิจกรรม..."
          className="neo-input w-full py-2.5 pl-10 pr-4 text-xs font-medium text-ink"
        />
      </div>

      {isLoading ? (
        <div className="mt-5 h-20 rounded-2xl border border-line bg-paper-2" />
      ) : error ? (
        <ErrorState
          className="mt-5"
          description={friendlyErrorMessage(
            error,
            "ไม่สามารถโหลดรายการข่าวสารและกิจกรรมได้"
          )}
          onRetry={() => void refetch()}
        />
      ) : (
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          {/* Admin News List */}
          <div className="rounded-2xl border border-line bg-surface p-4">
            <div className="mb-3 flex items-center justify-between pb-2 border-b border-line">
              <p className="text-sm font-extrabold text-ink">ข่าวสารทั้งหมด</p>
              <span className="text-xs font-extrabold text-ink-3">
                {filteredNews.length} รายการ
              </span>
            </div>
            {filteredNews.length ? (
              <div className="max-h-[380px] overflow-y-auto divide-y divide-line pr-1">
                {filteredNews.map(item => (
                  <div
                    key={item.id}
                    className="flex flex-wrap items-center justify-between gap-2 py-3"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="grid size-9 shrink-0 place-items-center rounded-xl border border-line bg-tile-mint text-tile-mint-ink">
                        <Megaphone className="size-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-extrabold text-ink">
                          {item.title}
                        </p>
                        <p className="text-xs font-medium text-ink-3">
                          {formatThaiDate(item.createdAt)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        aria-label={`แก้ไขข่าวสาร ${item.title}`}
                        className="grid min-h-11 min-w-11 place-items-center rounded-lg text-brand hover:bg-paper-2"
                        onClick={() => beginNewsEdit(item)}
                      >
                        <PencilLine className="size-4" />
                      </button>
                      <button
                        aria-label={`ลบข่าวสาร ${item.title}`}
                        className="grid min-h-11 min-w-11 place-items-center rounded-lg text-danger hover:bg-paper-2"
                        onClick={() => setDeletingNews(item)}
                      >
                        <Trash2 className="size-4" />
                      </button>
                      <StatusPill status={item.status} />
                      {item.status === "draft" && (
                        <button
                          className="min-h-11 px-2 text-xs font-extrabold text-income hover:underline"
                          onClick={() =>
                            setNewsStatus.mutate({
                              id: item.id,
                              status: "published",
                            })
                          }
                        >
                          เผยแพร่
                        </button>
                      )}
                      {item.status === "published" && (
                        <button
                          className="min-h-11 px-2 text-xs font-extrabold text-danger hover:underline"
                          onClick={() =>
                            setNewsStatus.mutate({
                              id: item.id,
                              status: "archived",
                            })
                          }
                        >
                          เก็บถาวร
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-6 text-center text-xs font-bold text-ink-3">
                ไม่พบข่าวสาร
              </p>
            )}
          </div>

          {/* Admin Events List */}
          <div className="rounded-2xl border border-line bg-surface p-4">
            <div className="mb-3 flex items-center justify-between pb-2 border-b border-line">
              <p className="text-sm font-extrabold text-ink">กิจกรรมทั้งหมด</p>
              <span className="text-xs font-extrabold text-ink-3">
                {filteredEvents.length} รายการ
              </span>
            </div>
            {filteredEvents.length ? (
              <div className="max-h-[380px] overflow-y-auto divide-y divide-line pr-1">
                {filteredEvents.map(item => (
                  <div
                    key={item.id}
                    className="flex flex-wrap items-center justify-between gap-2 py-3"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="grid size-9 shrink-0 place-items-center rounded-xl border border-brand/40 bg-accent text-accent-foreground">
                        <CalendarDays className="size-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-extrabold text-ink">
                          {item.title}
                        </p>
                        <p className="text-xs font-medium text-ink-3">
                          {formatEventDate(item.startsAt)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        aria-label={`แก้ไขกิจกรรม ${item.title}`}
                        className="grid min-h-11 min-w-11 place-items-center rounded-lg text-ink-2 hover:bg-paper-2"
                        onClick={() => beginEventEdit(item)}
                      >
                        <PencilLine className="size-4" />
                      </button>
                      <button
                        aria-label={`ลบกิจกรรม ${item.title}`}
                        className="grid min-h-11 min-w-11 place-items-center rounded-lg text-danger hover:bg-paper-2"
                        onClick={() => setDeletingEvent(item)}
                      >
                        <Trash2 className="size-4" />
                      </button>
                      <StatusPill status={item.status} />
                      {item.status === "draft" && (
                        <button
                          className="min-h-11 px-2 text-xs font-extrabold text-income hover:underline"
                          onClick={() =>
                            setEventStatus.mutate({
                              id: item.id,
                              status: "published",
                            })
                          }
                        >
                          เผยแพร่
                        </button>
                      )}
                      {item.status === "published" && (
                        <button
                          className="min-h-11 px-2 text-xs font-extrabold text-danger hover:underline"
                          onClick={() =>
                            setEventStatus.mutate({
                              id: item.id,
                              status: "cancelled",
                            })
                          }
                        >
                          ยกเลิก
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-6 text-center text-xs font-bold text-ink-3">
                ไม่พบกิจกรรม
              </p>
            )}
          </div>
        </div>
      )}

      {/* Admin News Create/Edit Dialog */}
      <AdminNewsDialog
        open={newsOpen}
        onOpenChange={setNewsOpen}
        editingNewsId={editingNewsId}
        newsForm={newsForm}
        setNewsForm={setNewsForm}
        onSubmit={handleNews}
        pending={createNews.isPending || updateNews.isPending}
      />

      {/* Admin Event Create/Edit Dialog */}
      <AdminEventDialog
        open={eventOpen}
        onOpenChange={setEventOpen}
        editingEventId={editingEventId}
        eventForm={eventForm}
        setEventForm={setEventForm}
        onSubmit={handleEvent}
        pending={createEvent.isPending || updateEvent.isPending}
      />

      {/* Delete News Confirmation Dialog */}
      <Dialog
        open={!!deletingNews}
        onOpenChange={open => !open && setDeletingNews(null)}
      >
        <DialogContent className="neo-modal w-full max-w-sm p-6">
          {deletingNews && (
            <>
              <DialogHeader className="text-left">
                <div className="flex items-center gap-3 text-danger">
                  <div className="grid size-11 place-items-center rounded-xl border border-danger/30 bg-danger/10 text-danger">
                    <AlertTriangle className="size-6" />
                  </div>
                  <div>
                    <DialogTitle className="font-display text-lg font-extrabold text-ink">
                      ยืนยันการลบข่าวสาร
                    </DialogTitle>
                    <DialogDescription className="text-xs font-medium text-ink-2">
                      การดำเนินการนี้ไม่สามารถย้อนกลับได้
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>
              <p className="mt-3 rounded-xl border border-danger/30 bg-danger/10 p-3 text-xs font-bold text-danger">
                ต้องการลบ &ldquo;{deletingNews.title}&rdquo; ออกจากระบบหรือไม่?
              </p>
              <div className="mt-5 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setDeletingNews(null)}
                  className="btn-secondary min-h-11 py-2.5 text-xs"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  disabled={deleteNews.isPending}
                  onClick={() => deleteNews.mutate({ id: deletingNews.id })}
                  className="min-h-11 rounded-xl border border-danger/30 bg-danger py-2.5 text-xs font-extrabold text-white hover:opacity-90 disabled:opacity-60"
                >
                  {deleteNews.isPending ? "กำลังลบ..." : "ยืนยันลบ"}
                </button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Event Confirmation Dialog */}
      <Dialog
        open={!!deletingEvent}
        onOpenChange={open => !open && setDeletingEvent(null)}
      >
        <DialogContent className="neo-modal w-full max-w-sm p-6">
          {deletingEvent && (
            <>
              <DialogHeader className="text-left">
                <div className="flex items-center gap-3 text-danger">
                  <div className="grid size-11 place-items-center rounded-xl border border-danger/30 bg-danger/10 text-danger">
                    <AlertTriangle className="size-6" />
                  </div>
                  <div>
                    <DialogTitle className="font-display text-lg font-extrabold text-ink">
                      ยืนยันการลบกิจกรรม
                    </DialogTitle>
                    <DialogDescription className="text-xs font-medium text-ink-2">
                      การดำเนินการนี้ไม่สามารถย้อนกลับได้
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>
              <p className="mt-3 rounded-xl border border-danger/30 bg-danger/10 p-3 text-xs font-bold text-danger">
                ต้องการลบกิจกรรม &ldquo;{deletingEvent.title}&rdquo; หรือไม่?
              </p>
              <div className="mt-5 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setDeletingEvent(null)}
                  className="btn-secondary min-h-11 py-2.5 text-xs"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  disabled={deleteEvent.isPending}
                  onClick={() => deleteEvent.mutate({ id: deletingEvent.id })}
                  className="min-h-11 rounded-xl border border-danger/30 bg-danger py-2.5 text-xs font-extrabold text-white hover:opacity-90 disabled:opacity-60"
                >
                  {deleteEvent.isPending ? "กำลังลบ..." : "ยืนยันลบ"}
                </button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
