import type { PackLanguage, PackLevel } from "../server/api-types";

export const levelLabels: Record<PackLevel, string> = { junior: "Junior", mid: "Mid-level", senior: "Senior" };
export const languageLabels: Record<PackLanguage, string> = { en: "English", fr: "French" };

/** A date and time in the reader's own format, e.g. "15 Oct 2026, 09:30". */
export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}
