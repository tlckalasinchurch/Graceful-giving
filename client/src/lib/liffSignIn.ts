/**
 * Sign-in inside the LINE app, with the LIFF SDK. The /give page is a LIFF
 * app, so LINE has already signed the person in. The page sends LINE's ID
 * token to the server. The server asks LINE to verify it, then sets the
 * session cookie. Outside the LINE app nothing here runs, and the page shows
 * the ordinary LINE button.
 */

export type LiffSignInResult =
  /** The server set the session cookie. */
  | "signed_in"
  /** The page runs in a normal browser. Show the LINE button. */
  | "not_in_line"
  /** LIFF is sending the person to sign in. The page will reload. */
  | "redirecting"
  /** Something failed. Show the LINE button. */
  | "failed";

/** The LIFF ID the server holds, or null when LIFF is off. */
export async function fetchLiffId(
  fetchImpl: typeof fetch = fetch
): Promise<string | null> {
  try {
    const res = await fetchImpl("/api/auth/liff/config", {
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { liffId?: unknown };
    return typeof data.liffId === "string" && data.liffId ? data.liffId : null;
  } catch {
    return null;
  }
}

/** Signs in with the LIFF ID token. Never throws. */
export async function signInWithLiff(
  liffId: string
): Promise<LiffSignInResult> {
  try {
    // Loaded on demand, so a visitor in a normal browser does not download it.
    const { default: liff } = await import("@line/liff");
    await liff.init({ liffId });
    if (!liff.isInClient()) return "not_in_line";
    if (!liff.isLoggedIn()) {
      liff.login({ redirectUri: window.location.href });
      return "redirecting";
    }
    const idToken = liff.getIDToken();
    if (!idToken) return "failed";
    const res = await fetch("/api/auth/liff/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
    });
    return res.ok ? "signed_in" : "failed";
  } catch {
    return "failed";
  }
}
