import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TaskQueue } from "./TaskQueue";
import type { TaskItem } from "../taskQueue";

const items: TaskItem[] = [
  {
    kind: "slips",
    title: "สลิปถวายรอตรวจสอบ",
    description: "รอตรวจสอบ",
    count: 3,
    href: "/giving/inbox",
  },
  {
    kind: "withdrawals",
    title: "คำขอเบิกเงินรออนุมัติ",
    description: "รออนุมัติ",
    count: 1,
    href: "/approvals",
  },
];

describe("TaskQueue", () => {
  it("renders one button per task with the count in its label", () => {
    render(<TaskQueue items={items} isLoading={false} onOpen={() => {}} />);
    expect(
      screen.getByRole("button", { name: "สลิปถวายรอตรวจสอบ 3 รายการ" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "คำขอเบิกเงินรออนุมัติ 1 รายการ" })
    ).toBeInTheDocument();
  });

  it("opens the task route when a row is pressed", () => {
    const onOpen = vi.fn();
    render(<TaskQueue items={items} isLoading={false} onOpen={onOpen} />);
    fireEvent.click(
      screen.getByRole("button", { name: "คำขอเบิกเงินรออนุมัติ 1 รายการ" })
    );
    expect(onOpen).toHaveBeenCalledWith("/approvals");
  });

  it("shows a calm empty state when nothing is waiting", () => {
    render(<TaskQueue items={[]} isLoading={false} onOpen={() => {}} />);
    expect(screen.getByRole("status")).toHaveTextContent(
      "ไม่มีงานค้างที่ต้องดำเนินการ"
    );
  });

  it("shows a loading placeholder instead of the empty state while loading", () => {
    render(<TaskQueue items={[]} isLoading onOpen={() => {}} />);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(
      screen.getByLabelText("กำลังโหลดงานที่ต้องดำเนินการ")
    ).toHaveAttribute("aria-busy", "true");
  });
});
