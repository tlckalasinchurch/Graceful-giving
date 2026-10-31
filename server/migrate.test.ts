import { describe, expect, it } from "vitest";
import {
  explainMigrationError,
  INTEGRITY_INDEXES,
  pickMigrationUrl,
  shouldMigrate,
} from "./migrate";

describe("pickMigrationUrl", () => {
  it("prefers the owner URL over the app's own", () => {
    expect(
      pickMigrationUrl({
        DATABASE_URL: "postgres://app",
        DATABASE_URL_MIGRATE: "postgres://owner",
      })
    ).toEqual({ name: "DATABASE_URL_MIGRATE", url: "postgres://owner" });
  });

  it("prefers an unpooled URL over a pooled one", () => {
    expect(
      pickMigrationUrl({
        DATABASE_URL: "postgres://pooled",
        POSTGRES_URL_NON_POOLING: "postgres://direct",
      })?.name
    ).toBe("POSTGRES_URL_NON_POOLING");
  });

  it("falls back to the app's URL, and ignores blank values", () => {
    expect(
      pickMigrationUrl({
        DATABASE_URL_MIGRATE: "  ",
        DATABASE_URL: "postgres://app",
      })?.name
    ).toBe("DATABASE_URL");
  });

  it("returns null when nothing is set", () => {
    expect(pickMigrationUrl({})).toBeNull();
  });
});

describe("shouldMigrate", () => {
  const prod = { VERCEL: "1", VERCEL_ENV: "production" };

  it("migrates on a production Vercel build", () => {
    expect(shouldMigrate(prod, { onlyProduction: true }).run).toBe(true);
  });

  it("does not migrate on a preview build: previews share the production database", () => {
    const d = shouldMigrate(
      { VERCEL: "1", VERCEL_ENV: "preview" },
      { onlyProduction: true }
    );
    expect(d.run).toBe(false);
    expect(d.reason).toContain("preview");
  });

  it("does not migrate outside Vercel when asked for a deploy step", () => {
    expect(shouldMigrate({}, { onlyProduction: true }).run).toBe(false);
  });

  it("always migrates when run by hand", () => {
    expect(shouldMigrate({}, { onlyProduction: false }).run).toBe(true);
    expect(
      shouldMigrate(
        { VERCEL: "1", VERCEL_ENV: "preview" },
        { onlyProduction: false }
      ).run
    ).toBe(true);
  });

  it("can be switched off for an emergency build", () => {
    const d = shouldMigrate(
      { ...prod, SKIP_DB_MIGRATE: "1" },
      { onlyProduction: true }
    );
    expect(d.run).toBe(false);
    expect(d.reason).toContain("SKIP_DB_MIGRATE");
  });
});

describe("explainMigrationError", () => {
  it("tells the operator what to set when the role does not own the table", () => {
    const e = explainMigrationError(
      new Error("must be owner of table church_profiles")
    );
    expect(e.message).toContain("DATABASE_URL_MIGRATE");
    expect(e.message).toContain("church_profiles");
  });

  it("explains a role that cannot create the drizzle schema", () => {
    expect(
      explainMigrationError(
        new Error("permission denied for database postgres")
      ).message
    ).toContain("DATABASE_URL_MIGRATE");
  });

  it("reads the cause of a wrapped driver error", () => {
    const wrapped = Object.assign(new Error("Failed query: ALTER TABLE ..."), {
      cause: new Error("must be owner of type bank_record_type"),
    });
    expect(explainMigrationError(wrapped).message).toContain(
      "bank_record_type"
    );
  });

  it("names a unique index that could not be created", () => {
    expect(
      explainMigrationError(
        new Error('could not create unique index "offerings_ref_active_uniq"')
      ).failedIndex
    ).toBe("offerings_ref_active_uniq");
  });

  it("has a diagnostic query for each financial integrity index", () => {
    for (const name of [
      "offerings_ref_active_uniq",
      "line_slips_ref_uniq",
      "line_slips_event_uniq",
    ]) {
      expect(INTEGRITY_INDEXES[name].findBlockingRows).toContain("GROUP BY");
    }
  });
});
