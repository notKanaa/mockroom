import { packLanguages, type PackLanguage } from "./packs/pack.js";

/** A language Mockroom speaks, for its interface and for interviews: the languages packs can be written in. */
export type Language = PackLanguage;
export const languages = packLanguages;

export function isLanguage(value: unknown): value is Language {
  return typeof value === "string" && (languages as readonly string[]).includes(value);
}

/** A text the candidate may see, written in every language. */
export type Text = (language: Language) => string;

/**
 * An error whose message is shown to the candidate, in their language. Its
 * `message` is the English text, for logs.
 */
export class LocalizedError extends Error {
  constructor(
    readonly text: Text,
    options?: ErrorOptions,
  ) {
    super(text("en"), options);
  }
}

/** An error's message in `language`. Errors Mockroom didn't write keep their own message. */
export function localizedMessage(error: unknown, language: Language): string {
  if (error instanceof LocalizedError) return error.text(language);
  return error instanceof Error ? error.message : String(error);
}

/**
 * The language to answer in, from an `Accept-Language` header: the UI sends its
 * own language there. English when the header names neither English nor French.
 */
export function languageFromHeader(header: string | undefined): Language {
  const ranked = (header ?? "")
    .split(",")
    .map((part, index) => {
      const [tag = "", ...params] = part.trim().split(";");
      const q = params.map((param) => /^\s*q=([\d.]+)\s*$/.exec(param)?.[1]).find((value) => value !== undefined);
      return { language: tag.trim().toLowerCase().split("-")[0], quality: q === undefined ? 1 : Number(q), index };
    })
    .filter(({ quality }) => quality > 0)
    .sort((a, b) => b.quality - a.quality || a.index - b.index);
  return ranked.map(({ language }) => language).find(isLanguage) ?? "en";
}
