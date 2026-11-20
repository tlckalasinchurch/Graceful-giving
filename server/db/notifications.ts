// Data-access functions for this domain, extracted verbatim from
// server/db.ts (Phase 4 god-file split). Pure move: no logic, query,
// validation or authorisation change. server/db.ts re-exports this
// module, so existing imports keep working.

import {
  InsertNotification,
  notifications,
} from "../../drizzle/schema";
import {
  DEFAULT_CHURCH_ID,
  getDb,
} from "./core";
import {
  and,
  count,
  desc,
  eq,
  isNull,
} from "drizzle-orm";

export async function listNotifications(
  userId: number,
  churchId = DEFAULT_CHURCH_ID,
  limit = 50
) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(notifications)
    .where(
      and(
        eq(notifications.userId, userId),
        eq(notifications.churchId, churchId)
      )
    )
    .orderBy(desc(notifications.createdAt))
    .limit(limit);
}

export async function countUnreadNotifications(
  userId: number,
  churchId = DEFAULT_CHURCH_ID
) {
  const db = await getDb();
  if (!db) return 0;
  const [row] = await db
    .select({ n: count() })
    .from(notifications)
    .where(
      and(
        eq(notifications.userId, userId),
        eq(notifications.churchId, churchId),
        isNull(notifications.readAt)
      )
    );
  return row?.n ?? 0;
}

export async function createNotification(
  input: Omit<InsertNotification, "churchId" | "createdAt" | "readAt">,
  churchId = DEFAULT_CHURCH_ID
) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const rows = await db
    .insert(notifications)
    .values({ ...input, churchId })
    .returning({ id: notifications.id });
  return rows[0].id;
}

export async function markNotificationRead(
  id: number,
  userId: number,
  churchId = DEFAULT_CHURCH_ID
) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(
      and(
        eq(notifications.id, id),
        eq(notifications.userId, userId),
        eq(notifications.churchId, churchId)
      )
    );
}

export async function markAllNotificationsRead(
  userId: number,
  churchId = DEFAULT_CHURCH_ID
) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(
      and(
        eq(notifications.userId, userId),
        eq(notifications.churchId, churchId)
      )
    );
}
