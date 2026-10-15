import type { ApiError, PackSummary, TurnEvent } from "../server/api-types";

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
