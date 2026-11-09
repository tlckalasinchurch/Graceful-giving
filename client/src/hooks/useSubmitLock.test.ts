import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useSubmitLock } from "./useSubmitLock";

describe("useSubmitLock", () => {
  it("lets the first caller in and blocks a second one in the same instant", () => {
    const { result } = renderHook(() => useSubmitLock());
    expect(result.current.lock()).toBe(true);
    expect(result.current.lock()).toBe(false);
  });

  it("lets a new submit in after the request ends", () => {
    const { result } = renderHook(() => useSubmitLock());
    result.current.lock();
    result.current.unlock();
    expect(result.current.lock()).toBe(true);
  });
});
