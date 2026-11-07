import { describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { sql } from "drizzle-orm";
import { pgTable, serial, timestamp } from "drizzle-orm/pg-core";
import { TRPCError } from "@trpc/server";
import { bangkokDateString } from "@shared/bangkokDate";
import {
  exportExpensesCsvData,
  exportOfferingsCsvData,
  exportTransactionsCsvData,
  type ExpenseRow,
  type OfferingRow,
} from "./db";
import {
  assertCsvWithinLimit,
  CSV_TOO_LARGE_MESSAGE,
  MAX_CSV_RESPONSE_BYTES,
} from "./csvLimit";

/**
 * Stored instants (UTC) and the Asia/Bangkok calendar date each must show.
 * Bangkok is UTC+7 with no daylight saving.
 */
const BOUNDARY_CASES: Array<{ label: string; utc: string; bangkok: string }> = [
  {
    label: "previous day 23:59",
    utc: "2026-10-31T16:59:00.000Z",
    bangkok: "2026-10-31",
  },
  { label: "00:00", utc: "2026-10-31T17:00:00.000Z", bangkok: "2026-11-01" },
  { label: "06:59", utc: "2026-10-31T23:59:00.000Z", bangkok: "2026-11-01" },
  { label: "07:00", utc: "2026-11-01T00:00:00.000Z", bangkok: "2026-11-01" },
  { label: "12:00", utc: "2026-11-01T05:00:00.000Z", bangkok: "2026-11-01" },
  { label: "23:59", utc: "2026-11-01T16:59:00.000Z", bangkok: "2026-11-01" },
  {
    label: "next day 00:00",
    utc: "2026-11-01T17:00:00.000Z",
    bangkok: "2026-11-02",
  },
];

/** Date column of a CSV data row: second cell, quoted. */
function dateColumn(csv: string): string[] {
  return csv
    .replace(/^\uFEFF/, "")
    .split("\n")
    .slice(1)
    .map(line => line.split(",")[1].replace(/"/g, ""));
}

function offeringAt(id: number, utc: string): OfferingRow {
  return {
    id,
    amount: 100,
    category: "tithe",
    donorName: null,
    donorMemberId: null,
    receiptDate: new Date(utc),
    method: "cash",
    reference: null,
    notes: null,
    fundId: null,
  };
}

function expenseAt(id: number, utc: string): ExpenseRow {
  return {
    id,
    amount: 50,
    category: "utilities",
    description: "ค่าน้ำ",
    details: null,
    expenseDate: new Date(utc),
    payee: null,
    status: "completed",
    fundId: null,
    receiptRef: null,
    receiptUrl: null,
  };
}

describe("Thailand financial dates in CSV", () => {
  describe("bangkokDateString", () => {
    it.each(BOUNDARY_CASES)(
      "$label Bangkok is $bangkok",
      ({ utc, bangkok }) => {
        expect(bangkokDateString(new Date(utc))).toBe(bangkok);
      }
    );

    it("does not depend on the process time zone", () => {
      const original = process.env.TZ;
      try {
        for (const tz of ["UTC", "Asia/Bangkok", "America/Los_Angeles"]) {
          process.env.TZ = tz;
          for (const c of BOUNDARY_CASES) {
            expect(bangkokDateString(new Date(c.utc))).toBe(c.bangkok);
          }
        }
      } finally {
        if (original === undefined) delete process.env.TZ;
        else process.env.TZ = original;
      }
    });

    it("shows why the old UTC formatting was wrong for 00:00 and 06:59", () => {
      const legacy = (d: Date) => d.toISOString().split("T")[0];
      expect(legacy(new Date("2026-10-31T17:00:00.000Z"))).toBe("2026-10-31");
      expect(legacy(new Date("2026-10-31T23:59:00.000Z"))).toBe("2026-10-31");
      expect(bangkokDateString(new Date("2026-10-31T17:00:00.000Z"))).toBe(
        "2026-11-01"
      );
      expect(bangkokDateString(new Date("2026-10-31T23:59:00.000Z"))).toBe(
        "2026-11-01"
      );
    });

    it("agrees with the date the app shows to a browser in Asia/Bangkok", () => {
      // The app shows dates in the browser time zone. For the church that is
      // Asia/Bangkok. Compare with the local calendar parts of the same instant.
      const original = process.env.TZ;
      try {
        process.env.TZ = "Asia/Bangkok";
        for (const c of BOUNDARY_CASES) {
          const d = new Date(c.utc);
          const local = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
          expect(bangkokDateString(d)).toBe(local);
        }
      } finally {
        if (original === undefined) delete process.env.TZ;
        else process.env.TZ = original;
      }
    });
  });

  describe("all three CSV exports use the Bangkok date", () => {
    const expected = BOUNDARY_CASES.map(c => c.bangkok);

    it("offerings CSV", async () => {
      const rows = BOUNDARY_CASES.map((c, i) => offeringAt(i + 1, c.utc));
      const result = await exportOfferingsCsvData(
        "demo-church",
        {},
        { fetchOfferings: async () => rows, fetchFunds: async () => [] }
      );
      expect(dateColumn(result.csv)).toEqual(expected);
      expect(result.rowCount).toBe(BOUNDARY_CASES.length);
    });

    it("expenses CSV", async () => {
      const rows = BOUNDARY_CASES.map((c, i) => expenseAt(i + 1, c.utc));
      const result = await exportExpensesCsvData(
        "demo-church",
        {},
        { fetchExpenses: async () => rows, fetchFunds: async () => [] }
      );
      expect(dateColumn(result.csv)).toEqual(expected);
      expect(result.rowCount).toBe(BOUNDARY_CASES.length);
    });

    it("transactions CSV (income and expense rows)", async () => {
      const incomes = BOUNDARY_CASES.map((c, i) => offeringAt(i + 1, c.utc));
      const expenses = BOUNDARY_CASES.map((c, i) => expenseAt(i + 100, c.utc));
      const result = await exportTransactionsCsvData(
        "demo-church",
        {},
        {
          fetchOfferings: async () => incomes,
          fetchExpenses: async () => expenses,
          fetchFunds: async () => [],
        }
      );
      const dates = dateColumn(result.csv);
      expect(dates).toHaveLength(BOUNDARY_CASES.length * 2);
      // Every date is a boundary result. Sorted newest first.
      expect([...dates].sort().reverse()).toEqual(dates);
      for (const d of expected) {
        expect(dates.filter(x => x === d).length).toBe(
          expected.filter(x => x === d).length * 2
        );
      }
    });
  });

  describe("storage semantics (PGlite, same Drizzle version as the app)", () => {
    const probe = pgTable("probe", {
      id: serial("id").primaryKey(),
      at: timestamp("at").notNull(),
    });

    it("stores the UTC wall clock and returns the same instant", async () => {
      const client = new PGlite();
      try {
        const db = drizzle(client);
        await client.exec(
          "CREATE TABLE probe (id serial primary key, at timestamp not null)"
        );
        for (const c of BOUNDARY_CASES) {
          await db.insert(probe).values({ at: new Date(c.utc) });
        }
        const raw = await client.query<{ at: string }>(
          "SELECT at::text AS at FROM probe ORDER BY id"
        );
        // 00:00 Bangkok on 2026-11-01 is stored as 17:00 on 2026-10-31.
        expect(raw.rows[1].at).toBe("2026-10-31 17:00:00");
        const back = await db
          .select()
          .from(probe)
          .orderBy(sql`id`);
        expect(back.map(r => r.at.toISOString())).toEqual(
          BOUNDARY_CASES.map(c => c.utc)
        );
        expect(back.map(r => bangkokDateString(r.at))).toEqual(
          BOUNDARY_CASES.map(c => c.bangkok)
        );
      } finally {
        await client.close();
      }
    });
  });
});

describe("CSV export size limit", () => {
  it("accepts a CSV under the limit and returns it unchanged", () => {
    expect(assertCsvWithinLimit("a,b\n1,2")).toBe("a,b\n1,2");
  });

  it("rejects a CSV over the limit with PAYLOAD_TOO_LARGE and a Thai message", () => {
    try {
      assertCsvWithinLimit("x".repeat(50), 40);
      throw new Error("expected assertCsvWithinLimit to throw");
    } catch (error) {
      expect(error).toBeInstanceOf(TRPCError);
      expect((error as TRPCError).code).toBe("PAYLOAD_TOO_LARGE");
      expect((error as TRPCError).message).toBe(CSV_TOO_LARGE_MESSAGE);
      expect((error as TRPCError).message).toContain("ช่วงวันที่");
    }
  });

  it("measures the JSON encoding, so quotes and newlines count", () => {
    const csv = '"a"\n'.repeat(10); // 40 raw bytes, more once JSON-escaped
    expect(() => assertCsvWithinLimit(csv, 40)).toThrow(TRPCError);
  });

  it("measures UTF-8 bytes, so Thai text counts three bytes per character", () => {
    const thai = "ก".repeat(20); // 20 characters, 60 bytes
    expect(() => assertCsvWithinLimit(thai, 50)).toThrow(TRPCError);
    expect(assertCsvWithinLimit(thai, 70)).toBe(thai);
  });

  it("offerings export fails whole when it is too large and never returns part of the rows", async () => {
    const bigNote = "ก".repeat(900);
    const rows = Array.from({ length: 1700 }, (_, i) => ({
      ...offeringAt(i + 1, "2026-11-01T05:00:00.000Z"),
      notes: bigNote,
    }));
    await expect(
      exportOfferingsCsvData(
        "demo-church",
        {},
        { fetchOfferings: async () => rows, fetchFunds: async () => [] }
      )
    ).rejects.toMatchObject({
      code: "PAYLOAD_TOO_LARGE",
      message: CSV_TOO_LARGE_MESSAGE,
    });
  });

  it("an export just under the limit keeps every row", async () => {
    const rows = Array.from({ length: 500 }, (_, i) =>
      offeringAt(i + 1, "2026-11-01T05:00:00.000Z")
    );
    const result = await exportOfferingsCsvData(
      "demo-church",
      {},
      { fetchOfferings: async () => rows, fetchFunds: async () => [] }
    );
    expect(result.rowCount).toBe(500);
    expect(dateColumn(result.csv)).toHaveLength(500);
    expect(Buffer.byteLength(JSON.stringify(result.csv))).toBeLessThan(
      MAX_CSV_RESPONSE_BYTES
    );
  });
});

describe("CSV byte-order mark from the server", () => {
  const BOM = [0xef, 0xbb, 0xbf];
  const leading = (csv: string) => [...Buffer.from(csv, "utf8").subarray(0, 6)];

  it("every export starts with exactly one BOM", async () => {
    const o = [offeringAt(1, "2026-11-01T05:00:00.000Z")];
    const e = [expenseAt(2, "2026-11-01T05:00:00.000Z")];
    const csvs = [
      (
        await exportOfferingsCsvData(
          "demo-church",
          {},
          { fetchOfferings: async () => o, fetchFunds: async () => [] }
        )
      ).csv,
      (
        await exportExpensesCsvData(
          "demo-church",
          {},
          { fetchExpenses: async () => e, fetchFunds: async () => [] }
        )
      ).csv,
      (
        await exportTransactionsCsvData(
          "demo-church",
          {},
          {
            fetchOfferings: async () => o,
            fetchExpenses: async () => e,
            fetchFunds: async () => [],
          }
        )
      ).csv,
    ];
    for (const csv of csvs) {
      const bytes = leading(csv);
      expect(bytes.slice(0, 3)).toEqual(BOM);
      expect(bytes.slice(3, 6)).not.toEqual(BOM);
    }
  });
});
