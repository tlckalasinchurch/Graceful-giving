import { describe, expect, it } from "vitest";
import { CHURCH_ROLES } from "@shared/roles";

describe("church role labels", () => {
  it("do not use the word มัคนายก", () => {
    for (const info of Object.values(CHURCH_ROLES)) {
      const text = [
        info.label,
        info.labelWithCode,
        info.badgeLabel,
        info.description,
      ].join(" ");
      expect(text).not.toContain("มัคนายก");
    }
  });

  it("names the department role ผู้รับผิดชอบฝ่าย", () => {
    expect(CHURCH_ROLES.DEACON.label).toBe("ผู้รับผิดชอบฝ่าย");
  });
});
