import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useDebouncedValue } from "./useDebouncedValue";

describe("useDebouncedValue", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("returns the initial value immediately", () => {
    const { result } = renderHook(() => useDebouncedValue("a", 300));
    expect(result.current).toBe("a");
  });

  it("updates only after the delay has passed", () => {
    const { result, rerender } = renderHook(
      ({ v }) => useDebouncedValue(v, 300),
      { initialProps: { v: "a" } }
    );
    rerender({ v: "b" });
    act(() => vi.advanceTimersByTime(299));
    expect(result.current).toBe("a");
    act(() => vi.advanceTimersByTime(1));
    expect(result.current).toBe("b");
  });

  it("collapses rapid changes into the last value", () => {
    const { result, rerender } = renderHook(
      ({ v }) => useDebouncedValue(v, 300),
      { initialProps: { v: "" } }
    );
    for (const v of ["a", "ab", "abc"]) {
      rerender({ v });
      act(() => vi.advanceTimersByTime(100));
    }
    expect(result.current).toBe("");
    act(() => vi.advanceTimersByTime(300));
    expect(result.current).toBe("abc");
  });

  it("propagates a cleared value after the delay", () => {
    const { result, rerender } = renderHook(
      ({ v }) => useDebouncedValue(v, 300),
      { initialProps: { v: "abc" } }
    );
    rerender({ v: "" });
    act(() => vi.advanceTimersByTime(300));
    expect(result.current).toBe("");
  });
});
