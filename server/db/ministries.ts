// Data-access functions for this domain, extracted verbatim from
// server/db.ts (Phase 4 god-file split). Pure move: no logic, query,
// validation or authorisation change. server/db.ts re-exports this
// module, so existing imports keep working.

import {
  InsertMinistry,
  ministries,
} from "../../drizzle/schema";
import {
  DEFAULT_CHURCH_ID,
  getDb,
} from "./core";
import {
  and,
  asc,
  eq,
} from "drizzle-orm";

// ─── Ministries ──────────────────────────────────────────────────────────────

export async function listMinistries(
  churchId = DEFAULT_CHURCH_ID,
  limit = 100
) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(ministries)
    .where(eq(ministries.churchId, churchId))
    .orderBy(asc(ministries.name))
    .limit(limit);
}

export async function getMinistryById(
  id: number,
  churchId = DEFAULT_CHURCH_ID
) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select()
    .from(ministries)
    .where(and(eq(ministries.id, id), eq(ministries.churchId, churchId)))
    .limit(1);
  return rows[0] ?? null;
}

export async function createMinistry(
  input: Omit<InsertMinistry, "churchId">,
  churchId = DEFAULT_CHURCH_ID
) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const rows = await db
    .insert(ministries)
    .values({ ...input, churchId })
    .returning({ id: ministries.id });
  return rows[0].id;
}

export async function updateMinistry(
  id: number,
  input: Partial<Omit<InsertMinistry, "churchId">>,
  churchId = DEFAULT_CHURCH_ID
) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const rows = await db
    .update(ministries)
    .set(input)
    .where(and(eq(ministries.id, id), eq(ministries.churchId, churchId)))
    .returning({ id: ministries.id });
  return rows[0]?.id ?? null;
}

export async function archiveMinistry(
  id: number,
  churchId = DEFAULT_CHURCH_ID
) {
  return updateMinistry(id, { status: "inactive" }, churchId);
}
