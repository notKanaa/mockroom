import { randomUUID } from "node:crypto";
import type { AIModel } from "../ai/model.js";
import type { InterviewHistory } from "../history/store.js";
import type { SavedInterview } from "../history/types.js";
import { LocalizedError, localizedMessage, type Language, type Text } from "../i18n.js";
import { say } from "../messages.js";
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

export class InterviewError extends LocalizedError {
  constructor(
    readonly code: InterviewErrorCode,
    text: Text,
  ) {
    super(text);
  }
}

export interface InterviewEngineOptions {
  /** How many main questions an interview asks. */
  questionsPerInterview?: number;
  /** The most follow-up questions the interviewer asks on one main question. 0 turns follow-ups off. */
  followUpsPerQuestion?: number;
  /** Where finished interviews are saved. Without it, nothing is saved. */
  history?: Pick<InterviewHistory, "save">;
  /** The current time. Tests set it to get known dates. */
  now?: () => Date;
}

const defaultFollowUpsPerQuestion = 2;

interface Interview {
  id: string;
  pack: Pack;
  /** The language the interviewer and debrief use, whatever the pack's own language. */
  language: Language;
  startedAt: Date;
  /** Set when the interview finishes. */
  finishedAt?: Date;
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
 * A finished interview is saved to the history, and saved again once its
 * debrief is written.
 */
export class InterviewEngine {
  readonly #model: AIModel;
  readonly #questionsPerInterview: number;
  readonly #followUpsPerQuestion: number;
  readonly #history: Pick<InterviewHistory, "save"> | undefined;
  readonly #now: () => Date;
  readonly #interviews = new Map<string, Interview>();

  constructor(
    model: AIModel,
    {
      questionsPerInterview = 5,
      followUpsPerQuestion = defaultFollowUpsPerQuestion,
      history,
      now = () => new Date(),
    }: InterviewEngineOptions = {},
  ) {
    this.#model = model;
    this.#questionsPerInterview = questionsPerInterview;
    this.#followUpsPerQuestion = followUpsPerQuestion;
    this.#history = history;
    this.#now = now;
  }

  /**
   * Starts an interview on a pack, held in `language` (by default, the pack's).
   * The interviewer greets the candidate and asks question 1.
   */
  start(pack: Pack, language: Language = pack.language): InterviewTurn {
    const questions = planQuestions(pack, this.#questionsPerInterview);
    const firstQuestion = questions[0];
    if (firstQuestion === undefined) throw new Error(`Pack "${pack.id}" has no questions.`);

    const interview: Interview = {
      id: randomUUID(),
      pack,
      language,
      startedAt: this.#now(),
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
    if (interview.status === "finished") throw new InterviewError("finished", say("interviewFinished"));
    if (interview.busy) throw new InterviewError("busy", say("interviewerBusy"));
    const content = answer.trim();
    if (content === "") throw new InterviewError("empty-answer", say("emptyAnswer"));

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
  async end(id: string): Promise<InterviewSummary> {
    const interview = this.#find(id);
    if (interview.status === "finished") throw new InterviewError("finished", say("interviewFinished"));
    if (interview.busy) throw new InterviewError("busy", say("interviewerBusy"));
    interview.status = "finished";
    interview.finishedAt = this.#now();
    interview.followUpNumber = 0;
    interview.endedEarly = true;
    await this.#save(interview);
    return summarize(interview);
  }

  /** The debrief of a finished interview. It is written by the AI model the first time it is asked for. */
  async debrief(id: string): Promise<Debrief> {
    const interview = this.#find(id);
    if (interview.status !== "finished") {
      throw new InterviewError("not-finished", say("interviewNotFinished"));
    }
    if (interview.debrief) return interview.debrief;

    const writing = (interview.writingDebrief ??= writeDebrief(this.#model, {
      pack: interview.pack,
      language: interview.language,
      answered: interview.questions.slice(0, interview.answeredQuestions),
      totalQuestions: interview.questions.length,
      transcript: interview.transcript,
      endedEarly: interview.endedEarly,
    }).then(async (debrief) => {
      interview.debrief = debrief;
      await this.#save(interview);
      return debrief;
    }));
    try {
      return await writing;
    } catch (error) {
      if (error instanceof DebriefFormatError) throw new InterviewError("debrief-failed", error.text);
      throw new InterviewError("debrief-failed", (language) =>
        say("debriefFailed", localizedMessage(error, language))(language),
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

  /**
   * Saves a finished interview to the history. A failure is reported in the
   * terminal but doesn't stop the interview: the candidate still gets the debrief.
   */
  async #save(interview: Interview): Promise<void> {
    if (!this.#history) return;
    try {
      await this.#history.save(toSaved(interview));
    } catch (error) {
      console.error(
        `This interview couldn't be saved to the history: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  #find(id: string): Interview {
    const interview = this.#interviews.get(id);
    if (!interview) throw new InterviewError("not-found", say("interviewNotFound"));
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
    const now = this.#now;
    const save = (finished: Interview) => this.#save(finished);
    interview.busy = true;

    async function* turn(): AsyncGenerator<TurnUpdate> {
      let committed = false;
      try {
        const step = await decide();
        const next = standingAfter(interview, step);
        // Every turn but the opening one follows an answer to the current question.
        const answeredQuestions = step.kind === "open" ? 0 : interview.questionNumber;
        yield { type: "interview", interview: { ...summarize(interview), ...next } };

        const messages = interviewerPrompt(
          interview.pack,
          interview.language,
          interview.questions.length,
          transcript,
          step,
        );
        let text = "";
        for await (const chunk of model.streamText(messages)) {
          text += chunk;
          yield { type: "delta", text: chunk };
        }
        if (text.trim() === "") throw new LocalizedError(say("emptyReply"));

        interview.transcript = [...transcript, { role: "interviewer", content: text, ...questionTags(step) }];
        interview.status = next.status;
        interview.questionNumber = next.questionNumber;
        interview.followUpNumber = next.followUpNumber;
        interview.answeredQuestions = answeredQuestions;
        committed = true;
        if (next.status === "finished") {
          interview.finishedAt = now();
          await save(interview);
        }
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

function toSaved(interview: Interview): SavedInterview {
  const { id, pack, startedAt, finishedAt = startedAt } = interview;
  return {
    formatVersion: 1,
    id,
    startedAt: startedAt.toISOString(),
    finishedAt: finishedAt.toISOString(),
    packs: [{ id: pack.id, title: pack.title, technology: pack.technology, level: pack.level }],
    language: interview.language,
    totalQuestions: interview.questions.length,
    answeredQuestions: interview.answeredQuestions,
    endedEarly: interview.endedEarly,
    transcript: [...interview.transcript],
    debrief: interview.debrief ?? null,
  };
}

function summarize(interview: Interview): InterviewSummary {
  return {
    id: interview.id,
    pack: { id: interview.pack.id, title: interview.pack.title },
    language: interview.language,
    status: interview.status,
    questionNumber: interview.questionNumber,
    followUpNumber: interview.followUpNumber,
    totalQuestions: interview.questions.length,
  };
}
