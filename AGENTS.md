# AGENTS.md

Fullstack TypeScript church finance app (offerings, expenses, funds, budgets, withdrawal approvals, members, news/events). One deployable Node process: Express serves the tRPC API and the built React SPA.

**Note:** `CLAUDE.md` has a longer version of this guidance. `README.md` documents an earlier milestone ("news & events" only) and underestimates scope — trust `server/routers.ts` and `drizzle/schema.ts` instead.

## Commands

Package manager is **pnpm** (pinned via `packageManager`).

```bash
pnpm dev     # tsx watch server/_core/index.ts + Vite middleware for client
pnpm check   # tsc --noEmit (project-wide; tsconfig excludes *.test.ts)
pnpm test    # vitest run — includes ONLY server/**/*.test.ts; client tests not wired up
pnpm format  # prettier --write .
pnpm ci      # pnpm check && pnpm test, with DATABASE_URL/POSTGRES_* blanked
pnpm db:push # drizzle-kit generate && pnpm db:migrate — needs a real DATABASE_URL
pnpm db:migrate # apply pending migrations to the database in the environment
```

Single test file: `pnpm exec vitest run server/updates.access.test.ts`.

There is no lint script; typecheck + prettier are the enforced checks.

## CI / deploy gotchas

- **No GitHub Actions.** `vercel.json` sets `buildCommand` to `pnpm run ci && pnpm run build && pnpm run db:migrate:deploy`, so typecheck or test failures block deploy, and the last step migrates the database on production builds only.
- `pnpm ci` deliberately **blanks `DATABASE_URL`, `POSTGRES_URL`, `POSTGRES_PRISMA_URL`**: Vercel build env sets them, and integration suites would otherwise run against the live DB. Keep that guard intact.
- Schema changes: edit `drizzle/schema.ts`, then `pnpm db:push` (generate + apply). Never hand-write migration SQL. The app does not change the schema when it connects; migrations run at deploy time, on production builds only. Read `drizzle/README.md` first.

## Environment

- No committed `.env`. DB env resolution (in `getDb()`): `DATABASE_URL` → `POSTGRES_URL` → `POSTGRES_PRISMA_URL`, with `prepare: false` (required by transaction poolers). Production DB is **Supabase Postgres** behind its transaction pooler. The app connects as `app_user`, which does not own most tables, so migrations need `DATABASE_URL_MIGRATE` (the owner role). Production and preview share one `DATABASE_URL`.
- **`getDb()` returns `null` (never throws)** when no/unreachable DB; all DB-backed functions degrade to no-op/empty reads. Handle the null case in new `db.ts` functions.
- `CHURCH_ID` defaults to `demo-church` but is **test-only** — the suite sets `test-<uuid>` tenants per file. Never set it on a deployment; `db.ts` throws if a `test-` tenant reaches production code paths.
- Object storage is also **Supabase**: `receipts` bucket public, `slips` bucket private — slip images only served via 1-hour signed URLs (`getSlipSignedUrl`).

## Architecture

- `client/` — React 19 SPA, Vite root; aliases `@` → `client/src`, `@shared` → `shared`. Routes are a flat `wouter` `<Switch>` in `client/src/App.tsx`; pages live one-file-per-route in `client/src/pages/`.
- `server/` — domain logic at top level (`routers.ts`, `db.ts`, `storage.ts`); `server/_core/` is framework plumbing (auth, context, oauth, vite middleware) — extend carefully, put business features in `server/` top level.
- `shared/` — client+server shared constants, errors, cookie/OAuth helpers.
- Client and server are NOT independently deployable: `client/src/lib/trpc.ts` imports `AppRouter` types directly from `server/routers.ts`.

### tRPC authorization

Procedure tiers layered on `server/_core/trpc.ts`: `publicProcedure`, `protectedProcedure`, `adminProcedure`, `financeProcedure` (admin or TREASURER/SUPER_ADMIN), `churchLeaderProcedure` (admin or SUPER_ADMIN/PASTOR). **Two independent role concepts on `User`:** coarse `role` (`user`/`admin`) for content management, fine `churchRole` for finances — check both when gating.

- Donor names on offerings are filtered in `db.listOfferings` via `canViewDonorNames`, not just at the router — never add an offering read path that bypasses it.
- Money: `z.number()` in inputs, persisted as decimal strings (`amount.toFixed(2)`) matching Drizzle `decimal` columns.

### Testing

Tests call `appRouter.createCaller(context)` directly (no HTTP) with a fake `TrpcContext`; access-control tests assert thrown tRPC error codes. `server/test/setupTenant.ts` (vitest setupFile) assigns a unique `test-<uuid>` tenant per file and purges it afterwards. Suites that write rows (`counting.workflow`, `reports.integration`) skip unless `DATABASE_URL` is set — expect skipped files locally. If adding a row-writing suite, scope all statements by `churchId` and inherit the tenant mechanism.

## Local tooling quirks

- `vite.config.ts` has Manus-only dev plugins (`vite-plugin-manus-runtime`, `.manus-logs/` debug collector) — dev-only, not dead code; don't remove them.
- `pnpm.patchedDependencies` patches `wouter@3.7.1`; `pnpm.overrides` pins `tailwindcss`'s nested `nanoid`. Check both when upgrading either package.
