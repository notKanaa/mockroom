// Dev mode: runs the API only. Vite serves the UI with hot reload and proxies /api here.
import { startServer } from "./server.js";
import { loadDataDir, loadFollowUpsOrExit, loadModelOrExit, loadPacksWithWarnings } from "./startup.js";

const port = Number(process.env.MOCKROOM_API_PORT ?? 4317);
const server = await startServer({
  model: loadModelOrExit(),
  packs: loadPacksWithWarnings(),
  followUpsPerQuestion: loadFollowUpsOrExit(),
  dataDir: loadDataDir(),
  port,
});
console.log(`Mockroom API (dev) listening at ${server.url}`);
