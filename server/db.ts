// Thin barrel for the data-access layer (Phase 4 god-file split).
// The implementation lives in server/db/<domain>.ts; every export
// is re-exported here so existing imports keep working unchanged.

export * from "./db/core";
export * from "./db/users";
export * from "./db/church";
export * from "./db/finance";
export * from "./db/offerings";
export * from "./db/expenses";
export * from "./db/transactions";
export * from "./db/withdrawals";
export * from "./db/members";
export * from "./db/ministries";
export * from "./db/notifications";
export * from "./db/audit";
export * from "./db/reports";
export * from "./db/budgets";
export * from "./db/news";
export * from "./db/counting";
export * from "./db/slips";
