import type { AIModel } from "./ai/model.js";
import { modelFromEnv } from "./ai/provider.js";

/** Loads the AI model from the environment and says which one is used. Exits when the settings are wrong. */
export function loadModelOrExit(): AIModel {
  try {
    const { model, config } = modelFromEnv(process.env);
    console.log(
      config
        ? `AI provider: ${config.provider} (${config.model})`
        : "No AI provider configured: set MOCKROOM_PROVIDER (see the README).",
    );
    return model;
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}
