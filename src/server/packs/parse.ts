import { basename, extname } from "node:path";
import { LineCounter, isMap, isNode, isSeq, parseDocument, type Document } from "yaml";
import {
  packLanguages,
  packLevels,
  type Pack,
  type PackLanguage,
  type PackLevel,
  type PackResource,
  type PackTheme,
} from "./pack.js";

/** Something wrong in a pack file, written for contributors who don't code. */
export interface PackProblem {
  file: string;
  /** Where the problem is, from 1. Missing when the whole file is concerned. */
  line?: number;
  column?: number;
  /** The field at fault, e.g. `themes › theme 2 › key_points`. Empty for the whole file. */
  field: string;
  message: string;
}

export type PackParseResult = { ok: true; pack: Pack } | { ok: false; problems: PackProblem[] };

/** `file.yaml:3:5: field: message`, a format editors and terminals can jump to. */
export function formatPackProblem({ file, line, column, field, message }: PackProblem): string {
  const where = line === undefined ? file : `${file}:${line}:${column ?? 1}`;
  return `${where}: ${field ? `${field} ` : ""}${message}`;
}

/** Reads a pack from the text of its YAML file and checks it against the pack format. */
export function parsePack(text: string, file: string): PackParseResult {
  const lineCounter = new LineCounter();
  const doc = parseDocument(text, { lineCounter, prettyErrors: false });

  if (doc.errors.length > 0) {
    return {
      ok: false,
      problems: doc.errors.map((error) => {
        const { line, col } = lineCounter.linePos(error.pos[0]);
        return { file, line, column: col, field: "", message: yamlHint(error.message) };
      }),
    };
  }

  const checker = new PackChecker(basename(file, extname(file)));
  const pack = checker.pack(doc.toJS());
  if (pack && checker.issues.length === 0) return { ok: true, pack };

  const problems = checker.issues.map(({ path, message }): PackProblem => {
    const position = locate(doc, path);
    const { line, col } = position === undefined ? { line: undefined, col: undefined } : lineCounter.linePos(position);
    return { file, line, column: col, field: describePath(path), message };
  });
  // From the top of the file down, the way a contributor reads it.
  problems.sort((a, b) => (a.line ?? 0) - (b.line ?? 0) || (a.column ?? 0) - (b.column ?? 0));
  return { ok: false, problems };
}

type Path = (string | number)[];
type Fields = Record<string, unknown>;

const packFields = ["id", "technology", "level", "language", "title", "themes"];
const themeFields = ["name", "questions", "key_points", "resources"];
const resourceFields = ["title", "url"];

/** Walks the parsed YAML and collects every problem, so a contributor can fix them all at once. */
class PackChecker {
  readonly issues: { path: Path; message: string }[] = [];

  constructor(readonly expectedId: string) {}

  pack(data: unknown): Pack | undefined {
    if (data === null || data === undefined) {
      this.#report([], "The file is empty. Start from the example in CONTRIBUTING.md.");
      return undefined;
    }
    const fields = this.#fields(data, [], packFields);
    if (!fields) return undefined;

    const id = this.#text(fields, "id", []);
    if (id !== undefined && !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(id)) {
      this.#report(["id"], `must use only lowercase letters, digits and dashes, like "react-junior-en" (found "${id}").`);
    } else if (id !== undefined && id !== this.expectedId) {
      this.#report(["id"], `must be the same as the file name: rename the file to "${id}.yaml" or set the id to "${this.expectedId}".`);
    }
    const technology = this.#text(fields, "technology", []);
    const level = this.#oneOf(fields, "level", [], packLevels);
    const language = this.#oneOf(fields, "language", [], packLanguages);
    const title = this.#text(fields, "title", []);
    const themes = this.#list(fields, "themes", [], "theme", (item, path) => this.#theme(item, path));

    if (themes) {
      const seen = new Set<string>();
      themes.forEach((theme, index) => {
        if (!theme) return;
        if (seen.has(theme.name)) {
          this.#report(["themes", index, "name"], `"${theme.name}" is used by another theme: give each theme its own name.`);
        }
        seen.add(theme.name);
      });
    }

    if (!id || !technology || !level || !language || !title || !themes?.every((theme) => theme)) {
      return undefined;
    }
    return { id, technology, level, language, title, themes: themes as PackTheme[] };
  }

  #theme(data: unknown, path: Path): PackTheme | undefined {
    const fields = this.#fields(data, path, themeFields);
    if (!fields) return undefined;
    const name = this.#text(fields, "name", path);
    const questions = this.#textList(fields, "questions", path, "question");
    const keyPoints = this.#textList(fields, "key_points", path, "key point");
    const resources = this.#list(fields, "resources", path, "resource", (item, itemPath) => this.#resource(item, itemPath));
    if (!name || !questions || !keyPoints || !resources?.every((resource) => resource)) return undefined;
    return { name, questions, keyPoints, resources: resources as PackResource[] };
  }

  #resource(data: unknown, path: Path): PackResource | undefined {
    const fields = this.#fields(data, path, resourceFields);
    if (!fields) return undefined;
    const title = this.#text(fields, "title", path);
    const url = this.#text(fields, "url", path);
    if (url !== undefined && !isWebLink(url)) {
      this.#report([...path, "url"], `must be a web link starting with https:// (found "${url}").`);
      return undefined;
    }
    if (!title || !url) return undefined;
    return { title, url };
  }

  /** Checks that `data` is a set of fields, all of them known. */
  #fields(data: unknown, path: Path, known: string[]): Fields | undefined {
    if (typeof data !== "object" || data === null || Array.isArray(data)) {
      const subject = path.length === 0 ? "The file " : "";
      this.#report(path, `${subject}must be a set of fields (${known.map((name) => `${name}:`).join(", ")}), not ${describeValue(data)}.`);
      return undefined;
    }
    for (const name of Object.keys(data)) {
      if (known.includes(name)) continue;
      const suggestion = closest(name, known);
      this.#report(
        [...path, name],
        suggestion
          ? `is not a pack field. Did you mean "${suggestion}"?`
          : `is not a pack field. Allowed fields here: ${known.join(", ")}.`,
      );
    }
    return data as Fields;
  }

  #text(fields: Fields, name: string, path: Path): string | undefined {
    if (!(name in fields)) {
      this.#report([...path, name], "is missing.");
      return undefined;
    }
    return this.#textValue(fields[name], [...path, name]);
  }

  #textValue(value: unknown, path: Path): string | undefined {
    if (typeof value === "number" || typeof value === "boolean") return String(value);
    if (value === null || value === undefined) {
      this.#report(path, "is empty.");
      return undefined;
    }
    if (typeof value !== "string") {
      const hint =
        typeof value === "object" && value !== null && !Array.isArray(value)
          ? ' If the text contains ": " (a colon followed by a space), wrap it in double quotes.'
          : "";
      this.#report(path, `must be some text, not ${describeValue(value)}.${hint}`);
      return undefined;
    }
    const text = value.trim();
    if (text === "") {
      this.#report(path, "is empty.");
      return undefined;
    }
    return text;
  }

  #oneOf<T extends string>(fields: Fields, name: string, path: Path, allowed: readonly T[]): T | undefined {
    const value = this.#text(fields, name, path);
    if (value === undefined) return undefined;
    if (!(allowed as readonly string[]).includes(value)) {
      this.#report([...path, name], `must be one of ${allowed.join(", ")} (found "${value}").`);
      return undefined;
    }
    return value as T;
  }

  /** A list with at least one item. Each item is checked by `check`, which returns undefined when it's wrong. */
  #list<T>(
    fields: Fields,
    name: string,
    path: Path,
    itemName: string,
    check: (item: unknown, path: Path) => T | undefined,
  ): (T | undefined)[] | undefined {
    const listPath = [...path, name];
    if (!(name in fields)) {
      this.#report(listPath, `is missing. Add at least one ${itemName}.`);
      return undefined;
    }
    const value = fields[name];
    if (!Array.isArray(value)) {
      this.#report(listPath, `must be a list, with each ${itemName} on its own line starting with "- " (found ${describeValue(value)}).`);
      return undefined;
    }
    if (value.length === 0) {
      this.#report(listPath, `needs at least one ${itemName}.`);
      return undefined;
    }
    return value.map((item, index) => check(item, [...listPath, index]));
  }

  #textList(fields: Fields, name: string, path: Path, itemName: string): string[] | undefined {
    const items = this.#list(fields, name, path, itemName, (item, itemPath) => this.#textValue(item, itemPath));
    return items?.every((item) => item !== undefined) ? (items as string[]) : undefined;
  }

  #report(path: Path, message: string): void {
    this.issues.push({ path, message });
  }
}

/** Points at the deepest part of `path` that exists in the file: the field's key, or the list item. */
function locate(doc: Document, path: Path): number | undefined {
  let node: unknown = doc.contents;
  let position = isNode(node) ? node.range?.[0] : undefined;
  for (const segment of path) {
    if (isMap(node)) {
      const pair = node.items.find((item) => isNode(item.key) && "value" in item.key && item.key.value === segment);
      if (!pair) break;
      if (isNode(pair.key)) position = pair.key.range?.[0] ?? position;
      node = pair.value;
    } else if (isSeq(node) && typeof segment === "number") {
      const item = node.items[segment];
      if (!isNode(item)) break;
      position = item.range?.[0] ?? position;
      node = item;
    } else {
      break;
    }
  }
  return position;
}

/** `["themes", 1, "key_points"]` → `themes › theme 2 › key_points`. */
function describePath(path: Path): string {
  return path
    .map((segment, index) => {
      if (typeof segment === "string") return segment;
      const list = path[index - 1];
      const itemName = list === "themes" ? "theme" : list === "resources" ? "resource" : "item";
      return `${itemName} ${segment + 1}`;
    })
    .join(" › ");
}

function describeValue(value: unknown): string {
  if (value === null || value === undefined) return "nothing";
  if (Array.isArray(value)) return "a list";
  if (typeof value === "object") return "a set of fields";
  if (typeof value === "string") return `the text "${value}"`;
  return `${typeof value} ${String(value)}`;
}

function isWebLink(text: string): boolean {
  try {
    const { protocol } = new URL(text);
    return protocol === "https:" || protocol === "http:";
  } catch {
    return false;
  }
}

/** The known name a typo most likely meant, if any. */
function closest(name: string, known: string[]): string | undefined {
  const normalize = (text: string) => text.toLowerCase().replace(/[^a-z]/g, "");
  let best: { name: string; distance: number } | undefined;
  for (const candidate of known) {
    const distance = editDistance(normalize(name), normalize(candidate));
    if (distance <= 2 && (!best || distance < best.distance)) best = { name: candidate, distance };
  }
  return best?.name;
}

function editDistance(a: string, b: string): number {
  let previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i++) {
    const current = [i];
    for (let j = 1; j <= b.length; j++) {
      current[j] = Math.min(previous[j]! + 1, current[j - 1]! + 1, previous[j - 1]! + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    previous = current;
  }
  return previous[b.length]!;
}

/** YAML syntax errors, with a hint for the most common mistake. */
function yamlHint(message: string): string {
  const firstLine = (message.split("\n")[0] ?? message).replace(/[.:]\s*$/, "");
  return /mapping|implicit keys|indent/i.test(firstLine)
    ? `${firstLine}. Check the indentation (spaces, not tabs), and wrap text that contains ": " in double quotes.`
    : `${firstLine}.`;
}
