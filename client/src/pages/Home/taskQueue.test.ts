import { describe, expect, it } from "vitest";
import { buildTaskItems } from "./taskQueue";

const none = {
  slipsToReview: undefined,
  pendingWithdrawals: undefined,
  countingStatuses: undefined,
};

describe("pending approvals row", () => {
  it("adds a row that opens the roles tab when people wait", () => {
    expect(
      buildTaskItems({
        slipsToReview: undefined,
        pendingWithdrawals: undefined,
        countingStatuses: undefined,
        pendingApprovals: 2,
      })
    ).toEqual([
      {
        kind: "approvals",
        title: "ผู้ใช้รออนุมัติเข้าระบบ",
        description: "เข้าสู่ระบบด้วย LINE แล้ว รอคุณกำหนดบทบาทหรืออนุมัติ",
        count: 2,
        href: "/settings?tab=roles",
      },
    ]);
  });

  it("adds no row for zero or for a role that cannot approve", () => {
    for (const pendingApprovals of [0, undefined]) {
      expect(
        buildTaskItems({
          slipsToReview: undefined,
          pendingWithdrawals: undefined,
          countingStatuses: undefined,
          pendingApprovals,
        })
      ).toEqual([]);
    }
  });
});

describe("buildTaskItems", () => {
  it("returns no rows when the role has no task source", () => {
    expect(buildTaskItems(none)).toEqual([]);
  });

  it("returns no rows when every source is empty", () => {
    expect(
      buildTaskItems({
        slipsToReview: 0,
        pendingWithdrawals: 0,
        countingStatuses: ["posted", "closed"],
      })
    ).toEqual([]);
  });

  it("lists slips, withdrawals and counting in that order", () => {
    const items = buildTaskItems({
      slipsToReview: 4,
      pendingWithdrawals: 2,
      countingStatuses: ["counted"],
    });
    expect(items.map(i => i.kind)).toEqual([
      "slips",
      "withdrawals",
      "counting",
    ]);
    expect(items.map(i => i.href)).toEqual([
      "/giving/inbox",
      "/approvals",
      "/counting",
    ]);
    expect(items.map(i => i.count)).toEqual([4, 2, 1]);
  });

  it("counts only unfinished counting sessions and describes each stage", () => {
    const [item] = buildTaskItems({
      ...none,
      countingStatuses: [
        "counting",
        "counted",
        "counted",
        "verified",
        "posted",
        "closed",
      ],
    });
    expect(item.count).toBe(4);
    expect(item.description).toBe("กำลังนับ 1 · รอตรวจทาน 2 · รอลงบัญชี 1");
  });

  it("omits a counting stage that has no sessions", () => {
    const [item] = buildTaskItems({ ...none, countingStatuses: ["verified"] });
    expect(item.description).toBe("รอลงบัญชี 1");
  });
});
