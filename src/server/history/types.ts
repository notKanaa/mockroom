// Shapes of the interview history. Pure types: the UI imports them too.
import type { Debrief, TranscriptEntry } from "../interview/types.js";
import type { PackLanguage, PackLevel } from "../packs/pack.js";

/**
 * A finished interview, as saved in the history: one JSON file per interview,
 * in the user's Mockroom data folder.
 */
export interface SavedInterview {
  /** The file format's version, raised if it ever changes in a way older files don't follow. */
  formatVersion: 1;
  id: string;
  /** When the interview started and finished, as ISO 8601 dates. */
  startedAt: string;
  finishedAt: string;
  /** The packs the interview was built from. Can be empty when every technology was uncurated. */
  packs: SavedPack[];
  /**
   * The technologies the candidate confirmed from a job offer: empty without one.
   * Missing from interviews saved before job offers existed, like the next two fields.
   */
  technologies?: string[];
  /** The technologies no pack covered, asked from the AI model's own knowledge. */
  uncurated?: string[];
  /** The level the interview was pitched at. */
  level?: PackLevel;
  /** The language the interview was held in. */
  language: PackLanguage;
  totalQuestions: number;
  /** How many questions the candidate answered. */
  answeredQuestions: number;
  /** True when the candidate ended the interview before the last question. */
  endedEarly: boolean;
  /** The whole conversation, follow-ups included. */
  transcript: TranscriptEntry[];
  /** Null until the debrief is written, or if it couldn't be. */
  debrief: Debrief | null;
}

export interface SavedPack {
  id: string;
  title: string;
  technology: string;
  level: PackLevel;
}

/** A past interview as listed by `GET /api/history`: everything but the transcript and debrief. */
export type HistoryEntry = Omit<SavedInterview, "formatVersion" | "transcript" | "debrief"> & {
  hasDebrief: boolean;
};
