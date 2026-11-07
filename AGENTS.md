# AGENTS.md

Fullstack TypeScript church finance app (offerings, expenses, funds, budgets, withdrawal approvals, members, news/events). One codebase, two ways to serve: **Vercel** (static SPA from `dist/public` + serverless `api/index.js`, bundled from `server/_core/apiHandler.ts`) and a self-hosted **monolith** (`pnpm start` — Express serves API + SPA).

`CLAUDE.md` has the long version of this guidance. `README.md` (Thai) is a broad feature overview; `server/routers.ts` and `drizzle/schema.ts` are the source of truth for scope.

## Commands

Package manager is **pnpm** (pinned via `packageManager`).

```bash
pnpm install  # also applies the wouter patch from patches/
pnpm dev      # tsx watch server/_core/index.ts + Vite dev middleware
pnpm build    # vite build (dist/public) + esbuild server + esbuild api/index.js
pnpm check    # tsc --noEmit (project-wide; tsconfig excludes **/*.test.ts only)
pnpm test     # vitest run — server tests (node) AND client tests (jsdom)
pnpm format   # prettier --write .
pnpm ci       # pnpm check && pnpm test, with DATABASE_URL/POSTGRES_* blanked for the test run
pnpm db:push  # drizzle-kit generate && pnpm db:migrate (NOT drizzle-kit push)
pnpm db:migrate       # apply pending migrations to the env's database
pnpm db:migrate:deploy# production-build-only gate (see below)
```

Single test file: `pnpm exec vitest run server/updates.access.test.ts`. No lint script; `pnpm check` + `pnpm format` are the enforced checks.

## CI / deploy — Vercel is the only automation

- **No GitHub Actions.** `vercel.json` `buildCommand`: `pnpm run ci && pnpm run build && pnpm run db:migrate:deploy`. A typecheck/test failure blocks deploy; a migration failure fails the build and the old version stays live. Migrations run in one transaction.
- `pnpm ci` blanks `DATABASE_URL`, `POSTGRES_URL`, `POSTGRES_PRISMA_URL` **for the test run only** — Vercel's build env sets them and the integration suites would otherwise hit the live DB. Keep that guard intact.
- Preview and production **share one `DATABASE_URL`**; `db:migrate:deploy` migrates on **production builds only** (`scripts/migrate.ts --only-production` → `shouldMigrate` in `server/migrate.ts`). Previews skip migrating by design — an unmerged schema change is not applied until merge. `SKIP_DB_MIGRATE=1` is the emergency bypass. `DATABASE_URL_MIGRATE` (owner role) is for the production build only; without it the migration step fails on purpose.
- Schema changes: edit `drizzle/schema.ts`, then `pnpm exec drizzle-kit generate --name <what_changed>` — it needs `DATABASE_URL` set to **any** value but does not connect. Check the SQL holds only your change; never hand-edit it; commit the SQL **and** `drizzle/meta/` (`server/drizzle.sync.test.ts` fails otherwise). The app does **not** alter the schema on connect — migrations run at deploy time. Write them backward-compatible with the currently-live code (add a column, don't rename one). Read `drizzle/README.md` before touching the schema (`0000_baseline.sql` is idempotent; `drizzle/legacy/` is never run; `bank_signers`/`withdrawal_approvals` are owned by `app_user`, not the owner role).
- `.env.example` is stale (mentions Clerk; Clerk is not used). Real settings are enumerated in `server/_core/config.ts`, which logs names (never values) missing on cold start — check there first when a feature silently no-ops. Key ones: `LINE_LOGIN_CHANNEL_ID/SECRET`, `APP_URL`, `JWT_SECRET`, `OWNER_OPEN_ID` (signing in as this user creates an active SUPER_ADMIN; everyone else starts `pending`), `LINE_CHANNEL_SECRET/ACCESS_TOKEN` (slip webhook), `CRON_SECRET`, `GOOGLE_API_KEY`/`GEMINI_API_KEY` (slip OCR), `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY`.

## Environment

- No committed `.env`. `getDb()` resolves `DATABASE_URL` → `POSTGRES_URL` → `POSTGRES_PRISMA_URL`, with `prepare: false` (required by Supabase's transaction pooler). The app connects as `app_user`, which owns almost nothing — schema changes need `DATABASE_URL_MIGRATE` (owner role).
- **`getDb()` returns `null`, never throws** (one eager `SELECT 1` at init, then cached). All DB-backed functions degrade to no-op/empty reads when it's null — new functions in `db.ts` must handle that case.
- `CHURCH_ID` defaults to `demo-church` but is **test-only**. The schema supports multi-church (`churchId` on most tables) but the app runs single-tenant; every query defaults via `DEFAULT_CHURCH_ID`. Setting a `test-` tenant in production makes `server/db.ts` throw at module scope.
- Object storage is **Supabase** (REST fetch, not a client lib): `receipts` bucket public; `slips` bucket **private** — slip images are only ever served via 1-hour signed URLs (`getSlipSignedUrl`).

## Architecture

- `client/` — React 19 SPA, Vite root. Routes are a flat `wouter` `<Switch>` in `client/src/App.tsx`; pages live one file per route in `client/src/pages/`. Aliases `@` → `client/src`, `@shared` → `shared`.
- `server/` — Express + tRPC. Business logic at top level (`routers.ts`, `db.ts`, `storage.ts`); `server/_core/` is framework plumbing (auth, context, oauth, vite middleware, `apiHandler.ts`) — extend carefully, put features in `server/` top level.
- `shared/` — code imported by both sides; `shared/roles.ts` mirrors the server's role gates for the UI.
- Client and server are **not** independently deployable: `client/src/lib/trpc.ts` imports `AppRouter` from `server/routers.ts`.

### tRPC authorization

- **Two independent role concepts on `User`:** coarse `role` (`user`/`admin`) and fine `churchRole` (+ comma-separated secondary roles in `churchRoles`): `SUPER_ADMIN | PASTOR | TREASURER | DEACON | COUNTER | MEMBER`. **`role === "admin"` passes every `hasAnyRole` gate** — check both when adding a gated procedure.
- Gates are defined in `server/routers.ts` (`financeProcedure` = TREASURER/SUPER_ADMIN, `churchLeaderProcedure` = SUPER_ADMIN/PASTOR, `adminProcedure` = SUPER_ADMIN, plus `fundManageProcedure` etc.). Procedures layer on `server/_core/trpc.ts`.
- **Changing a gate means mirroring it** in `server/routers.ts` (server) and `shared/roles.ts` + `client/src/lib/routeAccess.ts` (client nav/guards) — the two copies drift only if you forget the other side.
- Donor names on offerings are masked to `ผู้ถวายนิรนาม` inside `db.listOfferings`/`getOfferingById` unless `showDonorNames` is passed (the router decides via `canViewDonorNames`). Never add an offering read path that bypasses this.
- Money: `z.number()` on input, persisted as `toFixed(2)` decimal strings matching Drizzle `decimal`.

### Testing

- Server tests call `appRouter.createCaller(ctx)` directly (no HTTP) with a fake `TrpcContext`; access-control tests assert thrown tRPC error codes. Client tests run in jsdom (`environmentMatchGlobs` in `vitest.config.ts`).
- Row-writing integration suites skip themselves unless `DATABASE_URL` is set (and need a migrated DB): `budgets.integration`, `counting.workflow`, `reports.integration`, `withdrawals.workflow` — expect skipped files locally.
- `server/test/setupTenant.ts` (vitest setupFile) assigns a unique `test-<uuid>` `CHURCH_ID` per file **only when `DATABASE_URL` is set**, early enough for `DEFAULT_CHURCH_ID`'s module-scope read; writers call `purgeTenant` (`server/test/tenant.ts`) in `afterAll` to drop the whole tenant. If adding a row-writing suite: scope every statement by `churchId` and inherit this mechanism.

## Local tooling quirks

- `vite.config.ts` has Manus-only dev plugins (`vite-plugin-manus-runtime`, a `.manus-logs/` debug collector) — dev-only, not dead code; don't remove them.
- `pnpm.patchedDependencies` patches `wouter@3.7.1`; `pnpm.overrides` pins tailwindcss's nested `nanoid` (see `patches/`). Check both when upgrading either package.
- `@aws-sdk/client-s3` / `s3-request-presigner` are in `package.json` but unused — storage goes through Supabase REST.
