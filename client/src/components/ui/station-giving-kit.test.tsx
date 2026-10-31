import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StationQrPoster } from "./station-giving-kit";

describe("StationQrPoster", () => {
  it("renders a real QR code for the link, not a seeded pattern", () => {
    const { container, rerender } = render(
      <StationQrPoster qrValue="https://example.org/giving/station" />
    );
    const svg = container.querySelector("svg[viewBox]:not([aria-hidden])");
    expect(svg).not.toBeNull();
    expect(screen.getByTitle("QR Code สำหรับถวายทรัพย์")).toBeTruthy();
    const first = svg!.innerHTML;

    // A different link must produce a different code.
    rerender(<StationQrPoster qrValue="https://example.org/other" />);
    const second = container.querySelector(
      "svg[viewBox]:not([aria-hidden])"
    )!.innerHTML;
    expect(second).not.toBe(first);
  });

  it("shows a placeholder, not a fake QR, when there is no link", () => {
    render(<StationQrPoster qrValue="  " />);
    expect(screen.getByLabelText("ยังไม่ได้ตั้งค่า QR Code")).toBeTruthy();
  });

  it("shows an uploaded QR image instead of generating one", () => {
    render(<StationQrPoster customQrImageUrl="data:image/png;base64,AAAA" />);
    expect(screen.getByAltText("QR Code สำหรับถวายทรัพย์")).toBeTruthy();
  });

  it("keeps background colors when printed", () => {
    const { container } = render(<StationQrPoster />);
    expect((container.firstChild as HTMLElement).className).toContain(
      "print-color-adjust:exact"
    );
  });
});
