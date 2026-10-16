import { collectText, type AIModel, type ChatMessage } from "../ai/model.js";
import type { PlannedQuestion } from "./prompt.js";
import { positionDescription, type InterviewSetup } from "./setup.js";
import type { TranscriptEntry } from "./types.js";

/** What the decision to follow up is made from. */
export interface FollowUpRequest {
  setup: InterviewSetup;
  question: PlannedQuestion;
  /** The messages on the current question so far: the question, the candidate's answer, and any follow-ups. */
  exchange: TranscriptEntry[];
}

/**
 * Asks the AI model whether the candidate's answer deserves a follow-up question
 * before moving on. A short call of its own, so the interviewer's reply always
 * matches what Mockroom records. A reply it can't read counts as moving on.
 */
export async function shouldFollowUp(model: AIModel, request: FollowUpRequest): Promise<boolean> {
  const reply = await collectText(model.streamText(followUpPrompt(request)));
  const decision = /follow[\s_-]*up|next|move on/i.exec(reply)?.[0];
  return decision !== undefined && /^follow/i.test(decision);
}

function followUpPrompt({ setup, question, exchange }: FollowUpRequest): ChatMessage[] {
  const current =
    question.kind === "uncurated"
      ? `The current question is on ${question.technology}. No pack covers it, so the interviewer wrote the question itself (see the conversation): judge the answers against what a good ${setup.level} developer would say.`
      : `The current question, on the theme "${question.theme.name}": "${question.text}"
Key points of a good answer:
${question.theme.keyPoints.map((point) => `- ${point}`).join("\n")}`;
  const system = `You are helping run a mock job interview for a ${positionDescription(setup)} position. Decide whether the interviewer should ask a follow-up question on the current question before moving on, the way a real recruiter would.

${current}

Reply FOLLOW-UP when the candidate's answers so far are vague, too short, or miss an important key point that a follow-up question could bring out.
Reply NEXT when they cover the key points reasonably well, when the candidate says they don't know or wants to move on, or when the last follow-up brought nothing new.

Reply with only one word: FOLLOW-UP or NEXT.`;

  const conversation = exchange
    .map(({ role, content, followUpNumber }) => {
      const author = role === "candidate" ? "Candidate" : followUpNumber ? "Interviewer (follow-up)" : "Interviewer";
      return `${author}: ${content}`;
    })
    .join("\n\n");

  return [
    { role: "system", content: system },
    { role: "user", content: `Here is the conversation on this question.\n\n${conversation}` },
  ];
}
