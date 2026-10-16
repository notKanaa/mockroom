// Shapes sent over the HTTP API. Pure types: the UI imports them too.
import type { Language } from "./i18n.js";
import type { InterviewSummary } from "./interview/types.js";
import type { TechnologyMatch } from "./job-offer/match.js";
import type { PackLanguage, PackLevel } from "./packs/pack.js";

export type {
  Debrief,
  DebriefQuestion,
  InterviewDetails,
  InterviewStatus,
  InterviewSummary,
  TranscriptEntry,
} from "./interview/types.js";

export type { HistoryEntry, SavedInterview, SavedPack } from "./history/types.js";

export type { PackLanguage, PackLevel } from "./packs/pack.js";

export type { Language } from "./i18n.js";

export type { TechnologyMatch } from "./job-offer/match.js";

export type {
  AISettingsInput,
  AISettingsView,
  ConnectionTest,
  KeyedProviderName,
  MaskedKey,
  OllamaModels,
  ProviderChoice,
  ProviderInfo,
  ProviderName,
  SettingSource,
} from "./settings/types.js";

/** A pack as listed by `GET /api/packs`, which takes optional `technology`, `level` and `language` filters. */
export interface PackSummary {
  id: string;
  technology: string;
  level: PackLevel;
  language: PackLanguage;
  title: string;
  /** Theme names, in the order the interview goes through them. */
  themes: string[];
}

/**
 * What `POST /api/job-offers/detect` found in a job offer, sent as
 * `{"jobOffer": "...", "language": "en"}`: the technologies and level, and the
 * pack matching each technology at that level (preferably in `language`, the
 * interview language). A technology without a pack is uncurated.
 */
export interface JobOfferDetection {
  technologies: string[];
  level: PackLevel;
  matches: TechnologyMatch[];
}

/**
 * The packs matching technologies the candidate edited, from
 * `POST /api/job-offers/match` with `{"technologies": [...], "level": "mid", "language": "en"}`.
 */
export interface PackMatches {
  matches: TechnologyMatch[];
}

/**
 * Starts an interview (`POST /api/interviews`): on packs, on technologies
 * confirmed from a job offer, or both. Technologies no chosen pack covers are
 * asked from the AI model's own knowledge.
 */
export interface InterviewRequest {
  packIds?: string[];
  /** A single pack, the same as `packIds: [packId]`. */
  packId?: string;
  technologies?: string[];
  /** The level for the technologies. Defaults to the first pack's. */
  level?: PackLevel;
  /** Defaults to the first pack's language, or English. */
  language?: Language;
}

/**
 * One line of an interviewer turn, streamed as newline-delimited JSON:
 * `interview` first (where the interview will stand, once the interviewer has
 * decided whether to follow up), then `delta`s, then `done`. An `error` can come
 * at any point, even first, and ends the turn: the interview is then unchanged
 * and the answer can be sent again.
 */
export type TurnEvent =
  | { type: "interview"; interview: InterviewSummary }
  | { type: "delta"; text: string }
  | { type: "done"; interview: InterviewSummary }
  | { type: "error"; message: string };

export interface ApiError {
  error: string;
}
