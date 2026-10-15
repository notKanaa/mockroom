import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Pack } from "./pack.js";
import { parsePack, type PackProblem } from "./parse.js";

/**
 * The `packs` folder shipped with Mockroom. It sits at the package root, three
 * levels up from both src/server/packs and dist/server/packs.
 */
export const builtInPacksDir = fileURLToPath(new URL("../../../packs", import.meta.url));

export interface PackLibrary {
  /** The valid packs, sorted by title. */
  packs: Pack[];
  /** What's wrong with the files that were left out. */
  problems: PackProblem[];
}

/** Loads every `.yaml` pack in a folder. Invalid files are left out and reported. */
export function loadPacks(dir: string = builtInPacksDir): PackLibrary {
  if (!existsSync(dir)) {
    return { packs: [], problems: [{ file: dir, field: "", message: "The pack folder doesn't exist." }] };
  }

  const packs: Pack[] = [];
  const problems: PackProblem[] = [];
  const files = readdirSync(dir)
    .filter((name) => /\.ya?ml$/i.test(name))
    .sort();

  for (const name of files) {
    const file = join(dir, name);
    const result = parsePack(readFileSync(file, "utf8"), file);
    if (!result.ok) {
      problems.push(...result.problems);
    } else if (packs.some((pack) => pack.id === result.pack.id)) {
      problems.push({ file, line: 1, column: 1, field: "id", message: `"${result.pack.id}" is already used by another pack.` });
    } else {
      packs.push(result.pack);
    }
  }

  packs.sort((a, b) => a.title.localeCompare(b.title));
  return { packs, problems };
}

export interface PackFilter {
  technology?: string;
  level?: string;
  language?: string;
}

/** The packs matching every given criterion. Technologies match whatever their case. */
export function filterPacks(packs: readonly Pack[], { technology, level, language }: PackFilter): Pack[] {
  return packs.filter(
    (pack) =>
      (!technology || pack.technology.toLowerCase() === technology.toLowerCase()) &&
      (!level || pack.level === level) &&
      (!language || pack.language === language),
  );
}
