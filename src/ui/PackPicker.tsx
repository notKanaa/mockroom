import { useState } from "react";
import type { PackLanguage, PackLevel, PackSummary } from "../server/api-types";

const levelLabels: Record<PackLevel, string> = { junior: "Junior", mid: "Mid-level", senior: "Senior" };
const languageLabels: Record<PackLanguage, string> = { en: "English", fr: "French" };

interface PackPickerProps {
  packs: PackSummary[];
  starting: boolean;
  onStart: (packId: string) => void;
}

interface Filters {
  technology: string;
  level: string;
  language: string;
}

const noFilters: Filters = { technology: "", level: "", language: "" };

/** Lists the packs, filterable by technology, level and language. Each one starts an interview. */
export function PackPicker({ packs, starting, onStart }: PackPickerProps) {
  const [filters, setFilters] = useState<Filters>(noFilters);
  const [chosenId, setChosenId] = useState<string | null>(null);

  const technologies = unique(packs.map((pack) => pack.technology)).sort((a, b) => a.localeCompare(b));
  const levels = (Object.keys(levelLabels) as PackLevel[]).filter((level) => packs.some((pack) => pack.level === level));
  const languages = (Object.keys(languageLabels) as PackLanguage[]).filter((language) =>
    packs.some((pack) => pack.language === language),
  );

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
        No interview pack is available. The terminal running Mockroom lists the packs it couldn't load.
      </p>
    );
  }

  function setFilter(name: keyof Filters, value: string) {
    setFilters((current) => ({ ...current, [name]: value }));
  }

  return (
    <section className="picker" aria-labelledby="picker-title">
      <h2 id="picker-title">Choose an interview pack</h2>

      <div className="filters">
        <FilterSelect
          label="Technology"
          value={filters.technology}
          allLabel="All technologies"
          options={technologies.map((technology) => ({ value: technology, label: technology }))}
          onChange={(value) => setFilter("technology", value)}
        />
        <FilterSelect
          label="Level"
          value={filters.level}
          allLabel="All levels"
          options={levels.map((level) => ({ value: level, label: levelLabels[level] }))}
          onChange={(value) => setFilter("level", value)}
        />
        <FilterSelect
          label="Language"
          value={filters.language}
          allLabel="All languages"
          options={languages.map((language) => ({ value: language, label: languageLabels[language] }))}
          onChange={(value) => setFilter("language", value)}
        />
      </div>

      <p className="picker-count" aria-live="polite">
        {shown.length === 0
          ? "No pack matches these filters."
          : `${shown.length} pack${shown.length > 1 ? "s" : ""}`}
        {filtered && (
          <button type="button" className="link-button" onClick={() => setFilters(noFilters)}>
            Clear filters
          </button>
        )}
      </p>

      <ul className="packs">
        {shown.map((pack) => (
          <li key={pack.id} className="pack">
            <div className="pack-info">
              <p className="pack-title">{pack.title}</p>
              <p className="pack-meta">
                {pack.technology} · {levelLabels[pack.level]} · {languageLabels[pack.language]}
              </p>
              <p className="pack-themes">{pack.themes.join(" · ")}</p>
            </div>
            <button
              type="button"
              disabled={starting}
              onClick={() => {
                setChosenId(pack.id);
                onStart(pack.id);
              }}
            >
              {starting && chosenId === pack.id ? "Starting…" : "Start interview"}
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
