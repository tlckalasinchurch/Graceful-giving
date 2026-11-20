// Extracted verbatim from server/routers.ts (Phase 4 god-file split).
// Pure move: no logic, validation, authorisation or API-shape change.

import { router } from "../_core/trpc";
import { assertCsvWithinLimit } from "../csvLimit";
import {
  DEFAULT_CHURCH_ID,
  getFinancialReportData,
  getFinancialReportSummary,
} from "../db";
import {
  csvCell,
  financeViewProcedure,
  reportDateRange,
} from "./common";

export const reportsRouter = router({
    /** Category totals and fund balances for the report screen. */
    summary: financeViewProcedure
      .input(reportDateRange)
      .query(async ({ input }) =>
        getFinancialReportSummary(
          DEFAULT_CHURCH_ID,
          input.fromDate,
          input.toDate
        )
      ),
    financial: financeViewProcedure
      .input(reportDateRange)
      .query(async ({ input }) => {
        return await getFinancialReportData(
          DEFAULT_CHURCH_ID,
          input.fromDate,
          input.toDate
        );
      }),
    exportCsv: financeViewProcedure
      .input(reportDateRange)
      .query(async ({ input }) => {
        const rows = await getFinancialReportData(
          DEFAULT_CHURCH_ID,
          input.fromDate,
          input.toDate
        );
        const header =
          "วันที่,ประเภท,หมวดหมู่,รายละเอียด,จำนวนเงิน (บาท),ช่องทาง";
        const lines = rows.map(r =>
          [
            r.date,
            r.type === "income" ? "รายรับ" : "รายจ่าย",
            r.category,
            r.description,
            r.amount.toFixed(2),
            r.method ?? "-",
          ]
            .map(csvCell)
            .join(",")
        );
        return {
          csv: assertCsvWithinLimit([header, ...lines].join("\n")),
          rowCount: rows.length,
        };
      }),
});
