import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const day = "2026-11-01T00:00:00.000Z";
const sessions = [
  {
    id: 1,
    serviceDate: day,
    serviceRound: 1,
    status: "counting",
    notes: "รอบเช้า",
    varianceNote: null,
    createdAt: day,
  },
  {
    id: 2,
    serviceDate: "2026-10-25T00:00:00.000Z",
    serviceRound: 1,
    status: "posted",
    notes: null,
    varianceNote: "ขาด 10 บาท",
    createdAt: day,
  },
  {
    id: 3,
    serviceDate: "2026-10-18T00:00:00.000Z",
    serviceRound: 1,
    status: "closed",
    notes: null,
    varianceNote: null,
    createdAt: day,
  },
];

vi.mock("@/lib/trpc", () => {
  const mutation = {
    useMutation: () => ({ mutate: vi.fn(), isPending: false }),
  };
  return {
    trpc: {
      useUtils: () => ({ counting: { list: { invalidate: vi.fn() } } }),
      counting: {
        list: {
          useQuery: () => ({
            data: sessions,
            isLoading: false,
            isError: false,
          }),
        },
        create: mutation,
        deleteSession: mutation,
        resetSession: mutation,
      },
    },
  };
});
vi.mock("@/components/layout/AppLayout", () => ({
  AppLayout: ({ children, action }: any) => (
    <div>
      {action}
      {children}
    </div>
  ),
}));
vi.mock("wouter", () => ({ useLocation: () => ["/counting", vi.fn()] }));
vi.mock("@/lib/sweetalert", () => ({ Swal: { confirm: vi.fn() } }));

import Counting from "./Counting";

describe("Counting list", () => {
  it("offers 'continue' for the open round and 'summary' for posted and closed ones", () => {
    render(<Counting />);
    expect(screen.getAllByRole("button", { name: /นับต่อ/ })).toHaveLength(1);
    expect(screen.getAllByRole("button", { name: /ดูสรุป/ })).toHaveLength(2);
  });

  it("names the search field, filters by the typed text, and clears it", () => {
    render(<Counting />);
    const box = screen.getByRole("textbox", { name: "ค้นหารอบนับเงิน" });
    fireEvent.change(box, { target: { value: "ขาด 10" } });
    expect(screen.queryAllByRole("button", { name: /นับต่อ/ })).toHaveLength(0);
    expect(screen.getAllByRole("button", { name: /ดูสรุป/ })).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: "ล้างคำค้นหา" }));
    expect((box as HTMLInputElement).value).toBe("");
    expect(screen.getAllByRole("button", { name: /ดูสรุป/ })).toHaveLength(2);
  });
});
