import { describe, expect, it, vi, beforeEach } from "vitest";
import type { Request, Response } from "express";
import { registerStorageProxy } from "./_core/storageProxy";
import { sdk } from "./_core/sdk";
import { ENV } from "./_core/env";

describe("storageProxy scope & key validation", () => {
  let handler: (req: Request, res: Response) => Promise<void>;
  let mockRes: {
    statusCode: number;
    sentText: string;
    status: (code: number) => any;
    send: (body: string) => any;
    redirect: (code: number, url: string) => any;
    set: (name: string, val: string) => any;
  };

  beforeEach(() => {
    vi.resetAllMocks();
    vi.spyOn(sdk, "authenticateRequest").mockResolvedValue({
      id: 1,
      openId: "line:U123",
      email: null,
      name: "Test",
      loginMethod: "line",
      role: "user",
      churchRole: "MEMBER",
      status: "active",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    } as any);

    mockRes = {
      statusCode: 200,
      sentText: "",
      status(code: number) {
        this.statusCode = code;
        return this;
      },
      send(body: string) {
        this.sentText = body;
        return this;
      },
      redirect: vi.fn(),
      set: vi.fn(),
    };

    const mockApp = {
      get: (path: string, h: any) => {
        if (path === "/manus-storage/*") handler = h;
      },
    };
    registerStorageProxy(mockApp as any);
  });

  it("refuses key with directory traversal (..)", async () => {
    const req = {
      params: { 0: "receipts/../../etc/passwd" },
    } as unknown as Request;
    await handler(req, mockRes as unknown as Response);
    expect(mockRes.statusCode).toBe(400);
    expect(mockRes.sentText).toBe("Invalid storage key");
  });

  it("refuses key with backslashes", async () => {
    const req = {
      params: { 0: "receipts\\windows\\file.jpg" },
    } as unknown as Request;
    await handler(req, mockRes as unknown as Response);
    expect(mockRes.statusCode).toBe(400);
    expect(mockRes.sentText).toBe("Invalid storage key");
  });

  it("refuses key with leading slash", async () => {
    const req = { params: { 0: "/root/file.jpg" } } as unknown as Request;
    await handler(req, mockRes as unknown as Response);
    expect(mockRes.statusCode).toBe(400);
    expect(mockRes.sentText).toBe("Invalid storage key");
  });

  it("refuses key with illegal characters", async () => {
    const req = { params: { 0: "receipts/file$%.jpg" } } as unknown as Request;
    await handler(req, mockRes as unknown as Response);
    expect(mockRes.statusCode).toBe(400);
    expect(mockRes.sentText).toBe("Invalid storage key");
  });

  it("refuses missing key", async () => {
    const req = { params: { 0: "" } } as unknown as Request;
    await handler(req, mockRes as unknown as Response);
    expect(mockRes.statusCode).toBe(400);
    expect(mockRes.sentText).toBe("Missing storage key");
  });

  it("returns 404 when forge storage backend is not configured", async () => {
    ENV.forgeApiUrl = "";
    ENV.forgeApiKey = "";
    const req = {
      params: { 0: "receipts/valid-name.jpg" },
    } as unknown as Request;
    await handler(req, mockRes as unknown as Response);
    expect(mockRes.statusCode).toBe(404);
    expect(mockRes.sentText).toBe("Storage endpoint not found");
  });
});
