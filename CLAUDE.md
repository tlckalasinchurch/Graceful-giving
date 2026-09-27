# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Graceful-giving ("Grace-giving" / เกรซกิฟวิง) is a church financial management and member-communication system: offerings/tithes, expenses, funds, budgets, withdrawal approvals, ministries, members, and a news/events feed. Fullstack TypeScript, single deployable Node process (Express serves both the API and the built SPA).

The codebase is more feature-complete than `README.md` describes — the README documents an earlier "news & events" milestone only. Prefer reading `server/routers.ts` and `drizzle/schema.ts` over the README for current scope.

## Commands

Package manager is **pnpm** (see `packageManager` in `package.json`).

Standard scripts (`dev`, `build`, `start`, `check`, `format`) are in `package.json`.
The ones with non-obvious behavior:

```bash
pnpm install          # also applies the wouter patch via patches/
pnpm test             # vitest run (server/**/*.test.ts only, see vitest.config.ts)
pnpm ci               # pnpm check + pnpm test, with the DB env vars blanked (see below)
pnpm db:push          # drizzle-kit generate && drizzle-kit migrate (requires DATABASE_URL)
```

Run a single test file: `pnpm exec vitest run server/updates.access.test.ts`. Tests live under `server/` and are named `*.test.ts`; the vitest config only includes `server/**/*.test.ts` and `server/**/*.spec.ts` — client-side tests are not wired up.

There is no separate lint script; `pnpm check` (tsc) and `pnpm format` (prettier) are the enforced checks. `tsconfig.json` excludes `*.test.ts`.

**CI runs inside the Vercel build.** `vercel.json` sets `buildCommand` to `pnpm run ci && pnpm run build`, so a typecheck error or a failing test turns the PR check red and nothing deploys. There is no GitHub Actions workflow — runners cannot be allocated on this account, so Vercel is the only automation. `pnpm ci` blanks `DATABASE_URL`, `POSTGRES_URL` and `POSTGRES_PRISMA_URL` for the test run: Vercel's build environment sets them, and without the guard the integration suites below would run against the live database.

## Environment

No `.env` is committed. Required variables (read in `server/_core/env.ts`):

- `DATABASE_URL` — PostgreSQL connection string. Production points at **Neon** (provisioned through the Vercel integration, which also sets `POSTGRES_URL`, `DATABASE_URL_UNPOOLED`, `PG*` and friends). `getDb()` reads `DATABASE_URL`, then `POSTGRES_URL`, then `POSTGRES_PRISMA_URL`, and builds `drizzle-orm/postgres-js` + a `postgres` client with `prepare: false`, which any transaction pooler requires. If none is set — or the URL is unreachable (one eager `SELECT 1` runs at init) — `getDb()` returns `null` and every DB-backed function degrades to a no-op/empty read rather than throwing — keep this behavior in mind when adding new `db.ts` functions.
- `CHURCH_ID` — optional tenant override, defaulting to `demo-church`. **Only the test suite sets it.** `server/test/setupTenant.ts` assigns a unique `test-<uuid>` per test file so an integration run against a real database cannot touch application rows. `server/db.ts` throws at module scope if a `test-` tenant reaches production, so never set this on a deployment.
- `VITE_APP_ID`, `JWT_SECRET` (session cookie signing), `OAUTH_SERVER_URL`, `OWNER_OPEN_ID` (the openId that gets auto-promoted to `role: "admin"` on first upsert), `BUILT_IN_FORGE_API_URL`, `BUILT_IN_FORGE_API_KEY`.

## Architecture

### Directory layout and path aliases

- `client/` — Vite root. React 19 SPA, path alias `@` → `client/src`, `@shared` → `shared`, `@assets` → `attached_assets`.
- `server/` — Express + tRPC backend. Domain logic (`routers.ts`, `db.ts`, `storage.ts`) sits at the top of `server/`; framework plumbing (auth, context, vite dev middleware, oauth, the SDK client) lives under `server/_core/` — treat `_core` as scaffolding you extend carefully, not where new business features go.
- `shared/` — Code imported by both client and server: constants, error helpers, `shared/const.ts` (cookie name, OAuth state encode/decode, error message strings shared with the tRPC error codes on the client).
- `drizzle/` — `schema.ts` (source of truth for tables/types) and `relations.ts`, plus generated SQL migrations and `meta/` snapshots. Edit `schema.ts`, then run `pnpm db:push` to generate+apply migrations — do not hand-write migration SQL.

### Request flow

`server/_core/index.ts` boots one Express app: body parsing → storage proxy routes → OAuth routes (`server/_core/oauth.ts`) → tRPC router mounted at `/api/trpc` (`createExpressMiddleware`) → Vite dev middleware (development) or static file serving (production). Port selection auto-probes for a free port starting at `PORT`/3000.

Auth: `server/_core/context.ts` builds the tRPC context per-request by calling `sdk.authenticateRequest(req)` (reads/verifies the session cookie via `server/_core/sdk.ts`); failures just yield `user: null` rather than throwing, so public procedures keep working. The OAuth callback flow (`server/_core/oauth.ts`) exchanges a code for a token, upserts the user (`db.upsertUser`, which promotes `OWNER_OPEN_ID` to `admin`), mints a session token, and sets the `app_session_id` cookie. The OAuth `state` param carries a CSRF nonce bound to a `__Host-oauth_state` cookie — see the comments in `shared/const.ts`/`server/_core/oauth.ts` before touching this flow.

### tRPC API (`server/routers.ts`)

Single `appRouter` composed of sub-routers by domain (see the top of `routers.ts`); note `updates` is the legacy news/events router, and `system` lives in `server/_core/systemRouter.ts`. Client consumes it type-safely via `@trpc/react-query` (`client/src/lib/trpc.ts` imports `AppRouter` directly from `server/routers.ts` — client and server are not independently deployable packages).

Procedure layering, all defined in `routers.ts` on top of the base `publicProcedure`/`protectedProcedure` from `server/_core/trpc.ts`:
- `adminProcedure` — `user.role === "admin"`
- `financeProcedure` — admin or `churchRole` in `TREASURER`/`SUPER_ADMIN` (see `canManageFinance`)
- `churchLeaderProcedure` — admin or `churchRole` in `SUPER_ADMIN`/`PASTOR` (see `canManageChurchSettings`)

Donor names on offerings are only ever returned when `canViewDonorNames(ctx.user)` is true (same check as `financeProcedure`) — this filtering happens in `db.listOfferings`, not just at the router layer, so don't bypass it when adding new offering read paths. All mutation inputs are validated with Zod schemas inline in `routers.ts`; money fields are `z.number()` on input but persisted as decimal strings (`amount.toFixed(2)`) matching the Drizzle `decimal` column type.

There are two authorization concepts on `User` (`drizzle/schema.ts`): the coarse `role` (`user`/`admin`, used for admin-only content management like `updates.*`) and the finer-grained `churchRole` (`SUPER_ADMIN`/`PASTOR`/`TREASURER`/`MEMBER`, used for financial permissions). Both are checked independently in the permission helpers — read both when adding a new gated procedure.

### Data layer

`server/db.ts` holds all Drizzle queries as plain exported async functions (no repository classes/ORM abstraction beyond Drizzle itself). `getDb()` lazily creates a single `drizzle(...)` instance and caches it in module scope; it returns `null` (never throws) when no connection string is set, so callers must handle the `null`/empty case. `DEFAULT_CHURCH_ID` resolves to `process.env.CHURCH_ID || "demo-church"` — the schema supports multi-church (`churchId` column on most tables) but the app runs single-tenant, and every query defaults to this constant. Treat the env var as test-only (see Environment above).

File and object storage is separate from the relational data, and split across two unrelated backends:

- `server/storage.ts` — **Supabase Storage**, called over its REST API with `fetch` and `SUPABASE_SERVICE_ROLE_KEY`. Two buckets: `SUPABASE_STORAGE_BUCKET` (`receipts`, public) and `SUPABASE_SLIP_BUCKET` (`slips`, private — LINE slip images are financial records, so they are only ever served through the 1-hour signed URLs from `getSlipSignedUrl`).
- `server/_core/storageProxy.ts` / `server/_core/dataApi.ts` — proxy to the Forge API, unrelated to Supabase.

So Supabase provides object storage only; the database is Neon. `@aws-sdk/client-s3` and `@aws-sdk/s3-request-presigner` are still in `package.json` but no source file imports them.

### Frontend

`client/src/App.tsx` is a flat `wouter` `<Switch>` of top-level routes — there is no nested layout or route-config file, and pages are one file per route under `client/src/pages/` rather than per-feature folders. Server state goes through `@tanstack/react-query` + the tRPC client; `client/src/components/ui/` is the shadcn/Radix primitive layer — extend it rather than duplicating a primitive.

### Testing

Server-side only (`server/*.test.ts`); client tests are not wired up. Tests run against `appRouter.createCaller(context)` directly, with no HTTP layer — see `server/updates.access.test.ts` or `server/line.inbox.test.ts` for the pattern: build a fake `TrpcContext` with a plain `User` object, call procedures via the caller, and assert on thrown tRPC error codes (`UNAUTHORIZED`/`FORBIDDEN`/`BAD_REQUEST`) for access-control tests.

Two suites are different and need care. `server/counting.workflow.test.ts` and `server/reports.integration.test.ts` hit a real Postgres and **write rows**. They skip themselves unless `DATABASE_URL` is set, which is why `pnpm test` reports skipped files on a normal machine.

When a database is configured, `server/test/setupTenant.ts` (a vitest `setupFile`, which runs before each test file's modules load — early enough for `DEFAULT_CHURCH_ID` to read it) assigns a unique `test-<uuid>` tenant per file, and `purgeTenant` in `server/test/tenant.ts` drops the whole tenant afterwards. That keeps a run away from application data even if a test fails partway. `purgeTenant` refuses to act unless the tenant starts with `test-`, so a misconfigured `CHURCH_ID` cannot turn cleanup into a wipe. If you add a suite that writes rows, scope every statement by `churchId` and let it inherit this tenant rather than naming one.

## Notable local tooling

- `vite.config.ts` includes Manus-specific dev plugins (`vite-plugin-manus-runtime`, a custom debug-log collector writing to `.manus-logs/`) — these are dev-only (no-op/absent in production) and unrelated to app business logic; don't remove them assuming they're dead code.
- `pnpm.overrides` and `patchedDependencies` in `package.json` pin `tailwindcss`'s nested `nanoid` and patch `wouter@3.7.1` (see `patches/wouter@3.7.1.patch`) — if upgrading either package, check whether the override/patch is still needed.
