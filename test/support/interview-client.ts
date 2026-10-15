import type { Debrief, InterviewSummary, TurnEvent } from "../../src/server/api-types.js";

export interface TurnResult {
  status: number;
  events: TurnEvent[];
  /** The interviewer's message, put back together from the streamed deltas. */
  text: string;
  /** Where the interview stands at the end of the turn, from the `done` event. */
  interview?: InterviewSummary;
  error?: string;
}

export interface JsonResult<T> {
  status: number;
  body?: T;
  error?: string;
}

/** Talks to Mockroom's interview API the way the UI does. */
export class InterviewClient {
  constructor(readonly baseUrl: string) {}

  start(packId = "react-junior-en"): Promise<TurnResult> {
    return this.#turn("/api/interviews", { packId });
  }

  answer(interviewId: string, answer: string): Promise<TurnResult> {
    return this.#turn(`/api/interviews/${interviewId}/answers`, { answer });
  }

  async get(interviewId: string): Promise<Response> {
    return fetch(`${this.baseUrl}/api/interviews/${interviewId}`);
  }

  end(interviewId: string): Promise<JsonResult<InterviewSummary>> {
    return this.#post(`/api/interviews/${interviewId}/end`);
  }

  debrief(interviewId: string): Promise<JsonResult<Debrief>> {
    return this.#post(`/api/interviews/${interviewId}/debrief`);
  }

  async #post<T>(path: string): Promise<JsonResult<T>> {
    const response = await fetch(`${this.baseUrl}${path}`, { method: "POST" });
    const body = (await response.json()) as T | { error: string };
    if (!response.ok) return { status: response.status, error: (body as { error: string }).error };
    return { status: response.status, body: body as T };
  }

  async #turn(path: string, body: unknown): Promise<TurnResult> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!response.headers.get("content-type")?.includes("application/x-ndjson")) {
      const { error } = (await response.json()) as { error: string };
      return { status: response.status, events: [], text: "", error };
    }
    const events = (await response.text())
      .split("\n")
      .filter((line) => line !== "")
      .map((line) => JSON.parse(line) as TurnEvent);
    let text = "";
    let interview: InterviewSummary | undefined;
    let error: string | undefined;
    for (const event of events) {
      if (event.type === "delta") text += event.text;
      if (event.type === "done") interview = event.interview;
      if (event.type === "error") error = event.message;
    }
    return { status: response.status, events, text, interview, error };
  }
}
