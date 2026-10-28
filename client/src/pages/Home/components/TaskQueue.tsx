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
        className="h-20 rounded-3xl border border-[#F9D2AE] bg-[#FFFBF2] animate-pulse"
      />
    );
  }

  if (items.length === 0) {
    return (
      <div
        role="status"
        className="flex items-center gap-3 p-4 rounded-3xl bg-white border border-[#E7DCC8]/90 text-[#1F5C33] fintech-card"
      >
        <CheckCircle2 className="w-5 h-5 shrink-0" aria-hidden="true" />
        <p className="text-sm font-bold">ไม่มีงานค้างที่ต้องดำเนินการ</p>
      </div>
    );
  }

  return (
    <section
      aria-label="รายการที่ต้องดำเนินการ"
      className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-[#FFFBF2] to-white border border-[#F9D2AE] text-[#51443A] shadow-xs fintech-card space-y-3"
    >
      <h2 className="text-sm font-bold text-[#171311]">งานที่ต้องดำเนินการ</h2>
      <ul className="space-y-2">
        {items.map(item => {
          const Icon = TASK_ICONS[item.kind];
          return (
            <li key={item.kind}>
              <button
                type="button"
                onClick={() => onOpen(item.href)}
                aria-label={`${item.title} ${item.count} รายการ`}
                className="w-full min-h-14 flex items-center gap-3.5 p-3 rounded-2xl bg-white hover:bg-[#FFF8EA] border border-[#E7DCC8] text-left transition-all active:scale-[0.99] focus-visible:ring-2 focus-visible:ring-[#C94F16]"
              >
                <span className="size-11 rounded-2xl bg-gradient-to-tr from-[#FFF4D6] to-white border border-[#F9D2AE] flex items-center justify-center text-[#C94F16] shrink-0">
                  <Icon className="w-5 h-5" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-bold text-sm text-[#171311]">
                    {item.title}
                  </span>
                  <span className="block text-xs text-[#51443A] truncate">
                    {item.description}
                  </span>
                </span>
                <span
                  aria-hidden="true"
                  className="min-w-7 h-7 px-2 rounded-full bg-[#C94F16] text-white text-xs font-bold tabular-nums flex items-center justify-center shrink-0"
                >
                  {item.count}
                </span>
                <ChevronRight
                  className="w-4 h-4 text-[#807266] shrink-0"
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
