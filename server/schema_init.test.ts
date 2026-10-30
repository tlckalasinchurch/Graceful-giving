import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  ENUM_STATEMENTS,
  INDEX_STATEMENTS,
  TABLE_STATEMENTS,
  runSchemaInit,
} from "./schema_init";

/**
 * A unique index that guards a financial rule fails to create when the table
 * already holds violating rows. Postgres reports this, but a warning-level log
 * hides it: the application then trusts a backstop that does not exist.
 */

const INTEGRITY_INDEX_NAMES = [
  "offerings_ref_active_uniq",
  "line_slips_ref_uniq",
  "line_slips_event_uniq",
];

function statementFor(indexName: string): string {
  const stmt = INDEX_STATEMENTS.find(s => s.includes(`"${indexName}"`));
  if (!stmt) throw new Error(`No statement defines ${indexName}`);
  return stmt;
}

/** Fails only the named index; every other statement succeeds. */
function clientFailing(indexName: string, blockingRows: unknown[] = []) {
  return {
    unsafe: vi.fn(async (stmt: string) => {
      if (stmt.includes(`"${indexName}"`) && /CREATE/i.test(stmt)) {
        throw new Error(
          `could not create unique index "${indexName}": Key is duplicated`
        );
      }
      if (/GROUP BY/i.test(stmt)) return blockingRows;
      return [];
    }),
  };
}

let errorSpy: ReturnType<typeof vi.spyOn>;
let warnSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
  warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("integrity index definitions", () => {
  it("defines every integrity index as a UNIQUE index", () => {
    for (const name of INTEGRITY_INDEX_NAMES) {
      expect(statementFor(name)).toMatch(/CREATE\s+UNIQUE\s+INDEX/i);
    }
  });
});

describe("runSchemaInit with indexes that already exist", () => {
  // The app role may not own the tables. Postgres then rejects
  // CREATE INDEX IF NOT EXISTS with "must be owner" even when the index exists.
  function clientWithExistingIndexes(existing: string[]) {
    return {
      unsafe: vi.fn(async (stmt: string) => {
        const lookup = stmt.match(/FROM pg_indexes .*indexname = '([^']+)'/s);
        if (lookup)
          return existing.includes(lookup[1]) ? [{ "?column?": 1 }] : [];
        if (/CREATE\s+(UNIQUE\s+)?INDEX/i.test(stmt)) {
          throw new Error("must be owner of table offerings");
        }
        return [];
      }),
    };
  }

  it("does not run or report a statement for an index that exists", async () => {
    const client = clientWithExistingIndexes(INTEGRITY_INDEX_NAMES);
    await runSchemaInit(client);

    const errors = errorSpy.mock.calls.map(c => String(c[0]));
    expect(errors.some(m => m.includes("WAS NOT CREATED"))).toBe(false);
    const ran = client.unsafe.mock.calls.map(c => String(c[0]));
    for (const name of INTEGRITY_INDEX_NAMES) {
      expect(ran).not.toContain(statementFor(name));
    }
  });

  it("still reports an integrity index that is missing and cannot be created", async () => {
    const client = clientWithExistingIndexes(
      INTEGRITY_INDEX_NAMES.filter(n => n !== "line_slips_ref_uniq")
    );
    await runSchemaInit(client);

    const errors = errorSpy.mock.calls.map(c => String(c[0]));
    expect(errors.filter(m => m.includes("WAS NOT CREATED"))).toHaveLength(1);
    expect(errors.some(m => m.includes("line_slips_ref_uniq"))).toBe(true);
  });

  it("falls back to CREATE when the existence check itself fails", async () => {
    const client = {
      unsafe: vi.fn(async (stmt: string) => {
        if (/pg_indexes/.test(stmt)) throw new Error("permission denied");
        return [];
      }),
    };
    await runSchemaInit(client);

    const ran = client.unsafe.mock.calls.map(c => String(c[0]));
    expect(ran).toContain(statementFor("offerings_ref_active_uniq"));
  });
});

describe("runSchemaInit failure reporting", () => {
  it("reports a failed integrity index at error level, not warn", async () => {
    const client = clientFailing("offerings_ref_active_uniq");
    await runSchemaInit(client);

    const errors = errorSpy.mock.calls.map(c => String(c[0]));
    expect(errors.some(m => m.includes("offerings_ref_active_uniq"))).toBe(
      true
    );
    expect(errors.some(m => m.includes("WAS NOT CREATED"))).toBe(true);

    const warnings = warnSpy.mock.calls.map(c => String(c[1] ?? c[0]));
    expect(warnings.some(m => m.includes("offerings_ref_active_uniq"))).toBe(
      false
    );
  });

  it("names the rows that block the index", async () => {
    const client = clientFailing("offerings_ref_active_uniq", [
      { churchId: "demo-church", reference: "TXN-001", copies: 2 },
    ]);
    await runSchemaInit(client);

    const joined = errorSpy.mock.calls.flat().map(String).join(" ");
    expect(joined).toContain("TXN-001");
    expect(joined).toContain("duplicate group");
  });

  it("reports every integrity index by name when it fails", async () => {
    for (const name of INTEGRITY_INDEX_NAMES) {
      errorSpy.mockClear();
      await runSchemaInit(clientFailing(name));

      const errors = errorSpy.mock.calls.map(c => String(c[0]));
      expect(
        errors.some(m => m.includes(name)),
        name
      ).toBe(true);
    }
  });

  it("keeps a non-integrity index failure at warn level", async () => {
    const client = clientFailing("members_church_idx");
    await runSchemaInit(client);

    expect(warnSpy).toHaveBeenCalled();
    const errors = errorSpy.mock.calls.map(c => String(c[0]));
    expect(errors.some(m => m.includes("members_church_idx"))).toBe(false);
  });

  it("continues past a failure so later statements still run", async () => {
    const client = clientFailing("line_slips_event_uniq");
    await runSchemaInit(client);

    const attempted = client.unsafe.mock.calls.map(c => String(c[0]));
    const last = INDEX_STATEMENTS[INDEX_STATEMENTS.length - 1];
    expect(attempted).toContain(last);
  });

  it("survives a diagnostic query that also fails", async () => {
    const client = {
      unsafe: vi.fn(async (stmt: string) => {
        if (
          /CREATE/i.test(stmt) &&
          stmt.includes("offerings_ref_active_uniq")
        ) {
          throw new Error("could not create unique index");
        }
        if (/GROUP BY/i.test(stmt)) throw new Error("permission denied");
        return [];
      }),
    };

    await expect(runSchemaInit(client)).resolves.toBeUndefined();
    const joined = errorSpy.mock.calls.flat().map(String).join(" ");
    expect(joined).toContain("Could not diagnose");
  });
});

describe("counting carry-forward schema", () => {
  // CREATE TYPE ... EXCEPTION WHEN duplicate_object never adds values to an
  // enum that already exists, which is the case on every live database.
  it("adds the new bank record types to an existing enum", () => {
    for (const value of ["withdrawal", "other_in", "other_out"]) {
      expect(ENUM_STATEMENTS).toContain(
        `ALTER TYPE "public"."bank_record_type" ADD VALUE IF NOT EXISTS '${value}';`
      );
    }
  });

  it("adds the carry-forward columns to existing counting_sessions", () => {
    for (const column of [
      "openingCash",
      "openingBank",
      "closingBank",
      "cashOnHandActual",
      "passbookBalance",
      "passbookBalanceDate",
    ]) {
      expect(
        TABLE_STATEMENTS.some(s =>
          s.includes(
            `ALTER TABLE "counting_sessions" ADD COLUMN IF NOT EXISTS "${column}"`
          )
        )
      ).toBe(true);
    }
  });
});
