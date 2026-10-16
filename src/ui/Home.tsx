import { useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import type { InterviewRequest, Language, PackSummary } from "../server/api-types";
import { detectJobOffer } from "./api";
import { languages, useI18n } from "./i18n";
import { ArrowUpIcon } from "./Icons";
import { InterviewSetup, type Detection } from "./InterviewSetup";
import { useAutoGrow } from "./useAutoGrow";

interface HomeProps {
  /** The packs, or null while they load. */
  packs: PackSummary[] | null;
  loadError: string | null;
  starting: boolean;
  /** Why the last interview couldn't start. */
  error: string | null;
  onStart: (request: InterviewRequest) => void;
  onOpenSettings: () => void;
}

/** What the candidate is checking before starting: a job offer's detection, or packs picked by hand. */
interface Review {
  detection: Detection | null;
  matchedIds: string[];
}

/**
 * Where an interview starts: a big box for a job offer or a role description,
 * with a chip per pack below to start right away.
 */
export function Home({ packs, loadError, starting, error, onStart, onOpenSettings }: HomeProps) {
  const { language, t } = useI18n();
  // Follows the interface language until the candidate picks one.
  const [pickedLanguage, setPickedLanguage] = useState<Language | null>(null);
  const interviewLanguage = pickedLanguage ?? language;

  const [jobOffer, setJobOffer] = useState("");
  const [detecting, setDetecting] = useState(false);
  const [detectError, setDetectError] = useState<string | null>(null);
  const [review, setReview] = useState<Review | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  useAutoGrow(inputRef, jobOffer);

  async function detect(event?: FormEvent) {
    event?.preventDefault();
    if (jobOffer.trim() === "" || detecting) return;
    setDetectError(null);
    setDetecting(true);
    try {
      const result = await detectJobOffer(jobOffer, interviewLanguage);
      setReview({
        detection: { technologies: result.technologies, level: result.level },
        matchedIds: [...new Set(result.matches.flatMap((match) => (match.packId ? [match.packId] : [])))],
      });
    } catch (failure) {
      setDetectError(failure instanceof Error ? failure.message : String(failure));
    } finally {
      setDetecting(false);
    }
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      void detect();
    }
  }

  const startError = error && (
    <p className="banner banner-error" role="alert">
      {error}{" "}
      <button type="button" className="link-button" onClick={onOpenSettings}>
        {t.common.openSettings}
      </button>
    </p>
  );

  if (review && packs) {
    return (
      <main className="page">
        {startError}
        <InterviewSetup
          packs={packs}
          initialDetection={review.detection}
          initialIds={review.matchedIds}
          interviewLanguage={interviewLanguage}
          onLanguageChange={setPickedLanguage}
          starting={starting}
          onStart={onStart}
          onBack={() => setReview(null)}
        />
      </main>
    );
  }

  return (
    <main className="home">
      <div className="home-center">
        <h1 className="home-heading">{t.home.heading}</h1>
        <p className="home-tagline">{t.home.tagline}</p>

        <form className="prompt" onSubmit={detect} aria-busy={detecting}>
          <textarea
            ref={inputRef}
            value={jobOffer}
            onChange={(event) => setJobOffer(event.target.value)}
            onKeyDown={onKeyDown}
            placeholder={t.home.placeholder}
            aria-label={t.home.inputLabel}
            aria-describedby="prompt-hint"
            rows={3}
            disabled={detecting}
          />
          <div className="prompt-bar">
            <LanguagePicker value={interviewLanguage} onChange={setPickedLanguage} />
            <button
              type="submit"
              className="send-button"
              disabled={detecting || jobOffer.trim() === ""}
              aria-label={t.home.submit}
              title={t.home.submit}
            >
              <ArrowUpIcon />
            </button>
          </div>
        </form>
        <p id="prompt-hint" className="prompt-hint" aria-live="polite">
          {detecting ? t.setup.detecting : t.home.inputHint}
        </p>

        {detectError && (
          <p className="banner banner-error" role="alert">
            {detectError} {t.setup.pickByHand}
          </p>
        )}
        {startError}
        {loadError && (
          <p className="banner banner-error" role="alert">
            {loadError}
          </p>
        )}
        {!packs && !loadError && <p className="prompt-hint">{t.home.connecting}</p>}

        {packs && (
          <PackChips
            packs={packs}
            interviewLanguage={interviewLanguage}
            disabled={starting || detecting}
            onPick={(pack) => onStart({ packIds: [pack.id], language: interviewLanguage })}
            onCombine={() => setReview({ detection: null, matchedIds: [] })}
          />
        )}
      </div>
    </main>
  );
}

interface PackChipsProps {
  packs: PackSummary[];
  interviewLanguage: Language;
  disabled: boolean;
  onPick: (pack: PackSummary) => void;
  onCombine: () => void;
}

/** One chip per technology and level, starting an interview on its pack in one click. */
function PackChips({ packs, interviewLanguage, disabled, onPick, onCombine }: PackChipsProps) {
  const { t } = useI18n();
  if (packs.length === 0) {
    return (
      <p className="banner banner-error" role="alert">
        {t.picker.noPacks}
      </p>
    );
  }

  // The same technology and level can exist in several languages: the chip uses the interview's if it can.
  const chips = new Map<string, PackSummary>();
  for (const pack of packs) {
    const key = `${pack.technology.toLowerCase()}|${pack.level}`;
    const known = chips.get(key);
    if (!known || (known.language !== interviewLanguage && pack.language === interviewLanguage)) chips.set(key, pack);
  }
  const levelOrder = ["junior", "mid", "senior"];
  const sorted = [...chips.values()].sort(
    (a, b) => a.technology.localeCompare(b.technology) || levelOrder.indexOf(a.level) - levelOrder.indexOf(b.level),
  );

  return (
    <section className="chips-section" aria-labelledby="chips-title">
      <h2 id="chips-title" className="eyebrow">
        {t.home.orPick}
      </h2>
      <ul className="chips">
        {sorted.map((pack) => {
          const label = `${pack.technology} · ${t.levels[pack.level]}`;
          return (
            <li key={pack.id}>
              <button
                type="button"
                className="chip"
                disabled={disabled}
                aria-label={t.home.chipLabel(label)}
                onClick={() => onPick(pack)}
              >
                {label}
              </button>
            </li>
          );
        })}
        <li>
          <button type="button" className="chip chip-ghost" disabled={disabled} onClick={onCombine}>
            {t.home.combine}
          </button>
        </li>
      </ul>
    </section>
  );
}

/** The interview language, as a small two-way switch. */
export function LanguagePicker({ value, onChange }: { value: Language; onChange: (language: Language) => void }) {
  const { t } = useI18n();
  return (
    <div className="language-picker" title={t.setup.interviewLanguageHint}>
      <span className="language-picker-label" id="interview-language-label">
        {t.home.interviewIn}
      </span>
      <div className="segmented segmented-text" role="group" aria-labelledby="interview-language-label">
        {languages.map((option) => (
          <button
            key={option}
            type="button"
            className="segmented-option"
            aria-pressed={option === value}
            onClick={() => onChange(option)}
          >
            {t.languageNames[option]}
          </button>
        ))}
      </div>
    </div>
  );
}
