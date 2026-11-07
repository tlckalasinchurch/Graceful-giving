/**
 * Member Matcher — Links LINE slips to church members
 *
 * Strict matching hierarchy (in priority order):
 *   1. lineUserId exact match → confidence 1.0  → produces "matched"
 *   2. Sender name EXACT match (normalized) → confidence 0.95 → produces "matched"
 *   3. Sender name normalized (no honorifics/spaces) → 100% match → "matched"
 *   4. Levenshtein similarity ≥ 0.85 → confidence = score → produces "needs_review"
 *   5. No match → confidence 0 → "needs_review"
 *
 * Rules 4 and 5 NEVER produce "matched" status.
 * Only exact matches (rules 1–3) auto-advance to "matched".
 * Fuzzy matches always require staff review.
 */

import { getDb } from "../db";
import { members } from "../../drizzle/schema";
import { and, eq } from "drizzle-orm";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MatchResult {
  memberId: number;
  memberName: string;
  /** 0.0–1.0 confidence score */
  confidence: number;
  /** How the match was determined */
  method: "line_id" | "name_exact" | "name_normalized" | "name_fuzzy";
  /** Whether this match is reliable enough to auto-advance to "matched" */
  isAutoMatch: boolean;
}

// ─── Name normalization ───────────────────────────────────────────────────────

/** Remove common Thai honorifics, spaces, and normalize case */
function normalizeName(name: string): string {
  return name
    .replace(
      /^(นาย|นาง|นางสาว|เด็กชาย|เด็กหญิง|ด\.ต\.|ร\.ต\.|Mr\.|Mrs\.|Ms\.|Miss\.?)\s*/i,
      ""
    )
    .replace(/\s+/g, "")
    .toLowerCase()
    .trim();
}

// ─── Levenshtein distance ─────────────────────────────────────────────────────

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

/** Similarity ratio 0.0–1.0 */
function similarity(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1.0;
  return 1 - levenshtein(a, b) / maxLen;
}

const FUZZY_THRESHOLD = 0.85;

// ─── Main matcher ─────────────────────────────────────────────────────────────

export async function matchMember(
  churchId: string,
  lineUserId: string,
  extractedSenderName: string | null
): Promise<MatchResult | null> {
  const db = await getDb();
  if (!db) return null;

  const activeMembers = await db
    .select({
      id: members.id,
      name: members.name,
      lineUserId: members.lineUserId,
    })
    .from(members)
    .where(and(eq(members.churchId, churchId), eq(members.status, "active")));

  // ── Rule 1: Exact LINE userId match ───────────────────────────────────────
  const byLineId = activeMembers.find(m => m.lineUserId === lineUserId);
  if (byLineId) {
    return {
      memberId: byLineId.id,
      memberName: byLineId.name,
      confidence: 1.0,
      method: "line_id",
      isAutoMatch: true,
    };
  }

  if (!extractedSenderName) return null;

  // ── Rule 2: Exact name match (raw) ────────────────────────────────────────
  const byExactName = activeMembers.find(
    m =>
      m.name.toLowerCase().trim() === extractedSenderName.toLowerCase().trim()
  );
  if (byExactName) {
    return {
      memberId: byExactName.id,
      memberName: byExactName.name,
      confidence: 0.95,
      method: "name_exact",
      isAutoMatch: true,
    };
  }

  // ── Rule 3: Normalized name exact match ───────────────────────────────────
  const normalizedExtracted = normalizeName(extractedSenderName);
  const byNormalizedName = activeMembers.find(
    m => normalizeName(m.name) === normalizedExtracted
  );
  if (byNormalizedName) {
    return {
      memberId: byNormalizedName.id,
      memberName: byNormalizedName.name,
      confidence: 0.9,
      method: "name_normalized",
      isAutoMatch: true,
    };
  }

  // ── Rule 4: Fuzzy similarity match → needs_review ALWAYS ─────────────────
  let bestMatch: MatchResult | null = null;
  let bestScore = 0;

  for (const member of activeMembers) {
    const score = similarity(normalizedExtracted, normalizeName(member.name));
    if (score > bestScore && score >= FUZZY_THRESHOLD) {
      bestScore = score;
      bestMatch = {
        memberId: member.id,
        memberName: member.name,
        confidence: score,
        method: "name_fuzzy",
        isAutoMatch: false, // NEVER auto-advance — always needs_review
      };
    }
  }

  return bestMatch; // null if no match found (also → needs_review)
}
