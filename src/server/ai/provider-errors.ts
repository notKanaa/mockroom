import { APICallError, LoadAPIKeyError, RetryError } from "ai";
import type { AIModel, ChatMessage } from "./model.js";
import { providerLabels, type KeyedProviderName, type ProviderConnection } from "./provider.js";

/** A provider failure, explained in words the candidate can act on. The original error is its `cause`. */
export class ProviderError extends Error {}

/** Where to create an API key for each provider. */
export const keyPages: Record<KeyedProviderName, string> = {
  openai: "https://platform.openai.com/api-keys",
  anthropic: "https://console.anthropic.com/settings/keys",
  gemini: "https://aistudio.google.com/apikey",
};

const networkErrorCodes = new Set([
  "ECONNREFUSED",
  "ECONNRESET",
  "ENOTFOUND",
  "EAI_AGAIN",
  "ETIMEDOUT",
  "EHOSTUNREACH",
  "ENETUNREACH",
  "UND_ERR_CONNECT_TIMEOUT",
]);

/**
 * Turns an error from an AI provider into a clear message saying what went
 * wrong and how to fix it: provider unreachable, key rejected, unknown model,
 * Ollama model not downloaded, rate limit… Errors it doesn't recognise keep
 * their own message.
 */
export function describeProviderError(error: unknown, connection: ProviderConnection): string {
  if (error instanceof ProviderError) return error.message;
  // The AI SDK retries failed calls, then reports the last failure.
  const failure = RetryError.isInstance(error) ? error.lastError : error;
  const { provider, model, ollamaUrl } = connection;
  const label = providerLabels[provider];

  if (LoadAPIKeyError.isInstance(failure) && provider !== "ollama") return missingKeyMessage(provider);

  if (isNetworkError(failure)) {
    return provider === "ollama"
      ? `Mockroom can't reach Ollama at ${ollamaUrl}. Is the Ollama app running? Start it, or check the Ollama address in Settings, then try again.`
      : `Mockroom can't reach ${label}. Check your internet connection, then try again.`;
  }

  if (APICallError.isInstance(failure)) {
    const status = failure.statusCode;
    const details = failure.message;
    if (provider !== "ollama" && (status === 401 || status === 403 || /api.key/i.test(details))) {
      return `${label} rejected your API key. Check it in Settings, or create a new one at ${keyPages[provider]}.`;
    }
    if (status === 404 || /model.*not.?found|not.?found.*model|does not exist/i.test(details)) {
      return provider === "ollama"
        ? `Ollama doesn't have the model "${model}" yet. Download it by running "ollama pull ${model}" in a terminal, or pick an installed model in Settings.`
        : `${label} doesn't know the model "${model}". Check the model name in Settings.`;
    }
    if (status === 429) {
      return `${label} is turning down requests for now (rate limit or quota reached). Wait a minute and try again, or check your ${label} plan and billing.`;
    }
    if (status !== undefined && status >= 500) {
      return `${label} is having trouble right now (error ${status}). Try again in a moment.`;
    }
    return `${label} returned an error${status ? ` (${status})` : ""}: ${details}`;
  }

  if (failure instanceof Error && failure.name === "AbortError") {
    return `${label} took too long to answer. Try again, or pick a faster model in Settings.`;
  }
  return failure instanceof Error ? failure.message : String(failure);
}

export function missingKeyMessage(provider: KeyedProviderName): string {
  return `Mockroom has no ${providerLabels[provider]} API key. Add yours in Settings (create one at ${keyPages[provider]}).`;
}

/** Wraps a model so its failures come out as clear `ProviderError`s. */
export function withClearErrors(model: AIModel, connection: ProviderConnection): AIModel {
  return {
    async *streamText(messages: ChatMessage[]) {
      try {
        yield* model.streamText(messages);
      } catch (error) {
        throw new ProviderError(describeProviderError(error, connection), { cause: error });
      }
    },
  };
}

function isNetworkError(error: unknown): boolean {
  for (let current = error, depth = 0; current instanceof Error && depth < 5; depth++) {
    const code = (current as { code?: unknown }).code;
    if (typeof code === "string" && networkErrorCodes.has(code)) return true;
    if (APICallError.isInstance(current) && /^Cannot connect to API/.test(current.message)) return true;
    if (current.name === "TypeError" && current.message === "fetch failed") return true;
    current = current.cause;
  }
  return false;
}
