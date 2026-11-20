// Extracted verbatim from server/routers.ts (Phase 4 god-file split).
// Pure move: no logic, validation, authorisation or API-shape change.

import { router } from "../_core/trpc";
import {
  DEFAULT_CHURCH_ID,
  listAuditLogs,
} from "../db";
import { adminProcedure } from "./common";
import { z } from "zod";

export const auditRouter = router({
    list: adminProcedure
      .input(
        z
          .object({
            limit: z.number().min(1).max(200).default(50),
          })
          .optional()
      )
      .query(async ({ input }) => {
        return await listAuditLogs(DEFAULT_CHURCH_ID, input?.limit ?? 50);
      }),
});
