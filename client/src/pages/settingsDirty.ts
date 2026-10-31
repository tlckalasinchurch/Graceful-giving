/**
 * The church profile fields the unsaved-changes guard watches. A field that is
 * editable on the settings page must be listed here, or leaving the page with
 * a change in it gives no warning.
 */
export const GUARDED_PROFILE_FIELDS = [
  "name",
  "address",
  "phone",
  "email",
  "pastorName",
  "treasurerName",
  "motto",
  "bankName",
  "bankAccount",
  "bankAccountName",
  "promptPayId",
] as const;

export type GuardedProfile = Record<
  (typeof GUARDED_PROFILE_FIELDS)[number],
  string
>;

export const EMPTY_GUARDED_PROFILE: GuardedProfile = {
  name: "",
  address: "",
  phone: "",
  email: "",
  pastorName: "",
  treasurerName: "",
  motto: "",
  bankName: "",
  bankAccount: "",
  bankAccountName: "",
  promptPayId: "",
};

/** True when any watched field differs from what was last loaded or saved. */
export function isProfileDirty(
  current: GuardedProfile,
  baseline: GuardedProfile
): boolean {
  return GUARDED_PROFILE_FIELDS.some(key => current[key] !== baseline[key]);
}
