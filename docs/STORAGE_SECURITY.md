# Supabase Storage Configuration & Security Architecture

**Project:** Graceful Giving (CFOS)  
**Date:** September 2026  
**Status:** ARCHITECTURAL SPECIFICATION & PRE-DATABASE VERIFICATION  
**Scope:** Storage buckets, privacy boundaries, signed URLs, and authorization matrix

---

## 1. Storage Environment & Code Configuration

The application interacts with Supabase Storage via REST endpoints authenticated by the server-side service role key. The following environment variables configure storage behavior:

```text
SUPABASE_URL                  # Supabase project URL (e.g. https://xyz.supabase.co)
SUPABASE_SERVICE_ROLE_KEY     # Privileged backend key (NEVER exposed to frontend)
SUPABASE_STORAGE_BUCKET       # Legacy public bucket name (default: "receipts")
SUPABASE_SLIP_BUCKET          # Private bucket for LINE offering slips (default: "slips")
SUPABASE_RECEIPT_BUCKET       # Private bucket for expense receipts (target: "expense-receipts-private")
```

### Verification Status Warning

> [!WARNING]
> **Storage Project Configuration Verification:**
> 
> ```text
> Expected configuration:
> private bucket
> 
> Runtime verification:
> NOT VERIFIED
> ```
> 
> While the application code is designed to interface with a private bucket using `storagePutPrivate` and signed URL minting, the actual live Supabase project configuration has not been directly inspected in this session. The production/staging bucket privacy settings, RLS policies on `storage.objects`, and CORS settings must be verified against the live project dashboard prior to production cutover.

---

## 2. Storage Specifications

| Property | Value / Specification | Description |
|---|---|---|
| **Target Bucket Name** | `expense-receipts-private` (or `slips` for LINE slips) | Dedicated private bucket for financial documentation and receipts. |
| **Privacy Model** | **Private** (`public = false`) | Anonymous HTTP GET requests are rejected with `400 Bad Request` or `404 Not Found` by Supabase Storage. |
| **Object Path Format** | `{churchId}/{year}/{month}/{uuid8}_{filename}` | Strict hierarchical prefixing by church tenant ID, year, and month to guarantee isolation. Example: `demo-church/2026/09/a1b2c3d4_tax_invoice.pdf`. |
| **Signed URL Expiration** | **300 seconds (5 minutes)** | Ephemeral tokens generated on-demand. Never cached in persistent storage or logs. Reduced from legacy 3600s to minimize window of vulnerability. |
| **Authorization Boundary** | tRPC `financeProcedure` / `churchLeaderProcedure` | Must verify active user session, tenant matching (`user.churchId === expense.churchId`), and authorized role before issuing a signed URL. |
| **Upload Behavior** | Server-Side Authenticated Upload | 1. Client sends base64/binary to tRPC procedure (`expenses.uploadReceipt`).<br>2. Server validates MIME type (`image/jpeg`, `image/png`, `image/webp`, `application/pdf`) and file size (max 10MB).<br>3. Server uploads directly using `SUPABASE_SERVICE_ROLE_KEY` to private bucket.<br>4. Server stores ONLY the object key in `expenses.receiptStorageKey`.<br>5. Never emits a public URL. |
| **Download / View Behavior** | Authorized Signed URL On-Demand | 1. Client requests view via tRPC `expenses.getReceiptSignedUrl({ id })`.<br>2. Server verifies caller permissions and tenant boundary.<br>3. Server calls Supabase Storage sign API (`/storage/v1/object/sign/...`) with `expiresIn: 300`.<br>4. Client renders image or PDF in `ReceiptPreviewModal` via the temporary signed URL. |

---

## 3. Storage Helpers in Codebase

| Helper Function | File | Privacy Level | Expiration | Primary Use Case |
|---|---|---|---|---|
| `storagePutPrivate(key, data, mime)` | `server/storage.ts` | **Private** | N/A (stores object) | LINE slips and expense receipt storage. |
| `getSlipSignedUrl(slipImageKey)` | `server/storage.ts` | **Private** | 300s (Target) / 3600s (Legacy) | Generating temporary preview URLs for LINE offering slips. |
| `getExpenseReceiptSignedUrl(storageKey)` | `server/storage.ts` | **Private** | 300s | Generating temporary preview URLs for church expense receipts. |
| `storagePut(key, data, mime)` | `server/storage.ts` | **Public (Legacy)** | N/A | Legacy public helper. Restricted to non-sensitive assets only. |
| `storageGetSignedUrl(key)` | `server/storage.ts` | **Public/Signed** | 3600s | Legacy helper for `SUPABASE_STORAGE_BUCKET`. |
| `storageDelete(key)` | `server/storage.ts` | Service Role | N/A | Administrative object deletion. |

---

## 4. Receipt Access Matrix

The access control model is grounded in the existing authorization mechanisms implemented in `server/routers.ts`, `shared/roles.ts`, and `client/src/lib/routeAccess.ts`:

- `SUPER_ADMIN`: Full administrative control across system settings and finances.
- `TREASURER` (Finance): Full financial record management, reconciliation, and receipt handling.
- `PASTOR` (Leader): Oversight and audit access; read-only for financial vouchers and receipts; approval access for budget/withdrawals.
- `MEMBER`: Regular church member. No access to financial expense receipts or private vouchers.
- `GUEST`: Unauthenticated public visitor. Denied access to all internal records.
- **Tenant Isolation Barrier**: All queries enforce `WHERE churchId = :callerChurchId`. A user from a different church receives a 404/Empty result or 403 Forbidden, with zero cross-tenant leakage.

### 4.1 Authorization Test Matrix

| Actor | Same Church | Different Church | Receipt Access Level | Enforced Mechanism |
|---|---|---|---|---|
| **Super Admin** (`SUPER_ADMIN` / `role: admin`) | Allowed | **DENIED** | **Full Access** (Upload, View, Generate Signed URL, Void/Update) | Gated by `financeProcedure` / `adminProcedure` + `eq(expenses.churchId, user.churchId)`. Cross-church blocked by tenant query filter. |
| **Finance** (`TREASURER`) | Allowed | **DENIED** | **Full Access** (Upload, View, Generate Signed URL, Void/Update) | Gated by `financeProcedure` (`canManageFinance(user)`) + `eq(expenses.churchId, user.churchId)`. Cross-church blocked by tenant query filter. |
| **Leader** (`PASTOR`) | Allowed | **DENIED** | **Read / Audit Only** (View attached receipts, Print vouchers; cannot edit or upload) | Gated by `canAccessRoute("/expenses")` + `canManageChurchSettings(user)` + `eq(expenses.churchId, user.churchId)`. Cross-church blocked by tenant filter. |
| **Member** (`MEMBER`, `DEACON`, `COUNTER`) | **DENIED** | **DENIED** | **No Access** | `canAccessRoute("/expenses")` evaluates to `false`. Attempting to call `expenses.uploadReceipt` or `expenses.getById` throws `FORBIDDEN` (403). |
| **Guest** (Unauthenticated) | **DENIED** | **DENIED** | **No Access** | Blocked at tRPC context/middleware layer. Throws `UNAUTHORIZED` (401). |

### 4.2 Security Assertions for Testing
1. **Assertion SEC-01 (Tenant Isolation):** An authenticated `TREASURER` from `Church-A` requesting a receipt belonging to `Church-B` MUST receive `NOT_FOUND` or `FORBIDDEN`.
2. **Assertion SEC-02 (Role Gate):** An authenticated `MEMBER` from `Church-A` requesting a receipt signed URL MUST receive `FORBIDDEN`.
3. **Assertion SEC-03 (Expiration Gate):** A signed URL older than 300 seconds MUST return `403 Forbidden` / `InvalidToken` from Supabase Storage.
4. **Assertion SEC-04 (No Public Fallback):** Direct unauthenticated HTTP GET to `https://<project>.supabase.co/storage/v1/object/public/<private-bucket>/<key>` MUST fail.
