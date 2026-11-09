import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Every form that creates a record must take the lock before it sends, and
 * release it when the request ends. A disabled button alone does not stop two
 * clicks that arrive in the same instant.
 */
const PAGES: Array<[string, string]> = [
  ["pages/NewOffering.tsx", "createMutation.mutate("],
  ["pages/NewExpense.tsx", "createExpenseMutation.mutate("],
  ["pages/NewWithdrawal.tsx", "createWithdrawalMutation.mutate("],
  ["pages/Funds.tsx", "createAccountMutation.mutate("],
  ["pages/Budgets.tsx", "createPlan.mutate("],
  ["pages/Members.tsx", "createMember.mutate("],
  ["pages/Counting.tsx", "createSession.mutate("],
];

describe("create forms use the submit lock", () => {
  it.each(PAGES)("%s", (file, call) => {
    const src = readFileSync(join(__dirname, file), "utf8");
    expect(src).toContain("useSubmitLock()");
    expect(src).toContain("onSettled: unlock");
    const at = src.indexOf(call);
    expect(at).toBeGreaterThan(-1);
    // The lock is taken earlier in the same handler, before the request goes.
    expect(src.slice(0, at)).toContain("if (!lock()) return;");
  });
});
