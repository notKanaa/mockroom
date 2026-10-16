import { useState } from "react";
import type { Language, PackLevel, PackSummary } from "../server/api-types";
import { languages, useI18n } from "./i18n";

interface PackPickerProps {
  packs: PackSummary[];
  starting: boolean;
  /** Starts an interview on the pack, held in `language`. */
  onStart: (packId: string, language: Language) => void;
}

const levels: readonly PackLevel[] = ["junior", "mid", "senior"];

interface Filters {
  technology: string;
  level: string;
  language: string;
}

const noFilters: Filters = { technology: "", level: "", language: "" };

/**
 * Lists the packs, filterable by technology, level and language. Each one starts
 * an interview, in the interview language picked above the list.
 */
export function PackPicker({ packs, starting, onStart }: PackPickerProps) {
  const { language, t } = useI18n();
  const [filters, setFilters] = useState<Filters>(noFilters);
  const [chosenId, setChosenId] = useState<string | null>(null);
  // Follows the interface language until the candidate picks one.
  const [pickedLanguage, setPickedLanguage] = useState<Language | null>(null);
  const interviewLanguage = pickedLanguage ?? language;

  const technologies = unique(packs.map((pack) => pack.technology)).sort((a, b) => a.localeCompare(b));
  const packLevels = levels.filter((level) => packs.some((pack) => pack.level === level));
  const packLanguages = languages.filter((candidate) => packs.some((pack) => pack.language === candidate));

  const shown = packs.filter(
    (pack) =>
      (!filters.technology || pack.technology === filters.technology) &&
      (!filters.level || pack.level === filters.level) &&
      (!filters.language || pack.language === filters.language),
  );
  const filtered = filters.technology !== "" || filters.level !== "" || filters.language !== "";

  if (packs.length === 0) {
    return (
      <p className="status status-unreachable" role="alert">
        {t.picker.noPacks}
      </p>
    );
  }

  function setFilter(name: keyof Filters, value: string) {
    setFilters((current) => ({ ...current, [name]: value }));
  }

  return (
    <section className="picker" aria-labelledby="picker-title">
      <h2 id="picker-title">{t.picker.title}</h2>

      <fieldset className="interview-language">
        <legend>{t.picker.interviewLanguage}</legend>
        <div className="language-choices">
          {languages.map((option) => (
            <label
              key={option}
              className={`language-choice${option === interviewLanguage ? " language-choice-current" : ""}`}
            >
              <input
                type="radio"
                name="interview-language"
                value={option}
                checked={option === interviewLanguage}
                onChange={() => setPickedLanguage(option)}
              />
              {t.languageNames[option]}
            </label>
          ))}
        </div>
        <p className="field-hint">{t.picker.interviewLanguageHint}</p>
      </fieldset>

      <div className="filters">
        <FilterSelect
          label={t.picker.technology}
          value={filters.technology}
          allLabel={t.picker.allTechnologies}
          options={technologies.map((technology) => ({ value: technology, label: technology }))}
          onChange={(value) => setFilter("technology", value)}
        />
        <FilterSelect
          label={t.picker.level}
          value={filters.level}
          allLabel={t.picker.allLevels}
          options={packLevels.map((level) => ({ value: level, label: t.levels[level] }))}
          onChange={(value) => setFilter("level", value)}
        />
        <FilterSelect
          label={t.picker.packLanguage}
          value={filters.language}
          allLabel={t.picker.allLanguages}
          options={packLanguages.map((option) => ({ value: option, label: t.languageNames[option] }))}
          onChange={(value) => setFilter("language", value)}
        />
      </div>

      <p className="picker-count" aria-live="polite">
        {shown.length === 0 ? t.picker.noMatch : t.picker.count(shown.length)}
        {filtered && (
          <button type="button" className="link-button" onClick={() => setFilters(noFilters)}>
            {t.picker.clearFilters}
          </button>
        )}
      </p>

      <ul className="packs">
        {shown.map((pack) => (
          <li key={pack.id} className="pack">
            <div className="pack-info">
              <p className="pack-title">{pack.title}</p>
              <p className="pack-meta">
                {pack.technology} · {t.levels[pack.level]} · {t.languageNames[pack.language]}
                {pack.language !== interviewLanguage && (
                  <span className="pack-translated"> · {t.picker.translated(t.languageNames[interviewLanguage])}</span>
                )}
              </p>
              <p className="pack-themes">{pack.themes.join(" · ")}</p>
            </div>
            <button
              type="button"
              disabled={starting}
              onClick={() => {
                setChosenId(pack.id);
                onStart(pack.id, interviewLanguage);
              }}
            >
              {starting && chosenId === pack.id ? t.picker.starting : t.picker.start}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

interface FilterSelectProps {
  label: string;
  value: string;
  allLabel: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}

function FilterSelect({ label, value, allLabel, options, onChange }: FilterSelectProps) {
  return (
    <label className="filter">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">{allLabel}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}
