// Thin shell for the tRPC router (Phase 4 god-file split).
// Sub-routers live in server/routers/<domain>.ts; shared procedures,
// helpers and schemas live in server/routers/common.ts. The API shape
// (appRouter keys, procedure names, inputs) is unchanged.

import { systemRouter } from "./_core/systemRouter";
import { router } from "./_core/trpc";
import { authRouter } from "./routers/auth";
import { churchRouter } from "./routers/church";
import { financeRouter } from "./routers/finance";
import { transactionsRouter } from "./routers/transactions";
import { bankSignersRouter } from "./routers/bankSigners";
import { membersRouter } from "./routers/members";
import { ministriesRouter } from "./routers/ministries";
import { budgetsRouter } from "./routers/budgets";
import { notificationsRouter } from "./routers/notifications";
import { reportsRouter } from "./routers/reports";
import { updatesRouter } from "./routers/updates";
import { auditRouter } from "./routers/audit";
import { offeringsRouter } from "./routers/offerings";
import { expensesRouter } from "./routers/expenses";
import { withdrawalsRouter } from "./routers/withdrawals";
import { countingRouter } from "./routers/counting";
import { givingInboxRouter } from "./routers/givingInbox";

export const appRouter = router({
  system: systemRouter,
  auth: authRouter,
  church: churchRouter,
  finance: financeRouter,
  offerings: offeringsRouter,
  expenses: expensesRouter,
  transactions: transactionsRouter,
  bankSigners: bankSignersRouter,
  withdrawals: withdrawalsRouter,
  members: membersRouter,
  ministries: ministriesRouter,
  budgets: budgetsRouter,
  notifications: notificationsRouter,
  reports: reportsRouter,
  updates: updatesRouter,
  counting: countingRouter,
  givingInbox: givingInboxRouter,
  audit: auditRouter,
});

export { redactChurchProfile } from "./routers/common";
export type AppRouter = typeof appRouter;
