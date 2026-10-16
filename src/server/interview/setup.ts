import type { Language } from "../i18n.js";
import type { Pack, PackLevel } from "../packs/pack.js";
import { technologyKey } from "../packs/technology.js";

/** What an interview is built from: packs, technologies from a job offer, or both. */
export interface InterviewSetup {
  /** The packs the questions come from, in the order the interview goes through them. Can be empty. */
  packs: Pack[];
  /** The technologies the candidate confirmed from a job offer. Empty without one. */
  technologies: string[];
  /**
   * The technologies none of the packs cover. The interviewer writes their
   * questions from the AI model's own knowledge: they are less curated.
   */
  uncurated: string[];
  /** The level the interview is pitched at. */
  level: PackLevel;
  /** The language the interviewer and debrief use, whatever the packs' own language. */
  language: Language;
}

/** "a mid React and TypeScript developer", for the prompts. */
export function positionDescription({ packs, uncurated, level }: InterviewSetup): string {
  const technologies: string[] = [];
  for (const name of [...packs.map((pack) => pack.technology), ...uncurated]) {
    if (!technologies.some((known) => technologyKey(known) === technologyKey(name))) technologies.push(name);
  }
  return `${level} ${joinList(technologies)} developer`;
}

/** "A", "A and B", "A, B and C". */
export function joinList(items: readonly string[], last = "and"): string {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} ${last} ${items.at(-1)}`;
}
