import type {
  AISettingsInput,
  AISettingsView,
  ApiError,
  ConnectionTest,
  Debrief,
  HistoryEntry,
  InterviewSummary,
  Language,
  OllamaModels,
  PackSummary,
  SavedInterview,
  TurnEvent,
} from "../server/api-types";
import { currentLanguage, currentMessages } from "./i18n";

export async function listPacks(): Promise<PackSummary[]> {
  const response = await fetch("/api/packs", { headers: languageHeader() }).catch(() => undefined);
  if (!response?.ok) throw new Error(currentMessages().common.serverUnreachable);
  return response.json() as Promise<PackSummary[]>;
}

/** Starts an interview on a pack, held in `language`. */
export function startInterview(packId: string, language: Language, onEvent: (event: TurnEvent) => void) {
  return playTurn("/api/interviews", { packId, language }, onEvent);
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

/** The AI provider settings. API keys come back masked. */
export function fetchSettings(): Promise<AISettingsView> {
  return requestJson("GET", "/api/settings");
}

/** Saves the AI provider settings. They apply to the next AI call. */
export function saveSettings(input: AISettingsInput): Promise<AISettingsView> {
  return requestJson("PUT", "/api/settings", input);
}

/** Checks that a provider answers, with these settings or, without any, the ones in use. */
export function testConnection(input?: AISettingsInput): Promise<ConnectionTest> {
  return requestJson("POST", "/api/settings/test", input);
}

/** The models installed in the Ollama running at `url`. */
export async function listOllamaModels(url: string): Promise<string[]> {
  const { models } = await requestJson<OllamaModels>("GET", `/api/settings/ollama-models?url=${encodeURIComponent(url)}`);
  return models;
}

function postJson<T>(path: string): Promise<T> {
  return requestJson("POST", path);
}

async function requestJson<T>(method: string, path: string, body?: unknown): Promise<T> {
  const init: RequestInit =
    body === undefined
      ? { method, headers: languageHeader() }
      : {
          method,
          headers: { ...languageHeader(), "Content-Type": "application/json" },
          body: JSON.stringify(body),
        };
  const response = await fetch(path, init).catch(() => undefined);
  if (response?.status === 204) return undefined as T;
  const result = (await response?.json().catch(() => undefined)) as T | Partial<ApiError> | undefined;
  if (!response?.ok) {
    throw new Error((result as Partial<ApiError> | undefined)?.error ?? currentMessages().common.serverUnreachable);
  }
  return result as T;
}

/** Sends a request that triggers an interviewer turn, and reports its events as they stream in. */
async function playTurn(path: string, body: unknown, onEvent: (event: TurnEvent) => void) {
  const response = await fetch(path, {
    method: "POST",
    headers: { ...languageHeader(), "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).catch(() => undefined);
  if (!response?.ok || !response.body) {
    const failure = (await response?.json().catch(() => undefined)) as Partial<ApiError> | undefined;
    throw new Error(failure?.error ?? currentMessages().common.serverUnreachable);
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
  if (!finished) throw new Error(currentMessages().common.connectionInterrupted);
}

/** Asks the server to word its messages in the interface language. */
function languageHeader(): Record<string, string> {
  return { "Accept-Language": currentLanguage() };
}
