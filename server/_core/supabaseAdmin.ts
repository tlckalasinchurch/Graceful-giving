import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { ENV } from "./env";

let admin: SupabaseClient | null = null;

function getAdmin(): SupabaseClient {
  if (!ENV.supabaseUrl || !ENV.supabaseServiceRoleKey) {
    throw new Error(
      "Account admin config missing: set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY"
    );
  }
  admin ??= createClient(ENV.supabaseUrl, ENV.supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return admin;
}

export class AuthAccountExistsError extends Error {
  constructor() {
    super("An auth account with this email already exists");
    this.name = "AuthAccountExistsError";
  }
}

/** Find a Supabase auth user by email. A church has few accounts, so one page is enough. */
export async function findAuthUserByEmail(email: string) {
  const { data, error } = await getAdmin().auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });
  if (error) throw new Error(`Cannot list auth users: ${error.message}`);
  const wanted = email.trim().toLowerCase();
  return data.users.find(u => u.email?.toLowerCase() === wanted) ?? null;
}

/** Create a confirmed email + password account. */
export async function createAuthAccount(email: string, password: string) {
  const { data, error } = await getAdmin().auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error) {
    if (/already|exists|registered/i.test(error.message)) {
      throw new AuthAccountExistsError();
    }
    throw new Error(`Cannot create auth account: ${error.message}`);
  }
  return data.user;
}

export async function setAuthPassword(email: string, password: string) {
  const user = await findAuthUserByEmail(email);
  if (!user) throw new Error("No auth account for this email");
  const { error } = await getAdmin().auth.admin.updateUserById(user.id, {
    password,
  });
  if (error) throw new Error(`Cannot set password: ${error.message}`);
}

export async function deleteAuthAccount(email: string) {
  const user = await findAuthUserByEmail(email);
  if (!user) return;
  const { error } = await getAdmin().auth.admin.deleteUser(user.id);
  if (error) throw new Error(`Cannot delete auth account: ${error.message}`);
}

/** True when the identity provider confirmed ownership of this email. */
export async function isEmailConfirmed(authUserId: string): Promise<boolean> {
  const { data, error } = await getAdmin().auth.admin.getUserById(authUserId);
  if (error || !data.user) return false;
  return Boolean(data.user.email_confirmed_at);
}
