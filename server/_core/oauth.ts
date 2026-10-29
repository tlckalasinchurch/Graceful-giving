import type { Express } from "express";
import { registerLineLogin } from "./lineLogin";

// Sign-in is LINE Login. See lineLogin.ts: it sets the app_session_id cookie,
// and sdk.authenticateRequest() verifies it on every API request.
export function registerOAuthRoutes(app: Express) {
  registerLineLogin(app);
}
