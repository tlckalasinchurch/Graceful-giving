// Data-access functions for this domain, extracted verbatim from
// server/db.ts (Phase 4 god-file split). Pure move: no logic, query,
// validation or authorisation change. server/db.ts re-exports this
// module, so existing imports keep working.

import { InsertMember, members } from "../../drizzle/schema";
import { DEFAULT_CHURCH_ID, getDb } from "./core";
import { and, asc, eq } from "drizzle-orm";

// ─── Members / Notifications / Audit ──────────────────────────────────────────

export async function listMembers(churchId = DEFAULT_CHURCH_ID, limit = 500) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(members)
    .where(eq(members.churchId, churchId))
    .orderBy(asc(members.name))
    .limit(limit);
}

export async function getMemberById(id: number, churchId = DEFAULT_CHURCH_ID) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select()
    .from(members)
    .where(and(eq(members.id, id), eq(members.churchId, churchId)))
    .limit(1);
  return rows[0] ?? null;
}

export async function createMember(
  input: Omit<InsertMember, "churchId">,
  churchId = DEFAULT_CHURCH_ID
) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const rows = await db
    .insert(members)
    .values({ ...input, churchId })
    .returning({ id: members.id });
  return rows[0].id;
}

export async function updateMember(
  id: number,
  input: Partial<Omit<InsertMember, "churchId">>,
  churchId = DEFAULT_CHURCH_ID
) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const rows = await db
    .update(members)
    .set(input)
    .where(and(eq(members.id, id), eq(members.churchId, churchId)))
    .returning({ id: members.id });
  return rows[0]?.id ?? null;
}

export async function deactivateMember(
  id: number,
  churchId = DEFAULT_CHURCH_ID
) {
  return updateMember(id, { status: "inactive" }, churchId);
}
