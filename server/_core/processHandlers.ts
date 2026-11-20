// Process-level fatal-error handling for the long-lived monolith server
// (`pnpm start` / `pnpm dev`, entry point server/_core/index.ts).
//
// Before this module, an unhandled promise rejection or uncaught exception
// killed the process with Node's default behaviour: a bare stack dump on
// stderr and an immediate exit, possibly mid-request, with no structured
// log line and no chance to drain in-flight work.
//
// Deliberately NOT installed in the Vercel serverless handler
// (server/_core/apiHandler.ts): a serverless function is short-lived and
// its lifecycle is owned by the platform — calling process.exit() there
// would kill the warm container, and the module can be loaded more than
// once per container. Vercel already surfaces uncaught errors per
// invocation; these handlers are for the process we own.

import type { Server } from "http";
import { closeDb } from "../db";

export interface ProcessHandlerOptions {
  /** Force exit if graceful shutdown has not finished by then (default 10s). */
  shutdownTimeoutMs?: number;
  /** Defaults to process.exit. Injected in tests so the suite never exits. */
  exit?: (code: number) => void;
  /** Defaults to console.error, matching the "[Prefix] message:" style the
   * server already uses ([Database], [LINE Login], [StorageProxy]). */
  logError?: (...args: unknown[]) => void;
  /** Defaults to closeDb(). Injected in tests. */
  closeDatabase?: () => Promise<void>;
}

const DEFAULT_SHUTDOWN_TIMEOUT_MS = 10_000;

/**
 * Installs `unhandledRejection` and `uncaughtException` handlers that log
 * the failure and shut the server down gracefully: stop accepting new
 * connections, wait for in-flight requests to finish, close the database
 * pool, then exit with code 1. A second fatal error arriving mid-shutdown
 * is logged but does not start a second shutdown. Returns an uninstall
 * function that removes the listeners (used by tests; the production
 * server never uninstalls).
 */
export function installProcessHandlers(
  server: Server,
  options: ProcessHandlerOptions = {}
): () => void {
  const {
    shutdownTimeoutMs = DEFAULT_SHUTDOWN_TIMEOUT_MS,
    exit = (code: number) => process.exit(code),
    logError = (...args: unknown[]) => console.error(...args),
    closeDatabase = closeDb,
  } = options;

  let shuttingDown = false;

  function shutdown(exitCode: number): void {
    if (shuttingDown) return;
    shuttingDown = true;
    logError("[Process] Shutting down gracefully...");
    // Idle keep-alive connections can hold server.close() open forever, so
    // force the exit rather than hanging a broken process. unref() so the
    // timer alone never keeps the process alive.
    const forceExit = setTimeout(() => {
      logError("[Process] Graceful shutdown timed out; forcing exit.");
      exit(exitCode);
    }, shutdownTimeoutMs);
    forceExit.unref();
    server.close(async () => {
      clearTimeout(forceExit);
      try {
        await closeDatabase();
      } catch (error) {
        // A failing pool close must not block the exit.
        logError("[Process] Failed to close database connections:", error);
      }
      exit(exitCode);
    });
  }

  function onUnhandledRejection(
    reason: unknown,
    _promise: Promise<unknown>
  ): void {
    // Passing the reason through to console.error prints an Error's message
    // and stack; a non-Error rejection value is printed as-is.
    logError("[Process] Unhandled promise rejection:", reason);
    shutdown(1);
  }

  function onUncaughtException(error: Error): void {
    logError("[Process] Uncaught exception:", error);
    shutdown(1);
  }

  process.on("unhandledRejection", onUnhandledRejection);
  process.on("uncaughtException", onUncaughtException);

  return () => {
    process.removeListener("unhandledRejection", onUnhandledRejection);
    process.removeListener("uncaughtException", onUncaughtException);
  };
}
