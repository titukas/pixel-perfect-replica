export const APP_NAME = import.meta.env['VITE_APP_NAME'] || "Prince & Princess";
export const TERMS_VERSION = "2026-10-01";
export const PRIVACY_VERSION = "2026-10-01";

export const GENDERS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "non_binary", label: "Non-binary" },
  { value: "prefer_not_to_say", label: "Prefer not to say" },
] as const;
export type Gender = (typeof GENDERS)[number]["value"];

export function royalTitle(gender?: string | null) {
  if (gender === "male") return "Prince";
  if (gender === "female") return "Princess";
  return "Royal";
}
