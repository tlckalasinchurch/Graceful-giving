import { describe, expect, it } from "vitest";
import { appRouter, redactChurchProfile } from "./routers";
import type { TrpcContext } from "./_core/context";

type User = NonNullable<TrpcContext["user"]>;

function createContext(user: User | null): TrpcContext {
  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => undefined } as TrpcContext["res"],
  };
}

const base: User = {
  id: 2,
  openId: "member",
  email: "member@example.com",
  name: "Member",
  loginMethod: "clerk",
  role: "user",
  createdAt: new Date(),
  updatedAt: new Date(),
  lastSignedIn: new Date(),
} as User;

const withRole = (churchRole: string): User =>
  ({ ...base, churchRole }) as User;

const member = withRole("MEMBER");
const deacon = withRole("DEACON");
const counter = withRole("COUNTER");

const financeReads: Array<
  [string, (c: ReturnType<typeof appRouter.createCaller>) => Promise<unknown>]
> = [
  ["finance.summary", c => c.finance.summary()],
  ["finance.monthlyStats", c => c.finance.monthlyStats({} as never)],
  ["offerings.list", c => c.offerings.list({} as never)],
  ["expenses.list", c => c.expenses.list({} as never)],
];

describe("finance read access", () => {
  for (const [name, call] of financeReads) {
    it(`${name} rejects anonymous callers`, async () => {
      const caller = appRouter.createCaller(createContext(null));
      await expect(call(caller)).rejects.toMatchObject({
        code: "UNAUTHORIZED",
      });
    });

    for (const [label, user] of [
      ["member", member],
      ["deacon", deacon],
      ["counter", counter],
    ] as const) {
      it(`${name} rejects a ${label}`, async () => {
        const caller = appRouter.createCaller(createContext(user));
        await expect(call(caller)).rejects.toMatchObject({ code: "FORBIDDEN" });
      });
    }
  }
});

describe("fund and member lists", () => {
  it("rejects a plain member from the full fund list", async () => {
    const caller = appRouter.createCaller(createContext(member));
    await expect(caller.finance.accounts()).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("rejects a plain member from the member directory", async () => {
    const caller = appRouter.createCaller(createContext(member));
    await expect(caller.members.list()).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    await expect(caller.members.getById({ id: 1 })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("rejects a counter from member details", async () => {
    const caller = appRouter.createCaller(createContext(counter));
    await expect(caller.members.getById({ id: 1 })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("lets a plain member read the name-only fund list", async () => {
    const caller = appRouter.createCaller(createContext(member));
    await expect(caller.finance.fundOptions()).resolves.toBeDefined();
  });
});

describe("receipt upload validation", () => {
  it("rejects a content type outside the allow list", async () => {
    const caller = appRouter.createCaller(createContext(withRole("TREASURER")));
    await expect(
      caller.expenses.uploadReceipt({
        contentType: "text/html",
        base64Data: "AAAA",
      } as never)
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});

describe("church profile redaction", () => {
  const profile = {
    name: "x",
    bankName: "KBank",
    bankAccount: "123",
    bankAccountName: "Church",
  };

  it("hides bank details from a member", () => {
    expect(redactChurchProfile(profile, member)).toEqual({
      name: "x",
      bankName: null,
      bankAccount: null,
      bankAccountName: null,
    });
  });

  it("keeps bank details for a treasurer", () => {
    expect(redactChurchProfile(profile, withRole("TREASURER"))).toEqual(
      profile
    );
  });
});
