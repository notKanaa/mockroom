import { useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import type { InterviewRequest, Language, PackSummary } from "../server/api-types";
import { detectJobOffer } from "./api";
import { languages, useI18n } from "./i18n";
import { ArrowUpIcon, PlusIcon } from "./Icons";
import { InterviewSetup, type Detection } from "./InterviewSetup";
import { Banner, Dropdown, IconButton, Spinner, Thinking } from "./kit";
import { ModelPicker } from "./ModelPicker";
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
    <Banner tone="error">
      {error}{" "}
      <button type="button" className="ui-link" onClick={onOpenSettings}>
        {t.common.openSettings}
      </button>
    </Banner>
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
            <ModelPicker onOpenSettings={onOpenSettings} />
            <LanguagePicker value={interviewLanguage} onChange={setPickedLanguage} />
            {detecting && (
              <span className="prompt-status">
                <Thinking label={t.setup.detecting} />
              </span>
            )}
            <IconButton
              type="submit"
              variant="primary"
              label={t.home.submit}
              icon={<ArrowUpIcon />}
              disabled={detecting || jobOffer.trim() === ""}
            />
          </div>
          <span id="prompt-hint" className="visually-hidden">
            {t.home.inputHint}
          </span>
        </form>

        <div className="home-messages">
          {detectError && (
            <Banner tone="error">
              {detectError} {t.setup.pickByHand}
            </Banner>
          )}
          {startError}
          {loadError && <Banner tone="error">{loadError}</Banner>}
          {!packs && !loadError && <p className="home-status">{t.home.connecting}</p>}
        </div>

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
  // The chip that was clicked, to show it is starting.
  const [pickedId, setPickedId] = useState<string | null>(null);
  if (packs.length === 0) return <Banner tone="error">{t.picker.noPacks}</Banner>;

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
      <h2 id="chips-title" className="chips-title">
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
                aria-busy={disabled && pickedId === pack.id ? true : undefined}
                onClick={() => {
                  setPickedId(pack.id);
                  onPick(pack);
                }}
              >
                {disabled && pickedId === pack.id && <Spinner />}
                {label}
              </button>
            </li>
          );
        })}
        <li>
          <button type="button" className="chip chip-quiet" disabled={disabled} onClick={onCombine}>
            <PlusIcon />
            {t.home.combine}
          </button>
        </li>
      </ul>
    </section>
  );
}

/** The interview language, as a compact drop-down after a short label. */
export function LanguagePicker({
  value,
  onChange,
  placement,
}: {
  value: Language;
  onChange: (language: Language) => void;
  placement?: "down" | "up";
}) {
  const { t } = useI18n();
  return (
    <span className="language-picker" title={t.setup.interviewLanguageHint}>
      <span aria-hidden="true">{t.home.interviewIn}</span>
      <Dropdown
        label={t.setup.interviewLanguage}
        value={value}
        onChange={onChange}
        placement={placement}
        options={languages.map((option) => ({ value: option, label: t.languageNames[option] }))}
      />
    </span>
  );
}
