import { beforeEach, describe, expect, it } from "vitest";
import {
  clearDraft,
  DRAFT_MAX_AGE_MS,
  loadDraft,
  saveDraft,
  type GivingDraft,
} from "./givingDraft";

const draft: GivingDraft = {
  userId: 7,
  category: "tithe",
  amount: 500,
  fundId: "3",
  transferState: "done",
  savedAt: 1_000_000,
};

beforeEach(() => window.localStorage.clear());

describe("giving draft", () => {
  it("returns what was saved for the same person", () => {
    saveDraft(draft);
    expect(loadDraft(7, draft.savedAt + 1000)).toEqual(draft);
  });

  it("ignores a draft that belongs to someone else", () => {
    saveDraft(draft);
    expect(loadDraft(8, draft.savedAt)).toBeNull();
    expect(loadDraft(undefined, draft.savedAt)).toBeNull();
  });

  it("drops an old draft", () => {
    saveDraft(draft);
    expect(loadDraft(7, draft.savedAt + DRAFT_MAX_AGE_MS + 1)).toBeNull();
  });

  it("ignores broken data and clears on request", () => {
    window.localStorage.setItem("graceful-giving:draft:v1", "{oops");
    expect(loadDraft(7)).toBeNull();
    saveDraft(draft);
    clearDraft();
    expect(loadDraft(7, draft.savedAt)).toBeNull();
  });
});
