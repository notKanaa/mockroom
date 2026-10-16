import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { AIModel } from "../../src/server/ai/model.js";
import type { Env } from "../../src/server/ai/provider.js";
import { loadPacks } from "../../src/server/packs/library.js";
import type { Pack } from "../../src/server/packs/pack.js";
import { startServer, type RunningServer } from "../../src/server/server.js";
import type { Connect } from "../../src/server/settings/ai-settings.js";
import { ScriptedModel } from "./scripted-model.js";

export interface TestServerOptions {
  /**
   * A fixed AI model for interviews. Defaults to a scripted model with no
   * replies, unless `connect` is given: interviews then use the provider
   * chosen in the settings, built by `connect`.
   */
  model?: AIModel;
  /** Builds the model for a provider chosen in the settings. Never the real providers in tests. */
  connect?: Connect;
  /** Environment variables, which override the settings. None by default. */
  env?: Env;
  /** Defaults to the packs bundled with Mockroom. */
  packs?: readonly Pack[];
  uiDir?: string;
  followUpsPerQuestion?: number;
  /**
   * The data folder. Defaults to a new temporary folder, deleted when the server
   * closes, so tests never touch the real one. A folder passed in is kept.
   */
  dataDir?: string;
  now?: () => Date;
}

export interface TestServer extends RunningServer {
  dataDir: string;
}

/** Starts a real Mockroom server on a free port, with a fake AI model and a temporary data folder by default. */
export async function startTestServer(options: TestServerOptions = {}): Promise<TestServer> {
  const {
    connect = noRealProvider,
    model = options.connect ? undefined : new ScriptedModel([]),
    env = {},
    packs = loadPacks().packs,
    uiDir,
    followUpsPerQuestion,
    dataDir,
    now,
  } = options;
  const temporaryDir = dataDir === undefined ? await makeTemporaryDataDir() : undefined;
  const folder = dataDir ?? temporaryDir!;
  const server = await startServer({
    model,
    connect,
    env,
    packs,
    uiDir,
    followUpsPerQuestion,
    dataDir: folder,
    now,
  });
  return {
    ...server,
    dataDir: folder,
    close: async () => {
      await server.close();
      if (temporaryDir) await rm(temporaryDir, { recursive: true, force: true });
    },
  };
}

const noRealProvider: Connect = () => {
  throw new Error("Tests never call a real AI provider: pass `connect` to startTestServer.");
};

/** A new, empty temporary data folder. The caller deletes it. */
export function makeTemporaryDataDir(): Promise<string> {
  return mkdtemp(join(tmpdir(), "mockroom-data-"));
}
