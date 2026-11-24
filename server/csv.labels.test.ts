import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";
import type { ExpenseRow, OfferingRow } from "./db";

/**
 * The CSV files are opened by church staff in a spreadsheet. The category and
 * payment-method columns must read in Thai, not as the English ids stored in
 * the database, and a cell that starts with a formula character stays safe.
 */
const stubs = vi.hoisted(() => ({ getFinancialReportData: vi.fn() }));

vi.mock("./db", async importOriginal => {
  const actual = await importOriginal<typeof import("./db")>();
  return { ...actual, ...stubs };
});

import { appRouter } from "./routers";
import { exportExpensesCsvData, exportOfferingsCsvData } from "./db";

const treasurer: NonNullable<TrpcContext["user"]> = {
  id: 4,
  openId: "t",
  email: null,
  name: "T",
  loginMethod: "line",
  role: "user",
  churchRole: "TREASURER",
  createdAt: new Date(),
  updatedAt: new Date(),
  lastSignedIn: new Date(),
};

const fund = {
  id: 1,
  name: "กองทุนทั่วไป",
  churchId: "demo-church",
  balance: "0",
} as never;

const offering = (over: Partial<OfferingRow>): OfferingRow => ({
  id: 1,
  amount: 100,
  category: "tithe",
  donorName: "สมชาย",
  donorMemberId: null,
  receiptDate: new Date("2026-11-05T10:00:00.000Z"),
  method: "transfer",
  reference: null,
  notes: null,
  fundId: 1,
  ...over,
});

beforeEach(() => stubs.getFinancialReportData.mockReset());

describe("offerings CSV", () => {
  it("writes the Thai category and payment method, never the stored ids", async () => {
    const rows = [
      offering({ id: 3, method: "cash", category: "mission" }),
      offering({ id: 2, method: "transfer", category: "tithe" }),
      offering({ id: 1, method: "check", category: "special" }),
    ];

    const { csv } = await exportOfferingsCsvData("demo-church", {}, {
      fetchOfferings: async () => rows,
      fetchFunds: async () => [fund],
    });

    const [header, ...lines] = csv.replace("\uFEFF", "").split("\n");
    expect(header).toBe(
      "ID,วันที่,ประเภทการถวาย,ผู้ถวาย,จำนวนเงิน,ช่องทาง,กองทุน,เลขอ้างอิง,หมายเหตุ"
    );
    // Fields are quoted except the amount; none of these test values has a comma.
    const cells = (line: string) => line.split(",").map(c => c.replace(/"/g, ""));
    expect(cells(lines[0])[5]).toBe("เงินสด");
    expect(cells(lines[1])[5]).toBe("โอนเงิน");
    expect(cells(lines[2])[5]).toBe("เช็ค");
    expect(cells(lines[1])[2]).toBe("สิบลด");
    for (const raw of ["cash", "transfer", "check", "tithe", "mission", "special"]) {
      expect(csv).not.toContain(`"${raw}"`);
    }
  });

  it("still neutralises a donor name that starts like a formula", async () => {
    const { csv } = await exportOfferingsCsvData("demo-church", { showDonorNames: true }, {
      fetchOfferings: async () => [offering({ donorName: "=HYPERLINK(\"x\")" })],
      fetchFunds: async () => [fund],
    });
    expect(csv).toContain(`"'=HYPERLINK(""x"")"`);
  });

  it("shows a historic category in Thai and an unknown one as it is", async () => {
    const { csv } = await exportOfferingsCsvData("demo-church", {}, {
      fetchOfferings: async () => [
        offering({ id: 2, category: "general" as never }),
        offering({ id: 1, category: "legacy_x" as never, method: "เงินสด" as never }),
      ],
      fetchFunds: async () => [fund],
    });
    expect(csv).toContain('"ถวายทั่วไป"');
    expect(csv).toContain('"legacy_x"');
    expect(csv).toContain('"เงินสด"');
  });
});

describe("expenses CSV", () => {
  it("writes the Thai expense category", async () => {
    const expense: ExpenseRow = {
      id: 1,
      amount: 50,
      category: "utilities",
      description: "ค่าไฟ",
      details: null,
      expenseDate: new Date("2026-11-05T10:00:00.000Z"),
      payee: "การไฟฟ้า",
      status: "approved",
      fundId: 1,
      receiptRef: null,
      receiptUrl: null,
    };
    const { csv } = await exportExpensesCsvData("demo-church", {}, {
      fetchExpenses: async () => [expense],
      fetchFunds: async () => [fund],
    });
    expect(csv).not.toContain('"utilities"');
    expect(csv).toContain('"สาธารณูปโภค"');
  });
});

describe("financial report CSV", () => {
  const call = () =>
    appRouter
      .createCaller({
        user: treasurer,
        req: { protocol: "https", headers: {} } as TrpcContext["req"],
        res: { clearCookie: () => undefined } as TrpcContext["res"],
      })
      .reports.exportCsv({
        fromDate: new Date("2026-11-01"),
        toDate: new Date("2026-11-30"),
      });

  it("writes Thai categories and methods for income and expense rows", async () => {
    stubs.getFinancialReportData.mockResolvedValue([
      {
        date: "2026-11-05",
        type: "income",
        category: "tithe",
        description: "ถวายสิบลด",
        amount: 1000,
        method: "transfer",
      },
      {
        date: "2026-11-06",
        type: "expense",
        category: "utilities",
        description: "ค่าไฟ",
        amount: 500,
      },
    ]);

    const result = await call();
    const text = typeof result === "string" ? result : (result as { csv: string }).csv;

    expect(text).toContain('"สิบลด"');
    expect(text).toContain('"โอนเงิน"');
    expect(text).toContain('"สาธารณูปโภค"');
    expect(text).not.toContain('"tithe"');
    expect(text).not.toContain('"transfer"');
    expect(text).not.toContain('"utilities"');
    // An expense row has no method. The dash was already written this way:
    // csvCell prefixes a leading "-" with an apostrophe.
    expect(text).toMatch(/"'?-"/);
  });
});
