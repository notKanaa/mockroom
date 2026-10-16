import { useState } from "react";
import type { Debrief, InterviewSummary, TranscriptEntry, TurnEvent } from "../server/api-types";
import { endInterview, fetchDebrief, sendAnswer, startInterview } from "./api";

interface InterviewState {
  interview: InterviewSummary | null;
  messages: TranscriptEntry[];
}

/** The debrief of the finished interview, while it is being written and once it is ready. */
export interface DebriefState {
  debrief: Debrief | null;
  writing: boolean;
  error: string | null;
}

const empty: InterviewState = { interview: null, messages: [] };
const noDebrief: DebriefState = { debrief: null, writing: false, error: null };

/** The interview in progress, kept in sync with the server as turns stream in. */
export function useInterview() {
  const [state, setState] = useState<InterviewState>(empty);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ending, setEnding] = useState(false);
  const [endError, setEndError] = useState<string | null>(null);
  const [debrief, setDebrief] = useState<DebriefState>(noDebrief);
  // The answer being typed, kept here so it survives a trip to the settings.
  const [draft, setDraft] = useState("");

  /**
   * Plays one interviewer turn, shown after `messages`, and returns where the interview stands.
   * On failure, goes back to `before`, as the server does, and returns null.
   */
  async function playTurn(
    before: InterviewState,
    messages: TranscriptEntry[],
    request: (onEvent: (event: TurnEvent) => void) => Promise<void>,
  ): Promise<InterviewSummary | null> {
    setError(null);
    setStreaming(true);
    let interview: InterviewSummary | null = null;
    try {
      await request((event) => {
        if (event.type === "interview") {
          const { questionNumber, followUpNumber } = event.interview;
          setState({
            interview: event.interview,
            messages: [
              ...messages,
              { role: "interviewer", content: "", ...(followUpNumber > 0 && { questionNumber, followUpNumber }) },
            ],
          });
        } else if (event.type === "delta") {
          setState((current) => ({ ...current, messages: appendToLast(current.messages, event.text) }));
        } else if (event.type === "done") {
          interview = event.interview;
          setState((current) => ({ ...current, interview: event.interview }));
        }
      });
      return interview;
    } catch (failure) {
      setState(before);
      setError(messageOf(failure));
      return null;
    } finally {
      setStreaming(false);
    }
  }

  async function writeDebrief(interviewId: string) {
    setDebrief({ debrief: null, writing: true, error: null });
    try {
      setDebrief({ debrief: await fetchDebrief(interviewId), writing: false, error: null });
    } catch (failure) {
      setDebrief({ debrief: null, writing: false, error: messageOf(failure) });
    }
  }

  return {
    ...state,
    streaming,
    error,
    ending,
    endError,
    debrief,
    draft,
    setDraft,
    start: (packId: string) => playTurn(empty, [], (onEvent) => startInterview(packId, onEvent)),
    answer: async (text: string) => {
      const { interview } = state;
      if (!interview) return false;
      const messages: TranscriptEntry[] = [...state.messages, { role: "candidate", content: text }];
      setState({ interview, messages });
      const after = await playTurn(state, messages, (onEvent) => sendAnswer(interview.id, text, onEvent));
      if (after?.status === "finished") void writeDebrief(after.id);
      return after !== null;
    },
    /** Stops the interview before the last question and asks for the debrief. */
    end: async () => {
      const { interview } = state;
      if (!interview) return;
      setEndError(null);
      setEnding(true);
      try {
        const ended = await endInterview(interview.id);
        setState((current) => ({ ...current, interview: ended }));
        void writeDebrief(ended.id);
      } catch (failure) {
        setEndError(messageOf(failure));
      } finally {
        setEnding(false);
      }
    },
    retryDebrief: () => {
      if (state.interview) void writeDebrief(state.interview.id);
    },
    reset: () => {
      setState(empty);
      setError(null);
      setEndError(null);
      setDebrief(noDebrief);
      setDraft("");
    },
  };
}

function appendToLast(messages: TranscriptEntry[], text: string): TranscriptEntry[] {
  const last = messages.at(-1);
  if (!last) return messages;
  return [...messages.slice(0, -1), { ...last, content: last.content + text }];
}

function messageOf(failure: unknown): string {
  return failure instanceof Error ? failure.message : String(failure);
}
