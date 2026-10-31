/**
 * Runs the drizzle migrations against the database. The app no longer changes
 * the schema when it connects. This runs at deploy time instead (see
 * scripts/migrate.ts and the buildCommand in vercel.json).
 */
import { join } from "node:path";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";

type Env = Record<string, string | undefined>;

/**
 * The connection to migrate with, first match wins. The app's own
 * DATABASE_URL comes last on purpose: its role may not own the tables, and
 * changing a table needs the owner. Set DATABASE_URL_MIGRATE to the owner's URL.
 */
const URL_VARIABLES = [
  "DATABASE_URL_MIGRATE",
  "DATABASE_URL_UNPOOLED",
  "POSTGRES_URL_NON_POOLING",
  "DATABASE_URL",
  "POSTGRES_URL",
  "POSTGRES_PRISMA_URL",
] as const;

export function pickMigrationUrl(
  env: Env
): { name: string; url: string } | null {
  for (const name of URL_VARIABLES) {
    const url = env[name]?.trim();
    if (url) return { name, url };
  }
  return null;
}

/**
 * Decides whether this process should migrate. A deploy build
 * (`onlyProduction`) migrates only for a production build on Vercel. A preview
 * build must not: previews share the production database, so a preview of an
 * unmerged branch would change the live schema.
 */
export function shouldMigrate(
  env: Env,
  opts: { onlyProduction: boolean }
): { run: boolean; reason: string } {
  if (env.SKIP_DB_MIGRATE === "1") {
    return { run: false, reason: "SKIP_DB_MIGRATE=1 is set" };
  }
  if (opts.onlyProduction) {
    if (!env.VERCEL) {
      return { run: false, reason: "this is not a Vercel build" };
    }
    if (env.VERCEL_ENV !== "production") {
      return {
        run: false,
        reason: `this is a ${env.VERCEL_ENV ?? "non-production"} build, and previews share the production database`,
      };
    }
  }
  return { run: true, reason: "" };
}

/**
 * Unique indexes that guard a financial rule. When one cannot be created, the
 * table already holds rows that break the rule. Each entry has a query that
 * names those rows, so the operator can clean them up.
 */
export const INTEGRITY_INDEXES: Record<
  string,
  { guards: string; findBlockingRows: string }
> = {
  offerings_ref_active_uniq: {
    guards: "two active offerings must not share one bank reference",
    findBlockingRows: `SELECT "churchId", "reference", count(*) AS copies
      FROM "offerings"
      WHERE "reference" IS NOT NULL AND "status" = 'active'
      GROUP BY 1, 2 HAVING count(*) > 1 ORDER BY copies DESC LIMIT 20`,
  },
  line_slips_ref_uniq: {
    guards: "two live LINE slips must not share one bank reference",
    findBlockingRows: `SELECT "churchId", "extractedRef", count(*) AS copies
      FROM "line_slips"
      WHERE "extractedRef" IS NOT NULL
        AND "status" NOT IN ('rejected', 'duplicate', 'failed')
      GROUP BY 1, 2 HAVING count(*) > 1 ORDER BY copies DESC LIMIT 20`,
  },
  line_slips_event_uniq: {
    guards: "one LINE event must not create two slips",
    findBlockingRows: `SELECT "churchId", "lineEventId", count(*) AS copies
      FROM "line_slips"
      GROUP BY 1, 2 HAVING count(*) > 1 ORDER BY copies DESC LIMIT 20`,
  },
};

/** The message to show for a failed migration, with what to do about it. */
export function explainMigrationError(err: unknown): {
  message: string;
  failedIndex: string | null;
} {
  const e = err as { message?: string; cause?: { message?: string } };
  const message = e?.cause?.message ?? e?.message ?? String(err);

  const ownerOf = message.match(
    /must be owner of (?:table|type|relation) (\S+)/i
  );
  if (ownerOf) {
    return {
      message:
        `${message}\nThe database role used to migrate does not own ${ownerOf[1]}. ` +
        `Set DATABASE_URL_MIGRATE to a connection for the role that owns the tables ` +
        `(in Supabase, the postgres role), then run the migration again.`,
      failedIndex: null,
    };
  }
  if (/permission denied for (?:database|schema)/i.test(message)) {
    return {
      message:
        `${message}\nThe role used to migrate cannot create the "drizzle" schema that ` +
        `records applied migrations. Set DATABASE_URL_MIGRATE to the owner role.`,
      failedIndex: null,
    };
  }
  const index = message.match(/could not create unique index "([^"]+)"/i)?.[1];
  return { message, failedIndex: index ?? null };
}

/** Applies every pending migration in one transaction. Throws on failure. */
export async function runMigrations(opts: {
  url: string;
  folder?: string;
  log?: (line: string) => void;
}): Promise<void> {
  const log = opts.log ?? (() => {});
  const client = postgres(opts.url, {
    max: 1,
    prepare: false,
    connect_timeout: 30,
    onnotice: () => {},
  });
  try {
    await migrate(drizzle(client), {
      migrationsFolder: opts.folder ?? join(process.cwd(), "drizzle"),
    });
  } catch (err) {
    const { message, failedIndex } = explainMigrationError(err);
    const guard = failedIndex ? INTEGRITY_INDEXES[failedIndex] : undefined;
    if (guard) {
      log(
        `INTEGRITY INDEX "${failedIndex}" COULD NOT BE CREATED: ${guard.guards}.`
      );
      try {
        const rows = await client.unsafe(guard.findBlockingRows);
        if (rows.length > 0) {
          log(
            `It is blocked by ${rows.length} duplicate group(s): ${JSON.stringify(rows)}`
          );
        }
      } catch (diagErr) {
        log(`Could not look for the blocking rows: ${String(diagErr)}`);
      }
    }
    throw new Error(message);
  } finally {
    await client.end({ timeout: 5 });
  }
}
