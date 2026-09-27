import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import ErrorBoundary from "./ErrorBoundary";

function ThrowingComponent({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) {
    throw new Error("Test explosion");
  }
  return <div>Normal Content</div>;
}

describe("ErrorBoundary", () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // Suppress expected console.error output from React's internal logging and ErrorBoundary
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it("renders children when no error occurs", () => {
    render(
      <ErrorBoundary>
        <div>Safe Content</div>
      </ErrorBoundary>
    );

    expect(screen.getByText("Safe Content")).toBeInTheDocument();
  });

  it("catches error thrown by children and displays fallback UI", () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>
    );

    // Verify unexpected error heading
    expect(screen.getByText("เกิดข้อผิดพลาดที่ไม่คาดคิด")).toBeInTheDocument();

    // Verify both recovery actions are present: retry (resets the boundary
    // without a full reload) and reload (forces window.location.reload).
    expect(
      screen.getByRole("button", { name: "ลองใหม่" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "โหลดหน้าใหม่" })
    ).toBeInTheDocument();
  });

  it('clears the error and re-renders children when "ลองใหม่" is clicked', () => {
    const { rerender } = render(
      <ErrorBoundary>
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>
    );

    // Swap in non-throwing children first. The boundary's own state.hasError
    // is still true here, so it keeps rendering the fallback UI — React
    // error boundaries don't clear their caught state just because props
    // changed. Only the reset button's setState does that, and once it
    // does, render() picks up these already-updated (safe) children.
    rerender(
      <ErrorBoundary>
        <ThrowingComponent shouldThrow={false} />
      </ErrorBoundary>
    );
    expect(screen.getByText("เกิดข้อผิดพลาดที่ไม่คาดคิด")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "ลองใหม่" }));

    expect(screen.getByText("Normal Content")).toBeInTheDocument();
  });

  it('triggers window.location.reload when "โหลดหน้าใหม่" is clicked', () => {
    const originalLocation = window.location;
    const reloadMock = vi.fn();

    Object.defineProperty(window, "location", {
      configurable: true,
      value: { ...originalLocation, reload: reloadMock },
    });

    render(
      <ErrorBoundary>
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>
    );

    const reloadButton = screen.getByRole("button", { name: "โหลดหน้าใหม่" });
    fireEvent.click(reloadButton);

    expect(reloadMock).toHaveBeenCalledTimes(1);

    Object.defineProperty(window, "location", {
      configurable: true,
      value: originalLocation,
    });
  });
});
