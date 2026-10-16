import { useState } from "react";
import type { Language, PackLevel, PackSummary } from "../server/api-types";
import { languages, useI18n } from "./i18n";
import { Banner, Button } from "./kit";

interface PackPickerProps {
  packs: PackSummary[];
  /** The packs added to the interview. */
  selectedIds: string[];
  onToggle: (packId: string) => void;
  /** The interview language, to flag packs that will be translated. */
  interviewLanguage: Language;
}

const levels: readonly PackLevel[] = ["junior", "mid", "senior"];

interface Filters {
  technology: string;
  level: string;
  language: string;
}

const noFilters: Filters = { technology: "", level: "", language: "" };

/** Lists the packs, filterable by technology, level and language. Each one can be added to the interview. */
export function PackPicker({ packs, selectedIds, onToggle, interviewLanguage }: PackPickerProps) {
  const { t } = useI18n();
  const [filters, setFilters] = useState<Filters>(noFilters);

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
      <Banner tone="error">{t.picker.noPacks}</Banner>
    );
  }

  function setFilter(name: keyof Filters, value: string) {
    setFilters((current) => ({ ...current, [name]: value }));
  }

  return (
    <section className="picker" aria-label={t.picker.title}>

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
          <button type="button" className="ui-link" onClick={() => setFilters(noFilters)}>
            {t.picker.clearFilters}
          </button>
        )}
      </p>

      <ul className="packs">
        {shown.map((pack) => {
          const selected = selectedIds.includes(pack.id);
          return (
            <li key={pack.id} className={selected ? "pack pack-selected" : "pack"}>
              <div className="pack-info">
                <p className="pack-title">{pack.title}</p>
                <p className="pack-meta">
                  {pack.technology} · {t.levels[pack.level]} · {t.languageNames[pack.language]}
                  {pack.language !== interviewLanguage && (
                    <span className="pack-translated">
                      {" "}
                      · {t.picker.translated(t.languageNames[interviewLanguage])}
                    </span>
                  )}
                </p>
                <p className="pack-themes">{pack.themes.join(" · ")}</p>
              </div>
              <Button
                size="sm"
                variant={selected ? "primary" : "secondary"}
                aria-pressed={selected}
                aria-label={t.picker.addLabel(pack.title)}
                onClick={() => onToggle(pack.id)}
              >
                {selected ? t.picker.added : t.picker.add}
              </Button>
            </li>
          );
        })}
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
