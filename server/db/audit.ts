// Data-access functions for this domain, extracted verbatim from
// server/db.ts (Phase 4 god-file split). Pure move: no logic, query,
// validation or authorisation change. server/db.ts re-exports this
// module, so existing imports keep working.

import {
  auditLogs,
  users,
} from "../../drizzle/schema";
import {
  DEFAULT_CHURCH_ID,
  getDb,
} from "./core";
import {
  desc,
  eq,
} from "drizzle-orm";

export async function createAuditLog(input: {
  churchId?: string;
  userId: number;
  action: string;
  entity: string;
  entityId?: number | null;
  metadata?: unknown;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db.insert(auditLogs).values({
    churchId: input.churchId ?? DEFAULT_CHURCH_ID,
    userId: input.userId,
    action: input.action,
    entity: input.entity,
    entityId: input.entityId ?? null,
    metadata: input.metadata,
  });
}

export async function listAuditLogs(
  churchId: string = DEFAULT_CHURCH_ID,
  limit: number = 100
) {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select({
      id: auditLogs.id,
      churchId: auditLogs.churchId,
      userId: auditLogs.userId,
      userName: users.name,
      userEmail: users.email,
      action: auditLogs.action,
      entity: auditLogs.entity,
      entityId: auditLogs.entityId,
      metadata: auditLogs.metadata,
      createdAt: auditLogs.createdAt,
    })
    .from(auditLogs)
    .leftJoin(users, eq(auditLogs.userId, users.id))
    .where(eq(auditLogs.churchId, churchId))
    .orderBy(desc(auditLogs.createdAt))
    .limit(limit);
}
