#!/usr/bin/env node
import { existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import open from "open";
import { startServer } from "./server.js";
import { loadDataDir, loadFollowUpsOrExit, loadModelOrExit, loadPacksWithWarnings } from "./startup.js";

const { values: flags } = parseArgs({
  options: { open: { type: "boolean", default: true } },
  allowNegative: true,
});

// The built UI sits next to the built server: dist/ui and dist/server.
const uiDir = fileURLToPath(new URL("../ui", import.meta.url));
if (!existsSync(join(uiDir, "index.html"))) {
  console.error(`Mockroom's UI is missing from ${uiDir}. Run "npm run build" first.`);
  process.exit(1);
}

const server = await startServer({
  model: loadModelOrExit(),
  packs: loadPacksWithWarnings(),
  followUpsPerQuestion: loadFollowUpsOrExit(),
  dataDir: loadDataDir(),
  uiDir,
});
console.log(`Mockroom is running at ${server.url}`);
console.log("Press Ctrl+C to stop.");

if (flags.open) {
  open(server.url).catch(() => console.log("Open that address in your browser."));
}

process.once("SIGINT", () => {
  server.close().finally(() => process.exit(0));
});
