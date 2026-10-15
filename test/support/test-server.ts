import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
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
export async function startTestServer({
  model = new ScriptedModel([]),
  packs = loadPacks().packs,
  uiDir,
  followUpsPerQuestion,
  dataDir,
  now,
}: TestServerOptions = {}): Promise<TestServer> {
  const temporaryDir = dataDir === undefined ? await makeTemporaryDataDir() : undefined;
  const folder = dataDir ?? temporaryDir!;
  const server = await startServer({ model, packs, uiDir, followUpsPerQuestion, dataDir: folder, now });
  return {
    ...server,
    dataDir: folder,
    close: async () => {
      await server.close();
      if (temporaryDir) await rm(temporaryDir, { recursive: true, force: true });
    },
  };
}

/** A new, empty temporary data folder. The caller deletes it. */
export function makeTemporaryDataDir(): Promise<string> {
  return mkdtemp(join(tmpdir(), "mockroom-data-"));
}
