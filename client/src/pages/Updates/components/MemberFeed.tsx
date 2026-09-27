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
      <div
        role="status"
        aria-label="กำลังโหลดข่าวสาร"
        className="grid gap-6 sm:grid-cols-2"
      >
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            aria-hidden="true"
            className="animate-pulse overflow-hidden rounded-2xl border border-[#E7DCC8] bg-card shadow-xs"
          >
            <div className="h-36 bg-[#F1E6D2]" />
            <div className="space-y-2.5 p-5">
              <div className="h-3 w-20 rounded-full bg-[#F5EDE0]" />
              <div className="h-5 w-3/4 rounded-full bg-[#F1E6D2]" />
              <div className="h-3 w-full rounded-full bg-[#F5EDE0]" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-[#F8C8C5] bg-[#FEECEB] p-6 text-center text-sm text-[#C8372D]">
        <p className="font-bold text-[#C8372D]">
          ไม่สามารถโหลดข้อมูลข่าวสารได้ในขณะนี้
        </p>
        <p className="mt-1 text-xs text-[#51443A]">
          {error.message || "เกิดข้อผิดพลาดในการเชื่อมต่อเครือข่าย"}
        </p>
        <button
          onClick={() => refetch()}
          className="mt-4 rounded-xl bg-[#A92D24] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#C8372D] transition-all duration-200 ease-in-out"
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
            <p className="font-display text-xl font-bold tracking-tight text-[#51443A]">
              ข่าวสารล่าสุด
            </p>
            <p className="mt-1 text-xs text-[#51443A]">
              ประกาศและเรื่องราวพระคุณจากคริสตจักร
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-[#FFF4D6] px-3 py-1 text-[11px] font-bold text-[#9F3B0F]">
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
              className={`min-h-11 rounded-full px-3.5 py-2 text-sm font-semibold transition-all duration-200 ease-in-out ${
                newsCategoryFilter === cat
                  ? "bg-[#9F3B0F] text-white shadow-sm"
                  : "bg-white/80 text-[#51443A] hover:bg-white hover:text-[#51443A] border border-[#E7DCC8]"
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
                className="group cursor-pointer rounded-2xl border border-[#EFE5D3] bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-[#9F3B0F]"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FFF4D6] px-2.5 py-1 text-[10px] font-bold text-[#9F3B0F]">
                    <Tag className="size-3" />
                    {categoryLabels[item.category]}
                  </span>
                  <span className="text-[10px] text-[#6E6155] font-medium">
                    {formatThaiDate(item.publishedAt ?? item.createdAt)}
                  </span>
                </div>
                <h3 className="mt-4 font-display text-lg font-bold leading-7 text-[#171311] group-hover:text-[#C94F16] transition-all duration-200 ease-in-out">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-[#51443A] line-clamp-3">
                  {item.summary}
                </p>
                <div className="mt-4 flex items-center gap-1 text-xs font-bold text-[#C94F16]">
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
            <p className="font-display text-xl font-bold tracking-tight text-[#51443A]">
              กิจกรรมที่กำลังจะมาถึง
            </p>
            <p className="mt-1 text-xs text-[#51443A]">
              วางแผนร่วมรับใช้และสามัคคีธรรมด้วยกัน
            </p>
          </div>
          <span className="rounded-full bg-[#F5EDE0] px-3 py-1 text-[11px] font-bold text-[#51443A]">
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
                className="group flex cursor-pointer gap-4 rounded-2xl border border-[#EFE5D3] bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-[#9F3B0F]"
              >
                <div className="flex size-14 shrink-0 flex-col items-center justify-center rounded-2xl bg-[#F5EDE0] text-[#51443A]">
                  <CalendarDays className="size-5" />
                  <span className="mt-0.5 text-[11px] font-bold">
                    {new Date(event.startsAt).getDate()}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-base font-bold text-[#171311] group-hover:text-[#C94F16] transition-all duration-200 ease-in-out">
                    {event.title}
                  </h3>
                  <p className="mt-1 text-xs font-semibold text-[#51443A]">
                    {formatEventDate(event.startsAt)}
                  </p>
                  <p className="mt-2 line-clamp-2 text-sm leading-6 text-[#51443A]">
                    {event.summary}
                  </p>
                  {event.location && (
                    <p className="mt-2 flex items-center gap-1 text-xs text-[#51443A]">
                      <MapPin className="size-3.5 text-[#9F3B0F]" />
                      {event.location}
                    </p>
                  )}
                </div>
                <ChevronRight className="mt-1 size-5 shrink-0 text-[#6E6155] group-hover:text-[#C94F16] transition-all duration-200 ease-in-out" />
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
        <DialogContent className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl border-[#EFE5D3] bg-card p-6 shadow-lg">
          {selectedNews && (
            <>
              <DialogHeader className="space-y-2 text-left">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FFF4D6] px-3 py-1 text-xs font-bold text-[#9F3B0F]">
                    <Tag className="size-3.5" />
                    {categoryLabels[selectedNews.category]}
                  </span>
                  <span className="text-xs font-medium text-[#6E6155]">
                    {formatThaiDate(
                      selectedNews.publishedAt ?? selectedNews.createdAt
                    )}
                  </span>
                </div>
                <DialogTitle className="font-display text-2xl font-bold leading-tight text-[#171311]">
                  {selectedNews.title}
                </DialogTitle>
                <DialogDescription className="text-xs text-[#51443A]">
                  รายละเอียดข่าวสารและประกาศคริสตจักร
                </DialogDescription>
              </DialogHeader>

              <div className="mt-2 rounded-2xl border border-[#FFF8EA] bg-[#FAF8F5] p-4 text-sm font-medium leading-6 text-[#51443A]">
                <p className="mb-1 font-bold text-[#C94F16]">สรุปสาระสำคัญ:</p>
                {selectedNews.summary}
              </div>

              <div className="mt-4 border-t border-[#EFE5D3] pt-4">
                <p className="mb-2 text-sm font-semibold text-[#51443A]">
                  เนื้อหาฉบับเต็ม:
                </p>
                <div className="whitespace-pre-wrap text-sm leading-relaxed text-[#51443A]">
                  {selectedNews.body}
                </div>
              </div>

              <div className="mt-6 flex justify-end border-t border-[#EFE5D3] pt-4">
                <button
                  onClick={() => setSelectedNews(null)}
                  className="rounded-xl bg-[#9F3B0F] px-6 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-[#C94F16] focus:outline-none focus:ring-2 focus:ring-[#9F3B0F] hover:shadow-sm active:scale-[0.98] disabled:opacity-55 disabled:cursor-not-allowed transition-all duration-200 ease-in-out"
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
        <DialogContent className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl border-[#EFE5D3] bg-card p-6 shadow-lg">
          {selectedEvent && (
            <>
              <DialogHeader className="space-y-2 text-left">
                <div className="flex items-center gap-3">
                  <span className="grid size-11 place-items-center rounded-2xl bg-[#F5EDE0] text-[#51443A]">
                    <CalendarDays className="size-6" />
                  </span>
                  <div>
                    <DialogTitle className="font-display text-xl font-bold text-[#171311]">
                      {selectedEvent.title}
                    </DialogTitle>
                    <div className="mt-1 flex items-center gap-2">
                      <StatusPill status={selectedEvent.status} />
                    </div>
                  </div>
                </div>
                <DialogDescription className="text-xs text-[#51443A]">
                  ข้อมูลและกำหนดการกิจกรรมคริสตจักร
                </DialogDescription>
              </DialogHeader>

              <div className="mt-3 space-y-2.5 rounded-2xl border border-[#EFE5D3] bg-[#FAF8F5] p-4 text-xs text-[#51443A]">
                <div className="flex items-center gap-2">
                  <Clock3 className="size-4 text-[#9F3B0F]" />
                  <span className="font-bold">เริ่ม:</span>{" "}
                  {formatEventDate(selectedEvent.startsAt)}
                </div>
                {selectedEvent.endsAt && (
                  <div className="flex items-center gap-2">
                    <Clock3 className="size-4 text-[#9F3B0F]" />
                    <span className="font-bold">สิ้นสุด:</span>{" "}
                    {formatEventDate(selectedEvent.endsAt)}
                  </div>
                )}
                {selectedEvent.location && (
                  <div className="flex items-center gap-2">
                    <MapPin className="size-4 text-[#9F3B0F]" />
                    <span className="font-bold">สถานที่:</span>{" "}
                    {selectedEvent.location}
                  </div>
                )}
              </div>

              <div className="mt-4">
                <p className="mb-1 text-sm font-semibold text-[#51443A]">
                  สรุปกิจกรรม:
                </p>
                <p className="text-sm leading-6 text-[#51443A]">
                  {selectedEvent.summary}
                </p>
              </div>

              {selectedEvent.description && (
                <div className="mt-4 border-t border-[#EFE5D3] pt-4">
                  <p className="mb-2 text-sm font-semibold text-[#51443A]">
                    รายละเอียดเพิ่มเติม:
                  </p>
                  <div className="whitespace-pre-wrap text-sm leading-relaxed text-[#51443A]">
                    {selectedEvent.description}
                  </div>
                </div>
              )}

              <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-[#EFE5D3] pt-4">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => downloadICS(selectedEvent)}
                    className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-[#E7DCC8] bg-card px-4 py-2.5 text-sm font-semibold text-[#9F3B0F] shadow-sm hover:bg-[#FAF8F5] active:scale-95 transition"
                  >
                    <CalendarPlus className="size-4 text-[#9F3B0F]" />
                    เพิ่มลงปฏิทิน (.ics)
                  </button>
                  {selectedEvent.registrationUrl && (
                    <a
                      href={selectedEvent.registrationUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-[#2D6A2E] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#2D6A2E]"
                    >
                      ลงทะเบียนเข้าร่วม <ExternalLink className="size-3.5" />
                    </a>
                  )}
                </div>
                <button
                  onClick={() => setSelectedEvent(null)}
                  className="min-h-[44px] rounded-xl border border-[#E7DCC8] px-5 py-2.5 text-sm font-semibold text-[#51443A] hover:bg-[#FFF4D6] transition-all duration-200 ease-in-out"
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
