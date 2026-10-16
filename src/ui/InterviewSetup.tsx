import { useEffect, useState, type FormEvent } from "react";
import type { InterviewRequest, Language, PackLevel, PackSummary, TechnologyMatch } from "../server/api-types";
import { sameTechnology } from "../server/packs/technology";
import { matchPacks } from "./api";
import { LanguagePicker } from "./Home";
import { interviewTitle, useI18n } from "./i18n";
import { PackPicker } from "./PackPicker";

interface InterviewSetupProps {
  packs: PackSummary[];
  /** What the job offer asks for, or null when the candidate picks packs by hand. */
  initialDetection: Detection | null;
  /** The packs matching the job offer when it was read. */
  initialIds: string[];
  interviewLanguage: Language;
  onLanguageChange: (language: Language) => void;
  starting: boolean;
  onStart: (request: InterviewRequest) => void;
  onBack: () => void;
}

const levels: readonly PackLevel[] = ["junior", "mid", "senior"];

/** The technologies and level from a job offer, as the candidate confirmed or edited them. */
export interface Detection {
  technologies: string[];
  level: PackLevel;
}

/** The packs added to the interview, and those of them the job offer added (so they can go when it changes). */
interface Selection {
  ids: string[];
  matched: string[];
}

/**
 * Checks an interview before it starts: the technologies and level read from a
 * job offer, which the candidate can edit, and the packs. Packs matching the job
 * offer are added automatically; technologies no added pack covers are uncurated.
 * Without a job offer, the candidate combines packs by hand here.
 */
export function InterviewSetup({
  packs,
  initialDetection,
  initialIds,
  interviewLanguage,
  onLanguageChange,
  starting,
  onStart,
  onBack,
}: InterviewSetupProps) {
  const { t } = useI18n();
  const [detection, setDetection] = useState<Detection | null>(initialDetection);
  // What the current matches were made for: technologies, level and interview language.
  const [matchedKey, setMatchedKey] = useState<string | null>(
    initialDetection && keyOf(initialDetection, interviewLanguage),
  );
  const [selection, setSelection] = useState<Selection>({ ids: initialIds, matched: initialIds });
  const [showPicker, setShowPicker] = useState(initialDetection === null);

  const selectedPacks = selection.ids
    .map((id) => packs.find((pack) => pack.id === id))
    .filter((pack): pack is PackSummary => pack !== undefined);
  const uncurated = (detection?.technologies ?? []).filter(
    (technology) => !selectedPacks.some((pack) => sameTechnology(pack.technology, technology)),
  );

  /** Adds the packs that now match, and removes the ones the job offer had added but no longer match. */
  function applyMatches(key: string, next: TechnologyMatch[]) {
    setMatchedKey(key);
    const matched = [...new Set(next.flatMap((match) => (match.packId ? [match.packId] : [])))];
    setSelection((current) => {
      const dropped = current.matched.filter((id) => !matched.includes(id));
      const kept = current.ids.filter((id) => !dropped.includes(id));
      const added = matched.filter((id) => !current.matched.includes(id) && !kept.includes(id));
      return { ids: [...kept, ...added], matched };
    });
  }

  // Matches the packs again whenever the candidate edits the detection or changes the interview language.
  const matchKey = detection ? keyOf(detection, interviewLanguage) : null;
  useEffect(() => {
    if (!detection || matchKey === null || matchedKey === matchKey) return;
    let current = true;
    matchPacks(detection.technologies, detection.level, interviewLanguage)
      .then((result) => {
        if (current) applyMatches(matchKey, result.matches);
      })
      .catch(() => {
        // Matching is local and cheap; if the server is gone, starting will say so.
      });
    return () => {
      current = false;
    };
  }, [matchKey]);

  function togglePack(packId: string) {
    setSelection((current) =>
      current.ids.includes(packId)
        ? { ids: current.ids.filter((id) => id !== packId), matched: current.matched }
        : { ids: [...current.ids, packId], matched: current.matched },
    );
  }

  const nothingChosen = selection.ids.length === 0 && (detection?.technologies.length ?? 0) === 0;

  function start() {
    onStart({
      packIds: selection.ids,
      ...(detection && { technologies: detection.technologies, level: detection.level }),
      language: interviewLanguage,
    });
  }

  return (
    <div className="setup">
      <header className="page-header">
        <button type="button" className="link-button back-link" onClick={onBack}>
          {detection ? t.review.back : t.review.backHome}
        </button>
        <h1>{detection ? t.review.title : t.review.buildTitle}</h1>
        <p className="page-intro">{detection ? t.setup.detectedHint : t.review.buildHint}</p>
      </header>

      {detection && <DetectionEditor detection={detection} selectedPacks={selectedPacks} onChange={setDetection} />}

      <section className="card" aria-labelledby="setup-packs-title">
        <h2 id="setup-packs-title" className="card-title">
          {t.review.packsTitle}
        </h2>
        {selectedPacks.length === 0 ? (
          <p className="field-hint">{t.review.noPacks}</p>
        ) : (
          <ul className="chips">
            {selectedPacks.map((pack) => (
              <li key={pack.id} className="chip chip-static">
                {pack.title}
                <button
                  type="button"
                  className="chip-remove"
                  aria-label={t.review.removePack(pack.title)}
                  title={t.review.removePack(pack.title)}
                  onClick={() => togglePack(pack.id)}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
        <button
          type="button"
          className="link-button disclosure"
          aria-expanded={showPicker}
          aria-controls="setup-picker"
          onClick={() => setShowPicker((shown) => !shown)}
        >
          {showPicker ? t.review.hidePacks : t.review.addPacks}
        </button>
        {showPicker && (
          <div id="setup-picker">
            <PackPicker
              packs={packs}
              selectedIds={selection.ids}
              onToggle={togglePack}
              interviewLanguage={interviewLanguage}
            />
          </div>
        )}
      </section>

      <section className="setup-summary" aria-labelledby="setup-summary-title">
        <div className="setup-summary-text">
          <h2 id="setup-summary-title" className="eyebrow">
            {t.setup.summaryTitle}
          </h2>
          <p aria-live="polite">
            {nothingChosen ? t.setup.nothingChosen : interviewTitle({ packs: selectedPacks, uncurated }, t)}
          </p>
        </div>
        <LanguagePicker value={interviewLanguage} onChange={onLanguageChange} />
        <button type="button" className="primary-button" disabled={starting || nothingChosen} onClick={start}>
          {starting ? t.setup.starting : t.setup.start}
        </button>
      </section>
    </div>
  );
}

function keyOf(detection: Detection, language: Language): string {
  return JSON.stringify([detection.technologies, detection.level, language]);
}

interface DetectionEditorProps {
  detection: Detection;
  selectedPacks: PackSummary[];
  onChange: (detection: Detection) => void;
}

/** The detected technologies and level, which the candidate can correct, with the pack covering each technology. */
function DetectionEditor({ detection, selectedPacks, onChange }: DetectionEditorProps) {
  const { t } = useI18n();
  const [newTechnology, setNewTechnology] = useState("");

  function add(event: FormEvent) {
    event.preventDefault();
    const name = newTechnology.trim();
    if (name === "") return;
    if (!detection.technologies.some((known) => sameTechnology(known, name))) {
      onChange({ ...detection, technologies: [...detection.technologies, name] });
    }
    setNewTechnology("");
  }

  function remove(technology: string) {
    onChange({ ...detection, technologies: detection.technologies.filter((known) => known !== technology) });
  }

  const anyUncurated = detection.technologies.some(
    (technology) => !selectedPacks.some((pack) => sameTechnology(pack.technology, technology)),
  );

  return (
    <section className="card detection" aria-labelledby="detection-title">
      <h2 id="detection-title" className="card-title">
        {t.setup.detectedTitle}
      </h2>

      <p className="detection-label">{t.setup.technologies}</p>
      {detection.technologies.length === 0 ? (
        <p className="field-hint">{t.setup.noTechnology}</p>
      ) : (
        <ul className="technologies">
          {detection.technologies.map((technology) => {
            const covering = selectedPacks.filter((pack) => sameTechnology(pack.technology, technology));
            return (
              <li key={technology} className={covering.length > 0 ? "technology" : "technology technology-uncurated"}>
                <span className="technology-name">{technology}</span>
                {covering.length > 0 ? (
                  <span className="technology-pack">
                    {t.setup.coveredBy(covering.map((pack) => pack.title).join(", "))}
                  </span>
                ) : (
                  <span className="uncurated-badge">{t.common.uncurated}</span>
                )}
                <button
                  type="button"
                  className="technology-remove"
                  aria-label={t.setup.remove(technology)}
                  title={t.setup.remove(technology)}
                  onClick={() => remove(technology)}
                >
                  ×
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {anyUncurated && <p className="field-hint">{t.setup.uncuratedHint}</p>}

      <form className="field-row technology-add" onSubmit={add}>
        <input
          value={newTechnology}
          onChange={(event) => setNewTechnology(event.target.value)}
          placeholder={t.setup.addPlaceholder}
          aria-label={t.setup.addTechnology}
          maxLength={40}
        />
        <button type="submit" className="secondary-button" disabled={newTechnology.trim() === ""}>
          {t.setup.add}
        </button>
      </form>

      <label className="field detection-level">
        <span className="detection-label">{t.setup.level}</span>
        <select
          value={detection.level}
          onChange={(event) => onChange({ ...detection, level: event.target.value as PackLevel })}
        >
          {levels.map((level) => (
            <option key={level} value={level}>
              {t.levels[level]}
            </option>
          ))}
        </select>
      </label>
      <p className="field-hint">{t.setup.levelHint}</p>
    </section>
  );
}
