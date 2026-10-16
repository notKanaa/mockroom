import type { Language } from "../i18n.js";
import type { PackLevel } from "../packs/pack.js";
import { sameTechnology } from "../packs/technology.js";

/** What matching needs to know about a pack. */
export interface MatchablePack {
  id: string;
  technology: string;
  level: PackLevel;
  language: Language;
}

/** A technology of the job offer, and the pack that covers it, if there is one. */
export interface TechnologyMatch {
  technology: string;
  /** The pack picked for it, or null when no pack covers it at this level: it is then uncurated. */
  packId: string | null;
}

/**
 * Picks a pack for each technology: one for the same technology at the same
 * level, preferably in the interview language. Packs are taken in the order
 * given (the library sorts them by title).
 */
export function matchPacks<P extends MatchablePack>(
  packs: readonly P[],
  technologies: readonly string[],
  level: PackLevel,
  language: Language,
): TechnologyMatch[] {
  return technologies.map((technology) => {
    const candidates = packs.filter((pack) => pack.level === level && sameTechnology(pack.technology, technology));
    const pack = candidates.find((candidate) => candidate.language === language) ?? candidates[0];
    return { technology, packId: pack?.id ?? null };
  });
}

/** The technologies none of the packs cover: the interviewer covers them from the AI model's own knowledge. */
export function uncoveredTechnologies(
  technologies: readonly string[],
  packs: readonly Pick<MatchablePack, "technology">[],
): string[] {
  return technologies.filter((technology) => !packs.some((pack) => sameTechnology(pack.technology, technology)));
}
