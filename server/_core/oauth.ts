import type { Express } from "express";

// OAuth routes previously handled Manus SSO login.
// Auth is managed by Supabase Auth (Google) — no server-side OAuth callback needed.
// The server verifies the Supabase access token on each API request via sdk.authenticateRequest().
export function registerOAuthRoutes(_app: Express) {
  // No-op: sign-in happens client-side; the server only verifies tokens.
}
