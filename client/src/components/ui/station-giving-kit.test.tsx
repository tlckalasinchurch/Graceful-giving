import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  StationCountdownCard,
  StationOfferingPackageCard,
  StationQrPoster,
} from "./station-giving-kit";

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

describe("StationCountdownCard", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("counts down and calls onExpire once at zero", () => {
    const onExpire = vi.fn();
    render(<StationCountdownCard initialSeconds={5} onExpire={onExpire} />);
    expect(screen.getByRole("timer").textContent).toBe("00:05");

    act(() => {
      vi.advanceTimersByTime(4000);
    });
    expect(screen.getByRole("timer").textContent).toBe("00:01");
    expect(onExpire).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(10_000);
    });
    expect(screen.getByRole("timer").textContent).toBe("00:00");
    expect(onExpire).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("status").textContent).toBe("หมดเวลาแล้ว");
  });

  it("lets the person restart the clock only maxExtensions times", () => {
    render(<StationCountdownCard initialSeconds={100} maxExtensions={1} />);
    act(() => {
      vi.advanceTimersByTime(30_000);
    });
    fireEvent.click(screen.getByRole("button", { name: /ต่อเวลา/ }));
    expect(screen.getByRole("timer").textContent).toBe("01:40");

    act(() => {
      vi.advanceTimersByTime(30_000);
    });
    expect(screen.queryByRole("button", { name: /ต่อเวลา/ })).toBeNull();
  });

  it("warns when under a minute is left", () => {
    render(<StationCountdownCard initialSeconds={90} />);
    expect(screen.getByRole("status").textContent).toBe("");
    act(() => {
      vi.advanceTimersByTime(31_000);
    });
    expect(screen.getByRole("status").textContent).toContain("น้อยกว่า 1 นาที");
  });

  it("stops its timer when it unmounts", () => {
    const { unmount } = render(<StationCountdownCard initialSeconds={5} />);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});

describe("StationOfferingPackageCard", () => {
  it("marks the chosen preset as pressed and names its group", () => {
    render(
      <StationOfferingPackageCard
        title="สิบลด"
        amountThb={500}
        presetAmounts={[500, 1000]}
        onSelectAmount={() => {}}
      />
    );
    expect(screen.getByRole("group", { name: "สิบลด" })).toBeTruthy();
    expect(
      screen
        .getByRole("button", { name: "500 THB" })
        .getAttribute("aria-pressed")
    ).toBe("true");
    expect(
      screen
        .getByRole("button", { name: "1,000 THB" })
        .getAttribute("aria-pressed")
    ).toBe("false");
    expect(
      screen.getByRole("button", { name: "ดูสรุปการถวาย: สิบลด" })
    ).toBeTruthy();
  });
});
