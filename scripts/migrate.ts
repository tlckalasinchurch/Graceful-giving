/**
 * Applies the drizzle migrations.
 *
 *   pnpm db:migrate           run now, against the database in the environment
 *   pnpm db:migrate:deploy    run as a deploy step: only on a production
 *                             Vercel build, and fail loudly if it cannot
 *
 * See drizzle/README.md.
 */
import {
  pickMigrationUrl,
  runMigrations,
  shouldMigrate,
} from "../server/migrate";

const onlyProduction = process.argv.includes("--only-production");
const say = (line: string) => console.log(`[migrate] ${line}`);

const decision = shouldMigrate(process.env, { onlyProduction });
if (!decision.run) {
  say(`Skipped: ${decision.reason}.`);
  process.exit(0);
}

const target = pickMigrationUrl(process.env);
if (!target) {
  console.error(
    "[migrate] No database URL is set. Set DATABASE_URL_MIGRATE (the owner role) " +
      "or DATABASE_URL. To build without migrating, set SKIP_DB_MIGRATE=1."
  );
  process.exit(1);
}

say(`Migrating with ${target.name}.`);
try {
  await runMigrations({ url: target.url, log: say });
  say("Done. The database schema is up to date.");
} catch (err) {
  console.error(
    `[migrate] FAILED: ${err instanceof Error ? err.message : err}`
  );
  process.exit(1);
}
