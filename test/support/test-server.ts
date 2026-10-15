import type { AIModel } from "../../src/server/ai/model.js";
import { startServer, type RunningServer } from "../../src/server/server.js";
import { ScriptedModel } from "./scripted-model.js";

export interface TestServerOptions {
  model?: AIModel;
  uiDir?: string;
}

/** Starts a real Mockroom server on a free port, with a fake AI model by default. */
export function startTestServer({
  model = new ScriptedModel([]),
  uiDir,
}: TestServerOptions = {}): Promise<RunningServer> {
  return startServer({ model, uiDir });
}
