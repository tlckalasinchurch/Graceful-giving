import type { CountingStatus } from "@shared/counting";

/**
 * A round that has not been posted to the books yet. The list tabs, the tab
 * counts and each card's actions all use this one rule, so they cannot
 * disagree.
 */
export function isOpenSession(status: string): boolean {
  const open: readonly CountingStatus[] = ["counting", "counted", "verified"];
  return (open as readonly string[]).includes(status);
}
