/**
 * Startup check for settings that are easy to leave empty on a deployment.
 * A secret that exists but is empty looks configured in the dashboard and fails
 * only when a request needs it, so the app reports the names once per cold start.
 * It never prints a value.
 */
export type ConfigIssue = { name: string; needed: string };

const REQUIRED: Array<{ names: string[]; needed: string; minLength?: number }> =
  [
    {
      names: ["DATABASE_URL", "POSTGRES_URL", "POSTGRES_PRISMA_URL"],
      needed: "database",
    },
    { names: ["JWT_SECRET"], needed: "sign-in session cookie", minLength: 32 },
    { names: ["LINE_LOGIN_CHANNEL_ID"], needed: "LINE Login" },
    { names: ["LINE_LOGIN_CHANNEL_SECRET"], needed: "LINE Login" },
    { names: ["APP_URL"], needed: "LINE Login callback address" },
    { names: ["OWNER_OPEN_ID"], needed: "first super admin" },
    { names: ["LINE_CHANNEL_SECRET"], needed: "LINE slip webhook signature" },
    {
      names: ["LINE_CHANNEL_ACCESS_TOKEN"],
      needed: "LINE slip download and reply",
    },
    { names: ["CRON_SECRET"], needed: "slip worker schedule" },
    { names: ["SUPABASE_URL"], needed: "file storage" },
    { names: ["SUPABASE_SERVICE_ROLE_KEY"], needed: "file storage" },
    {
      names: ["GOOGLE_API_KEY", "GEMINI_API_KEY"],
      needed: "slip reading (OCR)",
    },
  ];

export function missingConfig(
  env: Record<string, string | undefined> = process.env
): ConfigIssue[] {
  const issues: ConfigIssue[] = [];
  for (const item of REQUIRED) {
    const value = item.names
      .map(n => (env[n] ?? "").trim())
      .find(v => v.length > 0);
    if (!value) {
      issues.push({ name: item.names.join(" or "), needed: item.needed });
    } else if (item.minLength && value.length < item.minLength) {
      issues.push({
        name: `${item.names[0]} (shorter than ${item.minLength} characters)`,
        needed: item.needed,
      });
    }
  }
  return issues;
}

let reported = false;

export function reportMissingConfig(
  env: Record<string, string | undefined> = process.env,
  log: (message: string) => void = m => console.warn(m)
) {
  if (reported) return;
  reported = true;
  const issues = missingConfig(env);
  if (issues.length === 0) return;
  log(
    `[Config] ${issues.length} setting(s) missing or empty: ` +
      issues.map(i => `${i.name} (${i.needed})`).join("; ")
  );
}

/** Test helper. */
export function resetConfigReport() {
  reported = false;
}
