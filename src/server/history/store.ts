import { mkdir, readFile, readdir, rename, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { HistoryEntry, SavedInterview } from "./types.js";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * The interview history: one JSON file per finished interview, in the
 * `interviews` folder of the Mockroom data folder. No database, nothing sent
 * anywhere.
 */
export class InterviewHistory {
  /** The folder holding the interview files. Created on the first save. */
  readonly dir: string;
  /** The latest write of each interview, so writes to one file happen one after the other. */
  readonly #writes = new Map<string, Promise<void>>();
  /** Interviews deleted since Mockroom started. A late save (a debrief finishing) must not bring them back. */
  readonly #deleted = new Set<string>();

  constructor(dataDir: string) {
    this.dir = join(dataDir, "interviews");
  }

  /** Saves an interview, replacing its previous version. */
  save(interview: SavedInterview): Promise<void> {
    const { id } = interview;
    if (!uuidPattern.test(id)) return Promise.reject(new Error(`"${id}" isn't a valid interview id.`));

    const write = (this.#writes.get(id) ?? Promise.resolve())
      .catch(() => {})
      .then(async () => {
        if (this.#deleted.has(id)) return;
        await mkdir(this.dir, { recursive: true });
        // Written next to the file, then renamed over it, so a crash never leaves half a file.
        const temporary = `${this.#file(id)}.tmp`;
        await writeFile(temporary, `${JSON.stringify(interview, null, 2)}\n`, "utf8");
        await rename(temporary, this.#file(id));
      });
    this.#writes.set(id, write);
    return write;
  }

  /** Every saved interview, most recent first. Files that can't be read are left out with a warning. */
  async list(): Promise<HistoryEntry[]> {
    let names: string[];
    try {
      names = await readdir(this.dir);
    } catch (error) {
      if (isNotFound(error)) return [];
      throw error;
    }

    const entries: HistoryEntry[] = [];
    for (const name of names) {
      const id = name.replace(/\.json$/i, "");
      if (id === name || !uuidPattern.test(id)) continue;
      const interview = await this.#readFile(id).catch((error: unknown) => {
        console.warn(errorMessage(error));
        return undefined;
      });
      if (!interview) continue;
      const { formatVersion, transcript, debrief, ...entry } = interview;
      entries.push({ ...entry, hasDebrief: debrief !== null });
    }
    return entries.sort((a, b) => b.startedAt.localeCompare(a.startedAt) || a.id.localeCompare(b.id));
  }

  /** A saved interview, or undefined if there is none with this id. */
  async read(id: string): Promise<SavedInterview | undefined> {
    if (!uuidPattern.test(id)) return undefined;
    await this.#writes.get(id)?.catch(() => {});
    return this.#readFile(id);
  }

  /** Deletes a saved interview's file. False if there was none. */
  async delete(id: string): Promise<boolean> {
    if (!uuidPattern.test(id)) return false;
    this.#deleted.add(id);
    await this.#writes.get(id)?.catch(() => {});
    try {
      await unlink(this.#file(id));
      return true;
    } catch (error) {
      if (isNotFound(error)) return false;
      throw error;
    }
  }

  #file(id: string): string {
    return join(this.dir, `${id.toLowerCase()}.json`);
  }

  /** Reads and checks an interview file. Undefined if it doesn't exist; throws if it is damaged. */
  async #readFile(id: string): Promise<SavedInterview | undefined> {
    const file = this.#file(id);
    let text: string;
    try {
      text = await readFile(file, "utf8");
    } catch (error) {
      if (isNotFound(error)) return undefined;
      throw error;
    }
    let interview: unknown;
    try {
      interview = JSON.parse(text);
    } catch {
      interview = undefined;
    }
    if (!isSavedInterview(interview, id)) {
      throw new Error(`The saved interview ${file} is damaged or from an unknown version, so it was skipped.`);
    }
    return interview;
  }
}

/** A light check that a file holds a saved interview, so a damaged file doesn't break the history screen. */
function isSavedInterview(value: unknown, id: string): value is SavedInterview {
  if (typeof value !== "object" || value === null) return false;
  const interview = value as Record<string, unknown>;
  return (
    interview.formatVersion === 1 &&
    typeof interview.id === "string" &&
    interview.id.toLowerCase() === id.toLowerCase() &&
    typeof interview.startedAt === "string" &&
    typeof interview.finishedAt === "string" &&
    Array.isArray(interview.packs) &&
    typeof interview.language === "string" &&
    Array.isArray(interview.transcript) &&
    (interview.debrief === null || typeof interview.debrief === "object")
  );
}

function isNotFound(error: unknown): boolean {
  return (error as NodeJS.ErrnoException | undefined)?.code === "ENOENT";
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
