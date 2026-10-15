import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { RunningServer } from "../src/server/server.js";
import { ScriptedModel } from "./support/scripted-model.js";
import { startTestServer } from "./support/test-server.js";

describe("HTTP API", () => {
  let server: RunningServer | undefined;

  afterEach(async () => {
    await server?.close();
    server = undefined;
  });

  it("reports that the server is up", async () => {
    server = await startTestServer();

    const response = await fetch(`${server.url}/api/health`);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ name: "Mockroom", status: "ok" });
  });

  it("gets a reply from the AI model", async () => {
    const model = new ScriptedModel(["OK"]);
    server = await startTestServer({ model });

    const response = await fetch(`${server.url}/api/ai/ping`, { method: "POST" });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, reply: "OK" });
    expect(model.calls).toHaveLength(1);
  });

  it("explains when the AI model fails", async () => {
    server = await startTestServer({ model: new ScriptedModel([]) });

    const response = await fetch(`${server.url}/api/ai/ping`, { method: "POST" });

    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({
      ok: false,
      error: "ScriptedModel has no reply left for call #1.",
    });
  });

  it("serves the UI from the same server", async () => {
    const uiDir = await mkdtemp(join(tmpdir(), "mockroom-ui-"));
    await writeFile(join(uiDir, "index.html"), "<title>Mockroom</title>");
    try {
      server = await startTestServer({ uiDir });

      const response = await fetch(`${server.url}/`);

      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toMatch(/text\/html/);
      expect(await response.text()).toContain("Mockroom");
    } finally {
      await rm(uiDir, { recursive: true, force: true });
    }
  });
});
