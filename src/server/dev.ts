// Dev mode: runs the API only. Vite serves the UI with hot reload and proxies /api here.
import { unconfiguredModel } from "./ai/unconfigured-model.js";
import { startServer } from "./server.js";

const port = Number(process.env.MOCKROOM_API_PORT ?? 4317);
const server = await startServer({ model: unconfiguredModel, port });
console.log(`Mockroom API (dev) listening at ${server.url}`);
