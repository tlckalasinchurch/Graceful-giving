// Data-access functions for this domain, extracted verbatim from
// server/db.ts (Phase 4 god-file split). Pure move: no logic, query,
// validation or authorisation change. server/db.ts re-exports this
// module, so existing imports keep working.

import {
  InsertChurchEvent,
  InsertChurchNews,
  churchEvents,
  churchNews,
} from "../../drizzle/schema";
import {
  DEFAULT_CHURCH_ID,
  getDb,
} from "./core";
import {
  and,
  asc,
  desc,
  eq,
} from "drizzle-orm";

// ─── News & Events (existing) ─────────────────────────────────────────────────

export async function listPublishedChurchNews(limit = 12) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(churchNews)
    .where(
      and(
        eq(churchNews.churchId, DEFAULT_CHURCH_ID),
        eq(churchNews.status, "published")
      )
    )
    .orderBy(desc(churchNews.publishedAt), desc(churchNews.createdAt))
    .limit(limit);
}

export async function listPublishedChurchEvents(limit = 12) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(churchEvents)
    .where(
      and(
        eq(churchEvents.churchId, DEFAULT_CHURCH_ID),
        eq(churchEvents.status, "published")
      )
    )
    .orderBy(asc(churchEvents.startsAt))
    .limit(limit);
}

export async function listAllChurchNews(limit = 50) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(churchNews)
    .where(eq(churchNews.churchId, DEFAULT_CHURCH_ID))
    .orderBy(desc(churchNews.updatedAt))
    .limit(limit);
}

export async function listAllChurchEvents(limit = 50) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(churchEvents)
    .where(eq(churchEvents.churchId, DEFAULT_CHURCH_ID))
    .orderBy(desc(churchEvents.updatedAt))
    .limit(limit);
}

export async function createChurchNews(
  input: Omit<InsertChurchNews, "churchId">
) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const result = await db
    .insert(churchNews)
    .values({ ...input, churchId: DEFAULT_CHURCH_ID })
    .returning({ id: churchNews.id });
  return result[0].id;
}

export async function createChurchEvent(
  input: Omit<InsertChurchEvent, "churchId">
) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const result = await db
    .insert(churchEvents)
    .values({ ...input, churchId: DEFAULT_CHURCH_ID })
    .returning({ id: churchEvents.id });
  return result[0].id;
}

export async function updateChurchNews(
  id: number,
  input: Omit<InsertChurchNews, "churchId" | "authorId">
) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db
    .update(churchNews)
    .set(input)
    .where(
      and(eq(churchNews.id, id), eq(churchNews.churchId, DEFAULT_CHURCH_ID))
    );
}

export async function updateChurchEvent(
  id: number,
  input: Omit<InsertChurchEvent, "churchId" | "authorId">
) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db
    .update(churchEvents)
    .set(input)
    .where(
      and(eq(churchEvents.id, id), eq(churchEvents.churchId, DEFAULT_CHURCH_ID))
    );
}

export async function updateChurchNewsStatus(
  id: number,
  status: "draft" | "published" | "archived"
) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db
    .update(churchNews)
    .set({
      status,
      publishedAt: status === "published" ? new Date() : undefined,
    })
    .where(
      and(eq(churchNews.id, id), eq(churchNews.churchId, DEFAULT_CHURCH_ID))
    );
}

export async function updateChurchEventStatus(
  id: number,
  status: "draft" | "published" | "cancelled"
) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db
    .update(churchEvents)
    .set({ status })
    .where(
      and(eq(churchEvents.id, id), eq(churchEvents.churchId, DEFAULT_CHURCH_ID))
    );
}

export async function deleteChurchNews(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db
    .delete(churchNews)
    .where(
      and(eq(churchNews.id, id), eq(churchNews.churchId, DEFAULT_CHURCH_ID))
    );
}

export async function deleteChurchEvent(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db
    .delete(churchEvents)
    .where(
      and(eq(churchEvents.id, id), eq(churchEvents.churchId, DEFAULT_CHURCH_ID))
    );
}
