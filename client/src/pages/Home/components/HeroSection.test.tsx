import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { HeroSection } from "./HeroSection";

describe("HeroSection", () => {
  it("renders the hero section with proper accessibility label", () => {
    render(<HeroSection />);

    const section = screen.getByRole("region", {
      name: "Grace Giving ส่วนต้อนรับ",
    });
    expect(section).toBeInTheDocument();
  });

  it("renders the brand title and tagline", () => {
    render(<HeroSection />);

    expect(screen.getByText("Grace")).toBeInTheDocument();
    expect(screen.getByText("Giving")).toBeInTheDocument();
    expect(
      screen.getByText("การเงินเชื่อมใจ เพื่อพันธกิจของพระเจ้า")
    ).toBeInTheDocument();
  });

  it("leaves the scripture verse to the sign-in page", () => {
    render(<HeroSection />);

    expect(screen.queryByText("2 โครินธ์ 9:7")).toBeNull();
  });

  it("shows no decorative picture", () => {
    render(<HeroSection />);
    expect(screen.queryByRole("img")).toBeNull();
  });
});
