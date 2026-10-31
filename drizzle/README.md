# drizzle/

`schema.ts` is the source of truth for tables and columns. `meta/` holds the
snapshot drizzle-kit compares it with.

## Baseline

`0000_baseline.sql` and `meta/0000_snapshot.json` are a baseline taken when
`church_profiles.promptPayId` was added. The SQL file does nothing on purpose
(`SELECT 1`): every table already exists. The snapshot records the schema at
that point, so `pnpm exec drizzle-kit generate` writes only what changed since.

Before this baseline the journal knew only the first migration, so `generate`
wrote a file that recreated every table (14 `CREATE TABLE`, 8 `CREATE TYPE`)
and `migrate` failed on the first table that existed. That is why migrations
`0001` to `0009` were written by hand. Those files are kept in `legacy/` for
the record. They are not in the journal and are never run.

## Changing the schema

1. Edit `schema.ts`.
2. Run `pnpm exec drizzle-kit generate --name <what_changed>` (it needs
   `DATABASE_URL` set to any value; it does not connect). Check that the new
   file holds only your change.
3. Apply it with `pnpm exec drizzle-kit migrate` against the target database.
   That needs a real `DATABASE_URL`, and it is not part of the Vercel build.
   `pnpm db:push` runs steps 2 and 3 together.

## Open question: `server/schema_init.ts`

The app also runs `server/schema_init.ts` every time it connects. It creates
missing tables and adds missing columns with `IF NOT EXISTS`, and it is how a
new database gets its tables. The two paths can collide: a generated
`ADD COLUMN` has no `IF NOT EXISTS`, so it fails if `schema_init.ts` already
added the column. Until one path is retired, run `migrate` before the code that
needs the new column is deployed, and do not add the same column to both.
