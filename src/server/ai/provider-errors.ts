import { APICallError, LoadAPIKeyError, RetryError } from "ai";
import { LocalizedError, type Text } from "../i18n.js";
import { say } from "../messages.js";
import type { AIModel, ChatMessage } from "./model.js";
import { providerLabels, type KeyedProviderName, type ProviderConnection } from "./provider.js";

/** A provider failure, explained in words the candidate can act on. The original error is its `cause`. */
export class ProviderError extends LocalizedError {}

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
export function describeProviderError(error: unknown, connection: ProviderConnection): Text {
  if (error instanceof ProviderError) return error.text;
  // The AI SDK retries failed calls, then reports the last failure.
  const failure = RetryError.isInstance(error) ? error.lastError : error;
  const { provider, model, ollamaUrl } = connection;
  const label = providerLabels[provider];

  if (LoadAPIKeyError.isInstance(failure) && provider !== "ollama") return missingKeyMessage(provider);

  if (isNetworkError(failure)) {
    return provider === "ollama" ? say("ollamaUnreachable", ollamaUrl) : say("providerUnreachable", label);
  }

  if (APICallError.isInstance(failure)) {
    const status = failure.statusCode;
    const details = failure.message;
    if (provider !== "ollama" && (status === 401 || status === 403 || /api.key/i.test(details))) {
      return say("keyRejected", label, keyPages[provider]);
    }
    if (status === 404 || /model.*not.?found|not.?found.*model|does not exist/i.test(details)) {
      return provider === "ollama" ? say("ollamaModelMissing", model) : say("unknownModel", label, model);
    }
    if (status === 429) return say("rateLimited", label);
    if (status !== undefined && status >= 500) return say("providerDown", label, status);
    return say("providerFailed", label, status, details);
  }

  if (failure instanceof Error && failure.name === "AbortError") return say("providerTimeout", label);
  const message = failure instanceof Error ? failure.message : String(failure);
  return () => message;
}

export function missingKeyMessage(provider: KeyedProviderName): Text {
  return say("missingKey", providerLabels[provider], keyPages[provider]);
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
