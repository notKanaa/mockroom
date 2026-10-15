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
}
