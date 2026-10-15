/**
 * An interview pack: the curated content an interview is built from.
 *
 * Packs are YAML files in the `packs` folder, checked by `parsePack` (see
 * CONTRIBUTING.md for the file format).
 */
export interface Pack {
  /** Unique, and the same as the file name without `.yaml`. */
  id: string;
  technology: string;
  level: PackLevel;
  /** Language the interview is held in, as a two-letter code. */
  language: PackLanguage;
  title: string;
  themes: PackTheme[];
}

export interface PackTheme {
  name: string;
  questions: string[];
  /** What a good answer covers. Grounds the follow-ups and the debrief. */
  keyPoints: string[];
  resources: PackResource[];
}

export interface PackResource {
  title: string;
  url: string;
}

export const packLevels = ["junior", "mid", "senior"] as const;
export type PackLevel = (typeof packLevels)[number];

export const packLanguages = ["en", "fr"] as const;
export type PackLanguage = (typeof packLanguages)[number];
