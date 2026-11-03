import { ChevronRight } from "lucide-react";
import type { TaskItem } from "../taskQueue";

interface TaskQueueProps {
  items: TaskItem[];
  isLoading: boolean;
  onOpen: (href: string) => void;
}

const FRAME = "rounded-2xl border border-line bg-surface";

export function TaskQueue({ items, isLoading, onOpen }: TaskQueueProps) {
  if (isLoading && items.length === 0) {
    return (
      <div
        aria-busy="true"
        aria-label="กำลังโหลดงานที่ต้องดำเนินการ"
        className={`${FRAME} h-[132px]`}
      />
    );
  }

  if (items.length === 0) {
    return (
      <div role="status" className={`${FRAME} px-5 py-4`}>
        <p className="text-sm font-medium text-ink">
          ไม่มีงานค้างที่ต้องดำเนินการ
        </p>
        <p className="mt-0.5 text-xs text-ink-3">
          สลิป คำขอเบิก และการนับที่รอคุณจะแสดงที่นี่
        </p>
      </div>
    );
  }

  const total = items.reduce((sum, item) => sum + item.count, 0);

  return (
    <section aria-label="รายการที่ต้องดำเนินการ" className={FRAME}>
      <div className="flex items-baseline justify-between gap-3 px-5 pt-4">
        <h2 className="text-base font-semibold text-ink">
          งานที่ต้องดำเนินการ
        </h2>
        <span className="money text-sm text-ink-2">รวม {total}</span>
      </div>
      <ul className="mt-1 pb-2">
        {items.map(item => (
          <li key={item.kind} className="border-t border-line first:border-t-0">
            <button
              type="button"
              onClick={() => onOpen(item.href)}
              aria-label={`${item.title} ${item.count} รายการ`}
              className="flex min-h-14 w-full items-center gap-3 px-5 py-2.5 text-left hover:bg-paper"
            >
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-ink">
                  {item.title}
                </span>
                <span className="block truncate text-xs text-ink-3">
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
        ))}
      </ul>
    </section>
  );
}
