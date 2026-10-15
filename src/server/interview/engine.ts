import { randomUUID } from "node:crypto";
import type { AIModel } from "../ai/model.js";
import type { Pack } from "../packs/pack.js";
import { interviewerPrompt, type InterviewerStep, type PlannedQuestion } from "./prompt.js";
import type {
  InterviewDetails,
  InterviewStatus,
  InterviewSummary,
  TranscriptEntry,
} from "./types.js";

/** One interviewer message, triggered by starting the interview or by an answer. */
export interface InterviewTurn {
  /** Where the interview stands once the reply has fully streamed. */
  interview: InterviewSummary;
  /**
   * The interviewer's reply, chunk by chunk. It must be consumed: the turn only
   * counts once it has fully streamed. If it fails or is abandoned, the
   * interview stays as it was and the candidate can send the answer again.
   */
  reply: AsyncIterable<string>;
}

export type InterviewErrorCode = "not-found" | "finished" | "busy" | "empty-answer";

export class InterviewError extends Error {
  constructor(
    readonly code: InterviewErrorCode,
    message: string,
  ) {
    super(message);
  }
}

export interface InterviewEngineOptions {
  /** How many main questions an interview asks. */
  questionsPerInterview?: number;
}

interface Interview {
  id: string;
  pack: Pack;
  questions: PlannedQuestion[];
  status: InterviewStatus;
  questionNumber: number;
  transcript: TranscriptEntry[];
  /** True while the interviewer's reply is streaming. */
  busy: boolean;
}

/**
 * Runs interviews: setup → asking question 1 … N → finished.
 * Interviews live in memory for now; saving them comes with the history.
 */
export class InterviewEngine {
  readonly #model: AIModel;
  readonly #questionsPerInterview: number;
  readonly #interviews = new Map<string, Interview>();

  constructor(model: AIModel, { questionsPerInterview = 5 }: InterviewEngineOptions = {}) {
    this.#model = model;
    this.#questionsPerInterview = questionsPerInterview;
  }

  /** Starts an interview on a pack. The interviewer greets the candidate and asks question 1. */
  start(pack: Pack): InterviewTurn {
    const questions = planQuestions(pack, this.#questionsPerInterview);
    const firstQuestion = questions[0];
    if (firstQuestion === undefined) throw new Error(`Pack "${pack.id}" has no questions.`);

    const interview: Interview = {
      id: randomUUID(),
      pack,
      questions,
      status: "setup",
      questionNumber: 0,
      transcript: [],
      busy: false,
    };
    this.#interviews.set(interview.id, interview);

    return this.#turn(interview, [], { kind: "open", question: firstQuestion }, () => {
      // An interview that never got going is dropped; the candidate starts a new one.
      this.#interviews.delete(interview.id);
    });
  }

  /** Records the candidate's answer. The interviewer asks the next question, or closes the interview. */
  answer(id: string, answer: string): InterviewTurn {
    const interview = this.#find(id);
    if (interview.status === "finished") {
      throw new InterviewError("finished", "This interview is already over.");
    }
    if (interview.busy) {
      throw new InterviewError("busy", "The interviewer is still writing. Wait for their message.");
    }
    const content = answer.trim();
    if (content === "") throw new InterviewError("empty-answer", "The answer is empty.");

    const transcript: TranscriptEntry[] = [
      ...interview.transcript,
      { role: "candidate", content },
    ];
    const nextNumber = interview.questionNumber + 1;
    const nextQuestion = interview.questions[nextNumber - 1];
    const step: InterviewerStep =
      nextQuestion === undefined
        ? { kind: "close" }
        : { kind: "ask", questionNumber: nextNumber, question: nextQuestion };

    return this.#turn(interview, transcript, step);
  }

  get(id: string): InterviewDetails {
    const interview = this.#find(id);
    return { ...summarize(interview), transcript: [...interview.transcript] };
  }

  #find(id: string): Interview {
    const interview = this.#interviews.get(id);
    if (!interview) throw new InterviewError("not-found", "This interview doesn't exist.");
    return interview;
  }

  #turn(
    interview: Interview,
    transcript: TranscriptEntry[],
    step: InterviewerStep,
    onFailure?: () => void,
  ): InterviewTurn {
    const next =
      step.kind === "close"
        ? { status: "finished" as const, questionNumber: interview.questionNumber }
        : { status: "asking" as const, questionNumber: step.kind === "open" ? 1 : step.questionNumber };
    const messages = interviewerPrompt(interview.pack, interview.questions.length, transcript, step);
    const model = this.#model;
    interview.busy = true;

    async function* reply(): AsyncGenerator<string> {
      let text = "";
      let complete = false;
      try {
        for await (const chunk of model.streamText(messages)) {
          text += chunk;
          yield chunk;
        }
        if (text.trim() === "") throw new Error("The AI model sent an empty reply.");
        complete = true;
      } finally {
        interview.busy = false;
        if (complete) {
          interview.transcript = [...transcript, { role: "interviewer", content: text }];
          interview.status = next.status;
          interview.questionNumber = next.questionNumber;
        } else {
          onFailure?.();
        }
      }
    }

    return { interview: { ...summarize(interview), ...next }, reply: reply() };
  }
}

/** Picks the questions to ask from the pack, one theme after another. */
function planQuestions(pack: Pack, count: number): PlannedQuestion[] {
  const questions: PlannedQuestion[] = [];
  const longestTheme = Math.max(0, ...pack.themes.map((theme) => theme.questions.length));
  for (let round = 0; round < longestTheme; round++) {
    for (const theme of pack.themes) {
      const text = theme.questions[round];
      if (text !== undefined) questions.push({ theme, text });
    }
  }
  return questions.slice(0, count);
}

function summarize(interview: Interview): InterviewSummary {
  return {
    id: interview.id,
    pack: { id: interview.pack.id, title: interview.pack.title },
    status: interview.status,
    questionNumber: interview.questionNumber,
    totalQuestions: interview.questions.length,
  };
}
