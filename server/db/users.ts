// Data-access functions for this domain, extracted verbatim from
// server/db.ts (Phase 4 god-file split). Pure move: no logic, query,
// validation or authorisation change. server/db.ts re-exports this
// module, so existing imports keep working.

import {
  InsertUser,
  type User,
  users,
} from "../../drizzle/schema";
import { ENV } from "../_core/env";
import {
  getDb,
} from "./core";
import {
  and,
  count,
  desc,
  eq,
  ne,
  sql,
} from "drizzle-orm";

// ─── Users ────────────────────────────────────────────────────────────────────

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  const textFields = ["name", "email", "loginMethod"] as const;
  type TextField = (typeof textFields)[number];
  const assignNullable = (field: TextField) => {
    const value = user[field];
    if (value === undefined) return;
    const normalized = value ?? null;
    values[field] = normalized;
    updateSet[field] = normalized;
  };
  textFields.forEach(assignNullable);

  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }
  if (user.churchRole !== undefined) {
    values.churchRole = user.churchRole;
    updateSet.churchRole = user.churchRole;
  }
  values.lastSignedIn ??= new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();

  await db
    .insert(users)
    .values(values)
    .onConflictDoUpdate({ target: users.openId, set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(users)
    .where(eq(users.openId, openId))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

/** Create the account for a first-time LINE sign-in. Returns the new row. */
export async function createLineUser(input: {
  openId: string;
  name: string | null;
  avatarUrl: string | null;
  status: "pending" | "active";
  isOwner: boolean;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const [row] = await db
    .insert(users)
    .values({
      openId: input.openId,
      name: input.name,
      avatarUrl: input.avatarUrl,
      loginMethod: "line",
      status: input.status,
      role: input.isOwner ? "admin" : "user",
      churchRole: input.isOwner ? "SUPER_ADMIN" : "MEMBER",
      churchRoles: input.isOwner ? "SUPER_ADMIN" : "MEMBER",
    })
    .onConflictDoNothing({ target: users.openId })
    .returning();
  return row ?? (await getUserByOpenId(input.openId));
}

export async function touchLineUser(
  userId: number,
  patch: { name: string | null; avatarUrl: string | null }
) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(users)
    .set({
      // Keep a custom name/photo edited by the user or admin, but refresh stale
      // LINE CDN URLs when LINE rotates a profile picture hash.
      name: sql`coalesce(nullif(${users.name}, ''), ${patch.name})`,
      avatarUrl: sql`case when ${users.avatarUrl} is null or ${users.avatarUrl} = '' or ${users.avatarUrl} like 'https://profile.line-scdn.net/%' or ${users.avatarUrl} like 'https://obs.line-scdn.net/%' then coalesce(${patch.avatarUrl}, ${users.avatarUrl}) else ${users.avatarUrl} end`,
      lastSignedIn: new Date(),
    })
    .where(eq(users.id, userId));
}

export async function setUserStatus(
  userId: number,
  status: "pending" | "active" | "disabled"
) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db
    .update(users)
    .set({ status, updatedAt: new Date() })
    .where(eq(users.id, userId));
}

/**
 * Delete an account that is not active (pending or disabled). Returns false
 * when the user does not exist or is still active, so a live account, and
 * with it the audit trail of who did what, is never removed by mistake.
 */
export async function deleteInactiveUser(userId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const deleted = await db
    .delete(users)
    .where(and(eq(users.id, userId), ne(users.status, "active")))
    .returning({ id: users.id });
  return deleted.length > 0;
}

export async function countPendingUsers(): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const [row] = await db
    .select({ n: count() })
    .from(users)
    .where(eq(users.status, "pending"));
  return Number(row?.n ?? 0);
}

export async function getAllUsers() {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select({
      id: users.id,
      openId: users.openId,
      name: users.name,
      email: users.email,
      loginMethod: users.loginMethod,
      role: users.role,
      churchRole: users.churchRole,
      churchRoles: users.churchRoles,
      status: users.status,
      avatarUrl: users.avatarUrl,
      createdAt: users.createdAt,
      lastSignedIn: users.lastSignedIn,
    })
    .from(users)
    .orderBy(desc(users.lastSignedIn));
}

export async function updateUserChurchRole(
  userId: number,
  churchRole: User["churchRole"],
  churchRoles?: string[] | null
) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const rolesString = churchRoles ? churchRoles.join(",") : churchRole;
  const isSuperAdmin =
    churchRole === "SUPER_ADMIN" ||
    Boolean(churchRoles && churchRoles.includes("SUPER_ADMIN"));
  const role = isSuperAdmin ? "admin" : "user";
  await db
    .update(users)
    .set({
      churchRole,
      churchRoles: rolesString,
      role,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));
}

export async function updateUserProfile(
  userId: number,
  input: {
    name?: string;
    avatarUrl?: string | null;
    phone?: string | null;
    department?: string | null;
    bio?: string | null;
  }
) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db
    .update(users)
    .set({
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.avatarUrl !== undefined ? { avatarUrl: input.avatarUrl } : {}),
      ...(input.phone !== undefined ? { phone: input.phone } : {}),
      ...(input.department !== undefined
        ? { department: input.department }
        : {}),
      ...(input.bio !== undefined ? { bio: input.bio } : {}),
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));
}
