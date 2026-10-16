import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Language } from "../server/api-types";
import { uiMessages, type UIMessages } from "./messages";

export const languages: readonly Language[] = ["en", "fr"];

const storageKey = "mockroom.language";

/** The interface language, for code outside React (the API client sends it to the server). */
let current: Language = initialLanguage();

export function currentLanguage(): Language {
  return current;
}

/** The current language's texts, outside React. */
export function currentMessages(): UIMessages {
  return uiMessages[current];
}

interface I18n {
  language: Language;
  t: UIMessages;
  setLanguage: (language: Language) => void;
}

const I18nContext = createContext<I18n | null>(null);

/** Holds the interface language: the one picked last time, else the browser's. */
export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(current);
  const setLanguage = (next: Language) => {
    current = next;
    setLanguageState(next);
  };

  useEffect(() => {
    current = language;
    document.documentElement.lang = language;
    try {
      localStorage.setItem(storageKey, language);
    } catch {
      // Storage can be off (private window): the choice then lasts until the page closes.
    }
  }, [language]);

  return (
    <I18nContext.Provider value={{ language, t: uiMessages[language], setLanguage }}>{children}</I18nContext.Provider>
  );
}

/** The interface language and its texts. */
export function useI18n(): I18n {
  const i18n = useContext(I18nContext);
  if (!i18n) throw new Error("useI18n needs an I18nProvider.");
  return i18n;
}

/** The switch between English and French for the interface. */
export function LanguageSwitch() {
  const { language, t, setLanguage } = useI18n();
  return (
    <div className="segmented segmented-text" role="group" aria-label={t.switcher.label}>
      {languages.map((option) => (
        <button
          key={option}
          type="button"
          lang={option}
          className="segmented-option"
          aria-pressed={option === language}
          title={uiMessages[option].languageNames[option]}
          onClick={() => setLanguage(option)}
        >
          {option.toUpperCase()}
        </button>
      ))}
    </div>
  );
}

/** A text where parts between backticks are shown as code. */
export function RichText({ text }: { text: string }) {
  return (
    <>
      {text.split("`").map((part, index) => (index % 2 === 1 ? <code key={index}>{part}</code> : part))}
    </>
  );
}

/** A date and time in the interface language, e.g. "15 Oct 2026, 09:30". */
export function formatDateTime(iso: string, language: Language): string {
  return new Date(iso).toLocaleString(language, { dateStyle: "medium", timeStyle: "short" });
}

/** An interview's name: its packs, then its uncurated technologies, e.g. "React — Junior + Go (uncurated)". */
export function interviewTitle(
  { packs, uncurated = [] }: { packs: { title: string }[]; uncurated?: string[] },
  t: UIMessages,
): string {
  return [...packs.map((pack) => pack.title), ...uncurated.map((technology) => t.common.uncuratedTitle(technology))].join(" + ");
}

function initialLanguage(): Language {
  try {
    const saved = localStorage.getItem(storageKey);
    if (saved === "en" || saved === "fr") return saved;
  } catch {
    // No storage: fall back on the browser's language.
  }
  for (const tag of navigator.languages ?? [navigator.language]) {
    const language = tag.toLowerCase().split("-")[0];
    if (language === "en" || language === "fr") return language;
  }
  return "en";
}
