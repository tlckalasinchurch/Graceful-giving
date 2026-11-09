import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mutationOptions: Record<string, any> = {};
const refetch = vi.fn();
let listState: any = { data: undefined, isLoading: false, error: null };
const toastError = vi.fn();

vi.mock("sonner", () => ({
  toast: { error: (...a: unknown[]) => toastError(...a), success: vi.fn() },
}));
vi.mock("@/lib/trpc", () => {
  const mutation = (name: string) => ({
    useMutation: (opts: any) => {
      mutationOptions[name] = opts;
      return { mutate: vi.fn(), isPending: false };
    },
  });
  return {
    trpc: {
      useUtils: () => ({
        updates: {
          adminList: { invalidate: vi.fn() },
          feed: { invalidate: vi.fn() },
        },
      }),
      updates: {
        adminList: { useQuery: () => ({ ...listState, refetch }) },
        createNews: mutation("createNews"),
        createEvent: mutation("createEvent"),
        updateNews: mutation("updateNews"),
        updateEvent: mutation("updateEvent"),
        setNewsStatus: mutation("setNewsStatus"),
        setEventStatus: mutation("setEventStatus"),
        deleteNews: mutation("deleteNews"),
        deleteEvent: mutation("deleteEvent"),
      },
    },
  };
});

import { AdminManager } from "./AdminManager";

const NAMES = [
  "createNews",
  "createEvent",
  "updateNews",
  "updateEvent",
  "setNewsStatus",
  "setEventStatus",
  "deleteNews",
  "deleteEvent",
];

describe("AdminManager error handling", () => {
  beforeEach(() => {
    toastError.mockClear();
    refetch.mockClear();
    listState = { data: undefined, isLoading: false, error: null };
  });

  it.each(NAMES)("%s tells the admin when the request fails", name => {
    render(<AdminManager />);
    expect(typeof mutationOptions[name].onError).toBe("function");
    mutationOptions[name].onError(new Error("Failed to fetch"));
    expect(toastError).toHaveBeenCalledTimes(1);
  });

  it("shows an error state with retry when the list fails to load", () => {
    listState = { data: undefined, isLoading: false, error: new Error("x") };
    render(<AdminManager />);
    expect(screen.getByRole("alert")).toBeTruthy();
    screen.getByRole("button", { name: "ลองใหม่" }).click();
    expect(refetch).toHaveBeenCalledTimes(1);
    expect(screen.queryByText("ข่าวสารทั้งหมด")).toBeNull();
  });

  it("shows the lists when loading succeeds", () => {
    listState = {
      data: { news: [], events: [] },
      isLoading: false,
      error: null,
    };
    render(<AdminManager />);
    expect(screen.getByText("ข่าวสารทั้งหมด")).toBeTruthy();
    expect(screen.queryByRole("alert")).toBeNull();
  });
});
