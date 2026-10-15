import type { Pack } from "./pack.js";
import { reactJuniorEn } from "./react-junior-en.js";

/** Packs bundled with Mockroom. */
export const builtInPacks: readonly Pack[] = [reactJuniorEn];

export function findPack(id: string): Pack | undefined {
  return builtInPacks.find((pack) => pack.id === id);
}
