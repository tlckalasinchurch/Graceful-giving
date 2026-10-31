import { describe, expect, it } from "vitest";
import {
  EMPTY_GUARDED_PROFILE,
  GUARDED_PROFILE_FIELDS,
  isProfileDirty,
} from "./settingsDirty";

describe("isProfileDirty", () => {
  it("is false when nothing changed", () => {
    expect(isProfileDirty(EMPTY_GUARDED_PROFILE, EMPTY_GUARDED_PROFILE)).toBe(
      false
    );
  });

  it.each(GUARDED_PROFILE_FIELDS)("is true when only %s changed", field => {
    expect(
      isProfileDirty(
        { ...EMPTY_GUARDED_PROFILE, [field]: "changed" },
        EMPTY_GUARDED_PROFILE
      )
    ).toBe(true);
  });

  it("watches the payment fields, including the PromptPay ID", () => {
    for (const field of [
      "bankName",
      "bankAccount",
      "bankAccountName",
      "promptPayId",
    ] as const) {
      expect(GUARDED_PROFILE_FIELDS).toContain(field);
    }
  });
});
