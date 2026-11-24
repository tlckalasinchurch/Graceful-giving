import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";
import {
  ClosedSessionError,
  FundNotFoundError,
  InsufficientFundError,
} from "./ledgerGuards";

/**
 * Router wiring for the ledger writes, with ./db replaced by stubs. These tests
 * never open a database. They prove WHICH arguments the router hands to the
 * ledger functions and how errors and notification failures are reported. They
 * do NOT prove that the audit row and the balance really commit or roll back
 * together: that needs PostgreSQL (server/ledgerGuards.integration.test.ts).
 */

const stubs = vi.hoisted(() => ({
  createOffering: vi.fn(),
  updateOffering: vi.fn(),
  voidOffering: vi.fn(),
  createExpense: vi.fn(),
  updateExpense: vi.fn(),
  voidExpense: vi.fn(),
  createNotification: vi.fn(),
  createAuditLog: vi.fn(),
}));

vi.mock("./db", async importOriginal => {
  const actual = await importOriginal<typeof import("./db")>();
  return {
    ...actual,
    ...stubs,
    // Any fund id is "active" so the request reaches the ledger function.
    listFinanceAccounts: vi.fn(async () => [{ id: 1, name: "ทั่วไป" }]),
  };
});

import { appRouter } from "./routers";

type User = NonNullable<TrpcContext["user"]>;

const treasurer: User = {
  id: 4,
  openId: "treasurer",
  email: null,
  name: "Treasurer",
  loginMethod: "line",
  role: "user",
  churchRole: "TREASURER",
  createdAt: new Date(),
  updatedAt: new Date(),
  lastSignedIn: new Date(),
};

const caller = () =>
  appRouter.createCaller({
    user: treasurer,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => undefined } as TrpcContext["res"],
  });

let errorLog: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  Object.values(stubs).forEach(stub => stub.mockReset());
  errorLog = vi.spyOn(console, "error").mockImplementation(() => undefined);
});

afterEach(() => {
  errorLog.mockRestore();
});

describe("audit entry travels with the financial write", () => {
  it("offerings.create hands the audit entry to the ledger function and writes none itself", async () => {
    stubs.createOffering.mockResolvedValue(11);
    stubs.createNotification.mockResolvedValue(1);

    await expect(
      caller().offerings.create({ amount: 100, fundId: 1 })
    ).resolves.toEqual({ id: 11 });

    const [, , audit] = stubs.createOffering.mock.calls[0];
    expect(audit).toMatchObject({ userId: 4 });
    expect(audit.metadata).toMatchObject({ amount: 100, fundId: 1 });
    // The old after-the-fact write is gone: only the transaction writes audit.
    expect(stubs.createAuditLog).not.toHaveBeenCalled();
  });

  it("expenses.create hands the audit entry to the ledger function", async () => {
    stubs.createExpense.mockResolvedValue(21);
    stubs.createNotification.mockResolvedValue(1);

    await caller().expenses.create({
      amount: 50,
      fundId: 1,
      description: "ค่าไฟฟ้า",
    });

    const [, , audit] = stubs.createExpense.mock.calls[0];
    expect(audit).toMatchObject({ userId: 4 });
    expect(stubs.createAuditLog).not.toHaveBeenCalled();
  });

  it("update and void pass the acting user into the transaction", async () => {
    stubs.updateOffering.mockResolvedValue(5);
    stubs.voidOffering.mockResolvedValue(true);
    stubs.updateExpense.mockResolvedValue(6);
    stubs.voidExpense.mockResolvedValue(true);

    await caller().offerings.update({ id: 5, amount: 80 });
    await caller().offerings.delete({ id: 5 });
    await caller().expenses.update({ id: 6, amount: 30 });
    await caller().expenses.delete({ id: 6 });

    expect(stubs.updateOffering.mock.calls[0][3]).toMatchObject({ userId: 4 });
    expect(stubs.voidOffering.mock.calls[0][2]).toMatchObject({ userId: 4 });
    expect(stubs.updateExpense.mock.calls[0][3]).toMatchObject({ userId: 4 });
    expect(stubs.voidExpense.mock.calls[0][2]).toMatchObject({ userId: 4 });
    expect(stubs.createAuditLog).not.toHaveBeenCalled();
  });

  it("a failed audit write fails the request, so the client does not believe it saved", async () => {
    // In the real function the same failure rolls the offering back.
    stubs.createOffering.mockRejectedValue(new Error("audit insert failed"));
    await expect(
      caller().offerings.create({ amount: 100, fundId: 1 })
    ).rejects.toThrow("audit insert failed");
  });
});

describe("notification failures are not financial failures", () => {
  it("offerings.create still succeeds, and the failure is logged", async () => {
    stubs.createOffering.mockResolvedValue(11);
    stubs.createNotification.mockRejectedValue(new Error("notifications down"));

    await expect(
      caller().offerings.create({ amount: 100, fundId: 1 })
    ).resolves.toEqual({ id: 11 });

    expect(errorLog).toHaveBeenCalledTimes(1);
    const logged = errorLog.mock.calls[0].join(" ");
    expect(logged).toContain("[notification]");
    expect(logged).toContain("offerings.create");
    expect(logged).toContain("notifications down");
  });

  it("expenses.create still succeeds, and the failure is logged", async () => {
    stubs.createExpense.mockResolvedValue(21);
    stubs.createNotification.mockRejectedValue(new Error("notifications down"));

    await expect(
      caller().expenses.create({ amount: 50, fundId: 1, description: "ค่าไฟ" })
    ).resolves.toEqual({ id: 21 });

    expect(errorLog.mock.calls[0].join(" ")).toContain("expenses.create");
  });

  it("does not log the amount or the description", async () => {
    stubs.createExpense.mockResolvedValue(21);
    stubs.createNotification.mockRejectedValue(new Error("boom"));
    await caller().expenses.create({
      amount: 12345,
      fundId: 1,
      description: "รายละเอียดลับ",
    });
    const logged = errorLog.mock.calls[0].join(" ");
    expect(logged).not.toContain("12345");
    expect(logged).not.toContain("รายละเอียดลับ");
  });

  it("does not hide a failure of the financial write itself", async () => {
    stubs.createOffering.mockRejectedValue(new Error("write failed"));
    stubs.createNotification.mockResolvedValue(1);
    await expect(
      caller().offerings.create({ amount: 100, fundId: 1 })
    ).rejects.toThrow("write failed");
    expect(stubs.createNotification).not.toHaveBeenCalled();
  });
});

describe("fund guard errors reach the user in Thai", () => {
  const low = () => new InsufficientFundError(1, "กองทุนทั่วไป", 3000, 4000);

  it("maps an insufficient balance to CONFLICT with the shortfall", async () => {
    stubs.voidOffering.mockRejectedValue(low());
    await expect(caller().offerings.delete({ id: 5 })).rejects.toMatchObject({
      code: "CONFLICT",
      message:
        "ยอดกองทุน “กองทุนทั่วไป” ไม่พอ (คงเหลือ 30.00 บาท ต้องใช้ 40.00 บาท ขาด 10.00 บาท)",
    });
  });

  it("maps it on every debit path", async () => {
    stubs.createExpense.mockRejectedValue(low());
    stubs.updateExpense.mockRejectedValue(low());
    stubs.updateOffering.mockRejectedValue(low());
    await expect(
      caller().expenses.create({ amount: 50, fundId: 1, description: "ค่าไฟ" })
    ).rejects.toMatchObject({ code: "CONFLICT" });
    await expect(
      caller().expenses.update({ id: 6, amount: 90 })
    ).rejects.toMatchObject({ code: "CONFLICT" });
    await expect(
      caller().offerings.update({ id: 5, amount: 1 })
    ).rejects.toMatchObject({ code: "CONFLICT" });
  });

  it("tells a missing fund apart from a low one", async () => {
    stubs.voidOffering.mockRejectedValue(new FundNotFoundError(9));
    await expect(caller().offerings.delete({ id: 5 })).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message: "ไม่พบกองทุนที่เลือก",
    });
  });

  it("maps a closed counting session to CONFLICT on every edit and void path", async () => {
    const closed = () => new ClosedSessionError();
    stubs.updateOffering.mockRejectedValue(closed());
    stubs.voidOffering.mockRejectedValue(closed());
    stubs.updateExpense.mockRejectedValue(closed());
    stubs.voidExpense.mockRejectedValue(closed());
    const message =
      "รายการนี้มาจากรอบนับเงินที่ปิดรอบแล้ว จึงแก้ไขหรือยกเลิกไม่ได้";
    for (const call of [
      () => caller().offerings.update({ id: 5, amount: 1 }),
      () => caller().offerings.delete({ id: 5 }),
      () => caller().expenses.update({ id: 6, amount: 1 }),
      () => caller().expenses.delete({ id: 6 }),
    ]) {
      await expect(call()).rejects.toMatchObject({
        code: "CONFLICT",
        message,
      });
    }
  });

  it("never turns an internal SQL error into a user message", async () => {
    stubs.voidOffering.mockRejectedValue(
      new Error('relation "finance_accounts" does not exist')
    );
    const err = await caller()
      .offerings.delete({ id: 5 })
      .catch(e => e);
    expect(err.code).toBe("INTERNAL_SERVER_ERROR");
    expect(err.message).not.toContain("ไม่พอ");
  });
});
