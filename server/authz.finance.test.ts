import { describe, expect, it } from "vitest";
import { type TestUser, createTestContext, makeUser } from "./test/testContext";
import { appRouter, redactChurchProfile } from "./routers";

const base = makeUser({
  id: 2,
  openId: "member",
  email: "member@example.com",
  name: "Member",
  loginMethod: "clerk",
  role: "user",
  createdAt: new Date(),
  updatedAt: new Date(),
  lastSignedIn: new Date(),
});

const withRole = (churchRole: TestUser["churchRole"]): TestUser =>
  makeUser({ ...base, churchRole });

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
      const caller = appRouter.createCaller(createTestContext(null));
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
        const caller = appRouter.createCaller(createTestContext(user));
        await expect(call(caller)).rejects.toMatchObject({ code: "FORBIDDEN" });
      });
    }
  }
});

describe("fund and member lists", () => {
  it("rejects a plain member from the full fund list", async () => {
    const caller = appRouter.createCaller(createTestContext(member));
    await expect(caller.finance.accounts()).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("rejects a plain member from the member directory", async () => {
    const caller = appRouter.createCaller(createTestContext(member));
    await expect(caller.members.list()).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    await expect(caller.members.getById({ id: 1 })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("rejects a counter from member details", async () => {
    const caller = appRouter.createCaller(createTestContext(counter));
    await expect(caller.members.getById({ id: 1 })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("lets a plain member read the name-only fund list", async () => {
    const caller = appRouter.createCaller(createTestContext(member));
    await expect(caller.finance.fundOptions()).resolves.toBeDefined();
  });
});

describe("receipt upload validation", () => {
  it("rejects a content type outside the allow list", async () => {
    const caller = appRouter.createCaller(
      createTestContext(withRole("TREASURER"))
    );
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
