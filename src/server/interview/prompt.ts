import type { ChatMessage } from "../ai/model.js";
import type { Language } from "../i18n.js";
import type { Pack, PackTheme } from "../packs/pack.js";
import { joinList, positionDescription, type InterviewSetup } from "./setup.js";
import type { TranscriptEntry } from "./types.js";

/**
 * A main question of the interview: taken from one of a pack's themes, or, for a
 * technology no pack covers, left for the interviewer to write itself.
 */
export type PlannedQuestion =
  | { kind: "pack"; pack: Pack; theme: PackTheme; text: string }
  | { kind: "uncurated"; technology: string };

/** What the interviewer must say in its next message. */
export type InterviewerStep =
  | { kind: "open"; question: PlannedQuestion }
  | { kind: "ask"; questionNumber: number; question: PlannedQuestion }
  | { kind: "follow-up"; questionNumber: number; question: PlannedQuestion; followUpNumber: number }
  | { kind: "close" };

export const languageNames: Record<Language, string> = { en: "English", fr: "French" };

/** Opens every conversation, since some providers require it to start with the user. */
export const candidateJoinedMessages: Record<Language, string> = {
  en: "Hello, I'm ready for the interview.",
  fr: "Bonjour, je suis prêt pour l'entretien.",
};

/**
 * Tells the model to speak the interview language even though packs (and these
 * instructions) are written in another one. Empty when they all match.
 */
export function translationNote({ packs, language }: InterviewSetup): string {
  const others = [...new Set(packs.map((pack) => pack.language))].filter((other) => other !== language);
  if (others.length === 0) return "";
  const owner = packs.length === 1 ? "The pack's" : "The packs'";
  return ` ${owner} questions, themes and key points are written in ${joinList(others.map((other) => languageNames[other]))}: translate them into ${languageNames[language]}.`;
}

/** Where the interview's questions come from, for the prompts. */
export function sourcesDescription({ packs, uncurated }: InterviewSetup): string {
  const sources = packs.map(
    (pack) => `the "${pack.title}" interview pack, whose themes are: ${pack.themes.map((theme) => theme.name).join(", ")}`,
  );
  if (uncurated.length > 0) {
    sources.push(`questions you write yourself on ${joinList(uncurated)}, which no pack covers`);
  }
  return sources.join("; and ");
}

/** Builds the conversation sent to the AI model for the interviewer's next message. */
export function interviewerPrompt(
  setup: InterviewSetup,
  totalQuestions: number,
  transcript: TranscriptEntry[],
  step: InterviewerStep,
): ChatMessage[] {
  return [
    { role: "system", content: systemPrompt(setup, totalQuestions, step) },
    { role: "user", content: candidateJoinedMessages[setup.language] },
    ...transcript.map(
      ({ role, content }): ChatMessage => ({
        role: role === "interviewer" ? "assistant" : "user",
        content,
      }),
    ),
  ];
}

function systemPrompt(setup: InterviewSetup, totalQuestions: number, step: InterviewerStep): string {
  const language = languageNames[setup.language];
  const ownQuestions =
    setup.uncurated.length > 0
      ? `\n- When you are told to write a question yourself, ask the kind of question a real recruiter asks a ${setup.level} developer about that technology, on a topic this interview hasn't covered yet.`
      : "";
  return `You are a friendly, professional technical interviewer running a mock job interview for a ${positionDescription(setup)} position. Conduct the interview in ${language}: write every message in ${language}, even though these instructions are in English.${translationNote(setup)}

Rules:
- Ask exactly one question per message: the one you are told to ask next. You may rephrase it slightly so it sounds natural, but keep its meaning.${ownQuestions}
- When you are told to follow up, dig into the candidate's last answer the way a real recruiter would, but never say or imply that it was incomplete or wrong.
- Never reveal, explain or hint at the answer to any question, even if the candidate asks for it or says they don't know.
- Never correct, grade or comment on the quality of the candidate's answers. They get detailed feedback in a separate debrief after the interview.
- If the candidate asks for the answer or wants to skip, kindly say you'll move on, then follow your instruction for the next message.
- Keep messages short and conversational, with no headings or bullet lists.

The interview has ${totalQuestions} questions, taken from ${sourcesDescription(setup)}.

Your next message: ${stepInstruction(step, totalQuestions, setup)}`;
}

function stepInstruction(step: InterviewerStep, totalQuestions: number, setup: InterviewSetup): string {
  switch (step.kind) {
    case "open":
      return `greet the candidate in one or two sentences, tell them the interview has ${totalQuestions} questions, then ask question 1, on ${ask(step.question, setup)}`;
    case "ask":
      return `briefly and neutrally acknowledge the candidate's last answer without judging it, then ask question ${step.questionNumber}, on ${ask(step.question, setup)}`;
    case "follow-up":
      return `don't move on yet. Ask one short follow-up question on question ${step.questionNumber} (${ask(step.question, setup)}) that invites the candidate to clarify or go deeper where their answers so far were vague or left something out, for example by asking for a concrete example or about a specific case. ${keyPointsHint(step.question, setup)}`;
    case "close":
      return "briefly and neutrally acknowledge the candidate's last answer without judging it, thank them, and tell them the interview is over. Do not ask any more questions and do not give feedback or answers.";
  }
}

function keyPointsHint(question: PlannedQuestion, { level }: InterviewSetup): string {
  if (question.kind === "uncurated") {
    return `Think of what a strong ${level} developer would cover in their answer, and ask about what the candidate left out; never state or hint at it.`;
  }
  return `A good answer covers these key points; use them only to choose what to ask about, and never state, list or hint at them:
${question.theme.keyPoints.map((point) => `- ${point}`).join("\n")}`;
}

function ask(question: PlannedQuestion, { level }: InterviewSetup): string {
  if (question.kind === "uncurated") {
    return `${question.technology}: a question you write yourself, the kind a recruiter asks a ${level} developer, on a topic this interview hasn't covered yet. It must be about ${question.technology}, not about any other technology`;
  }
  return `the theme "${question.theme.name}": "${question.text}"`;
}
