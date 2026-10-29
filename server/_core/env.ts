export const ENV = {
  // Supabase Auth (email + password, accounts created by an admin)
  supabaseUrl: process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? "",
  supabasePublishableKey: process.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? "",
  // Server-only. Creates and resets member accounts. Never ship it to the browser.
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",

  // App settings
  // Email of the church owner. Signing in with this confirmed address
  // creates (or relinks) the SUPER_ADMIN account. Nobody else is created
  // without an invitation.
  ownerEmail: (process.env.OWNER_EMAIL ?? "").trim().toLowerCase(),
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  isProduction: process.env.NODE_ENV === "production",

  // Built-in Forge API (for AI features)
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",

  // LINE Official Account (for Slip AI feature)
  lineChannelSecret: process.env.LINE_CHANNEL_SECRET ?? "",
  lineChannelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN ?? "",

  // Supabase private slip bucket (default: "slips")
  supabaseSlipBucket: process.env.SUPABASE_SLIP_BUCKET ?? "slips",

  // Secret for protecting the Vercel Cron endpoint
  cronSecret: process.env.CRON_SECRET ?? "",

  // Allowed CORS origin (e.g. https://yourdomain.com). Empty string disables CORS header.
  allowedOrigin: process.env.ALLOWED_ORIGIN ?? "",
};
