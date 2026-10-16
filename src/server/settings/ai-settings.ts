import { chmod, mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { collectText, type AIModel, type ChatMessage } from "../ai/model.js";
import {
  apiKeyFromEnv,
  connectProvider,
  defaultModels,
  defaultOllamaUrl,
  isProviderName,
  keyedProviders,
  normalizeUrl,
  ollamaUrlFromEnv,
  providerConfigFromEnv,
  providerLabels,
  providers,
  type ConnectOptions,
  type Env,
  type KeyedProviderName,
  type ProviderConnection,
  type ProviderName,
} from "../ai/provider.js";
import { keyPages, missingKeyMessage, ProviderError, withClearErrors } from "../ai/provider-errors.js";
import { LocalizedError, localizedMessage, type Language } from "../i18n.js";
import { say } from "../messages.js";
import type {
  AISettingsInput,
  AISettingsView,
  ConnectionTest,
  MaskedKey,
  ProviderInfo,
  SettingSource,
} from "./types.js";

/** Builds the model for a provider connection. The real one calls the provider; tests inject fakes. */
export type Connect = (connection: ProviderConnection, options: ConnectOptions) => AIModel;

/** The settings sent by the candidate don't make sense. The message says what to fix. */
export class SettingsError extends LocalizedError {}

/** The settings file, `settings.json` in the Mockroom data folder. */
interface SettingsFile {
  formatVersion: 1;
  provider: ProviderName;
  model: string;
  /** One key per provider, so switching provider doesn't lose the others. */
  apiKeys: Partial<Record<KeyedProviderName, string>>;
  ollamaUrl?: string;
}

const suggestedModels: Record<ProviderName, string[]> = {
  openai: ["gpt-5.4-mini", "gpt-5.5"],
  anthropic: ["claude-haiku-5-5", "claude-sonnet-5-5", "claude-opus-5-5"],
  gemini: ["gemini-flash-latest", "gemini-pro-latest"],
  ollama: ["llama3.2", "qwen3", "gemma3"],
};

const keyEnvVars: Record<KeyedProviderName, string> = {
  openai: "OPENAI_API_KEY",
  anthropic: "ANTHROPIC_API_KEY",
  gemini: "GEMINI_API_KEY",
};

const providerInfos: ProviderInfo[] = providers.map((id) =>
  id === "ollama"
    ? { id, label: providerLabels[id], needsKey: false, suggestedModels: suggestedModels[id] }
    : {
        id,
        label: providerLabels[id],
        needsKey: true,
        defaultModel: defaultModels[id],
        suggestedModels: suggestedModels[id],
        keyPage: keyPages[id],
        keyEnvVar: keyEnvVars[id],
      },
);


/** The connection to use, and where its provider choice comes from. */
type ActiveConnection = ProviderConnection & { source: SettingSource };

/**
 * The candidate's AI provider settings: which provider and model, the API keys
 * and the Ollama address. They live in `settings.json` in the Mockroom data
 * folder, and nowhere else: keys are only sent to the provider they belong to,
 * and only ever leave this module masked.
 *
 * Environment variables override the file (see `provider.ts`). `model` always
 * uses the latest settings, so a change applies without restarting Mockroom.
 */
export class AISettings {
  /** The settings file. */
  readonly file: string;
  /** The AI model interviews use: whatever the settings say at the time of each call. */
  readonly model: AIModel;
  readonly #env: Env;
  readonly #connect: Connect;
  /** The settings file's content, once read. Null when there is none (yet). */
  #saved: Promise<SettingsFile | null> | undefined;
  /** The latest write, so saves happen one after the other. */
  #write: Promise<unknown> = Promise.resolve();
  /** The model built for the current connection, rebuilt when the settings change. */
  #cached: { key: string; model: AIModel } | undefined;

  constructor({ dataDir, env = {}, connect = connectProvider }: { dataDir: string; env?: Env; connect?: Connect }) {
    this.file = join(dataDir, "settings.json");
    this.#env = env;
    this.#connect = connect;
    this.model = { streamText: (messages) => this.#streamText(messages) };
  }

  /** The settings as the UI shows them, keys masked. */
  async view(): Promise<AISettingsView> {
    const saved = await this.#read();
    const active = this.#active(saved);
    const envUrl = ollamaUrlFromEnv(this.#env);
    return {
      configured: active !== undefined && (active.provider === "ollama" || active.apiKey !== undefined),
      active: active ? { provider: active.provider, model: active.model, source: active.source } : null,
      saved: saved ? { provider: saved.provider, model: saved.model } : null,
      ollamaUrl: envUrl
        ? { url: envUrl, source: "environment" }
        : saved?.ollamaUrl
          ? { url: saved.ollamaUrl, source: "settings" }
          : { url: defaultOllamaUrl, source: "default" },
      apiKeys: Object.fromEntries(
        keyedProviders.map((provider) => [provider, this.#maskedKey(provider, saved)]),
      ) as Record<KeyedProviderName, MaskedKey | null>,
      providers: providerInfos,
      settingsFile: this.file,
    };
  }

  /** Checks and saves new settings. They apply to the next AI call. Throws a `SettingsError` when they are wrong. */
  async save(body: unknown): Promise<AISettingsView> {
    const write = this.#write.then(async () => {
      const saved = await this.#read();
      const input = parseInput(body);
      const apiKeys = { ...saved?.apiKeys };
      if (input.provider !== "ollama" && input.apiKey) apiKeys[input.provider] = input.apiKey;
      if (
        input.provider !== "ollama" &&
        !apiKeys[input.provider] &&
        !apiKeyFromEnv(input.provider, this.#env)
      ) {
        throw new SettingsError(say("enterKey", providerLabels[input.provider]));
      }
      const next: SettingsFile = {
        formatVersion: 1,
        provider: input.provider,
        model: input.model,
        apiKeys,
        ...((input.ollamaUrl ?? saved?.ollamaUrl) && { ollamaUrl: input.ollamaUrl ?? saved?.ollamaUrl }),
      };
      await writeSettingsFile(this.file, next);
      this.#saved = Promise.resolve(next);
    });
    this.#write = write.catch(() => {});
    await write;
    return this.view();
  }

  /**
   * Sends a tiny message to a provider and says whether it answered. Without a
   * body, tests the provider in use; with one, tests those settings before
   * they are saved (an empty key means the saved one). Messages are in `language`.
   */
  async test(body: unknown, language: Language = "en"): Promise<ConnectionTest> {
    const saved = await this.#read();
    let connection: ProviderConnection | undefined;
    if (isEmptyBody(body)) {
      connection = this.#active(saved);
      if (!connection) return { ok: false, error: say("notConfigured")(language) };
    } else {
      const input = parseInput(body);
      connection = {
        provider: input.provider,
        model: input.model,
        apiKey:
          input.provider === "ollama" ? undefined : (input.apiKey ?? this.#apiKey(input.provider, saved)),
        ollamaUrl: input.ollamaUrl ?? this.#ollamaUrl(saved),
      };
    }

    const { provider, model } = connection;
    if (provider !== "ollama" && !connection.apiKey) return { ok: false, error: missingKeyMessage(provider)(language) };
    // No retries: the candidate is waiting, and one failure says enough.
    const tested = withClearErrors(this.#connect(connection, { maxRetries: 0 }), connection);
    try {
      const reply = await collectText(
        tested.streamText([{ role: "user", content: "Reply with the single word OK." }]),
      );
      if (reply.trim() === "") {
        return { ok: false, error: say("emptyTestReply", providerLabels[provider])(language) };
      }
      return { ok: true, message: say("connected", providerLabels[provider], model)(language) };
    } catch (error) {
      return { ok: false, error: localizedMessage(error, language) };
    }
  }

  /** The models installed in Ollama, at `url` or the Ollama address in use. Throws a `ProviderError` when Ollama can't be reached. */
  async ollamaModels(url?: string): Promise<string[]> {
    const base = url?.trim() ? checkOllamaUrl(url) : this.#ollamaUrl(await this.#read());
    let response: Response;
    try {
      response = await fetch(`${base}/api/tags`, { signal: AbortSignal.timeout(5000) });
    } catch {
      throw new ProviderError(say("ollamaListUnreachable", base));
    }
    const body = (await response.json().catch(() => undefined)) as { models?: { name?: unknown }[] } | undefined;
    if (!response.ok || !Array.isArray(body?.models)) {
      throw new ProviderError(say("notOllama", base));
    }
    // Ollama names the default version of a model "name:latest", which "name" also means.
    const names = body.models.flatMap(({ name }) =>
      typeof name === "string" ? [name.replace(/:latest$/, "")] : [],
    );
    return [...new Set(names)].sort((a, b) => a.localeCompare(b));
  }

  async *#streamText(messages: ChatMessage[]): AsyncIterable<string> {
    const connection = this.#active(await this.#read());
    if (!connection) throw new ProviderError(say("notConfigured"));
    if (connection.provider !== "ollama" && !connection.apiKey) {
      throw new ProviderError(missingKeyMessage(connection.provider));
    }
    const { source, ...settings } = connection;
    const key = JSON.stringify(settings);
    if (this.#cached?.key !== key) {
      this.#cached = { key, model: withClearErrors(this.#connect(settings, {}), settings) };
    }
    yield* this.#cached.model.streamText(messages);
  }

  /** The connection in use: environment variables first, then the settings file. */
  #active(saved: SettingsFile | null): ActiveConnection | undefined {
    const fromEnv = providerConfigFromEnv(this.#env);
    const choice = fromEnv ?? saved;
    if (!choice) return undefined;
    const { provider, model } = choice;
    return {
      provider,
      model,
      apiKey: provider === "ollama" ? undefined : this.#apiKey(provider, saved),
      ollamaUrl: this.#ollamaUrl(saved),
      source: fromEnv ? "environment" : "settings",
    };
  }

  #apiKey(provider: KeyedProviderName, saved: SettingsFile | null): string | undefined {
    return apiKeyFromEnv(provider, this.#env) ?? saved?.apiKeys[provider];
  }

  #ollamaUrl(saved: SettingsFile | null): string {
    return ollamaUrlFromEnv(this.#env) ?? saved?.ollamaUrl ?? defaultOllamaUrl;
  }

  #maskedKey(provider: KeyedProviderName, saved: SettingsFile | null): MaskedKey | null {
    const fromEnv = apiKeyFromEnv(provider, this.#env);
    const key = fromEnv ?? saved?.apiKeys[provider];
    return key ? { masked: maskKey(key), source: fromEnv ? "environment" : "settings" } : null;
  }

  #read(): Promise<SettingsFile | null> {
    return (this.#saved ??= readSettingsFile(this.file));
  }
}

/** Hides an API key but its last 4 characters, or all of it when it is short. */
export function maskKey(key: string): string {
  return key.length >= 16 ? `••••••••${key.slice(-4)}` : "••••••••";
}

function parseInput(body: unknown): AISettingsInput {
  const input = (typeof body === "object" && body !== null ? body : {}) as Record<string, unknown>;
  if (!isProviderName(input.provider)) {
    throw new SettingsError(say("chooseProvider", providers.map((name) => providerLabels[name]).join(", ")));
  }
  const provider = input.provider;
  const model = typeof input.model === "string" ? input.model.trim() : "";
  if (!model) {
    throw new SettingsError(say(provider === "ollama" ? "chooseOllamaModel" : "chooseModel"));
  }
  if (model.length > 200) throw new SettingsError(say("modelTooLong"));
  if (input.apiKey !== undefined && typeof input.apiKey !== "string") {
    throw new SettingsError(say("keyNotText"));
  }
  if (input.ollamaUrl !== undefined && typeof input.ollamaUrl !== "string") {
    throw new SettingsError(say("ollamaUrlNotText"));
  }
  const apiKey = input.apiKey?.trim() || undefined;
  if (apiKey && /\s/.test(apiKey)) throw new SettingsError(say("keyWithSpaces"));
  const ollamaUrl = input.ollamaUrl?.trim() ? checkOllamaUrl(input.ollamaUrl) : undefined;
  return { provider, model, apiKey, ollamaUrl };
}

function checkOllamaUrl(url: string): string {
  const normalized = normalizeUrl(url);
  let protocol: string | undefined;
  try {
    protocol = new URL(normalized).protocol;
  } catch {
    protocol = undefined;
  }
  if (protocol !== "http:" && protocol !== "https:") {
    throw new SettingsError(say("ollamaUrlProtocol", defaultOllamaUrl));
  }
  return normalized;
}

function isEmptyBody(body: unknown): boolean {
  return typeof body !== "object" || body === null || Object.keys(body).length === 0;
}

async function readSettingsFile(file: string): Promise<SettingsFile | null> {
  let text: string;
  try {
    text = await readFile(file, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
  try {
    const data = JSON.parse(text) as Partial<SettingsFile>;
    if (!isProviderName(data.provider) || typeof data.model !== "string" || !data.model.trim()) {
      throw new Error("no provider or model");
    }
    const apiKeys: SettingsFile["apiKeys"] = {};
    for (const provider of keyedProviders) {
      const key = data.apiKeys?.[provider];
      if (typeof key === "string" && key.trim()) apiKeys[provider] = key.trim();
    }
    return {
      formatVersion: 1,
      provider: data.provider,
      model: data.model.trim(),
      apiKeys,
      ...(typeof data.ollamaUrl === "string" && data.ollamaUrl.trim() && { ollamaUrl: normalizeUrl(data.ollamaUrl) }),
    };
  } catch {
    console.warn(`The settings file ${file} can't be read, so it is ignored. Choose your AI provider again in Settings.`);
    return null;
  }
}

async function writeSettingsFile(file: string, settings: SettingsFile): Promise<void> {
  await mkdir(join(file, ".."), { recursive: true });
  // Written next to the file, then renamed over it, so a crash never leaves half a file.
  // Readable by this user only, since it holds API keys (no effect on Windows, where
  // the data folder is already private to the user).
  const temporary = `${file}.tmp`;
  await writeFile(temporary, `${JSON.stringify(settings, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
  await chmod(temporary, 0o600).catch(() => {});
  await rename(temporary, file);
}
