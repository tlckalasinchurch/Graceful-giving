export type TaskKind = "slips" | "withdrawals" | "counting";

export interface TaskItem {
  kind: TaskKind;
  title: string;
  description: string;
  count: number;
  href: string;
}

export interface TaskQueueInput {
  /** Slips waiting for review. `undefined` = the role cannot see this source. */
  slipsToReview: number | undefined;
  /** Withdrawal requests with status "pending". */
  pendingWithdrawals: number | undefined;
  /** Status of every counting session. */
  countingStatuses: readonly string[] | undefined;
}

const COUNTING_OPEN_LABELS = [
  ["counting", "กำลังนับ"],
  ["counted", "รอตรวจทาน"],
  ["verified", "รอลงบัญชี"],
] as const;

function describeCounting(statuses: readonly string[]) {
  return COUNTING_OPEN_LABELS.map(
    ([status, label]) =>
      [label, statuses.filter(s => s === status).length] as const
  )
    .filter(([, count]) => count > 0)
    .map(([label, count]) => `${label} ${count}`)
    .join(" · ");
}

/** Builds the to-do rows. A source with nothing waiting adds no row. */
export function buildTaskItems(input: TaskQueueInput): TaskItem[] {
  const items: TaskItem[] = [];

  if (input.slipsToReview && input.slipsToReview > 0) {
    items.push({
      kind: "slips",
      title: "สลิปถวายรอตรวจสอบ",
      description: "สลิปจาก LINE Official Account รอตรวจสอบและบันทึกบัญชี",
      count: input.slipsToReview,
      href: "/giving/inbox",
    });
  }

  if (input.pendingWithdrawals && input.pendingWithdrawals > 0) {
    items.push({
      kind: "withdrawals",
      title: "คำขอเบิกเงินรออนุมัติ",
      description: "ตรวจสอบวัตถุประสงค์ แล้วอนุมัติหรือปฏิเสธคำขอ",
      count: input.pendingWithdrawals,
      href: "/approvals",
    });
  }

  if (input.countingStatuses) {
    const open = input.countingStatuses.filter(s =>
      COUNTING_OPEN_LABELS.some(([status]) => status === s)
    );
    if (open.length > 0) {
      items.push({
        kind: "counting",
        title: "รอบนับเงินถวายที่ยังไม่เสร็จ",
        description: describeCounting(open),
        count: open.length,
        href: "/counting",
      });
    }
  }

  return items;
}
