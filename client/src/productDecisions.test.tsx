import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/layout/AppNavigation", () => ({
  AppMenu: ({ children }: any) => <>{children}</>,
}));

import { SecondaryMenu } from "./pages/Home/components/SecondaryMenu";
import { BalanceCard } from "./pages/Home/components/BalanceCard";

const SRC = __dirname;
function files(dir: string): string[] {
  return readdirSync(dir).flatMap(n => {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) return files(p);
    return /\.(tsx?|css)$/.test(n) && !/\.test\./.test(n) ? [p] : [];
  });
}

describe("profile: no placeholder credential", () => {
  const profile = readFileSync(join(SRC, "pages/Profile.tsx"), "utf8");

  it("does not draw a QR code or invent a member number", () => {
    expect(profile).not.toMatch(/QrCode/);
    expect(profile).not.toMatch(/GL-/);
    expect(profile).not.toMatch(/Digital Church Member Card/);
    expect(profile).not.toMatch(/ยืนยันแล้ว \(Active\)/);
  });

  it("loads no image from a third-party host", () => {
    const hits = files(SRC).filter(f =>
      /images\.unsplash\.com/.test(readFileSync(f, "utf8"))
    );
    expect(hits).toEqual([]);
  });

  it("ships every preset avatar as a local file", () => {
    const urls = profile.match(/"\/avatars\/[^"]+\.svg"/g) ?? [];
    expect(urls).toHaveLength(4);
    for (const u of urls) {
      expect(existsSync(join(SRC, "..", "public", u.replace(/"/g, "")))).toBe(
        true
      );
    }
  });
});

describe("home shortcuts", () => {
  it("does not repeat Reports: the balance card is the one way in from Home", () => {
    render(
      <SecondaryMenu
        canOpenMembers
        canOpenGivingGuide
        onOpenMembers={vi.fn()}
        onOpenNews={vi.fn()}
        onOpenWithdrawals={vi.fn()}
        onOpenGivingGuide={vi.fn()}
      />
    );
    expect(screen.queryByRole("button", { name: "รายงาน" })).toBeNull();
    expect(screen.getByRole("button", { name: "สมาชิก" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "ขอเบิกเงิน" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "ขั้นตอนการถวาย" })).toBeTruthy();
  });

  it("the balance card button says it opens the report, and calls the handler", () => {
    const open = vi.fn();
    render(
      <BalanceCard
        showBalance
        setShowBalance={vi.fn()}
        isPositiveBalance
        isBalanceLoading={false}
        isDataUnavailable={false}
        summaryError={null}
        hasSummaryData
        animatedBalance={1000}
        canOpenReports
        onOpenReports={open}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: /ดูรายงาน/ }));
    expect(open).toHaveBeenCalledTimes(1);
  });

  it("hides the report button from a role that cannot open Reports", () => {
    render(
      <BalanceCard
        showBalance
        setShowBalance={vi.fn()}
        isPositiveBalance
        isBalanceLoading={false}
        isDataUnavailable={false}
        summaryError={null}
        hasSummaryData
        animatedBalance={1000}
        canOpenReports={false}
        onOpenReports={vi.fn()}
      />
    );
    expect(screen.queryByRole("button", { name: /ดูรายงาน/ })).toBeNull();
  });
});
