import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Expenses from "./Expenses";
import Offerings from "./Offerings";
import Transactions from "./Transactions";

type Input = { search?: string; cursor?: unknown };
const calls = vi.hoisted(() => ({}) as Record<string, Input[]>);
// utils.<router>.exportCsv.fetch never settles, so "exporting" stays visible.
const exportFetch = vi.hoisted(() => vi.fn());

vi.mock("@/_core/hooks/useAuth", () => ({
  useAuth: () => ({ user: null, logout: vi.fn() }),
}));
vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));
vi.mock("@/components/layout/AppLayout", () => ({
  // The export button is passed through the `action` prop.
  AppLayout: ({
    children,
    action,
  }: {
    children: React.ReactNode;
    action?: React.ReactNode;
  }) => (
    <div>
      {action}
      {children}
    </div>
  ),
}));
// Any trpc.<router>.<proc>.useQuery(input) is recorded; "paged" always has a
// next page and "summary" reports enough rows to show the pagination bar.
vi.mock("@/lib/trpc", () => {
  const leaf = (key: string) => ({
    useQuery: (input: Input) => {
      (calls[key] ??= []).push(input);
      if (key === "finance.accounts") return { data: [] };
      if (key.endsWith(".paged")) {
        // Superset of the fields the three pages read, so the list (and with
        // it the pagination bar) renders.
        const item = {
          id: 1,
          type: "income",
          category: "general",
          title: "t",
          description: "d",
          details: null,
          amount: "100.00",
          date: "2026-01-01",
          expenseDate: "2026-01-01",
          receiptDate: "2026-01-01",
          payee: "p",
          donorName: "d",
          reference: null,
          notes: null,
          method: "cash",
          fundId: null,
          status: "completed",
          receiptRef: "r",
          receiptUrl: null,
        };
        return {
          data: {
            items: [item],
            hasMore: true,
            nextCursor: { date: "2026-01-01", id: 9 },
          },
          isLoading: false,
          isError: false,
          refetch: vi.fn(),
        };
      }
      return {
        data: {
          totalAmount: 0,
          totalCount: 120,
          totalIncome: 0,
          totalExpense: 0,
          netTotal: 0,
          incomeCount: 0,
          expenseCount: 0,
        },
        isLoading: false,
        isError: false,
      };
    },
  });
  const trpc = new Proxy(
    {},
    {
      get: (_t, ns) =>
        ns === "useUtils"
          ? () =>
              new Proxy(
                {},
                {
                  get: () =>
                    new Proxy({}, { get: () => ({ fetch: exportFetch }) }),
                }
              )
          : new Proxy(
              {},
              { get: (_n, p) => leaf(`${String(ns)}.${String(p)}`) }
            ),
    }
  );
  return { trpc };
});

const pages = [
  ["Expenses", Expenses, "expenses"],
  ["Offerings", Offerings, "offerings"],
  ["Transactions", Transactions, "transactions"],
] as const;

describe.each(pages)("%s search debounce", (_name, Page, ns) => {
  const paged = () => calls[`${ns}.paged`];
  const summary = () => calls[`${ns}.summary`];
  const type = (text: string) =>
    fireEvent.change(screen.getByRole("searchbox"), {
      target: { value: text },
    });
  const wait = (ms: number) => act(() => vi.advanceTimersByTime(ms));

  beforeEach(() => {
    vi.useFakeTimers();
    for (const k of Object.keys(calls)) delete calls[k];
    exportFetch.mockReset();
    exportFetch.mockReturnValue(new Promise(() => {}));
    render(<Page />);
  });
  afterEach(() => vi.useRealTimers());

  it("keeps the input responsive but sends nothing until typing pauses", () => {
    const before = paged().length;
    type("ก");
    expect(screen.getByRole("searchbox")).toHaveValue("ก");
    wait(299);
    expect(paged().some(c => c.search === "ก")).toBe(false);
    expect(paged().length).toBe(before + 1); // only the re-render, old search
    wait(1);
    expect(paged().at(-1)?.search).toBe("ก");
    expect(summary().at(-1)?.search).toBe("ก");
  });

  it("sends only the final value after rapid typing", () => {
    type("a");
    wait(100);
    type("ab");
    wait(100);
    type("abc");
    wait(300);
    const searches = new Set(paged().map(c => c.search));
    expect(searches).toEqual(new Set([undefined, "abc"]));
    expect(new Set(summary().map(c => c.search))).toEqual(
      new Set([undefined, "abc"])
    );
  });

  it("clears the effective search after the delay", () => {
    type("abc");
    wait(300);
    type("");
    wait(300);
    expect(paged().at(-1)?.search).toBeUndefined();
    expect(summary().at(-1)?.search).toBeUndefined();
  });

  it("does not refetch for whitespace-only changes", () => {
    type("abc");
    wait(300);
    const n = paged().length;
    type("abc ");
    wait(300);
    expect(
      paged()
        .slice(n)
        .every(c => c.search === "abc")
    ).toBe(true);
    expect(
      paged()
        .slice(n)
        .every(c => c.cursor === undefined)
    ).toBe(true);
  });

  it("resets the cursor and never pairs a stale cursor with a new search", () => {
    fireEvent.click(screen.getByText("ถัดไป"));
    expect(paged().at(-1)?.cursor).toBeTruthy();
    type("new");
    wait(300);
    const last = paged().at(-1)!;
    expect(last.search).toBe("new");
    expect(last.cursor).toBeUndefined();
    expect(
      paged().some(c => c.search === "new" && c.cursor !== undefined)
    ).toBe(false);
  });

  describe("CSV export guard", () => {
    const exportButton = () => screen.getByRole("button", { name: /ส่งออก/ });

    it("is enabled when the input matches the effective search", () => {
      expect(exportButton()).toBeEnabled();
    });

    it("is disabled immediately and for the whole debounce window", () => {
      type("abc");
      expect(exportButton()).toBeDisabled();
      wait(299);
      expect(exportButton()).toBeDisabled();
    });

    it("is enabled again once the effective search catches up", () => {
      type("abc");
      wait(300);
      expect(exportButton()).toBeEnabled();
    });

    it("stays enabled for whitespace-only changes", () => {
      type("abc");
      wait(300);
      type("abc ");
      expect(exportButton()).toBeEnabled();
    });

    it("clearing the search disables export until the clear is applied", () => {
      type("abc");
      wait(300);
      type("");
      expect(exportButton()).toBeDisabled();
      wait(300);
      expect(exportButton()).toBeEnabled();
    });

    it("exports with the effective search, then stays disabled while exporting", () => {
      type("abc");
      wait(300);
      fireEvent.click(exportButton());
      expect(exportFetch).toHaveBeenCalledWith(
        expect.objectContaining({ search: "abc" })
      );
      expect(exportButton()).toBeDisabled();
      expect(exportButton()).toHaveTextContent(/กำลังส่งออก/);
    });
  });
});
