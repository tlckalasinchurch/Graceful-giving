import { describe, expect, it } from "vitest";
import { stationOnlyRedirect } from "./routeAccess";

const member = { role: "user", churchRole: "MEMBER", roles: ["MEMBER"] };

describe("stationOnlyRedirect", () => {
  it.each([
    "/",
    "/offerings",
    "/giving/inbox",
    "/settings",
    "/profile",
    "/updates",
  ])("sends an ordinary member from %s to the station", path => {
    expect(stationOnlyRedirect(member, path)).toBe("/giving/station");
  });

  it("leaves a member on the station, 404 and a trailing slash alone", () => {
    expect(stationOnlyRedirect(member, "/giving/station")).toBeNull();
    expect(stationOnlyRedirect(member, "/giving/station/")).toBeNull();
    expect(stationOnlyRedirect(member, "/404")).toBeNull();
  });

  it.each(["SUPER_ADMIN", "PASTOR", "TREASURER", "DEACON", "COUNTER"])(
    "never moves %s",
    churchRole => {
      expect(
        stationOnlyRedirect(
          { role: "user", churchRole, roles: [churchRole] },
          "/"
        )
      ).toBeNull();
    }
  );

  it("never moves an admin", () => {
    expect(
      stationOnlyRedirect({ role: "admin", churchRole: "MEMBER" }, "/offerings")
    ).toBeNull();
  });
});
