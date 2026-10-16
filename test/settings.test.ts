import { APICallError, LoadAPIKeyError, RetryError } from "ai";
import { readFile, rm } from "node:fs/promises";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { AIModel } from "../src/server/ai/model.js";
import type { ProviderConnection } from "../src/server/ai/provider.js";
import type { AISettingsInput, AISettingsView, ConnectionTest } from "../src/server/api-types.js";
import type { Connect } from "../src/server/settings/ai-settings.js";
import { InterviewClient } from "./support/interview-client.js";
import { ScriptedModel } from "./support/scripted-model.js";
import { makeTemporaryDataDir, startTestServer, type TestServer } from "./support/test-server.js";

const openaiKey = "sk-test-0123456789abcdefWXYZ";

/** A fake provider that says which provider and model answered, and records every connection made. */
function echoProviders() {
  const connections: { connection: ProviderConnection; maxRetries?: number }[] = [];
  const connect: Connect = (connection, { maxRetries }) => {
    connections.push({ connection, maxRetries });
    return {
      async *streamText() {
        yield `${connection.provider}:${connection.model}`;
      },
    };
  };
  return { connect, connections };
}

/** A fake provider that always fails with `error`. */
function failingProvider(error: unknown): Connect {
  return () => ({
    async *streamText() {
      throw error;
    },
  });
}

function apiCallError(fields: { message: string; statusCode?: number; cause?: unknown }): APICallError {
  return new APICallError({ url: "https://provider.test/v1/chat", requestBodyValues: {}, ...fields });
}

const connectionRefused = new RetryError({
  message: "Failed after 3 attempts. Last error: Cannot connect to API: connect ECONNREFUSED 127.0.0.1:11434",
  reason: "maxRetriesExceeded",
  errors: [
    apiCallError({
      message: "Cannot connect to API: connect ECONNREFUSED 127.0.0.1:11434",
      cause: Object.assign(new Error("connect ECONNREFUSED 127.0.0.1:11434"), { code: "ECONNREFUSED" }),
    }),
  ],
});

describe("AI provider settings", () => {
  let server: TestServer | undefined;
  let fakeOllama: Server | undefined;

  afterEach(async () => {
    await server?.close();
    server = undefined;
    await new Promise((done) => (fakeOllama ? fakeOllama.close(done) : done(undefined)));
    fakeOllama = undefined;
  });

  async function getSettings(): Promise<AISettingsView> {
    const response = await fetch(`${server!.url}/api/settings`);
    expect(response.status).toBe(200);
    return (await response.json()) as AISettingsView;
  }

  async function saveSettings(input: Partial<AISettingsInput> | Record<string, unknown>) {
    const response = await fetch(`${server!.url}/api/settings`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const text = await response.text();
    return { status: response.status, text, body: JSON.parse(text) as AISettingsView & { error?: string } };
  }

  async function testConnection(input?: AISettingsInput): Promise<ConnectionTest> {
    const response = await fetch(`${server!.url}/api/settings/test`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: input ? JSON.stringify(input) : undefined,
    });
    expect(response.status).toBe(200);
    return (await response.json()) as ConnectionTest;
  }

  async function ping(): Promise<{ ok: boolean; reply?: string; error?: string }> {
    const response = await fetch(`${server!.url}/api/ai/ping`, { method: "POST" });
    return (await response.json()) as { ok: boolean; reply?: string; error?: string };
  }

  describe("on first launch", () => {
    it("reports that no provider is set up", async () => {
      server = await startTestServer({ connect: echoProviders().connect });

      const settings = await getSettings();

      expect(settings).toMatchObject({
        configured: false,
        active: null,
        saved: null,
        ollamaUrl: { url: "http://127.0.0.1:11434", source: "default" },
        apiKeys: { openai: null, anthropic: null, gemini: null },
        settingsFile: join(server.dataDir, "settings.json"),
      });
      expect(settings.providers.map((provider) => provider.id)).toEqual(["openai", "anthropic", "gemini", "ollama"]);
      expect(settings.providers.find((provider) => provider.id === "ollama")?.needsKey).toBe(false);
    });

    it("tells the candidate to open Settings when an interview starts", async () => {
      server = await startTestServer({ connect: echoProviders().connect });

      const turn = await new InterviewClient(server.url).start();

      expect(turn.error).toBe("No AI provider is set up yet. Open Settings in Mockroom to choose one, then try again.");
    });
  });

  describe("saving", () => {
    it("saves the settings in the data folder and only ever sends the key back masked", async () => {
      server = await startTestServer({ connect: echoProviders().connect });

      const saved = await saveSettings({ provider: "openai", model: "gpt-5.5", apiKey: ` ${openaiKey} ` });

      expect(saved.status).toBe(200);
      expect(saved.text).not.toContain(openaiKey);
      expect(saved.body).toMatchObject({
        configured: true,
        active: { provider: "openai", model: "gpt-5.5", source: "settings" },
        saved: { provider: "openai", model: "gpt-5.5" },
        apiKeys: { openai: { masked: "••••••••WXYZ", source: "settings" }, anthropic: null, gemini: null },
      });
      const read = await fetch(`${server.url}/api/settings`).then((response) => response.text());
      expect(read).not.toContain(openaiKey);
      const file = JSON.parse(await readFile(join(server.dataDir, "settings.json"), "utf8")) as unknown;
      expect(file).toEqual({ formatVersion: 1, provider: "openai", model: "gpt-5.5", apiKeys: { openai: openaiKey } });
    });

    it("keeps the settings when Mockroom restarts", async () => {
      const dataDir = await makeTemporaryDataDir();
      try {
        server = await startTestServer({ connect: echoProviders().connect, dataDir });
        await saveSettings({ provider: "ollama", model: "llama3.2", ollamaUrl: "http://localhost:11434/" });
        await server.close();

        server = await startTestServer({ connect: echoProviders().connect, dataDir });

        expect(await getSettings()).toMatchObject({
          configured: true,
          active: { provider: "ollama", model: "llama3.2", source: "settings" },
          ollamaUrl: { url: "http://localhost:11434", source: "settings" },
        });
      } finally {
        await server?.close();
        server = undefined;
        await rm(dataDir, { recursive: true, force: true });
      }
    });

    it("keeps the saved key when none is entered, and each provider's key when switching", async () => {
      server = await startTestServer({ connect: echoProviders().connect });
      await saveSettings({ provider: "openai", model: "gpt-5.5", apiKey: openaiKey });

      await saveSettings({ provider: "openai", model: "gpt-5.4-mini", apiKey: "" });
      const switched = await saveSettings({ provider: "ollama", model: "llama3.2" });

      expect(switched.body.apiKeys.openai).toEqual({ masked: "••••••••WXYZ", source: "settings" });
      expect(switched.body.active).toEqual({ provider: "ollama", model: "llama3.2", source: "settings" });
    });

    it.each([
      [{ provider: "openai", model: "gpt-5.5" }, "Enter your OpenAI API key."],
      [{ provider: "skynet", model: "t-800" }, "Choose an AI provider: OpenAI, Anthropic, Gemini, Ollama."],
      [{ provider: "ollama", model: " " }, 'Choose an Ollama model, such as "llama3.2".'],
      [
        { provider: "ollama", model: "llama3.2", ollamaUrl: "localhost:11434" },
        "The Ollama address must start with http:// or https://, like http://127.0.0.1:11434.",
      ],
      [{ provider: "gemini", model: "gemini-flash-latest", apiKey: "two words" }, "The API key can't contain spaces. Paste it again."],
    ])("refuses wrong settings: %j", async (input, error) => {
      server = await startTestServer({ connect: echoProviders().connect });

      const saved = await saveSettings(input);

      expect(saved.status).toBe(400);
      expect(saved.body.error).toBe(error);
      expect((await getSettings()).saved).toBeNull();
    });

    it("applies new settings without restarting Mockroom", async () => {
      const { connect } = echoProviders();
      server = await startTestServer({ connect });

      await saveSettings({ provider: "ollama", model: "llama3.2" });
      expect(await ping()).toEqual({ ok: true, reply: "ollama:llama3.2" });

      await saveSettings({ provider: "anthropic", model: "claude-haiku-5-5", apiKey: "sk-ant-test-0123456789" });
      expect(await ping()).toEqual({ ok: true, reply: "anthropic:claude-haiku-5-5" });

      const turn = await new InterviewClient(server.url).start();
      expect(turn.text).toBe("anthropic:claude-haiku-5-5");
    });
  });

  describe("environment variables", () => {
    it("override the settings file", async () => {
      const { connect, connections } = echoProviders();
      server = await startTestServer({
        connect,
        env: { MOCKROOM_PROVIDER: "ollama", MOCKROOM_MODEL: "llama3.2", MOCKROOM_OLLAMA_URL: "http://10.0.0.5:11434/" },
      });
      await saveSettings({ provider: "openai", model: "gpt-5.5", apiKey: openaiKey });

      const settings = await getSettings();

      expect(settings).toMatchObject({
        configured: true,
        active: { provider: "ollama", model: "llama3.2", source: "environment" },
        saved: { provider: "openai", model: "gpt-5.5" },
        ollamaUrl: { url: "http://10.0.0.5:11434", source: "environment" },
      });
      expect(await ping()).toEqual({ ok: true, reply: "ollama:llama3.2" });
      expect(connections.at(-1)?.connection.ollamaUrl).toBe("http://10.0.0.5:11434");
    });

    it("override a saved API key, which is still never sent in full", async () => {
      const { connect, connections } = echoProviders();
      const envKey = "sk-from-environment-9876";
      server = await startTestServer({ connect, env: { OPENAI_API_KEY: envKey } });
      await saveSettings({ provider: "openai", model: "gpt-5.5", apiKey: openaiKey });

      const read = await fetch(`${server.url}/api/settings`).then((response) => response.text());
      await ping();

      expect(read).not.toContain(envKey);
      expect((JSON.parse(read) as AISettingsView).apiKeys.openai).toEqual({
        masked: "••••••••9876",
        source: "environment",
      });
      expect(connections.at(-1)?.connection.apiKey).toBe(envKey);
    });

    it("are enough on their own, as before the settings screen", async () => {
      server = await startTestServer({
        connect: echoProviders().connect,
        env: { MOCKROOM_PROVIDER: "anthropic", ANTHROPIC_API_KEY: "sk-ant-test-0123456789" },
      });

      expect((await getSettings()).active).toEqual({
        provider: "anthropic",
        model: "claude-haiku-5-5",
        source: "environment",
      });
      expect(await ping()).toEqual({ ok: true, reply: "anthropic:claude-haiku-5-5" });
    });
  });

  describe("testing the connection", () => {
    it("tries unsaved settings, with the saved key when none is entered, without retrying", async () => {
      const { connect, connections } = echoProviders();
      server = await startTestServer({ connect });
      await saveSettings({ provider: "openai", model: "gpt-5.5", apiKey: openaiKey });

      const result = await testConnection({ provider: "openai", model: "gpt-5.4-mini" });

      expect(result).toEqual({ ok: true, message: "Connected: OpenAI (gpt-5.4-mini) answered." });
      expect(connections.at(-1)).toMatchObject({
        connection: { provider: "openai", model: "gpt-5.4-mini", apiKey: openaiKey },
        maxRetries: 0,
      });
      expect((await getSettings()).active?.model).toBe("gpt-5.5");
    });

    it("tests the provider in use when given no settings", async () => {
      server = await startTestServer({ connect: echoProviders().connect });
      expect(await testConnection()).toEqual({
        ok: false,
        error: "No AI provider is set up yet. Open Settings in Mockroom to choose one, then try again.",
      });

      await saveSettings({ provider: "ollama", model: "llama3.2" });

      expect(await testConnection()).toEqual({ ok: true, message: "Connected: Ollama (llama3.2) answered." });
    });

    it("asks for a key before calling a provider that needs one", async () => {
      const { connect, connections } = echoProviders();
      server = await startTestServer({ connect });

      expect(await testConnection({ provider: "gemini", model: "gemini-flash-latest" })).toEqual({
        ok: false,
        error:
          "Mockroom has no Gemini API key. Add yours in Settings (create one at https://aistudio.google.com/apikey).",
      });
      expect(connections).toHaveLength(0);
    });

    it.each<[string, AISettingsInput, unknown, string]>([
      [
        "Ollama isn't running",
        { provider: "ollama", model: "llama3.2" },
        connectionRefused,
        "Mockroom can't reach Ollama at http://127.0.0.1:11434. Is the Ollama app running? Start it, or check the Ollama address in Settings, then try again.",
      ],
      [
        "a cloud provider can't be reached",
        { provider: "anthropic", model: "claude-haiku-5-5", apiKey: "sk-ant-test-0123456789" },
        apiCallError({ message: "Cannot connect to API: getaddrinfo ENOTFOUND api.anthropic.com" }),
        "Mockroom can't reach Anthropic. Check your internet connection, then try again.",
      ],
      [
        "the key is wrong",
        { provider: "openai", model: "gpt-5.5", apiKey: "sk-wrong-key-0000" },
        apiCallError({ message: "Incorrect API key provided: sk-wron****0000.", statusCode: 401 }),
        "OpenAI rejected your API key. Check it in Settings, or create a new one at https://platform.openai.com/api-keys.",
      ],
      [
        "Gemini says the key is wrong",
        { provider: "gemini", model: "gemini-flash-latest", apiKey: "wrong-key-0000" },
        apiCallError({ message: "API key not valid. Please pass a valid API key.", statusCode: 400 }),
        "Gemini rejected your API key. Check it in Settings, or create a new one at https://aistudio.google.com/apikey.",
      ],
      [
        "the model doesn't exist",
        { provider: "anthropic", model: "claude-imaginary", apiKey: "sk-ant-test-0123456789" },
        apiCallError({ message: "model: claude-imaginary", statusCode: 404 }),
        'Anthropic doesn\'t know the model "claude-imaginary". Check the model name in Settings.',
      ],
      [
        "the Ollama model isn't downloaded",
        { provider: "ollama", model: "qwen3" },
        apiCallError({ message: "model 'qwen3' not found", statusCode: 404 }),
        'Ollama doesn\'t have the model "qwen3" yet. Download it by running "ollama pull qwen3" in a terminal, or pick an installed model in Settings.',
      ],
      [
        "the quota is reached",
        { provider: "openai", model: "gpt-5.5", apiKey: openaiKey },
        apiCallError({ message: "You exceeded your current quota.", statusCode: 429 }),
        "OpenAI is turning down requests for now (rate limit or quota reached). Wait a minute and try again, or check your OpenAI plan and billing.",
      ],
      [
        "the provider is down",
        { provider: "anthropic", model: "claude-haiku-5-5", apiKey: "sk-ant-test-0123456789" },
        apiCallError({ message: "Overloaded", statusCode: 529 }),
        "Anthropic is having trouble right now (error 529). Try again in a moment.",
      ],
      [
        "the SDK finds no key",
        { provider: "openai", model: "gpt-5.5", apiKey: openaiKey },
        new LoadAPIKeyError({ message: "OpenAI API key is missing." }),
        "Mockroom has no OpenAI API key. Add yours in Settings (create one at https://platform.openai.com/api-keys).",
      ],
    ])("explains clearly when %s", async (_, input, error, message) => {
      server = await startTestServer({ connect: failingProvider(error) });

      expect(await testConnection(input)).toEqual({ ok: false, error: message });
    });
  });

  it("explains provider errors in the middle of an interview, and the interview goes on", async () => {
    let failing = true;
    const working: AIModel = new ScriptedModel(["Hello! First question.", "Second question."]);
    const connect: Connect = (connection) => ({
      streamText: (messages) => (failing ? failingProvider(connectionRefused)(connection, {}) : working).streamText(messages),
    });
    server = await startTestServer({ connect, followUpsPerQuestion: 0 });
    await saveSettings({ provider: "ollama", model: "llama3.2" });
    const client = new InterviewClient(server.url);

    const failed = await client.start();
    failing = false;
    const started = await client.start();
    failing = true;
    const failedAnswer = await client.answer(started.interview!.id, "My answer.");
    failing = false;
    const retried = await client.answer(started.interview!.id, "My answer.");

    const refused =
      "Mockroom can't reach Ollama at http://127.0.0.1:11434. Is the Ollama app running? Start it, or check the Ollama address in Settings, then try again.";
    expect(failed.error).toBe(refused);
    expect(failedAnswer.error).toBe(refused);
    expect(retried.text).toBe("Second question.");
  });

  describe("Ollama models", () => {
    async function startFakeOllama(models: string[]): Promise<string> {
      fakeOllama = createServer((request, response) => {
        response.setHeader("Content-Type", "application/json");
        if (request.url === "/api/tags") {
          response.end(JSON.stringify({ models: models.map((name) => ({ name, size: 1 })) }));
        } else {
          response.statusCode = 404;
          response.end("{}");
        }
      });
      await new Promise<void>((done) => fakeOllama!.listen(0, "127.0.0.1", done));
      return `http://127.0.0.1:${(fakeOllama.address() as AddressInfo).port}`;
    }

    it("lists the models installed in Ollama", async () => {
      const url = await startFakeOllama(["qwen3:8b", "llama3.2:latest", "gemma3:latest"]);
      server = await startTestServer({ connect: echoProviders().connect });

      const response = await fetch(`${server.url}/api/settings/ollama-models?url=${encodeURIComponent(`${url}/`)}`);

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ models: ["gemma3", "llama3.2", "qwen3:8b"] });
    });

    it("explains when Ollama isn't running", async () => {
      const url = await startFakeOllama([]);
      await new Promise((done) => fakeOllama!.close(done));
      fakeOllama = undefined;
      server = await startTestServer({ connect: echoProviders().connect });

      const response = await fetch(`${server.url}/api/settings/ollama-models?url=${encodeURIComponent(url)}`);

      expect(response.status).toBe(502);
      expect(await response.json()).toEqual({
        error: `Mockroom can't reach Ollama at ${url}. Is the Ollama app running? Start it, or check the Ollama address, then try again.`,
      });
    });
  });
});
