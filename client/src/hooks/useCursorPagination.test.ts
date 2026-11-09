import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useCursorPagination } from "./useCursorPagination";

type C = { id: number };

describe("useCursorPagination", () => {
  it("starts on page 1 with no cursor", () => {
    const { result } = renderHook(() => useCursorPagination<C>(["a"]));
    expect(result.current.cursor).toBeNull();
    expect(result.current.pageIndex).toBe(0);
    expect(result.current.hasPrev).toBe(false);
  });

  it("moves forward with the cursor from the server and back to the earlier one", () => {
    const { result } = renderHook(() => useCursorPagination<C>(["a"]));
    act(() => result.current.next({ id: 50 }));
    expect(result.current.cursor).toEqual({ id: 50 });
    expect(result.current.pageIndex).toBe(1);
    act(() => result.current.next({ id: 100 }));
    expect(result.current.pageIndex).toBe(2);
    act(() => result.current.prev());
    expect(result.current.cursor).toEqual({ id: 50 });
    act(() => result.current.prev());
    expect(result.current.cursor).toBeNull();
    expect(result.current.hasPrev).toBe(false);
  });

  it("ignores next with no cursor and prev on the first page", () => {
    const { result } = renderHook(() => useCursorPagination<C>(["a"]));
    act(() => result.current.next(null));
    act(() => result.current.prev());
    expect(result.current.pageIndex).toBe(0);
  });

  it("goes back to page 1 in the same render when a filter changes", () => {
    const seen: Array<C | null> = [];
    const { result, rerender } = renderHook(
      ({ filter }) => {
        const p = useCursorPagination<C>([filter]);
        seen.push(p.cursor);
        return p;
      },
      { initialProps: { filter: "all" } }
    );
    act(() => result.current.next({ id: 50 }));
    seen.length = 0;
    rerender({ filter: "tithe" });
    // The new filter is never rendered with the old cursor.
    expect(seen).not.toContainEqual({ id: 50 });
    expect(result.current.cursor).toBeNull();
    expect(result.current.pageIndex).toBe(0);
  });
});
