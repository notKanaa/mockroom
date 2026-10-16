import { isRecord, readJsonObject } from "../ai/json-reply.js";
import { collectText, type AIModel, type ChatMessage } from "../ai/model.js";
import { LocalizedError } from "../i18n.js";
import { say } from "../messages.js";
import type { PackResource } from "../packs/pack.js";
import { languageNames, translationNote, type PlannedQuestion } from "./prompt.js";
import { positionDescription, type InterviewSetup } from "./setup.js";
import type { Debrief, DebriefQuestion, TranscriptEntry } from "./types.js";

/** What the debrief is written from. */
export interface DebriefRequest {
  /** What the interview was built from, the language to write the debrief in included. */
  setup: InterviewSetup;
  /** The questions the candidate answered, in order. Question 1 first. */
  answered: PlannedQuestion[];
  totalQuestions: number;
  transcript: TranscriptEntry[];
  endedEarly: boolean;
}

/** The AI model sent a debrief Mockroom can't use, even after asking again. */
export class DebriefFormatError extends LocalizedError {}

/**
 * Asks the AI model for the debrief, as JSON, and checks it. A malformed reply
 * is sent back to the model once, with what was wrong, before giving up.
 */
export async function writeDebrief(model: AIModel, request: DebriefRequest): Promise<Debrief> {
  if (request.answered.length === 0) {
    return { endedEarly: request.endedEarly, questions: [], summary: "" };
  }

  const messages = debriefPrompt(request);
  let problem = "";
  for (let attempt = 1; attempt <= 2; attempt++) {
    const reply = await collectText(model.streamText(messages));
    const result = parseDebrief(reply, request);
    if (typeof result !== "string") return result;
    problem = result;
    messages.push(
      { role: "assistant", content: reply },
      {
        role: "user",
        content: `Mockroom couldn't read that debrief: ${problem}. Reply again with only the JSON object, in exactly the shape described.`,
      },
    );
  }
  throw new DebriefFormatError(say("debriefUnreadable", problem));
}

function debriefPrompt({ setup, answered, totalQuestions, transcript, endedEarly }: DebriefRequest): ChatMessage[] {
  const coverage = endedEarly
    ? `The candidate ended the interview early, after answering ${answered.length} of the ${totalQuestions} questions. Give feedback on these ${answered.length} questions only:`
    : `The candidate answered all ${totalQuestions} questions:`;

  const system = `You are a friendly technical interviewer writing the debrief of a mock job interview for a ${positionDescription(setup)} position. Write every text in ${languageNames[setup.language]}, even though these instructions are in English, but keep the JSON keys in English.${translationNote(setup)}

${coverage}

${answered.map((question, index) => describeQuestion(index + 1, question, setup)).join("\n\n")}

The transcript is grouped by question. The interviewer may have asked follow-up questions on a question to dig into the answer: they belong to that question, so judge the candidate's first answer and their answers to its follow-ups together, as one answer. Never write a separate entry for a follow-up.

For each of these questions, judge what the candidate actually said in the transcript:
- "strengths": what the answer got right, as short points. Be specific and sincere. If the candidate didn't know, credit any honest attempt or partial idea; leave it empty only if there is really nothing.
- "gaps": the key points the answer missed or got wrong, as short points phrased as things to add. Leave it empty if nothing important is missing.
- "modelAnswer": a short answer, a few sentences long, that covers the key points the way a strong candidate would say it.
- "resource": the number of the resource listed for that question that best helps with the gaps.${
    answered.some((question) => question.kind === "uncurated")
      ? `
- For a question the interviewer wrote itself, which has no resources listed, also give "question": the question asked, in one short sentence. Instead of "resource", give "resourceTitle" and "resourceUrl": the title and https:// link of a page of the technology's official documentation that helps with the gaps. Only give a page you are sure exists.`
      : ""
  }

Then "summary": two or three encouraging sentences on the interview as a whole, ending with what to focus on next.

Tone: warm and encouraging, like a mentor. Never give a score, grade, mark, percentage or rating of any kind.

Reply with only a JSON object, with no text before or after it and no code fence, in exactly this shape:
{"questions":[{"number":1,"strengths":["..."],"gaps":["..."],"modelAnswer":"...","resource":1}],"summary":"..."}`;

  return [
    { role: "system", content: system },
    { role: "user", content: `Here is the interview transcript.\n\n${transcriptByQuestion(transcript)}` },
  ];
}

/** The transcript as text, each question's messages (follow-ups included) under its own heading. */
function transcriptByQuestion(transcript: TranscriptEntry[]): string {
  const sections: string[][] = [];
  let current: number | undefined | null = null;
  for (const { role, content, questionNumber, followUpNumber } of transcript) {
    if (questionNumber !== current) {
      current = questionNumber;
      sections.push([questionNumber === undefined ? "After the last question" : `Question ${questionNumber}`]);
    }
    const author = role === "candidate" ? "Candidate" : followUpNumber ? "Interviewer (follow-up)" : "Interviewer";
    sections.at(-1)!.push(`${author}: ${content}`);
  }
  return sections.map((lines) => lines.join("\n\n")).join("\n\n---\n\n");
}

function describeQuestion(number: number, question: PlannedQuestion, { level }: InterviewSetup): string {
  if (question.kind === "uncurated") {
    return `Question ${number}, on ${question.technology}: no pack covers ${question.technology}, so the interviewer wrote this question itself. Read it in the transcript, and judge the answer against what a good ${level} developer would say.`;
  }
  const { theme, text } = question;
  return `Question ${number}, on the theme "${theme.name}": "${text}"
Key points of a good answer:
${theme.keyPoints.map((point) => `- ${point}`).join("\n")}
Resources:
${theme.resources.map((resource, index) => `${index + 1}. ${resource.title} (${resource.url})`).join("\n")}`;
}

/** Turns the model's reply into a debrief, or says what is wrong with it. */
function parseDebrief(reply: string, { answered, endedEarly, transcript }: DebriefRequest): Debrief | string {
  if (!reply.includes("{")) return "it contains no JSON object";
  const data = readJsonObject(reply);
  if (!data) return "it isn't valid JSON";
  if (!Array.isArray(data.questions)) return '"questions" must be a list';
  const items: unknown[] = data.questions;

  const questions: DebriefQuestion[] = [];
  for (const [index, planned] of answered.entries()) {
    const number = index + 1;
    // Small local models sometimes write the number as text ("1"), so both are accepted.
    const item = items.find((candidate) => isRecord(candidate) && Number(candidate.number) === number);
    if (!isRecord(item)) return `question ${number} is missing`;

    const strengths = textList(item.strengths);
    const gaps = textList(item.gaps);
    if (!strengths) return `question ${number}: "strengths" must be a list of texts`;
    if (!gaps) return `question ${number}: "gaps" must be a list of texts`;
    if (typeof item.modelAnswer !== "string" || item.modelAnswer.trim() === "") {
      return `question ${number}: "modelAnswer" must be a non-empty text`;
    }

    const feedback = { number, strengths, gaps, modelAnswer: item.modelAnswer.trim() };
    if (planned.kind === "pack") {
      questions.push({
        ...feedback,
        theme: planned.theme.name,
        question: planned.text,
        resource: pickResource(planned.theme.resources, item.resource),
      });
    } else {
      const resource = ownResource(item);
      questions.push({
        ...feedback,
        theme: planned.technology,
        question: nonEmptyText(item.question) ?? askedQuestion(transcript, number),
        ...(resource && { resource }),
        uncurated: true,
      });
    }
  }

  // The summary is a nice extra: small local models often leave it out, and the
  // per-question feedback is still worth showing without it.
  const summary = typeof data.summary === "string" ? data.summary.trim() : "";
  return { endedEarly, questions, summary };
}

/** The resource the model picked, or the theme's first one if its pick isn't in the list. */
function pickResource(resources: PackResource[], pick: unknown): PackResource {
  const picked = typeof pick === "number" ? resources[pick - 1] : undefined;
  const { title, url } = picked ?? resources[0]!;
  return { title, url };
}

/**
 * The resource the model suggested itself, if it looks like a real link. Read
 * from "resourceTitle" and "resourceUrl", or a "resource" object. Left out otherwise.
 */
function ownResource(item: Record<string, unknown>): PackResource | undefined {
  const nested = isRecord(item.resource) ? item.resource : {};
  const title = nonEmptyText(item.resourceTitle) ?? nonEmptyText(nested.title);
  const url = nonEmptyText(item.resourceUrl) ?? nonEmptyText(nested.url);
  if (!title || !url || !/^https:\/\/[^\s/]+\.[^\s]+$/.test(url)) return undefined;
  return { title, url };
}

/**
 * The question the interviewer asked, for when the model doesn't restate it:
 * the last sentence ending with a question mark in its message, or the whole message.
 */
function askedQuestion(transcript: TranscriptEntry[], number: number): string {
  const asked = transcript.find(
    (entry) => entry.role === "interviewer" && entry.questionNumber === number && !entry.followUpNumber,
  );
  const message = asked?.content.trim() ?? "";
  const sentences = message.split(/(?<=[.!?:])\s+|\n+/).map((sentence) => sentence.trim());
  return sentences.findLast((sentence) => sentence.endsWith("?")) ?? message;
}

function nonEmptyText(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() !== "" ? value.trim() : undefined;
}

function textList(value: unknown): string[] | undefined {
  if (!Array.isArray(value) || !value.every((entry) => typeof entry === "string")) return undefined;
  return value.map((entry: string) => entry.trim()).filter((entry) => entry !== "");
}
