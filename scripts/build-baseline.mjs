#!/usr/bin/env node
/**
 * Builds drizzle/0000_baseline.sql, drizzle/meta/0000_snapshot.json and
 * drizzle/meta/_journal.json from drizzle/schema.ts.
 *
 * Run it only when you mean to re-baseline: the snapshot id and the journal
 * timestamp change on every run. For an ordinary schema change use
 * `drizzle-kit generate` instead (see drizzle/README.md).
 *
 * drizzle-kit writes plain CREATE statements. The baseline must be safe on a
 * database that already has some of the schema, so this script turns them into
 * a script that can run twice, and it adds what is needed to bring an older
 * database up to date:
 *   1. enum types        created only if missing
 *   2. tables            created only if missing
 *   3. enum values       added if missing
 *   4. columns           added if missing (a NOT NULL column only when it has a
 *                        default, so a table with rows is never refused)
 *   5. indexes           created only if missing
 *
 * Steps 3 to 5 look for the object first and change the table only when it is
 * missing. Postgres checks that the role owns a table before it checks whether
 * a column or index exists, so a plain IF NOT EXISTS would fail on a table the
 * migrating role does not own, even when nothing needs changing. Production has
 * two tables owned by another role. The look-ups read pg_catalog, not
 * information_schema, because information_schema hides a table the role has no
 * privilege on, which would make a complete table look empty.
 *
 * Usage: node scripts/build-baseline.mjs
 */
import { spawnSync } from "node:child_process";
import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(import.meta.url), "..", "..");
const BREAKPOINT = "--> statement-breakpoint";

const work = mkdtempSync(join(tmpdir(), "baseline-"));
try {
  mkdirSync(join(work, "drizzle"));
  writeFileSync(
    join(work, "drizzle.config.ts"),
    `import { defineConfig } from "drizzle-kit";
export default defineConfig({
  schema: ${JSON.stringify(join(root, "drizzle", "schema.ts"))},
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url: "postgres://u:p@127.0.0.1:1/none" },
});
`
  );
  const run = spawnSync(
    join(root, "node_modules", ".bin", "drizzle-kit"),
    ["generate", "--config", "./drizzle.config.ts", "--name", "baseline"],
    {
      cwd: work,
      env: { ...process.env, DATABASE_URL: "postgres://u:p@127.0.0.1:1/none" },
      encoding: "utf8",
    }
  );
  if (run.status !== 0) {
    console.error(run.stdout, run.stderr);
    process.exit(run.status ?? 1);
  }

  const raw = readFileSync(join(work, "drizzle", "0000_baseline.sql"), "utf8");
  const snapshot = JSON.parse(
    readFileSync(join(work, "drizzle", "meta", "0000_snapshot.json"), "utf8")
  );

  const statements = raw
    .split(BREAKPOINT)
    .map(s => s.trim())
    .filter(Boolean);

  const types = [];
  const tables = [];
  const indexes = [];
  for (const stmt of statements) {
    if (/^CREATE TYPE /.test(stmt)) {
      types.push(
        `DO $$ BEGIN ${stmt.replace(/;$/, "")}; EXCEPTION WHEN duplicate_object THEN null; END $$;`
      );
    } else if (/^CREATE TABLE /.test(stmt)) {
      tables.push(
        stmt.replace(/^CREATE TABLE /, "CREATE TABLE IF NOT EXISTS ")
      );
    } else if (/^CREATE (UNIQUE )?INDEX /.test(stmt)) {
      // Guarded, not IF NOT EXISTS: Postgres checks that the role owns the
      // table before it checks whether the index exists.
      const name = stmt.match(/^CREATE (?:UNIQUE )?INDEX "([^"]+)"/)[1];
      indexes.push(
        `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = '${name}') THEN ${stmt.replace(/;$/, "")}; END IF; END $$;`
      );
    } else {
      throw new Error(
        `Unexpected statement in the generated baseline:\n${stmt}`
      );
    }
  }

  const enumValues = [];
  for (const e of Object.values(snapshot.enums)) {
    for (const value of e.values) {
      const v = value.replace(/'/g, "''");
      enumValues.push(
        `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid JOIN pg_namespace n ON n.oid = t.typnamespace WHERE n.nspname = '${e.schema}' AND t.typname = '${e.name}' AND e.enumlabel = '${v}') THEN ALTER TYPE "${e.schema}"."${e.name}" ADD VALUE '${v}'; END IF; END $$;`
      );
    }
  }

  const columns = [];
  for (const table of Object.values(snapshot.tables)) {
    for (const col of Object.values(table.columns)) {
      // A primary key column (serial) exists in any table that exists.
      if (col.primaryKey || /serial/i.test(col.type)) continue;
      const type = col.typeSchema
        ? `"${col.typeSchema}"."${col.type}"`
        : col.type;
      const hasDefault = col.default !== undefined && col.default !== null;
      columns.push(
        `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_attribute a JOIN pg_class c ON c.oid = a.attrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relname = '${table.name}' AND a.attname = '${col.name}' AND a.attnum > 0 AND NOT a.attisdropped) THEN ` +
          `ALTER TABLE "${table.name}" ADD COLUMN "${col.name}" ${type}` +
          `${hasDefault ? ` DEFAULT ${col.default}` : ""}` +
          `${col.notNull && hasDefault ? " NOT NULL" : ""}; END IF; END $$;`
      );
    }
  }

  const header = `-- Baseline of the whole schema. Generated by scripts/build-baseline.mjs from
-- drizzle/schema.ts. Do not edit it by hand.
--
-- It is safe to run on a new, empty database and on a database that already
-- has part or all of this schema. Every statement does nothing when its object
-- already exists, and missing columns, enum values and indexes are added.
-- A table is changed only when something is missing from it, so a role that does
-- not own a table can still run this when that table is complete.
-- Nothing is dropped or rewritten.
--
-- Section order: enum types, tables, enum values, columns, indexes.
`;
  const sql =
    header +
    [...types, ...tables, ...enumValues, ...columns, ...indexes]
      .map(s => s.trimEnd())
      .join(`\n${BREAKPOINT}\n`) +
    "\n";

  writeFileSync(join(root, "drizzle", "0000_baseline.sql"), sql);
  cpSync(
    join(work, "drizzle", "meta", "0000_snapshot.json"),
    join(root, "drizzle", "meta", "0000_snapshot.json")
  );
  cpSync(
    join(work, "drizzle", "meta", "_journal.json"),
    join(root, "drizzle", "meta", "_journal.json")
  );
  console.log(
    `Wrote the baseline: ${types.length} types, ${tables.length} tables, ` +
      `${enumValues.length} enum values, ${columns.length} columns, ${indexes.length} indexes.`
  );
} finally {
  rmSync(work, { recursive: true, force: true });
}
