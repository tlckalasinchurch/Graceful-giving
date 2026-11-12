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
import { friendlyErrorMessage } from "@/lib/errors";

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
        <div className="h-44 rounded-2xl border border-[var(--ink)] bg-paper-2" />
        <div className="h-44 rounded-2xl border border-[var(--ink)] bg-paper-2" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bento-card p-6 text-center text-sm text-ink-2">
        <p className="font-extrabold text-ink">
          ไม่สามารถโหลดข้อมูลข่าวสารได้ในขณะนี้
        </p>
        <p className="mt-1 text-xs font-medium text-ink-3">
          {friendlyErrorMessage(error, "เกิดข้อผิดพลาดในการเชื่อมต่อเครือข่าย")}
        </p>
        <button
          onClick={() => refetch()}
          className="mt-4 min-h-11 rounded-xl border border-[var(--ink)] bg-danger px-4 py-2 text-xs font-extrabold text-white hover:opacity-90"
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
            <p className="font-display text-xl font-extrabold text-ink">
              ข่าวสารล่าสุด
            </p>
            <p className="mt-1 text-xs font-medium text-ink-2">
              ประกาศและเรื่องราวพระคุณจากคริสตจักร
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full border-[1.5px] border-[var(--ink)] bg-paper-2 px-3 py-1 text-xs font-extrabold text-brand">
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
              className={`min-h-11 rounded-full px-3.5 py-2 text-xs transition-colors ${
                newsCategoryFilter === cat
                  ? "border border-[var(--ink)] bg-accent font-extrabold text-accent-foreground "
                  : "border-[1.5px] border-[var(--ink)] bg-surface font-bold text-ink-2 hover:bg-paper-2 hover:text-ink"
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
                className="bento-card group cursor-pointer p-5 transition-colors hover:-translate-x-0.5 hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-brand"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-tile-mint px-2.5 py-1 text-xs font-extrabold text-tile-mint-ink">
                    <Tag className="size-3" />
                    {categoryLabels[item.category]}
                  </span>
                  <span className="text-xs font-bold text-ink-3">
                    {formatThaiDate(item.publishedAt ?? item.createdAt)}
                  </span>
                </div>
                <h3 className="mt-4 font-display text-lg font-extrabold leading-7 text-ink group-hover:text-brand transition-colors">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm font-medium leading-6 text-ink-2 line-clamp-3">
                  {item.summary}
                </p>
                <div className="mt-4 flex items-center gap-1 text-xs font-extrabold text-brand">
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
            <p className="font-display text-xl font-extrabold text-ink">
              กิจกรรมที่กำลังจะมาถึง
            </p>
            <p className="mt-1 text-xs font-medium text-ink-2">
              วางแผนร่วมรับใช้และสามัคคีธรรมด้วยกัน
            </p>
          </div>
          <span className="rounded-full border-[1.5px] border-[var(--ink)] bg-surface px-3 py-1 text-xs font-extrabold text-ink">
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
                className="bento-card group flex cursor-pointer gap-4 p-4 transition-colors hover:-translate-x-0.5 hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-brand"
              >
                <div className="flex size-14 shrink-0 flex-col items-center justify-center rounded-2xl border border-[var(--ink)] bg-accent text-accent-foreground">
                  <CalendarDays className="size-5" />
                  <span className="mt-0.5 text-xs font-extrabold">
                    {new Date(event.startsAt).getDate()}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-base font-extrabold text-ink group-hover:text-brand transition-colors">
                    {event.title}
                  </h3>
                  <p className="mt-1 text-xs font-extrabold text-ink-2">
                    {formatEventDate(event.startsAt)}
                  </p>
                  <p className="mt-2 line-clamp-2 text-sm font-medium leading-6 text-ink-2">
                    {event.summary}
                  </p>
                  {event.location && (
                    <p className="mt-2 flex items-center gap-1 text-xs font-bold text-ink-2">
                      <MapPin className="size-3.5 text-brand" />
                      {event.location}
                    </p>
                  )}
                </div>
                <ChevronRight className="mt-1 size-5 shrink-0 text-ink-3 group-hover:text-brand transition-colors" />
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
        <DialogContent className="neo-modal max-h-[90vh] w-full max-w-xl overflow-y-auto p-6">
          {selectedNews && (
            <>
              <DialogHeader className="space-y-2 text-left">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-tile-mint px-3 py-1 text-xs font-extrabold text-tile-mint-ink">
                    <Tag className="size-3.5" />
                    {categoryLabels[selectedNews.category]}
                  </span>
                  <span className="text-xs font-bold text-ink-3">
                    {formatThaiDate(
                      selectedNews.publishedAt ?? selectedNews.createdAt
                    )}
                  </span>
                </div>
                <DialogTitle className="font-display text-2xl font-extrabold leading-tight text-ink">
                  {selectedNews.title}
                </DialogTitle>
                <DialogDescription className="text-xs font-medium text-ink-2">
                  รายละเอียดข่าวสารและประกาศคริสตจักร
                </DialogDescription>
              </DialogHeader>

              <div className="mt-2 rounded-2xl border-[1.5px] border-[var(--ink)] bg-paper-2 p-4 text-sm font-medium leading-6 text-ink-2">
                <p className="mb-1 font-extrabold text-brand">สรุปสาระสำคัญ:</p>
                {selectedNews.summary}
              </div>

              <div className="mt-4 border-t-2 border-[var(--ink)] pt-4">
                <p className="mb-2 text-sm font-extrabold text-ink-2">
                  เนื้อหาฉบับเต็ม:
                </p>
                <div className="whitespace-pre-wrap text-sm font-medium leading-relaxed text-ink-2">
                  {selectedNews.body}
                </div>
              </div>

              <div className="mt-6 flex justify-end border-t border-line pt-4">
                <button
                  onClick={() => setSelectedNews(null)}
                  className="btn-primary min-h-11 px-6 py-2.5 text-sm"
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
        <DialogContent className="neo-modal max-h-[90vh] w-full max-w-xl overflow-y-auto p-6">
          {selectedEvent && (
            <>
              <DialogHeader className="space-y-2 text-left">
                <div className="flex items-center gap-3">
                  <span className="grid size-11 place-items-center rounded-xl border border-[var(--ink)] bg-accent text-accent-foreground">
                    <CalendarDays className="size-6" />
                  </span>
                  <div>
                    <DialogTitle className="font-display text-xl font-extrabold text-ink">
                      {selectedEvent.title}
                    </DialogTitle>
                    <div className="mt-1 flex items-center gap-2">
                      <StatusPill status={selectedEvent.status} />
                    </div>
                  </div>
                </div>
                <DialogDescription className="text-xs font-medium text-ink-2">
                  ข้อมูลและกำหนดการกิจกรรมคริสตจักร
                </DialogDescription>
              </DialogHeader>

              <div className="mt-3 space-y-2.5 rounded-2xl border-[1.5px] border-[var(--ink)] bg-paper-2 p-4 text-xs font-medium text-ink-2">
                <div className="flex items-center gap-2">
                  <Clock3 className="size-4 text-brand" />
                  <span className="font-extrabold">เริ่ม:</span>{" "}
                  {formatEventDate(selectedEvent.startsAt)}
                </div>
                {selectedEvent.endsAt && (
                  <div className="flex items-center gap-2">
                    <Clock3 className="size-4 text-brand" />
                    <span className="font-extrabold">สิ้นสุด:</span>{" "}
                    {formatEventDate(selectedEvent.endsAt)}
                  </div>
                )}
                {selectedEvent.location && (
                  <div className="flex items-center gap-2">
                    <MapPin className="size-4 text-brand" />
                    <span className="font-extrabold">สถานที่:</span>{" "}
                    {selectedEvent.location}
                  </div>
                )}
              </div>

              <div className="mt-4">
                <p className="mb-1 text-sm font-extrabold text-ink-2">
                  สรุปกิจกรรม:
                </p>
                <p className="text-sm font-medium leading-6 text-ink-2">
                  {selectedEvent.summary}
                </p>
              </div>

              {selectedEvent.description && (
                <div className="mt-4 border-t-2 border-[var(--ink)] pt-4">
                  <p className="mb-2 text-sm font-extrabold text-ink-2">
                    รายละเอียดเพิ่มเติม:
                  </p>
                  <div className="whitespace-pre-wrap text-sm font-medium leading-relaxed text-ink-2">
                    {selectedEvent.description}
                  </div>
                </div>
              )}

              <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => downloadICS(selectedEvent)}
                    className="btn-secondary inline-flex min-h-11 items-center gap-2 px-4 py-2.5 text-xs"
                  >
                    <CalendarPlus className="size-4 text-brand" />
                    เพิ่มลงปฏิทิน (.ics)
                  </button>
                  {selectedEvent.registrationUrl && (
                    <a
                      href={selectedEvent.registrationUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-primary inline-flex min-h-11 items-center gap-2 px-4 py-2.5 text-xs"
                    >
                      ลงทะเบียนเข้าร่วม <ExternalLink className="size-3.5" />
                    </a>
                  )}
                </div>
                <button
                  onClick={() => setSelectedEvent(null)}
                  className="btn-secondary min-h-11 px-5 py-2.5 text-xs"
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
