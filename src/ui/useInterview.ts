import { useState } from "react";
import type { InterviewSummary, TranscriptEntry, TurnEvent } from "../server/api-types";
import { sendAnswer, startInterview } from "./api";

interface InterviewState {
  interview: InterviewSummary | null;
  messages: TranscriptEntry[];
}

const empty: InterviewState = { interview: null, messages: [] };

/** The interview in progress, kept in sync with the server as turns stream in. */
export function useInterview() {
  const [state, setState] = useState<InterviewState>(empty);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Plays one interviewer turn, shown after `messages`.
   * On failure, goes back to `before`, as the server does.
   */
  async function playTurn(
    before: InterviewState,
    messages: TranscriptEntry[],
    request: (onEvent: (event: TurnEvent) => void) => Promise<void>,
  ): Promise<boolean> {
    setError(null);
    setStreaming(true);
    try {
      await request((event) => {
        if (event.type === "interview") {
          setState({
            interview: event.interview,
            messages: [...messages, { role: "interviewer", content: "" }],
          });
        } else if (event.type === "delta") {
          setState((current) => ({ ...current, messages: appendToLast(current.messages, event.text) }));
        } else if (event.type === "done") {
          setState((current) => ({ ...current, interview: event.interview }));
        }
      });
      return true;
    } catch (failure) {
      setState(before);
      setError(failure instanceof Error ? failure.message : String(failure));
      return false;
    } finally {
      setStreaming(false);
    }
  }

  return {
    ...state,
    streaming,
    error,
    start: (packId: string) => playTurn(empty, [], (onEvent) => startInterview(packId, onEvent)),
    answer: (text: string) => {
      const { interview } = state;
      if (!interview) return Promise.resolve(false);
      const messages: TranscriptEntry[] = [...state.messages, { role: "candidate", content: text }];
      setState({ interview, messages });
      return playTurn(state, messages, (onEvent) => sendAnswer(interview.id, text, onEvent));
    },
    reset: () => {
      setState(empty);
      setError(null);
    },
  };
}

function appendToLast(messages: TranscriptEntry[], text: string): TranscriptEntry[] {
  const last = messages.at(-1);
  if (!last) return messages;
  return [...messages.slice(0, -1), { ...last, content: last.content + text }];
}
