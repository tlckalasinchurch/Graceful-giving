/**
 * Split-gift saving against a real SQL engine (PGlite, in memory), through the
 * real migrations. Nothing here touches a configured database.
 *
 * PGlite runs one connection, so "simultaneous" requests are queued one after
 * the other. That proves a second request reads the key back after the first
 * commits. A race between two separate connections is decided by the unique
 * index `giving_submissions_key_uniq`, which these tests do not exercise: it
 * needs a server Postgres, and none was available for this run.
 */
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createOfferingsBatch, type OfferingBatchInput } from "./db";
import { SubmissionKeyReuseError } from "./ledgerGuards";

const CHURCH = "test-batch";
const USER = 7;

let pg: PGlite;
let db: ReturnType<typeof drizzle>;
let fundId: number;

const run = (input: OfferingBatchInput, userId = USER) =>
  createOfferingsBatch(input, userId, CHURCH, db as never);

async function scalar<T>(query: string): Promise<T> {
  const result = await pg.query<{ v: T }>(query);
  return result.rows[0].v;
}

const balance = async () =>
  Number(
    await scalar<string>(
      `select balance::text as v from finance_accounts where id = ${fundId}`
    )
  );
const offeringCount = async () =>
  Number(
    await scalar<string>(
      `select count(*)::text as v from offerings where "churchId" = '${CHURCH}'`
    )
  );
const auditCount = async () =>
  Number(
    await scalar<string>(
      `select count(*)::text as v from audit_logs where "churchId" = '${CHURCH}' and entity = 'offering'`
    )
  );
const keyCount = async () =>
  Number(
    await scalar<string>(
      `select count(*)::text as v from giving_submissions where "churchId" = '${CHURCH}'`
    )
  );

function gift(
  key: string,
  overrides: Partial<OfferingBatchInput> = {}
): OfferingBatchInput {
  return {
    submissionKey: key,
    fundId,
    lines: [
      { category: "tithe", amount: 1000 },
      { category: "mission", amount: 250.5 },
    ],
    donorName: "สมชาย",
    donorMemberId: null,
    receiptDate: new Date("2026-11-22T05:00:00Z"),
    method: "transfer",
    notes: null,
    ...overrides,
  };
}

beforeAll(async () => {
  pg = new PGlite();
  db = drizzle(pg);
  await migrate(db, {
    migrationsFolder: join(import.meta.dirname, "..", "drizzle"),
  });
}, 60_000);

afterAll(async () => {
  await pg.close();
});

beforeEach(async () => {
  await pg.exec(`
    delete from giving_submissions;
    delete from audit_logs;
    delete from offerings;
    delete from finance_accounts;
  `);
  const inserted = await pg.query<{ id: number }>(
    `insert into finance_accounts ("churchId","name","balance") values ('${CHURCH}','กองทุนทั่วไป', 500) returning id`
  );
  fundId = inserted.rows[0].id;
});

describe("createOfferingsBatch", () => {
  it("saves every line, adds the total to the fund once, and audits each line", async () => {
    const result = await run(gift("key-success-1"));

    expect(result.replayed).toBe(false);
    expect(result.ids).toHaveLength(2);
    expect(await offeringCount()).toBe(2);
    expect(await balance()).toBe(500 + 1000 + 250.5);
    expect(await auditCount()).toBe(2);
    expect(await keyCount()).toBe(1);
    const stored = await scalar<number[]>(
      `select "offeringIds" as v from giving_submissions where "submissionKey" = 'key-success-1'`
    );
    expect(stored).toEqual(result.ids);
  });

  it("rolls back the first line, the fund change, the audit and the key when the second line fails", async () => {
    const bad = gift("key-fail-1", {
      lines: [
        { category: "tithe", amount: 1000 },
        // Not a value of the offering_category enum: the database refuses it.
        { category: "not_a_category" as never, amount: 300 },
      ],
    });

    await expect(run(bad)).rejects.toThrow();

    expect(await offeringCount()).toBe(0);
    expect(await balance()).toBe(500);
    expect(await auditCount()).toBe(0);
    expect(await keyCount()).toBe(0);

    // The key was not burned: the same key saves once the gift is valid.
    const retry = await run(gift("key-fail-1"));
    expect(retry.replayed).toBe(false);
    expect(await offeringCount()).toBe(2);
    expect(await balance()).toBe(500 + 1250.5);
  });

  it("returns the first result when the same key is sent again", async () => {
    const first = await run(gift("key-retry-1"));
    const second = await run(gift("key-retry-1"));

    expect(second.replayed).toBe(true);
    expect(second.ids).toEqual(first.ids);
    expect(await offeringCount()).toBe(2);
    expect(await balance()).toBe(500 + 1250.5);
    expect(await auditCount()).toBe(2);
    expect(await keyCount()).toBe(1);
  });

  it("saves once when the same key arrives at the same time", async () => {
    const results = await Promise.all([
      run(gift("key-race-1")),
      run(gift("key-race-1")),
      run(gift("key-race-1")),
    ]);

    expect(results.filter(r => !r.replayed)).toHaveLength(1);
    expect(new Set(results.map(r => r.ids.join(","))).size).toBe(1);
    expect(await offeringCount()).toBe(2);
    expect(await balance()).toBe(500 + 1250.5);
    expect(await auditCount()).toBe(2);
    expect(await keyCount()).toBe(1);
  });

  it("refuses a used key carrying a different gift, and writes nothing", async () => {
    await run(gift("key-reuse-1"));

    await expect(
      run(
        gift("key-reuse-1", {
          lines: [{ category: "tithe", amount: 9999 }],
        })
      )
    ).rejects.toBeInstanceOf(SubmissionKeyReuseError);
    expect(await offeringCount()).toBe(2);
    expect(await balance()).toBe(500 + 1250.5);
  });

  it("refuses a used key sent by another person", async () => {
    await run(gift("key-owner-1"));

    await expect(run(gift("key-owner-1"), USER + 1)).rejects.toBeInstanceOf(
      SubmissionKeyReuseError
    );
    expect(await offeringCount()).toBe(2);
  });

  it("keeps different keys apart", async () => {
    await run(gift("key-a-0001"));
    await run(gift("key-b-0001"));

    expect(await offeringCount()).toBe(4);
    expect(await balance()).toBe(500 + 2 * 1250.5);
    expect(await keyCount()).toBe(2);
  });

  it("saves a one-line gift the same way", async () => {
    const result = await run(
      gift("key-single-1", { lines: [{ category: "cash", amount: 100 }] })
    );
    expect(result.ids).toHaveLength(1);
    expect(await balance()).toBe(600);
  });
});
