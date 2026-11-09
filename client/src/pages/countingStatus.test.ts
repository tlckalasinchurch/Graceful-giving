import { COUNTING_STATUSES } from "@shared/counting";
import { describe, expect, it } from "vitest";
import { isOpenSession } from "./countingStatus";

describe("isOpenSession", () => {
  it("is open until the round is posted", () => {
    expect(isOpenSession("counting")).toBe(true);
    expect(isOpenSession("counted")).toBe(true);
    expect(isOpenSession("verified")).toBe(true);
    expect(isOpenSession("posted")).toBe(false);
    expect(isOpenSession("closed")).toBe(false);
  });

  it("covers every status: open plus completed adds up to all of them", () => {
    const open = COUNTING_STATUSES.filter(isOpenSession);
    expect(open).toHaveLength(3);
    expect(COUNTING_STATUSES.length - open.length).toBe(2);
  });
});
