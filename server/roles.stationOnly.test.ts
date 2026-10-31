import { describe, expect, it } from "vitest";
import { isStationOnlyUser } from "@shared/roles";

describe("isStationOnlyUser", () => {
  it("is true for an ordinary member", () => {
    expect(isStationOnlyUser({ role: "user", churchRole: "MEMBER" })).toBe(
      true
    );
    expect(isStationOnlyUser({ churchRole: null })).toBe(true);
  });

  it.each(["SUPER_ADMIN", "PASTOR", "TREASURER", "DEACON", "COUNTER"])(
    "is false for %s",
    churchRole => {
      expect(isStationOnlyUser({ role: "user", churchRole })).toBe(false);
    }
  );

  it("is false for an admin whatever the church role", () => {
    expect(isStationOnlyUser({ role: "admin", churchRole: "MEMBER" })).toBe(
      false
    );
  });

  it("looks at every role the person holds", () => {
    expect(
      isStationOnlyUser({
        role: "user",
        churchRole: "MEMBER",
        roles: ["MEMBER", "COUNTER"],
      })
    ).toBe(false);
    expect(
      isStationOnlyUser({
        role: "user",
        churchRole: "MEMBER",
        roles: ["MEMBER"],
      })
    ).toBe(true);
  });

  it("is false when nobody is signed in", () => {
    expect(isStationOnlyUser(null)).toBe(false);
    expect(isStationOnlyUser(undefined)).toBe(false);
  });
});
