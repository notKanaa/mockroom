// Dev mode: runs the API only. Vite serves the UI with hot reload and proxies /api here.
import { startServer } from "./server.js";
import { loadDataDir, loadEnvOrExit, loadFollowUpsOrExit, loadPacksWithWarnings } from "./startup.js";

const port = Number(process.env.MOCKROOM_API_PORT ?? 4317);
const dataDir = loadDataDir();
const server = await startServer({
  env: loadEnvOrExit(dataDir),
  packs: loadPacksWithWarnings(),
  followUpsPerQuestion: loadFollowUpsOrExit(),
  dataDir,
  port,
});
console.log(`Mockroom API (dev) listening at ${server.url}`);
