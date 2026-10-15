import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";
import { collectText, type AIModel } from "./ai/model.js";

export interface AppOptions {
  model: AIModel;
  /** Folder holding the built UI. Omitted in dev mode, where Vite serves the UI. */
  uiDir?: string;
}

export function createApp({ model, uiDir }: AppOptions): Hono {
  const app = new Hono();

  app.get("/api/health", (c) => c.json({ name: "Mockroom", status: "ok" }));

  // Thinnest possible round trip through the AI model port.
  app.post("/api/ai/ping", async (c) => {
    try {
      const reply = await collectText(
        model.streamText([{ role: "user", content: "Reply with the single word OK." }]),
      );
      return c.json({ ok: true, reply });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return c.json({ ok: false, error: message }, 502);
    }
  });

  if (uiDir) app.use("/*", serveStatic({ root: uiDir }));

  return app;
}
