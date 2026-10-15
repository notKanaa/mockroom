import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { streamText, type LanguageModel, type ModelMessage } from "ai";
import type { AIModel, ChatMessage } from "./model.js";
import { unconfiguredModel } from "./unconfigured-model.js";

/**
 * Picks the real AI provider from environment variables, until the settings
 * screen exists (issue #4):
 *
 * - MOCKROOM_PROVIDER: openai, anthropic, gemini or ollama
 * - MOCKROOM_MODEL: the model to use (optional, except for Ollama)
 * - the provider's key: OPENAI_API_KEY, ANTHROPIC_API_KEY, or GEMINI_API_KEY
 *   (GOOGLE_GENERATIVE_AI_API_KEY also works). Ollama needs none.
 * - MOCKROOM_OLLAMA_URL: where Ollama runs (default http://127.0.0.1:11434)
 */
export const providers = ["openai", "anthropic", "gemini", "ollama"] as const;
export type ProviderName = (typeof providers)[number];

export interface ProviderConfig {
  provider: ProviderName;
  model: string;
}

const defaultModels: Record<Exclude<ProviderName, "ollama">, string> = {
  openai: "gpt-5.4-mini",
  anthropic: "claude-haiku-5-5",
  gemini: "gemini-flash-latest",
};

type Env = Record<string, string | undefined>;

/** Reads the provider settings. Undefined when none is set; throws when they are wrong. */
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

/** The AI model chosen in the environment, or a placeholder explaining how to choose one. */
export function modelFromEnv(env: Env): { model: AIModel; config?: ProviderConfig } {
  const config = providerConfigFromEnv(env);
  if (!config) return { model: unconfiguredModel };
  return { model: aiSdkModel(languageModel(config, env)), config };
}

function languageModel({ provider, model }: ProviderConfig, env: Env): LanguageModel {
  switch (provider) {
    case "openai":
      return createOpenAI({ apiKey: env.OPENAI_API_KEY })(model);
    case "anthropic":
      return createAnthropic({ apiKey: env.ANTHROPIC_API_KEY })(model);
    case "gemini":
      return createGoogleGenerativeAI({
        apiKey: env.GEMINI_API_KEY ?? env.GOOGLE_GENERATIVE_AI_API_KEY,
      })(model);
    case "ollama": {
      const baseURL = (env.MOCKROOM_OLLAMA_URL ?? "http://127.0.0.1:11434").replace(/\/+$/, "");
      return createOpenAICompatible({ name: "ollama", baseURL: `${baseURL}/v1` })(model);
    }
  }
}

/** Adapts a Vercel AI SDK model to Mockroom's AI model port. */
function aiSdkModel(model: LanguageModel): AIModel {
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

function isProviderName(value: string): value is ProviderName {
  return (providers as readonly string[]).includes(value);
}
