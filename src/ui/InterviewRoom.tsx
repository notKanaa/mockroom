import { useEffect, useRef, type FormEvent, type KeyboardEvent } from "react";
import { interviewTitle, useI18n } from "./i18n";
import { ArrowUpIcon } from "./Icons";
import { Banner, Button, IconButton, Thinking } from "./kit";
import { Message } from "./Message";
import { ModelPicker } from "./ModelPicker";
import { RecruiterBadge, recruiterFor } from "./Recruiter";
import { useAutoGrow } from "./useAutoGrow";
import type { useInterview } from "./useInterview";

interface InterviewRoomProps {
  session: ReturnType<typeof useInterview>;
  /** Opens the AI provider settings, for when the provider fails. The interview is kept. */
  onOpenSettings: () => void;
}

/**
 * The interview itself, in focus mode: only the recruiter, the conversation,
 * the answer box and a discreet way out.
 */
export function InterviewRoom({ session, onOpenSettings }: InterviewRoomProps) {
  const { interview, messages, streaming, error, ending, endError, debrief, draft, setDraft } = session;
  const { t } = useI18n();
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const finished = interview?.status === "finished";
  useAutoGrow(inputRef, draft);

  useEffect(() => {
    const scroller = scrollRef.current;
    if (scroller) scroller.scrollTop = scroller.scrollHeight;
  }, [messages, finished, debrief.error]);

  useEffect(() => {
    // The page may have been scrolled on the screen before; the room starts at the top.
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    if (!streaming) inputRef.current?.focus({ preventScroll: true });
  }, [streaming]);

  if (!interview) return null;
  const recruiter = recruiterFor(interview.id, t);

  async function submit(event?: FormEvent) {
    event?.preventDefault();
    const answer = draft.trim();
    if (!answer || streaming) return;
    setDraft("");
    const sent = await session.answer(answer);
    if (!sent) setDraft(answer);
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      void submit();
    }
  }

  function confirmEnd() {
    if (window.confirm(t.room.confirmEnd)) void session.end();
  }

  const { questionNumber, followUpNumber, totalQuestions } = interview;
  const progress = finished
    ? t.room.complete
    : `${t.room.progress(questionNumber, totalQuestions)}${followUpNumber > 0 ? ` · ${t.room.followUpProgress(followUpNumber)}` : ""}`;

  return (
    <main className="room">
      <header className="room-header">
        <RecruiterBadge
          recruiter={recruiter}
          detail={`${interviewTitle(interview, t)} · ${t.languageNames[interview.language]}`}
          thinking={streaming}
        />
        <p className="room-progress" aria-live="polite">
          {progress}
        </p>
        {!finished && (
          <Button variant="ghost" size="sm" onClick={confirmEnd} disabled={streaming || ending}>
            {ending ? t.room.ending : t.room.end}
          </Button>
        )}
      </header>

      <div className="room-scroll" ref={scrollRef}>
        <div className="room-column">
          <ol className="chat" aria-label={t.room.conversation}>
            {messages.map((message, index) => {
              const isTyping = streaming && index === messages.length - 1 && message.role === "interviewer";
              return <Message key={index} message={message} recruiter={recruiter} typing={isTyping} />;
            })}
            {/* Until the recruiter's reply starts, their message is just the typing dots. */}
            {streaming && messages.at(-1)?.role === "candidate" && (
              <Message message={{ role: "interviewer", content: "" }} recruiter={recruiter} typing />
            )}
          </ol>

          {error && (
            <Banner tone="error">
              {error} {t.room.notSent}{" "}
              <button type="button" className="ui-link" onClick={onOpenSettings}>
                {t.common.openSettings}
              </button>
            </Banner>
          )}
          {endError && (
            <Banner tone="error">
              {endError} {t.room.stillGoing}
            </Banner>
          )}

          {finished && (
            <div className="room-done" aria-live="polite">
              {debrief.error ? (
                <>
                  <Banner tone="error">{debrief.error}</Banner>
                  <div className="button-row">
                    <Button variant="primary" onClick={session.retryDebrief}>
                      {t.room.tryAgain}
                    </Button>
                    <Button onClick={onOpenSettings}>{t.common.settings}</Button>
                    <Button variant="ghost" onClick={session.reset}>
                      {t.common.newInterview}
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <p className="room-writing">
                    <Thinking label={t.room.writingDebrief} />
                  </p>
                  {/* The shape of the debrief to come. */}
                  <div className="skeleton" aria-hidden="true">
                    <span />
                    <span />
                    <span />
                  </div>
                  <div className="skeleton" aria-hidden="true">
                    <span />
                    <span />
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {!finished && (
        <form className="composer-dock" onSubmit={submit}>
          <div className="composer">
            <textarea
              ref={inputRef}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={onKeyDown}
              placeholder={streaming ? t.recruiter.thinking(recruiter.name) : t.room.typeAnswer}
              aria-label={t.room.yourAnswer}
              aria-describedby="composer-hint"
              rows={1}
              disabled={streaming}
            />
            <div className="composer-bar">
              <ModelPicker onOpenSettings={onOpenSettings} placement="up" />
              <IconButton
                type="submit"
                variant="primary"
                label={t.room.send}
                icon={<ArrowUpIcon />}
                disabled={streaming || draft.trim() === ""}
              />
            </div>
          </div>
          <span id="composer-hint" className="visually-hidden">
            {t.room.composerHint}
          </span>
        </form>
      )}
    </main>
  );
}
