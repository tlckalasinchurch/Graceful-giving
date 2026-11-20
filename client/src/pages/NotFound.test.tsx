import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("wouter", () => ({
  useLocation: () => ["/nope", vi.fn()],
  Link: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

import NotFound from "./NotFound";

describe("NotFound page", () => {
  it("mounts with the 404 heading and a way back home", () => {
    render(<NotFound />);
    expect(screen.getByText("404")).toBeTruthy();
    expect(
      screen.getByRole("heading", { name: "ไม่พบหน้าที่คุณต้องการ" })
    ).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "กลับหน้าหลัก" })
    ).toBeTruthy();
    expect(
      screen.getByRole("link", { name: /ข่าวสาร & กิจกรรม/ })
    ).toHaveAttribute("href", "/updates");
  });
});
