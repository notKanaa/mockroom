import { describe, expect, it } from "vitest";
import { providerConfigFromEnv } from "../src/server/ai/provider.js";

describe("AI provider from environment variables", () => {
  it("is not configured when MOCKROOM_PROVIDER is unset", () => {
    expect(providerConfigFromEnv({})).toBeUndefined();
  });

  it("uses a default model for providers that have one", () => {
    expect(providerConfigFromEnv({ MOCKROOM_PROVIDER: "Anthropic" })).toEqual({
      provider: "anthropic",
      model: "claude-haiku-5-5",
    });
  });

  it("uses MOCKROOM_MODEL when set", () => {
    expect(providerConfigFromEnv({ MOCKROOM_PROVIDER: "openai", MOCKROOM_MODEL: "gpt-5.5" })).toEqual({
      provider: "openai",
      model: "gpt-5.5",
    });
  });

  it("asks for a model with Ollama", () => {
    expect(() => providerConfigFromEnv({ MOCKROOM_PROVIDER: "ollama" })).toThrow(/MOCKROOM_MODEL/);
  });

  it("rejects unknown providers", () => {
    expect(() => providerConfigFromEnv({ MOCKROOM_PROVIDER: "skynet" })).toThrow(
      'MOCKROOM_PROVIDER is "skynet". Use one of: openai, anthropic, gemini, ollama.',
    );
  });
});
