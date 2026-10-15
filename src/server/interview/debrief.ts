import { collectText, type AIModel, type ChatMessage } from "../ai/model.js";
import type { Pack, PackResource } from "../packs/pack.js";
import type { PlannedQuestion } from "./prompt.js";
import type { Debrief, DebriefQuestion, TranscriptEntry } from "./types.js";

/** What the debrief is written from. */
export interface DebriefRequest {
  pack: Pack;
  /** The questions the candidate answered, in order. Question 1 first. */
  answered: PlannedQuestion[];
  totalQuestions: number;
  transcript: TranscriptEntry[];
  endedEarly: boolean;
}

/** The AI model sent a debrief Mockroom can't use, even after asking again. */
export class DebriefFormatError extends Error {}

const languageNames: Record<Pack["language"], string> = { en: "English", fr: "French" };

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
  throw new DebriefFormatError(
    `The AI model sent a debrief Mockroom couldn't read, even after a second try (${problem}). Try again, or switch to a more capable model.`,
  );
}

function debriefPrompt({ pack, answered, totalQuestions, transcript, endedEarly }: DebriefRequest): ChatMessage[] {
  const coverage = endedEarly
    ? `The candidate ended the interview early, after answering ${answered.length} of the ${totalQuestions} questions. Give feedback on these ${answered.length} questions only:`
    : `The candidate answered all ${totalQuestions} questions:`;

  const system = `You are a friendly technical interviewer writing the debrief of a mock job interview for a ${pack.level} ${pack.technology} developer position, from the "${pack.title}" interview pack. Write every text in ${languageNames[pack.language]}, but keep the JSON keys in English.

${coverage}

${answered.map((question, index) => describeQuestion(index + 1, question)).join("\n\n")}

The transcript is grouped by question. The interviewer may have asked follow-up questions on a question to dig into the answer: they belong to that question, so judge the candidate's first answer and their answers to its follow-ups together, as one answer. Never write a separate entry for a follow-up.

For each of these questions, judge what the candidate actually said in the transcript:
- "strengths": what the answer got right, as short points. Be specific and sincere. If the candidate didn't know, credit any honest attempt or partial idea; leave it empty only if there is really nothing.
- "gaps": the key points the answer missed or got wrong, as short points phrased as things to add. Leave it empty if nothing important is missing.
- "modelAnswer": a short answer, a few sentences long, that covers the key points the way a strong candidate would say it.
- "resource": the number of the resource listed for that question that best helps with the gaps.

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

function describeQuestion(number: number, { theme, text }: PlannedQuestion): string {
  return `Question ${number}, on the theme "${theme.name}": "${text}"
Key points of a good answer:
${theme.keyPoints.map((point) => `- ${point}`).join("\n")}
Resources:
${theme.resources.map((resource, index) => `${index + 1}. ${resource.title} (${resource.url})`).join("\n")}`;
}

/** Turns the model's reply into a debrief, or says what is wrong with it. */
function parseDebrief(reply: string, { answered, endedEarly }: DebriefRequest): Debrief | string {
  const start = reply.indexOf("{");
  const end = reply.lastIndexOf("}");
  if (start === -1 || end < start) return "it contains no JSON object";

  let data: unknown;
  try {
    data = JSON.parse(reply.slice(start, end + 1));
  } catch {
    return "it isn't valid JSON";
  }
  if (!isRecord(data)) return "it isn't a JSON object";
  if (!Array.isArray(data.questions)) return '"questions" must be a list';
  const items: unknown[] = data.questions;

  const questions: DebriefQuestion[] = [];
  for (const [index, planned] of answered.entries()) {
    const number = index + 1;
    const item = items.find((candidate) => isRecord(candidate) && candidate.number === number);
    if (!isRecord(item)) return `question ${number} is missing`;

    const strengths = textList(item.strengths);
    const gaps = textList(item.gaps);
    if (!strengths) return `question ${number}: "strengths" must be a list of texts`;
    if (!gaps) return `question ${number}: "gaps" must be a list of texts`;
    if (typeof item.modelAnswer !== "string" || item.modelAnswer.trim() === "") {
      return `question ${number}: "modelAnswer" must be a non-empty text`;
    }

    questions.push({
      number,
      theme: planned.theme.name,
      question: planned.text,
      strengths,
      gaps,
      modelAnswer: item.modelAnswer.trim(),
      resource: pickResource(planned.theme.resources, item.resource),
    });
  }

  if (typeof data.summary !== "string" || data.summary.trim() === "") {
    return '"summary" must be a non-empty text';
  }
  return { endedEarly, questions, summary: data.summary.trim() };
}

/** The resource the model picked, or the theme's first one if its pick isn't in the list. */
function pickResource(resources: PackResource[], pick: unknown): PackResource {
  const picked = typeof pick === "number" ? resources[pick - 1] : undefined;
  const { title, url } = picked ?? resources[0]!;
  return { title, url };
}

function textList(value: unknown): string[] | undefined {
  if (!Array.isArray(value) || !value.every((entry) => typeof entry === "string")) return undefined;
  return value.map((entry: string) => entry.trim()).filter((entry) => entry !== "");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
