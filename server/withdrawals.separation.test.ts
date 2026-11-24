/**
 * Separation of duties on withdrawals: nobody signs their own request, and the
 * required bank signer cannot file one (it could never be paid).
 *
 * Runs without a database: the db helpers the router calls are mocked.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const dbMock = vi.hoisted(() => ({
  isBankSigner: vi.fn(),
  getWithdrawalRequestBasic: vi.fn(),
  signWithdrawalRequest: vi.fn(),
  createWithdrawalRequest: vi.fn(),
  listFinanceAccounts: vi.fn(),
  createAuditLog: vi.fn(),
}));

vi.mock("./db", async importOriginal => ({
  ...(await importOriginal<typeof import("./db")>()),
  ...dbMock,
}));

import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

const ctx = (user: unknown): TrpcContext => ({
  user: user as TrpcContext["user"],
  req: { protocol: "https", headers: {} } as TrpcContext["req"],
  res: {} as TrpcContext["res"],
});

const pastor = { id: 10, openId: "p", role: "user", churchRole: "PASTOR" };
const treasurer = {
  id: 11,
  openId: "t",
  role: "user",
  churchRole: "TREASURER",
};
const member = { id: 12, openId: "m", role: "user", churchRole: "MEMBER" };

const REQUESTED_BY_TREASURER = { requestedBy: 11, status: "pending" };

describe("withdrawals.sign: the requester cannot sign", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    dbMock.signWithdrawalRequest.mockResolvedValue({ outcome: "pending" });
    dbMock.createAuditLog.mockResolvedValue(undefined);
  });

  it("refuses an approval from the requester, who is a signer", async () => {
    dbMock.isBankSigner.mockResolvedValue({ isRequired: false });
    dbMock.getWithdrawalRequestBasic.mockResolvedValue(REQUESTED_BY_TREASURER);
    await expect(
      appRouter
        .createCaller(ctx(treasurer))
        .withdrawals.sign({ id: 1, decision: "approved" })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(dbMock.signWithdrawalRequest).not.toHaveBeenCalled();
  });

  it("refuses a rejection from the requester too", async () => {
    dbMock.isBankSigner.mockResolvedValue({ isRequired: false });
    dbMock.getWithdrawalRequestBasic.mockResolvedValue(REQUESTED_BY_TREASURER);
    await expect(
      appRouter.createCaller(ctx(treasurer)).withdrawals.sign({
        id: 1,
        decision: "rejected",
        note: "ไม่เบิกแล้ว",
      })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(dbMock.signWithdrawalRequest).not.toHaveBeenCalled();
  });

  it("lets another signer sign the same request", async () => {
    dbMock.isBankSigner.mockResolvedValue({ isRequired: true });
    dbMock.getWithdrawalRequestBasic.mockResolvedValue(REQUESTED_BY_TREASURER);
    await expect(
      appRouter
        .createCaller(ctx(pastor))
        .withdrawals.sign({ id: 1, decision: "approved" })
    ).resolves.toMatchObject({ outcome: "pending" });
    expect(dbMock.signWithdrawalRequest).toHaveBeenCalledTimes(1);
  });

  it("answers NOT_FOUND for a request that does not exist", async () => {
    dbMock.isBankSigner.mockResolvedValue({ isRequired: false });
    dbMock.getWithdrawalRequestBasic.mockResolvedValue(null);
    await expect(
      appRouter
        .createCaller(ctx(treasurer))
        .withdrawals.sign({ id: 99, decision: "approved" })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("still refuses a signed-in member who is not a signer, before reading the request", async () => {
    dbMock.isBankSigner.mockResolvedValue(null);
    await expect(
      appRouter
        .createCaller(ctx(member))
        .withdrawals.sign({ id: 1, decision: "approved" })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(dbMock.getWithdrawalRequestBasic).not.toHaveBeenCalled();
  });

  it("refuses an anonymous caller", async () => {
    await expect(
      appRouter
        .createCaller(ctx(null))
        .withdrawals.sign({ id: 1, decision: "approved" })
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});

describe("withdrawals.create: the required signer cannot file a request", () => {
  const input = { amount: 500, purpose: "ค่าอุปกรณ์ฝ่ายดนตรี", fundId: 7 };

  beforeEach(() => {
    vi.resetAllMocks();
    dbMock.listFinanceAccounts.mockResolvedValue([{ id: 7 }]);
    dbMock.createWithdrawalRequest.mockResolvedValue(42);
  });

  it("refuses the required signer and writes nothing", async () => {
    dbMock.isBankSigner.mockResolvedValue({ isRequired: true });
    await expect(
      appRouter.createCaller(ctx(pastor)).withdrawals.create(input)
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(dbMock.createWithdrawalRequest).not.toHaveBeenCalled();
  });

  it("lets an ordinary signer file a request", async () => {
    dbMock.isBankSigner.mockResolvedValue({ isRequired: false });
    await expect(
      appRouter.createCaller(ctx(treasurer)).withdrawals.create(input)
    ).resolves.toEqual({ id: 42 });
  });

  it("lets a member who is not a signer file a request", async () => {
    dbMock.isBankSigner.mockResolvedValue(null);
    await expect(
      appRouter.createCaller(ctx(member)).withdrawals.create(input)
    ).resolves.toEqual({ id: 42 });
  });

  it("refuses an anonymous caller", async () => {
    await expect(
      appRouter.createCaller(ctx(null)).withdrawals.create(input)
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});
