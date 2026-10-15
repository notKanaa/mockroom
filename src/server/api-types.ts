// Shapes sent over the HTTP API. Pure types: the UI imports them too.
import type { InterviewSummary } from "./interview/types.js";
import type { PackLanguage, PackLevel } from "./packs/pack.js";

export type {
  Debrief,
  DebriefQuestion,
  InterviewDetails,
  InterviewStatus,
  InterviewSummary,
  TranscriptEntry,
} from "./interview/types.js";

export type { PackLanguage, PackLevel } from "./packs/pack.js";

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
 * One line of an interviewer turn, streamed as newline-delimited JSON:
 * `interview` first (where the interview will stand), then `delta`s, then `done` or `error`.
 * After an `error`, the interview is unchanged and the answer can be sent again.
 */
export type TurnEvent =
  | { type: "interview"; interview: InterviewSummary }
  | { type: "delta"; text: string }
  | { type: "done"; interview: InterviewSummary }
  | { type: "error"; message: string };

export interface ApiError {
  error: string;
}
