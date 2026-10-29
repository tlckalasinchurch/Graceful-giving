import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { ENV } from "./env";

export type VerifiedIdentity = {
  /** Supabase auth user id (UUID). Stored in users.openId. */
  sub: string;
  /** Lower-cased, verified by the identity provider. */
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

/**
 * Verify a Supabase access token and return the identity it carries.
 * Throws when the token is invalid, expired, or has no verified email.
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
  // An unverified address must never match an invitation.
  if (meta.email_verified !== true) {
    throw new Error("Email address is not verified by the identity provider");
  }

  return {
    sub,
    email,
    name: (meta.full_name ?? meta.name ?? null) as string | null,
    provider:
      ((claims.app_metadata ?? {}) as Record<string, any>).provider ?? "google",
  };
}
