import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import type { useInterview } from "./useInterview";

interface InterviewRoomProps {
  session: ReturnType<typeof useInterview>;
}

export function InterviewRoom({ session }: InterviewRoomProps) {
  const { interview, messages, streaming, error, ending, endError, debrief } = session;
  const [draft, setDraft] = useState("");
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
    const confirmed = window.confirm(
      "End the interview now? You'll get a debrief of the questions you have answered so far.",
    );
    if (confirmed) void session.end();
  }

  const { questionNumber, totalQuestions } = interview;

  return (
    <main className="room">
      <header className="room-header">
        <div className="room-heading">
          <div>
            <p className="room-pack">{interview.pack.title}</p>
            <p className="room-progress" aria-live="polite">
              {finished ? "Interview complete" : `Question ${questionNumber} of ${totalQuestions}`}
            </p>
          </div>
          {!finished && (
            <button type="button" className="secondary-button" onClick={confirmEnd} disabled={streaming || ending}>
              {ending ? "Ending…" : "End interview"}
            </button>
          )}
        </div>
        <div
          className="progress"
          role="progressbar"
          aria-label="Interview progress"
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

      <ol ref={chatRef} className="chat" aria-label="Conversation">
        {messages.map((message, index) => {
          const isTyping = streaming && index === messages.length - 1 && message.role === "interviewer";
          return (
            <li key={index} className={`message message-${message.role}`}>
              <span className="message-author">
                {message.role === "interviewer" ? "Interviewer" : "You"}
              </span>
              <p className={isTyping ? "message-text typing" : "message-text"}>{message.content}</p>
            </li>
          );
        })}
      </ol>

      {error && (
        <p className="room-error" role="alert">
          {error} Your answer was not sent; you can send it again.
        </p>
      )}
      {endError && (
        <p className="room-error" role="alert">
          {endError} The interview is still going; you can try to end it again.
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
                  Back to packs
                </button>
                <button type="button" onClick={session.retryDebrief}>
                  Try again
                </button>
              </div>
            </>
          ) : (
            <p className="typing">Writing your debrief, question by question… This can take a minute.</p>
          )}
        </footer>
      ) : (
        <form className="room-footer composer" onSubmit={submit}>
          <textarea
            ref={inputRef}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={onKeyDown}
            placeholder={streaming ? "The interviewer is writing…" : "Type your answer…"}
            aria-label="Your answer"
            rows={3}
            disabled={streaming}
          />
          <div className="composer-actions">
            <span className="composer-hint">Enter to send · Shift+Enter for a new line</span>
            <button type="submit" disabled={streaming || draft.trim() === ""}>
              Send
            </button>
          </div>
        </form>
      )}
    </main>
  );
}
