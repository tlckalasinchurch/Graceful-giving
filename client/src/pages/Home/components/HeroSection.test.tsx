import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { HeroSection } from "./HeroSection";
import {
  DAILY_SCRIPTURES,
  getDailyScripture,
  getGreeting,
} from "./dailyContent";

// 1 January 09:00: day 0 of the year, so the first verse, and morning.
const JAN_1_MORNING = new Date(2026, 0, 1, 9, 0);

describe("HeroSection", () => {
  it("renders the hero section with proper accessibility label", () => {
    render(<HeroSection now={JAN_1_MORNING} />);

    const section = screen.getByRole("region", {
      name: "Grace-giving ส่วนต้อนรับ",
    });
    expect(section).toBeInTheDocument();
  });

  it("renders the brand title and tagline", () => {
    render(<HeroSection now={JAN_1_MORNING} />);

    expect(screen.getByText("Grace")).toBeInTheDocument();
    expect(screen.getByText("Ledger")).toBeInTheDocument();
    expect(
      screen.getByText("การเงินเชื่อมใจ เพื่อพันธกิจของพระเจ้า")
    ).toBeInTheDocument();
  });

  it("renders the scripture quote badge", () => {
    render(<HeroSection now={JAN_1_MORNING} />);

    expect(screen.getByText("2 โครินธ์ 9:7")).toBeInTheDocument();
    expect(
      screen.getByText("“ผู้ให้ด้วยใจยินดี พระเจ้าทรงรัก”")
    ).toBeInTheDocument();
  });

  it("renders the hero illustration with correct alt text", () => {
    render(<HeroSection now={JAN_1_MORNING} />);

    const img = screen.getByAltText("พระเยซูคริสต์และลูกแกะ");
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute(
      "src",
      "/illustrations/hero_jesus_shepherd.jpg"
    );
    expect(screen.getByText("พระเยซูผู้เลี้ยงที่ดี ♥")).toBeInTheDocument();
  });

  it("greets by time of day and includes the name", () => {
    render(<HeroSection now={JAN_1_MORNING} name="สมชาย" />);
    expect(screen.getByText("Good morning")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "อรุณสวัสดิ์, สมชาย" })
    ).toBeInTheDocument();
  });
});

describe("dailyContent", () => {
  it("picks the greeting by hour", () => {
    expect(getGreeting(new Date(2026, 0, 1, 5)).thai).toBe("อรุณสวัสดิ์");
    expect(getGreeting(new Date(2026, 0, 1, 12)).thai).toBe("สวัสดีตอนบ่าย");
    expect(getGreeting(new Date(2026, 0, 1, 17)).thai).toBe("สวัสดีตอนค่ำ");
    expect(getGreeting(new Date(2026, 0, 1, 4)).thai).toBe("สวัสดีตอนค่ำ");
  });

  it("keeps one verse per day and moves to the next verse the next day", () => {
    const morning = getDailyScripture(new Date(2026, 2, 3, 6));
    const night = getDailyScripture(new Date(2026, 2, 3, 23));
    expect(night).toBe(morning);
    const i = DAILY_SCRIPTURES.indexOf(morning);
    const next = getDailyScripture(new Date(2026, 2, 4, 6));
    expect(DAILY_SCRIPTURES.indexOf(next)).toBe(
      (i + 1) % DAILY_SCRIPTURES.length
    );
  });
});
