import type {
  ApiError,
  Debrief,
  HistoryEntry,
  InterviewSummary,
  PackSummary,
  SavedInterview,
  TurnEvent,
} from "../server/api-types";

export async function listPacks(): Promise<PackSummary[]> {
  const response = await fetch("/api/packs");
  if (!response.ok) throw new Error("The local server can't be reached.");
  return response.json() as Promise<PackSummary[]>;
}

export function startInterview(packId: string, onEvent: (event: TurnEvent) => void) {
  return playTurn("/api/interviews", { packId }, onEvent);
}

export function sendAnswer(interviewId: string, answer: string, onEvent: (event: TurnEvent) => void) {
  return playTurn(`/api/interviews/${interviewId}/answers`, { answer }, onEvent);
}

/** Ends the interview before the last question. */
export function endInterview(interviewId: string): Promise<InterviewSummary> {
  return postJson(`/api/interviews/${interviewId}/end`);
}

/** The debrief of a finished interview. The first request waits for the AI model to write it. */
export function fetchDebrief(interviewId: string): Promise<Debrief> {
  return postJson(`/api/interviews/${interviewId}/debrief`);
}

/** The past interviews saved on this machine, most recent first. */
export function listHistory(): Promise<HistoryEntry[]> {
  return requestJson("GET", "/api/history");
}

/** A past interview, with its transcript and debrief. */
export function fetchSavedInterview(interviewId: string): Promise<SavedInterview> {
  return requestJson("GET", `/api/history/${interviewId}`);
}

/** Deletes a past interview's file. */
export async function deleteSavedInterview(interviewId: string): Promise<void> {
  await requestJson("DELETE", `/api/history/${interviewId}`);
}

function postJson<T>(path: string): Promise<T> {
  return requestJson("POST", path);
}

async function requestJson<T>(method: string, path: string): Promise<T> {
  const response = await fetch(path, { method }).catch(() => undefined);
  if (response?.status === 204) return undefined as T;
  const body = (await response?.json().catch(() => undefined)) as T | Partial<ApiError> | undefined;
  if (!response?.ok) {
    throw new Error((body as Partial<ApiError> | undefined)?.error ?? "The local server can't be reached.");
  }
  return body as T;
}

/** Sends a request that triggers an interviewer turn, and reports its events as they stream in. */
async function playTurn(path: string, body: unknown, onEvent: (event: TurnEvent) => void) {
  const response = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok || !response.body) {
    const { error } = (await response.json().catch(() => ({}))) as Partial<ApiError>;
    throw new Error(error ?? "The local server can't be reached.");
  }

  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = "";
  let finished = false;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += value;
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (line === "") continue;
      const event = JSON.parse(line) as TurnEvent;
      if (event.type === "error") throw new Error(event.message);
      if (event.type === "done") finished = true;
      onEvent(event);
    }
  }
  if (!finished) throw new Error("The connection to the local server was interrupted.");
}
