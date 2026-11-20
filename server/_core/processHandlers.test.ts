// Tests for server/_core/processHandlers.ts. The handlers are exercised
// through real process.emit() calls with injected fakes for exit/logging/
// server-close/database-close, so the test process itself never exits.
import type { Server } from "http";
import { afterEach, describe, expect, it, vi } from "vitest";
import { installProcessHandlers } from "./processHandlers";

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

function setup() {
  let closeCallback: (() => void) | null = null;
  const server = {
    close: vi.fn((cb: () => void) => {
      closeCallback = cb;
    }),
  } as unknown as Server;
  const exit = vi.fn();
  const logError = vi.fn();
  const closeDatabase = vi.fn(async () => {});
  const uninstall = installProcessHandlers(server, {
    shutdownTimeoutMs: 50,
    exit,
    logError,
    closeDatabase,
  });
  return {
    server,
    exit,
    logError,
    closeDatabase,
    uninstall,
    invokeCloseCallback: () => closeCallback?.(),
  };
}

describe("installProcessHandlers", () => {
  let uninstall: (() => void) | null = null;

  afterEach(() => {
    uninstall?.();
    uninstall = null;
  });

  it("logs an unhandled rejection and shuts down gracefully, exiting 1", async () => {
    const t = setup();
    uninstall = t.uninstall;
    const reason = new Error("boom");
    process.emit("unhandledRejection", reason, Promise.resolve());
    expect(t.logError).toHaveBeenCalledWith(
      "[Process] Unhandled promise rejection:",
      reason,
    );
    expect(t.server.close).toHaveBeenCalledTimes(1);
    // Exit only after the HTTP server has drained and the pool is closed.
    expect(t.exit).not.toHaveBeenCalled();
    t.invokeCloseCallback();
    await sleep(0);
    expect(t.closeDatabase).toHaveBeenCalledTimes(1);
    expect(t.exit).toHaveBeenCalledTimes(1);
    expect(t.exit).toHaveBeenCalledWith(1);
  });

  it("logs an uncaught exception with its stack and exits 1", async () => {
    const t = setup();
    uninstall = t.uninstall;
    const error = new Error("fatal");
    process.emit("uncaughtException", error);
    expect(t.logError).toHaveBeenCalledWith(
      "[Process] Uncaught exception:",
      error,
    );
    expect(t.server.close).toHaveBeenCalledTimes(1);
    t.invokeCloseCallback();
    await sleep(0);
    expect(t.exit).toHaveBeenCalledWith(1);
  });

  it("logs a non-Error rejection value as-is", () => {
    const t = setup();
    uninstall = t.uninstall;
    process.emit("unhandledRejection", "string reason", Promise.resolve());
    expect(t.logError).toHaveBeenCalledWith(
      "[Process] Unhandled promise rejection:",
      "string reason",
    );
  });

  it("still exits when closing the database pool fails", async () => {
    const t = setup();
    uninstall = t.uninstall;
    const dbError = new Error("pool already closed");
    t.closeDatabase.mockRejectedValueOnce(dbError);
    process.emit("uncaughtException", new Error("fatal"));
    t.invokeCloseCallback();
    await sleep(0);
    expect(t.logError).toHaveBeenCalledWith(
      "[Process] Failed to close database connections:",
      dbError,
    );
    expect(t.exit).toHaveBeenCalledWith(1);
  });

  it("forces exit when the server never drains", async () => {
    const t = setup();
    uninstall = t.uninstall;
    process.emit("uncaughtException", new Error("fatal"));
    expect(t.server.close).toHaveBeenCalledTimes(1);
    // The close callback is never invoked; the shutdown timeout fires instead.
    await sleep(150);
    expect(t.exit).toHaveBeenCalledTimes(1);
    expect(t.exit).toHaveBeenCalledWith(1);
    expect(t.closeDatabase).not.toHaveBeenCalled();
  });

  it("ignores a second fatal error arriving mid-shutdown", () => {
    const t = setup();
    uninstall = t.uninstall;
    process.emit("uncaughtException", new Error("first"));
    process.emit("unhandledRejection", new Error("second"), Promise.resolve());
    expect(t.server.close).toHaveBeenCalledTimes(1);
    expect(t.logError).toHaveBeenCalledWith(
      "[Process] Unhandled promise rejection:",
      expect.any(Error),
    );
  });

  it("uninstall removes the listeners", () => {
    const before = process.listenerCount("unhandledRejection");
    const t = setup();
    expect(process.listenerCount("unhandledRejection")).toBe(before + 1);
    expect(process.listenerCount("uncaughtException")).toBeGreaterThan(0);
    t.uninstall();
    uninstall = null;
    expect(process.listenerCount("unhandledRejection")).toBe(before);
  });
});
