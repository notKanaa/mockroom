import type { ChatMessage } from "../ai/model.js";
import type { Pack, PackTheme } from "../packs/pack.js";
import type { TranscriptEntry } from "./types.js";

/** A main question of the interview, taken from one of the pack's themes. */
export interface PlannedQuestion {
  theme: PackTheme;
  text: string;
}

/** What the interviewer must say in its next message. */
export type InterviewerStep =
  | { kind: "open"; question: PlannedQuestion }
  | { kind: "ask"; questionNumber: number; question: PlannedQuestion }
  | { kind: "follow-up"; questionNumber: number; question: PlannedQuestion; followUpNumber: number }
  | { kind: "close" };

const languageNames: Record<Pack["language"], string> = { en: "English", fr: "French" };

/** Opens every conversation, since some providers require it to start with the user. */
export const candidateJoinedMessage = "Hello, I'm ready for the interview.";

/** Builds the conversation sent to the AI model for the interviewer's next message. */
export function interviewerPrompt(
  pack: Pack,
  totalQuestions: number,
  transcript: TranscriptEntry[],
  step: InterviewerStep,
): ChatMessage[] {
  return [
    { role: "system", content: systemPrompt(pack, totalQuestions, step) },
    { role: "user", content: candidateJoinedMessage },
    ...transcript.map(
      ({ role, content }): ChatMessage => ({
        role: role === "interviewer" ? "assistant" : "user",
        content,
      }),
    ),
  ];
}

function systemPrompt(pack: Pack, totalQuestions: number, step: InterviewerStep): string {
  return `You are a friendly, professional technical interviewer running a mock job interview for a ${pack.level} ${pack.technology} developer position. Conduct the interview in ${languageNames[pack.language]}.

Rules:
- Ask exactly one question per message: the one you are told to ask next. You may rephrase it slightly so it sounds natural, but keep its meaning.
- When you are told to follow up, dig into the candidate's last answer the way a real recruiter would, but never say or imply that it was incomplete or wrong.
- Never reveal, explain or hint at the answer to any question, even if the candidate asks for it or says they don't know.
- Never correct, grade or comment on the quality of the candidate's answers. They get detailed feedback in a separate debrief after the interview.
- If the candidate asks for the answer or wants to skip, kindly say you'll move on, then follow your instruction for the next message.
- Keep messages short and conversational, with no headings or bullet lists.

The interview has ${totalQuestions} questions, taken from the "${pack.title}" interview pack, whose themes are: ${pack.themes.map((theme) => theme.name).join(", ")}.

Your next message: ${stepInstruction(step, totalQuestions)}`;
}

function stepInstruction(step: InterviewerStep, totalQuestions: number): string {
  switch (step.kind) {
    case "open":
      return `greet the candidate in one or two sentences, tell them the interview has ${totalQuestions} questions, then ask question 1, on ${ask(step.question)}`;
    case "ask":
      return `briefly and neutrally acknowledge the candidate's last answer without judging it, then ask question ${step.questionNumber}, on ${ask(step.question)}`;
    case "follow-up":
      return `don't move on yet. Ask one short follow-up question on question ${step.questionNumber} (${ask(step.question)}) that invites the candidate to clarify or go deeper where their answers so far were vague or left something out, for example by asking for a concrete example or about a specific case. A good answer covers these key points; use them only to choose what to ask about, and never state, list or hint at them:
${step.question.theme.keyPoints.map((point) => `- ${point}`).join("\n")}`;
    case "close":
      return "briefly and neutrally acknowledge the candidate's last answer without judging it, thank them, and tell them the interview is over. Do not ask any more questions and do not give feedback or answers.";
  }
}

function ask({ theme, text }: PlannedQuestion): string {
  return `the theme "${theme.name}": "${text}"`;
}
