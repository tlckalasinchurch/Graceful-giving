/**
 * The order in which the runner takes its lock. A real concurrent run needs a
 * real Postgres, so this checks the order with stand-ins for the driver. (The
 * same behavior was also run against Postgres 18 with 2 to 6 runners at once.)
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const events: string[] = [];
let lockFails = false;

vi.mock("postgres", () => ({
  default: () => ({
    begin: async (fn: (tx: unknown) => Promise<void>) => {
      events.push("begin");
      const tx = {
        unsafe: async (query: string) => {
          if (query.includes("pg_advisory_xact_lock")) {
            events.push("lock");
            if (lockFails) {
              throw Object.assign(
                new Error("canceling statement due to lock timeout"),
                {
                  code: "55P03",
                }
              );
            }
          } else if (query.includes("lock_timeout = '")) {
            events.push(`timeout ${query.match(/'(\d+)ms'/)![1]}`);
          } else if (query.includes("lock_timeout = 0")) {
            events.push("timeout off");
          }
          return [];
        },
      };
      try {
        return await fn(tx);
      } finally {
        events.push("transaction ends");
      }
    },
    unsafe: async () => [],
    end: async () => {
      events.push("connection closed");
    },
  }),
}));
vi.mock("drizzle-orm/postgres-js", () => ({ drizzle: () => ({}) }));
vi.mock("drizzle-orm/postgres-js/migrator", () => ({
  migrate: async () => {
    events.push("migrate");
  },
}));

import { runMigrations } from "./migrate";

beforeEach(() => {
  events.length = 0;
  lockFails = false;
});

describe("runMigrations lock", () => {
  it("takes the lock before it migrates, and keeps it until the migration is done", async () => {
    await runMigrations({ url: "postgres://x", lockWaitMs: 5000 });
    expect(events.slice(0, 6)).toEqual([
      "begin",
      "timeout 5000",
      "lock",
      "timeout off",
      "migrate",
      "transaction ends",
    ]);
  });

  it("closes both connections when it is done", async () => {
    await runMigrations({ url: "postgres://x" });
    expect(events.filter(e => e === "connection closed")).toHaveLength(2);
  });

  it("does not migrate when another runner holds the lock too long", async () => {
    lockFails = true;
    await expect(
      runMigrations({ url: "postgres://x", lockWaitMs: 2000 })
    ).rejects.toThrow(
      /Another migration has been running for more than 2 seconds/
    );
    expect(events).not.toContain("migrate");
    expect(events.filter(e => e === "connection closed")).toHaveLength(2);
  });
});
