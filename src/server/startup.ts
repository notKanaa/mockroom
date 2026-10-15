import type { AIModel } from "./ai/model.js";
import { modelFromEnv } from "./ai/provider.js";
import { loadPacks } from "./packs/library.js";
import type { Pack } from "./packs/pack.js";
import { formatPackProblem } from "./packs/parse.js";

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

/** Loads the built-in packs. Invalid ones are left out with a warning, so the others stay usable. */
export function loadPacksWithWarnings(): Pack[] {
  const { packs, problems } = loadPacks();
  if (problems.length > 0) {
    console.warn("Some interview packs are invalid and were left out:");
    for (const problem of problems) console.warn(`  ${formatPackProblem(problem)}`);
  }
  return packs;
}

/**
 * Reads MOCKROOM_FOLLOW_UPS, the most follow-up questions the interviewer asks
 * on one question (0 turns them off). Undefined when unset, so the default applies.
 */
export function followUpsPerQuestionFromEnv(env: Record<string, string | undefined>): number | undefined {
  const value = env.MOCKROOM_FOLLOW_UPS?.trim();
  if (!value) return undefined;
  if (!/^\d+$/.test(value)) {
    throw new Error(
      `MOCKROOM_FOLLOW_UPS is "${env.MOCKROOM_FOLLOW_UPS}". Use a whole number, such as 2, or 0 to turn follow-ups off.`,
    );
  }
  return Number(value);
}

/** Reads the follow-up setting from the environment. Exits when it is wrong. */
export function loadFollowUpsOrExit(): number | undefined {
  try {
    return followUpsPerQuestionFromEnv(process.env);
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}
