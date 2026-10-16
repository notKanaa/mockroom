import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { streamText, type LanguageModel, type ModelMessage } from "ai";
import type { AIModel, ChatMessage } from "./model.js";

/**
 * The AI providers Mockroom can use. They are chosen on the settings screen,
 * or with environment variables, which override the settings:
 *
 * - MOCKROOM_PROVIDER: openai, anthropic, gemini or ollama
 * - MOCKROOM_MODEL: the model to use (optional, except for Ollama)
 * - the provider's key: OPENAI_API_KEY, ANTHROPIC_API_KEY, or GEMINI_API_KEY
 *   (GOOGLE_GENERATIVE_AI_API_KEY also works). Ollama needs none.
 * - MOCKROOM_OLLAMA_URL: where Ollama runs (default http://127.0.0.1:11434)
 */
export const providers = ["openai", "anthropic", "gemini", "ollama"] as const;
export type ProviderName = (typeof providers)[number];

/** The providers that need an API key: all but Ollama. */
export type KeyedProviderName = Exclude<ProviderName, "ollama">;
export const keyedProviders = ["openai", "anthropic", "gemini"] as const satisfies readonly KeyedProviderName[];

export const providerLabels: Record<ProviderName, string> = {
  openai: "OpenAI",
  anthropic: "Anthropic",
  gemini: "Gemini",
  ollama: "Ollama",
};

export const defaultModels: Record<KeyedProviderName, string> = {
  openai: "gpt-5.4-mini",
  anthropic: "claude-haiku-5-5",
  gemini: "gemini-flash-latest",
};

export const defaultOllamaUrl = "http://127.0.0.1:11434";

export interface ProviderConfig {
  provider: ProviderName;
  model: string;
}

/** Everything needed to call a provider: what to use, and how to reach it. */
export interface ProviderConnection extends ProviderConfig {
  /** The API key. Unused by Ollama. */
  apiKey?: string;
  /** Where Ollama runs, without a trailing slash. Unused by the other providers. */
  ollamaUrl: string;
}

export type Env = Record<string, string | undefined>;

/** Reads the provider choice from the environment. Undefined when none is set; throws when it is wrong. */
export function providerConfigFromEnv(env: Env): ProviderConfig | undefined {
  const provider = env.MOCKROOM_PROVIDER?.trim().toLowerCase();
  if (!provider) return undefined;
  if (!isProviderName(provider)) {
    throw new Error(
      `MOCKROOM_PROVIDER is "${env.MOCKROOM_PROVIDER}". Use one of: ${providers.join(", ")}.`,
    );
  }
  const model = env.MOCKROOM_MODEL?.trim() || (provider === "ollama" ? "" : defaultModels[provider]);
  if (!model) {
    throw new Error('Set MOCKROOM_MODEL to the Ollama model to use, for example "llama3.2".');
  }
  return { provider, model };
}

/** The provider's API key set in the environment, if any. */
export function apiKeyFromEnv(provider: KeyedProviderName, env: Env): string | undefined {
  const key =
    provider === "openai"
      ? env.OPENAI_API_KEY
      : provider === "anthropic"
        ? env.ANTHROPIC_API_KEY
        : (env.GEMINI_API_KEY ?? env.GOOGLE_GENERATIVE_AI_API_KEY);
  return key?.trim() || undefined;
}

/** The Ollama address set in the environment, if any. */
export function ollamaUrlFromEnv(env: Env): string | undefined {
  return env.MOCKROOM_OLLAMA_URL?.trim() ? normalizeUrl(env.MOCKROOM_OLLAMA_URL) : undefined;
}

/** An address without surrounding spaces or trailing slashes. */
export function normalizeUrl(url: string): string {
  return url.trim().replace(/\/+$/, "");
}

export interface ConnectOptions {
  /** How many times a failed call is retried. Defaults to the AI SDK's 2. */
  maxRetries?: number;
}

/** A real provider, through the Vercel AI SDK. */
export function connectProvider(connection: ProviderConnection, { maxRetries }: ConnectOptions = {}): AIModel {
  return aiSdkModel(languageModel(connection), maxRetries);
}

function languageModel({ provider, model, apiKey, ollamaUrl }: ProviderConnection): LanguageModel {
  // An empty key, rather than none, so the SDK never falls back to a key of its own.
  switch (provider) {
    case "openai":
      return createOpenAI({ apiKey: apiKey ?? "" })(model);
    case "anthropic":
      return createAnthropic({ apiKey: apiKey ?? "" })(model);
    case "gemini":
      return createGoogleGenerativeAI({ apiKey: apiKey ?? "" })(model);
    case "ollama":
      return createOpenAICompatible({ name: "ollama", baseURL: `${normalizeUrl(ollamaUrl)}/v1` })(model);
  }
}

/** Adapts a Vercel AI SDK model to Mockroom's AI model port. */
function aiSdkModel(model: LanguageModel, maxRetries: number | undefined): AIModel {
  return {
    async *streamText(messages: ChatMessage[]) {
      const system = messages
        .filter((message) => message.role === "system")
        .map((message) => message.content)
        .join("\n\n");
      const conversation = messages.flatMap(({ role, content }): ModelMessage[] =>
        role === "system" ? [] : [{ role, content }],
      );
      const result = streamText({
        model,
        system: system || undefined,
        messages: conversation,
        maxRetries,
        // Errors are rethrown below, so the caller can report them.
        onError: () => {},
      });
      for await (const part of result.stream) {
        if (part.type === "text-delta") yield part.text;
        if (part.type === "error") {
          throw part.error instanceof Error ? part.error : new Error(String(part.error));
        }
      }
    },
  };
}

export function isProviderName(value: unknown): value is ProviderName {
  return typeof value === "string" && (providers as readonly string[]).includes(value);
}
