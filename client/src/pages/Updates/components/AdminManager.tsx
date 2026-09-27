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
import { toast } from "sonner";
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

export function AdminManager() {
  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.updates.adminList.useQuery(undefined, {
    retry: false,
  });
  const createNews = trpc.updates.createNews.useMutation({
    onSuccess: async () => {
      await utils.updates.adminList.invalidate();
      await utils.updates.feed.invalidate();
      toast.success("สร้างข่าวสารเรียบร้อย");
      setNewsOpen(false);
    },
  });
  const createEvent = trpc.updates.createEvent.useMutation({
    onSuccess: async () => {
      await utils.updates.adminList.invalidate();
      await utils.updates.feed.invalidate();
      toast.success("สร้างกิจกรรมเรียบร้อย");
      setEventOpen(false);
    },
  });
  const updateNews = trpc.updates.updateNews.useMutation({
    onSuccess: async () => {
      await utils.updates.adminList.invalidate();
      await utils.updates.feed.invalidate();
      toast.success("อัปเดตข่าวสารเรียบร้อย");
      setNewsOpen(false);
      setEditingNewsId(null);
    },
  });
  const updateEvent = trpc.updates.updateEvent.useMutation({
    onSuccess: async () => {
      await utils.updates.adminList.invalidate();
      await utils.updates.feed.invalidate();
      toast.success("อัปเดตกิจกรรมเรียบร้อย");
      setEventOpen(false);
      setEditingEventId(null);
    },
  });
  const setNewsStatus = trpc.updates.setNewsStatus.useMutation({
    onSuccess: async () => {
      await utils.updates.adminList.invalidate();
      await utils.updates.feed.invalidate();
      toast.success("เปลี่ยนสถานะข่าวสารเรียบร้อย");
    },
  });
  const setEventStatus = trpc.updates.setEventStatus.useMutation({
    onSuccess: async () => {
      await utils.updates.adminList.invalidate();
      await utils.updates.feed.invalidate();
      toast.success("เปลี่ยนสถานะกิจกรรมเรียบร้อย");
    },
  });
  const deleteNews = trpc.updates.deleteNews.useMutation({
    onSuccess: async () => {
      await utils.updates.adminList.invalidate();
      await utils.updates.feed.invalidate();
      toast.success("ลบข่าวสารเรียบร้อย");
      setDeletingNews(null);
    },
  });
  const deleteEvent = trpc.updates.deleteEvent.useMutation({
    onSuccess: async () => {
      await utils.updates.adminList.invalidate();
      await utils.updates.feed.invalidate();
      toast.success("ลบกิจกรรมเรียบร้อย");
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
    if (
      eventForm.endsAt &&
      new Date(eventForm.endsAt) < new Date(eventForm.startsAt)
    ) {
      toast.error("วัน-เวลาสิ้นสุด ต้องไม่เกิดขึ้นก่อนวัน-เวลาเริ่มต้น");
      return;
    }
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
    <section className="mt-10 rounded-2xl border border-border bg-background p-5 sm:p-7">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <Settings2 className="size-5 text-primary-strong" />
            <h2 className="font-display text-xl font-bold tracking-tight text-foreground-soft">
              จัดการเนื้อหา
            </h2>
          </div>
          <p className="mt-1 text-sm text-foreground-soft">
            เพิ่มประกาศและปฏิทินกิจกรรมให้สมาชิกติดตาม
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={openNewNews}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-primary-strong px-4 py-2.5 text-xs font-bold text-white hover:bg-primary shadow-sm active:scale-95 transition"
          >
            <Plus className="size-4" /> ข่าวสารใหม่
          </button>
          <button
            onClick={openNewEvent}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-border bg-card px-4 py-2.5 text-xs font-bold text-primary-strong hover:bg-background active:scale-95 transition"
          >
            <CalendarDays className="size-4" /> กิจกรรมใหม่
          </button>
        </div>
      </div>

      <div className="mt-4 relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="ค้นหาชื่อข่าวสารหรือกิจกรรม..."
          className="w-full rounded-2xl border border-border bg-card py-2.5 pl-10 pr-4 text-xs font-medium text-foreground-soft focus:border-primary-strong focus:outline-none"
        />
      </div>

      {isLoading ? (
        <div className="mt-5 h-20 animate-pulse rounded-2xl bg-white/70" />
      ) : (
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          {/* Admin News List */}
          <div className="rounded-2xl border border-divider bg-card p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-bold text-foreground-soft">ข่าวสารทั้งหมด</p>
              <span className="text-xs font-semibold text-muted-foreground">
                {filteredNews.length} รายการ
              </span>
            </div>
            {filteredNews.length ? (
              <div className="max-h-[380px] overflow-y-auto divide-y divide-divider pr-1">
                {filteredNews.map(item => (
                  <div
                    key={item.id}
                    className="flex flex-wrap items-center justify-between gap-2 py-3"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-muted text-primary-strong">
                        <Megaphone className="size-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-foreground-soft">
                          {item.title}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {formatThaiDate(item.createdAt)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        aria-label={`แก้ไขข่าวสาร ${item.title}`}
                        className="grid min-h-11 min-w-11 place-items-center rounded-lg text-primary-strong hover:bg-background"
                        onClick={() => beginNewsEdit(item)}
                      >
                        <PencilLine className="size-4" />
                      </button>
                      <button
                        aria-label={`ลบข่าวสาร ${item.title}`}
                        className="grid min-h-11 min-w-11 place-items-center rounded-lg text-destructive-strong hover:bg-destructive-soft"
                        onClick={() => setDeletingNews(item)}
                      >
                        <Trash2 className="size-4" />
                      </button>
                      <StatusPill status={item.status} />
                      {item.status === "draft" && (
                        <button
                          className="min-h-11 px-2 text-xs font-bold text-success hover:underline"
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
                          className="min-h-11 px-2 text-xs font-bold text-destructive hover:underline"
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
              <p className="py-6 text-center text-xs text-muted-foreground">
                ไม่พบข่าวสาร
              </p>
            )}
          </div>

          {/* Admin Events List */}
          <div className="rounded-2xl border border-divider bg-card p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-bold text-foreground-soft">กิจกรรมทั้งหมด</p>
              <span className="text-xs font-semibold text-muted-foreground">
                {filteredEvents.length} รายการ
              </span>
            </div>
            {filteredEvents.length ? (
              <div className="max-h-[380px] overflow-y-auto divide-y divide-divider pr-1">
                {filteredEvents.map(item => (
                  <div
                    key={item.id}
                    className="flex flex-wrap items-center justify-between gap-2 py-3"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-info-soft text-info">
                        <CalendarDays className="size-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-foreground-soft">
                          {item.title}
                        </p>
                        <p className="text-[11px] text-info">
                          {formatEventDate(item.startsAt)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        aria-label={`แก้ไขกิจกรรม ${item.title}`}
                        className="grid min-h-11 min-w-11 place-items-center rounded-lg text-info hover:bg-info-soft"
                        onClick={() => beginEventEdit(item)}
                      >
                        <PencilLine className="size-4" />
                      </button>
                      <button
                        aria-label={`ลบกิจกรรม ${item.title}`}
                        className="grid min-h-11 min-w-11 place-items-center rounded-lg text-destructive-strong hover:bg-destructive-soft"
                        onClick={() => setDeletingEvent(item)}
                      >
                        <Trash2 className="size-4" />
                      </button>
                      <StatusPill status={item.status} />
                      {item.status === "draft" && (
                        <button
                          className="min-h-11 px-2 text-xs font-bold text-success hover:underline"
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
                          className="min-h-11 px-2 text-xs font-bold text-destructive hover:underline"
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
              <p className="py-6 text-center text-xs text-muted-foreground">
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
        <DialogContent className="w-full max-w-sm rounded-2xl border-divider bg-card p-4 sm:p-6 shadow-2xl">
          {deletingNews && (
            <>
              <DialogHeader className="text-left">
                <div className="flex items-center gap-3 text-destructive-strong">
                  <div className="grid size-11 place-items-center rounded-2xl bg-destructive-soft">
                    <AlertTriangle className="size-6" />
                  </div>
                  <div>
                    <DialogTitle className="font-display text-lg font-bold text-foreground-soft">
                      ยืนยันการลบข่าวสาร
                    </DialogTitle>
                    <DialogDescription className="text-xs text-foreground-soft">
                      การดำเนินการนี้ไม่สามารถย้อนกลับได้
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>
              <p className="mt-3 rounded-xl bg-destructive-soft p-3 text-xs font-semibold text-destructive-strong">
                ต้องการลบ &ldquo;{deletingNews.title}&rdquo; ออกจากระบบหรือไม่?
              </p>
              <div className="mt-5 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setDeletingNews(null)}
                  className="min-h-[44px] rounded-xl border border-border py-2.5 text-xs font-bold text-foreground-soft hover:bg-muted"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  disabled={deleteNews.isPending}
                  onClick={() => deleteNews.mutate({ id: deletingNews.id })}
                  className="min-h-[44px] rounded-xl bg-destructive-strong py-2.5 text-xs font-bold text-white hover:bg-destructive disabled:opacity-60"
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
        <DialogContent className="w-full max-w-sm rounded-2xl border-divider bg-card p-4 sm:p-6 shadow-2xl">
          {deletingEvent && (
            <>
              <DialogHeader className="text-left">
                <div className="flex items-center gap-3 text-destructive-strong">
                  <div className="grid size-11 place-items-center rounded-2xl bg-destructive-soft">
                    <AlertTriangle className="size-6" />
                  </div>
                  <div>
                    <DialogTitle className="font-display text-lg font-bold text-foreground-soft">
                      ยืนยันการลบกิจกรรม
                    </DialogTitle>
                    <DialogDescription className="text-xs text-foreground-soft">
                      การดำเนินการนี้ไม่สามารถย้อนกลับได้
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>
              <p className="mt-3 rounded-xl bg-destructive-soft p-3 text-xs font-semibold text-destructive-strong">
                ต้องการลบกิจกรรม &ldquo;{deletingEvent.title}&rdquo; หรือไม่?
              </p>
              <div className="mt-5 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setDeletingEvent(null)}
                  className="min-h-[44px] rounded-xl border border-border py-2.5 text-xs font-bold text-foreground-soft hover:bg-muted"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  disabled={deleteEvent.isPending}
                  onClick={() => deleteEvent.mutate({ id: deletingEvent.id })}
                  className="min-h-[44px] rounded-xl bg-destructive-strong py-2.5 text-xs font-bold text-white hover:bg-destructive disabled:opacity-60"
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
