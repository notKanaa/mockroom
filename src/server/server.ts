import { serve } from "@hono/node-server";
import type { AddressInfo } from "node:net";
import { createApp, type AppOptions } from "./app.js";

export interface ServerOptions extends AppOptions {
  /** Port to listen on. 0 (the default) lets the system pick a free one. */
  port?: number;
}

export interface RunningServer {
  url: string;
  close(): Promise<void>;
}

/** Starts Mockroom's HTTP server, reachable from this machine only. */
export function startServer({ port = 0, ...appOptions }: ServerOptions): Promise<RunningServer> {
  const app = createApp(appOptions);
  const hostname = "127.0.0.1";

  return new Promise((resolve, reject) => {
    const server = serve({ fetch: app.fetch, port, hostname });
    server.once("error", reject);
    server.once("listening", () => {
      const { port: actualPort } = server.address() as AddressInfo;
      resolve({
        url: `http://${hostname}:${actualPort}`,
        close: () =>
          new Promise((done, fail) => server.close((error) => (error ? fail(error) : done()))),
      });
    });
  });
}
