import { serveStatic } from "@hono/node-server/serve-static";
import { Hono, type Context } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { stream } from "hono/streaming";
import { collectText, type AIModel } from "./ai/model.js";
import type { Env } from "./ai/provider.js";
import { ProviderError } from "./ai/provider-errors.js";
import type {
  ApiError,
  InterviewSummary,
  JobOfferDetection,
  OllamaModels,
  PackMatches,
  PackSummary,
  TurnEvent,
} from "./api-types.js";
import { InterviewHistory } from "./history/store.js";
import { isLanguage, languageFromHeader, localizedMessage, type Language, type Text } from "./i18n.js";
import { InterviewEngine, InterviewError, type InterviewErrorCode, type InterviewTurn } from "./interview/engine.js";
import type { InterviewSetup } from "./interview/setup.js";
import { cleanTechnologies, detectJobOffer, DetectionError } from "./job-offer/detect.js";
import { matchPacks, uncoveredTechnologies } from "./job-offer/match.js";
import { say } from "./messages.js";
import { filterPacks } from "./packs/library.js";
import { packLevels, type Pack, type PackLevel } from "./packs/pack.js";
import { AISettings, SettingsError, type Connect } from "./settings/ai-settings.js";

export interface AppOptions {
  /**
   * A fixed AI model for interviews, used instead of the one chosen in the
   * settings. Tests pass a fake here.
   */
  model?: AIModel;
  /**
   * Environment variables, which override the AI provider settings (see
   * `provider.ts`). None by default, so tests don't depend on the machine.
   */
  env?: Env;
  /** Builds the model for a provider. Defaults to the real providers; tests inject fakes. */
  connect?: Connect;
  /** Packs the candidate can pick from (see `loadPacks`). */
  packs: readonly Pack[];
  /** Folder holding the built UI. Omitted in dev mode, where Vite serves the UI. */
  uiDir?: string;
  /** The most follow-up questions the interviewer asks on one main question. Defaults to 2; 0 turns them off. */
  followUpsPerQuestion?: number;
  /**
   * The Mockroom data folder, where finished interviews and settings are saved (see
   * `mockroomDataDir`). Required, so tests always pick their own folder.
   */
  dataDir: string;
  /** The current time. Tests set it to get known dates. */
  now?: () => Date;
}

const statusByErrorCode: Record<InterviewErrorCode, ContentfulStatusCode> = {
  "not-found": 404,
  finished: 409,
  busy: 409,
  "empty-answer": 400,
  "not-finished": 409,
  "debrief-failed": 502,
};

export function createApp({
  model: fixedModel,
  env,
  connect,
  packs,
  uiDir,
  followUpsPerQuestion,
  dataDir,
  now,
}: AppOptions): Hono {
  const app = new Hono();
  const history = new InterviewHistory(dataDir);
  const settings = new AISettings({ dataDir, env, connect });
  const model = fixedModel ?? settings.model;
  const engine = new InterviewEngine(model, { followUpsPerQuestion, history, now });

  app.get("/api/health", (c) => c.json({ name: "Mockroom", status: "ok" }));

  // Thinnest possible round trip through the AI model port.
  app.post("/api/ai/ping", async (c) => {
    try {
      const reply = await collectText(
        model.streamText([{ role: "user", content: "Reply with the single word OK." }]),
      );
      return c.json({ ok: true, reply });
    } catch (error) {
      return c.json({ ok: false, error: localizedMessage(error, uiLanguage(c)) }, 502);
    }
  });

  // AI provider settings. API keys only ever come back masked.
  app.get("/api/settings", async (c) => c.json(await settings.view()));

  app.put("/api/settings", async (c) => c.json(await settings.save(await readJsonBody(c))));

  app.post("/api/settings/test", async (c) => c.json(await settings.test(await readJsonBody(c), uiLanguage(c))));

  app.get("/api/settings/ollama-models", async (c) => {
    try {
      return c.json<OllamaModels>({ models: await settings.ollamaModels(c.req.query("url")) });
    } catch (error) {
      if (error instanceof ProviderError) return c.json<ApiError>({ error: error.text(uiLanguage(c)) }, 502);
      throw error;
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

  // Finds the technologies and level a pasted job offer asks for, and the packs matching them.
  app.post("/api/job-offers/detect", async (c) => {
    const { jobOffer, language } = await readJsonBody(c);
    const ui = uiLanguage(c);
    if (typeof jobOffer !== "string" || jobOffer.trim() === "") {
      return c.json<ApiError>({ error: say("emptyJobOffer")(ui) }, 400);
    }
    if (language !== undefined && !isLanguage(language)) {
      return c.json<ApiError>({ error: say("invalidLanguage")(ui) }, 400);
    }
    try {
      const detection = await detectJobOffer(
        model,
        jobOffer,
        packs.map((pack) => pack.technology),
      );
      const matches = matchPacks(packs, detection.technologies, detection.level, language ?? ui);
      return c.json<JobOfferDetection>({ ...detection, matches });
    } catch (error) {
      if (error instanceof DetectionError) return c.json<ApiError>({ error: error.text(ui) }, 422);
      return c.json<ApiError>({ error: say("detectionFailed", localizedMessage(error, ui))(ui) }, 502);
    }
  });

  // The packs matching the technologies and level, once the candidate has edited them.
  app.post("/api/job-offers/match", async (c) => {
    const body = await readJsonBody(c);
    const ui = uiLanguage(c);
    const technologies = readTechnologies(body.technologies);
    if (!technologies) return c.json<ApiError>({ error: say("technologiesShape")(ui) }, 400);
    if (!isLevel(body.level)) return c.json<ApiError>({ error: say("invalidLevel")(ui) }, 400);
    if (body.language !== undefined && !isLanguage(body.language)) {
      return c.json<ApiError>({ error: say("invalidLanguage")(ui) }, 400);
    }
    return c.json<PackMatches>({ matches: matchPacks(packs, technologies, body.level, body.language ?? ui) });
  });

  app.post("/api/interviews", async (c) => {
    const setup = readInterviewSetup(await readJsonBody(c), packs);
    if ("error" in setup) return c.json<ApiError>({ error: setup.error(uiLanguage(c)) }, setup.status);
    return streamTurn(c, engine.start(setup));
  });

  app.get("/api/interviews/:id", (c) => c.json(engine.get(c.req.param("id"))));

  app.post("/api/interviews/:id/answers", async (c) => {
    const { answer } = await readJsonBody(c);
    if (typeof answer !== "string") {
      return c.json<ApiError>({ error: say("answerShape")(uiLanguage(c)) }, 400);
    }
    return streamTurn(c, engine.answer(c.req.param("id"), answer));
  });

  app.post("/api/interviews/:id/end", async (c) => c.json(await engine.end(c.req.param("id"))));

  // Written by the AI model on the first request, then kept. Can take a while.
  app.post("/api/interviews/:id/debrief", async (c) => c.json(await engine.debrief(c.req.param("id"))));

  // Past interviews, saved on this machine only.
  app.get("/api/history", async (c) => c.json(await history.list()));

  app.get("/api/history/:id", async (c) => {
    let interview;
    try {
      interview = await history.read(c.req.param("id"));
    } catch (error) {
      return c.json<ApiError>({ error: localizedMessage(error, uiLanguage(c)) }, 500);
    }
    if (!interview) return c.json<ApiError>({ error: say("notInHistory")(uiLanguage(c)) }, 404);
    return c.json(interview);
  });

  app.delete("/api/history/:id", async (c) => {
    if (!(await history.delete(c.req.param("id")))) {
      return c.json<ApiError>({ error: say("notInHistory")(uiLanguage(c)) }, 404);
    }
    return c.body(null, 204);
  });

  app.onError((error, c) => {
    if (error instanceof InterviewError) {
      return c.json<ApiError>({ error: error.text(uiLanguage(c)) }, statusByErrorCode[error.code]);
    }
    if (error instanceof SettingsError) return c.json<ApiError>({ error: error.text(uiLanguage(c)) }, 400);
    console.error(error);
    return c.json<ApiError>({ error: say("internalError")(uiLanguage(c)) }, 500);
  });

  if (uiDir) app.use("/*", serveStatic({ root: uiDir }));

  return app;
}

/**
 * The language of the candidate's interface, for the messages the API sends
 * back: the UI sends it as `Accept-Language`.
 */
function uiLanguage(c: Context): Language {
  return languageFromHeader(c.req.header("Accept-Language"));
}

/** Streams an interviewer turn as newline-delimited JSON events. */
function streamTurn(c: Context, turn: InterviewTurn): Response {
  const language = uiLanguage(c);
  c.header("Content-Type", "application/x-ndjson; charset=utf-8");
  c.header("Cache-Control", "no-cache");
  return stream(c, async (out) => {
    const send = (event: TurnEvent) => out.write(`${JSON.stringify(event)}\n`);
    let interview: InterviewSummary | undefined;
    try {
      for await (const update of turn) {
        // Leaving the loop abandons the turn, so a candidate who closed the page can answer again.
        if (out.aborted) return;
        if (update.type === "interview") interview = update.interview;
        await send(update);
      }
      if (interview) await send({ type: "done", interview });
    } catch (error) {
      await send({ type: "error", message: localizedMessage(error, language) });
    }
  });
}

/**
 * The setup of a new interview, from the body of `POST /api/interviews` (see
 * `InterviewRequest`), or what is wrong with it.
 */
function readInterviewSetup(
  body: Record<string, unknown>,
  library: readonly Pack[],
): InterviewSetup | { error: Text; status: ContentfulStatusCode } {
  const { packId, packIds = packId === undefined ? [] : [packId], level, language } = body;
  if (!Array.isArray(packIds) || !packIds.every((id) => typeof id === "string")) {
    return { error: say("packIdsShape"), status: 400 };
  }
  const packs: Pack[] = [];
  for (const id of new Set(packIds)) {
    const pack = library.find((candidate) => candidate.id === id);
    if (!pack) return { error: say("packNotFound"), status: 404 };
    packs.push(pack);
  }
  const technologies = body.technologies === undefined ? [] : readTechnologies(body.technologies);
  if (!technologies) return { error: say("technologiesShape"), status: 400 };
  if (level !== undefined && !isLevel(level)) return { error: say("invalidLevel"), status: 400 };
  if (language !== undefined && !isLanguage(language)) return { error: say("invalidLanguage"), status: 400 };
  if (packs.length === 0 && technologies.length === 0) return { error: say("emptySetup"), status: 400 };

  return {
    packs,
    technologies,
    uncurated: uncoveredTechnologies(technologies, packs),
    level: level ?? packs[0]?.level ?? "mid",
    language: language ?? packs[0]?.language ?? "en",
  };
}

/** A list of technology names, cleaned; undefined if it isn't a list of texts. */
function readTechnologies(value: unknown): string[] | undefined {
  if (!Array.isArray(value) || !value.every((name) => typeof name === "string")) return undefined;
  return cleanTechnologies(value);
}

function isLevel(value: unknown): value is PackLevel {
  return typeof value === "string" && (packLevels as readonly string[]).includes(value);
}

async function readJsonBody(c: Context): Promise<Record<string, unknown>> {
  const body: unknown = await c.req.json().catch(() => undefined);
  return typeof body === "object" && body !== null ? (body as Record<string, unknown>) : {};
}

