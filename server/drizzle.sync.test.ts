/**
 * The drizzle snapshot must describe drizzle/schema.ts exactly. If someone
 * edits the schema and forgets to run `drizzle-kit generate`, the migrations
 * no longer build the schema the code expects. This fails until they do.
 */
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import * as schema from "../drizzle/schema";

// The ESM build of drizzle-kit/api cannot be loaded by vitest. The CommonJS
// build can.
const { generateDrizzleJson, generateMigration } = createRequire(
  import.meta.url
)("drizzle-kit/api") as typeof import("drizzle-kit/api");

describe("drizzle schema and snapshot", () => {
  it("have no pending difference", async () => {
    const folder = join(import.meta.dirname, "..", "drizzle");
    const journal = JSON.parse(
      readFileSync(join(folder, "meta", "_journal.json"), "utf8")
    ) as { entries: { idx: number }[] };
    const last = String(journal.entries.at(-1)!.idx).padStart(4, "0");
    const previous = JSON.parse(
      readFileSync(join(folder, "meta", `${last}_snapshot.json`), "utf8")
    );

    const statements = await generateMigration(
      previous,
      generateDrizzleJson(schema, previous.id)
    );

    expect(statements).toEqual([]);
  });

  it("have a snapshot for every journal entry", () => {
    const folder = join(import.meta.dirname, "..", "drizzle");
    const journal = JSON.parse(
      readFileSync(join(folder, "meta", "_journal.json"), "utf8")
    ) as { entries: { idx: number; tag: string }[] };
    for (const entry of journal.entries) {
      const prefix = String(entry.idx).padStart(4, "0");
      expect(() =>
        readFileSync(join(folder, "meta", `${prefix}_snapshot.json`))
      ).not.toThrow();
      expect(() =>
        readFileSync(join(folder, `${entry.tag}.sql`))
      ).not.toThrow();
    }
  });
});
