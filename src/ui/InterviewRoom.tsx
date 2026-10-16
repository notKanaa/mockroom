import { useEffect, useRef, type FormEvent, type KeyboardEvent } from "react";
import { useI18n } from "./i18n";
import { Message } from "./Message";
import type { useInterview } from "./useInterview";

interface InterviewRoomProps {
  session: ReturnType<typeof useInterview>;
  /** Opens the AI provider settings, for when the provider fails. The interview is kept. */
  onOpenSettings: () => void;
}

export function InterviewRoom({ session, onOpenSettings }: InterviewRoomProps) {
  const { interview, messages, streaming, error, ending, endError, debrief, draft, setDraft } = session;
  const { t } = useI18n();
  const chatRef = useRef<HTMLOListElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const finished = interview?.status === "finished";

  useEffect(() => {
    const chat = chatRef.current;
    if (chat) chat.scrollTop = chat.scrollHeight;
  }, [messages]);

  useEffect(() => {
    if (!streaming) inputRef.current?.focus();
  }, [streaming]);

  if (!interview) return null;

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
        <div className="room-heading">
          <div>
            <p className="room-pack">
              {interview.pack.title} · {t.languageNames[interview.language]}
            </p>
            <p className="room-progress" aria-live="polite">
              {progress}
            </p>
          </div>
          {!finished && (
            <button type="button" className="secondary-button" onClick={confirmEnd} disabled={streaming || ending}>
              {ending ? t.room.ending : t.room.end}
            </button>
          )}
        </div>
        <div
          className="progress"
          role="progressbar"
          aria-label={t.room.progressLabel}
          aria-valuemin={0}
          aria-valuemax={totalQuestions}
          aria-valuenow={finished ? totalQuestions : questionNumber}
        >
          <div
            className="progress-fill"
            style={{ width: `${((finished ? totalQuestions : questionNumber) / totalQuestions) * 100}%` }}
          />
        </div>
      </header>

      <ol ref={chatRef} className="chat" aria-label={t.room.conversation}>
        {messages.map((message, index) => {
          const isTyping = streaming && index === messages.length - 1 && message.role === "interviewer";
          return <Message key={index} message={message} typing={isTyping} />;
        })}
      </ol>

      {error && (
        <p className="room-error" role="alert">
          {error} {t.room.notSent}{" "}
          <button type="button" className="link-button" onClick={onOpenSettings}>
            {t.common.openSettings}
          </button>
        </p>
      )}
      {endError && (
        <p className="room-error" role="alert">
          {endError} {t.room.stillGoing}
        </p>
      )}

      {finished ? (
        <footer className="room-footer room-done" aria-live="polite">
          {debrief.error ? (
            <>
              <p className="room-done-error" role="alert">
                {debrief.error}
              </p>
              <div className="room-done-actions">
                <button type="button" className="secondary-button" onClick={session.reset}>
                  {t.common.backToPacks}
                </button>
                <button type="button" className="secondary-button" onClick={onOpenSettings}>
                  {t.common.settings}
                </button>
                <button type="button" onClick={session.retryDebrief}>
                  {t.room.tryAgain}
                </button>
              </div>
            </>
          ) : (
            <p className="typing">{t.room.writingDebrief}</p>
          )}
        </footer>
      ) : (
        <form className="room-footer composer" onSubmit={submit}>
          <textarea
            ref={inputRef}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={onKeyDown}
            placeholder={streaming ? t.room.interviewerWriting : t.room.typeAnswer}
            aria-label={t.room.yourAnswer}
            rows={3}
            disabled={streaming}
          />
          <div className="composer-actions">
            <span className="composer-hint">{t.room.composerHint}</span>
            <button type="submit" disabled={streaming || draft.trim() === ""}>
              {t.room.send}
            </button>
          </div>
        </form>
      )}
    </main>
  );
}
