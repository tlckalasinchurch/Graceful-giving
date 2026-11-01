import { describe, expect, it } from "vitest";
import { compareReceiverAccount } from "./receiverAccount";

const CHURCH = "123-4-56789-0";

describe("compareReceiverAccount", () => {
  it("matches a fully shown number, ignoring separators", () => {
    expect(compareReceiverAccount("1234567890", CHURCH)).toEqual({
      kind: "match",
    });
    expect(compareReceiverAccount("123 4 56789 0", CHURCH).kind).toBe("match");
  });

  it("matches a masked number when every visible digit agrees", () => {
    expect(compareReceiverAccount("xxx-x-x6789-x", CHURCH).kind).toBe("match");
    expect(compareReceiverAccount("XXX-X-X6789-X", CHURCH).kind).toBe("match");
    expect(compareReceiverAccount("***-*-*6789-*", CHURCH).kind).toBe("match");
    expect(compareReceiverAccount("123-4-xxx89-0", CHURCH).kind).toBe("match");
  });

  it("is a mismatch when two or more visible digits differ", () => {
    expect(compareReceiverAccount("xxx-x-x1234-x", CHURCH)).toEqual({
      kind: "mismatch",
      differing: 4,
    });
    expect(compareReceiverAccount("987-6-54321-0", CHURCH).kind).toBe(
      "mismatch"
    );
  });

  it("is only suspect when exactly one visible digit differs", () => {
    expect(compareReceiverAccount("xxx-x-x6788-x", CHURCH)).toEqual({
      kind: "suspect",
    });
  });

  it("does not judge a number that is too masked", () => {
    expect(compareReceiverAccount("xxx-x-xxx89-x", CHURCH)).toEqual({
      kind: "unknown",
      reason: "too_masked",
    });
  });

  it("does not judge when the lengths differ", () => {
    expect(compareReceiverAccount("xxx-x-x6789", CHURCH)).toEqual({
      kind: "unknown",
      reason: "length_differs",
    });
    expect(compareReceiverAccount("0812345678", "123-4-56789-0-1").kind).toBe(
      "unknown"
    );
  });

  it("does not judge a slip with no readable number", () => {
    expect(compareReceiverAccount(null, CHURCH)).toEqual({
      kind: "unknown",
      reason: "unreadable",
    });
    expect(compareReceiverAccount("ไม่ระบุ", CHURCH).kind).toBe("unknown");
  });

  it("does not judge when the church has no account set", () => {
    expect(compareReceiverAccount("1234567890", null)).toEqual({
      kind: "unknown",
      reason: "no_church_account",
    });
    expect(compareReceiverAccount("1234567890", "  ").kind).toBe("unknown");
    expect(compareReceiverAccount("1234567890", "123").kind).toBe("unknown");
  });
});
