import type { TrpcContext } from "../_core/context";

/** A full `users` row, as the tRPC context carries it. */
export type TestUser = NonNullable<TrpcContext["user"]>;

/**
 * Build a full test user. Fields a test does not care about get honest
 * "absent" defaults (null role fields, active status — the same defaults
 * the database and the real sign-in flow produce), so a test only spells
 * out the fields its assertions depend on.
 */
export function makeUser(overrides: Partial<TestUser> = {}): TestUser {
  return {
    id: 1,
    openId: "test-user",
    email: null,
    name: "Test User",
    loginMethod: null,
    role: "user",
    churchRole: null,
    churchRoles: null,
    status: "active",
    avatarUrl: null,
    phone: null,
    department: null,
    bio: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
    ...overrides,
  };
}

/**
 * Build a tRPC context for router-caller tests. The procedures under test
 * only ever call `clearCookie` on the response, so a minimal stub cast
 * through `unknown` is enough — the cast lives here once instead of being
 * repeated in every test file.
 */
export function createTestContext(user: TestUser | null): TrpcContext {
  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => undefined } as unknown as TrpcContext["res"],
  };
}
