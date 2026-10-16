// Public shapes of an interview. Pure types: the UI imports them too.
import type { Language } from "../i18n.js";
import type { PackLevel } from "../packs/pack.js";

/** setup → asking (question 1 … N, each with optional follow-ups) → finished */
export type InterviewStatus = "setup" | "asking" | "finished";

export interface InterviewSummary {
  id: string;
  /** The packs the questions come from. Can be empty when every technology is uncurated. */
  packs: { id: string; title: string; technology: string }[];
  /** The technologies confirmed from a job offer. Empty without one. */
  technologies: string[];
  /** The technologies no pack covers: the interviewer writes their questions from the AI model's own knowledge. */
  uncurated: string[];
  /** The level the interview is pitched at. */
  level: PackLevel;
  /** The language the interview is held in, chosen by the candidate. It can differ from the pack's. */
  language: Language;
  status: InterviewStatus;
  /** The question being asked, from 1. 0 during setup; the last question's number once finished. */
  questionNumber: number;
  /**
   * 0 while the main question is being asked, then 1, 2… while the interviewer
   * follows up on it. Follow-ups don't count as questions.
   */
  followUpNumber: number;
  totalQuestions: number;
}

export interface TranscriptEntry {
  role: "interviewer" | "candidate";
  content: string;
  /** The main question this message belongs to, from 1. Absent on the interviewer's closing message. */
  questionNumber?: number;
  /** On an interviewer's follow-up question: which follow-up on the main question it is, from 1. */
  followUpNumber?: number;
}

export interface InterviewDetails extends InterviewSummary {
  transcript: TranscriptEntry[];
  /** Present once the debrief has been written. */
  debrief?: Debrief;
}

/**
 * Feedback on a finished interview, question by question. Encouraging and
 * without any score. Plain JSON, so it can be saved as is.
 */
export interface Debrief {
  /** True when the candidate ended the interview before the last question. */
  endedEarly: boolean;
  /** One entry per question the candidate answered, in order. Empty if they answered none. */
  questions: DebriefQuestion[];
  /** A few encouraging words on the interview as a whole. Empty when no question was answered. */
  summary: string;
}

export interface DebriefQuestion {
  /** The question's number in the interview, from 1. */
  number: number;
  /** The pack theme, or the technology for an uncurated question. */
  theme: string;
  question: string;
  /** What the answer got right. */
  strengths: string[];
  /** What the answer missed, from the pack's key points. */
  gaps: string[];
  modelAnswer: string;
  /**
   * What to study, taken from the pack. On an uncurated question, suggested by
   * the AI model, and left out when it gave no usable link.
   */
  resource?: { title: string; url: string };
  /** True when no pack covered the question: the AI model wrote it, and this feedback, from its own knowledge. */
  uncurated?: true;
}
