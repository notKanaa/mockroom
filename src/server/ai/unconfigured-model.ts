import type { AIModel } from "./model.js";

/** Placeholder used until the candidate has picked an AI provider. */
export const unconfiguredModel: AIModel = {
  async *streamText() {
    throw new Error("No AI provider is configured yet.");
  },
};
