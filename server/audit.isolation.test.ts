import { beforeEach, describe, expect, it, vi } from "vitest";

const dbMock = vi.hoisted(() => ({
  listAuditLogs: vi.fn(),
  DEFAULT_CHURCH_ID: "demo-church",
}));

vi.mock("./db", async importOriginal => ({
  ...(await importOriginal<typeof import("./db")>()),
  ...dbMock,
}));

import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

const createCtx = (user: unknown): TrpcContext => ({
  user: user as TrpcContext["user"],
  req: { protocol: "https", headers: {} } as TrpcContext["req"],
  res: {} as TrpcContext["res"],
});

const superAdmin = {
  id: 1,
  openId: "line:admin",
  role: "admin" as const,
  churchRole: "SUPER_ADMIN" as const,
  churchRoles: "SUPER_ADMIN",
  status: "active" as const,
};

const superAdminViaChurchRole = {
  id: 2,
  openId: "line:admin2",
  role: "user" as const,
  churchRole: "SUPER_ADMIN" as const,
  churchRoles: "SUPER_ADMIN",
  status: "active" as const,
};

const member = {
  id: 3,
  openId: "line:member",
  role: "user" as const,
  churchRole: "MEMBER" as const,
  churchRoles: "MEMBER",
  status: "active" as const,
};

const treasurer = {
  id: 4,
  openId: "line:treasurer",
  role: "user" as const,
  churchRole: "TREASURER" as const,
  churchRoles: "TREASURER",
  status: "active" as const,
};

const pastor = {
  id: 5,
  openId: "line:pastor",
  role: "user" as const,
  churchRole: "PASTOR" as const,
  churchRoles: "PASTOR",
  status: "active" as const,
};

const deacon = {
  id: 6,
  openId: "line:deacon",
  role: "user" as const,
  churchRole: "DEACON" as const,
  churchRoles: "DEACON",
  status: "active" as const,
};

const counter = {
  id: 7,
  openId: "line:counter",
  role: "user" as const,
  churchRole: "COUNTER" as const,
  churchRoles: "COUNTER",
  status: "active" as const,
};

describe("audit.list authorization & tenant isolation", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    dbMock.listAuditLogs.mockResolvedValue([]);
  });

  it("rejects unauthenticated callers with UNAUTHORIZED", async () => {
    const caller = appRouter.createCaller(createCtx(null));
    await expect(caller.audit.list()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
    expect(dbMock.listAuditLogs).not.toHaveBeenCalled();
  });

  it.each([
    ["MEMBER", member],
    ["TREASURER", treasurer],
    ["PASTOR", pastor],
    ["DEACON", deacon],
    ["COUNTER", counter],
  ])("rejects %s with FORBIDDEN", async (_, roleUser) => {
    const caller = appRouter.createCaller(createCtx(roleUser));
    await expect(caller.audit.list()).rejects.toMatchObject({
      code: "FORBIDDEN",
      message: "เฉพาะผู้ดูแลระบบเท่านั้น",
    });
    expect(dbMock.listAuditLogs).not.toHaveBeenCalled();
  });

  it("permits SUPER_ADMIN with role:admin to list audit logs", async () => {
    const caller = appRouter.createCaller(createCtx(superAdmin));
    const result = await caller.audit.list();
    expect(result).toEqual([]);
    expect(dbMock.listAuditLogs).toHaveBeenCalledWith("demo-church", 50);
  });

  it("permits SUPER_ADMIN with role:user to list audit logs", async () => {
    const caller = appRouter.createCaller(createCtx(superAdminViaChurchRole));
    const result = await caller.audit.list({ limit: 100 });
    expect(result).toEqual([]);
    expect(dbMock.listAuditLogs).toHaveBeenCalledWith("demo-church", 100);
  });

  it("enforces tenant isolation by passing trusted DEFAULT_CHURCH_ID", async () => {
    const caller = appRouter.createCaller(createCtx(superAdmin));
    await caller.audit.list({ limit: 25 });
    expect(dbMock.listAuditLogs).toHaveBeenCalledTimes(1);
    expect(dbMock.listAuditLogs).toHaveBeenCalledWith("demo-church", 25);
  });

  it("ignores untrusted client attempts to specify a different tenant", async () => {
    const caller = appRouter.createCaller(createCtx(superAdmin));
    // Even if an untrusted client injects a foreign churchId into the input object:
    await caller.audit.list({ limit: 40, churchId: "foreign-tenant" } as any);
    expect(dbMock.listAuditLogs).toHaveBeenCalledTimes(1);
    expect(dbMock.listAuditLogs).toHaveBeenCalledWith("demo-church", 40);
  });
});
