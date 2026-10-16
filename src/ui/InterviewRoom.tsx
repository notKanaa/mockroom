import { useEffect, useRef, type FormEvent, type KeyboardEvent } from "react";
import { interviewTitle, useI18n } from "./i18n";
import { ArrowUpIcon } from "./Icons";
import { Banner, Button, IconButton } from "./kit";
import { Message } from "./Message";
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
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const finished = interview?.status === "finished";
  useAutoGrow(inputRef, draft);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages, finished, debrief.error]);

  useEffect(() => {
    if (!streaming) inputRef.current?.focus();
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

      <div className="room-scroll">
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
                <p className="room-writing">
                  <span className="typing-dots" aria-hidden="true">
                    <span className="dot" />
                    <span className="dot" />
                    <span className="dot" />
                  </span>
                  {t.room.writingDebrief}
                </p>
              )}
            </div>
          )}
          <div ref={endRef} />
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
            <IconButton
              type="submit"
              variant="primary"
              label={t.room.send}
              icon={<ArrowUpIcon />}
              disabled={streaming || draft.trim() === ""}
            />
          </div>
          <p id="composer-hint" className="composer-hint">
            {t.room.composerHint}
          </p>
        </form>
      )}
    </main>
  );
}
