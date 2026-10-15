// Dev mode: runs the API only. Vite serves the UI with hot reload and proxies /api here.
import { startServer } from "./server.js";
import { loadModelOrExit, loadPacksWithWarnings } from "./startup.js";

const port = Number(process.env.MOCKROOM_API_PORT ?? 4317);
const server = await startServer({ model: loadModelOrExit(), packs: loadPacksWithWarnings(), port });
console.log(`Mockroom API (dev) listening at ${server.url}`);
