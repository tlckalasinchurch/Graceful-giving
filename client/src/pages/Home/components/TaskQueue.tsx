import { ChevronRight } from "lucide-react";
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
        className="h-[72px] rounded-3xl border border-line bg-surface animate-pulse"
      />
    );
  }

  if (items.length === 0) {
    return (
      <div
        role="status"
        className="rounded-3xl border border-line bg-surface px-5 py-4"
      >
        <p className="text-sm font-bold text-ink">
          ไม่มีงานค้างที่ต้องดำเนินการ
        </p>
      </div>
    );
  }

  const total = items.reduce((sum, item) => sum + item.count, 0);

  return (
    <section
      aria-label="รายการที่ต้องดำเนินการ"
      className="rounded-3xl border border-line bg-surface p-3 sm:p-4"
    >
      <div className="flex items-center justify-between px-3 pb-2 pt-1">
        <h2 className="text-base font-bold text-ink">งานที่ต้องดำเนินการ</h2>
        <span className="money text-sm text-ink-2">รวม {total} รายการ</span>
      </div>
      <ul className="divide-y divide-line/60">
        {items.map(item => {
          return (
            <li key={item.kind}>
              <button
                type="button"
                onClick={() => onOpen(item.href)}
                aria-label={`${item.title} ${item.count} รายการ`}
                className="w-full min-h-14 flex items-center gap-3.5 rounded-2xl px-3 py-3 text-left hover:bg-paper transition-colors focus-visible:ring-2 focus-visible:ring-brand"
              >
                <span className="min-w-0 flex-1">
                  <span className="block text-sm sm:text-base font-bold text-ink">
                    {item.title}
                  </span>
                  <span className="hidden truncate text-xs text-ink-2 sm:block sm:text-sm">
                    {item.description}
                  </span>
                </span>
                <span
                  aria-hidden="true"
                  className="money w-8 shrink-0 text-right text-lg font-semibold text-brand-ink"
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
