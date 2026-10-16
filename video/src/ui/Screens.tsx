// Mockroom's screens, as still frames the video animates. They are built from the
// app's own components (kit.tsx, Recruiter.tsx, Icons.tsx) and markup, with the
// app's classes, so they look exactly like the app. What the app animates on the
// wall clock (streaming text, the thinking shimmer, screens arriving) is passed in
// as props, so every frame is reproducible.

import type { CSSProperties } from "react";
import { ArrowUpIcon, PlusIcon } from "../../../src/ui/Icons";
import { Button, Card, Hint, IconButton, PageHeader } from "../../../src/ui/kit";
import { Avatar, RecruiterBadge, type Recruiter } from "../../../src/ui/Recruiter";
import type { LocaleContent } from "../content/locales";
import { rise } from "../lib/motion";

type Content = Pick<LocaleContent, "ui" | "sample">;

const Chevron = () => (
  <svg className="icon" viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
    <path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

/** The AI model drop-down of the prompt and answer boxes (ModelPicker), closed. */
function ModelButton({ model }: { model: string }) {
  return (
    <span className="model-picker">
      <span className="ui-dropdown">
        <button type="button" className="ui-dropdown-button">
          <span className="ui-dropdown-value">{model}</span>
          <Chevron />
        </button>
      </span>
    </span>
  );
}

/** The interview language (LanguagePicker in Home.tsx), closed. */
function LanguageButton({ content }: { content: Content }) {
  return (
    <span className="language-picker">
      <span>{content.ui.home.interviewIn}</span>
      <span className="ui-dropdown">
        <button type="button" className="ui-dropdown-button">
          <span className="ui-dropdown-value">{interviewLanguageName(content)}</span>
          <Chevron />
        </button>
      </span>
    </span>
  );
}

/** The interview's language, which is the film's: English in the English cut, French in the French one. */
export function interviewLanguageName(content: Content): string {
  return content.ui.languageNames.en === "English" ? content.ui.languageNames.en : content.ui.languageNames.fr;
}

/** The app's "Alex is thinking…" label, its shimmer set by the video (0 → 1 is one sweep). */
function Thinking({ label, shimmer }: { label: string; shimmer: number }) {
  return (
    <span className="ui-thinking">
      <span className="ui-thinking-label" style={{ "--shimmer": `${100 - (shimmer % 1) * 100}%` } as CSSProperties}>
        {label}
      </span>
    </span>
  );
}

function Caret({ on }: { on: boolean }) {
  return on ? <span className="mr-caret" /> : null;
}

const pressed = (amount: number): CSSProperties => ({ transform: `scale(${1 - 0.06 * amount})` });

// Home

export interface HomeState {
  /** 0 → 1 for the heading, the tagline, the box and the chips, as the app's staggered `rise`. */
  enter: [number, number, number, number];
  text: string;
  focused: boolean;
  caret: boolean;
  /** 0 → 1: the pasted text's selection highlight, fading. */
  pasteFlash: number;
  detecting: boolean;
  shimmer: number;
  pressSend: number;
  /** Words of the text to mark, each anchored as `term-<index>`, and how far each marker has swept (0 → 1). */
  terms?: string[];
  marks?: number[];
  /** 0 → 1: a reading band sweeping down the text, or undefined when there is none. */
  scan?: number;
}

/** Splits a text around the first occurrence of each term, in reading order. */
function splitTerms(text: string, terms: string[]): { text: string; term?: number }[] {
  const found = terms
    .map((term, index) => ({ index, at: text.indexOf(term), term }))
    .filter((match) => match.at >= 0)
    .sort((left, right) => left.at - right.at);
  const parts: { text: string; term?: number }[] = [];
  let cursor = 0;
  for (const match of found) {
    if (match.at < cursor) continue;
    parts.push({ text: text.slice(cursor, match.at) });
    parts.push({ text: match.term, term: match.index });
    cursor = match.at + match.term.length;
  }
  parts.push({ text: text.slice(cursor) });
  return parts;
}

export function HomeScreen({ content, state }: { content: Content; state: HomeState }) {
  const { ui, sample } = content;
  const [heading, tagline, prompt, chips] = state.enter;
  return (
    <main className="home" style={{ height: "100%" }}>
      <div className="home-center">
        <h1 className="home-heading" style={rise(heading)}>
          {ui.home.heading}
        </h1>
        <p className="home-tagline" style={rise(tagline)}>
          {ui.home.tagline}
        </p>

        <form className={`prompt${state.focused ? " is-focused" : ""}`} style={rise(prompt)} data-anchor="prompt">
          <div className="mr-textarea" data-anchor="prompt-text" style={{ position: "relative" }}>
            {state.scan !== undefined && state.scan > 0 && state.scan < 1 && (
              <span
                style={{
                  position: "absolute",
                  left: 0,
                  right: 0,
                  top: `calc(${state.scan * 100}% - 24px)`,
                  height: 48,
                  background: "linear-gradient(transparent, color-mix(in srgb, var(--accent) 22%, transparent), transparent)",
                  borderBottom: "1.5px solid color-mix(in srgb, var(--accent) 70%, transparent)",
                  pointerEvents: "none",
                }}
              />
            )}
            {state.text === "" ? (
              <>
                <Caret on={state.caret} />
                <span className="mr-placeholder">{ui.home.placeholder}</span>
              </>
            ) : (
              <>
                <span
                  style={{
                    background: `color-mix(in srgb, var(--accent-soft) ${Math.round(state.pasteFlash * 100)}%, transparent)`,
                  }}
                >
                  {splitTerms(state.text, state.terms ?? []).map((part, index) =>
                    part.term === undefined ? (
                      part.text
                    ) : (
                      <span
                        key={index}
                        data-anchor={`term-${part.term}`}
                        style={{
                          borderRadius: 4,
                          backgroundImage: "linear-gradient(var(--accent-soft), var(--accent-soft))",
                          backgroundRepeat: "no-repeat",
                          backgroundSize: `${(state.marks?.[part.term] ?? 0) * 100}% 100%`,
                          color: (state.marks?.[part.term] ?? 0) > 0.5 ? "var(--accent-text)" : undefined,
                          fontWeight: (state.marks?.[part.term] ?? 0) > 0.5 ? 600 : undefined,
                        }}
                      >
                        {part.text}
                      </span>
                    ),
                  )}
                </span>
                <Caret on={state.caret} />
              </>
            )}
          </div>
          <div className="prompt-bar">
            <ModelButton model={sample.model} />
            <LanguageButton content={content} />
            {state.detecting && (
              <span className="prompt-status">
                <Thinking label={ui.setup.detecting} shimmer={state.shimmer} />
              </span>
            )}
            <span data-anchor="send" style={{ marginLeft: state.detecting ? 0 : "auto", display: "inline-flex", ...pressed(state.pressSend) }}>
              <IconButton
                variant="primary"
                label={ui.home.submit}
                icon={<ArrowUpIcon />}
                disabled={state.detecting || state.text.trim() === ""}
              />
            </span>
          </div>
        </form>

        <section className="chips-section" style={rise(chips)}>
          <h2 className="chips-title">{ui.home.orPick}</h2>
          <ul className="chips">
            {sample.chips.map((chip) => (
              <li key={chip}>
                <button type="button" className="chip" disabled={state.detecting}>
                  {chip}
                </button>
              </li>
            ))}
            <li>
              <button type="button" className="chip chip-quiet" disabled={state.detecting}>
                <PlusIcon />
                {ui.home.combine}
              </button>
            </li>
          </ul>
        </section>
      </div>
    </main>
  );
}

// Job-offer review (InterviewSetup)

export interface SetupState {
  /** 0 → 1 for the header, the detection card, the packs card and the summary bar. */
  enter: [number, number, number, number];
  /** 0 → 1 for each detected technology popping in. */
  technologies: number[];
  /** 0 → 1 for the pack chip. */
  pack: number;
  pressStart: number;
  scrollY: number;
}

export function SetupScreen({ content, state }: { content: Content; state: SetupState }) {
  const { ui, sample } = content;
  const [header, detection, packs, summary] = state.enter;
  const uncurated = sample.technologies.filter((technology) => !technology.covered).length;
  const pop = (amount: number): CSSProperties => ({
    opacity: amount,
    transform: `scale(${0.6 + 0.4 * amount})`,
  });
  return (
    <div style={{ position: "relative", height: "100%" }}>
      <main className="page" style={{ transform: `translateY(${-state.scrollY}px)` }}>
        <div className="setup">
          <div style={rise(header)}>
            <PageHeader
              back={{ label: ui.review.back, onClick: () => undefined }}
              title={ui.review.title}
              intro={ui.setup.detectedHint}
            />
          </div>

          <div style={rise(detection)} data-anchor="detection-card">
            <Card title={ui.setup.detectedTitle} id="detection-title" className="detection">
              <p className="field-label">{ui.setup.technologies}</p>
              <ul className="chips chips-start technologies" data-anchor="technologies">
                {sample.technologies.map((technology, index) => (
                  <li
                    key={technology.name}
                    className="chip technology"
                    data-anchor={`chip-${index}`}
                    style={pop(state.technologies[index] ?? 0)}
                  >
                    <span className={`status-dot ${technology.covered ? "status-dot-covered" : "status-dot-uncurated"}`} />
                    {technology.name}
                    <button type="button" className="chip-remove">
                      ×
                    </button>
                  </li>
                ))}
                <li>
                  <form className="technology-add">
                    <input placeholder={ui.setup.addPlaceholder} readOnly />
                  </form>
                </li>
              </ul>
              <ul className="legend" style={{ opacity: Math.min(...state.technologies.map((value) => value), 1) }}>
                <li>
                  <span className="status-dot status-dot-covered" />
                  {ui.setup.legendCovered}
                </li>
                <li>
                  <span className="status-dot status-dot-uncurated" />
                  {ui.setup.legendUncurated}
                </li>
              </ul>
              <div className="level-row">
                <span className="field-label">{ui.setup.level}</span>
                <span className="ui-dropdown">
                  <button type="button" className="ui-dropdown-button">
                    <span className="ui-dropdown-value">{ui.levels.junior}</span>
                    <Chevron />
                  </button>
                </span>
              </div>
              <Hint>{ui.setup.levelHint}</Hint>
            </Card>
          </div>

          <div style={rise(packs)} data-anchor="packs-card">
            <Card title={ui.review.packsTitle} id="setup-packs-title">
              <ul className="chips chips-start" data-anchor="packs">
                <li className="chip chip-selected" style={pop(state.pack)}>
                  {sample.packTitle}
                  <button type="button" className="chip-remove">
                    ×
                  </button>
                </li>
              </ul>
              <div>
                <Button variant="ghost" size="sm" icon={<PlusIcon />}>
                  {ui.review.addPacks}
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </main>

      {/* The summary bar is sticky at the bottom of the page in the app. */}
      <div
        style={{
          position: "absolute",
          left: 16,
          right: 16,
          bottom: 16,
          display: "flex",
          justifyContent: "center",
          transform: `translateY(${(1 - summary) * 12}px)`,
          opacity: summary,
        }}
      >
        <section className="setup-summary" data-anchor="summary" style={{ width: "100%", maxWidth: 688 }}>
          <div className="setup-summary-text">
            <h2 className="setup-summary-label">{ui.setup.summaryTitle}</h2>
            <p>{[sample.packTitle, ui.setup.uncuratedCount(uncurated)].join(" + ")}</p>
          </div>
          <LanguageButton content={content} />
          <span data-anchor="start" style={{ display: "inline-flex", ...pressed(state.pressStart) }}>
            <Button variant="primary">{ui.setup.start}</Button>
          </span>
        </section>
      </div>
    </div>
  );
}

// Interview room (InterviewRoom, Message)

export interface ChatMessage {
  role: "interviewer" | "candidate";
  text: string;
  followUp?: boolean;
  /** The recruiter's text is still streaming in. */
  streaming?: boolean;
  /** Nothing written yet: "is thinking…". */
  waiting?: boolean;
  /** 0 → 1 as the message arrives. */
  appear: number;
  anchor?: string;
}

export interface RoomState {
  /** 0 → 1 for the header, the conversation and the answer box, as the app's entering motion. */
  enter: [number, number, number];
  messages: ChatMessage[];
  progressText: string;
  /** 0 → 1: the progress line rising in after a change. */
  progressAppear: number;
  draft: string;
  composerFocused: boolean;
  caret: boolean;
  thinking: boolean;
  /** 0 → 1: the breathing ring around the recruiter's avatar. */
  ring: number;
  shimmer: number;
  /** 0 → 1: the streaming caret's breath. */
  streamCaret: number;
  scrollY: number;
  pressSend: number;
}

export function RoomScreen({ content, state }: { content: Content; state: RoomState }) {
  const { ui, sample } = content;
  const recruiter: Recruiter = sample.recruiter;
  const [header, scroll, composer] = state.enter;
  return (
    <main
      className="room"
      style={{ height: "100%", "--ring": `${Math.round(state.ring * 100)}%`, "--caret": 1 - 0.75 * state.streamCaret } as CSSProperties}
    >
      <header
        className="room-header"
        data-anchor="room-header"
        style={{ opacity: header, transform: `translateY(${(header - 1) * 8}px)` }}
      >
        <RecruiterBadge
          recruiter={recruiter}
          detail={`${sample.packTitle} · ${interviewLanguageName(content)}`}
          thinking={state.thinking}
        />
        <p className="room-progress" data-anchor="progress">
          <span className="room-progress-text" style={rise(state.progressAppear)}>
            {state.progressText}
          </span>
        </p>
        <Button variant="ghost" size="sm" disabled={state.thinking}>
          {ui.room.end}
        </Button>
      </header>

      <div className="room-scroll" style={{ opacity: scroll, overflow: "hidden" }} data-anchor="scroll-area">
        <div className="room-column" style={{ transform: `translateY(${-state.scrollY}px)` }}>
          <ol className="chat">
            {state.messages.map((message, index) => (
              <ChatLine key={index} message={message} recruiter={recruiter} content={content} />
            ))}
          </ol>
        </div>
      </div>

      <form className="composer-dock" style={rise(composer)}>
        <div className={`composer${state.composerFocused ? " is-focused" : ""}`} data-anchor="composer">
          <div className="mr-textarea">
            {state.draft === "" ? (
              <>
                <Caret on={state.caret} />
                <span className="mr-placeholder">
                  {state.thinking ? ui.recruiter.thinking(recruiter.name) : ui.room.typeAnswer}
                </span>
              </>
            ) : (
              <>
                {state.draft}
                <Caret on={state.caret} />
              </>
            )}
          </div>
          <div className="composer-bar">
            <ModelButton model={sample.model} />
            <span data-anchor="composer-send" style={{ display: "inline-flex", ...pressed(state.pressSend) }}>
              <IconButton
                variant="primary"
                label={ui.room.send}
                icon={<ArrowUpIcon />}
                disabled={state.thinking || state.draft.trim() === ""}
              />
            </span>
          </div>
        </div>
      </form>
    </main>
  );
}

function ChatLine({ message, recruiter, content }: { message: ChatMessage; recruiter: Recruiter; content: Content }) {
  const { ui } = content;
  const fromRecruiter = message.role === "interviewer";
  // The candidate's bubble grows out of the answer box (the app's `bubble-in`); the recruiter's rises.
  const style: CSSProperties = fromRecruiter
    ? rise(message.appear)
    : { ...rise(message.appear, 12, 0.97), transformOrigin: "bottom right" };
  if (message.appear <= 0) return null;
  return (
    <li className={`message message-${message.role}`} style={style} data-anchor={message.anchor}>
      {fromRecruiter && <Avatar recruiter={recruiter} thinking={message.streaming || message.waiting} />}
      <div className="message-body">
        <p className={fromRecruiter ? "message-author" : "message-author visually-hidden"}>
          {fromRecruiter ? recruiter.name : ui.common.you}
          {message.followUp && (
            <span className="message-tag" data-anchor="follow-up-tag">
              {ui.common.followUp}
            </span>
          )}
        </p>
        {message.waiting ? (
          <p className="message-waiting">
            <Thinking label={ui.recruiter.thinking(recruiter.name)} shimmer={0} />
          </p>
        ) : (
          <p className={message.streaming ? "message-text streaming" : "message-text"}>{message.text}</p>
        )}
      </div>
    </li>
  );
}

// Debrief (DebriefView)

export interface DebriefState {
  /** 0 → 1 for the header, the summary and each question card. */
  enter: number[];
  scrollY: number;
}

export function DebriefScreen({ content, state }: { content: Content; state: DebriefState }) {
  const { ui, sample } = content;
  const recruiter: Recruiter = sample.recruiter;
  const [header = 1, summary = 1, ...cards] = state.enter;
  return (
    <div style={{ height: "100%", overflow: "hidden" }}>
      <main className="page" style={{ transform: `translateY(${-state.scrollY}px)` }}>
        <div style={rise(header)}>
          <PageHeader
            lead={<RecruiterBadge recruiter={recruiter} detail={`${sample.packTitle} · ${interviewLanguageName(content)}`} />}
            title={ui.debrief.title}
          />
        </div>

        <figure className="debrief-summary" style={rise(summary, 12)} data-anchor="summary">
          <Avatar recruiter={recruiter} />
          <div>
            <figcaption className="debrief-summary-label">{ui.recruiter.debriefFrom(recruiter.name)}</figcaption>
            <blockquote>
              <p>{sample.summary}</p>
            </blockquote>
          </div>
        </figure>

        <ol className="debrief-questions">
          {sample.cards.map((card, index) => (
            <li key={card.number} className="ui-card feedback" style={rise(cards[index] ?? 1, 16)} data-anchor={`card-${index}`}>
              <p className="feedback-theme">
                {ui.common.question(card.number)} · {card.theme}
              </p>
              <h2 className="feedback-question">{card.question}</h2>
              <div className="feedback-columns" data-anchor={`columns-${index}`}>
                <section className="feedback-section feedback-strengths">
                  <h3>{ui.debrief.strengths}</h3>
                  <ul>
                    {card.strengths.map((strength) => (
                      <li key={strength}>{strength}</li>
                    ))}
                  </ul>
                </section>
                <section className="feedback-section feedback-gaps">
                  <h3>{ui.debrief.gaps}</h3>
                  <ul>
                    {card.gaps.map((gap) => (
                      <li key={gap}>{gap}</li>
                    ))}
                  </ul>
                </section>
              </div>
              <section className="feedback-section">
                <h3>{ui.debrief.modelAnswer}</h3>
                <p className="feedback-answer">{card.modelAnswer}</p>
              </section>
            </li>
          ))}
        </ol>
      </main>
    </div>
  );
}
