import type { AIModel } from "../../src/server/ai/model.js";
import { loadPacks } from "../../src/server/packs/library.js";
import type { Pack } from "../../src/server/packs/pack.js";
import { startServer, type RunningServer } from "../../src/server/server.js";
import { ScriptedModel } from "./scripted-model.js";

export interface TestServerOptions {
  model?: AIModel;
  /** Defaults to the packs bundled with Mockroom. */
  packs?: readonly Pack[];
  uiDir?: string;
  followUpsPerQuestion?: number;
}

/** Starts a real Mockroom server on a free port, with a fake AI model by default. */
export function startTestServer({
  model = new ScriptedModel([]),
  packs = loadPacks().packs,
  uiDir,
  followUpsPerQuestion,
}: TestServerOptions = {}): Promise<RunningServer> {
  return startServer({ model, packs, uiDir, followUpsPerQuestion });
}
