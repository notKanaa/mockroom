import { serveStatic } from "@hono/node-server/serve-static";
import { Hono, type Context } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { stream } from "hono/streaming";
import { collectText, type AIModel } from "./ai/model.js";
import type { ApiError, PackSummary, TurnEvent } from "./api-types.js";
import { InterviewEngine, InterviewError, type InterviewErrorCode, type InterviewTurn } from "./interview/engine.js";
import { filterPacks } from "./packs/library.js";
import type { Pack } from "./packs/pack.js";

export interface AppOptions {
  model: AIModel;
  /** Packs the candidate can pick from (see `loadPacks`). */
  packs: readonly Pack[];
  /** Folder holding the built UI. Omitted in dev mode, where Vite serves the UI. */
  uiDir?: string;
}

const statusByErrorCode: Record<InterviewErrorCode, ContentfulStatusCode> = {
  "not-found": 404,
  finished: 409,
  busy: 409,
  "empty-answer": 400,
  "not-finished": 409,
  "debrief-failed": 502,
};

export function createApp({ model, packs, uiDir }: AppOptions): Hono {
  const app = new Hono();
  const engine = new InterviewEngine(model);

  app.get("/api/health", (c) => c.json({ name: "Mockroom", status: "ok" }));

  // Thinnest possible round trip through the AI model port.
  app.post("/api/ai/ping", async (c) => {
    try {
      const reply = await collectText(
        model.streamText([{ role: "user", content: "Reply with the single word OK." }]),
      );
      return c.json({ ok: true, reply });
    } catch (error) {
      return c.json({ ok: false, error: errorMessage(error) }, 502);
    }
  });

  app.get("/api/packs", (c) => {
    const { technology, level, language } = c.req.query();
    return c.json(
      filterPacks(packs, { technology, level, language }).map(
        ({ id, technology, level, language, title, themes }): PackSummary => ({
          id,
          technology,
          level,
          language,
          title,
          themes: themes.map((theme) => theme.name),
        }),
      ),
    );
  });

  app.post("/api/interviews", async (c) => {
    const { packId } = await readJsonBody(c);
    const pack = packs.find((candidate) => candidate.id === packId);
    if (!pack) return c.json<ApiError>({ error: "This pack doesn't exist." }, 404);
    return streamTurn(c, engine.start(pack));
  });

  app.get("/api/interviews/:id", (c) => c.json(engine.get(c.req.param("id"))));

  app.post("/api/interviews/:id/answers", async (c) => {
    const { answer } = await readJsonBody(c);
    if (typeof answer !== "string") {
      return c.json<ApiError>({ error: 'Send the answer as {"answer": "..."}.' }, 400);
    }
    return streamTurn(c, engine.answer(c.req.param("id"), answer));
  });

  app.post("/api/interviews/:id/end", (c) => c.json(engine.end(c.req.param("id"))));

  // Written by the AI model on the first request, then kept. Can take a while.
  app.post("/api/interviews/:id/debrief", async (c) => c.json(await engine.debrief(c.req.param("id"))));

  app.onError((error, c) => {
    if (error instanceof InterviewError) {
      return c.json<ApiError>({ error: error.message }, statusByErrorCode[error.code]);
    }
    console.error(error);
    return c.json<ApiError>({ error: "Something went wrong on Mockroom's side." }, 500);
  });

  if (uiDir) app.use("/*", serveStatic({ root: uiDir }));

  return app;
}

/** Streams an interviewer turn as newline-delimited JSON events. */
function streamTurn(c: Context, turn: InterviewTurn): Response {
  c.header("Content-Type", "application/x-ndjson; charset=utf-8");
  c.header("Cache-Control", "no-cache");
  return stream(c, async (out) => {
    const send = (event: TurnEvent) => out.write(`${JSON.stringify(event)}\n`);
    await send({ type: "interview", interview: turn.interview });
    try {
      for await (const text of turn.reply) {
        // Leaving the loop abandons the turn, so a candidate who closed the page can answer again.
        if (out.aborted) return;
        await send({ type: "delta", text });
      }
      await send({ type: "done", interview: turn.interview });
    } catch (error) {
      await send({ type: "error", message: errorMessage(error) });
    }
  });
}

async function readJsonBody(c: Context): Promise<Record<string, unknown>> {
  const body: unknown = await c.req.json().catch(() => undefined);
  return typeof body === "object" && body !== null ? (body as Record<string, unknown>) : {};
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
