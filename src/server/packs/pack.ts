/**
 * An interview pack: the curated content an interview is built from.
 *
 * Only one pack is built in for now, written in TypeScript. Packs become YAML
 * files with a validator later on (see issue #5).
 */
export interface Pack {
  id: string;
  technology: string;
  level: "junior" | "mid" | "senior";
  /** Language the interview is held in, as a two-letter code. */
  language: "en" | "fr";
  title: string;
  themes: PackTheme[];
}

export interface PackTheme {
  name: string;
  questions: string[];
  /** What a good answer covers. Grounds the follow-ups and the debrief later on. */
  keyPoints: string[];
  resources: { title: string; url: string }[];
}
