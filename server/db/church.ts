// Data-access functions for this domain, extracted verbatim from
// server/db.ts (Phase 4 god-file split). Pure move: no logic, query,
// validation or authorisation change. server/db.ts re-exports this
// module, so existing imports keep working.

import { InsertChurchProfile, churchProfiles } from "../../drizzle/schema";
import { DEFAULT_CHURCH_ID, getDb } from "./core";
import { eq } from "drizzle-orm";

// ─── Church Profile ───────────────────────────────────────────────────────────

export async function getChurchProfile(churchId = DEFAULT_CHURCH_ID) {
  const db = await getDb();
  if (!db) return null;
  const result = await db
    .select()
    .from(churchProfiles)
    .where(eq(churchProfiles.churchId, churchId))
    .limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function upsertChurchProfile(input: InsertChurchProfile) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const churchId = input.churchId ?? DEFAULT_CHURCH_ID;
  const {
    id: _id,
    createdAt: _createdAt,
    churchId: _c,
    ...updateFields
  } = input;
  await db
    .insert(churchProfiles)
    .values({ ...input, churchId })
    .onConflictDoUpdate({
      target: churchProfiles.churchId,
      set: { ...updateFields, updatedAt: new Date() },
    });
}

/** The saved poster words as JSON text, or null when none were saved. */
export async function getStationPosterJson(
  churchId = DEFAULT_CHURCH_ID
): Promise<string | null> {
  const db = await getDb();
  if (!db) return null;
  const result = await db
    .select({ stationPoster: churchProfiles.stationPoster })
    .from(churchProfiles)
    .where(eq(churchProfiles.churchId, churchId))
    .limit(1);
  return result[0]?.stationPoster ?? null;
}

/** Saves the poster words. Creates the profile row when there is none. */
export async function saveStationPosterJson(
  json: string,
  churchId = DEFAULT_CHURCH_ID
) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db
    .insert(churchProfiles)
    .values({ churchId, name: "Grace-giving", stationPoster: json })
    .onConflictDoUpdate({
      target: churchProfiles.churchId,
      set: { stationPoster: json, updatedAt: new Date() },
    });
}

export async function markSetupCompleted(churchId = DEFAULT_CHURCH_ID) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db
    .update(churchProfiles)
    .set({ setupCompleted: true })
    .where(eq(churchProfiles.churchId, churchId));
}

// ─── Finance Accounts / Funds ──────────────────────────────────────────────────
