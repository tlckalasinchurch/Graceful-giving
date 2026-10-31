import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

vi.mock("./db", async importOriginal => {
  const actual = await importOriginal<typeof import("./db")>();
  return {
    ...actual,
    getChurchProfile: vi.fn(),
    upsertChurchProfile: vi.fn(),
  };
});

import { appRouter, redactChurchProfile } from "./routers";
import * as db from "./db";
import { hasValidCrc } from "@shared/promptpay";
import { MAX_GIVING_AMOUNT } from "@shared/givingLimits";

type User = NonNullable<TrpcContext["user"]>;

const ctx = (user: User | null): TrpcContext => ({
  user,
  req: { protocol: "https", headers: {} } as TrpcContext["req"],
  res: { clearCookie: () => undefined } as TrpcContext["res"],
});

const member = {
  id: 1,
  openId: "m",
  email: null,
  name: "สมาชิก",
  loginMethod: "line",
  role: "user",
  churchRole: "MEMBER",
  createdAt: new Date(),
  updatedAt: new Date(),
  lastSignedIn: new Date(),
} as User;
const treasurer = { ...member, id: 2, churchRole: "TREASURER" } as User;
const superAdmin = { ...member, id: 3, churchRole: "SUPER_ADMIN" } as User;

const profile = {
  name: "คริสตจักรทดสอบ",
  bankName: "กสิกรไทย",
  bankAccount: "1234567890",
  bankAccountName: "คริสตจักรทดสอบ",
  promptPayId: "0812345678",
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(db.getChurchProfile).mockResolvedValue(profile as never);
});

describe("church.paymentQr", () => {
  it("rejects a signed-out caller", async () => {
    await expect(
      appRouter.createCaller(ctx(null)).church.paymentQr({ amount: 500 })
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("gives any signed-in member a payload for the amount, with a valid check", async () => {
    const qr = await appRouter
      .createCaller(ctx(member))
      .church.paymentQr({ amount: 500 });
    expect(qr).not.toBeNull();
    expect(hasValidCrc(qr!.payload)).toBe(true);
    expect(qr!.payload).toContain("540650" + "0.00");
    expect(qr).toMatchObject({ amount: 500, payeeName: "คริสตจักรทดสอบ" });
    // The ID is not returned as a field of its own.
    expect(Object.keys(qr!)).toEqual(["payload", "amount", "payeeName"]);
  });

  it("returns null when the church has not set a PromptPay ID", async () => {
    vi.mocked(db.getChurchProfile).mockResolvedValue({
      ...profile,
      promptPayId: null,
    } as never);
    await expect(
      appRouter.createCaller(ctx(member)).church.paymentQr({ amount: 500 })
    ).resolves.toBeNull();
  });

  it.each([0, -5, MAX_GIVING_AMOUNT + 1])("refuses amount %s", async amount => {
    await expect(
      appRouter.createCaller(ctx(member)).church.paymentQr({ amount })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});

describe("church.payeeInfo", () => {
  it("rejects a signed-out caller", async () => {
    await expect(
      appRouter.createCaller(ctx(null)).church.payeeInfo()
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("shows any signed-in member the account to pay, and nothing else", async () => {
    const info = await appRouter.createCaller(ctx(member)).church.payeeInfo();
    expect(info).toEqual({
      bankName: "กสิกรไทย",
      bankAccount: "1234567890",
      bankAccountName: "คริสตจักรทดสอบ",
    });
    expect(JSON.stringify(info)).not.toContain("0812345678");
  });

  it("returns null when the church has no bank account set", async () => {
    vi.mocked(db.getChurchProfile).mockResolvedValue({
      ...profile,
      bankAccount: null,
    } as never);
    await expect(
      appRouter.createCaller(ctx(member)).church.payeeInfo()
    ).resolves.toBeNull();
  });
});

describe("PromptPay ID in the church profile", () => {
  it("is hidden from a member and shown to a treasurer", () => {
    expect(redactChurchProfile(profile, member)).toMatchObject({
      bankAccount: null,
      promptPayId: null,
    });
    expect(redactChurchProfile(profile, treasurer)).toEqual(profile);
  });

  it("is saved as digits, cleared by an empty value, and left alone when omitted", async () => {
    const caller = appRouter.createCaller(ctx(superAdmin));
    const base = { name: "คริสตจักรทดสอบ", fiscalYearStartMonth: 1 };

    await caller.church.updateProfile({ ...base, promptPayId: "081-234-5678" });
    expect(db.upsertChurchProfile).toHaveBeenLastCalledWith(
      expect.objectContaining({ promptPayId: "0812345678" })
    );

    await caller.church.updateProfile({ ...base, promptPayId: "" });
    expect(db.upsertChurchProfile).toHaveBeenLastCalledWith(
      expect.objectContaining({ promptPayId: null })
    );

    await caller.church.updateProfile(base);
    expect(
      vi.mocked(db.upsertChurchProfile).mock.calls.at(-1)![0]
    ).not.toHaveProperty("promptPayId");
  });

  it("refuses an invalid ID, and a member cannot set one", async () => {
    await expect(
      appRouter.createCaller(ctx(superAdmin)).church.updateProfile({
        name: "คริสตจักรทดสอบ",
        fiscalYearStartMonth: 1,
        promptPayId: "12345",
      })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(
      appRouter.createCaller(ctx(member)).church.updateProfile({
        name: "คริสตจักรทดสอบ",
        fiscalYearStartMonth: 1,
        promptPayId: "0812345678",
      })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
