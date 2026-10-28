import {
  Calculator,
  CheckCircle2,
  ChevronRight,
  Inbox,
  Wallet,
} from "lucide-react";
import type { TaskItem, TaskKind } from "../taskQueue";

const TASK_ICONS: Record<TaskKind, typeof Inbox> = {
  slips: Inbox,
  withdrawals: Wallet,
  counting: Calculator,
};

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
        className="h-[72px] rounded-3xl bg-surface fintech-card animate-pulse"
      />
    );
  }

  if (items.length === 0) {
    return (
      <div
        role="status"
        className="flex items-center gap-3 rounded-3xl bg-surface px-5 py-4 fintech-card"
      >
        <span className="size-9 shrink-0 rounded-full bg-tile-mint text-tile-mint-ink flex items-center justify-center">
          <CheckCircle2 className="size-5" aria-hidden="true" />
        </span>
        <p className="text-sm font-medium text-ink">
          ไม่มีงานค้างที่ต้องดำเนินการ
        </p>
      </div>
    );
  }

  const total = items.reduce((sum, item) => sum + item.count, 0);

  return (
    <section
      aria-label="รายการที่ต้องดำเนินการ"
      className="rounded-3xl bg-surface p-2 sm:p-3 fintech-card"
    >
      <div className="flex items-baseline justify-between px-3 pb-1 pt-2">
        <h2 className="text-base font-semibold text-ink">
          งานที่ต้องดำเนินการ
        </h2>
        <span className="text-sm text-ink-2">รวม {total} รายการ</span>
      </div>
      <ul className="divide-y divide-line">
        {items.map(item => {
          const Icon = TASK_ICONS[item.kind];
          return (
            <li key={item.kind}>
              <button
                type="button"
                onClick={() => onOpen(item.href)}
                aria-label={`${item.title} ${item.count} รายการ`}
                className="w-full min-h-16 flex items-center gap-3.5 rounded-2xl px-3 py-3 text-left hover:bg-ground focus-visible:ring-2 focus-visible:ring-brand"
              >
                <span className="size-11 shrink-0 rounded-2xl bg-tile-peach text-tile-peach-ink flex items-center justify-center">
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm sm:text-base font-semibold text-ink">
                    {item.title}
                  </span>
                  <span className="block truncate text-xs sm:text-sm text-ink-2">
                    {item.description}
                  </span>
                </span>
                <span
                  aria-hidden="true"
                  className="money min-w-8 h-8 px-2.5 shrink-0 rounded-full bg-tile-peach text-sm font-semibold text-tile-peach-ink flex items-center justify-center"
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
