import { useEffect, useState, type FormEvent } from "react";
import type { InterviewRequest, Language, PackLevel, PackSummary, TechnologyMatch } from "../server/api-types";
import { sameTechnology } from "../server/packs/technology";
import { detectJobOffer, matchPacks } from "./api";
import { interviewTitle, languages, useI18n } from "./i18n";
import { PackPicker } from "./PackPicker";

interface InterviewSetupProps {
  packs: PackSummary[];
  starting: boolean;
  onStart: (request: InterviewRequest) => void;
}

const levels: readonly PackLevel[] = ["junior", "mid", "senior"];

/** The technologies and level from a job offer, as the candidate confirmed or edited them. */
interface Detection {
  technologies: string[];
  level: PackLevel;
}

/** The packs added to the interview, and those of them the job offer added (so they can go when it changes). */
interface Selection {
  ids: string[];
  matched: string[];
}

/**
 * Sets up an interview: its language, an optional job offer whose technologies
 * and level the candidate checks, and the packs. Packs matching the job offer
 * are added automatically; technologies no added pack covers are uncurated.
 */
export function InterviewSetup({ packs, starting, onStart }: InterviewSetupProps) {
  const { language, t } = useI18n();
  // Follows the interface language until the candidate picks one.
  const [pickedLanguage, setPickedLanguage] = useState<Language | null>(null);
  const interviewLanguage = pickedLanguage ?? language;

  const [jobOffer, setJobOffer] = useState("");
  const [detecting, setDetecting] = useState(false);
  const [detectError, setDetectError] = useState<string | null>(null);
  const [detection, setDetection] = useState<Detection | null>(null);
  // What the current matches were made for: technologies, level and interview language.
  const [matchedKey, setMatchedKey] = useState<string | null>(null);
  const [selection, setSelection] = useState<Selection>({ ids: [], matched: [] });

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
  const matchKey = detection ? JSON.stringify([detection.technologies, detection.level, interviewLanguage]) : null;
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

  async function detect(event: FormEvent) {
    event.preventDefault();
    if (jobOffer.trim() === "" || detecting) return;
    setDetectError(null);
    setDetecting(true);
    try {
      const result = await detectJobOffer(jobOffer, interviewLanguage);
      setDetection({ technologies: result.technologies, level: result.level });
      applyMatches(JSON.stringify([result.technologies, result.level, interviewLanguage]), result.matches);
    } catch (failure) {
      setDetectError(failure instanceof Error ? failure.message : String(failure));
    } finally {
      setDetecting(false);
    }
  }

  function forgetJobOffer() {
    setDetection(null);
    setMatchedKey(null);
    setDetectError(null);
    setSelection((current) => ({ ids: current.ids.filter((id) => !current.matched.includes(id)), matched: [] }));
  }

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
      <fieldset className="interview-language">
        <legend>{t.setup.interviewLanguage}</legend>
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
        <p className="field-hint">{t.setup.interviewLanguageHint}</p>
      </fieldset>

      <section className="job-offer" aria-labelledby="job-offer-title">
        <h2 id="job-offer-title">{t.setup.jobOfferTitle}</h2>
        <p className="field-hint">{t.setup.jobOfferHint}</p>
        <form onSubmit={detect}>
          <textarea
            value={jobOffer}
            onChange={(event) => setJobOffer(event.target.value)}
            placeholder={t.setup.jobOfferPlaceholder}
            aria-label={t.setup.jobOfferLabel}
            rows={5}
            disabled={detecting}
          />
          <div className="job-offer-actions">
            {detection && (
              <button type="button" className="link-button" onClick={forgetJobOffer}>
                {t.setup.forget}
              </button>
            )}
            <button type="submit" className="secondary-button" disabled={detecting || jobOffer.trim() === ""}>
              {detecting ? t.setup.detecting : t.setup.detect}
            </button>
          </div>
        </form>
        {detectError && (
          <p className="field-error" role="alert">
            {detectError}
          </p>
        )}

        {detection && (
          <DetectionEditor
            detection={detection}
            selectedPacks={selectedPacks}
            onChange={setDetection}
          />
        )}
      </section>

      <PackPicker
        packs={packs}
        selectedIds={selection.ids}
        onToggle={togglePack}
        interviewLanguage={interviewLanguage}
      />

      <section className="setup-summary" aria-labelledby="setup-summary-title">
        <div>
          <h2 id="setup-summary-title">{t.setup.summaryTitle}</h2>
          <p className="setup-summary-text" aria-live="polite">
            {nothingChosen
              ? t.setup.nothingChosen
              : `${interviewTitle({ packs: selectedPacks, uncurated }, t)} · ${t.languageNames[interviewLanguage]}`}
          </p>
        </div>
        <button type="button" disabled={starting || nothingChosen} onClick={start}>
          {starting ? t.setup.starting : t.setup.start}
        </button>
      </section>
    </div>
  );
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
    <div className="detection">
      <h3>{t.setup.detectedTitle}</h3>
      <p className="field-hint">{t.setup.detectedHint}</p>

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
    </div>
  );
}
