import { afterAll, describe, expect, it, vi } from "vitest";
import { DEFAULT_CHURCH_ID, listAuditLogs, createAuditLog } from "./db";

// This file proves the no-database behaviour. `pnpm run ci` points
// DATABASE_URL at an in-memory PGlite database, so pin the database URLs off
// here — the assertions below are about having no database, not about the CI
// database — and restore them afterwards so no other file in the worker sees
// the stub.
vi.stubEnv("DATABASE_URL", "");
vi.stubEnv("POSTGRES_URL", "");
vi.stubEnv("POSTGRES_PRISMA_URL", "");
afterAll(() => vi.unstubAllEnvs());

describe("audit DB operations outside a live database", () => {
  it("degrades gracefully to empty array when database is not connected", async () => {
    // When DATABASE_URL is not set, getDb() returns null and listAuditLogs returns []
    const rows = await listAuditLogs(DEFAULT_CHURCH_ID, 20);
    expect(rows).toEqual([]);
  });

  it("accepts default churchId when omitted", async () => {
    const rows = await listAuditLogs();
    expect(rows).toEqual([]);
  });

  it("throws expected error when trying to insert without database", async () => {
    await expect(
      createAuditLog({
        userId: 1,
        action: "TEST_ACTION",
        entity: "test",
      })
    ).rejects.toThrow("Database is not available");
  });
});
