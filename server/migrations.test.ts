/**
 * Runs the real migrations against an in-memory Postgres (PGlite).
 *
 * The app no longer creates its schema when it connects, so these tests are
 * what proves the migrations build the schema the code expects, and that they
 * bring an older database up to date without breaking it.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { afterEach, describe, expect, it } from "vitest";

const folder = join(import.meta.dirname, "..", "drizzle");
const snapshot = JSON.parse(
  readFileSync(join(folder, "meta", "0000_snapshot.json"), "utf8")
) as {
  tables: Record<
    string,
    {
      name: string;
      columns: Record<string, { name: string; type: string }>;
      indexes: Record<string, { name: string }>;
    }
  >;
  enums: Record<string, { name: string; values: string[] }>;
};
const baselineStatements = readFileSync(
  join(folder, "0000_baseline.sql"),
  "utf8"
)
  .split("--> statement-breakpoint")
  .map(s => s.trim())
  .filter(Boolean);

const open: PGlite[] = [];
async function newDb() {
  const pg = new PGlite();
  open.push(pg);
  return pg;
}
afterEach(async () => {
  while (open.length) await open.pop()!.close();
});

const columnsOf = async (pg: PGlite) =>
  new Set(
    (
      await pg.query<{ t: string; c: string }>(
        `select table_name as t, column_name as c from information_schema.columns where table_schema='public'`
      )
    ).rows.map(r => `${r.t}.${r.c}`)
  );
const indexesOf = async (pg: PGlite) =>
  new Set(
    (
      await pg.query<{ n: string }>(
        `select indexname as n from pg_indexes where schemaname='public'`
      )
    ).rows.map(r => r.n)
  );
const enumValues = async (pg: PGlite, name: string) =>
  (
    await pg.query<{ v: string }>(
      `select e.enumlabel as v from pg_type t join pg_enum e on e.enumtypid=t.oid where t.typname='${name}'`
    )
  ).rows.map(r => r.v);

const expectedColumns = Object.values(snapshot.tables).flatMap(t =>
  Object.values(t.columns).map(c => `${t.name}.${c.name}`)
);
const expectedIndexes = Object.values(snapshot.tables).flatMap(t =>
  Object.values(t.indexes).map(i => i.name)
);

describe("migrations on a new database", () => {
  it("create every table, column, index and enum value the schema describes", async () => {
    const pg = await newDb();
    await migrate(drizzle(pg), { migrationsFolder: folder });

    const columns = await columnsOf(pg);
    expect(expectedColumns.length).toBeGreaterThan(300);
    expect(expectedColumns.filter(c => !columns.has(c))).toEqual([]);

    const indexes = await indexesOf(pg);
    expect(expectedIndexes).toContain("offerings_ref_active_uniq");
    expect(expectedIndexes.filter(i => !indexes.has(i))).toEqual([]);

    for (const e of Object.values(snapshot.enums)) {
      expect((await enumValues(pg, e.name)).sort()).toEqual(
        [...e.values].sort()
      );
    }
  }, 60_000);

  it("can run again without error or change", async () => {
    const pg = await newDb();
    const db = drizzle(pg);
    await migrate(db, { migrationsFolder: folder });
    const before = [...(await columnsOf(pg))].sort();
    await migrate(db, { migrationsFolder: folder });
    expect([...(await columnsOf(pg))].sort()).toEqual(before);
    const recorded = await pg.query(
      `select 1 from drizzle."__drizzle_migrations"`
    );
    expect(recorded.rows).toHaveLength(1);
  }, 60_000);

  it("enforce the financial integrity indexes", async () => {
    const pg = await newDb();
    await migrate(drizzle(pg), { migrationsFolder: folder });
    const offering = (ref: string, status: string) =>
      pg.exec(
        `insert into offerings ("churchId","amount","reference","status","receiptDate","recordedBy") values ('c1', 100, '${ref}', '${status}', now(), 1);`
      );
    await offering("REF-1", "active");
    await expect(offering("REF-1", "active")).rejects.toThrow(
      /offerings_ref_active_uniq/
    );
    // A voided offering may share the reference.
    await expect(offering("REF-1", "voided")).resolves.toBeDefined();
  }, 60_000);
});

describe("the baseline on a database that is behind", () => {
  it("adds back a missing column, a missing index and a missing enum value", async () => {
    const pg = await newDb();
    await migrate(drizzle(pg), { migrationsFolder: folder });

    // Make it look like a database that missed several releases.
    await pg.exec(`alter table church_profiles drop column "promptPayId";
      alter table line_slips drop column "declaredAmount";
      alter table users drop column "status";
      drop index bank_records_withdrawal_uniq;
      alter table bank_records drop column "withdrawalRequestId";`);
    expect(await columnsOf(pg)).not.toContain("church_profiles.promptPayId");

    for (const stmt of baselineStatements) await pg.exec(stmt);

    const columns = await columnsOf(pg);
    expect(columns).toContain("church_profiles.promptPayId");
    expect(columns).toContain("line_slips.declaredAmount");
    expect(columns).toContain("users.status");
    expect(columns).toContain("bank_records.withdrawalRequestId");
    expect(await indexesOf(pg)).toContain("bank_records_withdrawal_uniq");
  }, 60_000);

  it("fills a new NOT NULL column with its default on a table that has rows", async () => {
    const pg = await newDb();
    await migrate(drizzle(pg), { migrationsFolder: folder });
    await pg.exec(`insert into users ("openId") values ('line:u1');
      alter table users drop column "status";`);
    for (const stmt of baselineStatements) await pg.exec(stmt);
    const rows = await pg.query<{ status: string }>(`select status from users`);
    expect(rows.rows).toEqual([{ status: "active" }]);
  }, 60_000);

  it("adds enum values that an older database lacks, and keeps its data", async () => {
    const pg = await newDb();
    // The enums as they were before later releases, with a row that uses one.
    await pg.exec(`create type "public"."bank_record_type" as enum ('transfer_in', 'cash_deposit');
      create type "public"."withdrawal_status" as enum ('pending', 'approved', 'rejected', 'disbursed');
      create table withdrawal_requests (id serial primary key, "churchId" varchar(64) not null,
        amount numeric(15,2) not null, status "public"."withdrawal_status" not null default 'pending');
      insert into withdrawal_requests ("churchId", amount) values ('c1', 500);`);

    await migrate(drizzle(pg), { migrationsFolder: folder });

    expect((await enumValues(pg, "bank_record_type")).sort()).toEqual([
      "cash_deposit",
      "other_in",
      "other_out",
      "transfer_in",
      "withdrawal",
    ]);
    expect(await enumValues(pg, "withdrawal_status")).toContain("cancelled");
    const rows = await pg.query<{ amount: string; status: string }>(
      `select amount, status from withdrawal_requests`
    );
    expect(rows.rows).toEqual([{ amount: "500.00", status: "pending" }]);
    // The columns the old table lacked are now there.
    expect(await columnsOf(pg)).toContain("withdrawal_requests.cancelledAt");
  }, 60_000);
});

describe("the baseline run by a role that does not own every table", () => {
  /**
   * Production: the app role owns two tables it made itself, and the role that
   * migrates (postgres) owns the rest and cannot act as the app role.
   */
  async function productionLikeOwners() {
    const pg = await newDb();
    await migrate(drizzle(pg), { migrationsFolder: folder });
    await pg.exec(`create role app_user nologin; create role migrator nologin;
      grant usage, create on schema public to migrator;
      do $$ declare r record; begin
        for r in select tablename from pg_tables where schemaname = 'public' loop
          execute format('alter table %I owner to %s', r.tablename,
            case when r.tablename in ('bank_signers', 'withdrawal_approvals')
                 then 'app_user' else 'migrator' end);
        end loop;
        for r in select typname from pg_type
                 where typtype = 'e' and typnamespace = 'public'::regnamespace loop
          execute format('alter type %I owner to migrator', r.typname);
        end loop;
      end $$;`);
    return pg;
  }

  it("is refused by Postgres even for IF NOT EXISTS on a column that exists", async () => {
    const pg = await productionLikeOwners();
    await pg.exec(`set role migrator`);
    // This is why the baseline looks first and changes a table only if needed.
    await expect(
      pg.exec(
        `alter table bank_signers add column if not exists "churchId" varchar(64)`
      )
    ).rejects.toThrow(/must be owner/i);
  }, 60_000);

  it("still runs, and brings the tables it owns up to date", async () => {
    const pg = await productionLikeOwners();
    await pg.exec(`alter table church_profiles drop column "promptPayId";
      alter table line_slips drop column "declaredAmount";
      drop index bank_records_withdrawal_uniq;`);

    await pg.exec(`set role migrator`);
    for (const stmt of baselineStatements) await pg.exec(stmt);
    await pg.exec(`reset role`);

    const columns = await columnsOf(pg);
    expect(columns).toContain("church_profiles.promptPayId");
    expect(columns).toContain("line_slips.declaredAmount");
    expect(await indexesOf(pg)).toContain("bank_records_withdrawal_uniq");
  }, 60_000);
});
