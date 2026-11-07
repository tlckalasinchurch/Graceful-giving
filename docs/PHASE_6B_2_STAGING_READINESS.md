# PHASE 6B.2 — STAGING ENVIRONMENT READINESS SPECIFICATION

**Project:** Graceful Giving (Church Financial Accounting System)  
**Target:** Safe, Isolated Staging Environment for Authenticated E2E Testing  
**Date:** 2026-11-07  
**Auditor:** Principal Software Engineer, Authentication & Security Engineer, DevOps Engineer

---

## 1. Executive Summary & Architecture Overview

Currently, Graceful Giving has only one live deployed environment: **Production** (`https://graceful-giving.vercel.app`), which connects to a live PostgreSQL church database.

Furthermore, an investigation of `server/migrate.ts` line 57 reveals a critical architectural characteristic:

> `reason: this is a non-production build, and previews share the production database`

In Vercel's default environment inheritance model, **Preview deployments inherit Production environment variables (including `DATABASE_URL`) unless explicitly overridden in Vercel Project Settings**.

To safely conduct authenticated browser E2E testing without violating financial integrity or polluting real church ledgers, **an isolated Staging environment must be provisioned with complete database and authentication segregation**.

---

## 2. Database Isolation Specification

### 2.1 The Cardinal Rule of Staging Data

> **Staging must never connect to, read from, or write to the Production database.**  
> Any test run that mutates database rows must operate exclusively within a separate, isolated database instance.

### 2.2 Technical Requirements for Staging Database

1. **Dedicated PostgreSQL Instance:**
   - A separate Supabase project or distinct PostgreSQL database (e.g. `graceful_giving_staging`).
   - Separate connection string: `DATABASE_URL` and `DATABASE_URL_MIGRATE` (for migrations with DDL privileges).
2. **Migration Pipeline for Staging:**
   - In `server/migrate.ts`, `shouldMigrate()` currently permits deploy migrations only when `env.VERCEL_ENV === "production"`.
   - For Staging, the migration gate must safely support Staging deploys (e.g., when `env.APP_ENV === "staging"` or a specific `DEPLOY_ENV === "staging"` flag is supplied), using the Staging migration role.
3. **Synthetic Test Fixtures Only:**
   - A seeding script (`scripts/seedStaging.ts`) to populate representative test fixtures:
     - Church Profile: "คริสตจักรทดสอบเกรซกิฟวิง" (Test Church)
     - Fiscal Year: Current year active budget cycle
     - Funds: "กองทุนทั่วไป (General Fund)", "กองทุนเพื่อพันธกิจ (Mission Fund)", "กองทุนอาคาร (Building Fund)"
     - Pre-seeded Test Users across all 7 roles with known test OpenIDs
4. **Automated Cleanup Mechanism:**
   - An idempotent reset command (`pnpm db:reset:staging` or `purgeTenant`) to truncate test data between test suites.

### 2.3 Fail-Safe Guard Against Accidental Production Connection

To guarantee that a Staging or Preview deployment never accidentally receives Production database credentials, a **Runtime Environment Guard** must be enforced at process cold start (`server/db.ts`):

```ts
// Proposed Fail-Safe Production Guard (Do not implement without approval)
if (process.env.APP_ENV === "staging" || process.env.VERCEL_ENV === "preview") {
  const dbUrl = process.env.DATABASE_URL || "";
  // Abort immediately if the database URL points to the production cluster
  if (
    dbUrl.includes("production-db-identifier") ||
    process.env.CHURCH_ID !== "staging-church"
  ) {
    throw new Error(
      "[FATAL SECURITY GUARD] Staging environment detected with invalid or Production database configuration. Process terminated to protect real church records."
    );
  }
}
```

---

## 3. Authentication & OAuth Isolation (LINE Login)

### 3.1 The LINE OAuth Architecture

Graceful Giving uses **LINE Login v2.1** (`https://access.line.me/oauth2/v2.1/authorize`).
In `server/_core/lineLogin.ts`:

```ts
export function redirectUriFor(req: Pick<Request, "protocol" | "headers">) {
  if (ENV.appUrl) return `${ENV.appUrl}/api/auth/line/callback`;
  const proto = String(req.headers["x-forwarded-proto"] ?? req.protocol)
    .split(",")[0]
    .trim();
  const host = req.headers["x-forwarded-host"] ?? req.headers.host;
  return `${proto}://${host}/api/auth/line/callback`;
}
```

And LINE Developers console strictly validates the registered `Callback URL`.
If `redirect_uri` does not match the exact list configured in LINE Developers console, LINE Login throws:
`400 Bad Request: Invalid redirect_uri`.

### 3.2 Authentication Isolation Requirements

1. **Dedicated Staging LINE Developers Channel:**
   - Create a dedicated LINE Developers Channel (e.g. `Graceful Giving (Staging)`).
   - This prevents staging token revocations or test logins from affecting production church members.
2. **Dedicated Callback URL:**
   - Register the exact staging callback URL: `https://<staging-domain>/api/auth/line/callback`.
3. **Environment Variables for Staging:**
   - `LINE_LOGIN_CHANNEL_ID`: Staging Channel ID.
   - `LINE_LOGIN_CHANNEL_SECRET`: Staging Channel Secret.
   - `APP_URL`: Staging base URL (e.g. `https://staging.graceful-giving.app`).
   - `JWT_SECRET`: A distinct 64-character secret. Session cookies signed by Staging will be invalid on Production and vice versa.
   - `OWNER_OPEN_ID`: The LINE OpenID of the designated Staging test admin account.
4. **Pre-Seeded Test Accounts (One per Role):**
   - Staging database must map designated test OpenIDs to pre-configured roles:
     - `test-open-id-admin` -> `SUPER_ADMIN`
     - `test-open-id-pastor` -> `PASTOR`
     - `test-open-id-treasurer` -> `TREASURER`
     - `test-open-id-deacon` -> `DEACON`
     - `test-open-id-counter` -> `COUNTER`
     - `test-open-id-member` -> `MEMBER`
     - `test-open-id-signer` -> `isBankSigner: true`

---

## 4. Vercel Environment Segregation

### 4.1 Vercel Project Settings Configuration

In Vercel, environment variables must be segregated by Target Environment:

| Environment Variable        | Production Setting                   | Preview / Staging Setting                    | Separation Requirement  |
| --------------------------- | ------------------------------------ | -------------------------------------------- | ----------------------- |
| `DATABASE_URL`              | Production Supabase Pooler           | **Staging Supabase Pooler**                  | **MANDATORY ISOLATION** |
| `DATABASE_URL_MIGRATE`      | Production Owner Role                | **Staging Owner Role**                       | **MANDATORY ISOLATION** |
| `JWT_SECRET`                | Production Key                       | **Staging Key**                              | **MANDATORY ISOLATION** |
| `APP_URL`                   | `https://graceful-giving.vercel.app` | `https://staging-graceful-giving.vercel.app` | **MANDATORY ISOLATION** |
| `LINE_LOGIN_CHANNEL_ID`     | Production Channel                   | **Staging Channel**                          | **MANDATORY ISOLATION** |
| `LINE_LOGIN_CHANNEL_SECRET` | Production Secret                    | **Staging Secret**                           | **MANDATORY ISOLATION** |
| `OWNER_OPEN_ID`             | Production Owner OpenID              | **Staging Test Admin OpenID**                | **MANDATORY ISOLATION** |
| `SUPABASE_URL`              | Production Storage                   | **Staging Storage**                          | **ISOLATED BUCKET**     |
| `SUPABASE_SERVICE_ROLE_KEY` | Production Storage Key               | **Staging Storage Key**                      | **ISOLATED BUCKET**     |

---

## 5. Staging Readiness Checklist & Verdict

| Readiness Area         | Status        | Blocker / Requirement                                           |
| ---------------------- | ------------- | --------------------------------------------------------------- |
| Database Isolation     | **NOT READY** | Dedicated staging PostgreSQL instance not yet provisioned.      |
| LINE OAuth Channel     | **NOT READY** | Staging LINE Login channel & callback not yet registered.       |
| Vercel Env Segregation | **NOT READY** | Preview environment currently shares Production `DATABASE_URL`. |
| Seed Fixture Script    | **NOT READY** | `scripts/seedStaging.ts` needs to be authored.                  |
| Fail-Safe Prod Guard   | **SPECIFIED** | Logic designed; pending implementation approval.                |

### Staging Verdict: **READY WITH BLOCKERS**

_(The architecture and requirements are fully specified and verified, but physical staging infrastructure must be provisioned before execution)._
