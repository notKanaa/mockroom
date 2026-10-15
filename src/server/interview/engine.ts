import { randomUUID } from "node:crypto";
import type { AIModel } from "../ai/model.js";
import type { Pack } from "../packs/pack.js";
import { DebriefFormatError, writeDebrief } from "./debrief.js";
import { shouldFollowUp } from "./follow-up.js";
import { interviewerPrompt, type InterviewerStep, type PlannedQuestion } from "./prompt.js";
import type {
  Debrief,
  InterviewDetails,
  InterviewStatus,
  InterviewSummary,
  TranscriptEntry,
} from "./types.js";

/**
 * What an interviewer turn sends, in order: where the interview will stand once
 * the reply has fully streamed (known as soon as the interviewer has decided
 * whether to follow up), then the reply, chunk by chunk.
 */
export type TurnUpdate =
  | { type: "interview"; interview: InterviewSummary }
  | { type: "delta"; text: string };

/**
 * One interviewer message, triggered by starting the interview or by an answer.
 * It must be consumed: the turn only counts once it has fully streamed. If it
 * fails or is abandoned, the interview stays as it was and the candidate can
 * send the answer again.
 */
export type InterviewTurn = AsyncIterable<TurnUpdate>;

export type InterviewErrorCode =
  | "not-found"
  | "finished"
  | "busy"
  | "empty-answer"
  | "not-finished"
  | "debrief-failed";

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
  /** The most follow-up questions the interviewer asks on one main question. 0 turns follow-ups off. */
  followUpsPerQuestion?: number;
}

const defaultFollowUpsPerQuestion = 2;

interface Interview {
  id: string;
  pack: Pack;
  questions: PlannedQuestion[];
  status: InterviewStatus;
  questionNumber: number;
  /** How many follow-ups the interviewer has asked on the current question. */
  followUpNumber: number;
  /** How many questions the candidate has answered, so far. */
  answeredQuestions: number;
  transcript: TranscriptEntry[];
  /** True while the interviewer's reply is streaming. */
  busy: boolean;
  /** True when the candidate ended the interview before the last question. */
  endedEarly: boolean;
  debrief?: Debrief;
  /** The debrief being written, so simultaneous requests share it. */
  writingDebrief?: Promise<Debrief>;
}

/**
 * Runs interviews: setup → asking question 1 … N → finished → debrief.
 * After each answer, the interviewer may follow up on the same question, up to
 * a cap, before moving on. Ending early jumps from asking to finished.
 * Interviews live in memory for now; saving them comes with the history.
 */
export class InterviewEngine {
  readonly #model: AIModel;
  readonly #questionsPerInterview: number;
  readonly #followUpsPerQuestion: number;
  readonly #interviews = new Map<string, Interview>();

  constructor(
    model: AIModel,
    { questionsPerInterview = 5, followUpsPerQuestion = defaultFollowUpsPerQuestion }: InterviewEngineOptions = {},
  ) {
    this.#model = model;
    this.#questionsPerInterview = questionsPerInterview;
    this.#followUpsPerQuestion = followUpsPerQuestion;
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
      followUpNumber: 0,
      answeredQuestions: 0,
      transcript: [],
      busy: false,
      endedEarly: false,
    };
    this.#interviews.set(interview.id, interview);

    return this.#turn(interview, [], () => ({ kind: "open", question: firstQuestion }), () => {
      // An interview that never got going is dropped; the candidate starts a new one.
      this.#interviews.delete(interview.id);
    });
  }

  /**
   * Records the candidate's answer. The interviewer follows up on it when it needs
   * it and the cap allows, else asks the next question or closes the interview.
   */
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

    const { pack, questionNumber, followUpNumber } = interview;
    const transcript: TranscriptEntry[] = [
      ...interview.transcript,
      { role: "candidate", content, questionNumber },
    ];
    const question = interview.questions[questionNumber - 1]!;
    const nextQuestion = interview.questions[questionNumber];
    const moveOn: InterviewerStep =
      nextQuestion === undefined
        ? { kind: "close" }
        : { kind: "ask", questionNumber: questionNumber + 1, question: nextQuestion };
    if (followUpNumber >= this.#followUpsPerQuestion) return this.#turn(interview, transcript, () => moveOn);

    const model = this.#model;
    return this.#turn(interview, transcript, async () => {
      const exchange = transcript.filter((entry) => entry.questionNumber === questionNumber);
      return (await shouldFollowUp(model, { pack, question, exchange }))
        ? { kind: "follow-up", questionNumber, question, followUpNumber: followUpNumber + 1 }
        : moveOn;
    });
  }

  /** Ends the interview before the last question. The debrief covers the questions answered so far. */
  end(id: string): InterviewSummary {
    const interview = this.#find(id);
    if (interview.status === "finished") {
      throw new InterviewError("finished", "This interview is already over.");
    }
    if (interview.busy) {
      throw new InterviewError("busy", "The interviewer is still writing. Wait for their message.");
    }
    interview.status = "finished";
    interview.followUpNumber = 0;
    interview.endedEarly = true;
    return summarize(interview);
  }

  /** The debrief of a finished interview. It is written by the AI model the first time it is asked for. */
  async debrief(id: string): Promise<Debrief> {
    const interview = this.#find(id);
    if (interview.status !== "finished") {
      throw new InterviewError("not-finished", "The interview isn't over yet.");
    }
    if (interview.debrief) return interview.debrief;

    const writing = (interview.writingDebrief ??= writeDebrief(this.#model, {
      pack: interview.pack,
      answered: interview.questions.slice(0, interview.answeredQuestions),
      totalQuestions: interview.questions.length,
      transcript: interview.transcript,
      endedEarly: interview.endedEarly,
    }));
    try {
      interview.debrief = await writing;
      return interview.debrief;
    } catch (error) {
      if (error instanceof DebriefFormatError) throw new InterviewError("debrief-failed", error.message);
      throw new InterviewError(
        "debrief-failed",
        `The debrief couldn't be written: ${error instanceof Error ? error.message : String(error)}`,
      );
    } finally {
      if (interview.writingDebrief === writing) interview.writingDebrief = undefined;
    }
  }

  get(id: string): InterviewDetails {
    const interview = this.#find(id);
    return {
      ...summarize(interview),
      transcript: [...interview.transcript],
      ...(interview.debrief && { debrief: interview.debrief }),
    };
  }

  #find(id: string): Interview {
    const interview = this.#interviews.get(id);
    if (!interview) throw new InterviewError("not-found", "This interview doesn't exist.");
    return interview;
  }

  /** Plays an interviewer turn: decides what the interviewer says next, then streams it. */
  #turn(
    interview: Interview,
    transcript: TranscriptEntry[],
    decide: () => InterviewerStep | Promise<InterviewerStep>,
    onFailure?: () => void,
  ): InterviewTurn {
    const model = this.#model;
    interview.busy = true;

    async function* turn(): AsyncGenerator<TurnUpdate> {
      let committed = false;
      try {
        const step = await decide();
        const next = standingAfter(interview, step);
        // Every turn but the opening one follows an answer to the current question.
        const answeredQuestions = step.kind === "open" ? 0 : interview.questionNumber;
        yield { type: "interview", interview: { ...summarize(interview), ...next } };

        const messages = interviewerPrompt(interview.pack, interview.questions.length, transcript, step);
        let text = "";
        for await (const chunk of model.streamText(messages)) {
          text += chunk;
          yield { type: "delta", text: chunk };
        }
        if (text.trim() === "") throw new Error("The AI model sent an empty reply.");

        interview.transcript = [...transcript, { role: "interviewer", content: text, ...questionTags(step) }];
        interview.status = next.status;
        interview.questionNumber = next.questionNumber;
        interview.followUpNumber = next.followUpNumber;
        interview.answeredQuestions = answeredQuestions;
        committed = true;
      } finally {
        interview.busy = false;
        if (!committed) onFailure?.();
      }
    }

    return turn();
  }
}

/** Where the interview stands once the interviewer has said what `step` asks for. */
function standingAfter(
  interview: Interview,
  step: InterviewerStep,
): Pick<InterviewSummary, "status" | "questionNumber" | "followUpNumber"> {
  switch (step.kind) {
    case "open":
      return { status: "asking", questionNumber: 1, followUpNumber: 0 };
    case "ask":
      return { status: "asking", questionNumber: step.questionNumber, followUpNumber: 0 };
    case "follow-up":
      return { status: "asking", questionNumber: step.questionNumber, followUpNumber: step.followUpNumber };
    case "close":
      return { status: "finished", questionNumber: interview.questionNumber, followUpNumber: 0 };
  }
}

/** Which question the interviewer's message for `step` belongs to, as recorded in the transcript. */
function questionTags(step: InterviewerStep): Pick<TranscriptEntry, "questionNumber" | "followUpNumber"> {
  switch (step.kind) {
    case "open":
      return { questionNumber: 1 };
    case "ask":
      return { questionNumber: step.questionNumber };
    case "follow-up":
      return { questionNumber: step.questionNumber, followUpNumber: step.followUpNumber };
    case "close":
      return {};
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
    followUpNumber: interview.followUpNumber,
    totalQuestions: interview.questions.length,
  };
}
