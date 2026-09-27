import { useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import {
  CalendarDays,
  CalendarPlus,
  ChevronRight,
  Clock3,
  ExternalLink,
  MapPin,
  Tag,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  categoryLabels,
  downloadICS,
  EmptyPanel,
  formatEventDate,
  formatThaiDate,
  NewsCategory,
  StatusPill,
} from "./updatesUtils";

export function MemberFeed() {
  const { data, isLoading, error, refetch } = trpc.updates.feed.useQuery(
    undefined,
    { retry: false }
  );
  const news = data?.news ?? [];
  const events = data?.events ?? [];

  type NewsItem = NonNullable<typeof data>["news"][number];
  type EventItem = NonNullable<typeof data>["events"][number];

  const [selectedNews, setSelectedNews] = useState<NewsItem | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null);
  const [newsCategoryFilter, setNewsCategoryFilter] = useState<
    "all" | NewsCategory
  >("all");

  const filteredNews = useMemo(() => {
    if (newsCategoryFilter === "all") return news;
    return news.filter(item => item.category === newsCategoryFilter);
  }, [news, newsCategoryFilter]);

  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="h-44 animate-pulse rounded-2xl bg-white/70" />
        <div className="h-44 animate-pulse rounded-2xl bg-white/70" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-destructive-border bg-destructive-soft p-4 sm:p-6 text-center text-sm text-destructive-strong">
        <p className="font-bold text-destructive-strong">
          ไม่สามารถโหลดข้อมูลข่าวสารได้ในขณะนี้
        </p>
        <p className="mt-1 text-xs text-destructive-strong">
          {error.message || "เกิดข้อผิดพลาดในการเชื่อมต่อเครือข่าย"}
        </p>
        <button
          onClick={() => refetch()}
          className="mt-4 rounded-xl bg-destructive-strong px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-destructive"
        >
          ลองใหม่อีกครั้ง
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-9">
      {/* News section */}
      <section>
        <div className="mb-3 flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
          <div>
            <p className="font-display text-xl font-bold tracking-tight text-foreground-soft">
              ข่าวสารล่าสุด
            </p>
            <p className="mt-1 text-xs text-foreground-soft">
              ประกาศและเรื่องราวพระคุณจากคริสตจักร
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-muted px-3 py-1 text-[11px] font-bold text-primary-strong">
              {filteredNews.length} รายการ
            </span>
          </div>
        </div>

        {/* Category tabs for news */}
        <div
          className="mb-4 flex flex-wrap gap-1.5"
          role="tablist"
          aria-label="กรองหมวดหมู่ข่าวสาร"
        >
          {(
            ["all", "announcement", "ministry", "finance", "pastoral"] as const
          ).map(cat => (
            <button
              key={cat}
              role="tab"
              aria-selected={newsCategoryFilter === cat}
              onClick={() => setNewsCategoryFilter(cat)}
              className={`min-h-11 rounded-full px-3.5 py-2 text-xs font-bold transition-all ${
                newsCategoryFilter === cat
                  ? "bg-primary-strong text-white shadow-sm"
                  : "bg-white/80 text-foreground-soft hover:bg-card hover:text-foreground-soft border border-border"
              }`}
            >
              {cat === "all" ? "ทั้งหมด" : categoryLabels[cat]}
            </button>
          ))}
        </div>

        {filteredNews.length === 0 ? (
          <EmptyPanel type="news" />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {filteredNews.map(item => (
              <article
                key={item.id}
                onClick={() => setSelectedNews(item)}
                tabIndex={0}
                role="button"
                aria-label={`ดูข่าวสาร: ${item.title}`}
                onKeyDown={e => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setSelectedNews(item);
                  }
                }}
                className="group cursor-pointer rounded-2xl border border-divider bg-card p-4 sm:p-5 shadow-[0_5px_15px_rgba(94,70,42,0.04)] transition hover:-translate-y-0.5 hover:shadow-[0_12px_24px_rgba(94,70,42,0.08)] focus:outline-none focus:ring-2 focus:ring-primary-strong"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-[10px] font-bold text-primary-strong">
                    <Tag className="size-3" />
                    {categoryLabels[item.category]}
                  </span>
                  <span className="text-[10px] text-muted-foreground font-medium">
                    {formatThaiDate(item.publishedAt ?? item.createdAt)}
                  </span>
                </div>
                <h3 className="mt-4 font-display text-lg font-bold leading-7 text-foreground-soft group-hover:text-primary transition-colors">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-foreground-soft line-clamp-3">
                  {item.summary}
                </p>
                <div className="mt-4 flex items-center gap-1 text-xs font-bold text-primary">
                  อ่านรายละเอียด{" "}
                  <ChevronRight className="size-3.5 transition group-hover:translate-x-0.5" />
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* Events section */}
      <section>
        <div className="mb-3 flex items-end justify-between">
          <div>
            <p className="font-display text-xl font-bold tracking-tight text-foreground-soft">
              กิจกรรมที่กำลังจะมาถึง
            </p>
            <p className="mt-1 text-xs text-foreground-soft">
              วางแผนร่วมรับใช้และสามัคคีธรรมด้วยกัน
            </p>
          </div>
          <span className="rounded-full bg-info-soft px-3 py-1 text-[11px] font-bold text-info">
            {events.length} กิจกรรม
          </span>
        </div>
        {events.length === 0 ? (
          <EmptyPanel type="events" />
        ) : (
          <div className="space-y-3">
            {events.map(event => (
              <article
                key={event.id}
                onClick={() => setSelectedEvent(event)}
                tabIndex={0}
                role="button"
                aria-label={`ดูกิจกรรม: ${event.title}`}
                onKeyDown={e => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setSelectedEvent(event);
                  }
                }}
                className="group flex cursor-pointer gap-4 rounded-2xl border border-divider bg-card p-4 shadow-[0_5px_15px_rgba(94,70,42,0.04)] transition hover:-translate-y-0.5 hover:shadow-[0_10px_20px_rgba(94,70,42,0.08)] focus:outline-none focus:ring-2 focus:ring-primary-strong"
              >
                <div className="flex size-14 shrink-0 flex-col items-center justify-center rounded-2xl bg-info-soft text-info">
                  <CalendarDays className="size-5" />
                  <span className="mt-0.5 text-[11px] font-bold">
                    {new Date(event.startsAt).getDate()}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-base font-bold text-foreground-soft group-hover:text-primary transition-colors">
                    {event.title}
                  </h3>
                  <p className="mt-1 text-xs font-semibold text-info">
                    {formatEventDate(event.startsAt)}
                  </p>
                  <p className="mt-2 line-clamp-2 text-sm leading-6 text-foreground-soft">
                    {event.summary}
                  </p>
                  {event.location && (
                    <p className="mt-2 flex items-center gap-1 text-xs text-foreground-soft">
                      <MapPin className="size-3.5 text-primary-strong" />
                      {event.location}
                    </p>
                  )}
                </div>
                <ChevronRight className="mt-1 size-5 shrink-0 text-muted-foreground group-hover:text-primary transition-colors" />
              </article>
            ))}
          </div>
        )}
      </section>

      {/* Radix Dialog for News details */}
      <Dialog
        open={!!selectedNews}
        onOpenChange={open => !open && setSelectedNews(null)}
      >
        <DialogContent className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl border-divider bg-card p-4 sm:p-6 shadow-2xl">
          {selectedNews && (
            <>
              <DialogHeader className="space-y-2 text-left">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs font-bold text-primary-strong">
                    <Tag className="size-3.5" />
                    {categoryLabels[selectedNews.category]}
                  </span>
                  <span className="text-xs font-medium text-muted-foreground">
                    {formatThaiDate(
                      selectedNews.publishedAt ?? selectedNews.createdAt
                    )}
                  </span>
                </div>
                <DialogTitle className="font-display text-2xl font-bold leading-tight text-foreground-soft">
                  {selectedNews.title}
                </DialogTitle>
                <DialogDescription className="text-xs text-foreground-soft">
                  รายละเอียดข่าวสารและประกาศคริสตจักร
                </DialogDescription>
              </DialogHeader>

              <div className="mt-2 rounded-2xl border border-muted bg-background p-4 text-sm font-medium leading-6 text-foreground-soft">
                <p className="mb-1 font-bold text-primary">สรุปสาระสำคัญ:</p>
                {selectedNews.summary}
              </div>

              <div className="mt-4 border-t border-divider pt-4">
                <p className="mb-2 text-sm font-semibold text-foreground-soft">
                  เนื้อหาฉบับเต็ม:
                </p>
                <div className="whitespace-pre-wrap text-sm leading-relaxed text-foreground-soft">
                  {selectedNews.body}
                </div>
              </div>

              <div className="mt-6 flex justify-end border-t border-divider pt-4">
                <button
                  onClick={() => setSelectedNews(null)}
                  className="rounded-xl bg-primary-strong px-6 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-primary focus:outline-none focus:ring-2 focus:ring-primary-strong"
                >
                  ปิดหน้าต่าง
                </button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Radix Dialog for Event details with .ics export */}
      <Dialog
        open={!!selectedEvent}
        onOpenChange={open => !open && setSelectedEvent(null)}
      >
        <DialogContent className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl border-divider bg-card p-4 sm:p-6 shadow-2xl">
          {selectedEvent && (
            <>
              <DialogHeader className="space-y-2 text-left">
                <div className="flex items-center gap-3">
                  <span className="grid size-11 place-items-center rounded-2xl bg-info-soft text-info">
                    <CalendarDays className="size-6" />
                  </span>
                  <div>
                    <DialogTitle className="font-display text-xl font-bold text-foreground-soft">
                      {selectedEvent.title}
                    </DialogTitle>
                    <div className="mt-1 flex items-center gap-2">
                      <StatusPill status={selectedEvent.status} />
                    </div>
                  </div>
                </div>
                <DialogDescription className="text-xs text-foreground-soft">
                  ข้อมูลและกำหนดการกิจกรรมคริสตจักร
                </DialogDescription>
              </DialogHeader>

              <div className="mt-3 space-y-2.5 rounded-2xl border border-divider bg-background p-4 text-xs text-foreground-soft">
                <div className="flex items-center gap-2">
                  <Clock3 className="size-4 text-primary-strong" />
                  <span className="font-bold">เริ่ม:</span>{" "}
                  {formatEventDate(selectedEvent.startsAt)}
                </div>
                {selectedEvent.endsAt && (
                  <div className="flex items-center gap-2">
                    <Clock3 className="size-4 text-primary-strong" />
                    <span className="font-bold">สิ้นสุด:</span>{" "}
                    {formatEventDate(selectedEvent.endsAt)}
                  </div>
                )}
                {selectedEvent.location && (
                  <div className="flex items-center gap-2">
                    <MapPin className="size-4 text-primary-strong" />
                    <span className="font-bold">สถานที่:</span>{" "}
                    {selectedEvent.location}
                  </div>
                )}
              </div>

              <div className="mt-4">
                <p className="mb-1 text-sm font-semibold text-foreground-soft">
                  สรุปกิจกรรม:
                </p>
                <p className="text-sm leading-6 text-foreground-soft">
                  {selectedEvent.summary}
                </p>
              </div>

              {selectedEvent.description && (
                <div className="mt-4 border-t border-divider pt-4">
                  <p className="mb-2 text-sm font-semibold text-foreground-soft">
                    รายละเอียดเพิ่มเติม:
                  </p>
                  <div className="whitespace-pre-wrap text-sm leading-relaxed text-foreground-soft">
                    {selectedEvent.description}
                  </div>
                </div>
              )}

              <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-divider pt-4">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => downloadICS(selectedEvent)}
                    className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-xs font-bold text-primary-strong hover:bg-background active:scale-95 transition"
                  >
                    <CalendarPlus className="size-4 text-primary-strong" />
                    เพิ่มลงปฏิทิน (.ics)
                  </button>
                  {selectedEvent.registrationUrl && (
                    <a
                      href={selectedEvent.registrationUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-success px-4 py-2.5 text-xs font-bold text-white hover:bg-success"
                    >
                      ลงทะเบียนเข้าร่วม <ExternalLink className="size-3.5" />
                    </a>
                  )}
                </div>
                <button
                  onClick={() => setSelectedEvent(null)}
                  className="min-h-[44px] rounded-xl border border-border px-5 py-2.5 text-xs font-bold text-foreground-soft hover:bg-muted"
                >
                  ปิดหน้าต่าง
                </button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
