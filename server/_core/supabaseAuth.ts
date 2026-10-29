import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { ENV } from "./env";
import { isEmailConfirmed } from "./supabaseAdmin";

export type VerifiedIdentity = {
  /** Supabase auth user id (UUID). Stored in users.openId. */
  sub: string;
  /** Lower-cased and confirmed. */
  email: string;
  name: string | null;
  provider: string;
};

let client: SupabaseClient | null = null;

function getClient(): SupabaseClient {
  if (!ENV.supabaseUrl || !ENV.supabasePublishableKey) {
    throw new Error(
      "Auth config missing: set SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY"
    );
  }
  client ??= createClient(ENV.supabaseUrl, ENV.supabasePublishableKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}

const CONFIRMED_TTL_MS = 5 * 60 * 1000;
const confirmedCache = new Map<string, number>();

/**
 * The token claim is enough when it says "verified". Accounts an admin created
 * may not carry that claim, so ask Supabase once per user and cache the answer.
 */
async function isConfirmed(sub: string, claimSaysVerified: boolean) {
  if (claimSaysVerified) return true;
  const until = confirmedCache.get(sub);
  if (until && until > Date.now()) return true;
  if (!(await isEmailConfirmed(sub))) return false;
  confirmedCache.set(sub, Date.now() + CONFIRMED_TTL_MS);
  return true;
}

/**
 * Verify a Supabase access token and return the identity it carries.
 * Throws when the token is invalid, expired, or has no confirmed email.
 */
export async function verifySupabaseToken(
  token: string
): Promise<VerifiedIdentity> {
  const { data, error } = await getClient().auth.getClaims(token);
  if (error || !data?.claims) {
    throw new Error(`Invalid session token: ${error?.message ?? "no claims"}`);
  }
  const claims = data.claims as Record<string, any>;
  const sub = claims.sub as string | undefined;
  const email = (claims.email as string | undefined)?.trim().toLowerCase();
  if (!sub) throw new Error("Invalid session token: missing sub");
  if (!email) throw new Error("Invalid session token: missing email");

  const meta = (claims.user_metadata ?? {}) as Record<string, any>;
  // An unconfirmed address must never match an invitation.
  if (!(await isConfirmed(sub, meta.email_verified === true))) {
    throw new Error("Email address is not confirmed");
  }

  return {
    sub,
    email,
    name: (meta.full_name ?? meta.name ?? null) as string | null,
    provider:
      ((claims.app_metadata ?? {}) as Record<string, any>).provider ?? "google",
  };
}
