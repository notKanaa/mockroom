// Public shapes of an interview. Pure types: the UI imports them too.

/** setup → asking (question 1 … N) → finished */
export type InterviewStatus = "setup" | "asking" | "finished";

export interface InterviewSummary {
  id: string;
  pack: { id: string; title: string };
  status: InterviewStatus;
  /** The question being asked, from 1. 0 during setup; the last question's number once finished. */
  questionNumber: number;
  totalQuestions: number;
}

export interface TranscriptEntry {
  role: "interviewer" | "candidate";
  content: string;
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
  theme: string;
  question: string;
  /** What the answer got right. */
  strengths: string[];
  /** What the answer missed, from the pack's key points. */
  gaps: string[];
  modelAnswer: string;
  /** What to study, taken from the pack. */
  resource: { title: string; url: string };
}
