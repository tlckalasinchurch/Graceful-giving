// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ThemeProvider } from "./ThemeContext";
import { ThemeToggle } from "@/components/layout/AppNavigation";

beforeEach(() => {
  localStorage.clear();
  document.documentElement.className = "";
  document.head.innerHTML = '<meta name="theme-color" content="#F8F9F4">';
});
afterEach(cleanup);

const mount = () =>
  render(
    <ThemeProvider defaultTheme="light" switchable>
      <ThemeToggle />
    </ThemeProvider>
  );

describe("ThemeContext", () => {
  it("falls back to light for an invalid stored value", () => {
    localStorage.setItem("theme", "neon");
    mount();
    expect(document.documentElement.classList.contains("dark")).toBe(false);
    expect(localStorage.getItem("theme")).toBe("light");
  });

  it("toggle switches dark/light and persists", () => {
    mount();
    fireEvent.click(screen.getByRole("button", { name: "เปลี่ยนเป็นโหมดมืด" }));
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(localStorage.getItem("theme")).toBe("dark");
    fireEvent.click(
      screen.getByRole("button", { name: "เปลี่ยนเป็นโหมดสว่าง" })
    );
    expect(document.documentElement.classList.contains("dark")).toBe(false);
    expect(localStorage.getItem("theme")).toBe("light");
  });
});
