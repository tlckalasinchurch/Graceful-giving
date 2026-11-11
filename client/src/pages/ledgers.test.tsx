import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

type Item = Record<string, unknown>;
const h = vi.hoisted(() => ({
  paged: {} as any,
  summary: {} as any,
  inputs: [] as any[],
  exportFetch: vi.fn(),
  toastInfo: vi.fn(),
  toastSuccess: vi.fn(),
  saved: vi.fn(),
}));

vi.mock("@/lib/trpc", () => {
  const ledger = () => ({
    summary: { useQuery: () => h.summary },
    paged: {
      useQuery: (input: any) => {
        h.inputs.push(input);
        return h.paged;
      },
    },
  });
  const util = () => ({
    exportCsv: { fetch: (...a: any[]) => h.exportFetch(...a) },
  });
  return {
    trpc: {
      useUtils: () => ({
        expenses: util(),
        offerings: util(),
        transactions: util(),
      }),
      expenses: ledger(),
      offerings: ledger(),
      transactions: ledger(),
      finance: { accounts: { useQuery: () => ({ data: [] }) } },
    },
  };
});
vi.mock("@/_core/hooks/useAuth", () => ({
  useAuth: () => ({ user: { role: "admin", churchRole: "SUPER_ADMIN" } }),
}));
vi.mock("@/components/layout/AppLayout", () => ({
  AppLayout: ({ children, action }: any) => (
    <div>
      {action}
      {children}
    </div>
  ),
}));
vi.mock("@/components/finance/VoucherModal", () => ({
  VoucherModal: () => null,
}));
vi.mock("@/components/finance/ReceiptPreviewModal", () => ({
  ReceiptPreviewModal: () => null,
}));
vi.mock("wouter", () => ({
  useLocation: () => ["/", vi.fn()],
  Link: ({ children, href }: any) => <a href={href}>{children}</a>,
}));
vi.mock("sonner", () => ({
  toast: {
    info: (...a: unknown[]) => h.toastInfo(...a),
    success: (...a: unknown[]) => h.toastSuccess(...a),
    error: vi.fn(),
  },
}));
vi.mock("@/lib/csvDownload", async () => ({
  ...(await vi.importActual<object>("@/lib/csvDownload")),
  saveCsvFile: (...a: unknown[]) => h.saved(...a),
}));

import Expenses from "./Expenses";
import Offerings from "./Offerings";
import Transactions from "./Transactions";

const day = new Date("2026-11-01T00:00:00Z");
const pages: Array<{
  name: string;
  Page: React.ComponentType;
  item: Item;
  exportButton: RegExp;
}> = [
  {
    name: "Expenses",
    Page: Expenses,
    item: {
      id: 1,
      category: "utilities",
      description: "ค่าไฟ",
      details: null,
      amount: "100.00",
      expenseDate: day,
      payee: "การไฟฟ้า",
      receiptRef: "R1",
      fundId: 1,
      status: "active",
      receiptUrl: null,
    },
    exportButton: /ส่งออก/,
  },
  {
    name: "Offerings",
    Page: Offerings,
    item: {
      id: 1,
      category: "tithe",
      amount: "500.00",
      receiptDate: day,
      method: "cash",
      fundId: 1,
      donorName: "สมชาย",
      reference: null,
      notes: null,
    },
    exportButton: /ส่งออก/,
  },
  {
    name: "Transactions",
    Page: Transactions,
    item: {
      id: 1,
      type: "income",
      title: "ทศางค์",
      amount: 500,
      date: day,
      donorOrPayee: "สมชาย",
      fundName: "ทั่วไป",
      categoryLabel: "ทศางค์",
      reference: null,
      status: "active",
    },
    exportButton: /ส่งออก|CSV/,
  },
];

describe.each(pages)("$name ledger", ({ Page, item, exportButton }) => {
  beforeEach(() => {
    h.inputs.length = 0;
    h.exportFetch.mockReset();
    h.toastInfo.mockClear();
    h.toastSuccess.mockClear();
    h.saved.mockClear();
    h.summary = {
      data: {
        totalAmount: 500,
        totalCount: 120,
        totalIncome: 500,
        totalExpense: 0,
        netTotal: 500,
        incomeCount: 120,
        expenseCount: 0,
      },
      isLoading: false,
      isError: false,
      error: null,
    };
    h.paged = {
      data: { items: [item], hasMore: true, nextCursor: { date: day, id: 1 } },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    };
  });

  it("shows the real reason and a retry button when the list fails", () => {
    h.paged = {
      ...h.paged,
      data: undefined,
      isError: true,
      error: { data: { code: "FORBIDDEN" }, message: "forbidden" },
    };
    render(<Page />);
    expect(screen.getByRole("alert")).toBeTruthy();
    // Not the old fixed "database connection failed" text.
    expect(screen.queryByText(/เชื่อมต่อฐานข้อมูลไม่สำเร็จ/)).toBeNull();
    expect(screen.getByText(/ไม่มีสิทธิ์/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "ลองใหม่" }));
    expect(h.paged.refetch).toHaveBeenCalledTimes(1);
  });

  it("pages with the cursor from the server and goes back to page 1", () => {
    render(<Page />);
    expect(h.inputs.at(-1).cursor).toBeUndefined();
    expect(screen.getByRole("button", { name: /ก่อนหน้า/ })).toHaveProperty(
      "disabled",
      true
    );
    fireEvent.click(screen.getByRole("button", { name: /ถัดไป/ }));
    expect(h.inputs.at(-1).cursor).toEqual({ date: day, id: 1 });
    fireEvent.click(screen.getByRole("button", { name: /ก่อนหน้า/ }));
    expect(h.inputs.at(-1).cursor).toBeUndefined();
  });

  it("returns to page 1 when the search text changes", () => {
    vi.useFakeTimers();
    try {
      render(<Page />);
      fireEvent.click(screen.getByRole("button", { name: /ถัดไป/ }));
      expect(h.inputs.at(-1).cursor).toBeDefined();
      fireEvent.change(screen.getByRole("searchbox"), {
        target: { value: "สม" },
      });
      act(() => vi.advanceTimersByTime(300));
      expect(h.inputs.at(-1).cursor).toBeUndefined();
      expect(h.inputs.at(-1).search).toBe("สม");
    } finally {
      vi.useRealTimers();
    }
  });

  it("downloads nothing and says so when the export has no rows", async () => {
    h.exportFetch.mockResolvedValue({ csv: "", rowCount: 0 });
    render(<Page />);
    await act(async () => {
      fireEvent.click(screen.getAllByRole("button", { name: exportButton })[0]);
    });
    await waitFor(() => expect(h.toastInfo).toHaveBeenCalledTimes(1));
    expect(h.saved).not.toHaveBeenCalled();
    expect(h.toastSuccess).not.toHaveBeenCalled();
  });

  it("downloads one file when the export has rows", async () => {
    h.exportFetch.mockResolvedValue({ csv: "a,b", rowCount: 3 });
    render(<Page />);
    await act(async () => {
      fireEvent.click(screen.getAllByRole("button", { name: exportButton })[0]);
    });
    await waitFor(() => expect(h.saved).toHaveBeenCalledTimes(1));
    expect(h.saved.mock.calls[0][0]).toBe("a,b");
    expect(h.saved.mock.calls[0][1]).toMatch(/\.csv$/);
  });
});
