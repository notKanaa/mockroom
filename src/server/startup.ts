import { join } from "node:path";
import { providerConfigFromEnv, type Env } from "./ai/provider.js";
import { mockroomDataDir } from "./data-dir.js";
import { loadPacks } from "./packs/library.js";
import type { Pack } from "./packs/pack.js";
import { formatPackProblem } from "./packs/parse.js";

/**
 * Checks the AI provider environment variables, which override the settings
 * screen, and says where the provider choice comes from. Exits when they are wrong.
 */
export function loadEnvOrExit(dataDir: string): Env {
  try {
    const config = providerConfigFromEnv(process.env);
    console.log(
      config
        ? `AI provider: ${config.provider} (${config.model}), from environment variables. They override the settings screen.`
        : `AI provider: chosen on the settings screen, saved in ${join(dataDir, "settings.json")}`,
    );
    return process.env;
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

/** Finds the Mockroom data folder and says where interviews are saved. */
export function loadDataDir(): string {
  const dataDir = mockroomDataDir();
  console.log(`Interviews are saved in ${join(dataDir, "interviews")}`);
  return dataDir;
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
