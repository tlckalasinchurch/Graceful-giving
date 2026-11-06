import { CheckCircle2, ChevronRight } from "lucide-react";
import type { TaskItem } from "../taskQueue";

interface TaskQueueProps {
  items: TaskItem[];
  isLoading: boolean;
  onOpen: (href: string) => void;
}

export function TaskQueue({ items, isLoading, onOpen }: TaskQueueProps) {
  if (isLoading && items.length === 0) {
    return (
      <div
        aria-busy="true"
        aria-label="กำลังโหลดงานที่ต้องดำเนินการ"
        className="h-14 rounded-2xl border border-line bg-surface animate-pulse"
      />
    );
  }

  if (items.length === 0) {
    return (
      <div
        role="status"
        className="flex items-center justify-between gap-3 rounded-2xl border border-line/80 bg-surface px-4 py-3 sm:px-5 shadow-xs"
      >
        <div className="flex items-center gap-2.5">
          <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-income/10 text-income">
            <CheckCircle2 className="size-4" aria-hidden="true" />
          </span>
          <p className="text-xs sm:text-sm font-semibold text-ink">
            ไม่มีงานค้างที่ต้องดำเนินการ
          </p>
        </div>
        <span className="text-xs font-medium text-ink-3">สถานะเรียบร้อย</span>
      </div>
    );
  }

  const total = items.reduce((sum, item) => sum + item.count, 0);

  return (
    <section
      aria-label="รายการที่ต้องดำเนินการ"
      className="rounded-3xl border border-line bg-surface p-4 sm:p-5 shadow-xs"
    >
      <div className="flex items-center justify-between px-2 pb-3 pt-1 border-b border-line/60">
        <h2 className="text-sm sm:text-base font-bold text-ink">
          งานที่ต้องดำเนินการ
        </h2>
        <span className="money text-xs sm:text-sm font-semibold text-brand-ink">
          รวม {total} รายการ
        </span>
      </div>
      <ul className="divide-y divide-line/60 pt-1">
        {items.map(item => {
          return (
            <li key={item.kind}>
              <button
                type="button"
                onClick={() => onOpen(item.href)}
                aria-label={`${item.title} ${item.count} รายการ`}
                className="w-full min-h-12 flex items-center gap-3.5 rounded-xl px-2.5 py-2.5 text-left hover:bg-paper transition-colors focus-visible:ring-2 focus-visible:ring-brand"
              >
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-bold text-ink">
                    {item.title}
                  </span>
                  <span className="hidden truncate text-xs text-ink-2 sm:block">
                    {item.description}
                  </span>
                </span>
                <span
                  aria-hidden="true"
                  className="money flex size-7 shrink-0 items-center justify-center rounded-full bg-brand/10 text-xs font-bold text-brand-ink"
                >
                  {item.count}
                </span>
                <ChevronRight
                  className="size-4 shrink-0 text-ink-3"
                  aria-hidden="true"
                />
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
