import { describe, expect, it } from "vitest";
import { getNavGroup } from "./AppNavigation";

describe("getNavGroup", () => {
  it("labels a top-level page with its group", () => {
    expect(getNavGroup("/expenses")).toBe("การเงิน");
    expect(getNavGroup("/")).toBe("ภาพรวม");
  });

  it("labels a sub-page with the group of its parent page", () => {
    expect(getNavGroup("/expenses/new")).toBe("การเงิน");
    expect(getNavGroup("/funds/12")).toBe("วางแผนและควบคุม");
    expect(getNavGroup("/withdrawals/new")).toBe("วางแผนและควบคุม");
    expect(getNavGroup("/notifications")).toBe("บัญชีผู้ใช้");
  });

  it("does not match a path that only shares a prefix", () => {
    expect(getNavGroup("/expensesX")).toBe("เมนู");
  });
});
