import { describe, expect, it } from "vitest";
import { createFinanceAccount } from "./db";
import { InvalidFundBalanceError } from "./ledgerGuards";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

/**
 * A new fund must not start below zero. These tests run without a database:
 * both boundaries refuse the request before any query is built.
 */

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

describe("finance.createAccount (router boundary)", () => {
  it("refuses a negative starting balance instead of ignoring it", async () => {
    await expect(
      // @ts-expect-error balance is not an accepted input
      caller().finance.createAccount({ name: "กองทุนทดสอบ", balance: -100 })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("refuses any starting balance: money enters a fund only as a ledger entry", async () => {
    await expect(
      // @ts-expect-error balance is not an accepted input
      caller().finance.createAccount({ name: "กองทุนทดสอบ", balance: 500 })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});

describe("createFinanceAccount (database boundary)", () => {
  const fund = { churchId: "c", name: "กองทุนทดสอบ" };

  it("refuses a negative balance", async () => {
    await expect(
      createFinanceAccount({ ...fund, balance: "-0.01" })
    ).rejects.toBeInstanceOf(InvalidFundBalanceError);
  });

  it("refuses a balance that is not a number", async () => {
    await expect(
      createFinanceAccount({ ...fund, balance: "abc" })
    ).rejects.toBeInstanceOf(InvalidFundBalanceError);
  });

  it("lets a zero or omitted balance through to the database step", async () => {
    // No database here, so the call stops at the connection, not at the guard.
    await expect(
      createFinanceAccount({ ...fund, balance: "0" })
    ).rejects.toThrow("Database is not available");
    await expect(createFinanceAccount(fund)).rejects.toThrow(
      "Database is not available"
    );
  });
});
