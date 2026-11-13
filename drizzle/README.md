# drizzle/

`schema.ts` is the source of truth for tables, columns and indexes. `meta/`
holds the snapshot that `drizzle-kit generate` compares it with. The SQL files
here are the migrations, in the order of `meta/_journal.json`.

The app **does not change the schema when it connects**. Migrations run at
deploy time. (`server/schema_init.ts`, which used to add columns on every
connection, was removed. See "Why" below.)

## Changing the schema

1. Edit `schema.ts`. A new index goes in the table's index list, not in SQL.
2. Run `pnpm exec drizzle-kit generate --name <what_changed>`. It needs
   `DATABASE_URL` set to any value; it does not connect. Check that the new
   file holds only your change. Do not edit it by hand.
3. Commit the SQL file and the `meta/` files with the schema change.
   `server/drizzle.sync.test.ts` fails if you forget, and shows the missing SQL.
4. Deploy. The production build applies the migration (below). To apply it by
   hand, or to a test database, run `pnpm db:migrate`.

Write each migration so that the code running before the deploy still works
with it, for example add a column rather than rename one. The migration runs
after the build and before the new version goes live.

## How migrations run at deploy

The last step of the Vercel build is `pnpm db:migrate:deploy`
(`scripts/migrate.ts`, `server/migrate.ts`).

- **Production builds only.** A preview build skips it, because preview and
  production share one `DATABASE_URL`. A preview of an unmerged branch must not
  change the live schema. The cost: a preview of a branch that changes the
  schema runs against the old schema until the branch is merged.
- **It fails the build when it cannot migrate.** The old version then stays live.
  All pending migrations run in one transaction, so a failure leaves the
  database as it was.
- **It needs a role that owns the tables.** The app connects as `app_user`,
  which owns only the tables it made itself. Most tables belong to `postgres`,
  and changing a table needs the owner. Set `DATABASE_URL_MIGRATE` in Vercel,
  for the Production environment only, to a connection for the owner role.
  Without it the step falls back to `DATABASE_URL` and fails with a message that
  says so. With the Supabase pooler, use the transaction-mode URL for the
  `postgres` user. Do not give this value to the Preview environment.
- **Two builds at once take turns.** The runner holds a Postgres advisory lock
  (a transaction-level lock on its own connection) while it migrates. drizzle
  reads which migration ran last before it opens its own transaction, so
  without the lock two runners both see the same migrations as pending and the
  second can fail with duplicate-key errors. The second runner waits for the
  first, then finds nothing to do. It gives up after 2 minutes with a message.
  A transaction-level lock is safe behind the transaction pooler. A
  session-level lock is not, because the pooler hands the session to another
  client and the lock stays behind. A killed build releases the lock when its
  connection drops.
- **Emergency bypass.** Set `SKIP_DB_MIGRATE=1` to build without migrating.
- **Integrity indexes.** If a unique index that guards a financial rule cannot
  be created, because the table already holds duplicates, the log names the
  duplicate rows.

## Production state (2026-11-13)

The deploy step does **not** migrate production yet.

- `SKIP_DB_MIGRATE=1` is set on the Vercel Production environment. It was set
  on 2026-10-31, when the schema was applied by hand, because
  `DATABASE_URL_MIGRATE` was not set. Every production build logs
  `[migrate] Skipped`.
- Migrations `0001`–`0004` were applied to production by hand. The live schema
  matches `meta/_journal.json` up to `0004_slip_split_items`.
- The `drizzle.__drizzle_migrations` record was created on 2026-11-13 with one
  row per migration `0000`–`0004` (see "Recording migrations applied by hand"
  below). The app's own tables were not changed.

Until the steps below are done, a pull request that adds a migration deploys
**without** it. Do not merge one, or apply its SQL by hand before the deploy
and add its row to the record.

To turn the deploy step on, in the Vercel project `graceful-giving`:

1. Add `DATABASE_URL_MIGRATE` for **Production only**, as a Sensitive value:
   the Supabase transaction-pooler URL for the `postgres` role.
2. Delete `SKIP_DB_MIGRATE`.
3. Redeploy production. The build log must show
   `[migrate] Migrating with DATABASE_URL_MIGRATE.` and then
   `[migrate] Done. The database schema is up to date.`, with nothing applied.

Do step 1 before step 2. Without `DATABASE_URL_MIGRATE` the step connects as
the app role, which cannot create the record schema, and every production
build fails (the old version stays live).

## Recording migrations applied by hand

drizzle runs every migration whose journal `when` is newer than the newest
`created_at` in `drizzle.__drizzle_migrations`. If a migration was applied by
hand and its row is missing, the deploy step runs it again. Migrations after
the baseline are not written to run twice (`ADD VALUE` and `ADD COLUMN`
without `IF NOT EXISTS`), so the build fails, for example with
`enum label "cash" already exists`. The failure is safe: everything runs in
one transaction and rolls back. But no deploy succeeds until the record is
fixed.

Add the missing rows as the owner role (in Supabase, the SQL editor runs as
`postgres`). The hash is the SHA-256 of the SQL file and `created_at` is the
`when` of its journal entry. This prints the rows for every migration:

```bash
node -e 'const fs=require("fs"),c=require("crypto");for(const e of require("./drizzle/meta/_journal.json").entries)console.log(`(\x27${c.createHash("sha256").update(fs.readFileSync(`drizzle/${e.tag}.sql`)).digest("hex")}\x27, ${e.when}), -- ${e.tag}`)'
```

Then insert only the rows that are missing:

```sql
BEGIN;
CREATE SCHEMA IF NOT EXISTS "drizzle";
CREATE TABLE IF NOT EXISTS "drizzle"."__drizzle_migrations" (
  id SERIAL PRIMARY KEY, hash text NOT NULL, created_at bigint
);
INSERT INTO "drizzle"."__drizzle_migrations" (hash, created_at) VALUES
  -- rows printed above
;
COMMIT;
```

A failed deploy attempt creates the record table before its transaction, so
the table can exist and be empty. `IF NOT EXISTS` covers that case.

This procedure was rehearsed on 2026-11-13 against a copy of the production
schema (no rows) with the same role layout: the deploy step then finished
with `Done` and changed nothing, a new migration ran once, and two builds
started together took turns through the lock.

## Two tables belong to another role

`bank_signers` and `withdrawal_approvals` are owned by `app_user`, because the
old `schema_init.ts` created them while connected as the app. The `postgres`
role is a member of `app_user` but does not inherit its rights and cannot
`SET ROLE` to it. So `postgres` cannot alter those two tables. The baseline
copes: it changes a table only when something is missing from it, and both
tables are complete.

A future migration that alters either table will fail with
`must be owner of table`. Before writing one, give the owner role to `postgres`
or move the ownership, as a database admin. For example, on Postgres 16 and
later, `GRANT app_user TO postgres WITH INHERIT TRUE, SET TRUE;`. In the
2026-11-13 rehearsal this grant let the owner role alter `bank_signers`
without changing its owner. It has not been tried on the live database, and
it is not known whether Supabase's `postgres` role may run it.

## Files

- `0000_baseline.sql`: the whole schema as one script that is safe to run on a
  new database and on an older one. It adds what is missing and changes
  nothing else. Generated by `scripts/build-baseline.mjs`. Run that script only
  to re-baseline, never for an ordinary change.
- `legacy/`: SQL written by hand before the baseline. Not in the journal, never
  run. Kept as a record.

## Why `schema_init.ts` was removed

It created missing tables and added missing columns each time the app
connected. In production the app connects as a role that does not own most
tables, so its `ALTER TABLE` statements failed with only a warning in the log.
Sixteen columns, three enum values and one index were missing from the live
database while the code expected them. A deploy-time migration run by the
table owner replaces it, and it fails loudly instead.
